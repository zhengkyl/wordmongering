import { DrawerPreview as Drawer } from "@base-ui/react/drawer";
import type { Deck } from "../lib/constants";
import { getTile } from "../lib/gameState";

export function DeckDialog({ deck, deckMeta }: { deck: string[]; deckMeta: Deck }) {
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
      <Drawer.Trigger className="size-12 sm:size-24 rounded-lg border-2 border-stone-300 bg-white text-stone-600 hover:bg-stone-50 font-semibold text-xs sm:text-base transition-colors flex justify-center items-center">
        Deck
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="deck-drawer-backdrop fixed inset-0 bg-black" />
        <Drawer.Viewport className="fixed inset-0 flex items-end pointer-events-none">
          <Drawer.Popup className="deck-drawer-popup bg-white flex flex-col w-full h-[50vh] rounded-t-2xl outline-none pointer-events-auto -mb-12">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1.5 rounded-full bg-stone-300" />
            </div>
            <Drawer.Title className="text-center font-semibold text-stone-800 pb-2">
              Deck ({deck.length} remaining)
            </Drawer.Title>
            <Drawer.Content className="overflow-y-auto px-4 pb-6 flex-1">
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {sorted.map(({ letter, variant, count }) => (
                  <div
                    key={`${letter}_${variant}`}
                    className="relative size-10 rounded-md border-2 border-stone-300 bg-stone-50 flex items-center justify-center font-semibold text-stone-700"
                  >
                    {letter}
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-stone-400 text-white text-[10px] leading-4 text-center font-bold">
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
