#!/usr/bin/env node
/* ============================================================================
   THE QUERY-CONDITION-VAR CHECK — run by `npm run check` beside the token/
   icon/screen-shell checks.

   EARNED 22 SEP 2026. `FOOTER_TWO_COLUMN_QUERY`
   (`components/record-detail/record-detail.tsx`) shipped as
   `"@min-[calc(16.25rem*2_+_var(--space-7))]"` — a Tailwind arbitrary
   container-query variant whose CONDITION referenced a custom property. A
   container query's condition is held to the same rule a media query's is:
   `var()` is a DECLARATION-time substitution, resolved only once a rule has
   already matched, and a query's own CONDITION is evaluated before any
   declaration is. A custom property therefore cannot appear inside one at
   all — CSS does not warn about this, it treats the whole at-rule prelude
   as unparsable and drops the rule silently, emitting NOTHING. A live paint
   proof of a shipped build found the record footer stuck at one column
   forever; the built stylesheet settled why, grepping for the two-track
   rule and coming back with nothing — the rule was never emitted, at any
   width, so no amount of viewport or container fixing on the CONSUMING side
   could ever have made it match. THIS IS THE WORST CLASS OF BUG: no build
   error, no console warning, a green `tsc`, a green `npm run check` — the
   only trace is a rule that is simply absent from the generated CSS, which
   nothing here was reading for.

   WHAT THIS SCRIPT ACTUALLY CHECKS. Every Tailwind arbitrary container/
   media-query variant under `components/` and `compositions/` — `@min-[…]`,
   `@max-[…]`, `[@container(…)]`, `[@media(…)]`, spelled as a class-string
   variant OR as a plain exported constant a call site later interpolates
   (`FOOTER_TWO_COLUMN_QUERY`'s own shape) — must not carry a `var(` inside
   its condition. No exemption table: unlike `OVERFLOW_AXIS_EXEMPT`'s three
   reasoned cases, there is no legitimate reason a query CONDITION needs a
   custom property — the fix is always the same, resolve the token to its
   literal value and write the arithmetic in a comment beside it, the way
   `FOOTER_TWO_COLUMN_QUERY`'s own fix does. ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const ROOTS = [path.join(ROOT, "components"), path.join(ROOT, "compositions")];

// STRIP COMMENTS BEFORE SCANNING — the same discipline check-overflow-axis.mjs
// already takes, for the same reason: a file header that QUOTES the bad
// shape to explain the fix (this file's own header two blocks up, once this
// script's neighbours in the kit start citing it) must never itself read as
// a live finding. Naive on purpose, good enough for `.tsx` source that never
// nests a `/*`/`*/` pair inside a string.
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

// Four shapes a query condition takes in this codebase's own Tailwind v4
// usage: an arbitrary container variant (`@min-[…]`/`@max-[…]`, bracket
// content is the condition), and a bracketed at-rule variant
// (`[@container(…)]`/`[@media(…)]`, parenthesised content is the
// condition). Each captures its own condition text in group 1.
const QUERY_PATTERNS = [
  { re: /@(?:min|max)-\[([^\]]*)\]/g, kind: "arbitrary container variant" },
  { re: /\[@container\(([^)]*)\)\]/g, kind: "bracketed @container variant" },
  { re: /\[@media\(([^)]*)\)\]/g, kind: "bracketed @media variant" },
];

const findings = [];
const files = ROOTS.flatMap((r) => walk(r));

for (const full of files) {
  const rel = path.relative(ROOT, full).split(path.sep).join("/");
  const src = fs.readFileSync(full, "utf8");
  const scan = stripComments(src);

  for (const { re, kind } of QUERY_PATTERNS) {
    for (const m of scan.matchAll(re)) {
      const condition = m[1];
      if (!condition.includes("var(")) continue;
      const line = scan.slice(0, m.index).split("\n").length;
      findings.push(
        `${rel}:${line} — a ${kind}'s own condition carries var(): "${m[0]}". A query CONDITION is ` +
          "evaluated before any declaration, so a custom property inside one resolves to nothing and the " +
          "whole at-rule is dropped silently — no build error, no emitted rule, at any width. Resolve the " +
          "token to its literal length and write the arithmetic in a comment beside the constant, the way " +
          "FOOTER_TWO_COLUMN_QUERY's own fix does (components/record-detail/record-detail.tsx).",
      );
    }
  }
}

if (findings.length > 0) {
  console.error("FAIL query-condition-var check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  `OK query-condition-var check: no @min-[…]/@max-[…]/[@container(…)]/[@media(…)] condition under ` +
    `components/ or compositions/ (${files.length} files walked) carries a var() — every query condition ` +
    "is a literal length, the only shape a query condition can actually hold.",
);
