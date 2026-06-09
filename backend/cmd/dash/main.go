package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	tea "charm.land/bubbletea/v2"
	_ "github.com/mattn/go-sqlite3"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/keymap"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/pages/puzzles"
	"github.com/zhengkyl/wordmongering/backend/internal/game"
)

func loadWordList(path string) ([]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	words := make([]string, 0, len(lines))
	for _, l := range lines {
		if l != "" {
			words = append(words, l)
		}
	}
	return words, nil
}

func main() {
	staticDir := os.Getenv("STATIC_DIR")
	dbPath := os.Getenv("DB_PATH")

	superWords, err := loadWordList(filepath.Join(staticDir, "super25k.txt"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "load super25k: %v\n", err)
		os.Exit(1)
	}
	puzzles.InitWords(superWords)

	if err := game.LoadDead(staticDir); err != nil {
		fmt.Fprintf(os.Stderr, "load dead sets: %v\n", err)
		os.Exit(1)
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open db: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	props := common.Props{
		Global: common.Global{
			DB:     db,
			KeyMap: keymap.Default(),
			Words:  superWords,
		},
	}

	if _, err := tea.NewProgram(newModel(props)).Run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
