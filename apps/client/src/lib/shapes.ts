export const TILE_PX = 48;
export const SNAKE_COLS = 4;
export const H_STEP = 52;
export const V_STEP = 68;
export const WAVE = 8;
export const POP_DURATION = 350;
export const STEP_MS = 150;

export type ShapeStep = { dx: number; dy: number };
export type ShapeFunc = (index: number, total: number) => ShapeStep;

export const snakeShape: ShapeFunc = (index, _total) => {
  if (index === 0) return { dx: 0, dy: 0 };
  const colInRow = index % SNAKE_COLS;
  const row = Math.floor(index / SNAKE_COLS);
  const dir = row % 2 === 0 ? 1 : -1;
  if (colInRow === 0) return { dx: 0, dy: V_STEP - 2 * WAVE };
  const wave = colInRow === 1 || colInRow === SNAKE_COLS - 1 ? WAVE : 0;
  return { dx: dir * H_STEP, dy: wave };
};

export const activeShape: ShapeFunc = snakeShape;
