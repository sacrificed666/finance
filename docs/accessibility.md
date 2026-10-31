# ♿ Accessibility

The goal is **WCAG 2.2 AA**: every page works with a keyboard, reads well with a screen reader, keeps its contrast on every tile in both themes and fits a phone held at 400 % zoom.

## 🧭 Structure

| Element      | Implementation                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 🏠 Landmarks | The top bar is a `header` with the pages `nav`, the phone's top bar a `header` and its tab bar a `nav`, then `main` and the `footer` |
| ⏭️ Skip link | **Skip to content** appears on the first <kbd>Tab</kbd> and moves focus to `main`                                                    |
| 🏷️ Headings  | One `h1` per page from `PageHeader`, an `h2` for the hero and for every card                                                         |
| 🗂️ Sections  | The hero and every card are a `section` with that heading                                                                            |
| 🌍 Language  | `<html lang>` follows the language of the account; the native name of every language in the picker carries its own `lang`            |
| 📋 Lists     | Entries, accounts, budgets and achievements are real `ul` lists, and tables are real `table` elements with headers                   |

## ⌨️ Keyboard

Every control is a native element or follows an ARIA pattern exactly:

| Control                     | Element                                                                                    | Keys                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⌨️ Command palette          | A native modal `<dialog>` with an ARIA 1.2 combobox, a listbox and `aria-activedescendant` | <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> to open, arrows to move, <kbd>Enter</kbd> to go, <kbd>Esc</kbd> to close                                                                           |
| 🪟 Sheets and confirmations | Native modal `<dialog>` labelled by its title; focus moves in and comes back on close      | <kbd>Tab</kbd> stays inside, <kbd>Esc</kbd> closes; a press on the dim only outside forms                                                                                                    |
| 🎚️ Segmented controls       | Radio inputs in a `fieldset` with a `legend`                                               | <kbd>Tab</kbd> to the group, arrows to choose                                                                                                                                                |
| 🔽 Pickers                  | A button with `aria-haspopup="listbox"` that opens a searchable listbox                    | <kbd>Enter</kbd> to open, arrows to move, <kbd>Enter</kbd> to pick, <kbd>Esc</kbd> to close                                                                                                  |
| 🔀 Switches                 | `role="switch"` with `aria-checked`                                                        | <kbd>Space</kbd>                                                                                                                                                                             |
| 🧾 Ledger rows              | Buttons that open the entry; in select mode, checkboxes                                    | <kbd>Tab</kbd>, <kbd>Enter</kbd> or <kbd>Space</kbd>                                                                                                                                         |
| 🧭 Navigation               | Links with `aria-current="page"` on the current one                                        | <kbd>Tab</kbd>, <kbd>Enter</kbd>                                                                                                                                                             |
| ⚡ Shortcuts                | Single keys while no field has the cursor and no dialog is open (`useShortcuts`)           | <kbd>N</kbd> an expense, <kbd>I</kbd> an income, <kbd>/</kbd> search, <kbd>1</kbd> to <kbd>8</kbd> the pages; **Settings → General → Keyboard shortcuts** turns them off, as WCAG 2.1.4 asks |

Focus is always visible: a 2 px ring in the accent colour with an offset, from the `focus-ring` mixin, on `:focus-visible` only.

## 🗣️ Screen readers

- 🔢 Every chart is decorative to assistive technology and carries its figures in a visually hidden table with a caption (`ChartTable`): months, categories and amounts, in the same order as the picture.
- 💬 Toasts, with their **Undo**, are announced politely from an `output` that stays on the page; only its text changes, because a live region that appears together with its message is often never read.
- 🔄 The sync dot says **Saving…** or **Not saved** in words next to its dot.
- 🚨 A failed sign-in and a failed import are an `alert`, read at once; a problem in a sheet is announced politely above its buttons, and a field's own problem is written next to it.
- 🏳️ Flags in the language picker are decorative: the language is written out next to them.
- 🔐 The password field has its own name, **Password**, and the button that shows it says what it does.
- 🖼️ Bank, coin and game logos and the coloured page marks are decorative, because the name stands next to them.

## 🎨 Colour and contrast

- 📏 Text reaches **4.5:1** and large figures and graphical marks **3:1** against the opaque tiles in both themes; only the chrome the page scrolls under is translucent, see [Design](./design.md#-tiles).
- 💸 Colour never carries meaning alone: amounts carry a sign, badges carry text, progress bars carry numbers, and every chart series is labelled directly.
- 🌈 The chart palette was chosen with a colour-blindness validator, so neighbouring series stay apart under protanopia and deuteranopia.

## 🌊 Motion and preferences

| Preference                        | Response                                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🐢 `prefers-reduced-motion`       | Entrance animations, chart sweeps and the saving pulse stand still; transitions are switched off, so a change lands at once                                      |
| 🌫️ `prefers-reduced-transparency` | The top and phone bars become solid without blur, and the dot grid of the backdrop goes away                                                                     |
| 🌗 `prefers-color-scheme`         | The **System** theme follows it live                                                                                                                             |
| 🖥️ `forced-colors: active`        | The 1 px edge of every tile is drawn in the system colour, the hero figure turns plain text and the chosen option of a segmented control gets a `Highlight` ring |

> [!TIP]
> Chrome DevTools can emulate all of these: open **Rendering** and choose `prefers-reduced-motion`, `prefers-reduced-transparency` or `forced-colors`, or a vision deficiency such as deuteranopia.

## 📱 Zoom and small screens

The layout reflows down to **320 px**, the width of a 1280 px window zoomed to 400 %, without horizontal page scrolling (WCAG 1.4.10):

- 🧱 Every grid and flex column that holds a card can shrink (`min-width: 0`), and the side column stacks under the main one below 80 rem.
- 🔤 Long names wrap to two lines instead of being cut off, and the labels of the tab bar may use the full width of their tab.
- 📊 Wide tables scroll inside their card, and only sideways.

> [!WARNING]
> `visually-hidden` elements are `position: absolute`. Inside a scroll container that is not positioned itself, they are laid out relative to an ancestor outside the scroller, escape its clipping and widen the whole page. Give every scroll container `position: relative`, and put a hidden table in a hidden wrapper rather than hiding the table itself.

## ✅ How it is checked

- 🤖 **axe-core** runs in the end-to-end tests on every page, on the sign-in and sign-up pages, in the dark theme, on the dashboard in both appearances, and with the entry sheet and the command palette open, on desktop and phone screens, with no violations. Two rules that axe leaves off by default are switched on: `label-content-name-mismatch` and `target-size`, which asks for 24 × 24 px targets or enough room around smaller ones (WCAG 2.2, 2.5.8).
- ⌨️ A keyboard test checks that the first <kbd>Tab</kbd> reaches the skip link and that it moves focus to `main`.
- 🖥️ A forced colours test checks that the chosen option stays apart from the others with system colours.
- 📱 Every page is checked for sideways scrolling at 320 px, and the longest languages for words cut off at 360 px.
- 🚦 **Lighthouse** must score 1 for accessibility on every page of the budget, and every accessibility audit must pass, including the ones without weight.
- 🧪 Component tests find elements by role and accessible name, so a missing label fails a test.

See [Testing](./testing.md#-end-to-end-tests) for how to run them.
