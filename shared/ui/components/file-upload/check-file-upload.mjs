#!/usr/bin/env node
/* ============================================================================
   THE FILE-UPLOAD CHECK — pins the client's 17 Sep 2026 ruling ("upload zone
   option B," verbatim in the file's own header) so a later edit that quietly
   undoes it fails here instead of in the next client screenshot. Run by
   `npm run check` beside the token/icon/book/rules/screen-shell/unsaved-
   changes-bar/toolbar-row checks.

   THE RULING'S TWO HALVES, restated as code rather than prose:

     1. THE EMPTY ZONE IS UNCHANGED. `rows.length === 0` still renders the
        full 32×24 padded box (`zoneVariants`) — CH16's own box, untouched by
        this pass.
     2. THE MOMENT A FILE LANDS, THE SAME ELEMENT BECOMES A GRID OF TILES,
        NEVER THE OLD ROW LIST. A tile draws the actual picture (or a
        fallback icon + tag) in a square, with the name as a caption UNDER
        it — never the name alone, and never the full padded box kept open
        beside a list.

   A future edit trips one of two ways, and this file is written to catch
   both by name:
     · "keeps the full-size zone after a file lands" — the tiled branch
       reaching for `zoneVariants` (the padded-box classes) instead of, or
       alongside, the grid.
     · "draws names without tiles" — `FileUploadTile` printing `file.name`
       with no square media box (a picture or an icon) next to it, which is
       exactly the old row shape this pass replaced.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "file-upload.tsx");

const src = fs.readFileSync(FILE, "utf8");

const findings = [];

function between(startMarker, fromIndex, endMarker) {
  const start = src.indexOf(startMarker, fromIndex);
  if (start === -1) return null;
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return null;
  return { start, end, text: src.slice(start, end) };
}

/* ── 1 · THE GRID IS `auto-fill`, NEVER `auto-fit` ───────────────────────
   The whole "two files stay 5.5rem, they do not balloon to fill the row"
   guarantee lives in this one word — see the file header's "OPTION B"
   section for why `auto-fit` is the regression, not a simplification. */
const gridConstMatch = src.match(/const TILE_GRID_CLASS = "([^"]*)"/);
if (!gridConstMatch) {
  findings.push('could not find `const TILE_GRID_CLASS = "…"` — the tile grid\'s own column/gap declaration.');
} else {
  const gridClasses = gridConstMatch[1];
  if (!/grid-cols-\[repeat\(auto-fill,minmax\(5\.5rem,1fr\)\)\]/.test(gridClasses)) {
    findings.push(
      `\`TILE_GRID_CLASS\` is ${JSON.stringify(gridClasses)} — missing ` +
        "`grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))]`. The tile size (88px / 5.5rem) and the auto-fill " +
        "behaviour are both the client's own drawing, not a rounder figure this file may substitute.",
    );
  }
  if (/auto-fit/.test(gridClasses)) {
    findings.push(
      "`TILE_GRID_CLASS` reaches for `auto-fit` — `auto-fit` collapses the empty tracks `auto-fill` reserves, so " +
        "a handful of files in a wide zone would stretch to fill the row again, which is the exact bug the 17 Sep " +
        "2026 ruling ('what I dropped is so small and the other remains the same big') was about in the first place.",
    );
  }
  if (!/\bgap-3\b/.test(gridClasses)) {
    findings.push('`TILE_GRID_CLASS` no longer carries `gap-3` (`--space-3`, the token table\'s own "card grid gap").');
  }
}

/* ── 2 · THE EMPTY ZONE STILL RENDERS THE FULL BOX ───────────────────────
   `zoneVariants`'s base array is the 32×24 padded box CH16 draws; Option B
   never touches it, and this check exists to prove that stays true. */
const zoneBase = between("const zoneVariants = cva(\n  [", 0, "],\n  {");
if (!zoneBase) {
  findings.push("could not find `zoneVariants`'s base class array — the empty zone's own 32×24 box.");
} else if (!/px-6 py-8 bg-card/.test(zoneBase.text)) {
  findings.push(
    "`zoneVariants`'s base array no longer reads `px-6 py-8 bg-card` — the empty zone's box has changed shape, " +
      "and Option B's own promise (\"while nothing is uploaded the zone stays exactly as today\") depends on it.",
  );
}

/* ── 3 · THE TILED BRANCH NEVER REACHES FOR `zoneVariants` ───────────────
   "Keeps the full-size zone after a file lands" is exactly a future edit
   that keeps (or restores) `zoneVariants(...)` in the branch that should be
   drawing the grid instead. The two are an if/else over the same
   `className` — anchored on the ternary itself so a reformat that keeps the
   branches distinct still reads correctly. */
const classNameTernary = between("className={\n              tiled\n", 0, "            }\n          >");
if (!classNameTernary) {
  findings.push(
    "could not find the zone's `className={ tiled ? … : … }` ternary — expected right after the zone's " +
      "`onClick={tiled ? undefined : openFromZone}` line. If the branch was restructured, re-anchor this check on " +
      "its new shape rather than deleting the check.",
  );
} else {
  const [tiledBranch, emptyBranch] = classNameTernary.text.split(/\n\s*: /);
  if (!tiledBranch || !/TILE_GRID_CLASS/.test(tiledBranch)) {
    findings.push(
      "the zone's tiled branch (`tiled ? … `) no longer reads `TILE_GRID_CLASS` — once a file has landed the zone " +
        "must become the wrapping grid, not keep drawing the empty box.",
    );
  }
  if (tiledBranch && /zoneVariants\(/.test(tiledBranch)) {
    findings.push(
      "the zone's TILED branch calls `zoneVariants(...)` — THIS IS \"KEEPS THE FULL-SIZE ZONE AFTER A FILE " +
        "LANDS,\" the regression this check exists to catch. `zoneVariants` draws the 32×24 padded box the empty " +
        "zone alone is allowed to keep; a tiled zone must render only `TILE_GRID_CLASS` and its grid siblings.",
    );
  }
  if (!emptyBranch || !/zoneVariants\(\{ state \}\)/.test(emptyBranch)) {
    findings.push(
      "the zone's EMPTY branch (the `:` side of the ternary) no longer calls `zoneVariants({ state })` — the box " +
        "CH16 draws must still be what an empty zone renders.",
    );
  }
}

/* ── 4 · THE ADD TILE CARRIES THE SAME DASHED EDGE, SHRUNK ───────────────
   Option B's own point: the dashed identity moves to one tile, it is not
   invented twice. `addTileVariants` has to share `ZONE_EDGE_CLASSES` with
   `zoneVariants`, not a copy that could drift. */
if (!/variants: \{ state: ZONE_EDGE_CLASSES \}/.test(src) || (src.match(/variants: \{ state: ZONE_EDGE_CLASSES \}/g) ?? []).length < 2) {
  findings.push(
    "expected TWO cva blocks reading `variants: { state: ZONE_EDGE_CLASSES }` — `zoneVariants` and " +
      "`addTileVariants` sharing the one dashed-edge definition. A future edit that copies the edge classes " +
      "inline into `addTileVariants` instead of sharing `ZONE_EDGE_CLASSES` can drift the two dashes apart " +
      "without this check noticing the CONTENT drifted, but it will at least notice the sharing stopped.",
  );
}
if (!/data-slot="file-upload-add-tile"/.test(src)) {
  findings.push('could not find `data-slot="file-upload-add-tile"` — the Add tile Option B\'s grid opens with.');
}

/* ── 5 · A TILE DRAWS A SQUARE MEDIA BOX, NEVER JUST THE NAME ─────────────
   "Draws names without tiles" is a `FileUploadTile` that prints `file.name`
   with no accompanying square box (a picture or a fallback icon) — the old
   row shape this pass replaced. Anchored on the function body so the check
   fails loudly if the whole tile-drawing function disappears. */
const tileFn = between("function FileUploadTile({", 0, "\n/** SI symbols");
if (!tileFn) {
  findings.push(
    "could not find `function FileUploadTile({ … })` (up to the `/** SI symbols` comment that follows it in this " +
      "file). If it moved or was renamed, re-anchor this check rather than deleting it — this is the function the " +
      "whole grid draws one of per file.",
  );
} else {
  if (!/aspect-square w-full overflow-hidden rounded-\[var\(--radius\)\] bg-surface-quiet/.test(tileFn.text)) {
    findings.push(
      "`FileUploadTile` no longer renders a `aspect-square … bg-surface-quiet` media box — a tile without one is " +
        "exactly \"draws names without tiles,\" the regression this check exists to catch: the client's ruling " +
        "was that she wants to SEE the picture, not read a filename.",
    );
  }
  if (!/<Image src=\{file\.preview\}/.test(tileFn.text)) {
    findings.push(
      "`FileUploadTile` no longer renders `<Image src={file.preview} …>` — a tile with a `preview` must draw the " +
        "actual picture, not a generic icon.",
    );
  }
  if (!/KIND_ICON\[kind\]/.test(tileFn.text) || !/KIND_TAG\[kind\]/.test(tileFn.text)) {
    findings.push(
      "`FileUploadTile` no longer renders both `KIND_ICON[kind]` and `KIND_TAG[kind]` for the no-`preview` " +
        "fallback — \"a file-type icon tile with a small type tag,\" in the ruling's own words.",
    );
  }
  if (!/className="truncate text-badge text-ink-tertiary"/.test(tileFn.text)) {
    findings.push(
      '`FileUploadTile` no longer prints the caption as `className="truncate text-badge text-ink-tertiary"` — ' +
        "the name must stay a single ellipsised line under the tile, never a wrapping or multi-line block.",
    );
  }
  if (!/\{file\.name\}/.test(tileFn.text)) {
    findings.push("`FileUploadTile` no longer prints `{file.name}` at all — every tile must still carry its caption.");
  }
  if (!/shadow-\[var\(--hairline-error\)\]/.test(tileFn.text)) {
    findings.push(
      "`FileUploadTile` no longer draws `shadow-[var(--hairline-error)]` for a failed row — a tile is not a drop " +
        "target, so its failure register must stay the same inset-shadow hairline `input.tsx` uses, never a " +
        "second dashed `border`.",
    );
  }
  if (/border-dashed/.test(tileFn.text)) {
    findings.push(
      "`FileUploadTile` now writes `border-dashed` somewhere in its own render — a per-file tile must never grow " +
        "the zone's one dashed edge; that stroke belongs to the Add tile and the empty zone alone.",
    );
  }
}

if (findings.length > 0) {
  console.error("FAIL file-upload check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK file-upload check: the empty zone still renders `zoneVariants`'s full box, the tiled branch renders only " +
    "`TILE_GRID_CLASS` (auto-fill, 5.5rem, gap-3) and never `zoneVariants`, the Add tile shares the zone's own " +
    "dashed edge, and every `FileUploadTile` draws a square media box (a picture, or an icon and its type tag) " +
    "with the name as a caption underneath — never the name alone.",
);
