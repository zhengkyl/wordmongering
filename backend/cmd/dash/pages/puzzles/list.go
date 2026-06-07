package puzzles

import (
	"strconv"
	"strings"

	"charm.land/bubbles/v2/key"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/util"
	"github.com/zhengkyl/wordmongering/backend/internal/game"
)

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

type weekPager struct {
	Cursor      int
	ViewportOff int
	starts      []int
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
	return common.DimStyle.Render("page " + strconv.Itoa(pg+1) + " of " + strconv.Itoa(len(p.starts)))
}

func renderPuzzleItem(p puzzleItem, selected bool) string {
	dateStr := common.DayLabel(p.day)
	marks := annotate(p.puzzle)
	var coloredPuzzle strings.Builder
	for i, ch := range p.puzzle {
		switch marks[i] {
		case 'D':
			coloredPuzzle.WriteString(common.ErrStyle.Render(string(ch)))
		case '1':
			coloredPuzzle.WriteString(common.WarnStyle.Render(string(ch)))
		default:
			coloredPuzzle.WriteString(string(ch))
		}
	}
	var b strings.Builder
	if selected {
		b.WriteString(common.SelectedStyle.Render("┃") + " " + common.SelectedStyle.Render(dateStr) + "\n")
		b.WriteString(common.SelectedStyle.Render("┃") + " " + coloredPuzzle.String())
	} else {
		b.WriteString("  " + common.TitleStyle.Render(dateStr) + "\n")
		b.WriteString("  " + coloredPuzzle.String())
	}
	return b.String()
}

type listModel struct {
	props common.Props
	items []puzzleItem
	pager weekPager
}

func newList(props common.Props) *listModel {
	return &listModel{props: props}
}

func (m *listModel) SetProps(props common.Props) { m.props = props }

func (m *listModel) Init() tea.Cmd {
	return m.loadPuzzles()
}

func (m *listModel) loadPuzzles() tea.Cmd {
	wordSet := m.props.Global.WordSet
	return func() tea.Msg {
		maxDay := common.MaxDay()
		items := make([]puzzleItem, maxDay)
		for d := maxDay; d >= 1; d-- {
			items[maxDay-d] = puzzleItem{day: d, puzzle: game.GenerateDailyPuzzle(d, wordSet)}
		}
		return loadedMsg(items)
	}
}

type loadedMsg []puzzleItem

func (m *listModel) moveDown() (tea.Cmd, bool) {
	m.pager.MoveDown(len(m.items))
	return nil, true
}

func (m *listModel) Update(msg tea.Msg) (tea.Cmd, bool) {
	switch msg := msg.(type) {
	case loadedMsg:
		m.items = []puzzleItem(msg)
		m.pager.Rebuild(m.items)
	case tea.KeyPressMsg:
		km := m.props.Global.KeyMap
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

	hints := common.RenderKey("j/k", "navigate") + "  " + common.RenderKey("1/2/3", "tab")
	footer := common.RenderFooter(width, hints, m.pager.PageInfo(len(m.items)))

	fullW := lipgloss.NewStyle().Width(width).Height(contentH)
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
