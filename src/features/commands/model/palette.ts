import type { Currency } from "@/shared/lib/money";
import type { PageTone } from "@/shared/lib/navigation";
import type { IconName } from "@/shared/ui/Icon/icons";

// The event that opens the palette from a button anywhere in the app
export const OPEN_EVENT = "finance:command-palette";

// Opens the command palette, as Ctrl+K or Cmd+K does
export const openCommandPalette = () => {
  window.dispatchEvent(new Event(OPEN_EVENT));
};

export type CommandGroup = "actions" | "pages" | "accounts" | "investments" | "entries";

// The groups in the order the palette lists them
export const COMMAND_GROUPS: readonly CommandGroup[] = ["actions", "pages", "accounts", "investments", "entries"];

// Left of a command: an icon on a grey disc, a page's own disc or an emoji
export type CommandMark = { icon: IconName; tone?: PageTone } | { emoji: string; colorSlot?: number };

// What sits on the right: a note that the page is open, or an amount
export type CommandTrailing =
  | { here: true }
  | { amount: number; currency: Currency; sign?: boolean; tone: "income" | "expense" | "muted"; strong?: boolean };

export interface Command {
  id: string;
  group: CommandGroup;
  label: string;
  hint?: string;
  keywords?: string;
  mark: CommandMark;
  trailing?: CommandTrailing;
  run: () => void;
}
