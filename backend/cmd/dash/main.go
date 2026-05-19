package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	tea "charm.land/bubbletea/v2"
	_ "github.com/mattn/go-sqlite3"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/common"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/keymap"
	"github.com/zhengkyl/wordmongering/backend/cmd/dash/pages/puzzles"
)

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

	if err := puzzles.InitWords(filepath.Join(staticDir, "super25k.txt")); err != nil {
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
			DB:         db,
			KeyMap:     keymap.Default(),
			PuzzlePath: filepath.Join(staticDir, "puzzles.txt"),
		},
	}

	if _, err := tea.NewProgram(newModel(props)).Run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
