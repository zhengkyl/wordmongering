export const LOCAL_WM_EPOCH = new Date(import.meta.env.VITE_WM_EPOCH).getTime();
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDayNumber(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - LOCAL_WM_EPOCH) / MS_PER_DAY) + 1;
}

export function getDayFormattedDate(day: number): string {
  return new Date(LOCAL_WM_EPOCH + (day - 1) * MS_PER_DAY).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
