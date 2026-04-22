import { createContext } from "preact";
import type { ReactNode } from "preact/compat";
import { useContext } from "preact/hooks";
import type { Deck } from "../lib/constants";
import { IDLE, type ActivePhase } from "../lib/phases";

export type GameContextValue = {
  deck: Deck;
  phase: ActivePhase;
  drawPile: string[];
  fieldSlots: (string | null)[];
  handSlots: (string | null)[];
  fieldToHand: (tileId: string, i: number) => void;
  handToFirstField: (tileId: string, i: number) => void;
  handToLastField: (tileId: string, i: number) => void;
  disabled: boolean;
  discardsLeft: number;
  onShuffle: () => void;
  onDiscard: () => void;
  onPlay: () => void;
  snapshotHandSlotsRef: { current: (string | null)[] };
  snapshotDrawPileRef: { current: string[] };
};

export const GameContext = createContext<GameContextValue>({
  deck: {} as Deck,
  phase: IDLE,
  drawPile: [],
  fieldSlots: [],
  handSlots: [],
  fieldToHand: () => {},
  handToFirstField: () => {},
  handToLastField: () => {},
  disabled: false,
  discardsLeft: 0,
  onShuffle: () => {},
  onDiscard: () => {},
  onPlay: () => {},
  snapshotHandSlotsRef: { current: [] },
  snapshotDrawPileRef: { current: [] },
});

export const useGame = () => useContext(GameContext);

export function GameProvider({ children, ...value }: GameContextValue & { children: ReactNode }) {
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
