import { getDayFormattedDate } from "../lib/daily";

export function DayDisplay({
  day,
  class: outerClass,
  animation,
}: {
  day: number;
  class?: string;
  animation?: string;
}) {
  const formattedDate = getDayFormattedDate(day);
  return (
    <div class={outerClass} style={{ viewTransitionName: "daily-date", animation }}>
      <div class="font-bold leading-none text-4xl whitespace-pre">{formattedDate}</div>
      <div class="mt-1">Day {day}</div>
    </div>
  );
}
