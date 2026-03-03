import { DrawerPreview as Drawer } from "@base-ui/react/drawer";
import { getTile } from "../lib/gameState";
import { useGame } from "./GameContext";

const BUTTON_CLASS =
  "rounded-lg border-2 font-semibold transition-colors disabled:(opacity-50 cursor-not-allowed)";
const SECONDARY = "border-stone-300 bg-white text-stone-600 @hover:bg-stone-50";

export function DeckDialog() {
  const { deck, drawPile } = useGame();
  const groups = new Map<string, { letter: string; variant: string; count: number }>();
  for (const tileId of drawPile) {
    const [letter, meta] = getTile(deck, tileId);
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
              Deck ({sorted.reduce((acc, { count }) => acc + count, 0)} remaining)
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
