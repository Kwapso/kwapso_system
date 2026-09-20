#!/usr/bin/env node
/* ============================================================================
   THE CARD-CONTENT INSET CHECK — pins `CardContent`'s `inset` prop against
   every way it could drift back out, run by `npm run check` beside the
   token/icon/book/seam checks.

   THE PROBLEM THIS PROP CLOSES. `CardContent` carried one fixed vertical
   rhythm, `py-6 lg:py-[var(--space-7)]` (24 to `lg:`, 32 above), with no
   escape hatch. A caller that wanted a compact card body had exactly one
   move: a `className` override fighting that default on specificity, a
   shape nowhere declared and nowhere checkable. `inset="compact"` makes the
   dense body a first-class, named shape instead — flat at `--space-3` on
   every breakpoint, the same step `CARD_CONTENT_INSET_X` already spends on
   the horizontal axis (17 Sep 2026 evening ruling), so a compact card's
   body is that one step on every side, not a horizontal exception paired
   with a vertical override.

   WHY A SOURCE CHECK, MATCHING THIS KIT'S OTHER `check-*.mjs` FILES — there
   is no jsdom/testing-library in this repository (`npm run check` is `tsc
   --noEmit` plus a run of source-reading scripts like this one), so the
   shape below is verified by reading `card.tsx`'s own source rather than by
   mounting the component.

   FOUR THINGS PINNED, so none of them can drift back silently:
     1 · `CardContentProps` declares `inset?: "default" | "compact"`.
     2 · `CardContent` destructures `inset = "default"` — the untouched
         two-step ladder stays the default, so every existing call site
         renders exactly as it did before this prop existed.
     3 · A `CARD_CONTENT_INSET_Y` lookup (or equivalent per-value mapping)
         resolves `"compact"` to `--space-3`, flat, with no `lg:` step —
         the same token the horizontal inset already reads, not a new
         figure invented for this prop alone.
     4 · The horizontal inset (`CARD_CONTENT_INSET_X`, `--space-3`) is still
         applied regardless of `inset` — this prop is a vertical-only
         escape hatch, not a second horizontal system living beside the
         first.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "card.tsx");

const src = fs.readFileSync(FILE, "utf8");

const findings = [];

/* ── 1 · `CardContentProps` DECLARES THE PROP ────────────────────────── */
const propsStart = src.indexOf("export interface CardContentProps");
const contentStart = src.indexOf("const CardContent = React.forwardRef");
const contentEnd = src.indexOf("CardContent.displayName");

if (propsStart === -1 || contentStart === -1 || contentEnd === -1) {
  console.error(`FAIL card check: could not find \`CardContentProps\`/\`CardContent\` in ${FILE}.`);
  process.exit(1);
}

const propsBody = src.slice(propsStart, contentStart);
const contentBody = src.slice(contentStart, contentEnd);

if (!/inset\?:\s*"default"\s*\|\s*"compact"/.test(propsBody)) {
  findings.push(
    '`CardContentProps` no longer declares `inset?: "default" | "compact"` — a compact card body ' +
      "has no declared shape to ask for again.",
  );
}

/* ── 2 · THE DEFAULT STAYS "default" ─────────────────────────────────── */
if (!/inset\s*=\s*"default"/.test(contentBody)) {
  findings.push(
    '`CardContent` no longer defaults `inset` to `"default"` — every existing call site that never ' +
      "passed `inset` would silently render a different vertical rhythm than before this prop existed.",
  );
}

/* ── 3 · "compact" RESOLVES TO `--space-3`, FLAT, AND "default" STAYS THE
   OLD LADDER ─────────────────────────────────────────────────────────── */
if (!/CARD_CONTENT_INSET_Y_DEFAULT\s*=\s*"py-6 lg:py-\[var\(--space-7\)\]"/.test(src)) {
  findings.push(
    '`inset="default"` no longer resolves to `py-6 lg:py-[var(--space-7)]` — this is the same figure ' +
      "`check-screen-shell.mjs`'s own Ruling 2 check pins on the `screen-shell.tsx` side, and the two " +
      "must stay equal.",
  );
}

if (!/CARD_CONTENT_INSET_Y_COMPACT\s*=\s*"py-\[var\(--space-3\)\]"/.test(src)) {
  findings.push(
    '`inset="compact"` no longer resolves to a flat `py-[var(--space-3)]` — either the figure ' +
      "changed or a breakpoint prefix crept back in, and a compact card body is no longer the " +
      "single step it was declared to be.",
  );
}

if (!/CARD_CONTENT_INSET_Y\s*:\s*Record<"default"\s*\|\s*"compact",\s*string>/.test(src)) {
  findings.push(
    "`CardContent` no longer resolves `inset` through a `Record<\"default\" | \"compact\", string>` " +
      "lookup keyed on the prop's own two values — re-derived per call site, this can silently " +
      "drift out of sync with `CardContentProps`'s own union.",
  );
}

if (!/CARD_CONTENT_INSET_Y\[inset\]/.test(contentBody)) {
  findings.push(
    "`CardContent`'s className no longer reads `CARD_CONTENT_INSET_Y[inset]` — the `inset` prop is " +
      "declared but nothing in the render actually switches on it.",
  );
}

/* ── 4 · THE HORIZONTAL INSET IS UNCONDITIONAL ───────────────────────── */
if (!/CARD_CONTENT_INSET_X/.test(contentBody)) {
  findings.push(
    "`CardContent` no longer applies `CARD_CONTENT_INSET_X` unconditionally — `inset` must stay a " +
      "vertical-only switch, not grow a second horizontal system beside the 17 Sep 2026 evening " +
      "ruling's own flat `--space-3`.",
  );
}

if (findings.length > 0) {
  console.error("FAIL card check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  '`CardContent`\'s `inset` prop still declares "default"/"compact", defaults to "default", ' +
    'resolves "compact" to a flat `--space-3` and leaves the horizontal inset unconditional: OK card check.',
);
