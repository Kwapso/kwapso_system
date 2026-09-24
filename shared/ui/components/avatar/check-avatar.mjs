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

/* ── 5 · A PHOTOGRAPH IS TOLD WHOSE FACE IT IS ───────────────────────────
   Aurora's ruling, 23 Sep 2026, verbatim: "external photos (from contacts)
   gray scale. keep staff nirmal." An outside person's photograph renders
   greyscale; one of our own renders in full colour.

   THIS SECTION EXISTS BECAUSE THE DEFAULT IS COLOUR, AND THE DEFAULT IS
   COLOUR ON PURPOSE. The other choice — defaulting to greyscale — fails
   more LOUDLY (a call site nobody updated greys our own people, and
   somebody notices that morning), and it fails by SAYING SOMETHING FALSE
   about a real person, in every app that vendors this kit, on screens
   nobody here can see. Colour-default never lies: an un-updated mark is
   NOT YET TREATED, never WRONGLY treated. So the loudness is bought here
   instead, where it cannot lie — red at build time, before the thing
   ships, which is louder and earlier than a grey face ever was.

   §5a — the mechanism survives: `AvatarImage` reads `external` off the
   context and puts `grayscale` on the IMAGE's own class list. Both halves
   matter: reading the flag and doing nothing with it passes a prop census
   and draws a contact in full colour, and a `grayscale` on the MARK rather
   than the image would drain the kit's own `brand`/`inverse` fills too.

   §5b — THE CALL-SITE CENSUS, which is the half with the teeth. Every
   component in this kit that renders an `<AvatarImage>` must ALSO hand its
   surrounding `<Avatar>` an `external` (a photograph a call site can supply
   is a photograph that can be a contact's), or name itself in
   `EXTERNAL_NOT_A_PERSON` with the reason its picture is not a person's
   face. A component-only check would pass the day someone adds a tenth
   person-bearing component and forgets, which is exactly the "six of eight
   places" failure this treatment cannot survive: a rule applied nearly
   everywhere is worse than none, because the places it misses become the
   lie.
   ───────────────────────────────────────────────────────────────────── */

/* READ THE EXPRESSION, NOT THE FILE. A first draft of this clause asked only
   whether the words `external` and `grayscale` appeared anywhere inside
   `AvatarImage`, and it PASSED with the utility deleted from the class list —
   because this file's own comment beside that line says both words. A census
   that its own documentation satisfies measures nothing, so both halves are
   pinned POSITIONALLY: the flag must be destructured off the context, and the
   utility must sit inside the `cn(...)` the `<img>`'s own `className` reads,
   guarded by that same flag. Proved by deleting the utility and watching this
   go red. */
const readsFlag = /const\s*\{[^}]*\bexternal\b[^}]*\}\s*=\s*useAvatarContext\(/.test(imageBody);
const graysTheImage = /className=\{cn\(\s*"size-full object-cover",\s*external\s*&&\s*"grayscale"/.test(
  imageBody,
);

if (!readsFlag) {
  findings.push(
    "`AvatarImage` no longer destructures `external` off the avatar context — it cannot know " +
      "whose face it is holding, so an outside person's photograph renders in full colour beside a " +
      "staff one (Aurora, 23 Sep 2026: \"external photos (from contacts) gray scale. keep staff " +
      "nirmal\")."
  );
}

if (!graysTheImage) {
  findings.push(
    "the <img>'s own `className` no longer reads `cn(\"size-full object-cover\", external && " +
      "\"grayscale\", ...)` — either the utility is gone (a contact draws in colour) or it " +
      "moved off the IMAGE onto the MARK, which would also drain the kit's own `brand` mango and " +
      "`inverse` charcoal fills wherever a caller pairs one with an outside face."
  );
}

if (!/external\s*=\s*false/.test(src)) {
  findings.push(
    "`Avatar` no longer defaults `external` to `false` — a call site that has not been told " +
      "whose face it is holding would start greying our own people, which is a FALSE statement " +
      "about a real person rather than an untreated one. See this check's §5 header for why " +
      "the safe default is colour and the loudness lives here instead.",
  );
}

/** A component whose `<AvatarImage>` never holds a PERSON's photograph, so it
 * has nothing to be external or not. Keyed by file, with the reason, and
 * rot-checked both ways below so the list can only shrink: an entry naming a
 * file that no longer renders an `<AvatarImage>` at all has outlived its
 * subject, and an entry on a file that HAS since grown a person's face would
 * be a silent hole. */
const EXTERNAL_NOT_A_PERSON = [
  {
    file: "compositions/screens/company-hub.tsx",
    why: "the mark is a COMPANY's logo, not a person's photograph — the composition's own header says so (\"A supplied logo goes INSIDE it as AvatarImage\"). A company is not one of us or from outside; it is the thing an outside person belongs to.",
  },
];

const KIT_ROOT = path.join(HERE, "..", "..");
const SCAN_DIRS = ["components", "compositions"];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const scanned = SCAN_DIRS.flatMap((d) => walk(path.join(KIT_ROOT, d)))
  .filter((f) => f !== FILE)
  .map((f) => ({ rel: path.relative(KIT_ROOT, f).split(path.sep).join("/"), body: fs.readFileSync(f, "utf8") }))
  .filter((f) => /<AvatarImage\b/.test(f.body));

const exemptFiles = new Set(EXTERNAL_NOT_A_PERSON.map((e) => e.file));

for (const f of scanned) {
  if (exemptFiles.has(f.rel)) continue;
  if (!/\bexternal=\{/.test(f.body)) {
    findings.push(
      `${f.rel} renders an <AvatarImage> but never hands its <Avatar> an \`external\` — an ` +
        "outside person's photograph would draw in full colour here while the rest of the app " +
        "greys theirs, which is worse than not doing it at all: the places the treatment misses " +
        "become the lie. Forward the fact, or name this file in EXTERNAL_NOT_A_PERSON with the " +
        "reason its picture is not a person's face.",
    );
  }
}

for (const entry of EXTERNAL_NOT_A_PERSON) {
  const found = scanned.find((f) => f.rel === entry.file);
  if (!found) {
    findings.push(
      `EXTERNAL_NOT_A_PERSON names \`${entry.file}\`, which renders no <AvatarImage> any more — ` +
        "the line has outlived its subject. Delete it.",
    );
  } else if (/\bexternal=\{/.test(found.body)) {
    findings.push(
      `EXTERNAL_NOT_A_PERSON names \`${entry.file}\`, but that file DOES forward \`external\` now ` +
        "— it draws a person after all. Delete the exemption rather than leaving a hole the " +
        "census steps over.",
    );
  }
}

if (scanned.length === 0) {
  findings.push(
    "the §5b census found no file in this kit rendering an <AvatarImage> at all, which cannot " +
      "be right — the walk is looking in the wrong place and is proving nothing.",
  );
}

if (findings.length > 0) {
  console.error("FAIL avatar check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK avatar check: `AvatarFallback` hides only on \"loaded\", `AvatarImage` unmounts only on " +
    '"error", and the post-mount `complete`/`naturalWidth` read that closes the cache/hydration ' +
    "race (client, 18 Sep 2026) is still in place — the mark and the initials stay mutually exclusive. " +
    `Whose face it is travels too: \`external\` defaults to colour, \`AvatarImage\` greys the IMAGE ` +
    `alone when it is set, and all ${scanned.length} file(s) in this kit that render an <AvatarImage> ` +
    `either forward the fact or say in EXTERNAL_NOT_A_PERSON why their picture is not a person's face ` +
    `(Aurora, 23 Sep 2026: "external photos (from contacts) gray scale. keep staff nirmal").`,
);
