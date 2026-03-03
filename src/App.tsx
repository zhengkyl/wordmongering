import { DrawerPreview as Drawer } from "@base-ui/react/drawer";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/react";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import type { Deck, TileMeta } from "./lib/constants";
import { findBestPlays, RULES } from "./lib/game";
import { createInitialState, gameReducer, getTile, tileLetters } from "./lib/gameState";
import { lastEmptyStart, shuffleInPlace } from "./lib/utils";

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

  // Sync visual slots when game hand changes (after PLAY, DISCARD, CLEAR)
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
    setFieldSlots((_prev) => {
      const next = _prev.slice();
      next[fieldIndex] = null;
      return getCollapsedField(next, fieldIndex);
    });
    setHandSlots((_prev) => {
      const next = _prev.slice();
      const emptyIdx = next.findIndex((id) => id == null);
      next[emptyIdx] = tileId;
      return next;
    });
  };

  const handToNextField = (tileId: string, handIndex: number) => {
    setHandSlots((_prev) => {
      const next = _prev.slice();
      next[handIndex] = null;
      return next;
    });
    setFieldSlots((_prev) => {
      const next = _prev.slice();

      if (next.length < RULES.maxRows * RULES.rowLen) {
        const i = lastEmptyStart(next);
        if (i >= next.length) {
          for (let j = 0; j < RULES.rowLen; j++) {
            next.push(null);
          }
        }
        next[i] = tileId;
      } else {
        for (let i = 0; i < next.length; i++) {
          if (next[i] == null) {
            next[i] = tileId;
            break;
          }
        }
      }

      return next;
    });
  };

  const clearField = () => {
    const returnTiles = fieldSlots.filter((s) => s != null);
    if (!returnTiles.length) return;

    setFieldSlots(Array.from({ length: RULES.rowLen }, () => null));
    setHandSlots((_prev) => {
      const next = _prev.slice();
      for (let i = 0; i < next.length; i++) {
        if (next[i] == null) {
          next[i] = returnTiles.pop();
        }
      }
      return next;
    });
  };

  const handlePlay = () => {
    const tileIds = fieldSlots.filter((id) => id != null) as string[];
    if (tileIds.length === 0) return;
    const word = tileLetters(state.deck, tileIds).join("");
    setPlayedBest(currentSuggestions.includes(word));

    setPlayedHandSuggestions(currentSuggestions);
    setSuggestionIndex(Math.floor(Math.random() * currentSuggestions.length));

    dispatch({ type: "PLAY", tileIds, dictionary: dictionaryRef.current });
  };

  // --- Keyboard handler ---

  const allowedLetters = /^[A-Z]$/;
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
            clearField();
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
  }, [handSlots]);

  const dragStartTime = useRef(null);

  const [shouldAnimateOverlay, setShouldAnimateOverlay] = useState(false);

  return (
    <div class="h-dvh grid [grid-template-rows:auto_auto_1fr_auto]">
      <div
        class="bg-stone-100 relative before:(content-[''] absolute inset-0 bg-rose-300 w-[var(--p)])"
        style={{ "--p": `${(state.score / RULES.targetScore) * 100}%` } as any}
      >
        <div class="relative h-10 flex items-center justify-center gap-8 px-4 font-bold">
          <span>
            Score: {state.score} / {RULES.targetScore}
          </span>
          <span>Plays left: {state.playsLeft}</span>
        </div>
      </div>
      <div class="h-12 flex flex-col items-center justify-center font-semibold gap-1">
        {state.lastResult && (
          <span
            class={
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
          <span class="text-stone-400 text-sm font-normal">
            Could have played: {playedHandSuggestions[suggestionIndex]}
          </span>
        )}
      </div>
      <DragDropProvider
        sensors={(defaults) => [
          ...defaults,
          PointerSensor.configure({
            activationConstraints(event, _source) {
              const { pointerType, target: _ } = event;

              switch (pointerType) {
                case "mouse":
                  // NOTE: the default distance is too low and eats all onClick events
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

          const { operation } = event;

          const tileId = operation.source.id as string;
          const fieldIndex = fieldSlots.findIndex((id) => id === tileId);
          const from = fieldIndex === -1 ? "hand" : "field";

          // NOTE: False drag events bug
          // when fast taps on mobile, must be ignored
          // when clicking with mouse, must be treated as click
          const isBuggedDrag = operation.transform.x === 0 && operation.transform.y === 0;
          if (isBuggedDrag && (operation.activatorEvent as any).pointerType !== "mouse") {
            return;
          }

          // Treat as click
          if (isBuggedDrag || performance.now() - dragStartTime.current < 50) {
            setShouldAnimateOverlay(false);
            if (from === "field") {
              fieldToHand(tileId, fieldIndex);
            } else {
              const handIndex = handSlots.findIndex((id) => id === tileId);
              handToNextField(tileId, handIndex);
            }
            return;
          }

          if (!operation.target) {
            // Dropped with no target: field tile returns to hand
            if (from === "field") {
              setShouldAnimateOverlay(false);
              fieldToHand(tileId, fieldIndex);
            }
            return;
          }

          setShouldAnimateOverlay(true);

          const toIndex = parseInt((operation.target.id as string).split("_")[1]);

          if (from === "field") {
            // TODO: maybe more advanced logic, but moving tiles seems problematic
            setFieldSlots((prev) => {
              const next = prev.slice();
              next[fieldIndex] = null;
              next[toIndex] = tileId;
              return getCollapsedField(next, fieldIndex);
            });
          } else {
            const handIndex = handSlots.findIndex((id) => id === tileId);
            // Hand to field
            setHandSlots((prev) => prev.map((id, i) => (i === handIndex ? null : id)));
            setFieldSlots((prev) => prev.map((id, i) => (i === toIndex ? tileId : id)));
          }
        }}
      >
        <div class="mx-auto w-full max-w-xl p-4 grid grid-cols-6 gap-2 sm:gap-4 content-center">
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
        <div class="mx-auto w-full max-w-xl p-4 grid grid-cols-6 grid-rows-6 sm:grid-rows-5 gap-2 sm:gap-4">
          <div class="grid grid-cols-subgrid [grid-column:2/6] grid-rows-subgrid [grid-row:1/5]">
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
          <div class="grid grid-cols-subgrid [grid-column:1/7] grid-rows-subgrid [grid-row:5/7]">
            <button
              class={`${BUTTON_CLASS} ${SECONDARY} [grid-column:2/span_2] [grid-row-start:2] sm:([grid-column:initial] [grid-row:initial])`}
              onClick={() => {
                const handTiles = handSlots.filter((id) => id != null) as string[];
                shuffleInPlace(handTiles);
                setHandSlots((prev) => {
                  let i = 0;
                  return prev.map((id) => (id != null ? handTiles[i++] : null));
                });
              }}
            >
              <div>Shuffle</div>
            </button>
            <button
              class={`${BUTTON_CLASS} ${PRIMARY} [grid-column:2/span_2]`}
              onClick={() => {
                const fieldTileIds = fieldSlots.filter((id) => id != null) as string[];
                dispatch({ type: "DISCARD", tileIds: fieldTileIds });
                setPlayedHandSuggestions([]);
                setPlayedBest(false);
              }}
            >
              <div>Discard</div>
            </button>
            <button class={`${BUTTON_CLASS} ${PRIMARY} [grid-column:span_2]`} onClick={handlePlay}>
              <div>{dictLoaded ? "Play" : "..."}</div>
            </button>
            <DeckDialog deck={state.drawPile} deckMeta={state.deck} />
          </div>
        </div>
        {state.gamePhase !== "playing" && (
          <div class="fixed inset-0 bg-black/60 flex items-center justify-center">
            <div class="bg-white rounded-xl p-8 flex flex-col items-center gap-4">
              <h1 class="text-4xl font-bold">
                {state.gamePhase === "won" ? "You Win!" : "Game Over"}
              </h1>
              <p class="text-xl">Final score: {state.score}</p>
              <button
                class="px-6 py-2 bg-stone-800 text-white rounded-full text-lg"
                onClick={() => dispatch({ type: "RESET" })}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
        {/* TODO dragoverlay only renders one things at a time, so "drops" while still animating are not animated */}
        <DragOverlay dropAnimation={shouldAnimateOverlay ? undefined : null}>
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
  "font-mono h-full rounded-sm border font-bold text-stone-800 text-3xl sm:(text-6xl) flex justify-center items-center bg-neutral-50 select-none touch-none ";

type TileProps = {
  letter: keyof Deck;
  meta: TileMeta;
};

function SortableTile({
  id,
  letter,
  meta,
  onClick,
}: TileProps & { id: string; onClick?: () => void }) {
  const { ref, isDragging, isDropping } = useDraggable({ id });
  return (
    <div
      ref={ref}
      class={TILE_CLASS}
      style={{ opacity: isDragging || isDropping ? 0 : undefined }}
      onClick={onClick}
    >
      <span>{letter}</span>
    </div>
  );
}

function Tile({ letter, meta }: TileProps) {
  return <div class={TILE_CLASS}>{letter}</div>;
}

const BUTTON_CLASS = "rounded-lg border-2 font-semibold transition-colors";
const PRIMARY = "border-stone-800 bg-stone-800 text-white @hover:bg-stone-700";
const SECONDARY = "border-stone-300 bg-white text-stone-600 @hover:bg-stone-50";

function DeckDialog({ deck, deckMeta }: { deck: string[]; deckMeta: Deck }) {
  const groups = new Map<string, { letter: string; variant: string; count: number }>();
  for (const tileId of deck) {
    const [letter, meta] = getTile(deckMeta, tileId);
    const key = `${letter}_${meta.variant}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, { letter: letter as string, variant: meta.variant, count: 1 });
    }
  }
  const sorted = [...groups.values()].sort((a, b) => a.letter.localeCompare(b.letter));

  return (
    <Drawer.Root>
      <Drawer.Trigger
        class={`${BUTTON_CLASS} ${SECONDARY} [grid-column:4/span_2] [grid-row-start:2] sm:([grid-column:initial] [grid-row:initial])`}
      >
        Deck
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop class="deck-drawer-backdrop fixed inset-0 bg-black" />
        <Drawer.Viewport class="fixed inset-0 flex items-end pointer-events-none">
          <Drawer.Popup class="deck-drawer-popup bg-white flex flex-col w-full h-[50vh] rounded-t-2xl outline-none pointer-events-auto -mb-12">
            <div class="flex justify-center pt-3 pb-2">
              <div class="w-10 h-1.5 rounded-full bg-stone-300" />
            </div>
            <Drawer.Title class="text-center font-semibold text-stone-800 pb-2">
              Deck ({deck.length} remaining)
            </Drawer.Title>
            <Drawer.Content class="overflow-y-auto px-4 pb-6 flex-1">
              <div class="flex flex-wrap gap-2 justify-center pt-2">
                {sorted.map(({ letter, variant, count }) => (
                  <div
                    key={`${letter}_${variant}`}
                    class="relative size-10 rounded-md border-2 border-stone-300 bg-stone-50 flex items-center justify-center font-semibold text-stone-700"
                  >
                    {letter}
                    <span class="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-stone-400 text-white text-[10px] leading-4 text-center font-bold">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function getCollapsedField(next: string[], removedIndex: number) {
  const row = Math.floor(removedIndex / RULES.rowLen);
  const rows = next.length / RULES.rowLen;

  if (rows > 1) {
    if (row === 0) {
      let numEmpty = 0;
      for (; numEmpty < next.length; numEmpty++) {
        if (next[numEmpty] != null) {
          break;
        }
      }
      const emptyRows = Math.floor(numEmpty / RULES.rowLen);
      const trimRows = Math.min(emptyRows, rows - 1);
      if (trimRows) {
        return next.slice(trimRows * RULES.rowLen);
      }
    } else if (row === rows - 1) {
      const nonEmptyRows = Math.ceil(lastEmptyStart(next) / RULES.rowLen);
      const keepRows = Math.max(nonEmptyRows, 1);
      if (keepRows < rows) {
        return next.slice(0, keepRows * RULES.rowLen);
      }
    }
  }
  return next;
}
