import { useState } from "preact/hooks";
import { Modal } from "./Modal";

export function ReportModal({ word, onClose }: { word: string; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [note, setNote] = useState("");

  if (submitted) {
    return (
      <Modal title="Thanks!" onClose={onClose}>
        <p>Your report has been submitted!</p>
        <p>You can expect a reward or a punishment in 2-3 days ;)</p>
        <button class="sketchy-md px-4 py-2 font-bold w-full" onClick={onClose}>
          Close
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Report Missing Word" onClose={onClose}>
      <div>
        <p class="text-xs text-gray-500 mb-1">Word</p>
        <p class="font-bold uppercase text-2xl">{word}</p>
      </div>
      <textarea
        class="sketchy-lg w-full px-3 py-2 text-sm resize-none bg-orange-100"
        placeholder="Any context? (optional)"
        value={note}
        onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)}
        rows={3}
      />
      <div class="flex gap-2">
        <button class="sketchy-md flex-1 px-4 py-2" onClick={onClose}>
          Cancel
        </button>
        <button
          class="sketchy-md flex-1 px-4 py-2 bg-blue-500 text-white font-bold"
          onClick={() => setSubmitted(true)}
        >
          Submit
        </button>
      </div>
    </Modal>
  );
}
