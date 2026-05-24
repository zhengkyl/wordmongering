package puzzles

import (
	_ "embed"
	"math/rand"
	"os"
	"slices"
	"strconv"
	"strings"

	tea "charm.land/bubbletea/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
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
	slices.Sort(r)
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
	for i := range n {
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

func InitWords(path string) ([]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	wordList = make([]string, 0, len(lines))
	wordFreqs = make([][26]int, 0, len(lines))
	for _, w := range lines {
		var freq [26]int
		valid := true
		for _, c := range w {
			if c < 'A' || c > 'Z' {
				valid = false
				break
			}
			freq[c-'A']++
		}
		if valid && len(w) > 0 {
			wordList = append(wordList, w)
			wordFreqs = append(wordFreqs, freq)
		}
	}
	return wordList, nil
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
			c := runes[j-1] - 'A'
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
				for k := range 26 {
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
		b.WriteString(common.DimStyle.Render("  "+strconv.Itoa(i+1)) + "  " +
			strings.Join(ex, common.DimStyle.Render(" · ")))
		if i < len(r.examples)-1 && i < maxExamples-1 {
			b.WriteByte('\n')
		}
	}
	return b.String()
}

// openEditMsg is emitted by listModel when the user opens the editor.
type openEditMsg struct {
	day    int
	puzzle string
}

// backToListMsg is emitted by editModel when the user is done editing.
type backToListMsg struct{}

// Model orchestrates between the list and edit sub-models.
type Model struct {
	props common.Props
	list  *listModel
	edit  *editModel // nil when showing list
}

func New(props common.Props) *Model {
	return &Model{props: props, list: newList(props)}
}

func (m *Model) SetProps(props common.Props) {
	m.props = props
	m.list.SetProps(props)
	if m.edit != nil {
		m.edit.SetProps(props)
	}
}

func (m *Model) Init() tea.Cmd {
	return m.list.Init()
}

func (m *Model) TitleRight() string {
	if m.edit != nil {
		return m.edit.TitleRight()
	}
	return ""
}

func (m *Model) Update(msg tea.Msg) (tea.Cmd, bool) {
	// Transition messages: always handled by orchestrator.
	switch msg := msg.(type) {
	case openEditMsg:
		m.edit = newEdit(m.props, msg.day, msg.puzzle)
		return m.edit.focusCmd(), false
	case backToListMsg:
		m.edit = nil
		return m.list.reloadData(), false
	}

	// Data messages: always route to list regardless of edit state.
	switch msg.(type) {
	case morePuzzlesMsg:
		return m.list.Update(msg)
	case savedMsg:
		// File saved: refresh list data while edit stays visible.
		return m.list.reloadData(), false
	case puzzleErrMsg:
		if m.edit != nil {
			return m.edit.Update(msg)
		}
		return m.list.Update(msg)
	}

	// Input events: active sub-model first.
	if m.edit != nil {
		return m.edit.Update(msg)
	}
	return m.list.Update(msg)
}

func (m *Model) View() string {
	if m.edit != nil {
		return m.edit.View()
	}
	return m.list.View()
}
