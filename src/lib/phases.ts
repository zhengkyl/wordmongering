// Adding a new phase: add variant here, add grouped timing const below,
// add startXxxPhase handler in App, add render branches in FieldGrid/HandGrid/ResultBanner
export type ActivePhase =
  | { type: "idle" }
  | { type: "scoring"; tiles: { letter: string; pts: number }[]; tileIds: string[]; runningTotal: number }
  | { type: "discarding"; tileIds: string[] }
  | { type: "drawing"; newTileIds: Set<string> };

export const IDLE: ActivePhase = { type: "idle" };

export const SCORING = { STAGGER: 50, PEAK_OFFSET: 200, TILE_ANIM: 600, POST_ANIM: 200 } as const;
export const DISCARD = { FALL_ANIM: 400 } as const;
export const DRAW = { STAGGER: 30, ANIM: 400 } as const;

/** Returns animation props to spread onto a tile element. Empty object = no animation. */
export function getTileAnim(
  phase: ActivePhase,
  tileId: string,
  slotIndex: number,
): { anim?: string; animDelay?: string } {
  if (phase.type === "scoring") {
    const wordIndex = phase.tileIds.indexOf(tileId);
    if (wordIndex !== -1) return { anim: "bounce", animDelay: `${wordIndex * SCORING.STAGGER}ms` };
  }
  if (phase.type === "discarding" && phase.tileIds.includes(tileId)) {
    return { anim: "fall" };
  }
  if (phase.type === "drawing" && phase.newTileIds.has(tileId)) {
    return { anim: "drop-in", animDelay: `${slotIndex * DRAW.STAGGER}ms` };
  }
  return {};
}
