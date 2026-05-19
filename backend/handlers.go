package main

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/bits-and-blooms/bloom/v3"
	"github.com/zhengkyl/wordmongering/backend/internal/game"
)

type spaHandler struct {
	staticDir string
	fs        http.Handler
}

func newSpaHandler(staticDir string) *spaHandler {
	return &spaHandler{
		staticDir: staticDir,
		fs:        http.FileServer(http.Dir(staticDir)),
	}
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join(h.staticDir, filepath.Clean("/"+r.URL.Path))
	if _, err := os.Stat(path); os.IsNotExist(err) {
		http.ServeFile(w, r, filepath.Join(h.staticDir, "index.html"))
		return
	}
	h.fs.ServeHTTP(w, r)
}

type api struct {
	db          *sql.DB
	pepper      string
	dict        *bloom.BloomFilter
	puzzlesPath string
	puzzlesMu   sync.RWMutex
	puzzles     []string
}

func newApiHandler(db *sql.DB, staticDir string, pepper string) (*api, error) {
	f, err := os.Open(filepath.Join(staticDir, "words.txt"))
	if err != nil {
		return nil, fmt.Errorf("open words: %w", err)
	}
	defer f.Close()

	filter := bloom.NewWithEstimates(300000, 0.01)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		if word := scanner.Text(); word != "" {
			filter.Add([]byte(word + pepper))
		}
	}

	return &api{
		db:          db,
		pepper:      pepper,
		dict:        filter,
		puzzlesPath: filepath.Join(staticDir, "puzzles.txt"),
	}, nil
}

func (a *api) getPuzzle(day int) (string, bool) {
	a.puzzlesMu.RLock()
	if day <= len(a.puzzles) {
		p := a.puzzles[day-1]
		a.puzzlesMu.RUnlock()
		return p, true
	}
	a.puzzlesMu.RUnlock()

	a.puzzlesMu.Lock()
	defer a.puzzlesMu.Unlock()
	if day <= len(a.puzzles) {
		return a.puzzles[day-1], true
	}
	f, err := os.Open(a.puzzlesPath)
	if err != nil {
		return "", false
	}
	defer f.Close()
	var puzzles []string
	s := bufio.NewScanner(f)
	for s.Scan() {
		if line := s.Text(); line != "" {
			puzzles = append(puzzles, line)
		}
	}
	a.puzzles = puzzles
	if day > len(a.puzzles) {
		return "", false
	}
	return a.puzzles[day-1], true
}

// Earliest Midnight April 27, 2026 UTC+14
var epoch = time.Date(2026, time.April, 26, 10, 0, 0, 0, time.UTC)

func maxDay() int {
	return int(math.Ceil(time.Since(epoch).Hours() / 24.0))
}

func parseDay(r *http.Request) (int, bool) {
	day, err := strconv.Atoi(r.PathValue("day"))
	if err != nil || day < 1 || day > maxDay() {
		return 0, false
	}
	return day, true
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func (a *api) handleGetSolves(w http.ResponseWriter, r *http.Request) {
	day, ok := parseDay(r)
	if !ok {
		http.Error(w, "Invalid day", http.StatusBadRequest)
		return
	}

	rows, err := a.db.Query(
		"SELECT json_array_length(words) AS score, COUNT(*) FROM solves WHERE puzzle_id = ? GROUP BY score", day,
	)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	rawCounts := make(map[int]int)
	total := 0
	for rows.Next() {
		var score, count int
		rows.Scan(&score, &count)
		rawCounts[score] = count
		total += count
	}

	scoreDistribution := make(map[int]int, len(rawCounts))
	for score, count := range rawCounts {
		scoreDistribution[score] = int(math.Round(float64(count) / float64(total) * 100))
	}

	writeJSON(w, scoreDistribution)
}

type solveBody struct {
	PlayerHint string   `json:"playerHint"`
	Words      []string `json:"words"`
}

func (a *api) handlePostSolves(w http.ResponseWriter, r *http.Request) {
	day, ok := parseDay(r)
	if !ok {
		http.Error(w, "Invalid day", http.StatusBadRequest)
		return
	}

	var body solveBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if len(body.PlayerHint) < 10 || len(body.PlayerHint) > 64 {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	if len(body.Words) < 1 || len(body.Words) > 50 {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	puzzle, ok := a.getPuzzle(day)
	if !ok {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	seen := make(map[string]struct{}, len(body.Words))
	for _, word := range body.Words {
		if len(word) < 1 || len(word) > 32 {
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}
		if !a.dict.Test([]byte(word + a.pepper)) {
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}
		if _, dup := seen[word]; dup {
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}
		seen[word] = struct{}{}
	}

	if !game.IsValidGame(puzzle, body.Words) {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	wordsJSON, _ := json.Marshal(body.Words)

	if _, err := a.db.Exec("INSERT INTO solves (player_hint, puzzle_id, words) VALUES (?, ?, ?)", body.PlayerHint, day, string(wordsJSON)); err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

type reportBody struct {
	PlayerHint string `json:"playerHint"`
	Word       string `json:"word"`
	Note       string `json:"note"`
}

func (a *api) handlePostMissingWord(w http.ResponseWriter, r *http.Request) {
	var body reportBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if len(body.PlayerHint) < 10 || len(body.PlayerHint) > 64 {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if len(body.Word) < 1 || len(body.Word) > 64 {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	if len(body.Note) > 1000 {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if _, err := a.db.Exec("INSERT INTO reports (player_hint, word, note) VALUES (?, ?, ?)", body.PlayerHint, body.Word, body.Note); err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
