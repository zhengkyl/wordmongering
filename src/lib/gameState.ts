import { getStartingDeck, type Deck, type TileMeta } from "./constants";
import { RULES, scoreWord } from "./game";
import { shuffleInPlace } from "./utils";

export type PlayResult = { valid: boolean; word: string; pts: number };

export type GameState = {
  hand: string[];
  drawPile: string[];
  discardPile: string[];
  deck: Deck;
  score: number;
  playsLeft: number;
  gamePhase: "playing" | "round_complete" | "lost";
};

export type GameAction =
  | { type: "PLAY"; tileIds: string[] }
  | { type: "DRAW"; count: number }
  | { type: "DISCARD"; tileIds: string[] }
  | { type: "RESET" };

export function getTile(deck: Deck, tileId: string): readonly [keyof Deck, TileMeta] {
  const split = tileId.lastIndexOf("_");
  const letter = tileId.slice(0, split) as keyof Deck;
  const index = parseInt(tileId.slice(split + 1));
  return [letter, deck[letter]![index]] as const;
}

export function tileLetters(deck: Deck, ids: string[]): string[] {
  return ids.map((id) => getTile(deck, id)[0] as string);
}

function tileIdsFromDeck(deck: Deck): string[] {
  const tiles = Object.entries(deck).flatMap(([letter, metas]) =>
    Array.from({ length: metas!.length }, (_, i) => `${letter}_${i}`),
  );
  shuffleInPlace(tiles);
  return tiles;
}

export function createInitialState(): GameState {
  const deck = getStartingDeck() as Deck;
  const allTiles = tileIdsFromDeck(deck);
  const hand = allTiles.slice(0, RULES.handSize);
  const drawPile = allTiles.slice(RULES.handSize);
  return {
    hand,
    drawPile,
    discardPile: [],
    deck,
    score: 0,
    playsLeft: RULES.playsLimit,
    gamePhase: "playing",
  };
}

function drawTiles(
  count: number,
  drawPile: string[],
  discardPile: string[],
): { drawn: string[]; newDrawPile: string[]; newDiscardPile: string[] } {
  if (count <= drawPile.length) {
    const dp = [...drawPile];
    const drawn = dp.splice(0, count);
    return { drawn, newDrawPile: dp, newDiscardPile: discardPile };
  }
  // Need to recycle discard
  const recycled = [...discardPile];
  shuffleInPlace(recycled);
  const drawn = [...drawPile, ...recycled.splice(0, count - drawPile.length)];
  return { drawn, newDrawPile: recycled, newDiscardPile: [] };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (import.meta.env.DEV) {
    const a = action as any;
    if (a.type === "DEV_SET_SCORE") return { ...state, score: a.score };
    if (a.type === "DEV_SET_PLAYS_LEFT") return { ...state, playsLeft: a.playsLeft };
  }

  switch (action.type) {
    case "PLAY": {
      if (action.tileIds.length === 0) return state;
      const playedSet = new Set(action.tileIds);
      const letters = action.tileIds.map((id) => getTile(state.deck, id)[0]);
      const pts = scoreWord(letters);
      const newScore = state.score + pts;
      const newPlaysLeft = state.playsLeft - 1;
      let gamePhase: GameState["gamePhase"] = "playing";
      if (newScore >= RULES.targetScore) gamePhase = "round_complete";
      else if (newPlaysLeft === 0) gamePhase = "lost";
      return {
        ...state,
        hand: state.hand.filter((id) => !playedSet.has(id)),
        discardPile: [...state.discardPile, ...action.tileIds],
        score: newScore,
        playsLeft: newPlaysLeft,
        gamePhase,
      };
    }

    case "DRAW": {
      const { drawn, newDrawPile, newDiscardPile } = drawTiles(
        action.count,
        state.drawPile,
        state.discardPile,
      );
      return {
        ...state,
        hand: [...state.hand, ...drawn],
        drawPile: newDrawPile,
        discardPile: newDiscardPile,
      };
    }

    case "DISCARD": {
      if (action.tileIds.length === 0) return state;
      const playedSet = new Set(action.tileIds);
      const { drawn, newDrawPile, newDiscardPile } = drawTiles(
        action.tileIds.length,
        state.drawPile,
        [...state.discardPile, ...action.tileIds],
      );
      const newHand = state.hand.map((id) => (playedSet.has(id) ? drawn.pop()! : id));
      return {
        ...state,
        hand: newHand,
        drawPile: newDrawPile,
        discardPile: newDiscardPile,
      };
    }

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}
