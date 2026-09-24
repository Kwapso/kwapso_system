#!/usr/bin/env node
/* ============================================================================
   THE TYPE-WEIGHT CHECK — run by `npm run check` beside the other
   `foundations/tokens` guards.

   THE BUG THIS GUARDS. Saans ships exactly two faces, Light 300 and Medium
   500. Until 24 Sep 2026 the app set no base `font-weight`, so every screen
   fell back to `normal` (400) — and with no 400 face installed, the browser
   resolved 400 to the nearest available cut, Medium. Measured: identical text
   at 300/400/500/normal rendered 181.78 / 180.44 / 180.44 / 180.44px, a
   three-way tie. The whole app was Medium, by accident.

   Section 5 above has always documented an intended weight per step — the
   "Kit weight per step" comment, plus each step's own "· SIZE / WEIGHT"
   line — but the `--text-*` utilities only ever carried font-size,
   line-height and letter-spacing. NOTHING carried the weight. So the moment
   the app's `<body>` was fixed to the correct light 300, every eyebrow,
   table header, chip label and badge reading a step documented at 500
   without ALSO naming a weight utility silently went light too, free-riding
   on an accident nobody wrote down as a dependency.

   That is the exact failure this check exists to catch: a comment saying
   500 beside a rule that sets nothing. It guards three things, in order:

     1 · EVERY DOCUMENTED STEP HAS A :root DECLARATION — the "Kit weight per
         step" summary and each step's own inline comment name a weight;
         `--text-{step}--font-weight` must exist on :root and must resolve
         (through `--font-weight-light` / `--font-weight-medium`) to that
         exact number. A step named in the summary with no :root property is
         the "comment beside a rule that sets nothing" bug in its purest
         form.
     2 · THE BRIDGE ACTUALLY CARRIES IT — Tailwind's `text-*` utility only
         emits a `font-weight` declaration at all when a
         `--text-{step}--font-weight` key exists somewhere in an `@theme`
         block; the installed tailwindcss (4.3.3) does not define that
         sub-key for its own default steps, so declaring it on :root alone
         is invisible to the compiler. It must also be registered in the
         `@theme inline` bridge (mirroring build-tokens.mjs guard 5's
         DEAD-SELECTOR check for `--color-*`). A :root token with no bridge
         entry is dead: it sets a CSS custom property nobody reads.
     3 · NO ORPHAN BRIDGE ENTRIES — a `--text-*--font-weight` registered in
         the bridge with no :root declaration behind it resolves to nothing
         and Tailwind drops the declaration silently.

   WHAT IT DOES NOT DO. It does not run a browser: `build-tokens.mjs`'s
   guards are static text checks and this follows the same shape. The actual
   computed-style proof (an explicit `font-*` utility keeps winning over the
   step default; a bare `text-xl` renders 500; a bare `text-sm` stays 300)
   was run once by hand against a real Tailwind build and is not repeated on
   every `npm run check` — this check instead pins the two source facts
   (documented weight exists on :root, and the bridge carries it) that made
   that render correct, so neither can drift out from under it unnoticed.
   ============================================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "tokens.css");
const raw = readFileSync(SRC, "utf8");

const fail = [];

/* -- 1 · the documented weight per step --------------------------------------
   Source of truth is the "Kit weight per step" summary inside section 5 —
   the same two lines a human reads to answer "what should this step weigh".
   `xs` is folded in explicitly: its own step comment ("xs · 12 / 500") has
   always said 500 even on the one day the summary line forgot to list it. */

const summaryMatch = raw.match(
  /Kit weight per step, for reference when authoring:\s*\n\s*500 — ([^\n]+)\n\s*300 — ([^\n]+)/,
);
if (!summaryMatch) {
  fail.push(
    "SUMMARY MISSING — the \"Kit weight per step\" comment in section 5 could not be found " +
      "or its format changed. This check reads that comment as the documented weight per " +
      "step; update the regex in check-type-weight.mjs if the comment's wording changed on " +
      "purpose.",
  );
}

const parseStepList = (s) =>
  s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

const documented = new Map(); // step -> 500 | 300
if (summaryMatch) {
  for (const step of parseStepList(summaryMatch[1])) documented.set(step, 500);
  for (const step of parseStepList(summaryMatch[2])) documented.set(step, 300);
}

/* Cross-check against each step's OWN inline comment ("· SIZE / WEIGHT"),
   which is the second, independent place a weight is documented. A step
   whose own comment disagrees with the summary is a documentation drift the
   next reader would have no way to catch by eye. */
for (const m of raw.matchAll(/\/\*\s*([a-z0-9]+)\s*·\s*[\d.]+\s*\/\s*(\d{3})\b/g)) {
  const [, step, weight] = m;
  const w = Number(weight);
  if (!documented.has(step)) continue; // not one of the type-scale steps (e.g. an unrelated "· N / N" comment)
  if (documented.get(step) !== w) {
    fail.push(
      `DOC DRIFT — ${step}'s own comment says ${w}, the section-5 summary says ` +
        `${documented.get(step)}. They must agree; fix whichever one is stale.`,
    );
  }
}

if (documented.size === 0) {
  console.error("\ncheck-type-weight: FAILED\n" + "-".repeat(26));
  for (const f of fail) console.error("  " + f);
  process.exit(1);
}

/* -- 2 · what :root actually declares ---------------------------------------- */

/* tokens.css has several bare `:root {...}` blocks (root scale, light
   palette, additive tokens, this type section, ...); find the one that
   actually declares the faces, since that is the only one section 5's
   weights can live in. */
let rootBlock = "";
for (const m of raw.matchAll(/^:root\s*\{([\s\S]*?)\n\}/gm)) {
  if (m[1].includes("--font-sans:")) {
    rootBlock = m[1];
    break;
  }
}
if (!rootBlock) {
  fail.push("TYPE :root BLOCK MISSING — no `:root { ... --font-sans: ... }` block found in tokens.css.");
}

const WEIGHT_VARS = { "var(--font-weight-light)": 300, "var(--font-weight-medium)": 500 };

const rootWeights = new Map(); // step -> resolved number (or raw string if unresolved)
for (const m of rootBlock.matchAll(/--text-([a-z0-9]+)--font-weight:\s*([^;]+);/g)) {
  const [, step, value] = m;
  const v = value.trim();
  rootWeights.set(step, WEIGHT_VARS[v] ?? v);
}

for (const [step, weight] of documented) {
  if (!rootWeights.has(step)) {
    fail.push(
      `MISSING :root DECLARATION — section 5 documents "${step}" at ${weight}, but no ` +
        `--text-${step}--font-weight exists on :root. This is a comment beside a rule that ` +
        `sets nothing.`,
    );
    continue;
  }
  const resolved = rootWeights.get(step);
  if (resolved !== weight) {
    fail.push(
      `WRONG WEIGHT — --text-${step}--font-weight resolves to ${resolved}, but section 5 ` +
        `documents "${step}" at ${weight}.`,
    );
  }
}

/* -- 3 · what the @theme inline bridge actually registers --------------------
   Same shape as build-tokens.mjs guard 5 (DEAD SELECTOR): a token declared
   on :root that the bridge never re-registers is invisible to Tailwind's
   utility generator, so `text-{step}` compiles with no `font-weight`
   declaration at all — verified against the installed tailwindcss by
   inspecting its compiled utility for `--text-*` (it only emits `font-weight`
   when a `--text-*--font-weight` theme key exists). */

const bridgeStart = raw.indexOf("@theme inline");
if (bridgeStart === -1) {
  fail.push("BRIDGE MISSING — no `@theme inline` block found in tokens.css.");
}
const bridgeBlock = bridgeStart === -1 ? "" : raw.slice(bridgeStart);
const bridgedWeightSteps = new Set(
  [...bridgeBlock.matchAll(/--text-([a-z0-9]+)--font-weight:\s*var\(--text-\1--font-weight\);/g)].map(
    (m) => m[1],
  ),
);

for (const step of documented.keys()) {
  if (!bridgedWeightSteps.has(step)) {
    fail.push(
      `NOT BRIDGED — --text-${step}--font-weight is declared on :root (or should be) but is ` +
        `not registered in the @theme inline block, so Tailwind's compiler never sees it and ` +
        `text-${step} compiles with no font-weight declaration at all. It sets nothing.`,
    );
  }
}

/* Orphans the other way: bridged but nothing on :root behind it. */
for (const step of bridgedWeightSteps) {
  if (!rootWeights.has(step)) {
    fail.push(
      `ORPHAN BRIDGE ENTRY — --text-${step}--font-weight is registered in @theme inline but ` +
        `has no :root declaration to read; it resolves to nothing.`,
    );
  }
}

const banner = (s) => `\n${s}\n${"-".repeat(s.length)}`;

if (fail.length) {
  console.error(banner("check-type-weight: FAILED"));
  for (const f of fail) console.error("  " + f);
  console.error("");
  process.exit(1);
}

console.log(banner("check-type-weight: OK"));
console.log(`  documented steps          ${documented.size}`);
console.log(`  :root declarations        ${rootWeights.size}`);
console.log(`  bridged into @theme       ${bridgedWeightSteps.size}`);
console.log(
  `  500 (medium)               ${[...documented].filter(([, w]) => w === 500).map(([s]) => s).join(", ")}`,
);
console.log(
  `  300 (light)                ${[...documented].filter(([, w]) => w === 300).map(([s]) => s).join(", ")}`,
);
console.log("");
