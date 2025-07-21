import { repeat } from "./utils";

const GROUPS = {
  Vowels: ["A", "E", "I", "O", "U", "Y"],
  Consonants: [
    "B",
    "C",
    "D",
    "F",
    "G",
    "H",
    "J",
    "K",
    "L",
    "M",
    "N",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ],
};

const VARIANTS = {
  Normal: true,
  Holographic: true,
  Inverted: true,
  Cursive: true,
};

// bold, italic, cursive
// palindrome

export const ALPHABET = {
  A: { points: 1 },
  B: { points: 3 },
  C: { points: 3 },
  D: { points: 2 },
  E: { points: 1 },
  F: { points: 4 },
  G: { points: 2 },
  H: { points: 4 },
  I: { points: 1 },
  J: { points: 8 },
  K: { points: 5 },
  L: { points: 1 },
  M: { points: 3 },
  N: { points: 1 },
  O: { points: 1 },
  P: { points: 3 },
  Q: { points: 10 },
  R: { points: 1 },
  S: { points: 1 },
  T: { points: 1 },
  U: { points: 1 },
  V: { points: 4 },
  W: { points: 4 },
  X: { points: 8 },
  Y: { points: 4 },
  Z: { points: 10 },
  QU: { points: 11 },
  ING: { points: 4 },
};

export type TileMeta = {
  variant: keyof typeof VARIANTS;
};

export type Deck = Partial<Record<keyof typeof ALPHABET, TileMeta[]>>;

export function getStartingDeck() {
  return {
    A: [...repeat({ variant: "Normal" }, 9)],
    B: [...repeat({ variant: "Normal" }, 2)],
    C: [...repeat({ variant: "Normal" }, 2)],
    D: [...repeat({ variant: "Normal" }, 4)],
    E: [...repeat({ variant: "Normal" }, 12)],
    F: [...repeat({ variant: "Normal" }, 2)],
    G: [...repeat({ variant: "Normal" }, 3)],
    H: [...repeat({ variant: "Normal" }, 2)],
    I: [...repeat({ variant: "Normal" }, 9)],
    J: [...repeat({ variant: "Normal" }, 1)],
    K: [...repeat({ variant: "Normal" }, 1)],
    L: [...repeat({ variant: "Normal" }, 4)],
    M: [...repeat({ variant: "Normal" }, 2)],
    N: [...repeat({ variant: "Normal" }, 6)],
    O: [...repeat({ variant: "Normal" }, 8)],
    P: [...repeat({ variant: "Normal" }, 2)],
    Q: [...repeat({ variant: "Normal" }, 1)],
    R: [...repeat({ variant: "Normal" }, 6)],
    S: [...repeat({ variant: "Normal" }, 4)],
    T: [...repeat({ variant: "Normal" }, 6)],
    U: [...repeat({ variant: "Normal" }, 4)],
    V: [...repeat({ variant: "Normal" }, 2)],
    W: [...repeat({ variant: "Normal" }, 2)],
    X: [...repeat({ variant: "Normal" }, 1)],
    Y: [...repeat({ variant: "Normal" }, 2)],
    Z: [...repeat({ variant: "Normal" }, 1)],
  };
}
