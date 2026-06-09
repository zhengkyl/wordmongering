package game

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
)

// Dead 2- and 3-letter sequences, keyed by sorted letters so order doesn't
// matter. These sequences are unplayable, so puzzle generation avoids them.
//
// Loaded from the static dir (alongside words.txt) via LoadDead, which must be
// called before GenerateDailyPuzzle or Annotate.
var dead struct {
	two, three map[string]struct{}
}

// LoadDead reads the dead-sequence sets from dir (the static dir that also holds
// words.txt).
func LoadDead(dir string) error {
	var err error
	if dead.two, err = loadSetFile(filepath.Join(dir, "dead2.txt")); err != nil {
		return err
	}
	if dead.three, err = loadSetFile(filepath.Join(dir, "dead3.txt")); err != nil {
		return err
	}
	return nil
}

func loadSetFile(path string) (map[string]struct{}, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return loadSet(string(data)), nil
}

func loadSet(data string) map[string]struct{} {
	m := make(map[string]struct{})
	for _, line := range strings.Split(strings.TrimSpace(data), "\n") {
		if line != "" {
			m[line] = struct{}{}
		}
	}
	return m
}

func sortedKey(runes []rune) string {
	r := make([]rune, len(runes))
	copy(r, runes)
	slices.Sort(r)
	return string(r)
}

// Annotate marks each letter of a puzzle 'D' if it is part of a dead 2- or
// 3-letter sequence, '.' otherwise.
func Annotate(pz string) string {
	runes := []rune(pz)
	n := len(runes)
	marks := make([]byte, n)
	for i := range marks {
		marks[i] = '.'
	}
	for i := range n {
		if i+1 < n {
			if _, ok := dead.two[sortedKey(runes[i:i+2])]; ok {
				marks[i] = 'D'
				marks[i+1] = 'D'
			}
		}
		if i+2 < n {
			if _, ok := dead.three[sortedKey(runes[i:i+3])]; ok {
				marks[i] = 'D'
				marks[i+1] = 'D'
				marks[i+2] = 'D'
			}
		}
	}
	return string(marks)
}
