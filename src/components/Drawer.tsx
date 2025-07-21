import { Drawer } from "vaul";
import { X } from "./icons/X";

export default function LeftDrawer() {
  return (
    <Drawer.Root modal={false} direction="left">
      <Drawer.Trigger>Show Jokers</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Content className="bg-gray-100 absolute top-12 bottom-0 left-0 outline-none p-4">
          <Drawer.Trigger>
            <X className="size-5" />
          </Drawer.Trigger>
          <div className="">Content</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
