import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Root,
} from "@radix-ui/react-dialog";

export function DeckDialog({ deck }) {
  return (
    <Root>
      <DialogTrigger className="rounded-full border size-12 sm:size-24 flex justify-center items-center">
        Deck
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Your deck</DialogTitle>
          <div className="flex flex-wrap gap-2">
            {deck.map((tile) => (
              <div>{tile.letter}</div>
            ))}
          </div>
        </DialogContent>
      </DialogPortal>
    </Root>
  );
}
