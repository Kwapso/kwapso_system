#!/usr/bin/env node
/* ============================================================================
   THE BADGE CHECK — pins the client's 18 Sep 2026 report against every way
   it could come back, run by `npm run check` beside the token/icon/book/seam
   checks.

   THE RULING, VERBATIM: "why is chip ticket type grey and not black? all
   text shhould be black. when its a link make it underlined (for exmaple
   the app name)."

   TWO DEFECTS, ONE CHIP. The ticket-type badge is `variant="secondary"` —
   the quiet counter — and that variant's own label read `text-ink-secondary`
   (a muted grey, `#4a4946` on paper) while every COLOURED variant in this
   file already drew a charcoal label on its own fill ("charcoal on every
   accent", this file's own law). Nobody had carried that law over to the one
   UNCOLOURED variant, and a second spot — the Archived status pill's own
   compound variant — repainted its label to `text-ink-tertiary` for the same
   reason. Both are fixed the same way: the FILL (or the dot) carries the
   tone, the LABEL is always `--foreground`. Separately, a badge that IS a
   link (an app-name chip, her own example) had no way to signal that at
   all — no underline, nothing distinguishing it from an inert quiet chip —
   so `asChild`/`href` and an always-on underline (`LINK_UNDERLINE`) were
   added.

   WHY THIS IS A NEW FILE RATHER THAN A BLOCK INSIDE ANOTHER CHECK. Every
   other `check-*.mjs` in this kit pins ONE component's own file; badge.tsx
   had none before this ruling — REGULAR STATUS-COLOUR-LOGIC BUGS ARE EXACTLY
   WHAT PUT THE GREY TEXT INTO PRODUCTION UNNOTICED FOR AS LONG AS IT SHIPPED,
   so a component this central (59 direct call sites, this file's own header)
   goes without a check no longer. Wired into `npm run check` in package.json
   beside `check-avatar.mjs`.

   THIS IS A STATIC CHECK, MATCHING THIS KIT'S OTHER `check-*.mjs` FILES —
   no jsdom/testing-library in this repository, so "no variant still reads a
   muted ink" is verified by reading the source directly rather than by
   mounting the component and reading computed styles.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "badge.tsx");
const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);

const findings = [];

/* ============================================================================
   1 · NO VARIANT'S LABEL READS A MUTED INK — "all text shhould be black."
   Scoped to the `variants: { variant: { … } }` block specifically (not the
   whole file — the doc comments ABOVE that block are free to keep discussing
   the retired grey ink in prose while explaining why it is gone, the same
   "working code shape, not a bare word" standard `check-screen-shell.mjs`
   already holds itself to) — matched as `text-ink-secondary`/`text-ink-tertiary`
   appearing inside a variant's own return string, not merely mentioned in a
   neighbouring comment line.
   ========================================================================= */
const variantsBlockMatch = src.match(/variant:\s*\{([\s\S]*?)\n\s*\},\n\s*\/\* The dot's tone/);
if (!variantsBlockMatch) {
  findings.push(`Could not locate the \`variant: { … }\` block in ${rel} to check — the surrounding markers moved.`);
} else {
  const variantsBlock = variantsBlockMatch[1];
  // Strip block comments before scanning, so a doc comment inside the block
  // (there are several, one per variant) cannot itself trigger the guard —
  // only an actual class string can.
  const codeOnly = variantsBlock.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/text-ink-secondary|text-ink-tertiary/.test(codeOnly)) {
    findings.push(
      `A variant inside badgeVariants' own \`variant: { … }\` block in ${rel} still reads text-ink-secondary or ` +
        "text-ink-tertiary for its LABEL — the 18 Sep ruling requires every variant's text to be --foreground; " +
        "only the fill or the dot may carry tone.",
    );
  }
}

// THE SPECIFIC FIX, PINNED POSITIVELY — not just "no grey" but "secondary
// reads foreground", so a regression that drops the fill's own custom
// property along with the ink fix would still be caught by this line.
if (!/secondary: "bg-\[var\(--badge-quiet-fill,var\(--surface-quiet\)\)\] text-foreground",/.test(src)) {
  findings.push(
    `${rel}'s secondary variant does not read text-foreground for its label — the exact chip the client reported ` +
      '("ticket type grey and not black") is this variant.',
  );
}

/* ============================================================================
   2 · NO COMPOUND VARIANT REPAINTS A LABEL — the retired Archived-pill
   tertiary-ink exception must stay gone. Checked as the absence of the
   specific compound-variant shape (a `class` entry naming a muted ink),
   not the bare word `compoundVariants` — a future, legitimate compound
   variant for some OTHER purpose (dotTone-specific fill, for instance) is
   not what this check exists to forbid.
   ========================================================================= */
if (/dotTone: "archived", class: "text-ink-tertiary"/.test(src)) {
  findings.push(
    `${rel} still carries the retired Archived-pill compound variant (dotTone: "archived", class: ` +
      '"text-ink-tertiary") — 18 Sep 2026 retired it outright: the state lives in the dot, never in a dimmed label.',
  );
}
if (/class:\s*"[^"]*text-ink-(?:secondary|tertiary)[^"]*"/.test(src)) {
  findings.push(
    `${rel} has a compoundVariants entry repainting a label to text-ink-secondary/tertiary — no variant, base or ` +
      "compound, may dim a badge's own label for tone any more.",
  );
}

/* ============================================================================
   3 · THE LINK UNDERLINE — "when its a link make it underlined." Checked as
   four working code shapes: the `Slot` import (asChild needs it), the
   `LINK_UNDERLINE` constant reading an ALWAYS-ON underline (not the hover-
   revealed `.kw-link` idiom `BreadcrumbLink` uses — a discrete chip has no
   surrounding prose to read a hover-only underline against), the `isLink`
   computation reading BOTH `asChild` and `href`, and the render actually
   applying `LINK_UNDERLINE` when `isLink`.
   ========================================================================= */
if (!/^import \{ Slot \} from "@radix-ui\/react-slot";$/m.test(src)) {
  findings.push(`${rel} does not import Slot from @radix-ui/react-slot — asChild has nothing to render through.`);
}
if (!/const LINK_UNDERLINE = "underline underline-offset-\[0\.1875rem\]";/.test(src)) {
  findings.push(
    `${rel} does not define LINK_UNDERLINE as an always-on "underline underline-offset-[0.1875rem]" — a hover-only ` +
      "underline (BreadcrumbLink's own .kw-link idiom) would not read as a link on a chip with no hover to reveal it.",
  );
}
if (!/const isLink = asChild \|\| href !== undefined;/.test(src)) {
  findings.push(
    `${rel} does not compute isLink from BOTH asChild and href — either one alone is the caller's own declaration ` +
      "that a badge points somewhere, per BadgeProps' own doc.",
  );
}
if (!/isLink \? LINK_UNDERLINE : undefined,/.test(src)) {
  findings.push(`${rel} does not apply LINK_UNDERLINE when isLink — a linked badge would render with no underline at all.`);
}
if (!/asChild\?: boolean;/.test(src) || !/href\?: string;/.test(src)) {
  findings.push(`${rel}'s BadgeProps does not declare both asChild?: boolean and href?: string.`);
}

if (findings.length > 0) {
  console.error("FAIL badge check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK badge check: no variant (base or compound) reads a muted ink for its label — secondary reads " +
    "text-foreground and the retired Archived tertiary-label compound variant stays gone — and a linked badge " +
    "(asChild or href) always draws LINK_UNDERLINE.",
);
