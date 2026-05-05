import { useEffect, useState } from "preact/hooks";
import { useParams } from "wouter-preact";
import { Game } from "../components/Game";
import { PageLayout } from "../components/PageLayout";
import { ResultsPage } from "../components/Results";
import { getDayNumber, LOCAL_WM_EPOCH, MS_PER_DAY } from "../lib/daily";
import { getPlayerHint } from "../lib/playerHint";
import { fetchPuzzle } from "../lib/puzzles";
import { getDayResults, updateDayResults, updateStreak, type GameResult } from "../lib/storage";

export function DailyGamePage() {
  const params = useParams<{ day: string }>();
  const day = params.day === "today" ? getDayNumber() : Number(params.day);

  const maxDays = Math.ceil((Date.now() - LOCAL_WM_EPOCH) / MS_PER_DAY);
  if (day > maxDays) {
    return <div>Nothing here yet.</div>;
  }

  return (
    <PageLayout>
      <GameLoader day={day} />
    </PageLayout>
  );
}

function GameLoader({ day }: { day: number }) {
  const [puzzle, setPuzzle] = useState<string | null | "loading">("loading");

  useEffect(() => {
    fetchPuzzle(day).then(setPuzzle);
  }, [day]);

  if (puzzle === "loading") return null;
  if (puzzle === null) return <div>Nothing here yet.</div>;
  return <GameOrResults day={day} puzzle={puzzle} />;
}

function GameOrResults({ day, puzzle }: { day: number; puzzle: string }) {
  const [results, setResults] = useState<GameResult | null>(getDayResults(day));

  if (results) {
    return (
      <ResultsPage
        day={day}
        puzzle={puzzle}
        gameResult={results}
        onPlayAgain={() => setResults(null)}
      />
    );
  }

  return (
    <Game
      puzzle={puzzle}
      onComplete={(words) => {
        const { plays } = updateDayResults(day, words);
        if (plays === 1) {
          fetch(`/api/dailies/${day}/results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(1000),
            body: JSON.stringify({
              playerHint: getPlayerHint(),
              words,
            }),
          });
        }
        // TODO Game errors if not switched immediately after onComplete
        // fetch isn't called in time for data to show in result charts
        setResults({ words, plays });

        const finishDay = getDayNumber();
        const now = new Date();

        if (finishDay === day) {
          updateStreak(day, [now.getHours(), now.getMinutes()]);
        } else if (finishDay === day + 1 && now.getHours() < 3) {
          updateStreak(day, [24 + now.getHours(), now.getMinutes()]);
        }
      }}
    />
  );
}
