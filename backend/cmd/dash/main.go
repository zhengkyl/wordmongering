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

func loadWordSet(path string) (map[string]struct{}, error) {
	words, err := loadWordList(path)
	if err != nil {
		return nil, err
	}
	set := make(map[string]struct{}, len(words))
	for _, w := range words {
		set[w] = struct{}{}
	}
	return set, nil
}

func main() {
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		fmt.Fprint(os.Stderr, "STATIC_DIR not set")
		os.Exit(1)
	}
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		fmt.Fprint(os.Stderr, "DB_PATH not set")
		os.Exit(1)
	}

	superWords, err := loadWordList(filepath.Join(staticDir, "super25k.txt"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "load super25k: %v\n", err)
		os.Exit(1)
	}
	puzzles.InitWords(superWords)

	wordSet, err := loadWordSet(filepath.Join(staticDir, "words.txt"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "load words: %v\n", err)
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
			DB:      db,
			KeyMap:  keymap.Default(),
			Words:   superWords,
			WordSet: wordSet,
		},
	}

	if _, err := tea.NewProgram(newModel(props)).Run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
