import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Link } from "wouter-preact";
import { soundEnabled, toggleSound } from "../lib/sound";
import { SettingsModal } from "./SettingsModal";

export function PageLayout({ children }: { children: ComponentChildren }) {
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMuted] = useState(!soundEnabled);
  return (
    <>
      <div class="flex justify-between gap-2 p-2 sticky top-0 z-10">
        <Link class="font-bold bg-orange-100 p-2 rounded-xl" href="/">
          WORDMONGERING
        </Link>
        <div class="flex gap-2">
          <button
            class="p-2.5 bg-orange-100 rounded-xl"
            onClick={() => {
              toggleSound();
              setMuted(!soundEnabled);
            }}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5">
                <path
                  fill="currentColor"
                  d="M3.63 3.63a1 1 0 0 0 0 1.41L7.29 8.7 7 9H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18a7 7 0 0 1-1.64.89 1 1 0 1 0 .72 1.86 9 9 0 0 0 2.32-1.28l1.38 1.38a1 1 0 0 0 1.41-1.41L5.05 3.63a1 1 0 0 0-1.42 0M19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53A9 9 0 0 0 21 12c0-4.28-3-7.86-7-8.77a1 1 0 1 0-.43 1.95A7 7 0 0 1 19 12m-7-7c0-.89-1.08-1.34-1.71-.71L8.41 6.17zM17 12a5 5 0 0 1-2.2 4.16l1.46 1.46A6.97 6.97 0 0 0 19 12a7 7 0 0 0-5.02-6.71 1 1 0 1 0-.56 1.92A5 5 0 0 1 17 12"
                />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5">
                <path
                  fill="currentColor"
                  d="M3 10v4a1 1 0 0 0 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.34-1.71-.71L7 9H4a1 1 0 0 0-1 1m13.5 2A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77"
                />
              </svg>
            )}
          </button>
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
      </div>
      {children}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
