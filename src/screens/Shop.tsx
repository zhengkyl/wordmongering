import { useState } from "preact/hooks";
import { POWER_UPS, type PowerUpId } from "../lib/powerups";

export function Shop({
  pennies,
  onNextRound,
}: {
  pennies: number;
  onNextRound: (acquired: PowerUpId | null, penniesSpent: number) => void;
}) {
  const [options] = useState<PowerUpId[]>(() => {
    const keys = Object.keys(POWER_UPS) as PowerUpId[];
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = keys[i];
      keys[i] = keys[j];
      keys[j] = tmp;
    }
    return keys.slice(0, 3);
  });

  return (
    <div class="h-full flex flex-col items-center justify-center gap-8 p-8">
      <div class="text-center">
        <h1 class="text-5xl font-bold">Shop</h1>
        <p class="text-amber-600 font-bold text-2xl mt-2">{pennies}¢</p>
      </div>

      <div class="flex gap-4">
        {options.map((id) => {
          const pu = POWER_UPS[id];
          const canAfford = pennies >= pu.cost;
          return (
            <div
              key={id}
              class="flex flex-col gap-3 p-5 rounded-2xl border-2 border-stone-200 bg-white w-48"
            >
              <div>
                <div class="font-bold text-lg">{pu.name}</div>
                <div class="text-stone-500 text-sm mt-1">{pu.description}</div>
              </div>
              <div class="mt-auto">
                <button
                  class="w-full py-2 rounded-lg font-semibold transition-colors disabled:(opacity-40 cursor-not-allowed) bg-amber-400 text-amber-900 hover:bg-amber-300"
                  disabled={!canAfford}
                  onClick={() => onNextRound(id, pu.cost)}
                >
                  {pu.cost}¢
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        class="px-10 py-4 border-2 border-stone-300 text-stone-600 text-xl font-semibold rounded-full hover:bg-stone-50 transition-colors"
        onClick={() => onNextRound(null, 0)}
      >
        Skip →
      </button>
    </div>
  );
}
