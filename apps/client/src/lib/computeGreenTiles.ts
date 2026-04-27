import type { EnemyTile } from "./types";

export function computeGreenTiles(
  enemy: EnemyTile[],
  input: string,
): { green: Set<number>; candidate: Set<number> } {
  const counts = new Map<string, number>();
  for (const c of input.toLowerCase()) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  const candidate = new Set<number>();
  for (const { id, letter } of enemy) {
    const count = counts.get(letter) ?? 0;
    if (count > 0) {
      candidate.add(id);
      counts.set(letter, count - 1);
    }
  }

  const green = new Set<number>();
  for (const { id } of enemy) {
    if (!candidate.has(id)) break;
    green.add(id);
  }

  return { green, candidate };
}
