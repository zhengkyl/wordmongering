export type PuzzleTile = { id: number; letter: string };

export function puzzleMatchedTiles(puzzleTiles: PuzzleTile[], input: string) {
  let matched: number[] = [];
  let candidates: number[] = [];
  let maybeUsed: number[] = [];
  let chain = true;
  for (const tile of puzzleTiles) {
    let i = 0;
    for (; i < input.length; i++) {
      if (input.charAt(i) !== tile.letter) continue;
      if (maybeUsed.includes(i)) continue;
      maybeUsed.push(i);

      candidates.push(tile.id);
      if (chain) matched.push(tile.id);

      break;
    }
    if (i === input.length) {
      chain = false;
    }
  }

  return { matched, candidates };
}

export function inputUsedIndexes(puzzle: string, word: string) {
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
