import { Link } from "wouter-preact";

export function HomePage() {
  return (
    <div class="max-w-screen-sm m-auto p-8 flex flex-col items-center gap-8 min-h-screen justify-center">
      <h1 class="font-bold text-4xl tracking-wide">WORDMONGERING</h1>
      <div class="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/daily/today"
          class="px-6 py-3 font-bold text-center bg-blue-500 text-white text-lg"
        >
          Play Daily
        </Link>
        <Link href="/daily/tutorial" class="text-center underline text-sm text-gray-500">
          How to Play
        </Link>
        <Link href="/archive" class="text-center underline text-sm text-gray-500">
          Archive
        </Link>
      </div>
    </div>
  );
}
