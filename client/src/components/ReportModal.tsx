import { useState } from "preact/hooks";
import { getPlayerHint } from "../lib/playerHint";
import { Modal } from "./Modal";

export function ReportModal({ word, onClose }: { word: string; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [note, setNote] = useState("");

  if (submitted) {
    return (
      <Modal title="Thanks!" onClose={onClose}>
        <p>Your report has been submitted!</p>
        <button class="btn btn-orange" onClick={onClose}>
          Close
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Report missing word" onClose={onClose}>
      <div>
        <p class="text-xs text-gray-500 mb-1">Word</p>
        <p class="font-bold text-2xl">{word}</p>
      </div>
      <textarea
        class="w-full rounded-lg px-3 py-2 text-sm resize-none bg-orange-100"
        placeholder="Any context? (optional)"
        value={note}
        onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)}
        rows={3}
      />
      <div class="flex justify-end gap-2">
        <button class="btn btn-sec" onClick={onClose}>
          Cancel
        </button>
        <button
          class="btn btn-orange font-bold"
          onClick={() => {
            fetch("/api/reports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ playerHint: getPlayerHint(), word, note }),
            });
            setSubmitted(true);
          }}
        >
          Submit
        </button>
      </div>
    </Modal>
  );
}
