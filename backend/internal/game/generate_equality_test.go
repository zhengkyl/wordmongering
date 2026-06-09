package game

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
)

// dayCount is how many days of puzzles to cross-check. Large enough that any
// divergence in the PRNG, letter pool, or word-rejection logic surfaces.
const dayCount = 365

// TestGenerateDailyPuzzleMatchesClient asserts the Go GenerateDailyPuzzle
// produces byte-for-byte identical puzzles to the TypeScript generateDailyPuzzle
// in client/src/lib/generatePuzzle.ts, for the same word set and days.
//
// It runs the actual client generator via Node (no reimplementation here), so a
// drift in either algorithm fails the test.
func TestGenerateDailyPuzzleMatchesClient(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node not found on PATH; skipping cross-language puzzle equality test")
	}

	root := repoRoot(t)
	wordsPath := filepath.Join(root, "client", "public", "words.txt")
	words := loadWordSet(t, wordsPath)

	goPuzzles := make([]string, dayCount)
	for day := 1; day <= dayCount; day++ {
		goPuzzles[day-1] = GenerateDailyPuzzle(day, words)
	}

	clientPuzzles := runClientGenerator(t, node, root, wordsPath, dayCount)

	if len(clientPuzzles) != dayCount {
		t.Fatalf("client emitted %d puzzles, want %d", len(clientPuzzles), dayCount)
	}
	for day := 1; day <= dayCount; day++ {
		if goPuzzles[day-1] != clientPuzzles[day-1] {
			t.Fatalf("day %d puzzle mismatch:\n  backend:  %q\n  frontend: %q",
				day, goPuzzles[day-1], clientPuzzles[day-1])
		}
	}
}

// repoRoot resolves the repository root from this test file's location.
func repoRoot(t *testing.T) string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	// file is <root>/backend/internal/game/generate_equality_test.go
	return filepath.Join(filepath.Dir(file), "..", "..", "..")
}

// loadWordSet reads words.txt the same way both runtimes do: trim, split on
// newlines, one word per line.
func loadWordSet(t *testing.T, path string) map[string]struct{} {
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read words: %v", err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	words := make(map[string]struct{}, len(lines))
	for _, w := range lines {
		words[w] = struct{}{}
	}
	return words
}

// runClientGenerator runs the client's generator via Node and returns its
// puzzles for days 1..dayCount.
func runClientGenerator(t *testing.T, node, root, wordsPath string, days int) []string {
	runner := filepath.Join(root, "client", "scripts", "equality-runner.mjs")
	cmd := exec.Command(node, runner, wordsPath, strconv.Itoa(days))
	out, err := cmd.Output()
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			t.Fatalf("client generator failed: %v\n%s", err, ee.Stderr)
		}
		t.Fatalf("client generator failed: %v", err)
	}
	return strings.Split(string(out), "\n")
}
