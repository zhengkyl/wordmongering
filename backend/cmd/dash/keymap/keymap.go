package keymap

import "charm.land/bubbles/v2/key"

type KeyMap struct {
	Quit key.Binding
	Tab1 key.Binding
	Tab2 key.Binding
	Tab3 key.Binding
	Up   key.Binding
	Down key.Binding
}

func Default() KeyMap {
	return KeyMap{
		Quit: key.NewBinding(key.WithKeys("ctrl+c", "q"), key.WithHelp("ctrl+c/q", "quit")),
		Tab1: key.NewBinding(key.WithKeys("1"), key.WithHelp("1/2/3", "tab")),
		Tab2: key.NewBinding(key.WithKeys("2")),
		Tab3: key.NewBinding(key.WithKeys("3")),
		Up:   key.NewBinding(key.WithKeys("k", "up"), key.WithHelp("j/k", "scroll")),
		Down: key.NewBinding(key.WithKeys("j", "down")),
	}
}
