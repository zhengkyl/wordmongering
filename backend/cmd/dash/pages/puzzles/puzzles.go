package puzzles

import (
	"strconv"
	"strings"

	tea "charm.land/bubbletea/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
)

var wordList []string
var wordFreqs [][26]int

func InitWords(words []string) {
	wordList = make([]string, 0, len(words))
	wordFreqs = make([][26]int, 0, len(words))
	for _, w := range words {
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

type Model struct {
	props common.Props
	list  *listModel
}

func New(props common.Props) *Model {
	return &Model{props: props, list: newList(props)}
}

func (m *Model) SetProps(props common.Props) {
	m.props = props
	m.list.SetProps(props)
}

func (m *Model) Init() tea.Cmd {
	return m.list.Init()
}

func (m *Model) TitleRight() string {
	return ""
}

func (m *Model) Update(msg tea.Msg) (tea.Cmd, bool) {
	return m.list.Update(msg)
}

func (m *Model) View() string {
	return m.list.View()
}

