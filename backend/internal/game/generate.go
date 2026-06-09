package game

import "fmt"

const letterPool = "EEEEEEEEEEEETTTTTTTTTTAAAAAAAAAOOOOOOOOIIIIIIINNNNNNNSSSSSSSHHHHHHRRRRRRDDDDLLLLLCCCUUUMMMWWWFFFGGYYPPBVKJQXZ"

const PuzzleLength = 30

func mulberry32(seed uint32) func() float64 {
	s := seed
	return func() float64 {
		s += 0x6d2b79f5
		t := (s ^ (s >> 15)) * (1 | s)
		t = (t+(t^(t>>7))*(61|t)) ^ t
		return float64(t^(t>>14)) / 4294967296.0
	}
}

// GenerateDailyPuzzle builds a puzzle for the given day number deterministically.
// No dead 2- or 3-letter sequence (see dead.go) will appear, so the puzzle is
// always playable.
// Must produce the same output as generateDailyPuzzle() in client/src/lib/generatePuzzle.ts.
func GenerateDailyPuzzle(day int) string {
	pool := []rune(letterPool)

	for attempt := 0; attempt < 10000; attempt++ {
		rand := mulberry32(uint32(day*1000003 + attempt))
		puzzle := make([]rune, 0, PuzzleLength)
		stuck := false

		for i := 0; i < PuzzleLength; i++ {
			var validPool []rune
			for _, c := range pool {
				if validNext(puzzle, c) {
					validPool = append(validPool, c)
				}
			}

			if len(validPool) == 0 {
				stuck = true
				break
			}

			puzzle = append(puzzle, validPool[int(rand()*float64(len(validPool)))])
		}

		if !stuck {
			return string(puzzle)
		}
	}

	panic(fmt.Sprintf("could not generate puzzle for day %d", day))
}

// validNext reports whether appending c to puzzle keeps the trailing 2- and
// 3-letter sequences out of the dead sets.
func validNext(puzzle []rune, c rune) bool {
	n := len(puzzle)
	if n >= 1 {
		k := sortedKey([]rune{puzzle[n-1], c})
		if _, ok := dead.no2[k]; ok {
			return false
		}
		if _, ok := dead.one2[k]; ok {
			return false
		}
	}
	if n >= 2 {
		k := sortedKey([]rune{puzzle[n-2], puzzle[n-1], c})
		if _, ok := dead.no3[k]; ok {
			return false
		}
		if _, ok := dead.one3[k]; ok {
			return false
		}
	}
	return true
}
