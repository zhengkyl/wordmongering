package game

import "fmt"

// Letter counts and order must match LETTER_POOL in client/src/lib/generatePuzzle.ts.
const letterPool = "EEEEEEEEEEEETTTTTTTTTTAAAAAAAAAOOOOOOOOIIIIIIINNNNNNNSSSSSSSHHHHHHRRRRRRDDDDLLLLLCCCUUUMMMWWWFFFGGYYPPBVKJQXZ"

const PuzzleLength = 30
const minWordLength = 3

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
// No word of length >= 3 from words will appear as a contiguous substring.
// Must produce the same output as generateDailyPuzzle() in client/src/lib/generatePuzzle.ts.
func GenerateDailyPuzzle(day int, words map[string]struct{}) string {
	pool := []rune(letterPool)

	for attempt := 0; attempt < 10000; attempt++ {
		rand := mulberry32(uint32(day*1000003 + attempt))
		puzzle := make([]rune, 0, PuzzleLength)
		stuck := false

		for i := 0; i < PuzzleLength; i++ {
			var validPool []rune
			for _, c := range pool {
				valid := true
				maxLen := i + 1
				if maxLen > PuzzleLength {
					maxLen = PuzzleLength
				}
				for length := minWordLength; length <= maxLen; length++ {
					candidate := string(puzzle[i-length+1:]) + string(c)
					if _, ok := words[candidate]; ok {
						valid = false
						break
					}
				}
				if valid {
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
