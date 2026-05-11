package main

import (
	"database/sql"
	_ "embed"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"

	"charm.land/bubbles/v2/key"
	"charm.land/bubbles/v2/list"
	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	_ "github.com/mattn/go-sqlite3"
)

//go:embed no2.txt
var no2File string

//go:embed one2.txt
var one2File string

//go:embed no3.txt
var no3File string

//go:embed one3.txt
var one3File string

var dead struct {
	no2, one2, no3, one3 map[string]struct{}
}

func loadSet(data string) map[string]struct{} {
	m := make(map[string]struct{})
	for _, line := range strings.Split(strings.TrimSpace(data), "\n") {
		if line != "" {
			m[line] = struct{}{}
		}
	}
	return m
}

func init() {
	dead.no2 = loadSet(no2File)
	dead.one2 = loadSet(one2File)
	dead.no3 = loadSet(no3File)
	dead.one3 = loadSet(one3File)
}

func sortedKey(runes []rune) string {
	r := make([]rune, len(runes))
	copy(r, runes)
	sort.Slice(r, func(i, j int) bool { return r[i] < r[j] })
	return string(r)
}

// annotate returns a string of per-letter markers: D=dead combo, 1=one-word combo, .=fine.
// A position is marked by the worst status of any 2- or 3-letter window that covers it.
func annotate(pz string) string {
	runes := []rune(pz)
	n := len(runes)
	marks := make([]byte, n)
	for i := range marks {
		marks[i] = '.'
	}
	setMark := func(i int, ch byte) {
		if ch > marks[i] {
			marks[i] = ch
		}
	}
	for i := 0; i < n; i++ {
		if i+1 < n {
			k := sortedKey(runes[i : i+2])
			if _, ok := dead.no2[k]; ok {
				setMark(i, 'D')
				setMark(i+1, 'D')
			} else if _, ok := dead.one2[k]; ok {
				setMark(i, '1')
				setMark(i+1, '1')
			}
		}
		if i+2 < n {
			k := sortedKey(runes[i : i+3])
			if _, ok := dead.no3[k]; ok {
				setMark(i, 'D')
				setMark(i+1, 'D')
				setMark(i+2, 'D')
			} else if _, ok := dead.one3[k]; ok {
				setMark(i, '1')
				setMark(i+1, '1')
				setMark(i+2, '1')
			}
		}
	}
	return string(marks)
}

var epoch = time.Date(2026, time.April, 26, 0, 0, 0, 0, time.UTC)

func dayToDate(day int) time.Time {
	return epoch.AddDate(0, 0, day)
}

const (
	maxWords = 15
	pageSize = 10
)

type puzzleItem struct {
	day     int
	puzzle  string
	hist    [maxWords + 1]int
	hasHist bool
}

func (p puzzleItem) FilterValue() string { return p.puzzle }

type puzzleDelegate struct{}

func (d puzzleDelegate) Height() int                               { return 3 }
func (d puzzleDelegate) Spacing() int                             { return 1 }
func (d puzzleDelegate) Update(msg tea.Msg, m *list.Model) tea.Cmd { return nil }

var (
	titleStyle    = lipgloss.NewStyle().Bold(true)
	selectedStyle = lipgloss.NewStyle().Bold(true)
	dimStyle      = lipgloss.NewStyle().Faint(true)
	errStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("9"))
	warnStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("3"))
)

func (d puzzleDelegate) Render(w io.Writer, m list.Model, index int, item list.Item) {
	p := item.(puzzleItem)
	date := dayToDate(p.day)

	const leftWidth = 10
	blocks := []rune{'▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'}

	maxVal, lastNonZero, total := 0, 0, 0
	for j := 1; j <= maxWords; j++ {
		if p.hist[j] > maxVal {
			maxVal = p.hist[j]
		}
		if p.hist[j] > 0 {
			lastNonZero = j
		}
		total += p.hist[j]
	}

	barPart, labelPart := "", ""
	if total > 0 {
		for j := 1; j <= lastNonZero; j++ {
			if p.hist[j] == 0 {
				barPart += "   "
			} else {
				barPart += string(blocks[min(len(blocks)-1, p.hist[j]*len(blocks)/maxVal)]) + "  "
			}
			labelPart += fmt.Sprintf("%2d ", j)
		}
		barPart += fmt.Sprintf("  (%d)", total)
	}

	line1 := fmt.Sprintf("%-*s", leftWidth, fmt.Sprintf("Day %d", p.day)) + barPart
	line2 := fmt.Sprintf("%-*s", leftWidth, date.Format("Jan 02")) + dimStyle.Render(labelPart)

	if index == m.Index() {
		fmt.Fprintln(w, selectedStyle.Render("> "+line1))
	} else {
		fmt.Fprintln(w, "  "+line1)
	}
	fmt.Fprintln(w, "  "+line2)
	fmt.Fprint(w, "  "+p.puzzle)
}

type keyMap struct {
	Add  key.Binding
	Edit key.Binding
}

func (k keyMap) ShortHelp() []key.Binding {
	return []key.Binding{k.Add, k.Edit}
}

func (k keyMap) FullHelp() [][]key.Binding {
	return [][]key.Binding{{k.Add, k.Edit}}
}

var keys = keyMap{
	Add: key.NewBinding(
		key.WithKeys("a"),
		key.WithHelp("a", "add"),
	),
	Edit: key.NewBinding(
		key.WithKeys("e", "enter"),
		key.WithHelp("e/↵", "edit"),
	),
}

type viewState int

const (
	viewList viewState = iota
	viewEdit
	viewResult
)

type puzzleRow struct {
	day    int
	puzzle string
}

type morePuzzlesMsg []puzzleRow
type savedMsg struct{ puzzle string }
type scoreHistsMsg map[int][maxWords + 1]int
type errMsg error

func loadMorePuzzles(db *sql.DB, offset int) tea.Cmd {
	return func() tea.Msg {
		rows, err := db.Query(
			"SELECT day, puzzle FROM puzzles ORDER BY day DESC LIMIT ? OFFSET ?",
			pageSize, offset,
		)
		if err != nil {
			return errMsg(err)
		}
		defer rows.Close()

		var puzzles []puzzleRow
		for rows.Next() {
			var p puzzleRow
			rows.Scan(&p.day, &p.puzzle)
			puzzles = append(puzzles, p)
		}
		return morePuzzlesMsg(puzzles)
	}
}

func loadScoreHists(db *sql.DB) tea.Cmd {
	return func() tea.Msg {
		rows, err := db.Query(
			"SELECT day, json_array_length(words) AS score, COUNT(*) FROM results GROUP BY day, score",
		)
		if err != nil {
			return errMsg(err)
		}
		defer rows.Close()

		hists := make(map[int][maxWords + 1]int)
		for rows.Next() {
			var day, score, count int
			rows.Scan(&day, &score, &count)
			if score < 1 || score > maxWords {
				continue
			}
			h := hists[day]
			h[score] = count
			hists[day] = h
		}
		return scoreHistsMsg(hists)
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

type model struct {
	db           *sql.DB
	list         list.Model
	view         viewState
	input        textinput.Model
	editDay      int
	resultPuzzle string
	allLoaded    bool
	loading      bool
	err          error
}

func newModel(db *sql.DB) model {
	l := list.New(nil, puzzleDelegate{}, 80, 20)
	l.Title = "Puzzles"
	l.SetFilteringEnabled(false)
	l.AdditionalShortHelpKeys = func() []key.Binding {
		return []key.Binding{keys.Add, keys.Edit}
	}
	l.AdditionalFullHelpKeys = func() []key.Binding {
		return []key.Binding{keys.Add, keys.Edit}
	}

	ti := textinput.New()
	ti.Placeholder = "puzzle string"
	ti.CharLimit = 256

	return model{
		db:      db,
		list:    l,
		view:    viewList,
		input:   ti,
		editDay: -1,
	}
}

func (m model) Init() tea.Cmd {
	return tea.Batch(loadMorePuzzles(m.db, 0), loadScoreHists(m.db))
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.list.SetWidth(msg.Width)
		m.list.SetHeight(msg.Height)
		return m, nil
	case tea.KeyPressMsg:
		switch m.view {
		case viewList:
			return m.updateList(msg)
		case viewEdit:
			return m.updateEdit(msg)
		case viewResult:
			if msg.String() == "ctrl+c" {
				return m, tea.Quit
			}
			m.view = viewList
			return m, nil
		}
	case morePuzzlesMsg:
		m.loading = false
		if len(msg) < pageSize {
			m.allLoaded = true
		}
		existing := m.list.Items()
		newItems := make([]list.Item, len(msg))
		for i, p := range msg {
			newItems[i] = puzzleItem{day: p.day, puzzle: p.puzzle}
		}
		m.list.SetItems(append(existing, newItems...))
		m.err = nil
		return m, nil
	case scoreHistsMsg:
		items := m.list.Items()
		for i, item := range items {
			p := item.(puzzleItem)
			if h, ok := msg[p.day]; ok {
				items[i] = puzzleItem{day: p.day, puzzle: p.puzzle, hist: h, hasHist: true}
			}
		}
		m.list.SetItems(items)
		return m, nil
	case savedMsg:
		m.list.SetItems(nil)
		m.allLoaded = false
		m.loading = true
		return m, tea.Batch(loadMorePuzzles(m.db, 0), loadScoreHists(m.db))
	case errMsg:
		m.err = error(msg)
		return m, nil
	}
	return m, nil
}

func (m model) updateList(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "a":
		m.view = viewEdit
		m.editDay = -1
		m.input.SetValue("")
		m.input.Focus()
		return m, textinput.Blink
	case "e", "enter":
		if item := m.list.SelectedItem(); item != nil {
			p := item.(puzzleItem)
			m.view = viewEdit
			m.editDay = p.day
			m.input.SetValue(p.puzzle)
			m.input.Focus()
			return m, textinput.Blink
		}
	}
	var cmd tea.Cmd
	m.list, cmd = m.list.Update(msg)
	if !m.allLoaded && !m.loading && m.list.Index() >= len(m.list.Items())-3 {
		m.loading = true
		return m, tea.Batch(cmd, loadMorePuzzles(m.db, len(m.list.Items())))
	}
	return m, cmd
}

func (m model) updateEdit(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
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
		m.input.Blur()
		return m, savePuzzle(m.db, m.editDay, val)
	}
	runes := []rune(msg.String())
	if len(runes) == 1 && (!unicode.IsLetter(runes[0]) || !unicode.IsLower(runes[0])) {
		return m, nil
	}
	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg)
	return m, cmd
}

func (m model) View() tea.View {
	var s string
	switch m.view {
	case viewEdit:
		s = m.viewEdit()
	case viewResult:
		s = m.viewResult()
	default:
		s = m.list.View()
	}
	if m.err != nil {
		s += "\n" + errStyle.Render("error: "+m.err.Error())
	}
	return tea.NewView(s)
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

	marks := annotate(m.resultPuzzle)
	s += m.resultPuzzle + "\n"

	var annotLine strings.Builder
	for _, ch := range marks {
		switch ch {
		case 'D':
			annotLine.WriteString(errStyle.Render("D"))
		case '1':
			annotLine.WriteString(warnStyle.Render("1"))
		default:
			annotLine.WriteString(dimStyle.Render("."))
		}
	}
	s += annotLine.String() + "\n"
	s += dimStyle.Render("D=dead  1=one word  .=fine") + "\n"
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
