function wordGreenIndexes(puzzle: string, word: string) {
  const greenIndexes: number[] = [];
  for (const c of puzzle) {
    let i = 0;
    for (; i < word.length; i++) {
      if (word.charAt(i) === c && !greenIndexes.includes(i)) {
        greenIndexes.push(i);
        break;
      }
    }

    if (i === word.length) {
      break;
    }
  }
  return greenIndexes;
}

export function isValidGame(puzzle: string, words: string[]) {
  for (const word of words) {
    if (puzzle === "") return false;

    const green = wordGreenIndexes(puzzle, word);
    if (green.length === 0) return false;

    puzzle = puzzle.slice(green.length);
  }

  return puzzle === "";
}
