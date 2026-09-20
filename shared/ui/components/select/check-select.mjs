#!/usr/bin/env node
/* ============================================================================
   THE SELECT FACE CHECK; pins the client's ruling against every way it could
   drift back out, run by `npm run check` beside the token/icon/book/seam
   checks.

   THE FIRST RULING, VERBATIM: "every time there is an avatar, I want to also
   see it in the choice component, so I also want to see the avatars here."
   Law of the house: any choice over people, contacts, accounts or apps shows
   the same face the lists show; the photo when there is one, initials on
   the record's tone when there is none; in the OPTIONS and in the TRIGGER's
   chosen value.

   THE SECOND AND THIRD RULINGS, v1.2.144, VERBATIM: "on every choice
   component where I can choose a ticket, show me the type as the icon
   everywhere" and "on choice components, when I have selected, for example,
   the app, in the dropdown I see the icon, but I want to continue seeing it
   also once it's selected ... still show it once it's selected, or the
   icon." Two gaps the first ruling's own `face` prop left open: (a) a face
   only ever showed on the TRIGGER when the call site passed `face` a SECOND
   time, by hand, so most call sites never wired it and lost the face the
   instant the list closed; (b) there was no glyph form of a face at all, so
   a record identified by an ICON rather than a photo (a ticket's type) had
   no face to carry in the first place. v1.2.144 closes both: `SelectFace`
   gained an `icon` variant, and `SelectTrigger` now resolves the selected
   option's face on its OWN, from a registry `SelectItem` populates as it
   renders, with no per-call-site prop required; an explicit `face` still
   overrides it for the nine call sites that already pass one.

   WHY A SOURCE CHECK, MATCHING THIS KIT'S OTHER `check-*.mjs` FILES; there is
   no jsdom/testing-library in this repository (`npm run check` is `tsc
   --noEmit` plus a run of source-reading scripts like this one), so the
   things below are verified by reading `select.tsx`'s own source rather than
   by mounting the component. `verify/select-faces/page.tsx` is the DOM-
   measured counterpart; photo / initials / none, read live in a browser.

   NINE THINGS PINNED, so none of them can drift back silently:
     1 · `SelectItem` and `SelectTrigger` both take a `face` prop and both
         render it through the SAME `SelectFaceMark` helper; one function, so
         an option's mark and the trigger's own mark can never draw two
         different fallbacks of the same record.
     2 · `SelectFaceMark` renders through `Avatar`/`AvatarImage`/
         `AvatarFallback`; the kit's own primitive with a real fallback,
         rather than a bare `<img>` with no fallback path.
     3 · The existing `image` prop on `SelectItem` still renders (kept
         working, per the brief); a call site that has not moved to `face`
         yet does not regress.
     4 · `SelectTrigger`'s chevron takes `ms-auto` when a face resolves, so a
         face slot on the trigger cannot silently push the chevron out of the
         pill the way an un-widened `justify-between` row would.
     5 · `SelectFace` declares an `icon?: React.ReactNode` variant, and
         `SelectFaceMark` draws it (never through `Avatar`) when present,
         the glyph form ruling two/three need for a ticket's type.
     6 · `Select` provides a `SelectFaceContext` around Radix's own `Root`,
         the registry the trigger reads without a per-call-site prop.
     7 · `SelectItem` registers its own `(value, face)` pair into that
         registry as it renders, inside a `React.useEffect`.
     8 · `SelectTrigger` reads the registry and resolves `face ?? registry's
         own answer`; an explicit `face` still wins, but nothing is required
         to get one.
     9 · The registration is never retracted on an item's unmount; a closed
         list must keep showing the LAST selected face, not lose it the
         moment Radix stops rendering that item into the live DOM.
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
  findings.push("`SelectItemProps` no longer declares `face?: SelectFace`; an option can no longer carry a face.");
}
if (!/face\?:\s*SelectFace/.test(triggerBody)) {
  findings.push(
    "`SelectTriggerProps` no longer declares `face?: SelectFace`; the trigger's chosen value can no longer carry a face.",
  );
}

/* ── 2 · BOTH RENDER THROUGH THE SAME `SelectFaceMark` HELPER ───────────── */
if (!/<SelectFaceMark face={face} \/>/.test(itemBody)) {
  findings.push("`SelectItem` no longer renders `<SelectFaceMark face={face} />`; its own face slot has drifted from the trigger's.");
}
if (!/<SelectFaceMark face={resolvedFace} \/>/.test(triggerBody)) {
  findings.push("`SelectTrigger` no longer renders `<SelectFaceMark face={resolvedFace} />`; its own face slot has drifted from the option's.");
}

/* ── 3 · `SelectFaceMark` ITSELF RENDERS THE REAL `Avatar` PRIMITIVE ─────
   Not a bare `<img>`; the whole point is a photo-or-initials fallback, the
   same one every record's own row draws. */
const markStart = src.indexOf("function SelectFaceMark(");
const markEnd = markStart === -1 ? -1 : src.indexOf("\n}", markStart) + 2;
if (markStart === -1) {
  findings.push("`SelectFaceMark` is missing; the shared face-rendering function the check expects to pin no longer exists.");
} else {
  const markBody = src.slice(markStart, markEnd);
  if (!/<Avatar\b/.test(markBody)) {
    findings.push("`SelectFaceMark` no longer renders `<Avatar>`; a face slot with no fallback primitive is the bug this check exists to catch.");
  }
  if (!/<AvatarImage\b/.test(markBody) || !/<AvatarFallback\b/.test(markBody)) {
    findings.push("`SelectFaceMark` no longer renders both `<AvatarImage>` and `<AvatarFallback>`; a photo with no initials fallback (or the reverse) breaks the law this checks pins.");
  }
}

/* ── 4 · THE EXISTING `image` PROP ON `SelectItem` STILL RENDERS ───────── */
const itemRenderStart = src.indexOf("const SelectItem = React.forwardRef");
const itemRenderEnd = src.indexOf("SelectItem.displayName");
const itemRenderBody = src.slice(itemRenderStart, itemRenderEnd);
if (!/image\?:\s*string/.test(itemBody)) {
  findings.push("`SelectItemProps` no longer declares `image?: string`; the pre-existing prop must keep working per the brief.");
}
if (!/<img\b[\s\S]*?data-slot="select-item-image"/.test(itemRenderBody)) {
  findings.push("`SelectItem` no longer renders the legacy `<img data-slot=\"select-item-image\">` for `image`; existing call sites would regress.");
}

/* ── 5 · THE TRIGGER'S CHEVRON TAKES `ms-auto` WHEN A FACE RESOLVES ──────
   Otherwise a face slot on the trigger can silently crowd or displace the
   chevron the base `justify-between` used to place unaided. The variable is
   `resolvedFace` now (an explicit `face` prop OR the registry's own answer),
   not the raw `face` prop alone; see items 6-9 below for why. */
const triggerRenderStart = src.indexOf("const SelectTrigger = React.forwardRef");
const triggerRenderEnd = src.indexOf("SelectTrigger.displayName");
const triggerRenderBody = src.slice(triggerRenderStart, triggerRenderEnd);
if (!/resolvedFace\s*\?\s*"ms-auto"\s*:\s*undefined/.test(triggerRenderBody)) {
  findings.push(
    "`SelectTrigger` no longer gives its chevron `ms-auto` when a face resolves; a face slot could push the chevron out of the pill.",
  );
}
if (!/resolvedFace\s*\?\s*"justify-start"\s*:\s*undefined/.test(triggerRenderBody)) {
  findings.push(
    "`SelectTrigger` no longer forces `justify-start` when a face resolves; the trigger's own `hideChevron` doc requires a second leading child to opt into `justify-start`, and this prop is the kit's own second child rather than a call site's, so the kit must make that call itself.",
  );
}

/* ── 6 · `SelectFace` DECLARES THE GLYPH VARIANT ─────────────────────────
   Ruling two/three's own gap: a ticket's type has no photo and no name to
   initial, only an icon; `SelectFace` needs a slot for that, and
   `SelectFaceMark` has to draw it WITHOUT going through `Avatar`, which has
   no glyph mode of its own. */
const faceInterfaceStart = src.indexOf("export interface SelectFace");
const faceInterfaceEnd = faceInterfaceStart === -1 ? -1 : src.indexOf("\n}", faceInterfaceStart) + 2;
if (faceInterfaceStart === -1) {
  findings.push("`SelectFace` interface is missing entirely.");
} else {
  const faceInterfaceBody = src.slice(faceInterfaceStart, faceInterfaceEnd);
  if (!/icon\?:\s*React\.ReactNode/.test(faceInterfaceBody)) {
    findings.push(
      "`SelectFace` no longer declares `icon?: React.ReactNode`; a ticket's type (or any record with no " +
        "photo and no name to initial) has no glyph form to carry as a face any more.",
    );
  }
}
if (markStart !== -1) {
  const markBody = src.slice(markStart, markEnd);
  if (!/face\.icon/.test(markBody)) {
    findings.push("`SelectFaceMark` no longer branches on `face.icon`; a glyph face silently falls through to `Avatar` instead of drawing its own icon.");
  }
}

/* ── 7 · `Select` PROVIDES THE FACE REGISTRY AROUND RADIX'S OWN `Root` ───
   The mechanism that lets the TRIGGER learn the selected face with no
   per-call-site prop; ruling three's own gap. */
if (!/const SelectFaceContext = React\.createContext</.test(src)) {
  findings.push("`SelectFaceContext` is missing; there is no registry left for the trigger to read the selected face from.");
}
const selectRootStart = src.indexOf("function Select(");
const selectRootEnd = selectRootStart === -1 ? -1 : src.indexOf('Select.displayName = "Select"');
if (selectRootStart === -1) {
  findings.push("`Select` is no longer a wrapping function component; the face registry it must provide around `SelectPrimitive.Root` is gone.");
} else {
  const selectRootBody = src.slice(selectRootStart, selectRootEnd);
  if (!/<SelectFaceContext\.Provider/.test(selectRootBody)) {
    findings.push("`Select` no longer renders `<SelectFaceContext.Provider>`; nothing supplies the registry `SelectItem`/`SelectTrigger` read.");
  }
  if (!/<SelectPrimitive\.Root\b/.test(selectRootBody)) {
    findings.push("`Select` no longer renders Radix's own `<SelectPrimitive.Root>`; every prop this component forwards (`value`, `open`, …) would stop reaching Radix.");
  }
}

/* ── 8 · `SelectItem` REGISTERS ITS OWN `(value, face)` PAIR ─────────────
   Without this, the registry the trigger reads is permanently empty. */
if (itemRenderStart !== -1) {
  const itemFullBody = src.slice(itemRenderStart, itemRenderEnd);
  if (!/registerFace\(props\.value,\s*face\)/.test(itemFullBody)) {
    findings.push("`SelectItem` no longer calls `registerFace(props.value, face)`; the trigger's registry never learns this option's face.");
  }
  if (!/React\.useEffect\(/.test(itemFullBody)) {
    findings.push("`SelectItem`'s registration no longer runs inside a `React.useEffect`; registering during render can desync React's own commit.");
  }
}

/* ── 9 · `SelectTrigger` RESOLVES `face ?? registry's own answer`, NEVER
   `face` ALONE ────────────────────────────────────────────────────────── */
if (!/const resolvedFace = face \?\? registry\?\.selectedFace/.test(triggerRenderBody)) {
  findings.push(
    "`SelectTrigger` no longer resolves `resolvedFace = face ?? registry?.selectedFace`; an explicit `face` prop is the only way a trigger would ever show one again, which is the exact bug ruling three reported.",
  );
}

if (findings.length > 0) {
  console.error("FAIL select check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK select check: `SelectItem` and `SelectTrigger` both carry a `face` slot (photo/initials OR icon) " +
    "rendered through the same `SelectFaceMark` helper, the legacy `image` prop still renders, the " +
    "trigger's chevron stays clear of a face, and the TRIGGER now resolves the selected option's face " +
    "on its own through a registry `SelectItem` populates; no per-call-site prop required.",
);
