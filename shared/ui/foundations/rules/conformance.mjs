#!/usr/bin/env node
/* ============================================================================
   THE CONFORMANCE SEAM — the kit's laws, run against somebody else's source.

   THE CLIENT'S SENTENCE, 7 Sep 2026: *"how we will use the ui kit: as the
   onlly ui&ux input for other apps. i wanna void iteration tehre, so make sure
   rules are good set."*

   A kit that ships components ships half of that. The other half is the rules
   that make the components right, and until this file existed they were prose
   in `docs/RULES.md` — vendored into every consuming app, executed by none of
   them. The consuming app at `kwapso_system` re-derived about fifty-five laws
   of its own by iterating with the client, and two of them (R31 two radii,
   R32 the closed palette) are word-for-word about the KIT's vocabulary. A
   second app would have paid for those two again.

   So the shape is: THE KIT SUPPLIES THE RULES, THE APP SUPPLIES THE PATHS.

       node shared/ui/foundations/rules/conformance.mjs \
            --exemptions web/test/kit-conformance.json \
            web/components web/lib web-portal shared/web

   Nothing about the kit's own directory layout is baked into that line, and
   nothing about the app's is baked into this file.

   ----------------------------------------------------------------------------
   THE FOUR CONSTRAINTS THAT DECIDED THIS FILE'S SHAPE

   1 · IT MUST ARRIVE. `kwapso_system/scripts/sync-design.mjs` copies exactly
       nine entries out of a kit tag: components, compositions, foundations,
       lib, assets, manifest.json, README.md, CHANGELOG.md, docs. A `rules/`
       directory at the repo root would not be one of them — the seam would
       exist upstream and be absent in every app that vendors the kit, which
       is the same as not existing. `foundations/rules/` arrives because
       `foundations` is on that list, beside the tokens these laws read.

   2 · NO DEPENDENCIES, EVER. Inside a consuming app this file sits at
       `shared/ui/foundations/rules/`, where there is no package.json, no
       node_modules and no build step. Node builtins only — no AST parser, no
       glob library, no chalk. Every import in this directory resolves to a
       relative path inside `shared/ui/`.

   3 · IT MUST NOT BE EDITABLE DOWNSTREAM. The app's `vendored-kit` test
       recomputes a content hash over `shared/ui/` and goes red if anything
       there was hand-edited. That is a feature here: an app cannot quietly
       soften a law. Which is precisely why the EXEMPTIONS live outside — in a
       JSON file the app owns, passed in by path. The kit rules; the app
       records its own reviewed exceptions, in its own repo, in its own diff.

   4 · IT MUST RUN ON THE KIT ITSELF, with no arguments, as part of
       `npm run check`. A law the kit does not obey is a law the kit cannot
       ask for.

   ----------------------------------------------------------------------------
   WHAT THE EXIT CODE MEANS

   0   every law passed, no blind spot, and every exemption still earns its
       place.
   1   a finding, a blindness tripwire, or a rotted exemption. All three are
       failures on purpose: a law that cannot see is not a law that passed,
       and an exemption for a violation that no longer exists is a licence
       nobody revoked.

   ----------------------------------------------------------------------------
   ADOPTING THIS IN AN APP — the copy-pasteable version lives in
   `docs/RULES.md` §12. Read it there; it is four steps and one of them is
   optional.
   ========================================================================= */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { sourceFilesUnder, loadExemptions, pad, printFindings } from "./source.mjs";
import * as radii from "./radii.mjs";
import * as palette from "./palette.mjs";
import * as borders from "./borders.mjs";
import * as images from "./images.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_CSS = path.join(HERE, "..", "tokens", "tokens.css");

/** The kit's own source, when nobody named anything else. */
const KIT_ROOT = path.join(HERE, "..", "..");
const KIT_DEFAULT = ["components", "compositions", "lib"].map((d) => path.join(KIT_ROOT, d));
const KIT_EXEMPTIONS = path.join(HERE, "exemptions.json");

export const LAWS = { radii, palette, borders, images };

function parseArgv(argv) {
  const roots = [];
  let exemptions = null;
  let only = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--exemptions") exemptions = argv[++i];
    else if (a.startsWith("--exemptions=")) exemptions = a.slice(13);
    else if (a === "--law") only = argv[++i];
    else if (a.startsWith("--law=")) only = a.slice(6);
    else if (a === "--help" || a === "-h") { usage(); process.exit(0); }
    else if (a.startsWith("-")) { console.error(`unknown flag: ${a}`); usage(); process.exit(2); }
    else roots.push(a);
  }
  return { roots, exemptions, only };
}

function usage() {
  console.log(`
kwapso kit — conformance

  node foundations/rules/conformance.mjs [options] [dir…]

  dir…                  source directories to hold to the kit's laws.
                        Default: the kit's own components/ compositions/ lib/.
  --exemptions <file>   a JSON array of reviewed exceptions this app owns.
                        Default when no dir is given: the kit's own.
  --law <name>          run one law only: ${Object.keys(LAWS).join(", ")}.

  Exit 0 when every law passes with nothing blind and no exemption has rotted.
`);
}

export function conform({ roots, exemptionsFile, only }) {
  const files = [...new Set(roots.flatMap((r) => sourceFilesUnder(r)))].sort();
  const exemptions = loadExemptions(exemptionsFile);
  const chosen = only ? { [only]: LAWS[only] } : LAWS;
  if (only && !LAWS[only]) throw new Error(`no such law: ${only}. Known: ${Object.keys(LAWS).join(", ")}`);

  const results = [];
  for (const [name, law] of Object.entries(chosen)) {
    void name;
    results.push(law.run({ files, tokensCss: TOKENS_CSS, exemptions }));
  }

  /* THE ROT CHECK, run once across every law rather than inside each, because
     an exemption is only unused if NO law used it. */
  const used = new Set();
  for (const r of results) for (const e of r.excused) used.add(e.ex);
  const rotted = [];
  for (const e of exemptions) {
    if (only && e.law !== only) continue;
    const target = files.find((f) => f.split(path.sep).join("/").endsWith(e.where));
    if (!target) rotted.push({ e, why: `no walked file ends with \`${e.where}\` — the exemption is dead` });
    else if (!used.has(e)) rotted.push({ e, why: "the file no longer commits this — the exemption is spent" });
  }

  return { files, results, rotted, exemptions };
}

function report({ files, results, rotted }, roots) {
  let failed = false;

  console.log("kit conformance");
  console.log("---------------");
  console.log(`  roots                    ${roots.map((r) => path.relative(process.cwd(), r) || ".").join("  ")}`);
  console.log(`  files walked             ${files.length}`);
  console.log(`  laws run                 ${results.length}  (${results.map((r) => r.law).join(", ")})`);

  for (const r of results) {
    console.log(`\n${r.title}`);
    console.log("-".repeat(r.title.length));
    for (const [label, n, note] of r.derived)
      console.log(`  ${label.padEnd(44)}${pad(n)}${note ? "   " + note : ""}`);
    if (r.unseen.length) {
      console.log("  what this run could not see");
      for (const [label, n] of r.unseen) console.log(`    ${label.padEnd(42)}${pad(n)}`);
    }
    if (r.excused.length) {
      console.log(`  reviewed exceptions in force            ${pad(r.excused.length)}`);
      const byId = new Map();
      for (const x of r.excused) byId.set(x.ex, (byId.get(x.ex) ?? 0) + 1);
      for (const [e, n] of byId) console.log(`    ${e.where}  ×${n}  — ${e.why}`);
    }

    if (r.blind.length) {
      failed = true;
      console.log(`\n  BLIND (${r.blind.length}) — this law could not see its subject, which is not the same as passing`);
      for (const b of r.blind) console.log(`    · ${b}`);
    }

    printFindings(`${r.law}: findings`, r.findings);
    if (r.findings.length) failed = true;
    if (!r.findings.length && !r.blind.length) console.log(`\n  ${r.law}: OK`);
  }

  if (rotted.length) {
    failed = true;
    console.log(`\nROTTED EXEMPTIONS (${rotted.length}) — an exception the code has outgrown`);
    console.log("-".repeat(60));
    for (const { e, why } of rotted) {
      console.log(`  ${e.law} · ${e.where} · ${e.what}`);
      console.log(`      ${why}`);
      console.log(`      → delete the entry. This list may only ever shrink.`);
    }
  }

  console.log(failed ? "\nkit conformance: FAILED" : "\nkit conformance: OK");
  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const { roots, exemptions, only } = parseArgv(process.argv.slice(2));
  const usingKit = roots.length === 0;
  const resolved = usingKit ? KIT_DEFAULT : roots.map((r) => path.resolve(r));
  const exFile = exemptions ?? (usingKit ? KIT_EXEMPTIONS : null);

  if (!usingKit && !exFile && fs.existsSync(KIT_EXEMPTIONS))
    console.log("note: no --exemptions given; this run allows no exceptions of its own.\n");

  try {
    process.exit(report(conform({ roots: resolved, exemptionsFile: exFile, only }), resolved));
  } catch (err) {
    console.error(`kit conformance: ${err.message}`);
    process.exit(2);
  }
}
