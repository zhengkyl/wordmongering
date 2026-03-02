import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Root,
} from "@radix-ui/react-dialog";

export function DeckDialog({ deck }: { deck: string[] }) {
  return (
    <Root>
      <DialogTrigger className="size-12 sm:size-24 rounded-lg border-2 border-stone-300 bg-white text-stone-600 hover:bg-stone-50 font-semibold text-xs sm:text-base transition-colors flex justify-center items-center">
        Deck
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Your deck</DialogTitle>
          <div className="flex flex-wrap gap-2">
            {deck.map((tileId) => (
              <div key={tileId}>{tileId.slice(0, tileId.lastIndexOf("_"))}</div>
            ))}
          </div>
        </DialogContent>
      </DialogPortal>
    </Root>
  );
}
