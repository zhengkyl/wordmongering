import { Link } from "wouter-preact";

export function TutorialPage() {
  return (
    <div class="max-w-screen-sm m-auto p-4 flex flex-col gap-6">
      <div class="flex items-center gap-4 pt-2">
        <Link href="/" class="underline text-sm text-gray-500">
          ← Back
        </Link>
        <h1 class="font-bold text-2xl">How to Play</h1>
      </div>

      <section class="flex flex-col gap-2">
        <h2 class="font-semibold text-lg">Goal</h2>
        <p class="text-sm">Clear all the letter tiles using as few words as possible.</p>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="font-semibold text-lg">Rules</h2>
        <ol class="flex flex-col gap-2 list-decimal list-inside text-sm">
          <li>Tiles are arranged in a snake. The first tile is highlighted.</li>
          <li>Type a word that contains the first tile's letter.</li>
          <li>Any consecutive matching tiles from the front of the snake are removed.</li>
          <li>Repeat until all tiles are cleared.</li>
          <li>Your score is the number of words used — lower is better.</li>
        </ol>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="font-semibold text-lg">Tips</h2>
        <ul class="flex flex-col gap-1 list-disc list-inside text-sm">
          <li>Green tiles will be removed by your current word.</li>
          <li>Orange/dimmed tiles match your word but aren't at the front yet.</li>
          <li>Longer words that cover more of the snake in order are better.</li>
        </ul>
      </section>

      <Link
        href="/daily/1"
        class="px-4 py-2 font-bold text-center bg-blue-500 text-white"
      >
        Play Today
      </Link>
    </div>
  );
}
