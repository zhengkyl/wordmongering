import { Link } from "wouter-preact";
import { DayDisplay, ScoreDisplay } from "../components/DayDisplay";
import { PageLayout } from "../components/PageLayout";
import { getDayNumber } from "../lib/daily";
import { getDayResults } from "../lib/storage";

export function HomePage() {
  const dayNumber = getDayNumber();
  const todayResult = getDayResults(dayNumber);

  return (
    <PageLayout noHeaderLogo>
      <div
        class="[font-size:clamp(1rem,10vw,5rem)] font-bold text-center"
        style={
          {
            viewTransitionName: "wordmongering-logo",
          }
        }
      >
        WORDMONGERING
      </div>
      <DayDisplay day={dayNumber} class="mx-auto w-fit text-center" />
      {todayResult && <ScoreDisplay result={todayResult} />}
      <div class="grid grid-cols-2 gap-2">
        <Link
          href="/puzzles/today"
          class={`btn-lg col-span-2 ${todayResult ? "btn-sec" : "btn-orange spx-12"}`}
        >
          {todayResult ? "View daily puzzle" : "Play daily puzzle"}
        </Link>
        <Link href="/archive" class="btn btn-sec">
          Past puzzles
        </Link>
        <Link href="/endless" class="btn btn-sec">
          Endless mode
        </Link>
      </div>
    </PageLayout>
  );
}
