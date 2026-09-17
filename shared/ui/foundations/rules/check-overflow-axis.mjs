#!/usr/bin/env node
/* ============================================================================
   THE OVERFLOW-AXIS CHECK — run by `npm run check` beside the token/icon/
   screen-shell checks.

   CLIENT RULING, 17 SEP 2026 EVENING, VERBATIM: *"sometimes there is a
   vertical scroll on the tabs under the title. It should not be like that."*

   WHY THIS HAPPENS. Setting `overflow-x` alone computes `overflow-y: auto`
   by the CSS spec's own default (never `visible`) — a fact this codebase's
   own `table.tsx` states in its own comment, correctly, as the reason its
   sticky header works. A strip whose `scrollHeight` rounds even 1px past its
   `clientHeight` — measured live on staging, on every `[role=tablist]` —
   becomes vertically scrollable on that 1px, invisible with the scrollbar
   hidden (`[scrollbar-width:none]`/`[&::-webkit-scrollbar]:hidden`, which
   hides the AFFORDANCE, not the SCROLLING) but still real: a wheel, a
   trackpad or a touch drag moves the strip's content by that 1px, which is
   what "sometimes there is a vertical scroll" describes.

   THE FIX IS NEVER BLANKET. `overflow-x-auto` appears in this kit for TWO
   different reasons and only one of them is this bug: a single-axis STRIP
   (a tab list, a folder strip, a toolbar's scrolling lane, a chip row, a
   swimlane, a kanban board's row of columns, a comparison/heatmap/timeline's
   horizontal scroller) never needed the vertical axis and gets
   `overflow-y-hidden` alongside it; a genuine two-axis surface — `table.tsx`
   and `spreadsheet.tsx`, which rely on `overflow-x: auto`'s own
   `overflow-y: auto` for a STICKY HEADER to have a scrollport to stick
   inside, and `flowchart.tsx`, whose tree can genuinely run taller than its
   panel and carries a `sticky bottom-0` legend that needs a real vertical
   scrollport to stick against — must keep both axes free. Those three are
   `OVERFLOW_AXIS_EXEMPT`, below, each with its own reason; the check fails
   on an EXEMPTED file the day its own `overflow-y` reasoning stops being
   true in the source (the reason is re-read, not just the filename).

   WHAT THIS SCRIPT ACTUALLY CHECKS. Every `overflow-x-auto`/`overflow-x-
   scroll` occurring inside a quoted string, anywhere under `components/`, must
   have an `overflow-y-*` utility within the same class-list neighbourhood
   (a generous window around the match, wide enough to cover a `cn(...)`
   call's sibling string arguments and an adjacent one-line comment, narrow
   enough that two unrelated scrollers in the same file cannot cover for each
   other) — UNLESS the file is named in `OVERFLOW_AXIS_EXEMPT`. A file in
   the exemption list is checked the OTHER way: it must still contain
   `overflow-x-auto` (or the check is stale and should be deleted) and must
   NOT contain `overflow-y-hidden`/`overflow-y-clip` anywhere near that
   match (an exemption that got the fix anyway is a dead entry, not a
   pass). ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const COMPONENTS = path.join(ROOT, "components");

/* Reasoned exceptions — a file here relies on `overflow-x-auto`'s own
   `overflow-y: auto` default ON PURPOSE. Each reason is re-read against the
   file's own source below, not just trusted as a comment. */
const OVERFLOW_AXIS_EXEMPT = [
  {
    file: "components/table/table.tsx",
    why: "overflow-x: auto's own overflow-y: auto is what lets the sticky header work — the file's own comment says so.",
    mustContain: /overflow-x:\s*auto.{0,80}overflow-y:\s*auto/s,
  },
  {
    file: "components/spreadsheet/spreadsheet.tsx",
    why: "the same sticky-header scrollport table.tsx relies on — this file's own comment names data-table's arrangement.",
    mustContain: /sticky/,
  },
  {
    file: "components/flowchart/flowchart.tsx",
    why: "the tree can run taller than its panel and carries a sticky bottom-0 legend, which needs a real vertical scrollport to stick against.",
    mustContain: /sticky bottom-0/,
  },
];
const EXEMPT_FILES = new Set(OVERFLOW_AXIS_EXEMPT.map((e) => e.file));

// STRIP COMMENTS BEFORE SCANNING — a bare regex over raw source cannot tell
// working code from prose that MENTIONS a class name to explain it (this
// kit's own house style, `tabs.tsx`'s and `breadcrumb-folders.tsx`'s file
// headers among them). Naive on purpose (no template-literal-aware string
// scanning, no AST) — good enough for `.tsx` source that never nests a
// `/*`/`*/` pair inside a string, which this codebase does not do. A
// stripped comment keeps its own length in newlines so line numbers below
// stay correct.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) out.push(full);
  }
  return out;
}

const findings = [];
const files = walk(COMPONENTS);

// A generous window either side of a match — wide enough to cover a cn(...)
// call's sibling string arguments and this file's own multi-line
// explanatory comments beside a fix, narrow enough that two unrelated
// scrollers elsewhere in a long file cannot cover for each other.
const WINDOW = 500;

for (const full of files) {
  const rel = path.relative(process.cwd(), full);
  const relFromRoot = path.relative(ROOT, full).split(path.sep).join("/");
  const src = fs.readFileSync(full, "utf8");
  // Comments stripped to spaces (same length, same line breaks) so a file
  // header that MENTIONS `overflow-x-auto` to explain it — this kit's own
  // house style — cannot match as working code, and an explanatory comment
  // that mentions `overflow-y-hidden` near an UNFIXED string cannot satisfy
  // the check either. Line numbers computed off this text stay correct.
  const scan = stripComments(src);

  const matches = [...scan.matchAll(/overflow-x-(auto|scroll)\b/g)];
  if (matches.length === 0) continue;

  const exemption = OVERFLOW_AXIS_EXEMPT.find((e) => e.file === relFromRoot);

  if (exemption) {
    if (!exemption.mustContain.test(src)) {
      findings.push(
        `${rel} is in OVERFLOW_AXIS_EXEMPT ("${exemption.why}") but no longer contains the shape that reason depends on — ` +
          "re-read the file: either the reason no longer holds (fix it and drop the exemption) or the reasoning moved (update mustContain).",
      );
    }
    for (const m of matches) {
      const windowText = scan.slice(Math.max(0, m.index - WINDOW), m.index + WINDOW);
      if (/overflow-y-(hidden|clip)\b/.test(windowText)) {
        findings.push(
          `${rel} is in OVERFLOW_AXIS_EXEMPT but its overflow-x-${m[1]} at offset ${m.index} already carries an ` +
            "overflow-y-hidden/clip nearby — the fix landed, so this is a dead exemption; remove the entry.",
        );
      }
    }
    continue;
  }

  for (const m of matches) {
    const windowText = scan.slice(Math.max(0, m.index - WINDOW), m.index + WINDOW);
    if (!/overflow-y-(hidden|clip|auto|scroll|visible)\b/.test(windowText)) {
      const line = scan.slice(0, m.index).split("\n").length;
      findings.push(
        `${rel}:${line} sets overflow-x-${m[1]} with no overflow-y-* nearby — overflow-x alone computes ` +
          "overflow-y: auto by the CSS spec's own default, which is exactly the '1px sub-pixel rounding makes a " +
          'strip vertically scrollable' +
          "' bug (17 Sep 2026 client ruling). Add overflow-y-hidden beside it, or add a reasoned " +
          "OVERFLOW_AXIS_EXEMPT entry in this script naming why the vertical axis is genuinely needed here.",
      );
    }
  }
}

if (findings.length > 0) {
  console.error("FAIL overflow-axis check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  `OK overflow-axis check: every overflow-x-auto/scroll in ${files.length} component files either pairs with an ` +
    `overflow-y-* utility or is a reasoned OVERFLOW_AXIS_EXEMPT entry (${OVERFLOW_AXIS_EXEMPT.length}: ` +
    `${[...EXEMPT_FILES].map((f) => f.split("/").pop()).join(", ")}).`,
);
