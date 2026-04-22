import { useState } from "react";
import { RULES } from "../lib/game";
import type { GameState } from "../lib/gameState";
import { IDLE, type ActivePhase } from "../lib/phases";

type DevMenuProps = {
  dispatch: (action: any) => void;
  gameState: GameState;
  enter: (phase: ActivePhase) => void;
  exit: () => void;
  onShuffle: () => void;
};

const BTN = "px-2 py-1 text-xs rounded border font-mono";
const PRIMARY_BTN = `${BTN} bg-stone-800 text-white border-stone-800`;
const SECONDARY_BTN = `${BTN} bg-white text-stone-700 border-stone-300`;

export function DevMenu({ dispatch, gameState, enter, exit, onShuffle }: DevMenuProps) {
  const [open, setOpen] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [playsInput, setPlaysInput] = useState("");

  return (
    <div class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div class="bg-white border border-stone-300 rounded-xl shadow-xl p-4 w-72 flex flex-col gap-4 text-sm font-mono">

          {/* Score */}
          <section>
            <div class="font-bold text-stone-500 mb-2">SCORE — {gameState.score} / {RULES.targetScore}</div>
            <div class="flex gap-1 flex-wrap">
              <button class={SECONDARY_BTN} onClick={() => dispatch({ type: "DEV_SET_SCORE", score: gameState.score + 10 })}>+10</button>
              <button class={SECONDARY_BTN} onClick={() => dispatch({ type: "DEV_SET_SCORE", score: gameState.score + 50 })}>+50</button>
              <button class={SECONDARY_BTN} onClick={() => dispatch({ type: "DEV_SET_SCORE", score: RULES.targetScore - 1 })}>→ max-1</button>
              <button class={PRIMARY_BTN} onClick={() => dispatch({ type: "DEV_SET_SCORE", score: RULES.targetScore })}>→ win</button>
            </div>
            <div class="flex gap-1 mt-1">
              <input
                class="border border-stone-300 rounded px-2 py-1 text-xs w-20"
                placeholder="score"
                value={scoreInput}
                onInput={(e) => setScoreInput((e.target as HTMLInputElement).value)}
              />
              <button
                class={PRIMARY_BTN}
                onClick={() => {
                  const n = parseInt(scoreInput);
                  if (!isNaN(n)) dispatch({ type: "DEV_SET_SCORE", score: n });
                }}
              >Set</button>
            </div>
          </section>

          {/* Plays Left */}
          <section>
            <div class="font-bold text-stone-500 mb-2">PLAYS LEFT — {gameState.playsLeft} / {RULES.playsLimit}</div>
            <div class="flex gap-1 flex-wrap">
              <button class={SECONDARY_BTN} onClick={() => dispatch({ type: "DEV_SET_PLAYS_LEFT", playsLeft: gameState.playsLeft + 1 })}>+1</button>
              <button class={SECONDARY_BTN} onClick={() => dispatch({ type: "DEV_SET_PLAYS_LEFT", playsLeft: Math.max(0, gameState.playsLeft - 1) })}>-1</button>
              <button class={SECONDARY_BTN} onClick={() => dispatch({ type: "DEV_SET_PLAYS_LEFT", playsLeft: RULES.playsLimit })}>Set max</button>
              <button class={PRIMARY_BTN} onClick={() => dispatch({ type: "DEV_SET_PLAYS_LEFT", playsLeft: 0 })}>→ lose</button>
            </div>
          </section>

          {/* Phase */}
          <section>
            <div class="font-bold text-stone-500 mb-2">PHASE — {gameState.gamePhase}</div>
            <div class="flex gap-1 flex-wrap">
              <button class={SECONDARY_BTN} onClick={() => exit()}>→ idle</button>
              <button class={SECONDARY_BTN} onClick={() => enter({ type: "scoring", tileIds: [], tileAnimDelays: [], step: null, runningTotal: 0 })}>→ scoring</button>
              <button class={SECONDARY_BTN} onClick={() => enter({ type: "discarding", tileIds: [] })}>→ discard</button>
              <button class={SECONDARY_BTN} onClick={() => enter({ type: "drawing" })}>→ drawing</button>
            </div>
          </section>

          {/* Hand */}
          <section>
            <div class="font-bold text-stone-500 mb-2">HAND — {gameState.hand.length} tiles</div>
            <div class="flex gap-1">
              <button class={SECONDARY_BTN} onClick={onShuffle}>Shuffle</button>
              <button class={PRIMARY_BTN} onClick={() => dispatch({ type: "RESET" })}>New Hand</button>
            </div>
          </section>

          {/* Actions */}
          <section>
            <div class="font-bold text-stone-500 mb-2">ACTIONS</div>
            <div class="flex gap-1">
              <button class={PRIMARY_BTN} onClick={() => dispatch({ type: "RESET" })}>RESET</button>
            </div>
          </section>

        </div>
      )}

      <button
        class="bg-stone-800 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-lg shadow-lg hover:bg-stone-700 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✕ DEV" : "DEV"}
      </button>
    </div>
  );
}
