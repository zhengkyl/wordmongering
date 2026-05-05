import type { ComponentChildren } from "preact";
import { X } from "./icons/X";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}) {
  return (
    <dialog
      ref={(el) => {
        if (el) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      class="bg-transparent min-w-sm"
    >
      <div class="bg-background rounded-xl p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-bold text-lg">{title}</h2>
          <button class="p-1 -mr-1" onClick={onClose}>
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="flex flex-col gap-6">{children}</div>
      </div>
    </dialog>
  );
}
