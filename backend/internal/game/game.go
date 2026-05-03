package game

import "slices"

func poppedIndexes(puzzle []rune, word []rune) []int {
	var popped []int

	for _, c := range puzzle {
		found := false
		for i, ic := range word {
			if ic != c {
				continue
			}
			if slices.Contains(popped, i) {
				continue
			}

			popped = append(popped, i)
			found = true
			break
		}

		if !found {
			break
		}
	}
	return popped
}

func IsValidGame(puzzle string, words []string) bool {
	pz := []rune(puzzle)

	for _, word := range words {
		if len(pz) == 0 {
			return false
		}
		popped := poppedIndexes(pz, []rune(word))
		if len(popped) == 0 {
			return false
		}
		pz = pz[len(popped):]
	}
	return len(pz) == 0
}
