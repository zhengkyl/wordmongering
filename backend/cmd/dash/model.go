package main

import (
	"strings"

	"charm.land/bubbles/v2/key"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/pages/puzzles"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/pages/reports"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/pages/results"
)

var (
	dialogStyle    = lipgloss.NewStyle().Padding(1, 3).Border(lipgloss.RoundedBorder(), true).BorderForeground(common.Accent)
	activeBtnStyle = lipgloss.NewStyle().Background(common.Accent).Foreground(lipgloss.Color("15")).Bold(true).Padding(0, 2)
	dimBtnStyle    = lipgloss.NewStyle().Background(common.Muted).Foreground(lipgloss.Color("15")).Padding(0, 2)
)

type tab int

const (
	tabPuzzles tab = iota
	tabResults
	tabReports
)

type quitDialog struct {
	show      bool
	activeBtn int // 0=Yes, 1=No
}

// page is the interface all tab pages must implement.
// handled=true means the child consumed the message; the parent skips its own handling.
// For data messages (non-input), children always return handled=false.
type page interface {
	SetProps(common.Props)
	TitleRight() string
	Update(tea.Msg) (tea.Cmd, bool)
	View() string
}

type model struct {
	props   common.Props
	tab     tab
	quit    quitDialog
	puzzles *puzzles.Model
	reports *reports.Model
	results *results.Model
}

func (m model) activePage() page {
	switch m.tab {
	case tabPuzzles:
		return m.puzzles
	case tabResults:
		return m.results
	default:
		return m.reports
	}
}

func newModel(props common.Props) model {
	return model{
		props:   props,
		puzzles: puzzles.New(props),
		reports: reports.New(props),
		results: results.New(props),
	}
}

func (m model) Init() tea.Cmd {
	return m.puzzles.Init()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.props.Width = msg.Width
		m.props.Height = msg.Height
		subProps := common.Props{
			Width:  msg.Width,
			Height: msg.Height - 3, // subtract 3-row tab header
			Global: m.props.Global,
		}
		m.puzzles.SetProps(subProps)
		m.reports.SetProps(subProps)
		m.results.SetProps(subProps)
		return m, nil

	case tea.KeyPressMsg:
		if m.quit.show {
			switch msg.String() {
			case "left", "h", "shift+tab":
				m.quit.activeBtn = 0
			case "right", "l", "tab":
				m.quit.activeBtn = 1
			case "enter", "space":
				if m.quit.activeBtn == 0 {
					return m, tea.Quit
				}
				m.quit.show = false
			case "esc", "n":
				m.quit.show = false
			case "y":
				return m, tea.Quit
			}
			return m, nil
		}

		// Active child handles first.
		cmd, handled := m.activePage().Update(msg)
		if handled {
			return m, cmd
		}

		// Child didn't handle it — parent handles global keys.
		km := m.props.Global.KeyMap
		if msg.String() == "esc" || key.Matches(msg, km.Quit) {
			m.quit = quitDialog{show: true, activeBtn: 0}
			return m, nil
		}
		switch {
		case key.Matches(msg, km.Tab1):
			m.tab = tabPuzzles
		case key.Matches(msg, km.Tab2):
			m.tab = tabResults
			if m.results.NeedsLoad() {
				return m, m.results.Load(0)
			}
		case key.Matches(msg, km.Tab3):
			m.tab = tabReports
			if m.reports.NeedsLoad() {
				return m, m.reports.Load()
			}
		}
		return m, nil

	case tea.MouseWheelMsg:
		cmd, _ := m.activePage().Update(msg)
		return m, cmd

	default:
		// Non-key messages go to all children.
		pc, _ := m.puzzles.Update(msg)
		rc, _ := m.results.Update(msg)
		rpc, _ := m.reports.Update(msg)
		return m, tea.Batch(pc, rc, rpc)
	}
}

func (m model) View() tea.View {
	p := m.activePage()
	bg := common.RenderHeader(m.props.Width, int(m.tab), p.TitleRight()) + "\n" + p.View()

	if !m.quit.show {
		v := tea.NewView(bg)
		v.MouseMode = tea.MouseModeCellMotion
		return v
	}

	if extra := m.props.Height - (strings.Count(bg, "\n") + 1); extra > 0 {
		bg += strings.Repeat("\n", extra)
	}
	var btnYes, btnNo lipgloss.Style
	if m.quit.activeBtn == 0 {
		btnYes, btnNo = activeBtnStyle, dimBtnStyle
	} else {
		btnYes, btnNo = dimBtnStyle, activeBtnStyle
	}
	dialogContent := "Quit program?\n\n" + btnYes.Render("Yes") + "  " + btnNo.Render("No")
	dialog := dialogStyle.Render(dialogContent)
	x := max(0, (m.props.Width-lipgloss.Width(dialog))/2)
	y := max(0, (m.props.Height-lipgloss.Height(dialog))/2)
	comp := lipgloss.NewCompositor(
		lipgloss.NewLayer(bg),
		lipgloss.NewLayer(dialog).X(x).Y(y),
	)
	v := tea.NewView(comp.Render())
	v.MouseMode = tea.MouseModeCellMotion
	return v
}
