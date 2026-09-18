#!/usr/bin/env node
/* ============================================================================
   THE AVATAR CHECK — pins the client's 18 Sep 2026 report against every way
   it could come back, run by `npm run check` beside the token/icon/book/seam
   checks.

   THE RULING, VERBATIM: "look at first screenshot bug, we see the avatar AND
   the initials! should not be, initials only if avatar is empty. implement
   everywhere."

   THE CAUSE. `AvatarFallback` only ever hid itself on `status === "loaded"`,
   and `AvatarImage` only ever reached that status from its own `onLoad`
   prop. A cached picture — or a server-rendered `<img>` resolved before
   React hydrates and attaches that prop — can finish loading (or fail)
   before the DOM event ever fires; the event fires at nobody, `status`
   stays stuck at `"loading"` forever, and the absolutely-positioned
   fallback never hides even though the photograph is already painted
   underneath it. `components/image/image.tsx` had already measured and
   fixed the identical race for its own `<img>` (comment: "A picture already
   in the browser's cache can finish decoding before React attaches onLoad
   … `complete` is the only way to catch that"); `AvatarImage` did not carry
   the same fix. This check pins three things so none of the three can drift
   back: the fallback's own hide condition, the image's own hide condition,
   and the post-mount `complete`/`naturalWidth` read that closes the race —
   deleting any one of the three silently reintroduces "avatar AND initials".

   THIS IS A STATIC CHECK, MATCHING THIS KIT'S OTHER `check-*.mjs` FILES —
   there is no jsdom/testing-library in this repository (`npm run check` is
   `tsc --noEmit` plus a run of source-reading scripts like this one), so
   "mutually exclusive in the render" is verified by reading the two
   branches' own guard conditions rather than by mounting the component.
   `verify/avatar/page.tsx` is the DOM-measured counterpart — photo / no
   photo / broken URL, read live in a browser — for whoever wants the
   MEASURED proof this file's own header elsewhere asks for.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "avatar.tsx");

const src = fs.readFileSync(FILE, "utf8");

const findings = [];

/* ── 1 · `AvatarFallback` HIDES ITSELF, AND ONLY ON `"loaded"` ───────────
   Pulled out by its own function boundary so a change elsewhere in the file
   can never shift what this check reads. */
const fallbackStart = src.indexOf("const AvatarFallback = React.forwardRef");
const fallbackEnd = src.indexOf("AvatarFallback.displayName");

if (fallbackStart === -1 || fallbackEnd === -1) {
  console.error(`FAIL avatar check: could not find \`AvatarFallback\` in ${FILE}.`);
  process.exit(1);
}

const fallbackBody = src.slice(fallbackStart, fallbackEnd);

if (!/if\s*\(\s*status\s*===\s*"loaded"[^)]*\)\s*return\s*null;/.test(fallbackBody)) {
  findings.push(
    "`AvatarFallback` no longer returns `null` on `status === \"loaded\"` — the initials would " +
      "render over a photograph that already loaded.",
  );
}

/* ── 2 · `AvatarImage` UNMOUNTS ITSELF, AND ONLY ON `"error"` ────────────
   The other half of the mutual exclusion: the fallback hiding is only
   sufficient once the image is actually gone on failure too, or a broken
   photograph would sit as a torn-paper glyph beside (never under, since the
   fallback stays mounted) invisible alt text — the image side of the same
   client sentence, "initials only if avatar is empty". */
const imageStart = src.indexOf("const AvatarImage = React.forwardRef");
const imageEnd = src.indexOf("AvatarImage.displayName");

if (imageStart === -1 || imageEnd === -1) {
  console.error(`FAIL avatar check: could not find \`AvatarImage\` in ${FILE}.`);
  process.exit(1);
}

const imageBody = src.slice(imageStart, imageEnd);

if (!/if\s*\(\s*status\s*===\s*"error"\s*\)\s*return\s*null;/.test(imageBody)) {
  findings.push(
    "`AvatarImage` no longer returns `null` on `status === \"error\"` — a broken photograph would " +
      "stay mounted beside its own fallback.",
  );
}

/* ── 3 · THE CACHE/HYDRATION RACE STAYS CLOSED ───────────────────────────
   The actual defect: `onLoad`/`onError` never fire for an image the browser
   had already resolved before the handler attached, so `status` never left
   `"loading"` and the guard in §1 never tripped. Fixed by reading the node's
   own `complete`/`naturalWidth` right after mount — the same pattern
   `components/image/image.tsx` already uses (`Image`'s own effect reads
   `innerRef.current.complete`/`naturalWidth`) and the one `RecordMark`
   (kwapso_system/shared/web/record-mark.tsx, app-side, not this kit)
   independently found and fixed for the same reason. If this block goes
   missing, §1 and §2 both still pass — each guard is individually correct —
   and the bug comes back anyway, which is exactly why it needs its own
   pinned check rather than relying on the two above. */
if (!/\.complete\b/.test(imageBody)) {
  findings.push(
    "`AvatarImage` no longer reads the image node's own `.complete` after mount — a cached or " +
      "hydrated photograph that resolved before `onLoad`/`onError` attached will leave `status` " +
      'stuck on "loading" forever and the initials will sit on top of it permanently (the exact ' +
      "18 Sep 2026 client report).",
  );
}

if (!/\.naturalWidth\b/.test(imageBody)) {
  findings.push(
    "`AvatarImage` no longer reads the image node's own `.naturalWidth` after mount — the failure " +
      "half of the same cache race (a broken URL that was already resolved) would leave the mark " +
      'stuck on "loading" instead of falling back.',
  );
}

if (!/setStatus\(\s*"loaded"\s*\)/.test(imageBody) || !/setStatus\(\s*"error"\s*\)/.test(imageBody)) {
  findings.push(
    "`AvatarImage`'s post-mount check no longer calls `setStatus(\"loaded\")` and `setStatus(\"error\")` " +
      "for the two outcomes `.complete` can report.",
  );
}

/* ── 4 · THE FORWARDED REF STILL REACHES THE NODE ────────────────────────
   The post-mount check needs its own handle on the node ($3), and a call
   site may also pass its own `ref` — both must land, or the merge silently
   drops one of them. */
if (!/const\s+setRefs\s*=\s*React\.useCallback/.test(imageBody)) {
  findings.push(
    "`AvatarImage` no longer merges an internal ref with the forwarded one (`setRefs`) — the " +
      "post-mount `.complete` check has no node to read.",
  );
}

if (findings.length > 0) {
  console.error("FAIL avatar check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK avatar check: `AvatarFallback` hides only on \"loaded\", `AvatarImage` unmounts only on " +
    '"error", and the post-mount `complete`/`naturalWidth` read that closes the cache/hydration ' +
    "race (client, 18 Sep 2026) is still in place — the mark and the initials stay mutually exclusive.",
);
