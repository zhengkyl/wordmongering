export type ScoredTile = { letter: string; pts: number };

export type PowerUpDef = {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** Called for each tile in sequence. Receives the accumulated pts (chained from previous power-ups).
   *  `word` is always the unmodified rawTiles for context. Returns new pts for this tile. */
  onTile: (tile: ScoredTile, index: number, word: ScoredTile[]) => number;
  /** Called once after all tiles with the accumulated total. Chains across power-ups. */
  onEnd: (total: number, tiles: ScoredTile[]) => number;
};

export type PowerUpId = keyof typeof POWER_UPS;

export const POWER_UPS = {
  doubleVowels: {
    id: "doubleVowels",
    name: "Vowel Boost",
    description: "Doubles the points of each vowel.",
    cost: 5,
    onTile(tile, _index, _word) {
      return "AEIOU".includes(tile.letter) ? tile.pts * 2 : tile.pts;
    },
    onEnd(total, _tiles) {
      return total;
    },
  },
  wordLengthBonus: {
    id: "wordLengthBonus",
    name: "Length Bonus",
    description: "Adds +1 point per letter as a flat end bonus.",
    cost: 4,
    onTile(tile, _index, _word) {
      return tile.pts;
    },
    onEnd(total, tiles) {
      return total + tiles.length;
    },
  },
  tripleFirstLetter: {
    id: "tripleFirstLetter",
    name: "First Impression",
    description: "The first letter of each word is worth 3×.",
    cost: 6,
    onTile(tile, index, _word) {
      return index === 0 ? tile.pts * 3 : tile.pts;
    },
    onEnd(total, _tiles) {
      return total;
    },
  },
  doubleConsonants: {
    id: "doubleConsonants",
    name: "Consonant Crunch",
    description: "Doubles the points of each consonant.",
    cost: 7,
    onTile(tile, _index, _word) {
      return "AEIOU".includes(tile.letter) ? tile.pts : tile.pts * 2;
    },
    onEnd(total, _tiles) {
      return total;
    },
  },
  flatFive: {
    id: "flatFive",
    name: "Quick Cash",
    description: "Every word scores +5 bonus points.",
    cost: 3,
    onTile(tile, _index, _word) {
      return tile.pts;
    },
    onEnd(total, _tiles) {
      return total + 5;
    },
  },
} satisfies Record<string, PowerUpDef>;
