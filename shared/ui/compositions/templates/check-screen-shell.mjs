#!/usr/bin/env node
/* ============================================================================
   THE ASIDE SEAM CHECK — pins which edge carries the assistant's bare
   resize seam, run by `npm run check` beside the token/icon/book checks.

   WHY THIS EXISTS. The seam (`RESIZE_SEAM` in `screen-shell.tsx`, the
   invisible 8px grab edge with the hover `cursor-col-resize` arrow) shipped
   on the aside dock's END inset — the assistant column's outer edge, one
   gutter short of the window. The client's ruling, 16 Sep 2026: "you put it
   on the right edge. I want it on the left one, the one that's between the
   assistant and the main content." The fix moved the one `placement` string
   on the BARE `EdgeHandle` call (the one rendered only when
   `!asideHandleOnOpen && isAsideOpen`) from `end-[var(--shell-gutter)]` to
   `start-0` — the dock's own card-facing padding edge, the seam actually
   shared with the main content.

   A regressive edit — someone "fixing" a lint warning, a copy-paste of the
   round handle's own (deliberately END-anchored) placement two blocks up,
   a merge that resolves the wrong way — would put the seam back on the
   window edge with no visual difference in a quick review, because the
   seam paints nothing at rest. This script reads the source text directly
   (no DOM, no build step) so that regression fails `npm run check` instead
   of waiting for the next client screenshot.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "screen-shell.tsx");

const src = fs.readFileSync(FILE, "utf8");

// NOT "THE BARE RESIZE SEAM" alone — that string also opens `RESIZE_SEAM`'s
// own doc comment, much earlier in the file (the constant's definition, not
// the JSX call site). This phrase is unique to the JSX comment that sits
// directly above the `EdgeHandle` call this check pins.
const ANCHOR = "THE BARE RESIZE SEAM — 2026-09-16, variation A, for the one";
const anchorIndex = src.indexOf(ANCHOR);

if (anchorIndex === -1) {
  console.error(`FAIL screen-shell seam check: could not find the ${JSON.stringify(ANCHOR)} block in ${FILE}.`);
  process.exit(1);
}

// The EdgeHandle call this comment introduces is a few hundred characters
// below the anchor; 4000 is generous headroom without risking a match
// against some unrelated, later `placement=` literal.
const window_ = src.slice(anchorIndex, anchorIndex + 4000);

const placementMatch = window_.match(/placement="([^"]*)"/);

if (!placementMatch) {
  console.error(`FAIL screen-shell seam check: no placement=\"...\" found after the ${JSON.stringify(ANCHOR)} anchor.`);
  process.exit(1);
}

const placement = placementMatch[1];
const findings = [];

if (!/\bstart-0\b/.test(placement)) {
  findings.push(
    `the bare resize seam's placement is ${JSON.stringify(placement)} — missing \`start-0\`. ` +
      "The seam must sit on the aside dock's START inset (the card-facing edge, " +
      "shared with the main content), per the client's 16 Sep 2026 ruling.",
  );
}

if (/\bend-/.test(placement)) {
  findings.push(
    `the bare resize seam's placement is ${JSON.stringify(placement)} — carries an \`end-\` inset. ` +
      "That is the window/screen edge, the edge the client explicitly rejected " +
      '("you put it on the right edge... I want it on the left one").',
  );
}

if (findings.length > 0) {
  console.error("FAIL screen-shell seam check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(`OK screen-shell seam check: the bare resize seam is pinned to \`${placement}\` (the aside's START edge).`);
