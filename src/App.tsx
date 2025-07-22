import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type ClientRect,
  type CollisionDescriptor,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type ReactNode } from "react";
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
// idea, no hand droppable, if over nothing go to hand
// does this work with animations? how does draggable animate to original location?
export function App() {
  const [fieldSlots, setFieldSlots] = useState<FieldSlotProps[]>(
    Array.from({ length: 10 }, () => ({ tileId: null }))
  );
  const [handSlots, setHandSlots] = useState<HandSlotProps[]>(
    Array.from({ length: 18 }, () => ({ tileId: null }))
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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const activeProps = activeId ? getTile(activeId) : null;

  return (
    <div>
      <div className="h-12 bg-red">hello there</div>
      <DndContext
        sensors={sensors}
        collisionDetection={directionalRectIntersection}
        onDragStart={(e) => {
          setActiveId(e.active.id as string);
        }}
        onDragCancel={() => {
          setActiveId(null);
        }}
        onDragOver={(e) => {
          const collision = e.collisions![0];
          if (collision == null) {
            console.log("return to hand");
            return;
          }
          console.log(e);
          // console.log(collision.data);
        }}
        onDragEnd={(e) => {
          if (e.over) {
            const overSlotId = e.over.id as string;
            const [part, iStr] = overSlotId.split("_");
            const i = parseInt(iStr);
            if (part === "field") {
              setFieldSlots((prev) => {
                const next = [...prev];
                next[i] = { tileId: activeId };
                return next;
              });
              setHandSlots((prev) =>
                prev.map((slot) =>
                  slot.tileId === activeId ? { tileId: null } : slot
                )
              );
            }
          }
          //
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr]">
          <LeftDrawer></LeftDrawer>
          <div className="m-auto">
            <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
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
            <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
              <div className="md:col-start-3 col-span-6 grid grid-cols-6 gap-2">
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
                    setActivePile(newActive);

                    setFieldSlots(
                      Array.from({ length: fieldSlots.length }, () => ({
                        tileId: null,
                      }))
                    );
                    setHandSlots(
                      Array.from({ length: handSlots.length }, (_, i) => ({
                        tileId: newActive[i],
                      }))
                    );
                  }}
                >
                  Shuffle
                </Move>
                <Move>Redraw</Move>
                <DeckDialog deck={drawPile} />
                <Move>Play</Move>
              </div>
            </div>
          </div>
        </div>
        <DragOverlay>
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
    // transition,
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
