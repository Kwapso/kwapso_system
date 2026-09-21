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

/* ============================================================================
   THE LANE CHECK, ADDED 2026-09-21 - THE CLIENT'S "board A".

   WHAT IT PINS, AND WHY EACH LINE IS A DIFFERENT WAY THE BOARD REGRESSES.
   The board she rejected was not wrong in one place; it was a head with
   nothing under it, a card with nothing behind it, and four empty-state
   sentences sitting exactly where a first card belongs. Option A answers all
   three with one shape, so all three have to be held.

     5. THE LANE'S THREE FIGURES, together, on the column's own class list:
        `bg-surface-panel` (soft paper, the other tone from the page),
        `rounded-[var(--radius)]` (the one box radius, ruling 03) and
        `p-[var(--space-2h)]` (10, the same step the board already spends
        BETWEEN two lanes). Any one of them alone is not a lane: a fill with
        no radius is a band, a radius with no inset is a hairline's job.
     6. `columnGround` DEFAULTS TO `"lane"`. The prop existing is not the
        ruling; the DEFAULT is, because "go an implement this appwide" is
        about what a board draws when nobody passes anything. `"bare"` must
        still be reachable - a board on a soft paper panel measures 1.000
        with a lane and needs the old drawing.
     7. THE HEAD DROPS ITS OWN HORIZONTAL INSET INSIDE A LANE. The 6px was
        standing in for a band that is now back; paying both seats the dot
        16px in while every card under it starts at 10, which is the
        "floating label" fault re-created one level down.
     8. THE EMPTY COLUMN IS TOP ALIGNED. `EmptyRegister` must declare a
        `place` and the column must pass `"lane"`: the 48px top inset put
        the sentence at exactly the height a reader expects the first card.
        And the register must KEEP a `min-h-` floor, because it is also the
        drop target for the first card into an empty column and a one-line
        strip is not something a pointer can find.
     9. THE COLUMN WIDTH AND THE SCROLL ARE UNTOUCHED. Option A's own
        caption is explicit that the board still scrolls; a lane is a fill
        and an inset and does not get to change what a board measures.
   ========================================================================= */

const COLUMN_BLOCK_START = src.indexOf("function Column(");
const columnSrc = COLUMN_BLOCK_START === -1 ? "" : src.slice(COLUMN_BLOCK_START, src.indexOf("function BoardCard("));

// (5) THE LANE'S THREE FIGURES, on one line, applied through the `lane` flag.
if (
  !/lane &&\s*"rounded-\[var\(--radius\)\] bg-surface-panel p-\[var\(--space-2h\)\]"/.test(columnSrc)
) {
  findings.push(
    `${rel}'s Column does not paint the lane as \`lane && "rounded-[var(--radius)] bg-surface-panel ` +
      'p-[var(--space-2h)]"` - option A is soft paper at the one box radius with the 10 inset, and all ' +
      "three figures together are what make a head read as the top of a column instead of a stray label.",
  );
}

// (5b) AND IT DECLARES ITSELF A SOFT-PAPER GROUND, or every relational token
// under it (a face's --surface-lift, a chosen card's --surface-selected, a
// column action's --btn-secondary-fill) keeps answering for the page while
// standing on a panel's colour.
if (!/data-ground=\{lane \? "panel" : undefined\}/.test(columnSrc)) {
  findings.push(
    `${rel}'s Column does not carry \`data-ground={lane ? "panel" : undefined}\` - tokens.css §8 keys ` +
      "its relational rebinds off a class name or that attribute, so a lane that paints soft paper " +
      "without declaring it hands every token underneath the page's answer inside a panel's colour.",
  );
}

// (6) THE DEFAULT IS THE RULING.
if (!/columnGround = "lane",/.test(src)) {
  findings.push(
    `${rel} does not default \`columnGround\` to "lane" - the client's 21 Sep 2026 board ruling is about ` +
      "what a board draws when nobody passes anything, not about a prop existing.",
  );
}
if (!/columnGround\?:\s*"lane" \| "bare";/.test(src)) {
  findings.push(
    `${rel} does not declare \`columnGround?: "lane" | "bare"\` - the bare column is the right drawing ` +
      "for a board still standing on a soft paper panel, where a lane measures 1.000, and removing the " +
      "escape hatch would strand that caller.",
  );
}

// (7) THE HEAD ALIGNS WITH THE CARDS INSIDE A LANE.
if (!/lane \? "px-0" : "px-\[var\(--space-1h\)\]"/.test(columnSrc)) {
  findings.push(
    `${rel}'s column header does not read \`lane ? "px-0" : "px-[var(--space-1h)]"\` - the 6px inset was ` +
      "standing in for the column band that is now back, and paying both seats the dot 16px from the " +
      "lane's edge while every card under it starts at 10.",
  );
}

// (8) THE EMPTY COLUMN IS A LINE AT THE TOP, AND IT IS STILL A DROP TARGET.
if (!/place\?:\s*"block" \| "lane";/.test(src)) {
  findings.push(
    `${rel}'s EmptyRegister does not declare \`place?: "block" | "lane"\` - the whole-board register and ` +
      "the one inside a column are two different objects and stopped sharing an inset on 21 Sep 2026.",
  );
}
if (!/<EmptyRegister place="lane">/.test(columnSrc)) {
  findings.push(
    `${rel}'s Column does not render \`<EmptyRegister place="lane">\` - the 48px top inset put the ` +
      "sentence at exactly the height a reader expects the first card, four or five times over.",
  );
}
const emptyRegisterSrc = src.slice(
  src.indexOf("function EmptyRegister("),
  src.indexOf("THE ERROR REGISTER IS THE SHARED ONE"),
);
if (!/min-h-\[calc\(var\(--space-8\)\*2\)\]/.test(emptyRegisterSrc)) {
  findings.push(
    `${rel}'s EmptyRegister lost its \`min-h-[calc(var(--space-8)*2)]\` floor on the lane-aligned branch - ` +
      "the register is also the drop target for the first card into an empty column, and a one-line " +
      "strip is not something a pointer can reliably find.",
  );
}

// (9) THE MEASURE AND THE SCROLL DID NOT MOVE.
if (!/columnWidth = "18rem",/.test(src)) {
  findings.push(
    `${rel} no longer defaults \`columnWidth\` to "18rem" - option A keeps the board's own measure; a ` +
      "lane is a fill and an inset and does not get to change what a board measures.",
  );
}
if (!/snap-x snap-mandatory gap-\[var\(--space-2h\)\] overflow-x-auto overflow-y-hidden/.test(src)) {
  findings.push(
    `${rel}'s board row no longer scrolls on the inline axis at the --space-2h gap - 27.24's beyond-four-` +
      "columns rule and option A's own caption both keep the board scrolling horizontally.",
  );
}

if (findings.length > 0) {
  console.error("FAIL kanban check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK kanban check: KanbanCardSelectEvent is declared, onCardSelect's (card, column, event) signature " +
    "is consistent across all three declaration sites, onClick/onKeyDown both forward their own event, " +
    "onAuxClick + the middle-mousedown preventDefault both forward the same callback; and the column is " +
    "a soft paper lane at the one box radius with the 10 inset, declaring its own ground, defaulting to " +
    '"lane" with "bare" still reachable, its head aligned with its cards, its empty register a top-aligned ' +
    "line that is still a findable drop target, and the board's measure and inline scroll untouched.",
);
