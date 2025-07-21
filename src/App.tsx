import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useState, type ReactNode } from "react";
import { DeckDialog } from "./components/Dialog";
import LeftDrawer from "./components/Drawer";
import { getStartingDeck, type Deck, type TileMeta } from "./lib/constants";
import { shuffleInPlace } from "./lib/utils";

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

  return (
    <div>
      <div className="h-12 bg-red">hello there</div>
      <DndContext>
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
                  if (slot.tileId == null) return <FieldSlot key={i} />;
                  const [letter, meta] = getTile(slot.tileId);
                  return (
                    <FieldSlot key={i}>
                      <Tile letter={letter} meta={meta} />
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
                      <Tile letter={letter} meta={meta} />
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
      </DndContext>
    </div>
  );
}

function FieldSlot({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded border size-12 sm:size-24 bg-stone-400/40">
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
