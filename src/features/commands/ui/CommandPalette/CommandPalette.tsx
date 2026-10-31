"use client";

import { useEffect, useState } from "react";

import { OPEN_EVENT } from "@/features/commands/model/palette";

import PaletteDialog from "../PaletteDialog/PaletteDialog";

// The command palette: Ctrl+K or Cmd+K toggles it, the button opens it empty
const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // The shortcut and the buttons that open the palette
  useEffect(() => {
    // Opens an empty palette
    const show = () => {
      setQuery("");
      setActive(0);
      setOpen(true);
    };
    // Ctrl+K or Cmd+K opens or closes the palette
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuery("");
        setActive(0);
        setOpen((was) => !was);
      }
    };
    window.addEventListener(OPEN_EVENT, show);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!open) return null;
  return (
    <PaletteDialog
      query={query}
      onQuery={(next) => {
        setQuery(next);
        setActive(0);
      }}
      active={active}
      onActive={setActive}
      onClose={() => setOpen(false)}
    />
  );
};

export default CommandPalette;
