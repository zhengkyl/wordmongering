import { Link } from "wouter-preact";
import { PageLayout } from "../components/PageLayout";
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
      <div class="max-w-screen-sm m-auto p-4 flex flex-col gap-8">
        <div class="flex items-center gap-4 pt-2">
          <Link href="/" class="underline text-sm text-gray-500">
            ← Back
          </Link>
          <h1 class="font-bold text-2xl">Archive</h1>
        </div>
        {months.length === 0 ? (
          <p class="text-sm text-gray-500">No puzzles yet.</p>
        ) : (
          months.map((mg) => <MonthCalendar key={`${mg.year}-${mg.month}`} {...mg} />)
        )}
      </div>
    </PageLayout>
  );
}

function MonthCalendar({ year, month, firstDayOfWeek, daysInMonth, puzzleDays }: MonthGroup) {
  return (
    <div>
      <h2 class="font-semibold text-lg mb-3">
        {MONTH_NAMES[month]} {year}
      </h2>
      <div class="grid grid-cols-7 gap-1 text-center">
        {DAY_HEADERS.map((h) => (
          <div class="text-xs font-bold text-gray-400 pb-1">{h}</div>
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
                class="aspect-square flex items-center justify-center text-xs text-gray-200"
              >
                {dayOfMonth}
              </div>
            );
          }
          if (info.completed) {
            return (
              <Link
                key={dayOfMonth}
                href={`/daily/${info.puzzleDay}`}
                class="aspect-square flex flex-col items-center justify-center rounded bg-green-100 text-green-700"
              >
                <span class="font-bold text-base leading-none">#{info.puzzleDay}</span>
                <span class="text-xs mt-0.5 opacity-60">{dayOfMonth}</span>
              </Link>
            );
          }
          return (
            <Link
              key={dayOfMonth}
              href={`/daily/${info.puzzleDay}`}
              class="aspect-square flex flex-col items-center justify-center rounded"
            >
              <span class="font-bold text-base leading-none">#{info.puzzleDay}</span>
              <span class="text-xs mt-0.5 text-gray-400">{dayOfMonth}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
