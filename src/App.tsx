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
import { useEffect, useState, type ReactNode } from "react";
import { DeckDialog } from "./components/Dialog";
import LeftDrawer from "./components/Drawer";
import { getStartingDeck, type Deck, type TileMeta } from "./lib/constants";
import { shuffleInPlace } from "./lib/utils";

export function getDirectionalIntersection(
  entry: ClientRect,
  target: ClientRect
) {
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
    const intersectionRatio =
      intersectionArea / (targetArea + entryArea - intersectionArea);

    return [direction, Math.floor(intersectionRatio * 100) / 100];
  }

  return [direction, 0];
}

export const directionalRectIntersection: CollisionDetection = ({
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

type FieldSlotProps = {
  tileId: string | null;
};
type HandSlotProps = {
  tileId: string | null;
};

function tileIdsFromDeck(deck: Record<string, TileMeta[]>): string[] {
  const tiles = Object.entries(deck).flatMap(([letter, tiles]) => {
    return Array.from({ length: tiles.length }, (_, i) => `${letter}_${i}`);
  });
  shuffleInPlace(tiles);
  return tiles;
}

let dragStartTime: number = null!;

const ROW_LEN = 8;
// does this work with animations? how does draggable animate to original location?
export function App() {
  const [fieldSlots, setFieldSlots] = useState<FieldSlotProps[]>(
    Array.from({ length: ROW_LEN }, () => ({ tileId: null }))
  );
  const [handSlots, setHandSlots] = useState<HandSlotProps[]>(
    Array.from({ length: 16 }, () => ({ tileId: null }))
  );

  const [deck, setDeck] = useState(getStartingDeck() as Deck);

  const [drawPile, setDrawPile] = useState<string[]>(tileIdsFromDeck(deck));
  const [activePile, setActivePile] = useState<string[]>([]);
  const [discardPile, setDiscardPile] = useState<string[]>([]);

  const getTile = (key: string) => {
    const split = key.lastIndexOf("_");
    const letter = key.slice(0, split) as keyof Deck;
    const index = parseInt(key.slice(split + 1));
    return [letter, deck[letter]![index]] as const;
  };

  const sensors = useSensors(
    useSensor(PointerSensor)
    // useSensor(KeyboardSensor, {
    //   coordinateGetter: sortableKeyboardCoordinates,
    // })
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const activeProps = activeId ? getTile(activeId) : null;

  const fieldToHand = (fieldIndex: number, handIndex: number) => {
    setFieldSlots((prev) => {
      const row = Math.floor(fieldIndex / ROW_LEN);
      if (row > 0) {
        let removeRow = true;
        for (let j = row * ROW_LEN; j < (row + 1) * ROW_LEN; j++) {
          if (j === fieldIndex) continue;
          if (prev[j].tileId === null) continue;
          removeRow = false;
          break;
        }
        if (removeRow) {
          return prev.slice(0, ROW_LEN);
        }
      }

      const next = [...prev];
      next[fieldIndex] = { tileId: null };
      return next;
    });
    setHandSlots((prev) => {
      const next = [...prev];
      next[handIndex] = { tileId: activeId };
      return next;
    });
  };

  const handToNextField = (handIndex: number) => {
    setHandSlots((prev) => {
      const next = [...prev];
      next[handIndex] = { tileId: null };
      return next;
    });
    setFieldSlots((prev) => {
      const next = [...prev];
      let firstEmpty = next.length;
      let nextEmpty = 0;
      for (let j = 0; j < next.length; j++) {
        if (next[j].tileId != null) {
          nextEmpty = j + 1;
        } else if (j < firstEmpty) {
          firstEmpty = j;
        }
      }
      if (nextEmpty >= ROW_LEN * 2) {
        next[firstEmpty] = { tileId: activeId };
        return next;
      }
      if (nextEmpty >= next.length) {
        for (let j = 0; j < ROW_LEN; j++) {
          next.push({ tileId: null });
        }
      }
      next[nextEmpty] = { tileId: activeId };
      return next;
    });
  };

  // Only field slots have dropzones
  // so we manually determine hand slot "collision"
  const getDragEndTo = (e: DragEndEvent) => {
    if (!e.over) {
      return ["hand", null] as const;
    }
    let sum = 0;
    e.collisions!.forEach((collision) => (sum += collision.data!.value));
    if (sum < 0.5) {
      return ["hand", null] as const;
    }
    const toIndex = parseInt((e.over.id as string).split("_")[1]);

    return ["field", toIndex] as const;
  };

  const [cursor, setCursor] = useState(0);

  // TODO test against actual letters
  const allowedLetters = /^[A-Za-z ]$/;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const letterKey = e.key.toUpperCase();

      if (allowedLetters.test(letterKey) && !e.ctrlKey && !e.metaKey) {
        const handIndex = handSlots.findIndex((slot) => {
          if (slot.tileId == null) return false;
          const [letter, _meta] = getTile(slot.tileId);
          return letter === letterKey;
        });
        if (handIndex === -1) {
          // TODO error animation
          return;
        }

        //TODO doesn't work, off by one delay
        setActiveId(handSlots[handIndex].tileId);
        handToNextField(handIndex);
      }

      switch (e.key) {
        case "Backspace": {
          if (e.ctrlKey) {
            // return all keys to hand
          } else {
            console.log("h");
            for (let i = fieldSlots.length; i >= 0; i--) {
              if (fieldSlots[i].tileId != null) {
                setActiveId(fieldSlots[i].tileId);
                const activeHandIndex = activePile.findIndex(
                  (tileId) => tileId === activeId
                )!;
                // TODO doesn't work b/c updates not
                fieldToHand(i, activeHandIndex);
              }
            }
            // return last letter in field to hand
          }

          break;
        }
        case "ArrowLeft": {
          if (e.ctrlKey) {
            let i = cursor;
            for (; i > 0; i--) {
              if (fieldSlots[i].tileId == null) {
                break;
              }
            }
            setCursor(i);
          } else {
            setCursor((c) => Math.max(0, c - 1));
          }
          break;
        }
        case "ArrowRight": {
          if (e.ctrlKey) {
            let i = cursor;
            for (; i < fieldSlots.length - 1; i++) {
              if (fieldSlots[i].tileId == null) {
                break;
              }
            }
            setCursor(i);
          }
          setCursor((c) => Math.min(c + 1, fieldSlots.length - 1));
          break;
        }
        case " ": {
          setCursor((c) => Math.min(c + 1, fieldSlots.length - 1));
          break;
        }
        case "Home": {
          setCursor(0);
          break;
        }
        case "End": {
          setCursor(fieldSlots.length - 1);
          break;
        }
        default: {
          return;
        }
      }
      e.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  return (
    <div className="overflow-hidden">
      <div className="h-12 bg-red">hello there</div>
      <DndContext
        sensors={sensors}
        collisionDetection={directionalRectIntersection}
        onDragStart={(e) => {
          dragStartTime = performance.now();
          setActiveId(e.active.id as string);
        }}
        onDragCancel={() => {
          setActiveId(null);
        }}
        onDragOver={(e) => {
          // const collision = e.collisions![0];
          // if (collision == null) {
          //   console.log("return to hand");
          //   return;
          // }
          // console.log(collision.data);
        }}
        onDragEnd={(e) => {
          const fieldIndex = fieldSlots.findIndex(
            (slot) => slot.tileId === activeId
          );
          const activeHandIndex = activePile.findIndex(
            (tileId) => tileId === activeId
          )!;
          const from = fieldIndex === -1 ? "hand" : "field";

          // Handle short clicks
          if (
            Math.abs(e.delta.x) < 4 &&
            Math.abs(e.delta.y) < 4 &&
            performance.now() - dragStartTime < 200
          ) {
            if (from === "field") {
              // field to hand
              fieldToHand(fieldIndex, activeHandIndex);
            } else {
              // hand to field
              handToNextField(activeHandIndex);
            }
            return;
          }

          const [to, toIndex] = getDragEndTo(e);
          if (toIndex === fieldIndex) {
            return;
          }

          if (from === "field") {
            if (to === "field") {
              // field to field

              // TODO: maybe more advanced logic, but moving tiles seems problematic
              if (fieldSlots[toIndex].tileId != null) {
                return;
              }

              setFieldSlots((prev) => {
                const next = [...prev];
                next[fieldIndex] = { tileId: null };
                next[toIndex] = { tileId: activeId };
                return next;
              });
            } else {
              // field to hand
              fieldToHand(fieldIndex, activeHandIndex);
            }
          } else {
            if (to === "field") {
              // hand to field
              setHandSlots((prev) => {
                const next = [...prev];
                next[activeHandIndex] = { tileId: null };
                return next;
              });
              setFieldSlots((prev) => {
                const next = [...prev];
                next[toIndex] = { tileId: activeId };
                return next;
              });
            }
            // hand to hand
            // nothing required
          }
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr]">
          <LeftDrawer></LeftDrawer>
          <div className="m-auto">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 py-8">
              <SortableContext
                items={fieldSlots
                  .filter((slot) => slot.tileId != null)
                  .map((slot) => slot.tileId as string)}
              >
                {fieldSlots.map((slot, i) => {
                  const slotId = `field_${i}`;
                  if (slot.tileId == null)
                    return <FieldSlot key={i} id={slotId} />;
                  const [letter, meta] = getTile(slot.tileId);
                  return (
                    <FieldSlot key={i} id={slotId}>
                      <SortableTile
                        id={slot.tileId}
                        letter={letter}
                        meta={meta}
                      />
                    </FieldSlot>
                  );
                })}
              </SortableContext>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              <div className="md:col-start-3 col-span-4 grid grid-cols-4 gap-2">
                {handSlots.map((slot, i) => {
                  if (slot.tileId == null) return <HandSlot key={i} />;
                  const [letter, meta] = getTile(slot.tileId);
                  return (
                    <HandSlot key={i}>
                      <SortableTile
                        id={slot.tileId}
                        letter={letter}
                        meta={meta}
                      />
                    </HandSlot>
                  );
                })}
              </div>
              <div className="md:col-start-3 col-span-6 grid grid-cols-6 gap-2">
                <Move></Move>
                <Move
                  onClick={() => {
                    const fromTileIds = handSlots
                      .map((slot) => slot.tileId)
                      .filter((id) => id != null);
                    const toTileIds = [...fromTileIds];
                    shuffleInPlace(toTileIds);

                    let i = 0;
                    const newActive = activePile.map((tileId) => {
                      if (i < fromTileIds.length && tileId === fromTileIds[i]) {
                        const to = toTileIds[i];
                        i++;
                        return to;
                      }
                      return tileId;
                    });

                    setActivePile(newActive);
                    setHandSlots((prev) => {
                      return prev.map((slot, i) => {
                        if (slot.tileId == null) return slot;
                        return { tileId: newActive[i] };
                      });
                    });
                  }}
                >
                  Shuffle
                </Move>
                <Move
                  onClick={() => {
                    const newDiscard = [...discardPile, ...activePile];

                    let newActive: string[];
                    if (handSlots.length >= drawPile.length) {
                      shuffleInPlace(newDiscard);
                      const drawn = newDiscard.splice(
                        0,
                        handSlots.length - drawPile.length
                      );
                      setDiscardPile([]);
                      setDrawPile(newDiscard);
                      newActive = [...drawPile, ...drawn];
                    } else {
                      const drawn = drawPile.splice(0, handSlots.length);
                      setDiscardPile(newDiscard);
                      setDrawPile([...drawPile]);
                      newActive = drawn;
                    }

                    setFieldSlots(
                      Array.from({ length: fieldSlots.length }, () => ({
                        tileId: null,
                      }))
                    );

                    setActivePile(newActive);
                    setHandSlots(
                      Array.from({ length: handSlots.length }, (_, i) => ({
                        tileId: newActive[i],
                      }))
                    );
                  }}
                >
                  Redraw
                </Move>
                <DeckDialog deck={drawPile} />
                <Move>Play</Move>
              </div>
            </div>
          </div>
        </div>
        {/* TODO dragoverlay only renders one things at a time, so "drops" while still animating are not animated */}
        <DragOverlay dropAnimation={{ duration: 150 }}>
          {activeProps ? (
            <Tile letter={activeProps[0]} meta={activeProps[1]} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function FieldSlot({ id, children }: { id: string; children?: ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      className="rounded border size-12 sm:size-24 bg-stone-400/40"
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}
function HandSlot({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded border size-12 sm:size-24 bg-stone-400/40">
      {children}
    </div>
  );
}

const TILE_CLASS = "border size-12 sm:size-24 flex justify-center items-center";

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
    <div
      className={TILE_CLASS + " bg-gray-100 select-none touch-none"}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {letter}
    </div>
  );
}

function Tile({ letter, meta }: TileProps) {
  return (
    <div className={TILE_CLASS + " bg-gray-100 select-none"}>{letter}</div>
  );
}

function Move({ children, onClick }) {
  return (
    <button className={TILE_CLASS + " rounded-full"} onClick={onClick}>
      {children}
    </button>
  );
}
