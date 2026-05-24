package util

import "strings"

const (
	scrollTop   = "▀"
	scrollBot   = "▄"
	scrollFull  = "█"
	scrollEmpty = " "
	scrollUp    = "▲"
	scrollDown  = "▼"
)

// RenderScrollbar renders a 1-column scrollbar of the given total height.
// positions is the number of distinct scroll positions; pos is the current one.
func RenderScrollbar(height, positions, pos int) string {
	innerHeight := height - 2
	if innerHeight <= 0 {
		return ""
	}
	thumbPositions := innerHeight * 2
	thumbHeight := 1

	if positions < thumbPositions {
		thumbHeight += thumbPositions - positions
	} else if positions > thumbPositions {
		pos = (pos + 1) * (thumbPositions - 1) / positions
	}

	endPos := pos + thumbHeight - 1
	thumbStartIndex := pos / 2
	thumbEndIndex := endPos / 2

	var sb strings.Builder
	sb.WriteString(" " + scrollUp + "\n")
	for i := 0; i < innerHeight; i++ {
		sb.WriteString(" ")
		if i == thumbStartIndex {
			if pos%2 == 1 {
				sb.WriteString(scrollBot)
			} else if thumbHeight == 1 {
				sb.WriteString(scrollTop)
			} else {
				sb.WriteString(scrollFull)
			}
		} else if i == thumbEndIndex {
			if endPos%2 == 0 {
				sb.WriteString(scrollTop)
			} else {
				sb.WriteString(scrollFull)
			}
		} else if i > thumbStartIndex && i < thumbEndIndex {
			sb.WriteString(scrollFull)
		} else {
			sb.WriteString(scrollEmpty)
		}
		if i != innerHeight-1 {
			sb.WriteString("\n")
		}
	}
	sb.WriteString("\n " + scrollDown)
	return sb.String()
}
