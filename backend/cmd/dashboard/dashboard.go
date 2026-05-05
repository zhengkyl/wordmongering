package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	_ "github.com/mattn/go-sqlite3"
)

var epoch = time.Date(2026, time.April, 26, 0, 0, 0, 0, time.UTC)

func dayToDate(day int) time.Time {
	return epoch.AddDate(0, 0, day)
}

type puzzle struct {
	day    int
	puzzle string
}

type viewState int

const (
	viewList viewState = iota
	viewEdit
)

type model struct {
	db      *sql.DB
	puzzles []puzzle
	cursor  int
	view    viewState
	input   textinput.Model
	editDay int
	err     error
}

type puzzlesMsg []puzzle
type savedMsg struct{}
type errMsg error

var (
	titleStyle    = lipgloss.NewStyle().Bold(true)
	selectedStyle = lipgloss.NewStyle().Bold(true)
	dimStyle      = lipgloss.NewStyle().Faint(true)
	errStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("9"))
)

func loadPuzzles(db *sql.DB) tea.Cmd {
	return func() tea.Msg {
		rows, err := db.Query("SELECT day, puzzle FROM puzzles ORDER BY day")
		if err != nil {
			return errMsg(err)
		}
		defer rows.Close()

		var puzzles []puzzle
		for rows.Next() {
			var p puzzle
			rows.Scan(&p.day, &p.puzzle)
			puzzles = append(puzzles, p)
		}
		return puzzlesMsg(puzzles)
	}
}

func savePuzzle(db *sql.DB, day int, pz string) tea.Cmd {
	return func() tea.Msg {
		var err error
		if day == -1 {
			_, err = db.Exec("INSERT INTO puzzles (puzzle) VALUES (?)", pz)
		} else {
			_, err = db.Exec("UPDATE puzzles SET puzzle = ? WHERE day = ?", pz, day)
		}
		if err != nil {
			return errMsg(err)
		}
		return savedMsg{}
	}
}

func newModel(db *sql.DB) model {
	ti := textinput.New()
	ti.Placeholder = "puzzle string"
	ti.CharLimit = 256

	return model{db: db, view: viewList, input: ti, editDay: -1}
}

func (m model) Init() tea.Cmd {
	return loadPuzzles(m.db)
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		if m.view == viewList {
			return m.updateList(msg)
		}
		return m.updateEdit(msg)
	case puzzlesMsg:
		m.puzzles = []puzzle(msg)
		m.cursor = min(m.cursor, max(0, len(m.puzzles)-1))
		m.err = nil
		return m, nil
	case savedMsg:
		return m, loadPuzzles(m.db)
	case errMsg:
		m.err = error(msg)
		return m, nil
	}
	return m, nil
}

func (m model) updateList(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "ctrl+c":
		return m, tea.Quit
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
	case "down", "j":
		if m.cursor < len(m.puzzles)-1 {
			m.cursor++
		}
	case "a":
		m.view = viewEdit
		m.editDay = -1
		m.input.SetValue("")
		m.input.Focus()
		return m, textinput.Blink
	case "e", "enter":
		if len(m.puzzles) > 0 {
			p := m.puzzles[m.cursor]
			m.view = viewEdit
			m.editDay = p.day
			m.input.SetValue(p.puzzle)
			m.input.CursorEnd()
			m.input.Focus()
			return m, textinput.Blink
		}
	}
	return m, nil
}

func (m model) updateEdit(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.view = viewList
		m.input.Blur()
		return m, nil
	case "enter":
		val := m.input.Value()
		if val == "" {
			return m, nil
		}
		m.view = viewList
		m.input.Blur()
		return m, savePuzzle(m.db, m.editDay, val)
	}
	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg)
	return m, cmd
}

func (m model) View() string {
	if m.view == viewEdit {
		return m.viewEdit()
	}
	return m.viewList()
}

func (m model) viewList() string {
	s := titleStyle.Render("Puzzles") + "\n\n"

	if len(m.puzzles) == 0 {
		s += dimStyle.Render("No puzzles yet.") + "\n"
	}
	for i, p := range m.puzzles {
		date := dayToDate(p.day)
		line := fmt.Sprintf("Day %-4d  %s  %s", p.day, date.Format("Jan 02"), p.puzzle)
		if i == m.cursor {
			s += selectedStyle.Render("> " + line)
		} else {
			s += "  " + line
		}
		s += "\n"
	}

	s += "\n" + dimStyle.Render("[a] add  [e/enter] edit  [q] quit")

	if m.err != nil {
		s += "\n" + errStyle.Render("error: "+m.err.Error())
	}

	return s
}

func (m model) viewEdit() string {
	var title string
	if m.editDay == -1 {
		title = "Add Puzzle"
	} else {
		title = "Edit Day " + strconv.Itoa(m.editDay)
	}

	s := titleStyle.Render(title) + "\n\n"
	s += "Puzzle: " + m.input.View() + "\n\n"
	s += dimStyle.Render("[enter] save  [esc] cancel")

	if m.err != nil {
		s += "\n" + errStyle.Render("error: "+m.err.Error())
	}

	return s
}

func main() {
	root, ok := os.LookupEnv("ROOT")
	if !ok {
		root = ".."
	}

	db, err := sql.Open("sqlite3", filepath.Join(root, "data/app.db"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "open db: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	if _, err := tea.NewProgram(newModel(db)).Run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
