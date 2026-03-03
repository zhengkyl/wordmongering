import { Dialog } from "@base-ui/react/dialog";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/react";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { DeckDialog } from "./components/DeckDialog";
import { GameProvider, useGame } from "./components/GameContext";
import { usePhaseRunner } from "./hooks/usePhaseRunner";
import { getCollapsedField, useSlots } from "./hooks/useSlots";
import { ALPHABET, type Deck } from "./lib/constants";
import { findBestPlays, RULES, validateWord } from "./lib/game";
import {
  createInitialState,
  gameReducer,
  getTile,
  tileLetters,
  type PlayResult,
} from "./lib/gameState";
import { DISCARD, DRAW, getTileAnim, IDLE, SCORING, type ActivePhase } from "./lib/phases";

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  const { phase, setPhase, isActiveRef, enter, after, exit } = usePhaseRunner<ActivePhase>(IDLE);
  const slots = useSlots();

  // --- Dictionary ---
  const dictionaryRef = useRef<Set<string> | null>(null);
  const [dictLoaded, setDictLoaded] = useState(false);

  useEffect(() => {
    fetch("/dictionary.txt")
      .then((r) => r.text())
      .then((text) => {
        dictionaryRef.current = new Set(text.split("\n"));
        setDictLoaded(true);
        console.log(`Dictionary loaded with ${dictionaryRef.current.size} words`);
      });
  }, []);

  // --- Hand-change effect: sync slots + trigger drawing phase ---
  // prevHandRef captures the hand before each dispatch so we can diff for newly drawn tiles.
  // isFirstHandRef skips the draw animation on the initial deal.
  const prevHandRef = useRef<string[]>([]);
  const isFirstHandRef = useRef(true);

  useEffect(() => {
    if (isFirstHandRef.current) {
      isFirstHandRef.current = false;
      prevHandRef.current = state.hand;
      slots.reset(state.hand);
      return;
    }

    const prevHandSet = new Set(prevHandRef.current);
    const newTileIds = new Set(state.hand.filter((id) => !prevHandSet.has(id)));
    prevHandRef.current = state.hand;
    slots.reset(state.hand);

    if (newTileIds.size > 0) {
      const maxSlotIdx = state.hand.reduce(
        (max, id, i) => (newTileIds.has(id) ? Math.max(max, i) : max),
        0,
      );
      enter({ type: "drawing", newTileIds });
      after(maxSlotIdx * DRAW.STAGGER + DRAW.ANIM, exit);
    } else {
      exit();
    }
  }, [state.hand]);

  // --- Suggestion state ---
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [playedHandSuggestions, setPlayedHandSuggestions] = useState<string[]>([]);
  const [playedBest, setPlayedBest] = useState(false);

  useEffect(() => {
    if (!dictLoaded) return;
    setCurrentSuggestions(
      findBestPlays(tileLetters(state.deck, state.hand), dictionaryRef.current!),
    );
  }, [state.hand, dictLoaded]);

  // --- Phase handlers ---

  const startScoringPhase = (tiles: { letter: string; pts: number }[], tileIds: string[]) => {
    enter({ type: "scoring", tiles, tileIds, runningTotal: 0 });
    tiles.forEach((tile, i) => {
      after(SCORING.STAGGER * i + SCORING.PEAK_OFFSET, () =>
        setPhase((p) =>
          p.type === "scoring" ? { ...p, runningTotal: p.runningTotal + tile.pts } : p,
        ),
      );
    });
    after(SCORING.STAGGER * (tiles.length - 1) + SCORING.TILE_ANIM + SCORING.POST_ANIM, () => {
      prevHandRef.current = state.hand;
      dispatch({ type: "PLAY", tileIds, dictionary: dictionaryRef.current });
      // useEffect([state.hand]) transitions directly into the drawing phase
    });
  };

  const handleDiscard = () => {
    const fieldTileIds = slots.fieldSlots.filter((id) => id != null) as string[];
    setPlayedHandSuggestions([]);
    setPlayedBest(false);
    if (fieldTileIds.length === 0) return;
    prevHandRef.current = state.hand;
    enter({ type: "discarding", tileIds: fieldTileIds });
    after(DISCARD.FALL_ANIM, () => dispatch({ type: "DISCARD", tileIds: fieldTileIds }));
  };

  const handlePlay = () => {
    const tileIds = slots.fieldSlots.filter((id) => id != null) as string[];
    if (tileIds.length === 0) return;
    const letters = tileLetters(state.deck, tileIds);
    const word = letters.join("");
    setPlayedBest(currentSuggestions.includes(word));
    setPlayedHandSuggestions(currentSuggestions);
    setSuggestionIndex(Math.floor(Math.random() * currentSuggestions.length));

    if (!validateWord(word, dictionaryRef.current!)) {
      dispatch({ type: "PLAY", tileIds, dictionary: dictionaryRef.current });
      return;
    }

    const tiles = tileIds.map((id) => {
      const [letter] = getTile(state.deck, id);
      const pts = ALPHABET[letter as keyof typeof ALPHABET].points;
      return { letter: letter as string, pts };
    });
    startScoringPhase(tiles, tileIds);
  };

  // --- Keyboard handler ---
  const allowedLetters = /^[A-Z]$/;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isActiveRef.current) return;

      const letterKey = e.key.toUpperCase();

      if (allowedLetters.test(letterKey) && !e.ctrlKey && !e.metaKey) {
        const handIndex = slots.handSlots.findIndex((tileId) => {
          if (tileId == null) return false;
          const [letter] = getTile(state.deck, tileId);
          return letter === letterKey;
        });
        if (handIndex === -1) return;
        slots.handToNextField(slots.handSlots[handIndex]!, handIndex);
        e.preventDefault();
        return;
      }

      switch (e.key) {
        case "Enter": {
          handlePlay();
          break;
        }
        case "Backspace": {
          if (e.ctrlKey) {
            slots.clearField();
          } else {
            for (let i = slots.fieldSlots.length - 1; i >= 0; i--) {
              if (slots.fieldSlots[i] != null) {
                slots.fieldToHand(slots.fieldSlots[i]!, i);
                break;
              }
            }
          }
          break;
        }
        default:
          return;
      }

      e.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [slots.handSlots]);

  const dragStartTime = useRef(null);
  const [shouldAnimateOverlay, setShouldAnimateOverlay] = useState(false);

  return (
    <div class="h-dvh grid [grid-template-rows:auto_auto_1fr_auto]">
      <ScoreBar score={state.score} playsLeft={state.playsLeft} />
      <ResultBanner
        phase={phase}
        lastResult={state.lastResult}
        playedBest={playedBest}
        playedHandSuggestions={playedHandSuggestions}
        suggestionIndex={suggestionIndex}
      />
      <DragDropProvider
        sensors={(defaults) => [
          ...defaults,
          PointerSensor.configure({
            activationConstraints(event, _source) {
              const { pointerType, target: _ } = event;

              switch (pointerType) {
                case "mouse":
                  return [new PointerActivationConstraints.Distance({ value: 10 })];
                case "touch":
                  return [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })];
                default:
                  return [
                    new PointerActivationConstraints.Delay({ value: 200, tolerance: 10 }),
                    new PointerActivationConstraints.Distance({ value: 5 }),
                  ];
              }
            },
          }),
        ]}
        onDragStart={() => (dragStartTime.current = performance.now())}
        onDragEnd={(event) => {
          if (event.canceled) return;
          if (isActiveRef.current) return;

          const { operation } = event;

          const tileId = operation.source.id as string;
          const fieldIndex = slots.fieldSlots.findIndex((id) => id === tileId);
          const from = fieldIndex === -1 ? "hand" : "field";

          const isBuggedDrag = operation.transform.x === 0 && operation.transform.y === 0;
          if (isBuggedDrag && (operation.activatorEvent as any).pointerType !== "mouse") {
            return;
          }

          if (isBuggedDrag || performance.now() - dragStartTime.current < 50) {
            setShouldAnimateOverlay(false);
            if (from === "field") {
              slots.fieldToHand(tileId, fieldIndex);
            } else {
              const handIndex = slots.handSlots.findIndex((id) => id === tileId);
              slots.handToNextField(tileId, handIndex);
            }
            return;
          }

          if (!operation.target) {
            if (from === "field") {
              setShouldAnimateOverlay(false);
              slots.fieldToHand(tileId, fieldIndex);
            }
            return;
          }

          setShouldAnimateOverlay(true);

          const toIndex = parseInt((operation.target.id as string).split("_")[1]);

          if (from === "field") {
            slots.setFieldSlots((prev) => {
              const next = prev.slice();
              next[fieldIndex] = null;
              next[toIndex] = tileId;
              return getCollapsedField(next, fieldIndex);
            });
          } else {
            const handIndex = slots.handSlots.findIndex((id) => id === tileId);
            slots.setHandSlots((prev) => prev.map((id, i) => (i === handIndex ? null : id)));
            slots.setFieldSlots((prev) => prev.map((id, i) => (i === toIndex ? tileId : id)));
          }
        }}
      >
        <GameProvider
          deck={state.deck}
          phase={phase}
          drawPile={state.drawPile}
          fieldSlots={slots.fieldSlots}
          handSlots={slots.handSlots}
          fieldToHand={slots.fieldToHand}
          handToNextField={slots.handToNextField}
          disabled={phase.type !== "idle"}
          onShuffle={slots.shuffleHand}
          onDiscard={handleDiscard}
          onPlay={handlePlay}
        >
          <FieldGrid />
          <HandGrid />
        </GameProvider>
        <Dialog.Root
          open={state.gamePhase !== "playing"}
          onOpenChange={(open) => {
            if (!open) dispatch({ type: "RESET" });
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop class="fixed inset-0 bg-black/60" />
            <Dialog.Popup class="fixed inset-0 flex items-center justify-center">
              <div class="bg-white rounded-xl p-8 flex flex-col items-center gap-4">
                <Dialog.Title class="text-4xl font-bold">
                  {state.gamePhase === "won" ? "You Win!" : "Game Over"}
                </Dialog.Title>
                <p class="text-xl">Final score: {state.score}</p>
                <Dialog.Close class="px-6 py-2 bg-stone-800 text-white rounded-full text-lg">
                  Play Again
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
        {/* TODO dragoverlay only renders one things at a time, so "drops" while still animating are not animated */}
        <DragOverlay dropAnimation={shouldAnimateOverlay ? undefined : null}>
          {(source) => {
            const [letter] = getTile(state.deck, source.id as string);
            return <Tile letter={letter} />;
          }}
        </DragOverlay>
      </DragDropProvider>
    </div>
  );
}

// --- Shared slot/tile primitives ---

const SLOT_CLASS =
  "flex-1 aspect-square rounded border transition-shadow ease-out bg-stone-200 data-[drop-target=true]:(ring ring-4 ring-blue-500 shadow-xl shadow-inset)";

function FieldSlot({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const droppable = useDroppable({ id, disabled });
  return (
    <div ref={droppable.ref} class={SLOT_CLASS} data-drop-target={droppable.isDropTarget}>
      {children}
    </div>
  );
}

function HandSlot({ children }: { children?: ReactNode }) {
  return <div class={SLOT_CLASS}>{children}</div>;
}

const TILE_CLASS =
  "font-mono h-full rounded-sm border font-bold text-stone-800 text-3xl sm:(text-6xl) flex justify-center items-center bg-neutral-50 select-none touch-none";

function SortableTile({
  id,
  anim,
  animDelay,
  onClick,
}: {
  id: string;
  anim?: string;
  animDelay?: string;
  onClick?: () => void;
}) {
  const { deck } = useGame();
  const [letter] = getTile(deck, id);
  const { ref, isDragging, isDropping } = useDraggable({ id, disabled: anim != null });
  return (
    <div
      ref={ref}
      class={TILE_CLASS}
      data-anim={anim}
      style={{ opacity: isDragging || isDropping ? 0 : undefined, animationDelay: animDelay }}
      onClick={onClick}
    >
      <span>{letter}</span>
    </div>
  );
}

function Tile({ letter }: { letter: keyof Deck }) {
  return <div class={TILE_CLASS}>{letter}</div>;
}

const BUTTON_CLASS =
  "rounded-lg border-2 font-semibold transition-colors disabled:(opacity-50 cursor-not-allowed)";
const PRIMARY = "border-stone-800 bg-stone-800 text-white @hover:bg-stone-700";
const SECONDARY = "border-stone-300 bg-white text-stone-600 @hover:bg-stone-50";

// --- Extracted components ---

function ScoreBar({ score, playsLeft }: { score: number; playsLeft: number }) {
  return (
    <div
      class="bg-stone-100 relative before:(content-[''] absolute inset-0 bg-rose-300 w-[var(--p)] transition-[width] duration-700)"
      style={{ "--p": `${(score / RULES.targetScore) * 100}%` } as any}
    >
      <div class="relative h-10 flex items-center justify-center gap-8 px-4 font-bold">
        <span>
          Score: {score} / {RULES.targetScore}
        </span>
        <span>Plays left: {playsLeft}</span>
      </div>
    </div>
  );
}

function ResultBanner({
  phase,
  lastResult,
  playedBest,
  playedHandSuggestions,
  suggestionIndex,
}: {
  phase: ActivePhase;
  lastResult: PlayResult | null;
  playedBest: boolean;
  playedHandSuggestions: string[];
  suggestionIndex: number;
}) {
  return (
    <div class="h-12 flex flex-col items-center justify-center font-semibold gap-1">
      {
        phase.type === "scoring" ? (
          <span class="text-green-600">
            {phase.runningTotal > 0 ? `+${phase.runningTotal}` : ""}
          </span>
        ) : phase.type === "idle" ? (
          <>
            {lastResult && (
              <span
                class={
                  lastResult.valid
                    ? playedBest
                      ? "text-yellow-500"
                      : "text-green-600"
                    : "text-red-600"
                }
              >
                {lastResult.valid
                  ? `${lastResult.word} +${lastResult.pts} pts${playedBest ? " — best play!" : ""}`
                  : `${lastResult.word} — not a word`}
              </span>
            )}
            {playedHandSuggestions[0] && lastResult != null && lastResult.valid && !playedBest && (
              <span class="text-stone-400 text-sm font-normal">
                Could have played: {playedHandSuggestions[suggestionIndex]}
              </span>
            )}
          </>
        ) : null /* discarding, drawing, future phases: silent */
      }
    </div>
  );
}

function FieldGrid() {
  const { fieldSlots, fieldToHand, phase } = useGame();
  return (
    <div class="mx-auto w-full max-w-xl p-4 grid grid-cols-6 gap-2 sm:gap-4 content-center">
      {fieldSlots.map((tileId, i) => (
        <FieldSlot key={i} id={`field_${i}`} disabled={tileId != null}>
          {tileId != null && (
            <SortableTile
              id={tileId}
              {...getTileAnim(phase, tileId, i)}
              onClick={() => fieldToHand(tileId, i)}
            />
          )}
        </FieldSlot>
      ))}
    </div>
  );
}

function HandGrid() {
  const { handSlots, handToNextField, phase, disabled, onShuffle, onDiscard, onPlay } = useGame();
  return (
    <div class="mx-auto w-full max-w-xl p-4 grid grid-cols-6 grid-rows-6 sm:grid-rows-5 gap-2 sm:gap-4">
      <div class="grid grid-cols-subgrid [grid-column:2/6] grid-rows-subgrid [grid-row:1/5]">
        {handSlots.map((tileId, i) => (
          <HandSlot key={i}>
            {tileId != null && (
              <SortableTile
                id={tileId}
                {...getTileAnim(phase, tileId, i)}
                onClick={() => handToNextField(tileId, i)}
              />
            )}
          </HandSlot>
        ))}
      </div>
      <div class="grid grid-cols-subgrid [grid-column:1/7] grid-rows-subgrid [grid-row:5/7]">
        <button
          class={`${BUTTON_CLASS} ${SECONDARY} [grid-column:2/span_2] [grid-row-start:2] sm:([grid-column:initial] [grid-row:initial])`}
          disabled={disabled}
          onClick={onShuffle}
        >
          <div>Shuffle</div>
        </button>
        <button
          class={`${BUTTON_CLASS} ${PRIMARY} [grid-column:2/span_2]`}
          disabled={disabled}
          onClick={onDiscard}
        >
          <div>Discard</div>
        </button>
        <button
          class={`${BUTTON_CLASS} ${PRIMARY} [grid-column:span_2]`}
          disabled={disabled}
          onClick={onPlay}
        >
          <div>Play</div>
        </button>
        <DeckDialog />
      </div>
    </div>
  );
}
