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
      class="bg-background rounded-xl p-4 max-w-md shadow-[0_0_16px_rgb(25,0,0/0.1)]"
    >
      <div class="flex justify-between items-center mb-4 gap-4">
        <h2 class="font-bold text-xl">{title}</h2>
        <button
          class="-m-1.5 p-2 @hover:bg-stone-200/80 !active:bg-stone-300/80 rounded-lg"
          onClick={onClose}
        >
          <X class="w-6 h-6" />
        </button>
      </div>
      <div class="flex flex-col gap-4">{children}</div>
    </dialog>
  );
}
