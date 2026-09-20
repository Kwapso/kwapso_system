#!/usr/bin/env node
/* ============================================================================
   THE PERMISSION-MATRIX UNOFFERED-SLOT CHECK — pins a stable hook onto the
   un-offered mark against every way it could drift back out, run by
   `npm run check` beside the token/icon/book/seam checks.

   WHY THIS EXISTS. `NO_VALUE` used to be the em dash "—", and the app's own
   `web/test/roles-matrix-boxes.test.tsx` found the un-offered slot by its
   TEXT, `getAllByText("—")`. v1.2.140 (20 Sep 2026, Aurora's "no em dashes
   ABSOLUTELY NOWHERE" law) changed `NO_VALUE` to `""` — the mark renders an
   empty cell, not a hyphen standing in for the dash it replaced — which
   removed the only hook that test had: `getAllByText("—")` cannot find an
   element with no text. `data-slot="permission-matrix-unoffered"` is the
   REPLACEMENT hook, stable regardless of what `NO_VALUE` is spelled as.

   WHY A SOURCE CHECK, MATCHING THIS KIT'S OTHER `check-*.mjs` FILES — there
   is no jsdom/testing-library in this repository (`npm run check` is `tsc
   --noEmit` plus a run of source-reading scripts like this one), so the two
   render sites are verified by reading `permission-matrix.tsx`'s own source
   rather than by mounting the component.

   TWO THINGS PINNED, so the hook cannot drift back silently:
     1 · The example run's un-offered slot (`LegendRun`, around line 1317)
         carries `data-slot="permission-matrix-unoffered"`.
     2 · The real grid's un-offered slot (around line 1436) carries the same
         attribute. Both are the ONLY two places `NO_VALUE` is rendered in
         this file — if a third ever appears, this check does not know to
         look for it, which is why it also counts occurrences and fails if
         the count is not exactly two, catching a slot added without the
         attribute rather than silently passing beside it.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "permission-matrix.tsx");

const src = fs.readFileSync(FILE, "utf8");

const findings = [];

const noValueSites = [...src.matchAll(/\{NO_VALUE\}/g)];
if (noValueSites.length !== 2) {
  findings.push(
    `expected exactly 2 renders of {NO_VALUE} in ${path.basename(FILE)}, found ${noValueSites.length} — ` +
      "this check's own two-site pin is stale; update it alongside whatever changed.",
  );
}

const unofferedHookSites = [...src.matchAll(/data-slot="permission-matrix-unoffered"/g)];
if (unofferedHookSites.length !== 2) {
  findings.push(
    `expected exactly 2 spans carrying data-slot="permission-matrix-unoffered", found ` +
      `${unofferedHookSites.length} — the un-offered slot's stable hook (added so ` +
      "web/test/roles-matrix-boxes.test.tsx does not have to find it by text) is missing from at " +
      "least one render site.",
  );
}

/* Each {NO_VALUE} must sit on a span that ALSO carries the hook — not just
   the right COUNT of each, but the hook on the SAME element the mark
   renders on, so a hook added to some unrelated span cannot pass by
   coincidence. */
for (const site of noValueSites) {
  const spanStart = src.lastIndexOf("<span", site.index);
  const spanOpenEnd = src.indexOf(">", spanStart);
  if (spanStart === -1 || spanOpenEnd === -1 || spanOpenEnd > site.index) {
    findings.push(`{NO_VALUE} at offset ${site.index} is not inside a <span ...> this check can read.`);
    continue;
  }
  const spanTag = src.slice(spanStart, spanOpenEnd);
  if (!spanTag.includes('data-slot="permission-matrix-unoffered"')) {
    const line = src.slice(0, site.index).split("\n").length;
    findings.push(
      `${path.basename(FILE)}:${line} renders {NO_VALUE} on a span with no ` +
        'data-slot="permission-matrix-unoffered" — the un-offered mark has no stable hook here.',
    );
  }
}

if (findings.length > 0) {
  console.error("FAIL permission-matrix check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  'OK permission-matrix check: both un-offered-slot render sites (the legend example run and the ' +
    'real grid) carry data-slot="permission-matrix-unoffered", the stable hook that replaced ' +
    "text-matching NO_VALUE's own glyph.",
);
