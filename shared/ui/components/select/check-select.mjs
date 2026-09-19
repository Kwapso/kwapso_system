#!/usr/bin/env node
/* ============================================================================
   THE SELECT FACE CHECK — pins the client's ruling against every way it could
   drift back out, run by `npm run check` beside the token/icon/book/seam
   checks.

   THE RULING, VERBATIM: "every time there is an avatar, I want to also see it
   in the choice component, so I also want to see the avatars here." Law of
   the house: any choice over people, contacts, accounts or apps shows the
   same face the lists show — the photo when there is one, initials on the
   record's tone when there is none — in the OPTIONS and in the TRIGGER's
   chosen value.

   WHY A SOURCE CHECK, MATCHING THIS KIT'S OTHER `check-*.mjs` FILES — there is
   no jsdom/testing-library in this repository (`npm run check` is `tsc
   --noEmit` plus a run of source-reading scripts like this one), so the four
   things below are verified by reading `select.tsx`'s own source rather than
   by mounting the component. `verify/select-faces/page.tsx` is the DOM-
   measured counterpart — photo / initials / none, read live in a browser.

   FOUR THINGS PINNED, so none of them can drift back silently:
     1 · `SelectItem` and `SelectTrigger` both take a `face` prop and both
         render it through the SAME `SelectFaceMark` helper — one function, so
         an option's mark and the trigger's own mark can never draw two
         different fallbacks of the same record.
     2 · `SelectFaceMark` renders through `Avatar`/`AvatarImage`/
         `AvatarFallback` — the kit's own primitive with a real fallback —
         rather than a bare `<img>` with no fallback path.
     3 · The existing `image` prop on `SelectItem` still renders (kept
         working, per the brief) — a call site that has not moved to `face`
         yet does not regress.
     4 · `SelectTrigger`'s chevron takes `ms-auto` when `face` is given, so a
         face slot on the trigger cannot silently push the chevron out of the
         pill the way an un-widened `justify-between` row would.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "select.tsx");

const src = fs.readFileSync(FILE, "utf8");

const findings = [];

/* ── 1 · BOTH `SelectItem` AND `SelectTrigger` CARRY A `face` PROP ──────── */
const itemStart = src.indexOf("export interface SelectItemProps");
const itemEnd = src.indexOf("SelectItem.displayName");
if (itemStart === -1 || itemEnd === -1) {
  console.error(`FAIL select check: could not find \`SelectItem\` in ${FILE}.`);
  process.exit(1);
}
const itemBody = src.slice(itemStart, itemEnd);

const triggerStart = src.indexOf("export interface SelectTriggerProps");
const triggerEnd = src.indexOf("SelectTrigger.displayName");
if (triggerStart === -1 || triggerEnd === -1) {
  console.error(`FAIL select check: could not find \`SelectTrigger\` in ${FILE}.`);
  process.exit(1);
}
const triggerBody = src.slice(triggerStart, triggerEnd);

if (!/face\?:\s*SelectFace/.test(itemBody)) {
  findings.push("`SelectItemProps` no longer declares `face?: SelectFace` — an option can no longer carry a face.");
}
if (!/face\?:\s*SelectFace/.test(triggerBody)) {
  findings.push(
    "`SelectTriggerProps` no longer declares `face?: SelectFace` — the trigger's chosen value can no longer carry a face.",
  );
}

/* ── 2 · BOTH RENDER THROUGH THE SAME `SelectFaceMark` HELPER ───────────── */
if (!/<SelectFaceMark face={face} \/>/.test(itemBody)) {
  findings.push("`SelectItem` no longer renders `<SelectFaceMark face={face} />` — its own face slot has drifted from the trigger's.");
}
if (!/<SelectFaceMark face={face} \/>/.test(triggerBody)) {
  findings.push("`SelectTrigger` no longer renders `<SelectFaceMark face={face} />` — its own face slot has drifted from the option's.");
}

/* ── 3 · `SelectFaceMark` ITSELF RENDERS THE REAL `Avatar` PRIMITIVE ─────
   Not a bare `<img>` — the whole point is a photo-or-initials fallback, the
   same one every record's own row draws. */
const markStart = src.indexOf("function SelectFaceMark(");
const markEnd = markStart === -1 ? -1 : src.indexOf("\n}", markStart) + 2;
if (markStart === -1) {
  findings.push("`SelectFaceMark` is missing — the shared face-rendering function the check expects to pin no longer exists.");
} else {
  const markBody = src.slice(markStart, markEnd);
  if (!/<Avatar\b/.test(markBody)) {
    findings.push("`SelectFaceMark` no longer renders `<Avatar>` — a face slot with no fallback primitive is the bug this check exists to catch.");
  }
  if (!/<AvatarImage\b/.test(markBody) || !/<AvatarFallback\b/.test(markBody)) {
    findings.push("`SelectFaceMark` no longer renders both `<AvatarImage>` and `<AvatarFallback>` — a photo with no initials fallback (or the reverse) breaks the law this checks pins.");
  }
}

/* ── 4 · THE EXISTING `image` PROP ON `SelectItem` STILL RENDERS ───────── */
const itemRenderStart = src.indexOf("const SelectItem = React.forwardRef");
const itemRenderEnd = src.indexOf("SelectItem.displayName");
const itemRenderBody = src.slice(itemRenderStart, itemRenderEnd);
if (!/image\?:\s*string/.test(itemBody)) {
  findings.push("`SelectItemProps` no longer declares `image?: string` — the pre-existing prop must keep working per the brief.");
}
if (!/<img\b[\s\S]*?data-slot="select-item-image"/.test(itemRenderBody)) {
  findings.push("`SelectItem` no longer renders the legacy `<img data-slot=\"select-item-image\">` for `image` — existing call sites would regress.");
}

/* ── 5 · THE TRIGGER'S CHEVRON TAKES `ms-auto` WHEN `face` IS GIVEN ──────
   Otherwise a face slot on the trigger can silently crowd or displace the
   chevron the base `justify-between` used to place unaided. */
const triggerRenderStart = src.indexOf("const SelectTrigger = React.forwardRef");
const triggerRenderEnd = src.indexOf("SelectTrigger.displayName");
const triggerRenderBody = src.slice(triggerRenderStart, triggerRenderEnd);
if (!/face\s*\?\s*"ms-auto"\s*:\s*undefined/.test(triggerRenderBody)) {
  findings.push(
    "`SelectTrigger` no longer gives its chevron `ms-auto` when `face` is set — a face slot could push the chevron out of the pill.",
  );
}
if (!/face\s*\?\s*"justify-start"\s*:\s*undefined/.test(triggerRenderBody)) {
  findings.push(
    "`SelectTrigger` no longer forces `justify-start` when `face` is set — the trigger's own `hideChevron` doc requires a second leading child to opt into `justify-start`, and this prop is the kit's own second child rather than a call site's, so the kit must make that call itself.",
  );
}

if (findings.length > 0) {
  console.error("FAIL select check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK select check: `SelectItem` and `SelectTrigger` both carry a `face` slot rendered through the " +
    "same `SelectFaceMark`/`Avatar` primitive, the legacy `image` prop still renders, and the " +
    "trigger's chevron stays clear of a face — the same face the record's own row draws now shows " +
    "in the options AND in the trigger's chosen value.",
);
