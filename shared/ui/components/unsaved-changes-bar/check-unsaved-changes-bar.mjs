#!/usr/bin/env node
/* ============================================================================
   THE UNSAVED-CHANGES BAR CHECK — pins the two things the client's 16 Sep
   2026 ruling asked for and this file's own `unsavedChangesBarVariants`
   promises: the kit's own orange/warning token for the fill, and the kit
   radius on all four corners of the container, run by `npm run check`
   beside the token/icon/book/seam checks.

   THE RULING, VERBATIM: "use the orange color in the kit and make sure the
   container is round on all corners, because currently two corners are not
   round." The corner bug was `ground="bare"` — the variant both real call
   sites (Settings › Appearance, Settings › Team › Roles) actually render —
   rounding only the TOP edge (`rounded-t-[var(--radius)]`), leaving the
   bottom two square. Fixed to `rounded-[var(--radius)]`, all four, matching
   `page`/`panel`. The colour was already the kit's own `--warning` token
   (which resolves to `--kw-orange`, `foundations/tokens/tokens.css`), not a
   literal hex — this check pins that it stays that way.

   A future edit that reaches for a one-sided `rounded-t-`/`rounded-b-`/
   `rounded-s-`/`rounded-e-` utility on any `ground` variant, or that drops
   in a literal hex/rgb/hsl in place of a token, fails this the same way a
   dropped `start-0` fails the seam check next door — in `npm run check`,
   not in the next client screenshot.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "unsaved-changes-bar.tsx");

const src = fs.readFileSync(FILE, "utf8");

const findings = [];

/* ── 1 · THE CVA `ground` VARIANTS BLOCK ─────────────────────────────────
   Pulled out by its own anchors so a change elsewhere in the file (the
   header prose, the a11y notes) can never shift what this check reads. */
const variantsStart = src.indexOf("ground: {");
const variantsEnd = src.indexOf("},", variantsStart);

if (variantsStart === -1 || variantsEnd === -1) {
  console.error(`FAIL unsaved-changes-bar check: could not find the \`ground\` variants block in ${FILE}.`);
  process.exit(1);
}

const variantsBlock = src.slice(variantsStart, variantsEnd);

for (const ground of ["bare", "page", "panel"]) {
  const re = new RegExp(`${ground}:\\s*"([^"]*)"`);
  const m = variantsBlock.match(re);
  if (!m) {
    findings.push(`no \`${ground}:\` entry found in the \`ground\` variants.`);
    continue;
  }
  const value = m[1];
  if (!/\brounded-\[var\(--radius\)\]/.test(value)) {
    findings.push(
      `\`ground="${ground}"\` is ${JSON.stringify(value)} — missing the kit radius ` +
        "(`rounded-[var(--radius)]`) on all four corners.",
    );
  }
  if (/\brounded-(?:t|b|s|e|l|r|tl|tr|bl|br|ss|se|ee|es)-/.test(value)) {
    findings.push(
      `\`ground="${ground}"\` is ${JSON.stringify(value)} — carries a one-sided rounding utility, ` +
        'so at least one corner is square. The client\'s ruling was "round on all corners".',
    );
  }

  /* ── 1b · STICKINESS, 17 SEP 2026 — "floating and visible at all times,
     directly under the tabs, even if I'm very down in the scroll." Only
     `bare` (the shape both real call sites render, under a tab strip) may
     carry it; `page`/`panel` must stay exactly as static as they always
     were, or a caller that never intended a pinned bar gets one anyway. */
  const stickyPattern = /\bsticky\b/;
  const topPattern = /\btop-\[calc\(var\(--pinned-chrome-h,0px\)_\+_var\(--tab-strip-h,0px\)\)\]/;
  if (ground === "bare") {
    if (!stickyPattern.test(value)) {
      findings.push(
        `\`ground="bare"\` is ${JSON.stringify(value)} — missing \`sticky\`. The client's ruling was ` +
          '"floating and visible at all times, directly under the tabs, even if I\'m very down in the scroll."',
      );
    }
    if (!topPattern.test(value)) {
      findings.push(
        `\`ground="bare"\` is ${JSON.stringify(value)} — missing the two-offset sticky \`top\` ` +
          "(\`calc(var(--pinned-chrome-h, 0px) + var(--tab-strip-h, 0px))\`), so it cannot sit directly under the tabs.",
      );
    }
    if (!/\bz-20\b/.test(value)) {
      findings.push(`\`ground="bare"\` is ${JSON.stringify(value)} — missing a z-index to stay above the content it covers.`);
    }
  } else if (stickyPattern.test(value)) {
    findings.push(
      `\`ground="${ground}"\` is ${JSON.stringify(value)} — carries \`sticky\`, but only \`bare\` (the tab-strip ` +
        "shape) is meant to float; the client's ruling never touched `page`/`panel`.",
    );
  }
}

/* ── 2 · THE ORANGE/WARNING TOKEN, NEVER A LITERAL COLOUR ────────────────
   Scoped to quoted strings within the CVA definition block itself, never
   stripping comments. The wash (`bg-warning/10`) and the dot (`bg-warning`)
   must both still reach the kit's own `--warning` token rather than a
   literal hex/rgb/hsl. No comment-stripper regex (the consuming app forbids
   re-typed regexes); comments are outside the CVA call, so they don't interfere. */

// Find the CVA definition: "const unsavedChangesBarVariants = cva("
const cvaStart = src.indexOf("const unsavedChangesBarVariants = cva(");
if (cvaStart === -1) {
  console.error(`FAIL unsaved-changes-bar check: could not find the CVA definition in ${FILE}.`);
  process.exit(1);
}

// Find the matching closing paren of the cva() call
let parenDepth = 0;
let cvaEnd = -1;
let foundOpenParen = false;
for (let i = cvaStart + "const unsavedChangesBarVariants = cva(".length - 1; i < src.length; i++) {
  if (src[i] === "(") {
    parenDepth++;
    foundOpenParen = true;
  } else if (src[i] === ")") {
    parenDepth--;
    if (foundOpenParen && parenDepth === 0) {
      cvaEnd = i + 1;
      break;
    }
  }
}

if (cvaEnd === -1) {
  console.error(`FAIL unsaved-changes-bar check: could not find the closing paren of the CVA call.`);
  process.exit(1);
}

const cvaBlock = src.slice(cvaStart, cvaEnd);

// Extract quoted strings from the CVA block only
const quotedStrings = cvaBlock.match(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g) ?? [];
const hexLiteral = /#[0-9a-fA-F]{3,8}\b/;
const rgbOrHsl = /\b(?:rgb|rgba|hsl|hsla)\s*\(/i;

for (const q of quotedStrings) {
  if (hexLiteral.test(q) || rgbOrHsl.test(q)) {
    findings.push(`a class string carries a literal colour instead of a token: ${q}.`);
  }
}

// Check for the wash (bg-warning/10) within the CVA block
if (!/\bbg-warning\/10\b/.test(cvaBlock)) {
  findings.push("the wash no longer reads `bg-warning/10` — the kit's own `--warning` token at 10% alpha.");
}

// Check for the dot (bg-warning, but not bg-warning/) in the entire source
if (!/\bbg-warning\b(?!\/)/.test(src)) {
  findings.push("the dot no longer reads a bare `bg-warning` — the kit's own `--warning` token.");
}

/* ── 3 · THE MESSAGE'S OWN TYPE STEP, 17 SEP 2026 ────────────────────────
   Client: "I'm not sure of the size of this typography... make sure that
   this is in the kit because it looks too small." One rung up `Text`'s own
   ladder — `text-caption` (13) -> `text-sm` (14), never a raw px, never a
   two-rung jump to `text-base` (16), which is more than she asked for.
   Scoped to the message wrapper's own class string so a `text-caption` or
   `text-sm` elsewhere in the file (there is none today) can't produce a
   false pass or a false fail. */
const messageSpanMatch = src.match(/<span className="flex min-w-0 items-center gap-2 ([^"]*)">/);
if (!messageSpanMatch) {
  findings.push("could not find the message wrapper span (`flex min-w-0 items-center gap-2 ...`) to check its type step.");
} else {
  const messageClasses = messageSpanMatch[1];
  if (!/\btext-sm\b/.test(messageClasses)) {
    findings.push(
      `the message wrapper is ${JSON.stringify(messageClasses)} — missing \`text-sm\`. The client's ruling was ` +
        '"make sure that this is in the kit because it looks too small" — one rung up from `text-caption`.',
    );
  }
  if (/\btext-caption\b/.test(messageClasses)) {
    findings.push(
      `the message wrapper is ${JSON.stringify(messageClasses)} — still carries \`text-caption\`, the step the ` +
        "client ruled too small.",
    );
  }
}

if (findings.length > 0) {
  console.error("FAIL unsaved-changes-bar check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK unsaved-changes-bar check: `bare`/`page`/`panel` all round on `rounded-[var(--radius)]` " +
    "(all four corners), the fill stays on the kit's `--warning` token, `bare` alone is sticky " +
    "directly under the tabs, and the message reads `text-sm`.",
);
