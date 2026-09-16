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

if (findings.length > 0) {
  console.error("FAIL unsaved-changes-bar check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK unsaved-changes-bar check: `bare`/`page`/`panel` all round on `rounded-[var(--radius)]` " +
    "(all four corners), and the fill stays on the kit's `--warning` token.",
);
