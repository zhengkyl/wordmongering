package keymap

import "charm.land/bubbles/v2/key"

type KeyMap struct {
	// Global
	Quit key.Binding
	Tab1 key.Binding
	Tab2 key.Binding
	Tab3 key.Binding
	// List navigation (reports, results)
	Up   key.Binding
	Down key.Binding
	// Puzzle list
	Add  key.Binding
	Edit key.Binding
	// Puzzle editor
	Save   key.Binding
	Cancel key.Binding
	Gen    key.Binding
	LenInc key.Binding
	LenDec key.Binding
	FreqL  key.Binding
	FreqR  key.Binding
}

func Default() KeyMap {
	return KeyMap{
		Quit:   key.NewBinding(key.WithKeys("ctrl+c", "q"), key.WithHelp("ctrl+c/q", "quit")),
		Tab1:   key.NewBinding(key.WithKeys("1"), key.WithHelp("1/2/3", "tab")),
		Tab2:   key.NewBinding(key.WithKeys("2")),
		Tab3:   key.NewBinding(key.WithKeys("3")),
		Up:     key.NewBinding(key.WithKeys("k", "up"), key.WithHelp("j/k", "scroll")),
		Down:   key.NewBinding(key.WithKeys("j", "down")),
		Add:    key.NewBinding(key.WithKeys("a"), key.WithHelp("a", "add")),
		Edit:   key.NewBinding(key.WithKeys("e", "enter"), key.WithHelp("e/↵", "edit")),
		Save:   key.NewBinding(key.WithKeys("enter"), key.WithHelp("↵", "save")),
		Cancel: key.NewBinding(key.WithKeys("esc"), key.WithHelp("esc", "cancel")),
		Gen:    key.NewBinding(key.WithKeys("g"), key.WithHelp("g", "generate")),
		LenInc: key.NewBinding(key.WithKeys("+", "="), key.WithHelp("+/-", "len")),
		LenDec: key.NewBinding(key.WithKeys("-")),
		FreqL:  key.NewBinding(key.WithKeys("["), key.WithHelp("[/]", "freq")),
		FreqR:  key.NewBinding(key.WithKeys("]")),
	}
}
