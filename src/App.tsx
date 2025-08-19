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
import { useEffect, useRef, useState, type ReactNode } from "react";
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

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const activeDragProps = activeDragId ? getTile(activeDragId) : null;

  const fieldToHand = (
    activeId: string,
    fieldIndex: number,
    handIndex: number
  ) => {
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
  const clearField = () => {
    setFieldSlots(Array.from({ length: ROW_LEN }, () => ({ tileId: null })));
    setHandSlots(
      Array.from({ length: handSlots.length }, (_, i) => ({
        tileId: activePile[i],
      }))
    );
  };

  const handToNextField = (activeId: string, handIndex: number) => {
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
  const getDropTarget = (e: DragEndEvent) => {
    if (e.over) {
      let sum = 0;
      e.collisions!.forEach((collision) => (sum += collision.data!.value));
      if (sum > 0.4) {
        const toIndex = parseInt((e.over.id as string).split("_")[1]);
        return ["field", toIndex] as const;
      }
    }
    const handIndex = activePile.findIndex(
      (tileId) => tileId === activeDragId
    )!;
    return ["hand", handIndex] as const;
  };

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

        handToNextField(handSlots[handIndex].tileId!, handIndex);
      }

      switch (e.key) {
        case "Backspace": {
          if (e.ctrlKey) {
            // return all keys to hand
            clearField();
          } else {
            // return last letter in field to hand
            for (let i = fieldSlots.length - 1; i >= 0; i--) {
              if (fieldSlots[i].tileId != null) {
                const activeId = fieldSlots[i].tileId!;
                const activeHandIndex = activePile.findIndex(
                  (tileId) => tileId === activeId
                )!;
                fieldToHand(activeId, i, activeHandIndex);
                break;
              }
            }
          }

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

  const [dropTarget, setDropTarget] = useState<
    ["field" | "hand", number] | null
  >(null);
  const dropTargetId = dropTarget ? `${dropTarget[0]}_${dropTarget[1]}` : null;

  const isShortClick = (e: DragEndEvent) =>
    Math.abs(e.delta.x) < 4 &&
    Math.abs(e.delta.y) < 4 &&
    performance.now() - dragStartTime < 200;

  const isDragging = useRef(false);

  return (
    <div className="overflow-hidden">
      <div className="h-12 bg-red">hello there</div>
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
            const toTileId = fieldSlots[toIndex].tileId;
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

          const fieldIndex = fieldSlots.findIndex(
            (slot) => slot.tileId === activeDragId
          );
          const activeHandIndex = activePile.findIndex(
            (tileId) => tileId === activeDragId
          )!;
          const from = fieldIndex === -1 ? "hand" : "field";

          // Handle short clicks
          if (isShortClick(e)) {
            console.log("is short click");
            if (from === "field") {
              // field to hand
              fieldToHand(activeDragId!, fieldIndex, activeHandIndex);
            } else {
              // hand to field
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
              if (fieldSlots[toIndex].tileId != null) {
                return;
              }

              setFieldSlots((prev) => {
                const next = [...prev];
                next[fieldIndex] = { tileId: null };
                next[toIndex] = { tileId: activeDragId };
                return next;
              });
            } else {
              // field to hand
              fieldToHand(activeDragId!, fieldIndex, activeHandIndex);
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
                next[toIndex] = { tileId: activeDragId };
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
                    return (
                      <FieldSlot
                        key={i}
                        id={slotId}
                        dropTarget={dropTargetId === slotId}
                      />
                    );
                  const [letter, meta] = getTile(slot.tileId);
                  return (
                    <FieldSlot
                      key={i}
                      id={slotId}
                      dropTarget={dropTargetId === slotId}
                    >
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
                  const slotId = `hand_${i}`;
                  if (slot.tileId == null)
                    return (
                      <HandSlot key={i} dropTarget={dropTargetId === slotId} />
                    );
                  const [letter, meta] = getTile(slot.tileId);
                  return (
                    <HandSlot key={i} dropTarget={dropTargetId === slotId}>
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
          {activeDragProps ? (
            <Tile letter={activeDragProps[0]} meta={activeDragProps[1]} />
          ) : null}
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
    <div
      className={TILE_CLASS}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <span>{letter}</span>
    </div>
  );
}

function Tile({ letter, meta }: TileProps) {
  return <div className={TILE_CLASS}>{letter}</div>;
}

function Move({ children, onClick }) {
  return (
    <button className="size-12 sm:(size-24 rounded-full)" onClick={onClick}>
      {children}
    </button>
  );
}
