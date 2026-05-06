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
	"time"

	"github.com/bits-and-blooms/bloom/v3"
	"github.com/zhengkyl/wordmongering/backend/internal/game"
)

type spaHandler struct {
	root string
	fs   http.Handler
}

func newSpaHandler(staticDir string) *spaHandler {
	return &spaHandler{
		root: staticDir,
		fs:   http.FileServer(http.Dir(staticDir)),
	}
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join(h.root, filepath.Clean("/"+r.URL.Path))
	if _, err := os.Stat(path); os.IsNotExist(err) {
		http.ServeFile(w, r, filepath.Join(h.root, "index.html"))
		return
	}
	h.fs.ServeHTTP(w, r)
}

type api struct {
	db     *sql.DB
	pepper string
	dict   *bloom.BloomFilter
}

func newApiHandler(db *sql.DB, root string, pepper string) (*api, error) {
	f, err := os.Open(filepath.Join(root, "client/dist/dictionary.txt"))
	if err != nil {
		return nil, fmt.Errorf("open dictionary: %w", err)
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
		db:     db,
		pepper: pepper,
		dict:   filter,
	}, nil
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

func (a *api) handleGetPuzzle(w http.ResponseWriter, r *http.Request) {
	day, ok := parseDay(r)
	if !ok {
		http.Error(w, "Invalid day", http.StatusBadRequest)
		return
	}

	var puzzle string
	if err := a.db.QueryRow("SELECT puzzle FROM puzzles WHERE day = ?", day).Scan(&puzzle); err != nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	writeJSON(w, map[string]string{"puzzle": puzzle})
}

func (a *api) handleGetResults(w http.ResponseWriter, r *http.Request) {
	day, ok := parseDay(r)
	if !ok {
		http.Error(w, "Invalid day", http.StatusBadRequest)
		return
	}

	rows, err := a.db.Query(
		"SELECT json_array_length(words) AS score, COUNT(*) FROM results WHERE day = ? GROUP BY score", day,
	)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	allPlays := make(map[int]int)
	for rows.Next() {
		var score, count int
		rows.Scan(&score, &count)
		allPlays[score] = count
	}

	firstRows, err := a.db.Query(`
		SELECT json_array_length(r.words) AS score, COUNT(*)
		FROM results r
		INNER JOIN (
			SELECT MIN(id) as id FROM results WHERE day = ? GROUP BY player_hint
		) fp ON r.id = fp.id
		GROUP BY score
	`, day)

	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	defer firstRows.Close()

	firstPlays := make(map[int]int)
	for firstRows.Next() {
		var score, count int
		firstRows.Scan(&score, &count)
		firstPlays[score] = count
	}

	writeJSON(w, map[string]any{
		"allPlays":   allPlays,
		"firstPlays": firstPlays,
	})
}

type resultBody struct {
	PlayerHint string   `json:"playerHint"`
	Words      []string `json:"words"`
}

func (a *api) handlePostResults(w http.ResponseWriter, r *http.Request) {
	day, ok := parseDay(r)
	if !ok {
		http.Error(w, "Invalid day", http.StatusBadRequest)
		return
	}

	var body resultBody
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

	var puzzle string
	if err := a.db.QueryRow("SELECT puzzle FROM puzzles WHERE day = ?", day).Scan(&puzzle); err != nil {
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

	if _, err := a.db.Exec("INSERT INTO results (player_hint, day, words) VALUES (?, ?, ?)", body.PlayerHint, day, string(wordsJSON)); err != nil {
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
