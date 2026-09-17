#!/usr/bin/env node
/* ============================================================================
   THE KANBAN CARD-EVENT CHECK — run by `npm run check` beside the token/icon/
   book/seam/unsaved-changes-bar/toolbar-row/file-upload checks.

   WHAT THIS PINS, ADDED 2026-09-17. The app needs Chrome's own click
   gestures on a board card — cmd/ctrl-click and middle-click both "open
   beside" a record, the same gesture a browser already gives every plain
   `<a href>` for free. `BoardCard` could not offer it: `onCardSelect?.(card,
   column)` never carried a `MouseEvent`, so no caller could read
   `metaKey`/`ctrlKey`/`button` off anything. `card.tsx`'s root is a plain
   `<div>` (checked — not a `<button>`), so nothing about the element itself
   was ever the obstacle; the callback's own signature was.

   THE FIX, BACKWARD COMPATIBLE. `column` stays the SECOND argument — it
   already was, before this change, and moving it would break every existing
   caller — so the event lands as a THIRD, additive argument instead. Every
   caller reading only `(card, column)` keeps compiling; a caller that wants
   the gesture reads `(card, column, event)`.

   FOUR THINGS THIS CHECK PINS, each catching a different way the feature
   could quietly regress:
     1. `KanbanCardSelectEvent` IS DECLARED, and covers both real sources of
        this callback — a mouse event (click/auxclick) and a keyboard one
        (Enter/Space) — so a caller reading `event.key` on a click-triggered
        call is a type error, not a runtime surprise.
     2. `onCardSelect`'S OWN SIGNATURE carries the third argument at all
        three places it is declared (the board's own props, the column's,
        the card's) — a signature added in one and not the other two would
        compile in this file (structural typing hides it) and break the
        first caller that imports the "wrong" one.
     3. `onClick` AND THE KEYBOARD Enter/Space BRANCH both forward their own
        `event` as the third argument — not a bare `onCardSelect?.(card,
        column)` that quietly drops it back to two.
     4. `onAuxClick` (a middle-button press, which never fires `onClick` at
        all — Chrome's own contract) FORWARDS THE SAME CALLBACK, and the
        middle button's own `mousedown` is `preventDefault`ed so Chrome's
        autoscroll cannot eat the gesture before `auxclick` fires. Both are
        gated on `pressable`, matching `onClick`'s own gate — a card nothing
        can select answers no mouse button either.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "kanban.tsx");

const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);

const findings = [];

// (1) THE EVENT TYPE — declared once, covers both real trigger shapes.
if (
  !/export type KanbanCardSelectEvent =\s*\|\s*React\.MouseEvent<HTMLDivElement>\s*\|\s*React\.KeyboardEvent<HTMLDivElement>;/.test(
    src,
  )
) {
  findings.push(
    `${rel} does not declare KanbanCardSelectEvent as MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement> — ` +
      "onCardSelect's third argument has no working type to forward.",
  );
}

// (2) THE SIGNATURE, AT ALL THREE DECLARATION SITES. A bare count, not a
// single match, so one file drifting out of sync with the other two (a
// signature updated on the board's own props but not the card's, say) fails
// here instead of compiling silently via structural typing.
const SIGNATURE = /onCardSelect\?:\s*\(card: KanbanCard, column: KanbanColumn, event: KanbanCardSelectEvent\) => void;/g;
const signatureCount = (src.match(SIGNATURE) ?? []).length;
if (signatureCount !== 3) {
  findings.push(
    `${rel} declares onCardSelect's (card, column, event: KanbanCardSelectEvent) signature ${signatureCount} ` +
      "time(s), not the 3 expected (KanbanProps, the column's props, BoardCard's own props) — a caller importing " +
      "the type from a mismatched one of the three would not see the event argument.",
  );
}

// (3) onClick AND THE KEYBOARD BRANCH FORWARD THEIR OWN `event` — not a bare
// two-argument call that silently drops the third argument this check exists
// to guarantee.
const BOARD_CARD_BLOCK_START = src.indexOf("function BoardCard(");
const boardCardSrc = BOARD_CARD_BLOCK_START === -1 ? "" : src.slice(BOARD_CARD_BLOCK_START);

if (!/if \(pressable && \(event\.key === "Enter" \|\| event\.key === " "\)\) \{\s*event\.preventDefault\(\);\s*onCardSelect\?\.\(card, column, event\);/.test(
  boardCardSrc,
)) {
  findings.push(
    `${rel}'s BoardCard does not forward its own KeyboardEvent on Enter/Space — onCardSelect?.(card, column, ` +
      "event) must read the same event onKeyDown received, not a bare (card, column) call.",
  );
}

if (!/onClick=\{\s*pressable\s*\?\s*\(event\) => \{\s*onCardSelect\?\.\(card, column, event\);/.test(boardCardSrc)) {
  findings.push(
    `${rel}'s BoardCard does not forward its own MouseEvent through onClick — onCardSelect?.(card, column, ` +
      "event) must read the click's own event, not a bare (card, column) call.",
  );
}

// (4) onAuxClick FORWARDS THE SAME CALLBACK, AND THE MIDDLE mousedown IS
// PREVENTED — the two working pieces a middle-click gesture needs. Neither
// is satisfied by a comment alone; both are call-site syntax on <Card>.
if (!/onAuxClick=\{\s*pressable\s*\?\s*\(event\) => \{\s*onCardSelect\?\.\(card, column, event\);/.test(boardCardSrc)) {
  findings.push(
    `${rel}'s BoardCard does not wire an onAuxClick that forwards onCardSelect?.(card, column, event) — a ` +
      "middle-click never fires onClick at all (Chrome's own contract), so without this the app cannot read it.",
  );
}

if (!/onMouseDown=\{\s*pressable\s*\?\s*\(event\) => \{\s*if \(event\.button === 1\) event\.preventDefault\(\);/.test(
  boardCardSrc,
)) {
  findings.push(
    `${rel}'s BoardCard does not preventDefault a middle-button mousedown — without it Chrome's own autoscroll ` +
      "starts before onAuxClick fires and eats the gesture the app needs.",
  );
}

if (findings.length > 0) {
  console.error("FAIL kanban card-event check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK kanban card-event check: KanbanCardSelectEvent is declared, onCardSelect's (card, column, event) signature " +
    "is consistent across all three declaration sites, onClick/onKeyDown both forward their own event, and " +
    "onAuxClick + the middle-mousedown preventDefault both forward the same callback.",
);
