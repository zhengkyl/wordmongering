import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type ClientRect,
  type CollisionDescriptor,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { DeckDialog } from "./components/Dialog";
import LeftDrawer from "./components/Drawer";
import type { Deck, TileMeta } from "./lib/constants";
import { findBestPlays, RULES } from "./lib/game";
import { createInitialState, gameReducer, getTile } from "./lib/gameState";
import { shuffleInPlace } from "./lib/utils";

function getDirectionalIntersection(entry: ClientRect, target: ClientRect) {
  const top = Math.max(target.top, entry.top);
  const bottom = Math.min(target.top + target.height, entry.top + entry.height);
  const height = bottom - top;

  const left = Math.max(target.left, entry.left);
  const right = Math.min(target.left + target.width, entry.left + entry.width);
  const width = right - left;

  const targetCenter = target.left + target.width / 2;
  const entryCenter = entry.left + entry.width / 2;
  const direction = targetCenter < entryCenter ? -1 : 1;

  if (left < right && top < bottom) {
    const targetArea = target.width * target.height;
    const entryArea = entry.width * entry.height;
    const intersectionArea = width * height;
    const intersectionRatio = intersectionArea / (targetArea + entryArea - intersectionArea);

    return [direction, Math.floor(intersectionRatio * 100) / 100];
  }

  return [direction, 0];
}

const directionalRectIntersection: CollisionDetection = ({
  collisionRect,
  droppableRects,
  droppableContainers,
}) => {
  const collisions: CollisionDescriptor[] = [];

  for (const droppableContainer of droppableContainers) {
    const { id } = droppableContainer;
    const rect = droppableRects.get(id);
    if (rect == null) continue;

    const [direction, ratio] = getDirectionalIntersection(rect, collisionRect);

    if (ratio === 0) continue;

    collisions.push({
      id,
      data: { droppableContainer, value: ratio, direction },
    });
  }

  return collisions.sort((a, b) => b.data.value - a.data.value);
};

let dragStartTime: number = null!;

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
  const [playedHandSuggestions, setPlayedHandSuggestions] = useState<string[]>([]);
  const [playedBest, setPlayedBest] = useState(false);

  useEffect(() => {
    if (!dictLoaded) return;
    const handLetters = state.hand.map((id) => getTile(state.deck, id)[0] as string);
    setCurrentSuggestions(findBestPlays(handLetters, dictionaryRef.current!));
  }, [state.hand, dictLoaded]);

  const sensors = useSensors(useSensor(PointerSensor));

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const activeDragProps = activeDragId ? getTile(state.deck, activeDragId) : null;

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

  const clearField = () => {
    setFieldSlots(Array.from({ length: RULES.rowLen }, () => null));
    setHandSlots(Array.from({ length: RULES.handSize }, (_, i) => state.hand[i] ?? null));
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
          const tileIds = fieldSlots.filter((id) => id != null) as string[];
          if (tileIds.length === 0) break;
          const word = tileIds.map((id) => getTile(state.deck, id)[0]).join("");
          setPlayedBest(currentSuggestions.includes(word));
          setPlayedHandSuggestions(currentSuggestions);
          dispatch({ type: "PLAY_WORD", tileIds, dictionary: dictionaryRef.current });
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
  });

  // --- DnD state ---

  const [dropTarget, setDropTarget] = useState<["field" | "hand", number] | null>(null);
  const dropTargetId = dropTarget ? `${dropTarget[0]}_${dropTarget[1]}` : null;

  const isShortClick = (e: DragEndEvent) =>
    Math.abs(e.delta.x) < 4 && Math.abs(e.delta.y) < 4 && performance.now() - dragStartTime < 200;

  const isDragging = useRef(false);

  // Only field slots have dropzones, so we manually determine hand slot "collision"
  const getDropTarget = (e: DragEndEvent) => {
    if (e.over) {
      let sum = 0;
      e.collisions!.forEach((collision) => (sum += collision.data!.value));
      if (sum > 0.4) {
        const toIndex = parseInt((e.over.id as string).split("_")[1]);
        return ["field", toIndex] as const;
      }
    }
    const handIndex = handSlots.findIndex((id) => id === activeDragId);
    return ["hand", handIndex] as const;
  };

  return (
    <div className="overflow-hidden">
      <div className="h-12 flex items-center justify-center gap-8 bg-stone-100 px-4">
        <span>
          Score: {state.score} / {RULES.targetScore}
        </span>
        <span>Plays left: {state.playsLeft}</span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={directionalRectIntersection}
        onDragStart={(e) => {
          isDragging.current = true;
          setActiveDragId(e.active.id as string);
          dragStartTime = performance.now();
        }}
        onDragCancel={() => {
          isDragging.current = false;
          setActiveDragId(null);
        }}
        onDragMove={(e) => {
          // dragmove happens after dragend sometimes, but before
          if (!isDragging.current) return;
          if (isShortClick(e)) return;

          const [to, toIndex] = getDropTarget(e);
          if (to === "field") {
            const toTileId = fieldSlots[toIndex];
            if (toTileId != null && toTileId != activeDragId) {
              return;
            }
            setDropTarget(["field", toIndex]);
          } else {
            setDropTarget(["hand", toIndex]);
          }
        }}
        onDragEnd={(e) => {
          isDragging.current = false;
          setActiveDragId(null);

          const fieldIndex = fieldSlots.findIndex((id) => id === activeDragId);
          const activeHandIndex = handSlots.findIndex((id) => id === activeDragId);
          const from = fieldIndex === -1 ? "hand" : "field";

          // Handle short clicks
          if (isShortClick(e)) {
            if (from === "field") {
              fieldToHand(activeDragId!, fieldIndex);
            } else {
              handToNextField(activeDragId!, activeHandIndex);
            }
            return;
          }

          if (dropTarget == null) return;
          const [to, toIndex] = dropTarget;

          setDropTarget(null);

          if (from === "field") {
            if (to === "field") {
              if (fieldIndex === toIndex) return;

              // field to field
              // TODO: maybe more advanced logic, but moving tiles seems problematic
              if (fieldSlots[toIndex] != null) return;

              setFieldSlots((prev) => {
                const next = [...prev];
                next[fieldIndex] = null;
                next[toIndex] = activeDragId;
                return next;
              });
            } else {
              // field to hand
              fieldToHand(activeDragId!, fieldIndex);
            }
          } else {
            if (to === "field") {
              // hand to field
              setHandSlots((prev) => prev.map((id, i) => (i === activeHandIndex ? null : id)));
              setFieldSlots((prev) => prev.map((id, i) => (i === toIndex ? activeDragId : id)));
            }
            // hand to hand: nothing required
          }
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr]">
          <LeftDrawer></LeftDrawer>
          <div className="m-auto">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 py-8">
              <SortableContext items={fieldSlots.filter((id) => id != null) as string[]}>
                {fieldSlots.map((tileId, i) => {
                  const slotId = `field_${i}`;
                  if (tileId == null)
                    return <FieldSlot key={i} id={slotId} dropTarget={dropTargetId === slotId} />;
                  const [letter, meta] = getTile(state.deck, tileId);
                  return (
                    <FieldSlot key={i} id={slotId} dropTarget={dropTargetId === slotId}>
                      <SortableTile id={tileId} letter={letter} meta={meta} />
                    </FieldSlot>
                  );
                })}
              </SortableContext>
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
                  Could have played:{" "}
                  {playedHandSuggestions[Math.floor(Math.random() * playedHandSuggestions.length)]}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              <div className="md:col-start-3 col-span-4 grid grid-cols-4 gap-2">
                {handSlots.map((tileId, i) => {
                  const slotId = `hand_${i}`;
                  if (tileId == null)
                    return <HandSlot key={i} dropTarget={dropTargetId === slotId} />;
                  const [letter, meta] = getTile(state.deck, tileId);
                  return (
                    <HandSlot key={i} dropTarget={dropTargetId === slotId}>
                      <SortableTile id={tileId} letter={letter} meta={meta} />
                    </HandSlot>
                  );
                })}
              </div>
              <div className="md:col-start-3 col-span-6 grid grid-cols-6 gap-2">
                <Move onClick={clearField} shortcut="^⌫">
                  Clear
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
                  Redraw
                </Move>
                <DeckDialog deck={state.drawPile} />
                <Move
                  variant="primary"
                  shortcut="↵"
                  onClick={() => {
                    const tileIds = fieldSlots.filter((id) => id != null) as string[];
                    if (tileIds.length === 0) return;
                    const word = tileIds.map((id) => getTile(state.deck, id)[0]).join("");
                    setPlayedBest(currentSuggestions.includes(word));
                    setPlayedHandSuggestions(currentSuggestions);
                    dispatch({
                      type: "PLAY_WORD",
                      tileIds,
                      dictionary: dictionaryRef.current,
                    });
                  }}
                >
                  {dictLoaded ? "Play" : "..."}
                </Move>
              </div>
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
        <DragOverlay dropAnimation={{ duration: 150 }}>
          {activeDragProps ? <Tile letter={activeDragProps[0]} meta={activeDragProps[1]} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

type SlotProps = {
  children?: ReactNode;
  dropTarget: boolean;
};

const SLOT_CLASS =
  "rounded border transition-shadow ease-out size-12 sm:size-24 bg-stone-200 data-[drop-target=true]:(ring ring-4 ring-blue-500 shadow-xl shadow-inset)";

function FieldSlot({ id, dropTarget, children }: SlotProps & { id: string }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={SLOT_CLASS} data-drop-target={dropTarget}>
      {children}
    </div>
  );
}
function HandSlot({ children, dropTarget }: SlotProps) {
  return (
    <div className={SLOT_CLASS} data-drop-target={dropTarget}>
      {children}
    </div>
  );
}

const TILE_CLASS =
  "rounded-sm border font-bold text-stone-800 size-12 text-3xl sm:(size-24 text-6xl) flex justify-center items-center bg-neutral-50 select-none touch-none ";

type TileProps = {
  letter: keyof Deck;
  meta: TileMeta;
};
function SortableTile({ id, letter, meta }: TileProps & { id: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
  };
  return (
    <div className={TILE_CLASS} ref={setNodeRef} style={style} {...attributes} {...listeners}>
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
  const hintColor = variant === "primary" ? "text-stone-400" : "text-stone-400";
  return (
    <button className={`${base} ${styles}`} onClick={onClick}>
      <span>{children}</span>
      {shortcut && (
        <span className={`hidden sm:block text-xs font-normal ${hintColor}`}>{shortcut}</span>
      )}
    </button>
  );
}
