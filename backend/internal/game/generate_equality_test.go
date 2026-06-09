package game

import (
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
)

// dayCount is how many days of puzzles to cross-check. Large enough that any
// divergence in the PRNG, letter pool, or dead-sequence rejection surfaces.
const dayCount = 365

// TestGenerateDailyPuzzleMatchesClient asserts the Go GenerateDailyPuzzle
// produces byte-for-byte identical puzzles to the TypeScript generateDailyPuzzle
// in client/src/lib/generatePuzzle.ts. This also guards that the dead-sequence
// data files in both trees stay identical.
//
// It runs the actual client generator via Node (no reimplementation here), so a
// drift in either algorithm or data fails the test.
func TestGenerateDailyPuzzleMatchesClient(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node not found on PATH; skipping cross-language puzzle equality test")
	}

	root := repoRoot(t)

	goPuzzles := make([]string, dayCount)
	for day := 1; day <= dayCount; day++ {
		goPuzzles[day-1] = GenerateDailyPuzzle(day)
	}

	clientPuzzles := runClientGenerator(t, node, root, dayCount)

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

// runClientGenerator runs the client's generator via Node and returns its
// puzzles for days 1..dayCount.
func runClientGenerator(t *testing.T, node, root string, days int) []string {
	clientDir := filepath.Join(root, "client")
	cmd := exec.Command(node, filepath.Join("scripts", "equality-runner.mjs"), strconv.Itoa(days))
	cmd.Dir = clientDir
	out, err := cmd.Output()
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			t.Fatalf("client generator failed: %v\n%s", err, ee.Stderr)
		}
		t.Fatalf("client generator failed: %v", err)
	}
	return strings.Split(strings.TrimRight(string(out), "\n"), "\n")
}
