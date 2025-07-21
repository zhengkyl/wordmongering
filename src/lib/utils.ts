import type { TileMeta } from "./constants";

export function shuffleInPlace(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
}

// This only shallow clones
export function repeat<T extends TileMeta>(element: T, count: number): T[];
export function repeat<T>(element: T, count: number): T[] {
  return Array.from({ length: count }, () => ({ ...element }));
}
