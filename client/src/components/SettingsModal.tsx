import { getStats } from "../lib/storage";
import { Modal } from "./Modal";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { daysPlayed, currentStreak, bestStreak } = getStats();

  return (
    <Modal title="Settings & Stuff" onClose={onClose}>
      <div>
        <div class="font-semibold p-2">Daily Puzzle Stats</div>
        <div class="bg-orange-200 p-2 rounded-lg grid grid-cols-3 gap-2 text-center">
          <div>
            <div class="font-bold text-2xl">{daysPlayed}</div>
            <div class="text-sm">Days Played</div>
          </div>
          <div>
            <div class="font-bold text-2xl">{currentStreak}</div>
            <div class="text-sm">Current Streak</div>
          </div>
          <div>
            <div class="font-bold text-2xl">{bestStreak}</div>
            <div class="text-sm">Best Streak</div>
          </div>
        </div>
      </div>
      <div class="self-end">
        <a href="https://github.com/zhengkyl/wordmongering" class="underline" target="_blank">
          View source code
        </a>
      </div>
    </Modal>
  );
}
