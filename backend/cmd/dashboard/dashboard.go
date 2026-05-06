package main

import (
	_ "embed"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	_ "github.com/mattn/go-sqlite3"
)

//go:embed top5000.txt
var dictFile string

var dict [][]rune

func init() {
	for _, line := range strings.Split(strings.TrimSpace(dictFile), "\n") {
		word := strings.TrimSpace(line)
		if word == "" {
			continue
		}
		valid := true
		for _, r := range word {
			if !unicode.IsLetter(r) || !unicode.IsLower(r) {
				valid = false
				break
			}
		}
		if valid {
			dict = append(dict, []rune(word))
		}
	}
}

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
	viewResult
)

type model struct {
	db           *sql.DB
	puzzles      []puzzle
	cursor       int
	view         viewState
	input        textinput.Model
	editDay      int
	err          error
	resultPuzzle string
	histogram    *[maxWords + 1]int
}

type puzzlesMsg []puzzle
type savedMsg struct{ puzzle string }
type histogramMsg [maxWords + 1]int
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
		return savedMsg{puzzle: pz}
	}
}

// matchedCount returns how many tiles from the front of puzzle are covered by word.
func matchedCount(puzzle, word []rune) int {
	var used []int
	for _, pc := range puzzle {
		found := false
		for wi, wc := range word {
			if wc != pc {
				continue
			}
			inUsed := false
			for _, u := range used {
				if u == wi {
					inUsed = true
					break
				}
			}
			if inUsed {
				continue
			}
			used = append(used, wi)
			found = true
			break
		}
		if !found {
			break
		}
	}
	return len(used)
}

const (
	maxWords    = 13
	maxHistCount = 1_000_000
)

// solve returns hist where hist[n] = # of ways to complete remaining in exactly n words (1–13).
func solve(remaining []rune, memo map[string][maxWords + 1]int) [maxWords + 1]int {
	if len(remaining) == 0 {
		return [maxWords + 1]int{1}
	}
	key := string(remaining)
	if cached, ok := memo[key]; ok {
		return cached
	}
	var result [maxWords + 1]int
	for _, word := range dict {
		n := matchedCount(remaining, word)
		if n < 2 {
			continue
		}
		sub := solve(remaining[n:], memo)
		for i := 0; i < maxWords; i++ {
			result[i+1] += sub[i]
			if result[i+1] > maxHistCount {
				result[i+1] = maxHistCount
			}
		}
	}
	memo[key] = result
	return result
}

func computeHistogram(pz string) tea.Cmd {
	return func() tea.Msg {
		memo := map[string][maxWords + 1]int{}
		hist := solve([]rune(pz), memo)
		return histogramMsg(hist)
	}
}

func onlyLowerAlpha(s string) error {
	for _, r := range s {
		if !unicode.IsLetter(r) || !unicode.IsLower(r) {
			return errors.New("only lowercase letters allowed")
		}
	}
	return nil
}

func newModel(db *sql.DB) model {
	ti := textinput.New()
	ti.Placeholder = "puzzle string"
	ti.CharLimit = 256
	ti.Validate = onlyLowerAlpha

	return model{db: db, view: viewList, input: ti, editDay: -1}
}

func (m model) Init() tea.Cmd {
	return loadPuzzles(m.db)
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch m.view {
		case viewList:
			return m.updateList(msg)
		case viewEdit:
			return m.updateEdit(msg)
		case viewResult:
			return m.updateResult(msg)
		}
	case puzzlesMsg:
		m.puzzles = []puzzle(msg)
		m.cursor = min(m.cursor, max(0, len(m.puzzles)-1))
		m.err = nil
		return m, nil
	case savedMsg:
		return m, tea.Batch(computeHistogram(msg.puzzle), loadPuzzles(m.db))
	case histogramMsg:
		h := [maxWords + 1]int(msg)
		m.histogram = &h
		return m, nil
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
		m.view = viewResult
		m.resultPuzzle = val
		m.histogram = nil
		m.input.Blur()
		return m, savePuzzle(m.db, m.editDay, val)
	}
	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg)
	return m, cmd
}

func (m model) updateResult(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if msg.String() == "ctrl+c" {
		return m, tea.Quit
	}
	m.view = viewList
	return m, nil
}

func (m model) View() string {
	switch m.view {
	case viewEdit:
		return m.viewEdit()
	case viewResult:
		return m.viewResult()
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
	s += "Puzzle: " + m.input.View() + "\n"
	s += dimStyle.Render(fmt.Sprintf("%d chars", len([]rune(m.input.Value())))) + "\n\n"
	s += dimStyle.Render("[enter] save  [esc] cancel")

	if m.err != nil {
		s += "\n" + errStyle.Render("error: "+m.err.Error())
	}

	return s
}

func (m model) viewResult() string {
	var dayStr string
	if m.editDay == -1 {
		dayStr = "new"
	} else {
		date := dayToDate(m.editDay)
		dayStr = fmt.Sprintf("Day %d, %s", m.editDay, date.Format("Jan 02"))
	}
	s := titleStyle.Render(fmt.Sprintf("%q (%s)", m.resultPuzzle, dayStr)) + "\n\n"

	s += dimStyle.Render(fmt.Sprintf("dict: %d words", len(dict))) + "\n\n"

	if m.histogram == nil {
		s += dimStyle.Render("Computing...") + "\n"
	} else {
		hist := m.histogram

		maxVal := 0
		for i := 1; i <= maxWords; i++ {
			if hist[i] > maxVal {
				maxVal = hist[i]
			}
		}

		const barWidth = 20
		for i := 1; i <= maxWords; i++ {
			label := fmt.Sprintf("%2d word", i)
			if i != 1 {
				label += "s"
			} else {
				label += " "
			}
			filled := 0
			if maxVal > 0 {
				filled = max(0, min(barWidth, hist[i]*barWidth/maxVal))
			}
			bar := strings.Repeat("█", filled) + strings.Repeat("░", barWidth-filled)
			s += fmt.Sprintf("%s  %s  %d\n", label, bar, hist[i])
		}
	}

	s += "\n" + dimStyle.Render("[any key] back")
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
