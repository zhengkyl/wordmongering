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

type model struct {
	props   common.Props
	tab     tab
	quit    quitDialog
	puzzles *puzzles.Model
	reports *reports.Model
	results *results.Model
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

		km := m.props.Global.KeyMap
		isEditing := m.tab == tabPuzzles && m.puzzles.IsEditing()
		// esc backs out of the focus stack; at root level it opens the quit dialog
		if msg.String() == "esc" {
			atRoot := m.tab != tabPuzzles || m.puzzles.IsAtRoot()
			if atRoot {
				m.quit = quitDialog{show: true, activeBtn: 1}
				return m, nil
			}
			// fall through: let puzzle handle esc to back out of pvEdit/pvSaved
		}
		// q passes through to puzzle editor when editing; ctrl+c always shows dialog
		if key.Matches(msg, km.Quit) && (!isEditing || msg.String() != "q") {
			m.quit = quitDialog{show: true, activeBtn: 1}
			return m, nil
		}

		if !isEditing {
			switch {
			case key.Matches(msg, km.Tab1):
				m.tab = tabPuzzles
				return m, nil
			case key.Matches(msg, km.Tab2):
				m.tab = tabResults
				if m.results.NeedsLoad() {
					return m, m.results.Load(0)
				}
				return m, nil
			case key.Matches(msg, km.Tab3):
				m.tab = tabReports
				if m.reports.NeedsLoad() {
					return m, m.reports.Load()
				}
				return m, nil
			}
		}

		var cmd tea.Cmd
		switch m.tab {
		case tabPuzzles:
			cmd = m.puzzles.Update(msg)
		case tabReports:
			cmd = m.reports.Update(msg)
		case tabResults:
			cmd = m.results.Update(msg)
		}
		return m, cmd

	default:
		return m, tea.Batch(
			m.puzzles.Update(msg),
			m.reports.Update(msg),
			m.results.Update(msg),
		)
	}
}

func (m model) View() tea.View {
	var right, content string
	switch m.tab {
	case tabPuzzles:
		right = m.puzzles.TitleRight()
		content = m.puzzles.View()
	case tabReports:
		right = m.reports.TitleRight()
		content = m.reports.View()
	case tabResults:
		right = m.results.TitleRight()
		content = m.results.View()
	}
	bg := common.RenderHeader(m.props.Width, int(m.tab), right) + "\n" + content

	if !m.quit.show {
		return tea.NewView(bg)
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
	return tea.NewView(comp.Render())
}
