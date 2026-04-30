export const LOCAL_WM_EPOCH = new Date(2026, 3, 27).getTime();
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDayNumber(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - LOCAL_WM_EPOCH) / MS_PER_DAY);
}
