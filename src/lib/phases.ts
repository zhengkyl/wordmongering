// Adding a new phase: add variant here, add grouped timing const below,
// add startXxxPhase handler in App, add render branches in FieldGrid/HandGrid/ResultBanner
export type ActivePhase =
  | { type: "idle" }
  | {
      type: "scoring";
      tileIds: string[];
      tileAnimDelays: string[];
      step: { tileIndex: number; powerUpIndex: number; pts: number } | null;
      runningTotal: number;
    }
  | { type: "discarding"; tileIds: string[] }
  | { type: "drawing" };

export const IDLE: ActivePhase = { type: "idle" };

export const SCORING = {
  PEAK_OFFSET: 200,
  TILE_ANIM: 500,
  TILE_OVERLAP: 100,
  POST_ANIM: 200,
  POWERUP_DISPLAY: 500,
} as const;
export const DISCARD = { FALL_ANIM: 400 } as const;

/** Returns animation props to spread onto a tile element. Empty object = no animation. */
export function getTileAnim(
  phase: ActivePhase,
  tileId: string,
  slotIndex: number,
): { anim?: string; animDelay?: string } {
  if (phase.type === "scoring") {
    const wordIndex = phase.tileIds.indexOf(tileId);
    if (wordIndex !== -1) return { anim: "bounce", animDelay: phase.tileAnimDelays[wordIndex] };
  }
  if (phase.type === "discarding" && phase.tileIds.includes(tileId)) {
    return { anim: "fall" };
  }
  return {};
}
