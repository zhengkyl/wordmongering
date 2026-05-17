package reports

import (
	"database/sql"
	"fmt"
	"strings"

	"charm.land/bubbles/v2/key"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/util"
)

type reportRow struct {
	id         int
	playerHint string
	word       string
	note       string
	createdAt  int64
}

type moreReportsMsg []reportRow
type reportErrMsg struct{ error }

func loadMoreReports(db *sql.DB, offset int) tea.Cmd {
	return func() tea.Msg {
		rows, err := db.Query(
			"SELECT id, player_hint, COALESCE(word,''), COALESCE(note,''), created_at FROM reports ORDER BY id DESC LIMIT ? OFFSET ?",
			common.PageSize, offset,
		)
		if err != nil {
			return reportErrMsg{err}
		}
		defer rows.Close()
		var reports []reportRow
		for rows.Next() {
			var r reportRow
			rows.Scan(&r.id, &r.playerHint, &r.word, &r.note, &r.createdAt)
			reports = append(reports, r)
		}
		return moreReportsMsg(reports)
	}
}

type Model struct {
	props   common.Props
	items   []reportRow
	pager   util.Pager
	loaded  bool
	loading bool
	err     error
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

func (m *Model) Load() tea.Cmd {
	m.items = nil
	m.pager.Reset()
	m.loaded = false
	m.loading = true
	m.err = nil
	return loadMoreReports(m.props.Global.DB, 0)
}

func (m *Model) TitleRight() string {
	n := fmt.Sprintf("%d", len(m.items))
	if !m.loaded {
		n += "+"
	}
	return n + " reports"
}

func (m *Model) Update(msg tea.Msg) tea.Cmd {
	switch msg := msg.(type) {
	case moreReportsMsg:
		m.loading = false
		if len(msg) < common.PageSize {
			m.loaded = true
		}
		m.items = append(m.items, []reportRow(msg)...)
		m.err = nil
	case reportErrMsg:
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
			return loadMoreReports(m.props.Global.DB, len(m.items))
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
		return fullW.Render("\n  "+common.DimStyle.Render("no reports")) + "\n" + footer
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

		note := r.note
		if note == "" {
			note = "(no note)"
		}
		meta := common.DimStyle.Render(common.FormatTime(r.createdAt) + "  " + common.Truncate(r.playerHint, 14))

		var prefix, wordStr string
		if selected {
			prefix = common.SelectedStyle.Render("┃") + " "
			wordStr = common.SelectedStyle.Render(r.word)
		} else {
			prefix = "  "
			wordStr = common.TitleStyle.Render(r.word)
		}

		pad := contentW - lipgloss.Width(prefix) - lipgloss.Width(wordStr) - lipgloss.Width(meta)
		if pad < 1 {
			pad = 1
		}

		b.WriteString(prefix + wordStr + strings.Repeat(" ", pad) + meta + "\n")
		b.WriteString(prefix + common.DimStyle.Render(common.Truncate(note, contentW-lipgloss.Width(prefix))) + "\n")
		b.WriteString("\n")
	}

	content := strings.TrimSuffix(b.String(), "\n")
	contentStyled := lipgloss.NewStyle().Width(contentW).Height(contentH).Render(content)
	scrollBar := util.RenderScrollbar(contentH, util.ItemsPerPage, m.pager.PosInPage())
	body := lipgloss.JoinHorizontal(lipgloss.Top, contentStyled, scrollBar)
	return body + "\n" + footer
}
