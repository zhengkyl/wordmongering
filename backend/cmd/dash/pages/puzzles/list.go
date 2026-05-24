package puzzles

import (
	"fmt"
	"os"
	"strings"

	"charm.land/bubbles/v2/key"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/util"
)

type puzzleRow struct {
	day    int
	puzzle string
}

type morePuzzlesMsg []puzzleRow
type savedMsg struct{}
type puzzleErrMsg struct{ error }

func loadAllPuzzles(path string) tea.Cmd {
	return func() tea.Msg {
		data, err := os.ReadFile(path)
		if err != nil {
			if os.IsNotExist(err) {
				return morePuzzlesMsg(nil)
			}
			return puzzleErrMsg{err}
		}
		content := strings.TrimRight(string(data), "\n")
		if content == "" {
			return morePuzzlesMsg(nil)
		}
		lines := strings.Split(content, "\n")
		puzzles := make([]puzzleRow, 0, len(lines))
		for i, line := range lines {
			if line != "" {
				puzzles = append(puzzles, puzzleRow{day: i + 1, puzzle: line})
			}
		}
		for i, j := 0, len(puzzles)-1; i < j; i, j = i+1, j-1 {
			puzzles[i], puzzles[j] = puzzles[j], puzzles[i]
		}
		return morePuzzlesMsg(puzzles)
	}
}

type puzzleItem struct {
	day    int
	puzzle string
}

const (
	puzzleItemH       = 2
	puzzleItemSpacing = 1
	puzzleItemTotal   = puzzleItemH + puzzleItemSpacing
	scrollbarW        = 2
)

// weekPager pages items by calendar week (7-day blocks starting from day 1).
// Items must be sorted newest-first; week boundaries are detected by day number.
type weekPager struct {
	Cursor      int
	ViewportOff int
	starts      []int // index of first item in each week-page (newest first)
}

func (p *weekPager) Reset() {
	p.Cursor = 0
	p.ViewportOff = 0
	p.starts = nil
}

func (p *weekPager) Rebuild(items []puzzleItem) {
	starts := make([]int, 0, len(items))
	for i, item := range items {
		if i == 0 || (item.day-1)/7 != (items[i-1].day-1)/7 {
			starts = append(starts, i)
		}
	}
	p.starts = starts
}

func (p *weekPager) pageOf(cursor int) int {
	pg := 0
	for i, s := range p.starts {
		if s <= cursor {
			pg = i
		}
	}
	return pg
}

func (p *weekPager) PageStart() int {
	if len(p.starts) == 0 {
		return 0
	}
	return p.starts[p.pageOf(p.Cursor)]
}

func (p *weekPager) pageEnd(total int) int {
	pg := p.pageOf(p.Cursor)
	if pg+1 < len(p.starts) {
		return p.starts[pg+1]
	}
	return total
}

func (p *weekPager) PosInPage() int {
	return p.Cursor - p.PageStart()
}

func (p *weekPager) MoveDown(total int) {
	if p.Cursor >= total-1 {
		return
	}
	if p.Cursor == p.pageEnd(total)-1 {
		p.Cursor++
		p.ViewportOff = 0
	} else {
		p.Cursor++
	}
}

func (p *weekPager) MoveUp() {
	if p.Cursor > 0 {
		p.Cursor--
	}
}

func (p *weekPager) UpdateViewport(visItems int) {
	if visItems <= 0 {
		return
	}
	pos := p.PosInPage()
	if pos < p.ViewportOff {
		p.ViewportOff = pos
	} else if pos >= p.ViewportOff+visItems {
		p.ViewportOff = pos - visItems + 1
	}
}

func (p *weekPager) PageInfo(total int) string {
	if total == 0 || len(p.starts) == 0 {
		return ""
	}
	pg := p.pageOf(p.Cursor)
	return fmt.Sprintf("page %d of %d", pg+1, len(p.starts))
}

func renderPuzzleItem(p puzzleItem, selected bool) string {
	dateStr := common.DayLabel(p.day)
	var b strings.Builder
	if selected {
		b.WriteString(common.SelectedStyle.Render("┃") + " " + common.SelectedStyle.Render(dateStr) + "\n")
		b.WriteString(common.SelectedStyle.Render("┃") + " " + common.DimStyle.Render(p.puzzle))
	} else {
		b.WriteString("  " + common.TitleStyle.Render(dateStr) + "\n")
		b.WriteString("  " + common.DimStyle.Render(p.puzzle))
	}
	return b.String()
}

type listModel struct {
	props common.Props
	items []puzzleItem
	pager weekPager
	err   error
}

func newList(props common.Props) *listModel {
	return &listModel{props: props}
}

func (m *listModel) SetProps(props common.Props) { m.props = props }

func (m *listModel) Init() tea.Cmd {
	return loadAllPuzzles(m.props.Global.PuzzlePath)
}

func (m *listModel) reloadData() tea.Cmd {
	m.items = nil
	m.pager.Reset()
	return loadAllPuzzles(m.props.Global.PuzzlePath)
}

func (m *listModel) moveDown() (tea.Cmd, bool) {
	m.pager.MoveDown(len(m.items))
	return nil, true
}

func (m *listModel) Update(msg tea.Msg) (tea.Cmd, bool) {
	switch msg := msg.(type) {
	case morePuzzlesMsg:
		for _, p := range msg {
			m.items = append(m.items, puzzleItem{day: p.day, puzzle: p.puzzle})
		}
		m.pager.Rebuild(m.items)
		m.err = nil
	case puzzleErrMsg:
		m.err = msg.error
	case tea.KeyPressMsg:
		km := m.props.Global.KeyMap
		if key.Matches(msg, km.Add) {
			return func() tea.Msg { return openEditMsg{day: -1} }, true
		}
		if key.Matches(msg, km.Edit) && len(m.items) > 0 {
			p := m.items[m.pager.Cursor]
			return func() tea.Msg { return openEditMsg{day: p.day, puzzle: p.puzzle} }, true
		}
		switch {
		case key.Matches(msg, km.Up):
			m.pager.MoveUp()
			return nil, true
		case key.Matches(msg, km.Down):
			return m.moveDown()
		}
	case tea.MouseWheelMsg:
		switch msg.Button {
		case tea.MouseWheelDown:
			return m.moveDown()
		case tea.MouseWheelUp:
			m.pager.MoveUp()
			return nil, true
		}
	}
	return nil, false
}

func (m *listModel) View() string {
	width := m.props.Width
	contentH := m.props.Height - 2

	hints := common.RenderKey("j/k", "navigate") + "  " + common.RenderKey("1/2/3", "tab") + " " + common.RenderKey("a", "add") + "  " + common.RenderKey("e/↵", "edit")
	footer := common.RenderFooter(width, hints, m.pager.PageInfo(len(m.items)))

	fullW := lipgloss.NewStyle().Width(width).Height(contentH)
	if m.err != nil {
		return fullW.Render("\n  "+common.ErrStyle.Render("error: "+m.err.Error())) + "\n" + footer
	}
	if len(m.items) == 0 {
		return fullW.Render("") + "\n" + footer
	}

	visItems := max(1, (contentH-1)/puzzleItemTotal)

	pageStart := m.pager.PageStart()
	pageEnd := m.pager.pageEnd(len(m.items))
	showScrollbar := pageEnd-pageStart > visItems
	m.pager.UpdateViewport(visItems)

	viewStart := pageStart + m.pager.ViewportOff
	viewEnd := min(viewStart+visItems, pageEnd)

	var b strings.Builder
	b.WriteString("\n")
	for i := viewStart; i < viewEnd; i++ {
		b.WriteString(renderPuzzleItem(m.items[i], i == m.pager.Cursor))
		if i < viewEnd-1 {
			b.WriteString("\n\n")
		}
	}
	if pageEnd < len(m.items) {
		b.WriteString("\n\n  " + common.DimStyle.Render("↓  see previous week"))
	}

	contentW := width
	if showScrollbar {
		contentW = width - scrollbarW
	}
	content := lipgloss.NewStyle().Width(contentW).Height(contentH).Render(b.String())
	if showScrollbar {
		scrollBar := util.RenderScrollbar(contentH, pageEnd-pageStart, m.pager.PosInPage())
		return lipgloss.JoinHorizontal(lipgloss.Top, content, scrollBar) + "\n" + footer
	}
	return content + "\n" + footer
}
