import { Link } from "wouter-preact";
import { PageLayout } from "../components/PageLayout";
import { cl } from "../lib/cl";
import { LOCAL_WM_EPOCH, MS_PER_DAY, getDayNumber } from "../lib/daily";
import { getCompletedDaySet } from "../lib/storage";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function puzzleDayToDate(day: number): Date {
  return new Date(LOCAL_WM_EPOCH + (day - 1) * MS_PER_DAY);
}

type PuzzleDayInfo = { puzzleDay: number; completed: boolean };

type MonthGroup = {
  year: number;
  month: number;
  firstDayOfWeek: number;
  daysInMonth: number;
  puzzleDays: Map<number, PuzzleDayInfo>;
};

function buildMonthGroups(maxDay: number, completed: Set<number>): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (let d = 1; d <= maxDay; d++) {
    const date = puzzleDayToDate(d);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;
    const entry: PuzzleDayInfo = { puzzleDay: d, completed: completed.has(d) };

    const existing = groups.get(key);
    if (existing) {
      existing.puzzleDays.set(date.getDate(), entry);
    } else {
      groups.set(key, {
        year,
        month,
        firstDayOfWeek: new Date(year, month, 1).getDay(),
        daysInMonth: new Date(year, month + 1, 0).getDate(),
        puzzleDays: new Map([[date.getDate(), entry]]),
      });
    }
  }

  return Array.from(groups.values());
}

export function ArchivePage() {
  const maxDay = getDayNumber();
  const completed = getCompletedDaySet();
  const months = buildMonthGroups(maxDay, completed);

  return (
    <PageLayout>
      <h1 class="font-bold text-2xl text-center">Archive</h1>
      <div class="flex flex-col gap-8">
        {months.map((mg) => (
          <MonthCalendar key={`${mg.year}-${mg.month}`} {...mg} />
        ))}
      </div>
    </PageLayout>
  );
}

function MonthCalendar({ year, month, firstDayOfWeek, daysInMonth, puzzleDays }: MonthGroup) {
  return (
    <div class="p-2 bg-orange-100 rounded-xl text-center">
      <h2 class="font-semibold text-lg">
        {MONTH_NAMES[month]} {year}
      </h2>
      <div class="bg-background grid grid-cols-7 font-bold">
        {DAY_HEADERS.map((h) => (
          <div class="text-xs font-bold text-gray-400 p-1">{h}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`pad-${i}`} class="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayOfMonth = i + 1;
          const info = puzzleDays.get(dayOfMonth);
          if (!info) {
            return (
              <div
                key={dayOfMonth}
                class="h-12 flex items-center justify-center text-gray-200 select-none"
                aria-hidden
              >
                {dayOfMonth}
              </div>
            );
          }

          return (
            <Link
              key={dayOfMonth}
              href={`/puzzles/${info.puzzleDay}`}
              class={cl([
                "h-12 flex items-center justify-center @hover:bg-stone-200",
                info.completed && " bg-green-100 text-green-700",
              ])}
            >
              {dayOfMonth}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
