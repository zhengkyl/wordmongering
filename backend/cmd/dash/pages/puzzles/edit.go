package puzzles

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"unicode"

	"charm.land/bubbles/v2/key"
	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
)

var inputBorderStyle = lipgloss.NewStyle().
	Border(lipgloss.RoundedBorder()).
	BorderForeground(common.Accent).
	Padding(0, 1)

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
		return savedMsg{}
	}
}

type editView int

const (
	evEdit editView = iota
	evSaved
)

type editModel struct {
	props        common.Props
	view         editView
	input        textinput.Model
	editDay      int
	genLen       int
	freqIdx      int
	editSolve    minSolveResult
	editHasSolve bool
	savedPuzzle  string
	savedSolve   minSolveResult
	err          error
}

func newEdit(props common.Props, day int, puzzle string) *editModel {
	ti := textinput.New()
	ti.Placeholder = "puzzle letters..."
	ti.CharLimit = 256
	ti.SetValue(puzzle)
	return &editModel{
		props:   props,
		editDay: day,
		input:   ti,
		genLen:  30,
	}
}

func (m *editModel) focusCmd() tea.Cmd {
	m.input.Focus()
	return textinput.Blink
}

func (m *editModel) SetProps(props common.Props) { m.props = props }

func (m *editModel) TitleRight() string {
	if m.view == evSaved {
		if m.editDay == -1 {
			return "new · saved"
		}
		return common.DayLabel(m.editDay) + " · saved"
	}
	if m.editDay == -1 {
		return "new"
	}
	return common.DayLabel(m.editDay)
}

func (m *editModel) Update(msg tea.Msg) (tea.Cmd, bool) {
	switch msg := msg.(type) {
	case puzzleErrMsg:
		m.err = msg.error
		return nil, false
	case tea.KeyPressMsg:
		if m.view == evSaved {
			return func() tea.Msg { return backToListMsg{} }, true
		}
		return m.updateEdit(msg)
	case tea.MouseWheelMsg:
		// ignore scroll in editor
	}
	return nil, false
}

func (m *editModel) updateEdit(msg tea.KeyPressMsg) (tea.Cmd, bool) {
	// ctrl+c always bubbles so the parent can quit
	if msg.String() == "ctrl+c" {
		return nil, false
	}
	km := m.props.Global.KeyMap
	switch {
	case key.Matches(msg, km.Cancel):
		m.input.Blur()
		return func() tea.Msg { return backToListMsg{} }, true
	case key.Matches(msg, km.Save):
		val := m.input.Value()
		if val == "" {
			return nil, true
		}
		m.view = evSaved
		m.savedPuzzle = val
		m.savedSolve = computeMinSolve(val)
		m.input.Blur()
		return savePuzzle(m.props.Global.PuzzlePath, m.editDay, val), true
	case key.Matches(msg, km.Gen):
		generated := generatePuzzle(m.genLen, freqDists[m.freqIdx].freqs)
		m.input.SetValue(generated)
		m.editSolve = computeMinSolve(generated)
		m.editHasSolve = true
		return nil, true
	case key.Matches(msg, km.LenInc):
		if m.genLen < 60 {
			m.genLen++
		}
		return nil, true
	case key.Matches(msg, km.LenDec):
		if m.genLen > 5 {
			m.genLen--
		}
		return nil, true
	case key.Matches(msg, km.FreqL):
		m.freqIdx = (m.freqIdx - 1 + len(freqDists)) % len(freqDists)
		return nil, true
	case key.Matches(msg, km.FreqR):
		m.freqIdx = (m.freqIdx + 1) % len(freqDists)
		return nil, true
	}
	runes := []rune(msg.String())
	if len(runes) == 1 && (!unicode.IsLetter(runes[0]) || !unicode.IsLower(runes[0])) {
		return nil, true
	}
	m.editHasSolve = false
	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg)
	return cmd, true
}

func (m *editModel) View() string {
	if m.view == evSaved {
		return m.viewSaved()
	}
	return m.viewEdit()
}

func (m *editModel) viewEdit() string {
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

func (m *editModel) viewSaved() string {
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
