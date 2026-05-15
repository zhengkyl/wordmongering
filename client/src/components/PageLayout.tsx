import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Link, useRoute } from "wouter-preact";
import { cl } from "../lib/cl";
import { soundEnabled, toggleSound } from "../lib/sound";
import { SettingsModal } from "./SettingsModal";

export function PageLayout({
  children,
  noHeaderLogo,
  noVerticalPadding,
}: {
  children: ComponentChildren;
  noHeaderLogo?: true;
  noVerticalPadding?: true;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMuted] = useState(!soundEnabled);
  const [isHome] = useRoute("/");
  return (
    <>
      <div class="flex justify-between gap-2 p-2 sticky top-0 z-10">
        <Link
          class="text-xl font-bold bg-orange-100 p-1.5 rounded-xl"
          href="/"
          style={
            noHeaderLogo
              ? {
                  visibility: "hidden",
                }
              : {
                  viewTransitionName: "wordmongering-logo",
                }
          }
        >
          WORDMONGERING
        </Link>
        <div class="flex gap-2">
          <button
            class="btn-icon"
            onClick={() => {
              toggleSound();
              setMuted(!soundEnabled);
            }}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6">
                <path
                  fill="currentColor"
                  d="m16.8 19.6-.6.3-.6.3H15q-.4-.1-.6-.6v-.7l.6-.6h.2l.2-.2-3.3-3.3v2.8q0 .6-.6 1t-1.1-.3L7 15H4q-.4 0-.7-.3T3 14v-4q0-.4.3-.7T4 9h2.2L2.1 4.9q-.3-.3-.3-.7t.3-.7.7-.3.7.3l17 17q.3.3.3.7t-.3.7-.7.3-.7-.3zM19 12q0-2.1-1.1-3.8t-3-2.6l-.5-.5q-.2-.3 0-.8.1-.4.5-.5t.8 0q2.4 1 3.9 3.3T21 12l-.1 1.6q-.1.8-.5 1.6-.2.5-.6.7t-.7 0-.6-.5 0-.7l.4-1.3q.2-.6.1-1.4m-4.2-3.6q.8.5 1.3 1.6t.4 2v.5q0 .3-.4.4t-.5-.1l-1.3-1.3-.2-.3-.1-.4v-2q0-.3.3-.4t.5 0M9.8 7q-.2-.1-.2-.3t.2-.3l.5-.6q.5-.5 1-.2t.7 1V8q0 .4-.3.5t-.5-.2z"
                />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6">
                <path
                  fill="currentColor"
                  d="M19 11.975q0-2.075-1.1-3.787t-2.95-2.563q-.375-.175-.55-.537t-.05-.738q.15-.4.538-.575t.787 0Q18.1 4.85 19.55 7.063T21 11.974t-1.45 4.913t-3.875 3.287q-.4.175-.788 0t-.537-.575q-.125-.375.05-.737t.55-.538q1.85-.85 2.95-2.562t1.1-3.788M7 15H4q-.425 0-.712-.288T3 14v-4q0-.425.288-.712T4 9h3l3.3-3.3q.475-.475 1.088-.213t.612.938v11.15q0 .675-.612.938T10.3 18.3zm9.5-3q0 1.05-.475 1.988t-1.25 1.537q-.25.15-.513.013T14 15.1V8.85q0-.3.263-.437t.512.012q.775.625 1.25 1.575t.475 2"
                />
              </svg>
            )}
          </button>
          <button class="btn-icon" onClick={() => setShowSettings((prev) => !prev)} title="Menu">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6">
              <path
                fill="currentColor"
                d="M4 18q-.425 0-.712-.288T3 17t.288-.712T4 16h16q.425 0 .713.288T21 17t-.288.713T20 18zm0-5q-.425 0-.712-.288T3 12t.288-.712T4 11h16q.425 0 .713.288T21 12t-.288.713T20 13zm0-5q-.425 0-.712-.288T3 7t.288-.712T4 6h16q.425 0 .713.288T21 7t-.288.713T20 8z"
              />
            </svg>
          </button>
        </div>
      </div>
      <div
        class={cl([
          "max-w-screen-sm w-full mx-auto px-4 flex-1 flex flex-col gap-8",
          noVerticalPadding ? "" : "py-16",
        ])}
      >
        {children}
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
