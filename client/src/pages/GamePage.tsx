import { flushSync } from "preact/compat";
import { useMemo, useState } from "preact/hooks";
import { useParams } from "wouter-preact";
import { DayDisplay } from "../components/DayDisplay";
import { Game } from "../components/Game";
import { PageLayout } from "../components/PageLayout";
import { Results } from "../components/Results";
import { useWords } from "../components/WordsContext";
import { getDayNumber, LOCAL_WM_EPOCH, MS_PER_DAY } from "../lib/daily";
import { generateDailyPuzzle } from "../lib/generatePuzzle";
import { getPlayerHint } from "../lib/playerHint";
import { getDayResults, updateDayResults, updateStreak, type GameResult } from "../lib/storage";

export function DailyGamePage() {
  const params = useParams<{ day: string }>();
  const day = params.day === "today" ? getDayNumber() : Number(params.day);

  const maxDays = Math.ceil((Date.now() - LOCAL_WM_EPOCH) / MS_PER_DAY);

  return (
    <PageLayout>
      {day > maxDays ? <div>Nothing here yet.</div> : <GameLoader day={day} />}
    </PageLayout>
  );
}

type Streaks = { daysPlayed: number; currentStreak: number; bestStreak: number };
type SessionResult = { gameResult: GameResult; streaks: Streaks | null };

function GameLoader({ day }: { day: number }) {
  const { words } = useWords();

  const existingResult = getDayResults(day);
  const [results, setResults] = useState<SessionResult | null>(
    existingResult ? { gameResult: existingResult, streaks: null } : null,
  );

  const puzzle = useMemo(() => generateDailyPuzzle(day), [day]);

  if (words == null) return <div class="mx-auto">Loading...</div>;

  return (
    <>
      <DayDisplay
        day={day}
        class={
          results
            ? "mx-auto w-fit text-center"
            : "mx-auto w-fit absolute left-0 right-0 text-center bottom-60vh overflow-hidden"
        }
        animation={!results ? "fade-out 0.8s ease-out 1s forwards" : undefined}
      />
      {results && (
        <Results
          day={day}
          puzzle={puzzle}
          gameResult={results.gameResult}
          streaks={results.streaks}
          onPlayAgain={() => {
            if (!document.startViewTransition) {
              setResults(null);
              return;
            }
            document.startViewTransition(() => flushSync(() => setResults(null)));
          }}
        />
      )}
      {!results && (
        <Game
          puzzle={puzzle}
          words={words}
          onComplete={(words) => {
            fetch(`/api/solves/${day}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(1000),
              body: JSON.stringify({
                playerHint: getPlayerHint(),
                words,
              }),
            });

            const gameResult = updateDayResults(day, words);
            const streaks = updateStreak(day);

            // TODO solve properly
            setTimeout(() => {
              setResults({ gameResult, streaks });
            }, 300);
          }}
        />
      )}
    </>
  );
}
