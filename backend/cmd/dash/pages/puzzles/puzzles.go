package puzzles

import (
	"database/sql"
	_ "embed"
	"fmt"
	"math/rand"
	"os"
	"sort"
	"strconv"
	"strings"
	"unicode"

	"charm.land/bubbles/v2/key"
	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/util"
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

type letterFreq struct {
	r rune
	w int
}

type freqDist struct {
	name  string
	freqs []letterFreq
}

var freqDists = []freqDist{
	{
		name: "easy",
		freqs: []letterFreq{
			{'E', 1270}, {'T', 906}, {'A', 817}, {'O', 751}, {'I', 697},
			{'N', 675}, {'S', 633}, {'H', 609}, {'R', 599}, {'D', 425},
			{'L', 403}, {'C', 278}, {'U', 276}, {'M', 241}, {'W', 236},
			{'F', 223}, {'G', 202}, {'Y', 197}, {'P', 193}, {'B', 149},
			{'V', 98}, {'K', 77}, {'J', 15}, {'X', 15}, {'Q', 10}, {'Z', 7},
		},
	},
	{
		name: "medium",
		freqs: []letterFreq{
			{'E', 835}, {'T', 800}, {'A', 560}, {'O', 525}, {'I', 600},
			{'N', 640}, {'S', 615}, {'H', 555}, {'R', 550}, {'D', 415},
			{'L', 400}, {'C', 315}, {'U', 290}, {'M', 270}, {'W', 340},
			{'F', 260}, {'G', 250}, {'Y', 225}, {'P', 270}, {'B', 250},
			{'V', 200}, {'K', 240}, {'J', 60}, {'X', 45}, {'Q', 20}, {'Z', 40},
		},
	},
	{
		name: "hard",
		freqs: []letterFreq{
			{'E', 400}, {'T', 700}, {'A', 300}, {'O', 300}, {'I', 500},
			{'N', 600}, {'S', 600}, {'H', 500}, {'R', 500}, {'D', 400},
			{'L', 400}, {'C', 350}, {'U', 300}, {'M', 300}, {'W', 450},
			{'F', 300}, {'G', 300}, {'Y', 250}, {'P', 350}, {'B', 350},
			{'V', 300}, {'K', 400}, {'J', 100}, {'X', 75}, {'Q', 30}, {'Z', 75},
		},
	},
}

func generatePuzzle(length int, freqs []letterFreq) string {
	result := make([]rune, 0, length)
	restarts := 0
	for len(result) < length {
		n := len(result)
		validIdx := []int{}
		totalWeight := 0
		for i, lf := range freqs {
			r := lf.r
			ok := true
			if n >= 1 {
				k := sortedKey([]rune{result[n-1], r})
				if _, found := dead.no2[k]; found {
					ok = false
				} else if _, found := dead.one2[k]; found {
					ok = false
				}
			}
			if ok && n >= 2 {
				k := sortedKey([]rune{result[n-2], result[n-1], r})
				if _, found := dead.no3[k]; found {
					ok = false
				} else if _, found := dead.one3[k]; found {
					ok = false
				}
			}
			if ok {
				validIdx = append(validIdx, i)
				totalWeight += lf.w
			}
		}
		if len(validIdx) == 0 {
			restarts++
			if restarts > 200 {
				break
			}
			result = result[:max(0, n-2)]
			continue
		}
		pick := rand.Intn(totalWeight)
		for _, i := range validIdx {
			pick -= freqs[i].w
			if pick < 0 {
				result = append(result, freqs[i].r)
				break
			}
		}
	}
	return string(result)
}

var wordList []string
var wordFreqs [][26]int

func InitWords(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	wordList = make([]string, 0, len(lines))
	wordFreqs = make([][26]int, 0, len(lines))
	for _, w := range lines {
		var freq [26]int
		valid := true
		for _, c := range w {
			if c < 'a' || c > 'z' {
				valid = false
				break
			}
			freq[c-'a']++
		}
		if valid && len(w) > 0 {
			wordList = append(wordList, w)
			wordFreqs = append(wordFreqs, freq)
		}
	}
	return nil
}

type minSolveResult struct {
	count    int // -1 = unsolvable
	examples [][]string
}

func computeMinSolve(puzzle string) minSolveResult {
	runes := []rune(puzzle)
	n := len(runes)
	if n == 0 {
		return minSolveResult{}
	}
	const inf = 1000
	dp := make([]int, n+1)
	for i := range dp {
		dp[i] = inf
	}
	dp[n] = 0

	type slotOption struct {
		j     int
		words []string
	}
	optSlots := make([][]slotOption, n)

	for i := n - 1; i >= 0; i-- {
		var seg [26]int
		for j := i + 1; j <= n; j++ {
			c := runes[j-1] - 'a'
			if c < 0 || c >= 26 {
				break
			}
			seg[c]++
			if dp[j] >= inf {
				continue
			}
			target := dp[j] + 1
			if target > dp[i] {
				continue
			}
			var slotWords []string
			for wi, wf := range wordFreqs {
				ok := true
				for k := 0; k < 26; k++ {
					if wf[k] < seg[k] {
						ok = false
						break
					}
				}
				if ok {
					slotWords = append(slotWords, wordList[wi])
					if len(slotWords) >= 20 {
						break
					}
				}
			}
			if len(slotWords) == 0 {
				continue
			}
			if target < dp[i] {
				dp[i] = target
				optSlots[i] = nil
			}
			optSlots[i] = append(optSlots[i], slotOption{j, slotWords})
		}
	}

	if dp[0] >= inf {
		return minSolveResult{count: -1}
	}

	type segKey struct{ i, j int }
	wordUsed := make(map[string]int)
	segUsed := make(map[segKey]int)
	var examples [][]string

	for range 5 {
		var example []string
		pos := 0
		ok := true
		for pos < n {
			slots := optSlots[pos]
			if len(slots) == 0 {
				ok = false
				break
			}
			bestWordCount := 1 << 30
			bestSegCount := 1 << 30
			bestJ := 0
			bestWord := ""
			for _, s := range slots {
				sc := segUsed[segKey{pos, s.j}]
				for _, w := range s.words {
					wc := wordUsed[w]
					if wc < bestWordCount || (wc == bestWordCount && sc < bestSegCount) {
						bestWordCount = wc
						bestSegCount = sc
						bestJ = s.j
						bestWord = w
					}
				}
			}
			example = append(example, bestWord)
			wordUsed[bestWord]++
			segUsed[segKey{pos, bestJ}]++
			pos = bestJ
		}
		if ok {
			examples = append(examples, example)
		}
	}

	return minSolveResult{count: dp[0], examples: examples}
}

func renderSolve(r minSolveResult, maxExamples int) string {
	if r.count < 0 {
		return common.WarnStyle.Render("unsolvable")
	}
	label := common.DimStyle.Render("min solve  ") + common.TitleStyle.Render(strconv.Itoa(r.count))
	if len(r.examples) == 0 {
		return label
	}
	var b strings.Builder
	b.WriteString(label + "\n")
	for i, ex := range r.examples {
		if i >= maxExamples {
			break
		}
		b.WriteString(common.DimStyle.Render(fmt.Sprintf("  %d", i+1)) + "  " +
			strings.Join(ex, common.DimStyle.Render(" · ")))
		if i < len(r.examples)-1 && i < maxExamples-1 {
			b.WriteByte('\n')
		}
	}
	return b.String()
}

type puzzleRow struct {
	day    int
	puzzle string
}

type morePuzzlesMsg []puzzleRow
type savedMsg struct{ puzzle string }
type scoreHistsMsg map[int][common.MaxWords + 1]int
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

func loadScoreHists(db *sql.DB) tea.Cmd {
	return func() tea.Msg {
		rows, err := db.Query(
			"SELECT puzzle_id, json_array_length(words) AS score, COUNT(*) FROM solves GROUP BY puzzle_id, score",
		)
		if err != nil {
			return puzzleErrMsg{err}
		}
		defer rows.Close()
		hists := make(map[int][common.MaxWords + 1]int)
		for rows.Next() {
			var puzzleId, score, count int
			rows.Scan(&puzzleId, &score, &count)
			if score < 1 || score > common.MaxWords {
				continue
			}
			h := hists[puzzleId]
			h[score] = count
			hists[puzzleId] = h
		}
		return scoreHistsMsg(hists)
	}
}

func savePuzzle(path string, day int, pz string) tea.Cmd {
	return func() tea.Msg {
		data, err := os.ReadFile(path)
		if err != nil && !os.IsNotExist(err) {
			return puzzleErrMsg{err}
		}
		var lines []string
		if content := strings.TrimRight(string(data), "\n"); content != "" {
			lines = strings.Split(content, "\n")
		}
		if day == -1 {
			lines = append(lines, pz)
		} else {
			idx := day - 1
			if idx >= len(lines) {
				return puzzleErrMsg{fmt.Errorf("day %d out of range", day)}
			}
			lines[idx] = pz
		}
		if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0644); err != nil {
			return puzzleErrMsg{err}
		}
		return savedMsg{puzzle: pz}
	}
}

var inputBorderStyle = lipgloss.NewStyle().
	Border(lipgloss.RoundedBorder()).
	BorderForeground(common.Accent).
	Padding(0, 1)

type puzzleItem struct {
	day     int
	puzzle  string
	hist    [common.MaxWords + 1]int
	hasHist bool
}

func renderPuzzleItem(p puzzleItem, selected bool) string {
	date := common.DayToDate(p.day)

	blocks := []rune{'▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'}
	maxVal, lastNonZero, total := 0, 0, 0
	for j := 1; j <= common.MaxWords; j++ {
		if p.hist[j] > maxVal {
			maxVal = p.hist[j]
		}
		if p.hist[j] > 0 {
			lastNonZero = j
		}
		total += p.hist[j]
	}

	var barPart, labelPart string
	if total > 0 {
		for j := 1; j <= lastNonZero; j++ {
			if p.hist[j] == 0 {
				barPart += "   "
				labelPart += "   "
			} else {
				barPart += string(blocks[min(len(blocks)-1, p.hist[j]*len(blocks)/maxVal)]) + "  "
				labelPart += fmt.Sprintf("%2d ", j)
			}
		}
		barPart += common.DimStyle.Render(fmt.Sprintf("(%d)", total))
	}

	const colW = 8
	dayStr := fmt.Sprintf("Day %d", p.day)
	dateStr := date.Format("Jan 02")

	var b strings.Builder
	if selected {
		b.WriteString(common.SelectedStyle.Render("┃") + " " + common.SelectedStyle.Render(fmt.Sprintf("%-*s", colW, dayStr)) + "  " + barPart + "\n")
		b.WriteString(common.SelectedStyle.Render("┃") + " " + common.DimStyle.Render(fmt.Sprintf("%-*s", colW, dateStr)) + "  " + common.DimStyle.Render(labelPart) + "\n")
		b.WriteString(common.SelectedStyle.Render("┃") + " " + common.DimStyle.Render(p.puzzle))
	} else {
		b.WriteString("  " + common.TitleStyle.Render(fmt.Sprintf("%-*s", colW, dayStr)) + "  " + barPart + "\n")
		b.WriteString("  " + common.DimStyle.Render(fmt.Sprintf("%-*s", colW, dateStr)) + "  " + common.DimStyle.Render(labelPart) + "\n")
		b.WriteString("  " + common.DimStyle.Render(p.puzzle))
	}
	return b.String()
}

type puzzleView int

const (
	pvList puzzleView = iota
	pvEdit
	pvSaved
)

type Model struct {
	props        common.Props
	items        []puzzleItem
	pager        util.Pager
	view         puzzleView
	input        textinput.Model
	editDay      int
	genLen       int
	freqIdx      int
	editSolve    minSolveResult
	editHasSolve bool
	savedPuzzle  string
	savedSolve   minSolveResult
	allLoaded    bool
	loading      bool
	err          error
}

func New(props common.Props) *Model {
	ti := textinput.New()
	ti.Placeholder = "puzzle letters..."
	ti.CharLimit = 256

	return &Model{
		props:   props,
		input:   ti,
		editDay: -1,
		genLen:  30,
	}
}

func (m *Model) SetProps(props common.Props) {
	m.props = props
}

func (m *Model) Init() tea.Cmd {
	return tea.Batch(loadAllPuzzles(m.props.Global.PuzzlePath), loadScoreHists(m.props.Global.DB))
}

func (m *Model) IsEditing() bool {
	return m.view == pvEdit
}

func (m *Model) IsAtRoot() bool {
	return m.view == pvList
}

func (m *Model) TitleRight() string {
	switch m.view {
	case pvEdit:
		if m.editDay == -1 {
			return "new"
		}
		return fmt.Sprintf("day %d", m.editDay)
	case pvSaved:
		if m.editDay == -1 {
			return "new · saved"
		}
		return fmt.Sprintf("day %d · %s · saved", m.editDay, common.DayToDate(m.editDay).Format("Jan 02"))
	}
	return ""
}

func (m *Model) Update(msg tea.Msg) tea.Cmd {
	switch msg := msg.(type) {
	case tea.KeyPressMsg:
		switch m.view {
		case pvList:
			return m.updateList(msg)
		case pvEdit:
			return m.updateEdit(msg)
		case pvSaved:
			m.view = pvList
		}
	case morePuzzlesMsg:
		m.loading = false
		m.allLoaded = true
		for _, p := range msg {
			m.items = append(m.items, puzzleItem{day: p.day, puzzle: p.puzzle})
		}
		m.err = nil
	case scoreHistsMsg:
		for i, p := range m.items {
			if h, ok := msg[p.day]; ok {
				m.items[i].hist = h
				m.items[i].hasHist = true
			}
		}
	case savedMsg:
		m.items = nil
		m.pager.Reset()
		m.allLoaded = false
		m.loading = true
		return tea.Batch(loadAllPuzzles(m.props.Global.PuzzlePath), loadScoreHists(m.props.Global.DB))
	case puzzleErrMsg:
		m.err = msg.error
	}
	return nil
}

func (m *Model) updateList(msg tea.KeyPressMsg) tea.Cmd {
	km := m.props.Global.KeyMap
	if key.Matches(msg, km.Add) {
		m.view = pvEdit
		m.editDay = -1
		m.input.SetValue("")
		m.input.Focus()
		return textinput.Blink
	}
	if key.Matches(msg, km.Edit) {
		if len(m.items) > 0 {
			p := m.items[m.pager.Cursor]
			m.view = pvEdit
			m.editDay = p.day
			m.input.SetValue(p.puzzle)
			m.input.Focus()
			return textinput.Blink
		}
	}
	switch {
	case key.Matches(msg, km.Up):
		m.pager.MoveUp()
	case key.Matches(msg, km.Down):
		m.pager.MoveDown(len(m.items))
	}
	return nil
}

func (m *Model) updateEdit(msg tea.KeyPressMsg) tea.Cmd {
	km := m.props.Global.KeyMap
	switch {
	case key.Matches(msg, km.Cancel):
		m.view = pvList
		m.input.Blur()
		return nil
	case key.Matches(msg, km.Save):
		val := m.input.Value()
		if val == "" {
			return nil
		}
		m.view = pvSaved
		m.savedPuzzle = val
		m.savedSolve = computeMinSolve(val)
		m.input.Blur()
		return savePuzzle(m.props.Global.PuzzlePath, m.editDay, val)
	case key.Matches(msg, km.Gen):
		generated := generatePuzzle(m.genLen, freqDists[m.freqIdx].freqs)
		m.input.SetValue(generated)
		m.editSolve = computeMinSolve(generated)
		m.editHasSolve = true
		return nil
	case key.Matches(msg, km.LenInc):
		if m.genLen < 60 {
			m.genLen++
		}
		return nil
	case key.Matches(msg, km.LenDec):
		if m.genLen > 5 {
			m.genLen--
		}
		return nil
	case key.Matches(msg, km.FreqL):
		m.freqIdx = (m.freqIdx - 1 + len(freqDists)) % len(freqDists)
		return nil
	case key.Matches(msg, km.FreqR):
		m.freqIdx = (m.freqIdx + 1) % len(freqDists)
		return nil
	}
	runes := []rune(msg.String())
	if len(runes) == 1 && (!unicode.IsLetter(runes[0]) || !unicode.IsLower(runes[0])) {
		return nil
	}
	m.editHasSolve = false
	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg)
	return cmd
}

func (m *Model) View() string {
	switch m.view {
	case pvEdit:
		return m.viewEdit()
	case pvSaved:
		return m.viewSaved()
	default:
		return m.viewList()
	}
}

const (
	puzzleItemH       = 3
	puzzleItemSpacing = 1
	puzzleItemTotal   = puzzleItemH + puzzleItemSpacing
	scrollbarW        = 3
)

func (m *Model) viewList() string {
	width := m.props.Width
	contentH := m.props.Height - 2

	hints := common.RenderKey("j/k", "navigate") + "  " + common.RenderKey("1/2/3", "tab") + " " + common.RenderKey("a", "add") + "  " + common.RenderKey("e/↵", "edit") + "  "
	footer := common.RenderFooter(width, hints, m.pager.PageInfo(len(m.items), m.allLoaded))

	fullW := lipgloss.NewStyle().Width(width).Height(contentH)
	if m.err != nil {
		return fullW.Render("\n  "+common.ErrStyle.Render("error: "+m.err.Error())) + "\n" + footer
	}
	if len(m.items) == 0 {
		return fullW.Render("") + "\n" + footer
	}

	visItems := max(1, (contentH-1)/puzzleItemTotal)

	pageStart := m.pager.PageStart()
	pageEnd := min(pageStart+util.ItemsPerPage, len(m.items))
	m.pager.UpdateViewport(visItems)

	viewStart := pageStart + m.pager.ViewportOff
	viewEnd := min(viewStart+visItems, pageEnd)

	var b strings.Builder
	b.WriteString("\n")
	for i := viewStart; i < viewEnd; i++ {
		b.WriteString(renderPuzzleItem(m.items[i], i == m.pager.Cursor))
		if i < viewEnd-1 {
			b.WriteString("\n\n") // end last line + blank spacing line between items
		}
	}

	content := lipgloss.NewStyle().Width(width - scrollbarW).Height(contentH).Render(b.String())
	scrollBar := util.RenderScrollbar(contentH, util.ItemsPerPage, m.pager.PosInPage())
	body := lipgloss.JoinHorizontal(lipgloss.Top, content, scrollBar)
	return body + "\n" + footer
}

func (m *Model) viewEdit() string {
	width := m.props.Width
	charCount := len([]rune(m.input.Value()))
	genControls := common.RenderKey("[/]", freqDists[m.freqIdx].name) + "  " +
		common.RenderKey("+/-", fmt.Sprintf("len %d", m.genLen)) + "  " +
		common.RenderKey("g", "generate")
	hints := common.RenderKey("↵", "save") + "  " + common.RenderKey("esc", "cancel") + "  " + genControls
	footer := common.RenderFooter(width, hints, "")

	var b strings.Builder
	b.WriteString("\n")
	for _, line := range strings.Split(inputBorderStyle.Render(m.input.View()), "\n") {
		b.WriteString("  " + line + "\n")
	}
	b.WriteString("  " + common.DimStyle.Render(strconv.Itoa(charCount)+" chars") + "\n\n")
	if m.editHasSolve {
		for _, line := range strings.Split(renderSolve(m.editSolve, 1), "\n") {
			b.WriteString("  " + line + "\n")
		}
		b.WriteString("\n")
	}
	if m.err != nil {
		b.WriteString("\n  " + common.ErrStyle.Render(m.err.Error()) + "\n")
	}

	body := lipgloss.NewStyle().Width(width).Height(m.props.Height - 2).Render(b.String())
	return body + "\n" + footer
}

func (m *Model) viewSaved() string {
	width := m.props.Width
	marks := annotate(m.savedPuzzle)
	var coloredPuzzle strings.Builder
	for i, ch := range m.savedPuzzle {
		switch marks[i] {
		case 'D':
			coloredPuzzle.WriteString(common.ErrStyle.Render(string(ch)))
		case '1':
			coloredPuzzle.WriteString(common.WarnStyle.Render(string(ch)))
		default:
			coloredPuzzle.WriteString(string(ch))
		}
	}
	legend := common.ErrStyle.Render("D") + common.DimStyle.Render("=dead  ") +
		common.WarnStyle.Render("1") + common.DimStyle.Render("=one word  ") +
		common.DimStyle.Render(".=fine")
	footer := common.RenderFooter(width, common.RenderKey("any key", "back"), "")

	var b strings.Builder
	b.WriteString("\n\n")
	b.WriteString("  " + coloredPuzzle.String() + "\n")
	b.WriteString("  " + legend + "\n\n")
	for _, line := range strings.Split(renderSolve(m.savedSolve, 5), "\n") {
		b.WriteString("  " + line + "\n")
	}
	if m.err != nil {
		b.WriteString("\n  " + common.ErrStyle.Render(m.err.Error()) + "\n")
	}

	body := lipgloss.NewStyle().Width(width).Height(m.props.Height - 2).Render(b.String())
	return body + "\n" + footer
}
