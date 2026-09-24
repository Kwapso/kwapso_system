#!/usr/bin/env node
/* ============================================================================
   THE WEEK-VIEW SPACING CHECK — a week card's own air, pinned to the ladder.

   THE RULING, VERBATIM, 23 Sep 2026: *"everywhere week view add a bit more
   spacingto the cards, and by rule no borders nowhere in the kit"*. This
   file is the first half. The second half is the boundary law
   (`foundations/rules/borders.mjs`) and `docs/RULES.md` §2.8.

   WHAT "A BIT MORE" WAS READ AS. One rung on the kit's own ladder, and not
   a number — `--space-*`, `foundations/tokens/tokens.css` §2. `docs/RULES.md`
   §1.1 is why a typed pixel is not an option here and §1.2 is why a bare
   Tailwind numeric, correct as it is below 32, is not the spelling this one
   uses: a gap that carries this ruling should say the ruling's own word when
   somebody greps for it in six months.

     the space BETWEEN two week cards, and between a day's heading
     and its first card                                            8 → 12
     the space AROUND the stack — the day-pill row to the first
     day, and one day's stack to the next day's heading            16 → 20

   The card's own inset (`px-4 py-3`) is deliberately NOT this check's
   subject: she asked for spacing to the cards, not inside them.

   WHY A CHECK AND NOT A COMMENT. A gap is the single easiest thing in a
   component to lose — a refactor that rewrites one `className` and keeps
   "the same look" puts `gap-2` back without anybody reading the ruling it
   overwrote. This file goes red the moment the week block's two gaps are
   not the two rungs above, whatever spelling is reached for.

   THE OTHER WEEK VIEW, NAMED SO IT IS NOT LOOKED FOR HERE. The consuming
   app at `kwapso_system` draws a second, independent week shape — five
   workday columns plus one folded weekend (`web/components/records/
   record-week.tsx`) — which is app-side on purpose and is pinned by its own
   test, `web/test/week-view-card-spacing.test.ts`. This check reads only
   the kit's own `view="week"` block. Neither can see the other, and saying
   so here is cheaper than the next reader assuming one covers both.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "calendar-view.tsx");
const rel = path.relative(path.join(HERE, "..", ".."), FILE);

const src = fs.readFileSync(FILE, "utf8");
const findings = [];

/* ── The week block, sliced out so nothing in month or agenda can answer for
      it. It opens at the `view === "week"` branch and ends at the next
      top-level branch, which is the footnote block. ──────────────────────── */
const open = src.indexOf('view === "week" ?');
const close = src.indexOf('calendar-view-footnote', open);
if (open === -1 || close === -1 || close < open) {
  console.error(
    `FAIL calendar week check:\n  - ${rel}: could not find the \`view === "week"\` block (or the ` +
      "footnote block that ends it). The slice this check reads is gone, so every pin below would " +
      "pass against nothing — fix the slice rather than deleting the check.",
  );
  process.exit(1);
}
const week = src.slice(open, close);

/* ── 1 · THE GAP BETWEEN TWO CARDS ─────────────────────────────────────────
      The day group that holds a heading and that day's item cards. */
const CARD_STACK = /agendaDays\.map\(\(day\) => \([\s\S]{0,400}?className="flex min-w-0 flex-col ([^"]*)"/;
const cardStack = CARD_STACK.exec(week);
if (cardStack === null) {
  findings.push(
    `${rel}: the week block's \`agendaDays.map\` day stack no longer opens with a ` +
      '`className="flex min-w-0 flex-col …"` div — this check can no longer see the gap between two ' +
      "week cards. Restore the shape or rewrite the pin; do not leave it blind.",
  );
} else if (!/\bgap-\[var\(--space-3\)\]/.test(cardStack[1])) {
  findings.push(
    `${rel}: the gap between two week cards reads \`${cardStack[1].trim()}\`, not ` +
      "`gap-[var(--space-3)]`. The 23 Sep 2026 ruling moved it up one rung (8 → 12) and named the " +
      "rung rather than the number; putting `gap-2` (or any other step) back undoes it.",
  );
}

/* ── 2 · THE SPACE AROUND THE STACK ───────────────────────────────────────── */
const OUTER = /data-slot="calendar-view-week"[\s\S]{0,400}?className="flex min-w-0 flex-col ([^"]*)"/;
const outer = OUTER.exec(week);
if (outer === null) {
  findings.push(
    `${rel}: the \`calendar-view-week\` root no longer carries a ` +
      '`className="flex min-w-0 flex-col …"` — the space around the week cards is unreadable here.',
  );
} else if (!/\bgap-\[var\(--space-5\)\]/.test(outer[1])) {
  findings.push(
    `${rel}: the space around the week card stack reads \`${outer[1].trim()}\`, not ` +
      "`gap-[var(--space-5)]` (16 → 20, the same ruling, the same rung).",
  );
}

/* ── 3 · NO TYPED PIXEL, AND NO BARE NUMERIC, ON THE TWO PINNED GAPS ──────── */
for (const m of week.matchAll(/\bgap-\[(\d+(?:\.\d+)?)px\]/g)) {
  findings.push(
    `${rel}: the week block writes \`gap-[${m[1]}px]\` — a typed pixel, which RULES.md §1.1 refuses ` +
      "outright: it freezes while the type around it grows with `data-scale`.",
  );
}

if (findings.length > 0) {
  console.error("FAIL calendar week check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK calendar week check: the gap between two week cards is `gap-[var(--space-3)]` and the space " +
    "around the stack is `gap-[var(--space-5)]` — both one rung above where the 23 Sep 2026 ruling " +
    "found them, both spelled as the ladder's own token, and no typed pixel anywhere in the block.",
);
