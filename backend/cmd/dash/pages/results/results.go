package results

import (
	tea "charm.land/bubbletea/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
)

const scrollbarW = 2

type puzzleLoadedMsg struct {
	row    resultRow
	puzzle string
}

type Model struct {
	props  common.Props
	list   *listModel
	detail *detailModel
}

func New(props common.Props) *Model {
	return &Model{props: props, list: newList(props)}
}

func (m *Model) SetProps(props common.Props) {
	m.props = props
	m.list.SetProps(props)
	if m.detail != nil {
		m.detail.SetProps(props)
	}
}

func (m *Model) NeedsLoad() bool          { return m.list.NeedsLoad() }
func (m *Model) Load(dayFilter int) tea.Cmd { return m.list.Load(dayFilter) }

func (m *Model) TitleRight() string {
	if m.detail != nil {
		return m.detail.TitleRight()
	}
	return m.list.TitleRight()
}

func (m *Model) Update(msg tea.Msg) (tea.Cmd, bool) {
	if m.detail != nil {
		cmd, handled := m.detail.Update(msg)
		if handled {
			return cmd, true
		}
		if kp, ok := msg.(tea.KeyPressMsg); ok && kp.String() == "esc" {
			m.detail = nil
			return nil, true
		}
		return cmd, false
	}

	if pl, ok := msg.(puzzleLoadedMsg); ok {
		m.detail = newDetail(m.props, pl.row, pl.puzzle, m.props.Global.Words)
		return nil, false
	}

	return m.list.Update(msg)
}

func (m *Model) View() string {
	if m.detail != nil {
		return m.detail.View()
	}
	return m.list.View()
}
