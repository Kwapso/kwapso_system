#!/usr/bin/env node
/* ============================================================================
   build-tokens.mjs
   tokens.css  ->  tokens.json.  Four guards FAIL the build; UNRESOLVED warns.

     node foundations/tokens/build-tokens.mjs
     node foundations/tokens/build-tokens.mjs --check    (guards only, writes nothing)

   The guards exist because each of them catches a bug that is invisible in
   review and miserable to find by eye:

     1 · DRIFT      the two dark blocks must declare an identical set of
                    names with identical values. A token defined in only one
                    of them renders differently for "system dark" than for
                    "I picked dark".
     2 · ORPHAN     a name defined in dark but not in light has its only
                    definition inside a media query. Commission rule 6.
     3 · PX LEAK    a px value outside the short allowlist. Commission rule
                    5 — a px does not scale, so the text-size control
                    silently stops working for that property.
     4 · UNRESOLVED a var() chain that points at nothing. WARNS; the others
                    fail.
     5 · DEAD       a `.bg-* / .text-* / .border-*` class this stylesheet
        SELECTOR    SELECTS ON that the @theme bridge cannot produce. Tailwind
                    never generates the class, so it paints nothing while any
                    rebind keyed on it fires anyway -- and a missing background
                    looks exactly like a deliberate one. T3A-33.
   ============================================================================ */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* The walk over tokens.css — which blocks are which palette, and how a var()
   chain is chased to the hex at the end of it — moved to `token-model.mjs` so
   that `check-contrast.mjs` reads this stylesheet through the SAME eye. Two
   resolvers that can disagree about what a token resolves to is the bug the
   contrast law exists to catch, one level up. */
import { readTokenModel, TOKENS_CSS as SRC } from "./token-model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "tokens.json");
const CHECK_ONLY = process.argv.includes("--check");

/* px is legitimate in exactly these places. Everything else is a leak. */
const PX_ALLOWED = [
  /^--shadow-/,        // shadow geometry is not type, and does not scale
  /^--focus-width$/,   // a ring stays 2px at every text scale
  /^--focus-offset$/,
  /^--radius-pill$/,   // 999px is "fully round", not a measurement
  /^--hairline/,       // a hairline is 1px BY DEFINITION and must not scale:
                       // the artifact draws every one of them as an inset
                       // 1px shadow, and a hairline that grew with the
                       // text-size control would stop being a hairline.
];

const fail = [];

/* -- 1/2 · read, de-comment, and pull out the blocks ------------------------
   All of it through `token-model.mjs`, which is this function body's old
   contents moved out whole. `structural` is the "there is no dark block"
   class of problem: unrecoverable for a reader, and a build failure here. */

const model = readTokenModel();
const { raw, css, light, darkMedia, darkExplicit } = model;
/* UNRESOLVED is raised by the shared resolver, so the warning sink is the
   model's own. It fills during section 8's resolution pass, below. */
const warn = model.warnings;
for (const s of model.structural) fail.push(s);

/* -- 3 · GUARD 1 — drift ---------------------------------------------------- */

if (darkMedia && darkExplicit) {
  const a = [...darkMedia.keys()];
  const b = [...darkExplicit.keys()];
  const onlyMedia = a.filter((k) => !darkExplicit.has(k));
  const onlyExplicit = b.filter((k) => !darkMedia.has(k));
  const mismatched = a
    .filter((k) => darkExplicit.has(k))
    .filter((k) => darkMedia.get(k) !== darkExplicit.get(k));

  if (onlyMedia.length || onlyExplicit.length || mismatched.length) {
    fail.push("DRIFT — the two dark blocks are not the same block.");
    for (const k of onlyMedia) fail.push(`    only in @media          ${k}`);
    for (const k of onlyExplicit) fail.push(`    only in [data-theme]    ${k}`);
    for (const k of mismatched)
      fail.push(
        `    value differs           ${k}\n` +
          `        @media       ${darkMedia.get(k)}\n` +
          `        [data-theme] ${darkExplicit.get(k)}`
      );
  }
}

/* -- 4 · GUARD 2 — orphans -------------------------------------------------- */

for (const k of darkMedia?.keys() ?? []) {
  if (!light.has(k)) fail.push(`ORPHAN — ${k} is defined in dark but never on bare :root`);
}

/* -- 5 · GUARD 3 — px leaks ------------------------------------------------- */

const pxCheck = (map, where) => {
  for (const [k, v] of map) {
    if (!/\d\s*px\b/.test(v)) continue;
    if (PX_ALLOWED.some((re) => re.test(k))) continue;
    fail.push(`PX LEAK — ${k} (${where}) = ${v}`);
  }
};
pxCheck(light, "light");
if (darkMedia) pxCheck(darkMedia, "dark");

/* -- 5b · GUARD 4 — a selector that keys on a class Tailwind never makes ----

   `.bg-surface-raised` appeared in the relational rebind block below and
   `--color-surface-raised` was never registered in the `@theme inline` bridge.
   Tailwind therefore generated no such utility: the class emitted NO
   background -- measured rgba(0,0,0,0) on a live screen -- while the rebind it
   triggers fired anyway, so a screen asking for the raised tone got a
   transparent box and a rebound button at the same time. Silent in review,
   because a missing background looks exactly like a deliberate one.

   The rule: every `.bg-* / .text-* / .border-*` class this stylesheet SELECTS
   ON must be a class the bridge can actually produce. Found live by Track 3A
   (T3A-33).                                                                 */

const SELECTED_CLASSES = [...raw.matchAll(/^\s*\.(bg|text|border)-([a-z0-9-]+)\s*,?\s*$/gm)]
  .map((m) => ({ util: m[1], token: m[2] }));
const bridgeBlock = raw.slice(raw.indexOf("@theme inline"));
const BRIDGED = new Set([...bridgeBlock.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

for (const { util, token } of SELECTED_CLASSES) {
  if (BRIDGED.has(token)) continue;
  fail.push(
    `DEAD SELECTOR — .${util}-${token} is selected on, but --color-${token} is not in ` +
      `the @theme bridge, so Tailwind never generates that class and it paints nothing`,
  );
}

/* -- 6 · resolve var() chains ----------------------------------------------- */

const { resolveLight, resolveDark } = model;

/* -- 7 · report ------------------------------------------------------------- */

const banner = (s) => `\n${s}\n${"-".repeat(s.length)}`;

if (fail.length) {
  console.error(banner("build-tokens: FAILED"));
  for (const f of fail) console.error("  " + f);
  console.error("");
  process.exit(1);
}

/* -- 8 · emit --------------------------------------------------------------- */

const tokens = {};
for (const [k, v] of light) {
  const rl = resolveLight(v, k);
  const dv = darkExplicit?.has(k) ? darkExplicit.get(k) : v;
  const rd = resolveDark(dv, k);
  const entry = { light: rl };
  if (rd !== rl) entry.dark = rd;
  if (v.includes("var(")) entry.raw = v;
  if (/GAP/.test(raw.slice(Math.max(0, raw.indexOf(k) - 400), raw.indexOf(k)))) {
    // best-effort: the nearest preceding comment mentions a GAP
    entry.unresolved = true;
  }
  tokens[k] = entry;
}

const doc = {
  $comment:
    "GENERATED by foundations/tokens/build-tokens.mjs from tokens.css. Do not hand-edit. " +
    "Names are the commission's (section 4); values are the kwapso design kit's.",
  generatedFrom: "foundations/tokens/tokens.css",
  base: { remBase: "16px", rootRenders: "15px", scales: { small: "13px", medium: "15px", large: "17px" } },
  themes: ["light", "dark"],
  counts: {
    declared: light.size,
    flipInDark: darkExplicit?.size ?? 0,
    unresolvedFlagged: Object.values(tokens).filter((t) => t.unresolved).length,
  },
  tokens,
};

const rendered = JSON.stringify(doc, null, 2) + "\n";

/* -- 8b · THE STALE-ARTIFACT GUARD -------------------------------------------
   `--check` used to run the four guards and write nothing, and "wrote
   nothing" was quietly reported as a pass. So `tokens.json` could disagree
   with `tokens.css` indefinitely and the gate would stay green — which is not
   a hypothetical: on 2026-09-07 it was found still carrying BOTH of that
   evening's colour bugs (`--surface-record-footer` dark as `#26241F`, and no
   dark half for `--dot-building` at all) days after `tokens.css` had been
   corrected. It had to be found by a person reading a file.

   THAT IS THE SAME SHAPE OF HOLE AS THE ONE THE CONTRAST LAW EXISTS FOR: a
   generated artifact that can contradict its source and still pass is a
   second, silent opinion about what a token is. A consuming app that reads
   `tokens.json` — which is the only reason it is generated — would have been
   shipping the pre-fix colours with a green build behind it.

   So `--check` now COMPARES. It still writes nothing; it renders the document
   it would have written and fails if that is not what is on disk, naming the
   first token that differs so the message is actionable rather than a diff
   the reader has to go and take themselves. `npm run build:tokens` is the
   fix, and it is one command.                                              */
if (CHECK_ONLY) {
  let onDisk = null;
  try { onDisk = readFileSync(OUT, "utf8"); } catch { /* missing counts as stale */ }
  if (onDisk !== rendered) {
    let where = onDisk === null ? "the file does not exist" : "it is out of date";
    if (onDisk !== null) {
      try {
        const was = JSON.parse(onDisk).tokens ?? {};
        const names = new Set([...Object.keys(was), ...Object.keys(tokens)]);
        const differing = [...names].filter(
          (n) => JSON.stringify(was[n]) !== JSON.stringify(tokens[n]),
        );
        if (differing.length)
          where =
            `${differing.length} token(s) differ, first: ${differing.slice(0, 4).join(", ")}` +
            (differing.length > 4 ? " …" : "");
      } catch { where = "it is not readable as the document this generator writes"; }
    }
    console.error(banner("build-tokens: FAILED"));
    console.error(`  STALE GENERATED FILE — ${OUT}`);
    console.error(`  ${where}.`);
    console.error(
      "  tokens.json is generated FROM tokens.css and is the copy a consuming app reads.\n" +
        "  A generated artifact that can disagree with its source and still pass the gate is\n" +
        "  a second opinion about what a token is, which is the whole subject of the contrast\n" +
        "  law next door. Regenerate it:  npm run build:tokens",
    );
    console.error("");
    process.exit(1);
  }
} else writeFileSync(OUT, rendered);

console.log(banner("build-tokens: OK"));
console.log(`  declared on :root        ${light.size}`);
console.log(`  redefined in dark        ${darkExplicit?.size ?? 0}  (x2 blocks, identical)`);
console.log(`  guards                   drift OK · orphans OK · px OK · selectors OK`);
if (warn.length) {
  console.log(`\n  ${warn.length} warning(s):`);
  for (const w of [...new Set(warn)]) console.log("    " + w);
}
console.log(CHECK_ONLY ? "\n  --check: nothing written\n" : `\n  wrote ${OUT}\n`);
