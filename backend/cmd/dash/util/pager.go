package util

import "fmt"

const ItemsPerPage = 20

// Pager tracks cursor and viewport state for a fixed-size paged list.
// Page size is always ItemsPerPage regardless of terminal height.
type Pager struct {
	Cursor      int
	ViewportOff int // item offset within current page for the visible viewport
}

func (p *Pager) MoveDown(total int) {
	if p.Cursor >= total-1 {
		return
	}
	if p.Cursor%ItemsPerPage == ItemsPerPage-1 {
		// last item of page: jump to first item of next page
		p.Cursor++
		p.ViewportOff = 0
	} else {
		p.Cursor++
	}
}

func (p *Pager) MoveUp() {
	if p.Cursor > 0 {
		p.Cursor--
	}
}

func (p *Pager) PageStart() int {
	return (p.Cursor / ItemsPerPage) * ItemsPerPage
}

func (p *Pager) PosInPage() int {
	return p.Cursor - p.PageStart()
}

// UpdateViewport scrolls the viewport minimally to keep cursor visible.
// Call this at render time.
func (p *Pager) UpdateViewport(visItems int) {
	if visItems <= 0 {
		return
	}
	pos := p.PosInPage()
	if pos < p.ViewportOff {
		p.ViewportOff = pos
	} else if pos >= p.ViewportOff+visItems {
		p.ViewportOff = pos - visItems + 1
	}
}

func (p *Pager) Reset() {
	p.Cursor = 0
	p.ViewportOff = 0
}

// PageInfo returns a right-aligned page indicator string for use in the footer.
func (p *Pager) PageInfo(totalItems int, loaded bool) string {
	if totalItems == 0 {
		return ""
	}
	start := p.PageStart() + 1
	end := min(p.PageStart()+ItemsPerPage, totalItems)
	if loaded {
		return fmt.Sprintf("items %d–%d of %d", start, end, totalItems)
	}
	return fmt.Sprintf("items %d–%d of %d+", start, end, totalItems)
}
