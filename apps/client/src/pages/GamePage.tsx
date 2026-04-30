import { useState } from "preact/hooks";
import { useParams } from "wouter-preact";
import { Game } from "../components/Game";
import { PageLayout } from "../components/PageLayout";
import { ResultsPage } from "../components/Results";
import { getDayNumber, LOCAL_WM_EPOCH, MS_PER_DAY } from "../lib/daily";
import { getPlayerHint } from "../lib/playerHint";
import { PUZZLES } from "../lib/puzzles";
import { getDayResults, updateDayResults, updateStreak, type GameResult } from "../lib/storage";

export function DailyGamePage() {
  const params = useParams<{ day: string }>();
  const day = params.day === "today" ? getDayNumber() : Number(params.day);

  const maxDays = Math.ceil((Date.now() - LOCAL_WM_EPOCH) / MS_PER_DAY);
  const puzzleWord = PUZZLES[day];
  if (day > maxDays || !puzzleWord) {
    return <div>Nothing here yet.</div>;
  }

  return (
    <PageLayout>
      <GameOrResults day={day} />
    </PageLayout>
  );
}

function GameOrResults({ day }: { day: number }) {
  const [results, setResults] = useState<GameResult | null>(getDayResults(day));

  if (results) {
    return <ResultsPage day={day} gameResult={results} onPlayAgain={() => setResults(null)} />;
  }

  return (
    <Game
      day={day}
      onComplete={(words) => {
        const { plays } = updateDayResults(day, words);
        if (plays === 1) {
          fetch(`/api/dailies/${day}/results`, {
            method: "POST",
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
