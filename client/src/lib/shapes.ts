const SERP_WIDTH = 100; // full horizontal extent
const SERP_RADIUS = 50; // bend radius
const SERP_SPACING = 100; // arc-length between points

export function serpentine(index: number) {
  const s = index * SERP_SPACING;
  const halfLen = SERP_WIDTH + Math.PI * SERP_RADIUS;
  const half = Math.floor(s / halfLen);
  const t = s - half * halfLen;
  const y0 = -half * 2 * SERP_RADIUS;

  if (t <= SERP_WIDTH) {
    return {
      x: half % 2 === 0 ? t - SERP_WIDTH / 2 : SERP_WIDTH / 2 - t,
      y: y0,
    };
  }

  const a = (t - SERP_WIDTH) / SERP_RADIUS;
  return {
    x:
      half % 2 === 0
        ? SERP_WIDTH / 2 + SERP_RADIUS * Math.sin(a)
        : -SERP_WIDTH / 2 - SERP_RADIUS * Math.sin(a),
    y: y0 - SERP_RADIUS + SERP_RADIUS * Math.cos(a),
  };
}
