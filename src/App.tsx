import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/react";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { DeckDialog } from "./components/DeckDrawer";
import type { Deck, TileMeta } from "./lib/constants";
import { findBestPlays, RULES } from "./lib/game";
import { createInitialState, gameReducer, getTile, tileLetters } from "./lib/gameState";
import { shuffleInPlace } from "./lib/utils";

// does this work with animations? how does draggable animate to original location?
export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  // UI-only state: visual slot layout
  const [fieldSlots, setFieldSlots] = useState<(string | null)[]>(
    Array.from({ length: RULES.rowLen }, () => null),
  );
  const [handSlots, setHandSlots] = useState<(string | null)[]>(
    Array.from({ length: RULES.handSize }, () => null),
  );

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

  // Sync visual slots when game hand changes (after PLAY_WORD, REDRAW, RESET)
  useEffect(() => {
    setFieldSlots(Array.from({ length: RULES.rowLen }, () => null));
    setHandSlots(Array.from({ length: RULES.handSize }, (_, i) => state.hand[i] ?? null));
  }, [state.hand]);

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

  // --- UI tile movement helpers (no game state involved) ---

  const fieldToHand = (tileId: string, fieldIndex: number) => {
    setFieldSlots((prev) => {
      const row = Math.floor(fieldIndex / RULES.rowLen);
      if (row > 0) {
        const rowStart = row * RULES.rowLen;
        const rowEnd = (row + 1) * RULES.rowLen;
        const rowEmpty = prev
          .slice(rowStart, rowEnd)
          .every((id, i) => i + rowStart === fieldIndex || id == null);
        if (rowEmpty) return prev.slice(0, RULES.rowLen);
      }
      return prev.map((id, i) => (i === fieldIndex ? null : id));
    });
    setHandSlots((prev) => {
      const emptyIdx = prev.findIndex((id) => id == null);
      if (emptyIdx === -1) return prev;
      return prev.map((id, i) => (i === emptyIdx ? tileId : id));
    });
  };

  const handToNextField = (tileId: string, handIndex: number) => {
    setHandSlots((prev) => prev.map((id, i) => (i === handIndex ? null : id)));
    setFieldSlots((prev) => {
      const next = [...prev];
      let firstEmpty = next.length;
      let nextEmpty = 0;
      for (let j = 0; j < next.length; j++) {
        if (next[j] != null) {
          nextEmpty = j + 1;
        } else if (j < firstEmpty) {
          firstEmpty = j;
        }
      }
      if (nextEmpty >= RULES.rowLen * 2) {
        next[firstEmpty] = tileId;
        return next;
      }
      if (nextEmpty >= next.length) {
        for (let j = 0; j < RULES.rowLen; j++) {
          next.push(null);
        }
      }
      next[nextEmpty] = tileId;
      return next;
    });
  };

  const resetField = () => {
    setFieldSlots(Array.from({ length: RULES.rowLen }, () => null));
    setHandSlots(Array.from({ length: RULES.handSize }, (_, i) => state.hand[i] ?? null));
  };

  const handlePlay = () => {
    const tileIds = fieldSlots.filter((id) => id != null) as string[];
    if (tileIds.length === 0) return;
    const word = tileLetters(state.deck, tileIds).join("");
    setPlayedBest(currentSuggestions.includes(word));

    setPlayedHandSuggestions(currentSuggestions);
    setSuggestionIndex(Math.floor(Math.random() * currentSuggestions.length));

    dispatch({ type: "PLAY_WORD", tileIds, dictionary: dictionaryRef.current });
  };

  // --- Keyboard handler ---

  const allowedLetters = /^[A-Za-z ]$/;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const letterKey = e.key.toUpperCase();

      if (allowedLetters.test(letterKey) && !e.ctrlKey && !e.metaKey) {
        const handIndex = handSlots.findIndex((tileId) => {
          if (tileId == null) return false;
          const [letter] = getTile(state.deck, tileId);
          return letter === letterKey;
        });
        if (handIndex === -1) {
          // TODO error animation
          return;
        }
        handToNextField(handSlots[handIndex]!, handIndex);
      }

      switch (e.key) {
        case "Enter": {
          handlePlay();
          break;
        }
        case "Backspace": {
          if (e.ctrlKey) {
            resetField();
          } else {
            for (let i = fieldSlots.length - 1; i >= 0; i--) {
              if (fieldSlots[i] != null) {
                fieldToHand(fieldSlots[i]!, i);
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
  });

  return (
    <div className="overflow-hidden">
      <div className="h-12 flex items-center justify-center gap-8 bg-stone-100 px-4">
        <span>
          Score: {state.score} / {RULES.targetScore}
        </span>
        <span>Plays left: {state.playsLeft}</span>
      </div>
      <DragDropProvider
        onDragEnd={(event) => {
          const { operation, canceled } = event;
          if (canceled || !operation.source) return;
          const tileId = operation.source.id as string;

          const fieldIndex = fieldSlots.findIndex((id) => id === tileId);
          const handIndex = handSlots.findIndex((id) => id === tileId);
          const from = fieldIndex === -1 ? "hand" : "field";

          if (!operation.target) {
            // Dropped with no target: field tile returns to hand
            if (from === "field") fieldToHand(tileId, fieldIndex);
            return;
          }

          const toIndex = parseInt((operation.target.id as string).split("_")[1]);

          if (from === "field") {
            // TODO: maybe more advanced logic, but moving tiles seems problematic
            setFieldSlots((prev) => {
              const next = [...prev];
              next[fieldIndex] = null;
              next[toIndex] = tileId;
              return next;
            });
          } else {
            // Hand to field
            setHandSlots((prev) => prev.map((id, i) => (i === handIndex ? null : id)));
            setFieldSlots((prev) => prev.map((id, i) => (i === toIndex ? tileId : id)));
          }
        }}
      >
        <div className="w-fit m-auto">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 py-8">
            {fieldSlots.map((tileId, i) => {
              const slotId = `field_${i}`;
              if (tileId == null) return <FieldSlot key={i} id={slotId} />;
              const [letter, meta] = getTile(state.deck, tileId);
              return (
                <FieldSlot key={i} id={slotId} disabled>
                  <SortableTile
                    id={tileId}
                    letter={letter}
                    meta={meta}
                    onClick={() => fieldToHand(tileId, i)}
                  />
                </FieldSlot>
              );
            })}
          </div>
          <div className="h-14 flex flex-col items-center justify-center font-semibold gap-1">
            {state.lastResult && (
              <span
                className={
                  state.lastResult.valid
                    ? playedBest
                      ? "text-yellow-500"
                      : "text-green-600"
                    : "text-red-600"
                }
              >
                {state.lastResult.valid
                  ? `${state.lastResult.word} +${state.lastResult.pts} pts${playedBest ? " — best play!" : ""}`
                  : `${state.lastResult.word} — not a word`}
              </span>
            )}
            {playedHandSuggestions[0] && state.lastResult?.valid && !playedBest && (
              <span className="text-stone-400 text-sm font-normal">
                Could have played: {playedHandSuggestions[suggestionIndex]}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            <div className="md:col-start-3 col-span-4 grid grid-cols-4 gap-2">
              {handSlots.map((tileId, i) => {
                if (tileId == null) return <HandSlot key={i} />;
                const [letter, meta] = getTile(state.deck, tileId);
                return (
                  <HandSlot key={i}>
                    <SortableTile
                      id={tileId}
                      letter={letter}
                      meta={meta}
                      onClick={() => handToNextField(tileId, i)}
                    />
                  </HandSlot>
                );
              })}
            </div>
            <div className="md:col-start-3 col-span-6 grid grid-cols-6 gap-2">
              <Move onClick={resetField} shortcut="^⌫">
                Reset
              </Move>
              <Move
                onClick={() => {
                  const handTiles = handSlots.filter((id) => id != null) as string[];
                  shuffleInPlace(handTiles);
                  setHandSlots((prev) => {
                    let i = 0;
                    return prev.map((id) => (id != null ? handTiles[i++] : null));
                  });
                }}
              >
                Shuffle
              </Move>
              <Move
                onClick={() => {
                  dispatch({ type: "REDRAW" });
                  setPlayedHandSuggestions([]);
                  setPlayedBest(false);
                }}
              >
                Draw
              </Move>
              <DeckDialog deck={state.drawPile} deckMeta={state.deck} />
              <Move variant="primary" shortcut="↵" onClick={handlePlay}>
                {dictLoaded ? "Play" : "..."}
              </Move>
            </div>
          </div>
        </div>
        {state.gamePhase !== "playing" && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
            <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4">
              <h1 className="text-4xl font-bold">
                {state.gamePhase === "won" ? "You Win!" : "Game Over"}
              </h1>
              <p className="text-xl">Final score: {state.score}</p>
              <button
                className="px-6 py-2 bg-stone-800 text-white rounded-full text-lg"
                onClick={() => dispatch({ type: "RESET" })}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
        {/* TODO dragoverlay only renders one things at a time, so "drops" while still animating are not animated */}
        <DragOverlay dropAnimation={null}>
          {(source) => {
            const [letter, meta] = getTile(state.deck, source.id as string);
            return <Tile letter={letter} meta={meta} />;
          }}
        </DragOverlay>
      </DragDropProvider>
    </div>
  );
}

const SLOT_CLASS =
  "rounded border transition-shadow ease-out size-12 sm:size-24 bg-stone-200 data-[drop-target=true]:(ring ring-4 ring-blue-500 shadow-xl shadow-inset)";

function FieldSlot({ id, disabled, children }: { id: string; disabled?: boolean; children?: ReactNode }) {
  const droppable = useDroppable({ id, disabled });
  return (
    <div ref={droppable.ref} className={SLOT_CLASS} data-drop-target={droppable.isDropTarget}>
      {children}
    </div>
  );
}

function HandSlot({ children }: { children?: ReactNode }) {
  return <div className={SLOT_CLASS}>{children}</div>;
}

const TILE_CLASS =
  "rounded-sm border font-bold text-stone-800 size-12 text-3xl sm:(size-24 text-6xl) flex justify-center items-center bg-neutral-50 select-none touch-none ";

type TileProps = {
  letter: keyof Deck;
  meta: TileMeta;
};

function SortableTile({ id, letter, meta, onClick }: TileProps & { id: string; onClick?: () => void }) {
  const draggable = useDraggable({ id });
  return (
    <div
      ref={draggable.ref}
      className={TILE_CLASS}
      style={{ opacity: draggable.isDragging ? 0 : undefined }}
      onClick={onClick}
    >
      <span>{letter}</span>
    </div>
  );
}

function Tile({ letter, meta }: TileProps) {
  return <div className={TILE_CLASS}>{letter}</div>;
}

function Move({
  children,
  onClick,
  variant = "default",
  shortcut,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary";
  shortcut?: string;
}) {
  const base =
    "size-12 sm:size-24 rounded-lg border-2 font-semibold text-xs sm:text-base transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5";
  const styles =
    variant === "primary"
      ? "border-stone-800 bg-stone-800 text-white hover:bg-stone-700"
      : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50";
  return (
    <button className={`${base} ${styles}`} onClick={onClick}>
      <span>{children}</span>
      {shortcut && (
        <span className="hidden sm:block text-xs font-normal text-stone-400">{shortcut}</span>
      )}
    </button>
  );
}
