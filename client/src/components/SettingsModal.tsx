import { getStats } from "../lib/storage";
import { Modal } from "./Modal";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { daysPlayed, currentStreak, bestStreak } = getStats();

  return (
    <Modal title="Settings" onClose={onClose}>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div>
          <div class="font-bold text-2xl">{daysPlayed}</div>
          <div class="text-sm text-gray-500">Days Played</div>
        </div>
        <div>
          <div class="font-bold text-2xl">{currentStreak}</div>
          <div class="text-sm text-gray-500">Current Streak</div>
        </div>
        <div>
          <div class="font-bold text-2xl">{bestStreak}</div>
          <div class="text-sm text-gray-500">Best Streak</div>
        </div>
      </div>
    </Modal>
  );
}
