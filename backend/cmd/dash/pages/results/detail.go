package results

import (
	"fmt"
	"strings"

	"charm.land/bubbles/v2/key"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/util"
	"github.com/zhengkyl/wordmongering/backend/internal/game"
)

type moveDetail struct {
	word      string
	matched   []int
	rating    string
	bestMoves []string
}

type detailModel struct {
	props  common.Props
	row    resultRow
	moves  []moveDetail
	scroll int
}

func newDetail(props common.Props, row resultRow, puzzle string, words []string) *detailModel {
	return &detailModel{
		props: props,
		row:   row,
		moves: buildMoves(row.words, puzzle, words),
	}
}

func buildMoves(words []string, puzzle string, wordList []string) []moveDetail {
	moves := make([]moveDetail, 0, len(words))
	remaining := puzzle
	for _, word := range words {
		matched := game.InputMatchedIndexes(remaining, word)
		cleared := len(matched)

		var rating string
		var bestMoves []string
		if cleared == len([]rune(remaining)) {
			if cleared >= 6 {
				rating = "brilliant"
			} else if cleared >= 5 {
				rating = "strong"
			}
		} else if len(wordList) > 0 {
			nearOptimal, sample := game.SampleOptimalMoves(remaining, wordList, 3)
			rating = game.RateMove(cleared, nearOptimal)
			if cleared < nearOptimal {
				bestMoves = sample
			}
		}

		moves = append(moves, moveDetail{
			word:      word,
			matched:   matched,
			rating:    rating,
			bestMoves: bestMoves,
		})

		runes := []rune(remaining)
		remaining = string(runes[cleared:])
	}
	return moves
}

func (m *detailModel) SetProps(props common.Props) { m.props = props }

func (m *detailModel) TitleRight() string {
	return common.DayLabel(m.row.puzzleId) + " · detail"
}

func (m *detailModel) scrollDown() (tea.Cmd, bool) {
	contentH := m.props.Height - 2
	if m.scroll < max(0, totalLines(len(m.moves))-contentH) {
		m.scroll++
	}
	return nil, true
}

func (m *detailModel) scrollUp() (tea.Cmd, bool) {
	if m.scroll > 0 {
		m.scroll--
	}
	return nil, true
}

func (m *detailModel) Update(msg tea.Msg) (tea.Cmd, bool) {
	switch msg := msg.(type) {
	case tea.KeyPressMsg:
		km := m.props.Global.KeyMap
		switch {
		case key.Matches(msg, km.Down):
			return m.scrollDown()
		case key.Matches(msg, km.Up):
			return m.scrollUp()
		}
	case tea.MouseWheelMsg:
		switch msg.Button {
		case tea.MouseWheelDown:
			return m.scrollDown()
		case tea.MouseWheelUp:
			return m.scrollUp()
		}
	}
	return nil, false
}

// totalLines returns the total rendered line count for a detail view with n moves.
// Layout: 1 blank + 1 header + 1 blank + n*(1 word + 1 best/blank + 1 gap)
func totalLines(n int) int {
	return 3 + n*3
}

var (
	matchedStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("10")).Bold(true)
	brilliantStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("14")).Bold(true)
	strongStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("10")).Bold(true)
	weakStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("11")).Bold(true)
	blunderStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("9")).Bold(true)
)

var ratingLabels = map[string]string{
	"brilliant": "Brilliant!!",
	"strong":    "Strong!",
	"weak":      "Weak?",
	"blunder":   "Blunder??",
}

var ratingStyles = map[string]lipgloss.Style{
	"brilliant": brilliantStyle,
	"strong":    strongStyle,
	"weak":      weakStyle,
	"blunder":   blunderStyle,
}

func renderWord(word string, matched []int) string {
	matchedSet := make(map[int]bool, len(matched))
	for _, i := range matched {
		matchedSet[i] = true
	}
	var b strings.Builder
	for i, ch := range word {
		if matchedSet[i] {
			b.WriteString(matchedStyle.Render(string(ch)))
		} else {
			b.WriteString(common.DimStyle.Render(string(ch)))
		}
	}
	return b.String()
}

func (m *detailModel) View() string {
	width := m.props.Width
	contentH := m.props.Height - 2
	showScrollbar := totalLines(len(m.moves)) > contentH
	contentW := width
	if showScrollbar {
		contentW = width - scrollbarW
	}

	hints := common.RenderKey("j/k", "scroll") + "  " + common.RenderKey("esc", "back")
	footer := common.RenderFooter(width, hints, "")

	row := m.row
	header := fmt.Sprintf("%s  ·  %d words", common.DayLabel(row.puzzleId), len(row.words))
	if row.playerHint != "" {
		header += "  ·  " + common.DimStyle.Render(row.playerHint)
	}

	allLines := make([]string, 0, totalLines(len(m.moves)))
	allLines = append(allLines, "", "  "+common.TitleStyle.Render(header), "")

	for i, mv := range m.moves {
		prefix := fmt.Sprintf("  %2d.  ", i+1)
		wordStr := renderWord(mv.word, mv.matched)

		var ratingStr string
		var ratingWidth int
		if mv.rating != "" {
			label := ratingLabels[mv.rating]
			ratingStr = ratingStyles[mv.rating].Render(label)
			ratingWidth = len(label)
		}

		pad := max(1, contentW-len(prefix)-len(mv.word)-ratingWidth)
		allLines = append(allLines, prefix+wordStr+strings.Repeat(" ", pad)+ratingStr)

		if len(mv.bestMoves) > 0 {
			allLines = append(allLines, "        "+common.DimStyle.Render("Best: "+strings.Join(mv.bestMoves, " · ")))
		} else {
			allLines = append(allLines, "")
		}

		allLines = append(allLines, "")
	}

	n := len(allLines)
	maxScroll := max(0, n-contentH)
	scroll := min(m.scroll, maxScroll)
	viewEnd := min(scroll+contentH, n)

	var b strings.Builder
	for _, line := range allLines[scroll:viewEnd] {
		b.WriteString(line + "\n")
	}

	content := lipgloss.NewStyle().Width(contentW).Height(contentH).Render(strings.TrimSuffix(b.String(), "\n"))
	if showScrollbar {
		scrollBar := util.RenderScrollbar(contentH, max(1, n-contentH), scroll)
		return lipgloss.JoinHorizontal(lipgloss.Top, content, scrollBar) + "\n" + footer
	}
	return content + "\n" + footer
}
