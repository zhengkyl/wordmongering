import { useEffect, useState } from "preact/hooks";
import { useParams } from "wouter-preact";
import { DayDisplay } from "../components/DayDisplay";
import { useDictionary } from "../components/DictionaryContext";
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

  return (
    <PageLayout noVerticalPadding>
      {day > maxDays ? <div>Nothing here yet.</div> : <GameLoader day={day} />}
    </PageLayout>
  );
}

function GameLoader({ day }: { day: number }) {
  const dictionary = useDictionary();
  const [puzzle, setPuzzle] = useState<string | null | "loading">("loading");

  useEffect(() => {
    fetchPuzzle(day).then(setPuzzle);
  }, [day]);

  if (puzzle === null) return <div>Nothing here yet.</div>;

  const ready = puzzle !== "loading" && dictionary;
  return (
    <>
      <DayDisplay
        day={day}
        class="mx-auto w-fit absolute left-0 right-0 text-center bottom-60vh overflow-hidden"
        animation={ready ? "fade-out 0.8s ease-out 1s forwards" : undefined}
      />
      {ready && <GameOrResults day={day} puzzle={puzzle} dictionary={dictionary} />}
    </>
  );
}

type Streaks = { daysPlayed: number; currentStreak: number; bestStreak: number };
type SessionResult = { gameResult: GameResult; streaks: Streaks | null };

function GameOrResults({
  day,
  puzzle,
  dictionary,
}: {
  day: number;
  puzzle: string;
  dictionary: Set<string>;
}) {
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
      puzzle={puzzle}
      dictionary={dictionary}
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
