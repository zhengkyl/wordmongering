package game

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
)

// Dead 2- and 3-letter sequences, keyed by sorted letters so order doesn't
// matter. "no" combinations occur in zero words; "one" combinations are barely
// usable. Puzzle generation avoids all of them.
//
// Loaded from the static dir (alongside words.txt) via LoadDead, which must be
// called before GenerateDailyPuzzle or Annotate.
var dead struct {
	no2, one2, no3, one3 map[string]struct{}
}

// LoadDead reads the dead-sequence sets from dir (the static dir that also holds
// words.txt).
func LoadDead(dir string) error {
	var err error
	if dead.no2, err = loadSetFile(filepath.Join(dir, "no2.txt")); err != nil {
		return err
	}
	if dead.one2, err = loadSetFile(filepath.Join(dir, "one2.txt")); err != nil {
		return err
	}
	if dead.no3, err = loadSetFile(filepath.Join(dir, "no3.txt")); err != nil {
		return err
	}
	if dead.one3, err = loadSetFile(filepath.Join(dir, "one3.txt")); err != nil {
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

// Annotate marks each letter of a puzzle: 'D' if it is part of a dead ("no")
// sequence, '1' for a barely-usable ("one") sequence, '.' otherwise.
func Annotate(pz string) string {
	runes := []rune(pz)
	n := len(runes)
	marks := make([]byte, n)
	for i := range marks {
		marks[i] = '.'
	}
	setMark := func(i int, ch byte) {
		if ch > marks[i] {
			marks[i] = ch
		}
	}
	for i := range n {
		if i+1 < n {
			k := sortedKey(runes[i : i+2])
			if _, ok := dead.no2[k]; ok {
				setMark(i, 'D')
				setMark(i+1, 'D')
			} else if _, ok := dead.one2[k]; ok {
				setMark(i, '1')
				setMark(i+1, '1')
			}
		}
		if i+2 < n {
			k := sortedKey(runes[i : i+3])
			if _, ok := dead.no3[k]; ok {
				setMark(i, 'D')
				setMark(i+1, 'D')
				setMark(i+2, 'D')
			} else if _, ok := dead.one3[k]; ok {
				setMark(i, '1')
				setMark(i+1, '1')
				setMark(i+2, '1')
			}
		}
	}
	return string(marks)
}
