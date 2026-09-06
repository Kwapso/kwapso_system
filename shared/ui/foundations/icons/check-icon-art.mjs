#!/usr/bin/env node
/* ============================================================================
   check-icon-art.mjs
   Every glyph is the glyph its name promises.

     node foundations/icons/check-icon-art.mjs             (offline, CI, fatal)
     node foundations/icons/check-icon-art.mjs --refresh    (network, rewrites
                                                             the manifest)

   WHY THIS FILE EXISTS
   `generate-icons.mjs` checks that a glyph is WELL FORMED — a legal export
   name, a viewBox, no hardcoded colour, no orphan class. It has never checked
   that the glyph is the RIGHT PICTURE, because the folder has no upstream
   dependency: the art arrives by hand, one `.svg` dropped per named export,
   and a hand-dropped file is exactly as authoritative as whoever dropped it.

   Two glyphs have already shipped wrong, and BOTH were found by eye rather
   than by a check:

     · `Check.svg` held Phosphor's `check-square-fill` art — a filled rounded
       rectangle — under the name `Check`. It went out to ten sites. The name
       was right, the file was well formed, every guard in `generate-icons.mjs`
       passed, and the product drew a filled box wherever it meant a tick.
       Fixed 2026-09-06.
     · `Asterisk.svg` held the FILL weight where the client had asked for
       regular — a solid disc with the star knocked out of it, which at tab
       size reads as a dot with some texture. Fixed 2026-09-06.

   Both are the same failure with two faces: **nothing in this repository knew
   what the art was supposed to look like.** A name is not evidence. This file
   supplies the missing evidence and makes it fatal.

   WHAT IS COMPARED
   The ART, not the file. `artKey()` below reduces a drawing to its
   geometry-bearing attributes in document order, so a reformat, a re-indent,
   a different `xmlns` or a rewritten root `<svg>` all compare equal while any
   change to a single coordinate does not. That matters because the vendoring
   is allowed to normalise a file on the way in (it did for the Iconoir pack —
   see ATTRIBUTION.md) and a check that compared bytes would cry wolf every
   time it did, which is how a check gets deleted.

   ══════════════════════════════════════════════════════════════════════════
   WHY IT RUNS OFFLINE, AND WHY THAT IS THE STRONGER CHECK, NOT THE WEAKER ONE
   ══════════════════════════════════════════════════════════════════════════
   The obvious design fetches Phosphor at check time and diffs. It is worse,
   for three reasons and the third is the real one.

   1. A CHECK THAT NEEDS THE NETWORK IS A CHECK THAT GETS TURNED OFF. `npm run
      check` gates the tag. Wire it to a CDN and it goes red on a DNS blip, a
      rate limit, or an aeroplane — and the first time it fails for a reason
      nobody caused, somebody adds `|| true` and the guard is gone while still
      appearing to run. The `Check` bug survived because a check that did not
      exist looks exactly like a check that always passes; a check that is
      always skipped looks the same again.

   2. THE NETWORK IS NOT AN AUTHORITY ON WHAT WE DECIDED. Upstream ships new
      versions. If `@phosphor-icons/core` redraws a glyph in 2.2.0, a live
      diff reports OUR CORRECT FILE as wrong and invites somebody to "fix" a
      glyph nobody asked to change. The manifest pins the pack VERSION beside
      every hash, so the question this check asks is the answerable one — "is
      this still the art we verified against 2.1.1?" — and a deliberate pack
      upgrade is a `--refresh` with a reviewable diff.

   3. IT WOULD RE-DERIVE THE ANSWER FROM A SOURCE IT CANNOT AUTHENTICATE AT
      CHECK TIME. A CDN response is trusted on the strength of TLS and
      whoever holds the npm token. Recording the hash once, in a file that
      goes through review with everything else, means a later change to the
      art has to get past a human reading a diff — which is precisely the
      control that was missing when a filled square shipped as a tick.

   So the manifest is the authority and the network is only ever used to BUILD
   it. `--refresh` is a deliberate, human-run act.

   THE MANIFEST MUST BE COMPLETE, AND AN UNKNOWN GLYPH IS A FAILURE
   The folder is the contract: any `.svg` dropped here becomes an export. So a
   file with no manifest entry is a glyph that NOBODY HAS EVER COMPARED
   against upstream — the exact state `Check.svg` was in for its whole shipping
   life. It is fatal, and the message says to run `--refresh`, which is the
   act of looking at the real art. The reverse (a manifest entry with no file)
   is fatal too: it means an export vanished silently.

   Guards, all fatal:
     · a glyph on disk with no manifest entry        (never verified)
     · a glyph whose art no longer hashes as recorded (art changed under us)
     · a manifest entry with no glyph on disk         (export disappeared)
     · a manifest that is missing or unreadable       (the check is not running)
   ============================================================================ */

import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(HERE, "icon-art.manifest.json");
const REFRESH = process.argv.includes("--refresh");

/* The pack this folder is vendored from, pinned. `--refresh` fetches THIS
   version and no other: an upgrade is someone editing this line on purpose,
   with the resulting manifest diff in front of them, rather than a check that
   quietly follows `latest` and redefines "correct" between two runs. */
const PACK = "@phosphor-icons/core";
const PACK_VERSION = "2.1.1";

/* Phosphor ships six weights. Regular is unsuffixed; the rest carry their own
   name. Kept in one place because `--refresh` walks it and the failure
   messages quote it. */
const WEIGHTS = ["regular", "bold", "fill", "duotone", "light", "thin"];

/* -- the comparison key ----------------------------------------------------- */

/**
 * Reduce a drawing to its geometry. Every shape element in document order,
 * each flattened to the attributes that decide what a reader SEES — path
 * data, positions, radii, points, and the opacity duotone uses to hold its
 * two tones apart.
 *
 * Deliberately NOT a byte hash of the file. The root `<svg>` carries `xmlns`,
 * `fill` and formatting that vendoring is allowed to normalise (ATTRIBUTION.md
 * records four such fixes applied to the Iconoir pack), and a check that
 * failed on those would be failing on things nobody can see. Deliberately not
 * a rendered raster either: rasterising needs a headless browser in `npm run
 * check`, and two glyphs that differ by one coordinate can rasterise
 * identically at 16px, which is the size these are drawn at.
 */
function artKey(raw) {
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "");
  const parts = [];
  const shape = /<(path|circle|rect|ellipse|line|polyline|polygon)\b([^>]*)>/g;
  let m;
  while ((m = shape.exec(inner)) !== null) {
    const attrs = m[2];
    const grab = (n) => {
      const a = attrs.match(new RegExp(`\\b${n}\\s*=\\s*"([^"]*)"`));
      /* Whitespace inside path data is not meaningful — `L96,188` and
         `L 96 , 188` draw one line — but it is exactly what a formatter
         changes. Collapse it so the check survives a reformat. */
      return a ? a[1].replace(/\s+/g, " ").trim() : "";
    };
    parts.push(
      m[1] +
        "|" +
        ["d", "cx", "cy", "r", "x", "y", "width", "height", "rx", "ry",
         "x1", "y1", "x2", "y2", "points", "opacity", "fill-opacity"]
          .map(grab)
          .join(",")
    );
  }
  return parts.join(";");
}

const artHash = (raw) => createHash("sha256").update(artKey(raw)).digest("hex").slice(0, 16);

const localGlyphs = () =>
  readdirSync(HERE)
    .filter((f) => f.endsWith(".svg"))
    .map((f) => f.slice(0, -4))
    .sort();

/* ==========================================================================
   --refresh — the only path that touches the network
   ========================================================================== */

if (REFRESH) {
  /* ONE request for the whole pack, not 9,072. The npm tarball carries every
     weight of every glyph, so a full re-derivation costs a single download of
     about 1.4MB. Fetching per-glyph from a CDN would be 9,072 round trips to
     answer one question, which is rude to the CDN and slow enough that
     somebody would narrow it to "just the ones we use" — and "just the ones
     we use" is how a wrong glyph waits in the folder for the screen that
     finally draws it. */
  const url = `https://registry.npmjs.org/${PACK}/-/core-${PACK_VERSION}.tgz`;
  process.stdout.write(`fetching ${PACK}@${PACK_VERSION} … `);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`\nFAILED — ${url} returned ${res.status}`);
    process.exit(1);
  }
  const work = mkdtempSync(join(tmpdir(), "phosphor-"));
  try {
    writeFileSync(join(work, "core.tgz"), Buffer.from(await res.arrayBuffer()));
    /* `tar` rather than a dependency: this folder's whole point is that it
       has no upstream dependency, and adding one to the tool that verifies
       that would be funny in the wrong way. Every platform this repo builds
       on ships bsdtar or GNU tar. */
    execFileSync("tar", ["xzf", "core.tgz", "package/assets"], { cwd: work });
    console.log("ok");

    /* Index the ENTIRE upstream set, every weight, art -> the names that draw
       it. Searching the whole set rather than the matching name is the point:
       the `Check` defect was art belonging to a DIFFERENT NAME, and a check
       that only ever compared `Check.svg` to `check.svg` would have reported
       "no match" without ever being able to say the useful thing, which is
       "this is `check-square-fill`". */
    const byArt = new Map();
    for (const w of WEIGHTS) {
      const dir = join(work, "package", "assets", w);
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".svg")) continue;
        const upstream = w === "regular" ? f.slice(0, -4) : f.slice(0, -(w.length + 5));
        const key = artKey(readFileSync(join(dir, f), "utf8"));
        if (!byArt.has(key)) byArt.set(key, []);
        byArt.get(key).push({ upstream, weight: w });
      }
    }

    const glyphs = {};
    const unmatched = [];
    for (const name of localGlyphs()) {
      const raw = readFileSync(join(HERE, `${name}.svg`), "utf8");
      const hits = byArt.get(artKey(raw)) ?? [];
      if (hits.length === 0) {
        /* Recorded, not "fixed". A glyph that matches nothing upstream is
           either hand-drawn or from another set, and either way inventing
           path data for it is the failure mode this whole file exists to
           prevent. It still gets a hash, so it is still frozen against
           silent change — we simply cannot name what it is. */
        unmatched.push(name);
        glyphs[name] = { upstream: null, weight: null, art: artHash(raw) };
        continue;
      }
      /* Prefer the entry whose upstream name matches this export, so a glyph
         drawn identically at two weights (an empty battery is the same
         picture filled or not) is recorded under its own name rather than
         under whichever weight the loop happened to reach first. */
      const kebab = name
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();
      const self = hits.filter((h) => h.upstream === kebab);
      const pick = self[0] ?? hits[0];
      glyphs[name] = { upstream: pick.upstream, weight: pick.weight, art: artHash(raw) };
    }

    const next = {
      _: "GENERATED by check-icon-art.mjs --refresh. Each glyph's art, hashed, " +
         "with the upstream name and weight it was verified against. Reviewed " +
         "by hand: a diff here is a picture changing.",
      pack: PACK,
      version: PACK_VERSION,
      refreshed: new Date().toISOString().slice(0, 10),
      glyphs,
    };

    /* Say what MOVED, so the human running this reads a diff and not a wall.
       A refresh that silently rewrites 1,512 hashes is a rubber stamp. */
    let before = null;
    try { before = JSON.parse(readFileSync(MANIFEST, "utf8")).glyphs; } catch { /* first run */ }
    if (before) {
      const changed = Object.keys(glyphs).filter((n) => before[n] && before[n].art !== glyphs[n].art);
      const added = Object.keys(glyphs).filter((n) => !before[n]);
      const gone = Object.keys(before).filter((n) => !glyphs[n]);
      console.log(`  art changed   ${changed.length}${changed.length ? "  " + changed.join(", ") : ""}`);
      console.log(`  new glyphs    ${added.length}${added.length ? "  " + added.join(", ") : ""}`);
      console.log(`  removed       ${gone.length}${gone.length ? "  " + gone.join(", ") : ""}`);
    }
    writeFileSync(MANIFEST, JSON.stringify(next, null, 1) + "\n");
    console.log(`\n  wrote icon-art.manifest.json — ${Object.keys(glyphs).length} glyphs`);
    if (unmatched.length)
      console.log(`  no upstream match (recorded, NOT changed): ${unmatched.join(", ")}`);
    console.log("");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  process.exit(0);
}

/* ==========================================================================
   the default path — offline, fatal, what CI runs
   ========================================================================== */

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  console.error(
    "\ncheck-icon-art: FAILED\n" + "-".repeat(22) +
    "\n  icon-art.manifest.json is missing or unreadable, so no glyph in this" +
    "\n  folder is being verified against upstream at all. Rebuild it with:" +
    "\n\n      node foundations/icons/check-icon-art.mjs --refresh\n"
  );
  process.exit(1);
}

const fail = [];
const recorded = manifest.glyphs ?? {};
const onDisk = localGlyphs();

for (const name of onDisk) {
  const want = recorded[name];
  if (!want) {
    fail.push(
      `UNVERIFIED — ${name}.svg has no manifest entry, so its art has never been ` +
      `compared against ${PACK}. That is the state Check.svg was in while it shipped ` +
      `a filled square as a tick. Run --refresh.`
    );
    continue;
  }
  const got = artHash(readFileSync(join(HERE, `${name}.svg`), "utf8"));
  if (got !== want.art) {
    const was = want.upstream ? `${want.upstream} (${want.weight})` : "art with no upstream match";
    fail.push(
      `ART CHANGED — ${name}.svg no longer draws what was verified. It was ${was}, ` +
      `hash ${want.art}; it now hashes ${got}. Either the art was replaced (say so, and ` +
      `run --refresh) or the wrong file was dropped over it.`
    );
  }
}

for (const name of Object.keys(recorded))
  if (!onDisk.includes(name))
    fail.push(`GONE — ${name} is in the manifest but ${name}.svg is not in the folder; an export disappeared.`);

if (fail.length) {
  console.error("\ncheck-icon-art: FAILED\n" + "-".repeat(22));
  for (const f of fail) console.error("  " + f);
  console.error("");
  process.exit(1);
}

const unmatched = Object.entries(recorded).filter(([, v]) => v.upstream === null);
console.log("\ncheck-icon-art: OK\n" + "-".repeat(18));
console.log(`  glyphs verified         ${onDisk.length}`);
console.log(`  against                 ${manifest.pack}@${manifest.version} (refreshed ${manifest.refreshed})`);
console.log(`  no upstream match       ${unmatched.length}${unmatched.length ? " — " + unmatched.map(([n]) => n).join(", ") : ""}`);
console.log("  offline: the manifest is the authority, not the network\n");
