package game

import "slices"

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
