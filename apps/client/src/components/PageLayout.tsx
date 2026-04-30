import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { SettingsModal } from "./SettingsModal";

export function PageLayout({ children }: { children: ComponentChildren }) {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <>
      <div class="flex justify-between gap-2 p-2 sticky top-0 z-10">
        <div class="font-bold bg-orange-100 p-2 rounded-xl">WORDMONGERING</div>
        <button
          class="p-2.5 bg-orange-100 rounded-xl"
          onClick={() => setShowSettings((prev) => !prev)}
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" class="w-5 h-5">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M6.6.25h.8a1.5 1.5 0 0 1 1.35.93l.36.91 1.09.63.97-.15a1.5 1.5 0 0 1 1.48.72l.4.67a1.5 1.5 0 0 1-.13 1.65l-.61.76v1.26l.6.76a1.5 1.5 0 0 1 .13 1.65l-.4.67a1.5 1.5 0 0 1-1.48.72l-.96-.15-1.1.63-.35.91a1.5 1.5 0 0 1-1.36.93h-.78a1.5 1.5 0 0 1-1.36-.93l-.36-.9-1.09-.64-.97.15a1.5 1.5 0 0 1-1.48-.72l-.39-.67a1.5 1.5 0 0 1 .12-1.65l.61-.76V6.37l-.6-.76a1.5 1.5 0 0 1-.13-1.65l.39-.67a1.5 1.5 0 0 1 1.48-.72l.97.15 1.1-.64.35-.9A1.5 1.5 0 0 1 6.61.25M9 7c0 1.28-.72 2-2 2s-2-.72-2-2 .72-2 2-2 2 .72 2 2"
            />
          </svg>
        </button>
      </div>
      {children}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
