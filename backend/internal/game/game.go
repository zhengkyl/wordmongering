package game

import (
	"math/rand"
	"slices"
)

// InputMatchedIndexes returns which indexes in word match the leading chars of puzzle.
func InputMatchedIndexes(puzzle, word string) []int {
	return usedInputIndexes([]rune(puzzle), []rune(word))
}

// SampleOptimalMoves returns the max letters clearable from puzzle in one move and
// a reservoir sample of words achieving it.
// Keep in sync with sampleOptimalMoves() in client/src/lib/computeGreenTiles.ts.
func SampleOptimalMoves(puzzle string, words []string, sampleSize int) (matched int, sample []string) {
	puzzleRunes := []rune(puzzle)
	for _, word := range words {
		idxs := usedInputIndexes(puzzleRunes, []rune(word))
		n := len(idxs)
		if n < matched {
			continue
		}
		if n > matched {
			matched = n
			sample = sample[:0]
		}
		if len(sample) < sampleSize {
			sample = append(sample, word)
		} else {
			j := rand.Intn(len(sample) + 1)
			if j < sampleSize {
				sample[j] = word
			}
		}
	}
	return
}

// RateMove rates a single move given how many letters were cleared vs the near-optimal count.
// Keep in sync with rateMove() in client/src/components/Results.tsx.
func RateMove(cleared, nearOptimal int) string {
	if cleared >= nearOptimal {
		return "brilliant"
	}
	if cleared >= nearOptimal-1 {
		return "strong"
	}
	if cleared <= nearOptimal-4 {
		if cleared <= 2 {
			return "blunder"
		}
	}
	if cleared <= nearOptimal-3 {
		if cleared <= 3 {
			return "weak"
		}
	}
	return ""
}

func usedInputIndexes(puzzle []rune, word []rune) []int {
	var used []int

	for _, c := range puzzle {
		found := false
		for i, ic := range word {
			if ic != c {
				continue
			}
			if slices.Contains(used, i) {
				continue
			}

			used = append(used, i)
			found = true
			break
		}

		if !found {
			break
		}
	}
	return used
}

func IsValidGame(puzzle string, words []string) bool {
	pz := []rune(puzzle)

	for _, word := range words {
		if len(pz) == 0 {
			return false
		}
		used := usedInputIndexes(pz, []rune(word))
		if len(used) == 0 {
			return false
		}
		pz = pz[len(used):]
	}
	return len(pz) == 0
}
