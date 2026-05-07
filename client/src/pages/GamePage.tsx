import { useEffect, useState } from "preact/hooks";
import { useParams } from "wouter-preact";
import { Game } from "../components/Game";
import { PageLayout } from "../components/PageLayout";
import { Results } from "../components/Results";
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

type Streaks = { daysPlayed: number; currentStreak: number; bestStreak: number };
type SessionResult = { gameResult: GameResult; streaks: Streaks | null };

function GameOrResults({ day, puzzle }: { day: number; puzzle: string }) {
  const existingResult = getDayResults(day);
  const [results, setResults] = useState<SessionResult | null>(
    existingResult ? { gameResult: existingResult, streaks: null } : null,
  );

  if (results) {
    return (
      <Results
        day={day}
        puzzle={puzzle}
        gameResult={results.gameResult}
        streaks={results.streaks}
        onPlayAgain={() => setResults(null)}
      />
    );
  }

  return (
    <Game
      day={day}
      puzzle={puzzle}
      onComplete={(words) => {
        fetch(`/api/dailies/${day}/results`, {
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

        // hacky, wait until post to show results
        setTimeout(() => {
          setResults({ gameResult, streaks });
        }, 300);
      }}
    />
  );
}
