import { Modal } from "./Modal";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <p class="text-sm text-gray-500">No settings yet.</p>
    </Modal>
  );
}
