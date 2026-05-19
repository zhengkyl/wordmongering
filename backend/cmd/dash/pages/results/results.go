package results

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"charm.land/bubbles/v2/key"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/util"
)

type resultRow struct {
	id         int
	playerHint string
	puzzleId   int
	words      []string
	createdAt  int64
}

type moreResultsMsg []resultRow
type resultErrMsg struct{ error }

func loadMoreResults(db *sql.DB, dayFilter, offset int) tea.Cmd {
	return func() tea.Msg {
		var (
			rows *sql.Rows
			err  error
		)
		if dayFilter == 0 {
			rows, err = db.Query(
				"SELECT id, player_hint, puzzle_id, words, created_at FROM solves ORDER BY id DESC LIMIT ? OFFSET ?",
				common.PageSize, offset,
			)
		} else {
			rows, err = db.Query(
				"SELECT id, player_hint, puzzle_id, words, created_at FROM solves WHERE puzzle_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
				dayFilter, common.PageSize, offset,
			)
		}
		if err != nil {
			return resultErrMsg{err}
		}
		defer rows.Close()
		var results []resultRow
		for rows.Next() {
			var r resultRow
			var wordsJSON string
			rows.Scan(&r.id, &r.playerHint, &r.puzzleId, &wordsJSON, &r.createdAt)
			json.Unmarshal([]byte(wordsJSON), &r.words)
			results = append(results, r)
		}
		return moreResultsMsg(results)
	}
}

type Model struct {
	props     common.Props
	items     []resultRow
	pager     util.Pager
	loaded    bool
	loading   bool
	dayFilter int
	err       error
}

func New(props common.Props) *Model {
	return &Model{props: props}
}

func (m *Model) SetProps(props common.Props) {
	m.props = props
}

func (m *Model) NeedsLoad() bool {
	return m.items == nil && !m.loading
}

func (m *Model) Load(dayFilter int) tea.Cmd {
	m.items = nil
	m.pager.Reset()
	m.loaded = false
	m.loading = true
	m.dayFilter = dayFilter
	m.err = nil
	return loadMoreResults(m.props.Global.DB, dayFilter, 0)
}

func (m *Model) TitleRight() string {
	n := fmt.Sprintf("%d", len(m.items))
	if !m.loaded {
		n += "+"
	}
	return n + " results"
}

func (m *Model) Update(msg tea.Msg) tea.Cmd {
	switch msg := msg.(type) {
	case moreResultsMsg:
		m.loading = false
		if len(msg) < common.PageSize {
			m.loaded = true
		}
		m.items = append(m.items, []resultRow(msg)...)
		m.err = nil
	case resultErrMsg:
		m.loading = false
		m.err = msg.error
	case tea.KeyPressMsg:
		km := m.props.Global.KeyMap
		switch {
		case key.Matches(msg, km.Down):
			m.pager.MoveDown(len(m.items))
		case key.Matches(msg, km.Up):
			m.pager.MoveUp()
		}
		if !m.loaded && !m.loading && m.pager.Cursor >= len(m.items)-5 {
			m.loading = true
			return loadMoreResults(m.props.Global.DB, m.dayFilter, len(m.items))
		}
	}
	return nil
}

const (
	itemH      = 3
	scrollbarW = 3
)

func (m *Model) View() string {
	width := m.props.Width
	contentH := m.props.Height - 2
	contentW := width - scrollbarW

	hints := common.RenderKey("j/k", "navigate") + "  " + common.RenderKey("1/2/3", "tab")
	footer := common.RenderFooter(width, hints, m.pager.PageInfo(len(m.items), m.loaded))

	fullW := lipgloss.NewStyle().Width(width).Height(contentH)
	if m.err != nil {
		return fullW.Render("\n  "+common.ErrStyle.Render(m.err.Error())) + "\n" + footer
	}
	if len(m.items) == 0 && m.loaded {
		return fullW.Render("\n  "+common.DimStyle.Render("no results")) + "\n" + footer
	}
	if len(m.items) == 0 {
		return fullW.Render("") + "\n" + footer
	}

	visItems := max(1, (contentH-1)/itemH)

	pageStart := m.pager.PageStart()
	pageEnd := min(pageStart+util.ItemsPerPage, len(m.items))
	m.pager.UpdateViewport(visItems)

	viewStart := pageStart + m.pager.ViewportOff
	viewEnd := min(viewStart+visItems, pageEnd)

	var b strings.Builder
	b.WriteString("\n")
	for i := viewStart; i < viewEnd; i++ {
		r := m.items[i]
		selected := i == m.pager.Cursor

		var dayPart string
		if m.dayFilter == 0 {
			dayPart = fmt.Sprintf("Day %-4d", r.puzzleId)
		} else {
			dayPart = fmt.Sprintf("%d words", len(r.words))
		}
		meta := common.DimStyle.Render(common.FormatTime(r.createdAt) + "  " + common.Truncate(r.playerHint, 14))
		wordsLine := common.Truncate(strings.Join(r.words, " · "), contentW-2)

		var prefix, dayStr string
		if selected {
			prefix = common.SelectedStyle.Render("┃") + " "
			dayStr = common.SelectedStyle.Render(dayPart)
		} else {
			prefix = "  "
			dayStr = common.TitleStyle.Render(dayPart)
		}

		pad := contentW - lipgloss.Width(prefix) - lipgloss.Width(dayStr) - lipgloss.Width(meta)
		if pad < 1 {
			pad = 1
		}

		b.WriteString(prefix + dayStr + strings.Repeat(" ", pad) + meta + "\n")
		b.WriteString(prefix + common.DimStyle.Render(wordsLine) + "\n")
		b.WriteString("\n")
	}

	content := strings.TrimSuffix(b.String(), "\n")
	contentStyled := lipgloss.NewStyle().Width(contentW).Height(contentH).Render(content)
	scrollBar := util.RenderScrollbar(contentH, util.ItemsPerPage, m.pager.PosInPage())
	body := lipgloss.JoinHorizontal(lipgloss.Top, contentStyled, scrollBar)
	return body + "\n" + footer
}
