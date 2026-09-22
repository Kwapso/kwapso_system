#!/usr/bin/env node
/* ============================================================================
   THE SR-ONLY-LAYOUT CHECK — run by `npm run check` beside the overflow-axis/
   query-condition-var checks.

   CLIENT RULING, 22 SEP 2026: *"i see a small horizotnal scroll within the
   main content at the bottom, shoudl not be."* Measured cause:
   `components/sankey/sankey.tsx` draws a `data-slot="sankey-table"` carrying
   `sr-only`. That class sets `width: 1px`, but a `<table>` defaults to
   AUTOMATIC layout, and automatic layout is defined to ignore a specified
   width when the content's own min-content width is larger — the used width
   becomes whatever the content needs instead, regardless of what `sr-only`
   declared. This table measured 381px wide on staging. Being absolutely
   positioned (also from `sr-only`) does not save it: the box still
   contributes its own 381px to the scrollable overflow area of the nearest
   scrolling ancestor (the shell's own body), so an invisible accessibility
   table pushed the whole visible page sideways by 21px at 1280 wide.

   THE FIX IS `table-fixed` (`table-layout: fixed`) ALONGSIDE `sr-only`, NOT
   INSTEAD OF IT. Fixed layout makes the specified width authoritative
   regardless of content, so `sr-only`'s declared 1px is what the table
   actually renders at, and `sr-only`'s own `overflow: hidden`/`clip: rect(0,
   0, 0, 0)` clip whatever a cell's content paints past that box. This kit
   has no second, dedicated visually-hidden primitive beyond the `sr-only`
   utility class (checked: no `VisuallyHidden` component, no alternate
   convention anywhere under components/ or compositions/) — `table-fixed`
   PAIRS with `sr-only`, it does not replace it, and the table stays exactly
   as reachable to a screen reader as before.

   WHAT THIS SCRIPT ACTUALLY CHECKS. `<table` under `components/` or
   `compositions/` whose own opening tag carries `sr-only` (bracket-balanced
   extraction of the tag, not a fixed-width regex window, because a
   `className={cn(...)}` call can itself contain a `>` inside an arrow
   function or a JSX-in-JS expression) must also carry `table-fixed`, or an
   inline `tableLayout`/`table-layout` style set to `fixed` — some way the
   layout algorithm is actually forced to honour the width `sr-only`
   declares. A `<table>` is the one element in this codebase that does this
   (automatic table layout is a named exception in the CSS sizing spec: it
   may use a used width GREATER than a specified one). If a future element
   shows the same defect — a replaced element, a `<fieldset>`, anything else
   whose own layout algorithm can size itself past a declared width — add its
   shape to `WIDTH_IGNORING_TAGS` below rather than writing a second script;
   the finding message generalises past "table" on purpose.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const ROOTS = [path.join(ROOT, "components"), path.join(ROOT, "compositions")];

// STRIP COMMENTS BEFORE SCANNING — the same discipline check-overflow-axis.mjs
// and check-query-condition-var.mjs already take, for the same reason: a file
// header that QUOTES the bad shape to explain the fix (this file's own header
// two blocks up, once this script's neighbours start citing it, or sankey.tsx's
// own comment above its table) must never itself read as a live finding.
// Naive on purpose, good enough for `.tsx` source that never nests a `/*`/`*/`
// pair inside a string.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) out.push(full);
  }
  return out;
}

// Elements this codebase can carry whose OWN layout algorithm can size the
// box past a declared width. `table` is the one this bug actually hit —
// automatic table layout is spec'd to do exactly that. Add another tag here,
// with a one-line reason, the day a second one turns up; do not fork a new
// script for it.
const WIDTH_IGNORING_TAGS = ["table"];

// Bracket-balanced tag extraction — a fixed-width text window (the shape
// check-overflow-axis.mjs uses for a *nearby* utility) is not safe here
// because the thing being searched IS the opening tag itself, and a
// `className={cn("sr-only", condition && "table-fixed")}` expression can
// contain a `>` of its own (a comparison, an arrow function) before the tag
// actually closes. This walks the source honouring string/template quoting
// and `{ }` nesting depth, and stops at the first bare `>` once depth is
// back to zero.
function extractTag(src, startIdx) {
  let i = startIdx;
  let depth = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      i++;
      continue;
    }
    if (c === "{") {
      depth++;
      i++;
      continue;
    }
    if (c === "}") {
      depth--;
      i++;
      continue;
    }
    if (c === ">" && depth === 0) {
      return src.slice(startIdx, i + 1);
    }
    i++;
  }
  // Unterminated (malformed source, or the walk above has a gap) — fall back
  // to a generous window so the check still reports SOMETHING near the tag
  // rather than crashing.
  return src.slice(startIdx, Math.min(src.length, startIdx + 2000));
}

const SR_ONLY_RE = /\bsr-only\b/;
const FIXED_LAYOUT_RE = /\btable-fixed\b|tableLayout\s*:\s*["']fixed["']|table-layout\s*:\s*["']?fixed\b/;

const findings = [];
const files = ROOTS.flatMap((r) => walk(r));

for (const full of files) {
  const rel = path.relative(ROOT, full).split(path.sep).join("/");
  const src = fs.readFileSync(full, "utf8");
  const scan = stripComments(src);

  for (const tag of WIDTH_IGNORING_TAGS) {
    const openRe = new RegExp(`<${tag}\\b`, "g");
    for (const m of scan.matchAll(openRe)) {
      const tagText = extractTag(scan, m.index);
      if (!SR_ONLY_RE.test(tagText)) continue;
      if (FIXED_LAYOUT_RE.test(tagText)) continue;

      const line = scan.slice(0, m.index).split("\n").length;
      findings.push(
        `${rel}:${line} — a <${tag}> carries sr-only but no table-fixed (or tableLayout: "fixed"). ` +
          "sr-only sets width: 1px, but automatic table layout is spec'd to IGNORE a specified width when " +
          "the content's min-content width is larger, so the table renders at its content's width instead " +
          "— absolutely positioned or not, that width still contributes to the scrollable overflow of the " +
          "nearest scrolling ancestor, which is how an invisible accessibility table scrolled the whole " +
          "page sideways (22 Sep 2026 client ruling). Add table-fixed alongside sr-only so the declared " +
          "width is the one the browser actually honours.",
      );
    }
  }
}

if (findings.length > 0) {
  console.error("FAIL sr-only-layout check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  `OK sr-only-layout check: every sr-only <table> under components/ or compositions/ (${files.length} ` +
    `files walked, tags checked: ${WIDTH_IGNORING_TAGS.join(", ")}) also carries table-fixed — the declared ` +
    "width sr-only sets is the one the layout algorithm actually honours.",
);
