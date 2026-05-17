package common

import (
	"strings"
	"time"

	"charm.land/lipgloss/v2"
)

var (
	Accent    = lipgloss.Color("#ffaf04")
	Muted     = lipgloss.Color("241")
	ErrColor  = lipgloss.Color("9")
	WarnColor = lipgloss.Color("11")

	TitleStyle    = lipgloss.NewStyle().Bold(true)
	SelectedStyle = lipgloss.NewStyle().Bold(true).Foreground(Accent)
	DimStyle      = lipgloss.NewStyle().Foreground(Muted)
	ErrStyle      = lipgloss.NewStyle().Foreground(ErrColor)
	WarnStyle     = lipgloss.NewStyle().Foreground(WarnColor)
)

var TabNames = []string{"Puzzles", "Results", "Reports"}

var (
	activeTabBorder = lipgloss.Border{
		Top: "─", Bottom: " ", Left: "│", Right: "│",
		TopLeft: "╭", TopRight: "╮", BottomLeft: "┘", BottomRight: "└",
	}
	inactiveTabBorder = lipgloss.Border{
		Top: "─", Bottom: "─", Left: "│", Right: "│",
		TopLeft: "╭", TopRight: "╮", BottomLeft: "┴", BottomRight: "┴",
	}

	activeTabStyle = lipgloss.NewStyle().
			Border(activeTabBorder, true).
			BorderForeground(Accent).
			Padding(0, 1)

	// activeTabStyle = tabStyle.Border(activeTabBorder, true)
	inactiveTabStyle = activeTabStyle.Border(inactiveTabBorder, true).Foreground(Muted)

	tabGapStyle = inactiveTabStyle.
			BorderTop(false).
			BorderLeft(false).
			BorderRight(false).PaddingLeft(0)
)

func RenderHeader(width, activeTab int, right string) string {
	if width <= 0 {
		width = 80
	}

	tabViews := make([]string, len(TabNames)+1)

	for i, name := range TabNames {
		if i == activeTab {
			tabViews[i] = activeTabStyle.Render(name)
		} else {
			tabViews[i] = inactiveTabStyle.Render(name)
		}
	}

	row := lipgloss.JoinHorizontal(lipgloss.Top, tabViews...)
	rightStr := DimStyle.Render(right)
	gapW := max(0, width-lipgloss.Width(row)-2-lipgloss.Width(rightStr))
	gap := tabGapStyle.Render(strings.Repeat(" ", gapW) + rightStr)

	logo := tabGapStyle.Render("WORDMONGERING")
	return lipgloss.JoinHorizontal(lipgloss.Bottom, logo, row, gap)
}

// RenderFooter renders a 2-line separator + hints bar. Pass pageInfo to right-align it.
func RenderFooter(width int, hints, pageInfo string) string {
	if width <= 0 {
		width = 80
	}
	sep := DimStyle.Render(strings.Repeat("─", width))
	hintsStr := DimStyle.Render(" " + hints)
	if pageInfo == "" {
		return sep + "\n" + hintsStr
	}
	pageStr := DimStyle.Render(pageInfo + " ")
	pad := max(0, width-lipgloss.Width(hintsStr)-lipgloss.Width(pageStr))
	return sep + "\n" + hintsStr + strings.Repeat(" ", pad) + pageStr
}

func RenderKey(k, desc string) string {
	return lipgloss.NewStyle().Bold(true).Foreground(Accent).Render(k) + DimStyle.Render(" "+desc)
}

func Truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n-1]) + "…"
}

func FormatTime(unix int64) string {
	return time.Unix(unix, 0).UTC().Format("Jan 02 15:04")
}
