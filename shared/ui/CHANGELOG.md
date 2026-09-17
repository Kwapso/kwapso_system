# Changelog

## Unreleased

### Added — `FileUpload`'s zone becomes a tile grid the moment a file lands — v1.2.110

Client ruling, 17 Sep 2026, verbatim: *"I like the status when it's empty,
like 'Drop files here' or 'Choose.' That really works, but when I already
drop something, I don't like that what I dropped is so small and the other
remains the same big. … My goal would be that the 'Drop files' becomes
smaller and that I can really see the images that I have already uploaded.
They don't show only as the name, but I also see the image itself, or, if
it's a document, a preview."* Then, choosing among the drawings this put in
front of her: *"upload zone option B."*

Option B, "the zone becomes a tile": the empty zone — the dashed box, "Drop
files here," "Choose" — is UNCHANGED, pixel for pixel. The moment the first
file lands, the SAME `data-slot="file-upload-zone"` element stops being the
32×24 padded box CH16 draws and becomes a CSS grid instead:
`grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr))`, `gap-3`
(`--space-3`, the token table's own "card grid gap" figure). `auto-fill`,
never `auto-fit`, is the one CSS decision the whole redesign turns on:
`auto-fit` collapses empty tracks and hands their space to whatever tiles
exist, so two files in a wide zone would each balloon to fill half the row —
trading the client's exact complaint for a new version of the same bug.
`auto-fill` reserves 5.5rem (88px) tiles regardless of how many siblings a
tile has, which is what "I can really see the images" is asking for.

An Add tile — the dashed box's own next form, sharing its edge classes
(`ZONE_EDGE_CLASSES`) rather than a copy that could drift — sits first, top
left. Every file after it is a tile: `preview`, a new optional field on
`FileUploadItem`, draws the actual picture through the kit's own `Image`
primitive at its default `fit="cover"`; with no `preview`, the tile falls
back to a `KIND_ICON`/`KIND_TAG` pair — a Phosphor glyph already in the kit
and a short type tag ("PDF", "XLS", …) — keyed by a new `kind` field
(`FileUploadFileKind`: `image` / `pdf` / `doc` / `sheet` / `archive` / `audio`
/ `video` / `other`). `kind`, undefined, derives from a third new field,
`type` (a MIME string, e.g. a picked `File`'s own `.type`), through
`deriveKind`; with neither given, a row honestly resolves to `"other"` rather
than guessing from the file name. All three fields are additive — every
existing `FileUploadItem` and every existing call site (`import-wizard.tsx`,
`compositions/templates/import-flow.tsx`) keeps compiling and keeps working,
just without pictures until it starts passing them.

The caption is the file's `name`, one line, ellipsised, under the square —
not beside it. There is no room left for `size` on that one line, so
`formatSize`/`sizeUnits` (both kept, both still spent) move to the tile's
`title` instead of going dead, alongside a string `file.error`, so neither is
silently dropped, just relocated to where a hover or a focus still reaches
it. Remove is an "×" on hover/focus (`X`, top-right corner) — a DELIBERATE,
scoped departure from CH16's "one word, no button" convention, which still
governs the empty zone's browse control and stays the rule everywhere else in
this kit; an 88px square has no room to print "Remove," and the ruling's own
drawing for Option B asks for the icon. A failed tile draws
`shadow-[var(--hairline-error)]` — `input.tsx`'s own expression, an inset
shadow rather than a second dashed edge, because a tile is not a drop target
— and a visible (never hover-gated) `Retry`, with the row list's existing
fallback to `removeLabel` when no `onRetry` is given. An uploading tile lays
the kit's one `Progress` bar across its own bottom edge; the kit has no
separate progress ring, so a bar over the tile is the closest built-in
primitive to the ruling's "ring/bar" phrasing, and `formatProgress` still
reaches assistive technology through `Progress`'s own `formatValue`.

Read-only keeps its own law unchanged ("a system-set value loses its box")
except the box withdrawn is now the Add tile and the drag handlers, not a
whole zone: a read-only `FileUpload` with files still renders the same tile
grid, so a client who cannot add or remove files can still be shown, at
last, the pictures they already sent.

NO NEW COLOUR AND NO NEW RADIUS. Every fill is a token already spent in this
file (`--card`, `--surface-quiet`, `--destructive`) and every rounded corner
is `--radius`, the one this file has always taken — there is no "R60" or any
other second radius anywhere in tokens.css, so the tile takes the same one
the zone already did. ICONS ARE ALL ALREADY IN THE KIT — `FileImage`,
`FilePdf`, `FileDoc`, `FileXls`, `FileZip`, `FileAudio`, `FileVideo`, `File`,
`Plus`, `X`, verified against `foundations/icons/` before use; nothing new
was drawn. NO NEW BORDER EXEMPTION — `foundations/rules/exemptions.json`'s
existing `"what": "*"` entry for this file already blesses every `border`
utility it commits, the Add tile's dashed edge included; the borders law's
own run now shows ×10 uses against that one entry (up from ×3), still
`OK`.

`components/file-upload/check-file-upload.mjs`, new, and wired into
`npm run check`, pins both halves of the ruling as code: the empty zone must
still render `zoneVariants`'s full box, the tiled branch must render only
`TILE_GRID_CLASS` (`auto-fill`, `5.5rem`, `gap-3`) and never `zoneVariants`,
and every `FileUploadTile` must draw a square media box — a picture or an
icon and its tag — with the name as a caption underneath, never the name
alone. Broken deliberately, twice, to prove it catches what it says it
catches before being wired in: reintroducing `zoneVariants(...)` into the
tiled branch fails with "KEEPS THE FULL-SIZE ZONE AFTER A FILE LANDS," and
deleting a tile's media box fails with "draws names without tiles" — the
two regressions named in the brief this pass was built against.

`demo/sections/f-m.tsx`'s `FileUpload` specimen page is extended with five
new panels — empty, three files (a picture, a PDF, a doc), seven files (the
grid wrapping across every `kind`), uploading and failed — alongside the
existing live/translated-strings/loading-disabled-readOnly panels. Every
picture tile in the demo is the demo's own offline placeholder
(`useSlotSrc`, already `Image`/`Video`/`Map`'s convention) — this page makes
no network calls.

### Added — `ToolbarRow` folds `filters`/`viewSwitch` into a `···` popover below its own 48rem — v1.2.109

Client ruling, 17 Sep 2026, verbatim: *"We need to look at the toolbar on
smaller screens. I want everything in one row."* Then, choosing among the
drawings this put in front of her: *"toolbar option B."* Then: *"popover
menu."* Option B: the search field never shrinks or hides; on tablet and
phone widths `filters` and `viewSwitch` (which already carries `SortControl`
beside `ViewSwitch` — this file's own "one slot, not two" ruling) fold into
ONE `···` (More) button beside the action group, opening a popover that holds
the SAME two nodes the caller already passed, a divider between them. `search`,
`period` and `actions` are unaffected at every width — the ruling only ever
named filter, sort and the view switch, and the row's own long-standing
promise ("ONE ROW. AT EVERY WIDTH.") is unchanged: nothing wraps, the fold is
the one exception to "nothing folds," not an exception to "nothing wraps."

THE FOLD IS A CONTAINER QUERY, NOT A VIEWPORT ONE — `@container`
(`container-type: inline-size`) on the row's own root, the kit's first use of
the convention, and the fold pair answers `@min-[48rem]`, never `sm:`/`md:`/
`lg:`. `verify/toolbar-one-row`'s new `narrow-container` specimen proves it:
`typical`'s own props, in a fixed 26rem box, fold at a 1440 viewport while the
plain `typical` specimen two rows up stays fully unfolded at the same
viewport — the two could not both be true if this had been written as a media
query.

THE POPOVER IS THE KIT'S `Popover`, NOT `DropdownMenu` — the one deliberate
difference from the actions overflow beside it, which does use `DropdownMenu`
(and always has). A `DropdownMenu` is Radix `Menu`, `role="menu"`: a list of
commands under arrow-key/typeahead item navigation. `filters` is a `FilterBar`
carrying checkboxes and a text input; `viewSwitch` carries a hand-rolled
`ViewSwitch` with its own roving-focus model. Neither is a command, and
nesting either inside `role="menu"` is an ARIA conflict, not a style choice —
two keyboard models over the same arrow keys. `Popover` is a plain anchored
panel with no item role and no keyboard model of its own. The two caption rows
("Filters" / "Sort & view") and the divider between them are NOT
`DropdownMenuLabel`/`DropdownMenuSeparator` reused under the new host —
those wrap Radix's `DropdownMenuPrimitive.Label`/`.Separator`, which read
`DropdownMenuPrimitive.Root`'s own context and throw when mounted under a
`Popover` instead. They are local copies of the identical class strings
(`FOLD_LABEL_CLASS` / `FOLD_DIVIDER_CLASS`) — same ink, same rule, same
`--radius`, no new colour, no new radius, just no dependency on a menu that
is not there.

TWO RENDERS OF THE SAME PROP, NOT ONE NODE PHYSICALLY RELOCATED. `filters`
and `viewSwitch` are opaque `ReactNode`s; "moved into the popover" is built as
the same node reference placed in two positions (the inline lane block and
the popover panel), gated by the complementary side of one `@min-[48rem]`
query, rather than a single DOM node handed across a `Portal` boundary — the
latter is not a CSS operation (Radix mounts `PopoverContent` into
`document.body` only while open) and would need JavaScript deciding where the
node lives, which this file has never carried and does not start now. The
practical cost, stated rather than hidden: the inline copy stays mounted
(`display: none` under 48rem, so it holds no tab stop and is not read by a
screen reader) and a second, live instance of the same props mounts only
while the popover is open. Every real call site in this repository passes a
FULLY CONTROLLED node (value + `onChange` from outside — see
`verify/toolbar-one-row/page.tsx`'s `switcher`), so both instances render
identically and either one's interaction updates the one source of truth; a
node holding its own uncontrolled UI state would not share it between the two
instances. No call site does that today.

NOT DONE, AND WHY — the reference mock draws "Filter" and "Sort" as their own
labelled rows: an icon, a word, a muted current sort value on one, a count
chip on the other. This file cannot draw that. `filters` and `viewSwitch` are
opaque nodes; `ToolbarRow` is never told how many filters are active or what
a `SortControl` inside `viewSwitch` currently reads, and inventing a count or
a value here would be reporting something this component does not know. What
IS built is the structure the ruling asks the KIT for — one trigger, one
panel, the filters group, a divider, the view-switch group, captioned — with
the live summary left where the data already lives: on `FilterBar` and
`SortControl` themselves, a follow-up those two files would carry, not this
one. Similarly, the kit deliberately carries no dedicated `sort` slot (see
this file's own "WHAT THIS FILE DELIBERATELY DID NOT TAKE FROM THAT
APPLICATION"), so the mock's four-way "Filter, Sort, divider, view switch"
menu is drawn here as the two groups the row's existing props actually
distinguish — `filters`, then `viewSwitch` (which already reads as "Sort,
then the view switch" wherever a caller builds it that way, as every call
site in this repository does).

CHECK — `components/toolbar-row/check-toolbar-row.mjs`, new, wired into
`npm run check`. Pins: the root carries `@container`; the search wrapper
carries no fold gate at all; the inline `filters`/`viewSwitch` blocks and
`foldTrigger` answer `@min-[48rem]` as exact mirrors of each other; exactly
one `ms-auto` (on the shared `toolbar-row-trailing` wrapper, never on
`toolbar-row-actions` or `toolbar-row-fold` individually); the track stays
`flex-nowrap`; and the fold opens through `Popover`, never `DropdownMenu`.
Verified against injected breaks in all seven, each producing the expected
failure, before being left green.

FILES — `components/toolbar-row/toolbar-row.tsx` (the fold itself);
`components/toolbar-row/check-toolbar-row.mjs` (new); `package.json` (wires
the new check into `npm run check`); `verify/toolbar-one-row/page.tsx` (a new
`narrow-container` specimen, fold-state columns in the readout, and the
`REACHABILITY` note updated to state the one width-dependent exception this
ruling introduces rather than the flat "identical at 380 and 1440" claim that
predates it).

### Changed — `PermissionMatrix`: a locked capability takes a solid quiet-grey fill of its own; the row-level "Locked by policy" mark is retired in favour of a per-segment tooltip / `title`

Client ruling, 17 Sep 2026, verbatim: *"In Permissions, the ones that are
locked and cannot be changed, we need a different color, maybe a kind of
solid grayed-out."* And, choosing among the drawings this put in front of
her: *"For how a locked permission should look, I choose option A: solid
gray field."*

THIS OVERTURNS D4-B (2026-08-24) AND D6-B (2026-08-24), both ruled and built
earlier in the same file. D4-B had a locked run draw exactly as a live one,
with the lock stated only as a bare-words mark beside the collection's name
(D6-B). That is reversed: a locked segment now carries a fill of its own, and
the words move off the row onto the one segment they explain.

TOKENS — no new hue, RULES §2.2's closed palette untouched:

  - Fill, both registers — `--surface-quiet` (`bg-surface-quiet`), the kit's
    own quiet surface and already `--btn-disabled-fill`'s value.
  - Ink, HELD locked — `--ink-secondary` (`text-ink-secondary`), the mid-grey.
  - Ink, RELEASED locked — `--ink-disabled` (`text-ink-disabled`), the light
    grey. Both are the "ink-disabled family" `--btn-disabled-label` already
    opens; no fifth ink tier was invented.

MEASURED against `--surface-quiet`, transitions suppressed (script:
`getComputedStyle` read off `verify/permission-locked/`, both palettes):

  - `--ink-secondary` (held-locked): **6.656 light / 7.691 dark** against a
    4.5:1 text floor — clears it in both palettes.
  - `--ink-disabled` (released-locked): **1.817 light / 2.508 dark** —
    deliberately quiet, the same shape this file already accepts for the live
    not-held slot's own edge (1.526 / 2.185 against a 3:1 floor): a capability
    that is both released and locked is the coldest fact on the grid, and
    reading faint is the point.
  - `--surface-quiet` vs `--surface-inverse` (locked fill vs a live held
    fill): **rgb(226, 221, 212) vs rgb(26, 25, 24)** light, unmistakably
    different computed backgrounds.

BEHAVIOUR — a locked segment is not pressable: no hover (`enabled:hover:`
never reaches a `<span>`), no focus ring (never a `<button>`, so tokens.css
§8's global ring has nothing to attach to), `aria-disabled="true"`,
`cursor: default` (not `cursor-not-allowed` — B's cursor argued a point the
fill now makes on its own). The reason is the segment's own `title` and (where
the run is interactive) its `Tooltip`: `"Locked by policy: <role>"`,
`describeLock`'s own formatting, called once per locked segment instead of
once per row.

IT IS PER RIGHT. `PermissionModule.locked` grows a third shape —
`Readonly<Record<string, boolean | readonly string[]>>`, keyed by role id,
`true` for the whole row or a capability-id array for that role alone — so
"one locked letter inside an otherwise editable cell takes the same fill" is
now expressible: a cell can hold a locked capability beside three live,
pressable ones. `PermissionRun` asks `isCapabilityLocked` once per slot
rather than `locked` once per run. Both existing shapes (`boolean` and
`readonly string[]`) are unchanged — RULES §9.1, nothing renamed or dropped.

THE ROW-LEVEL MARK IS RETIRED FROM THE KIT.
`data-slot="permission-matrix-locked"` no longer renders anywhere in this
file — the consuming application was already hiding it. `lockedLabel` and
`formatLockedLabel` are the same two props D4-B/D6-B shipped; only where they
are called moved.

THE LEGEND REGAINS A FOURTH REGISTER. D4-B had removed it because a locked
run drew pixel-identical to "held" or "not held"; the new fill gives the
legend something to translate again, drawn only when a shown cell actually
holds a locked capability (the same restraint the "not offered" register
already follows). New prop: `lockedRegisterLabel`, defaulted `"locked"`.

FILES — `components/permission-matrix/permission-matrix.tsx` (the cell
component and its locked state); `verify/permission-locked/` (new — an
editable cell, a fully locked cell, and a mixed cell with one locked right
beside three live ones, in one grid); `verify/permission-turn/page.tsx`
(claim 6's probe rewritten: it asserted the now-retired row mark and now
asserts its absence plus the per-segment `title` that replaced it).

### Changed — `ScreenShell`'s outer gutters step down one rung: `--shell-gutter`, `--aside-inset`, the header band, the trail and the body all one `--space-*` size smaller

Client ruling, 17 Sep 2026, verbatim: *"Because adding the breadcrumbs took
up considerable screen space, let's reduce the margin that we have on the
sides above and below both the main content and the assistant. Let's
optimize the height. Let's not leave so much blank space there."* Every
block-direction contributor to the outer gutter around the content column
and the aside steps down exactly one rung on the scale already in
`tokens.css` — not an invented pixel value, the same discipline every prior
gutter change in this file follows.

OLD -> NEW (comfortable; both are shown at the kit's own 15px root, ruling
18, not ruling 28's 16px authoring reference):

  - `--shell-gutter` (`DENSITY_GUTTER`, both densities) — `--space-5` ->
    `--space-4`: 18.75px -> 15px. Moves at every one of this token's call
    sites at once: the card's four sides, the content-to-assistant gap, the
    assistant-to-window edge.
  - `--aside-inset` (`DENSITY_ASIDE`, both densities) — `--space-5` ->
    `--space-4`: 18.75px -> 15px, kept equal to `--shell-gutter` (the two
    are documented as "the SAME token at every density").
  - `DENSITY_HEADER` (the card's head band) — comfortable `px-7 pt-7 pb-6`
    (30/30/22.5px) -> `px-6 pt-6 pb-5` (22.5/22.5/18.75px); calm `px-6 pt-6
    pb-5` (22.5/22.5/18.75px) -> `px-5 pt-5 pb-4` (18.75/18.75/15px).
  - `DENSITY_TRAIL` (the in-card trail's horizontal inset, which mirrors
    `DENSITY_HEADER`'s `px` so the back/forward arrows keep landing under
    the title) — comfortable `px-7` -> `px-6`; calm `px-6` -> `px-5`.
  - `DENSITY_BODY` (the card's own content padding) — comfortable `p-6
    lg:p-7` (22.5/30px) -> `p-5 lg:p-6` (18.75/22.5px); calm `p-5 lg:p-6`
    (18.75/22.5px) -> `p-4 lg:p-5` (15/18.75px).
  - `TRAIL_GAP` (the gap between the trail and the head) — `--space-5` ->
    `--space-4`: 18.75px -> 15px.

MEASURED in `verify/unsaved-changes-bar/`'s sibling harness,
`verify/shell-gutter/`, at 1440x900, comfortable, with a rail, an open
aside, a breadcrumb strip and a trail — the shapes that produced the
client's own complaint:

  - the card's own top edge: 47.33px -> 43.58px (-3.75, exactly the
    `--shell-gutter` step; the old figure is the same 47.33 this file's own
    `DENSITY_ASIDE` header already recorded before today).
  - the card's own bottom edge (900px viewport): 881.25px -> 885px (+3.75).
  - the aside's own body: top and bottom move identically to the card's,
    confirming the "same token at every density" invariant held through the
    edit.
  - the card's own scrollable body gains height: comfortable 710.16px ->
    732.67px (+22.51, the compounded `--shell-gutter` + `TRAIL_GAP` +
    `DENSITY_HEADER` steps); calm gains to 743.92px (the smaller header band
    leaves more of the card for content at that density).

THE TAB STRIP'S OWN ATTACHMENT MECHANIC IS UNTOUCHED. `screen-shell-
breadcrumb` (`BreadcrumbFolders`, `components/breadcrumbs/*`, a different
lane's file) still takes no block-end padding of its own and its own
`margin-block-end: calc(var(--folder-tab-overlap) * -1)` is not this edit's
concern — none of the six records above lives inside that slot or changes
how it joins the card.

`--rail-inset` (`DENSITY_RAIL`) IS DELIBERATELY LEFT AT `--space-5`, AND
THAT IS A FLAG, NOT AN OVERSIGHT. Today's ruling names "the main content and
the assistant" — not the rail — and this lane's brief scopes the same way.
Leaving the two apart reopens the 22.5-against-18.75 mismatch
`DENSITY_RAIL`'s own header spent a full ruling closing on 2026-09-06 (now
18.75-against-15 at the kit's 15px root). Whoever next touches the rail's
own gutter should rule on it on purpose rather than let it drift further.

ALSO FLAGGED: `TRAIL_GAP` now reads a different rung than `TABS_STRIP_GAP`
(`components/tabs/tabs.tsx`) and `TOOLBAR_ROW_GAP`
(`components/toolbar-row/toolbar-row.tsx`), which `TRAIL_GAP`'s own header
explicitly reused `--space-5` from — "not a fourth opinion about air." Both
files are outside this lane's ownership; their owner should decide whether
to follow this step or hold the old rung on purpose.

`check-screen-shell.mjs` gained a gutter-shrink check pinning all six
records to their new values, run beside the existing resize-rot check.

Files: `compositions/templates/screen-shell.tsx`,
`compositions/templates/check-screen-shell.mjs`, `verify/shell-gutter/`
(new), `.claude/launch.json`.

### Changed — `UnsavedChangesBar` (`ground="bare"`) is sticky directly under the tab strip; its message steps up to `text-sm`

Client ruling, 17 Sep 2026, verbatim: *"The 'You haven't saved changes'
needs to be floating and visible at all times, directly under the tabs,
even if I'm very down in the scroll. Also, I'm not sure of the size of this
typography. Make sure that this is in the kit because it looks too small."*

STICKY, `ground="bare"` ONLY. Until today `position: sticky` was explicitly
the app's own decision (R63, `shared/web/pinned-chrome.ts`,
`PINNED_TOOLBAR`) and this file drew only the row. That worked while the
row's own container was already sticky at the viewport; it does not work
for a row inside a SCROLLING panel — both real call sites (Settings ›
Appearance, Settings › Team › Roles) — where a sticky ancestor does not
make a static descendant sticky with it, so the bar scrolled out of view
exactly as she described. `bare` — "the ground used under a tab strip", the
one shape both call sites actually render — now carries `position: sticky`
and `top: calc(var(--pinned-chrome-h, 0px) + var(--tab-strip-h, 0px))`
itself; `page`/`panel` are unchanged and stay static, because neither
stands under a tab strip inside a scrolling panel. `z-20` keeps it above
its own scroll container's ordinary content. Both offsets are app-supplied
CSS custom properties with a `0px` fallback each — this file still names no
pixel of its own and still does not know the app's layout, only composes
two numbers the app hands it.

TYPE STEP, ONE RUNG: `text-caption` (`--text-caption`, 13px) ->
`text-sm` (`--text-sm`, 14px) on the message. `Text`'s own ladder
(`components/typography/typography.tsx`) is `caption` (13) -> `sm` (14) ->
`base` (16); `sm` is the next rung, not `base`, which would be two rungs
and more than "looks too small" asked for.

MEASURED in `verify/unsaved-changes-bar/`, both without and with a
stand-in for fixed chrome above the tab strip (`?chrome=1`, testing the
two-offset composition): the bar's own top edge equals the tab strip's own
bottom edge (`barTopMinusStripBottom: 0`) BEFORE scrolling its container
and AFTER scrolling it 1500px — identical rect in both readings, in both
cases (45px under the strip alone; 82.5px under the strip with a 37.5px
chrome band above it, `--pinned-chrome-h` + `--tab-strip-h` composing
exactly). The message's computed font-size reads 13.125px, matching
`--text-sm`'s own resolved length at the kit's 15px root
(`matchesTextSm: true`, `matchesTextCaption: false`) in both cases.

`check-unsaved-changes-bar.mjs` gained checks for the sticky shape (present
on `bare`, absent on `page`/`panel`) and the message's own `text-sm`, run
beside the existing radius/colour checks — confirmed red against the
pre-edit file before the fix landed, green after.

Files: `components/unsaved-changes-bar/unsaved-changes-bar.tsx`,
`components/unsaved-changes-bar/check-unsaved-changes-bar.mjs`,
`verify/unsaved-changes-bar/` (new), `.claude/launch.json`.

### Fixed — `BreadcrumbFolders` tabs NEST, Chrome's own model — the fourth report on this exact silhouette

Client, 17 Sep 2026, verbatim: *"The inactives on the assistant are
overlapping, so they're on top of the active tab, and that's incorrect.
They should be behind."* Measured against two live-staging screenshots
(`live-assistant-boundary-zoom.png`, `live-content-strip-1440.png`): every
tab stood `--space-1` (4px) apart at rest, so two tabs never shared a
pixel — nothing like a Chrome tab strip, where the NEXT tab's rounded
corner sits UNDER the PREVIOUS tab's shoulder. A 4px seam could only ever
produce a gap or, the moment anything tightened it, a square-cornered edge
landing in front of a shoulder — "the inactive is on top" for either
sibling, whichever direction the strip read.

THE FIX IS A REAL, DELIBERATE OVERLAP, NOT A SMALLER GAP. `STRIP` drops
`gap-1` (and now explicitly wins the merge against `BreadcrumbList`'s own
base `gap-1.5` with `gap-0` — simply omitting the override left 6.75px of
unwanted positive space standing, measured). Every tab after the first
carries `TAB_OVERLAP_MARGIN` — `ms-[calc(var(--folder-shoulder)*-1)]` — so
its box sits exactly `--folder-shoulder` under its predecessor's own
shoulder: `overlap == shoulder`, not "roughly nested". The label doesn't
lose room to it: the same tab adds `--folder-shoulder` BACK to its own
leading padding (`TAB_OVERLAP_PS` / `TAB_ICON_ONLY_OVERLAP_PS`), so the box
narrows by the overlap while the visible text stays exactly where it was.

Z-INDEX, NOT DOM ORDER, DECIDES WHO PAINTS ON TOP. `restZIndex(position)` —
`-position`, an INTEGER (CSS's own `z-index` grammar is `auto | <integer>`;
a first draft used fractions in `(0,1)` and the browser silently refused
every one past the leading tab, `getComputedStyle` reading `auto`,
measured) — gives every rest tab its own, strictly DESCENDING number: the
earlier (left) tab always outranks a later one. The live tab keeps its
existing flat `1`, still strictly under the card's `z-[2]`. Written as an
inline `style` on the `<li>` (Tailwind can't emit a class for a value that
depends on render-time position), restored — not cleared to `""` — by
`releaseTransforms` once a drag ends, or every rest tab would have
flattened back to a DOM-order tie the instant a drag finished.

`isolate` ON THE STRIP'S OWN `<ol>` — load-bearing, not decorative. A
negative `z-index` flex item, measured, stops being clickable at all in
real Chromium when its container is not itself a stacking context: CSS
Flexbox's z-order rule paints items "behind the nearest ANCESTOR stacking
context", which for an unpositioned `<ol>` is whatever established one
several DOM levels up — `document.elementFromPoint` at a `z-index: -2`
tab's own centre returned this file's page-level wrapper `<div>`, not the
tab. `isolation: isolate` on the strip contains every child's z-index
comparison locally, restoring ordinary hit-testing.

Proved in `verify/tabstrip-parity/`, rebuilt for this: THREE hosts — content
(rest · active · rest · rest), assistant A (active · iconOnly · iconOnly,
her exact screenshot shape), assistant B (rest · active · iconOnly ·
iconOnly, the active tab NOT first in DOM). `measureNesting` reads, for
every consecutive pair on a REAL RESTING strip, no forcing: the pixel
overlap equals `--folder-shoulder` (`overlapMatchesShoulder`), and
`document.elementFromPoint` at the shared pixel returns the tab that ought
to win — the active tab over either neighbour, and between two rest tabs
the left one (`topElementWinsAsExpected`). All nine pairs across the three
hosts pass. A screenshot (`tabs-nested.png`) shows the geometry with no
notch anywhere the active or an earlier rest tab sits over its neighbour.

Files: `components/breadcrumbs/breadcrumb-folders.tsx`,
`verify/tabstrip-parity/page.tsx`.

### Fixed — `BreadcrumbFolders` tabs are clickable again with `onReorder` wired up

Client, 17 Sep 2026, verbatim: *"after you implemented the drag tabs, I can
no longer click them to open them."* Real clicks on a tab, its ×, or a
pinned tab did nothing — no navigation, no hash change, no console error,
on both strips — measured with Playwright, not guessed: a genuine
`pointerdown`/`pointerup` pair with zero movement, dispatched at a tab's own
anchor, produced a `click` whose `event.target` was the `<li>`, never the
anchor inside it.

THE CAUSE: `setPointerCapture` (`onTabPointerDown`, taken on every
`pointerdown` of a movable tab — drag or plain tap alike, since nothing
distinguishes them until AFTER the gesture) retargets every later pointer
event for that gesture, and the browser's own DERIVED `click`, to the
capturing element — this `<li>` — never the anchor, button or × nested
inside it. An event does not redispatch into descendants of its own
target, so the anchor's native "follow this link" and the ×'s `onClick`
never fired, for a motionless tap exactly as much as for a real drag.

TWO FIXES, IN `onTabPointerEnd` AND `onTabPointerMove`:

  · THE TAP FORWARD — a tap that never became a drag (`!drag.moved`)
    replays its click at `drag.originTarget`, the actual element the
    pointer went down on (captured at pick-up via
    `event.target.closest("a, button")` — NOT `event.target` verbatim,
    which is SVG for an icon glyph and has no native `.click()`).
    `.click()`, called directly on that element, dispatches a fresh click
    targeted exactly where it's called, unaffected by the capture above.
  · `DRAG_MOVE_THRESHOLD_PX` (4) — `onTabPointerMove` used to flag ANY
    nonzero pointer movement as a drag (`deltaX !== 0`), which a real mouse
    or trackpad rarely avoids even on a plain click; below the threshold a
    gesture still counts as a tap and gets the forward above.

Proved in `verify/tabstrip-parity/`'s `measureTapForward`: a genuine
`PointerEvent` pair (pointer id 1, no synthetic click) on a movable rest
tab's own anchor, confirming the click reaches it (`clickTarget: "A"`).
Regression-checked against real drag-to-reorder and the per-tab × with
Playwright mouse events outside the verify harness: a real drag still
reorders and swallows its own trailing click; the × still fires `onClose`.

Files: `components/breadcrumbs/breadcrumb-folders.tsx`.

### Removed — `BreadcrumbFolders`' close-all control, entirely

Client, 17 Sep 2026, verbatim: *"I don't know what it is (this X button
that you added in the tabs in the main content that closes everything),
but no one asked you, so delete it."* `onCloseAll`, `closeAllLabel`,
`CLOSE_ALL_WRAP`, `CLOSE_ALL` and the trailing `<li>` they drew (shipped
v1.2.92, one day before this ruling) are gone, not deprecated — no dead
body left for a later session to trip on. The app's own `closeAllTabs`
wiring (`app-shell.tsx` / `workspace-tabs.ts`) is a different lane's; this
change only ever owed it the prop, and removing the prop is what makes
that call site fail to compile until that lane removes its own side —
the correct, loud signal, not a bug here.

Files: `components/breadcrumbs/breadcrumb-folders.tsx`,
`verify/tabstrip-parity/page.tsx`.

### Added — `BreadcrumbFolders` rest tabs get their own hover fill

Client, 17 Sep 2026, verbatim: *"When I'm hovering over a tab and I'm
talking, both in the main container and in the assistant, I want it to
have a hover color apart from the changes in the text that are already
there."* Until today a rest tab's hover moved only the label (ink + a
weight preview); the paper under it never moved. `CrumbShape` now takes an
optional `hoverFill`: a SECOND `FolderShape`, identical box, stacked on top
of the first, `opacity-0` at rest and `group-hover:opacity-100` — not a
straight swap of the base fill, because `--accent` (the SAME wash token
`TAB_CLOSE`'s own hover already uses on this strip, "the kit's neutral
item wash") is a 5%-alpha rgba designed to be COMPOSITED over an opaque
layer, not to BE one; filling the whole tab with it directly reads as the
tab nearly vanishing rather than gaining a tint. `--kw-crumb-hover` is a
third custom property beside `--kw-crumb-rest`/`--kw-crumb-live`, declared
on the same `<nav>` for TAB-C1's own reason. `group` on the `<li>` is now
UNCONDITIONAL (was gated on `closable`) so the wash survives the pointer
crossing onto the ×, same as the existing weight preview. Only on rest
tabs, icon-only included (`item.iconOnly` never changes which fill a crumb
draws) — never on the live tab: "the active tab does not change on hover"
is the line her own words draw between the two, and `FILL_LIVE`'s two call
sites never pass `hoverFill`.

Verified with a real `page.hover()` (a synthetic event cannot fake a
`:hover` pseudo-class): the hover shape's own computed `opacity` reads `0`
at rest and `1` under a real hover, `color` the `--accent` wash; the live
tab carries no hover shape at all.

Files: `components/breadcrumbs/breadcrumb-folders.tsx`.

### Added — `ScreenShell`'s `trail` slot moves INSIDE the content card; `TrailLine` reverts to paper ink (supersedes the v1.2.104 entry below)

Client ruling, 17 Sep 2026 MORNING, verbatim: *"the breadcrumbs should sit in
the background, outside the container, on top, and on the very far left,
have a back and forward arrow."* Built exactly that way in v1.2.104. SAME
DAY, AFTERNOON, verbatim: *"I love the direction that we are going, but put
the breadcrumbs and the navigation inside the container."* This entry is
that correction — it supersedes the "Added" entry immediately below it,
which described the geometry this one replaces; that entry is left in place
as the record of what shipped first and why, not deleted.

`ScreenShell`'s `trail?: React.ReactNode` slot now renders as `<main>`'s
(the CARD's) OWN FIRST CHILD, above whatever the card's body draws (the
collection heading / record head), instead of as a sibling on the page
ground between the tab strip and the card. Full width of the card's inner
box, with the card's own inset on the left — `DENSITY_TRAIL`, a new record
in `screen-shell.tsx` reading the identical `px-[var(--space-7)]` /
`px-[var(--space-6)]` `DENSITY_HEADER` already spends, so the arrows land
exactly under the title's own left edge, provably rather than by
coincidence. No top padding of its own: `band`'s (or the body's) own `pt` is
UNCHANGED, so the head simply moves down by the trail's own height plus a
gap — still `TRAIL_GAP`, still `--space-5`, now spent between the trail and
the head instead of between the trail and the card (the same constant, the
same token, only where it is spent moved). Absent, nothing renders and
NOTHING about the card's own position or the head's own top changes — proved
in `verify/trail-line/`, updated for the new geometry: the card's top in the
shell is now IDENTICAL across all four cases (with or without `trail`,
`cardTopDeltaFromNone: 0`), because the slot no longer lives outside the
card to push it down; only the head's top moves, and by exactly
`trailSlotHeight + TRAIL_GAP`'s value (`deltaMatchesExactly: true`, delta
`43.12`px, unchanged from the trail-less baseline's own head position).

COLOUR REVERTS TO THE PAPER LADDER. `TrailLine` (`components/breadcrumbs/
trail-line.tsx`) "lay flat on the ground" in v1.2.104 and rebound
`--foreground` / `--ink-tertiary` to `--spine-ink` on its own root so the
unedited `breadcrumb/breadcrumb.tsx` primitive would read on the spine. The
afternoon ruling moves this component onto the card's own paper
(`--surface-raised`, `text-foreground`), where that primitive already reads
correctly with NO rebind at all — so the rebind is deleted, not merely
unused. `--foreground` for the current step (`BreadcrumbPage`),
`--ink-tertiary` for quiet earlier steps (`BreadcrumbList`'s inherited
base), and the arrows now read `--foreground` at rest / `--ink-disabled`
when there is nowhere to go (was `--spine-ink` / `--spine-ink-disabled`).
THE "NEVER GREY NAV TEXT" RULE IS KEPT, NARROWED TO WHERE IT STILL APPLIES:
the client's verbatim correction on `rail.tsx`'s own ground — "nav text
should ALWAYS be either pure black or pure white — never gray — depending on
what it sits on" — was always about text ON THE SPINE. This trail's text no
longer sits there, so `--ink-tertiary` is now the correct quiet ink;
"current bold, earlier quiet" is still carried by WEIGHT
(`BreadcrumbPage`'s `font-[var(--font-weight-medium)]` against
`BreadcrumbLink`'s inherited light body weight), never by colour, exactly as
before.

Verified in `verify/trail-line/`: trail inside the card at 1, 4 and 9 steps,
arrows enabled/disabled across all three (`one`: both disabled; `four`: back
only; `nine`: both, and the visible trail folds), the trail's own left edge
(the back button) exactly aligned with the head's own left edge (the title
text, `[data-slot=title-heading]`, not the padded wrapper around it —
`trailLeftMinusHeadLeft: 0`), the trail spanning the card's own full width
(`trailWidthMinusCardWidth: 0`), the card's own top unmoved by `trail`'s
presence (`cardUnmoved: true` in all three cases), and the head's own top
moving down by exactly the trail's height plus the gap, measured against the
trail-less baseline rather than asserted (`deltaMatchesExactly: true`).

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system before either
app can use the new geometry; no application code changes shape until then.

### Added — `ScreenShell` gets a `trail` slot; new `TrailLine` composition (back/forward + the text trail) [SUPERSEDED, SAME DAY — see the entry above]

Client ruling, 17 Sep 2026, verbatim: *"the breadcrumbs should sit in the
background, outside the container, on top, and on the very far left, have a
back and forward arrow."* and *"Yes to Chrome navigation, push the trail on a
rail pick."* Two sentences, two files.

`ScreenShell` gains an optional `trail?: React.ReactNode` slot, rendered
BETWEEN the tab strip (the `breadcrumb` prop — note the name is now
misleading; that prop has held `BreadcrumbFolders`, the folder-tab STRIP,
since 2026-09-02) and the content CARD, on the page ground rather than inside
`<main>`. `min-w-0 shrink-0` matches the strip wrapper's own sizing exactly
(the column is `flex-col` with no `align-items` override, so the wrapper
already spans the full inline size for free), and it declares no
`z-index`/`isolate`/`transform`/`opacity`/`filter`, the same restraint the
strip wrapper already writes. Absent, nothing renders and nothing about the
card's position changes — proved side by side in `verify/trail-line/`,
which measures the CARD's top with and without the slot and reports the
delta to the pixel.

THE GAP TO THE CARD IS `--space-5`, NOT A NEW `--trail-gap` CUSTOM PROPERTY.
`TABS_STRIP_GAP` (`components/tabs/tabs.tsx`) and `TOOLBAR_ROW_GAP`
(`components/toolbar-row/toolbar-row.tsx`) already spend `--space-5` on "the
air under a strip of ground chrome", and `TOOLBAR_ROW_GAP`'s own comment says
why the second of those reused the first's number rather than restating it:
"not a fourth opinion about air." A `--trail-gap` token would have been a
third name for the same number, so the shell instead exports a local
`TRAIL_GAP = "mb-[var(--space-5)]"` constant, the same shape as its two
siblings, applied to the trail's own wrapper (`breadcrumb`'s wrapper pays no
gap at all — the folder strip is welded to the card by its own negative
margin and owns that relationship itself; the trail welds to nothing, so the
shell pays a real one).

`TrailLine` (new, `components/breadcrumbs/trail-line.tsx`) is the node a
screen hands that slot. Far left: Back and Forward, Phosphor `CaretLeft` /
`CaretRight` at `--control-height-pill` (26), `aria-label`s `backLabel` /
`forwardLabel` (props, defaulting "Back"/"Forward"), disabled when there is
nowhere to go. Then the text trail, built on the SAME primitives
`Breadcrumbs` already draws from (`components/breadcrumb/breadcrumb.tsx`)
and the same fold rule (`collapse()`, imported from `./breadcrumbs` rather
than re-derived) — reached one layer under the sealed one-prop `Breadcrumbs`
because `onJump` needs every earlier step to be pressable whether or not it
carries an `href`, which that sealed form has no way to express. Props:
`steps: TrailStep[]` (the WHOLE history, "Chrome navigation" — a rail pick
PUSHES: the call site appends after `cursor` and drops whatever followed,
this component never mutates the array), `cursor` (the current step;
everything after it is reachable by `onForward` but not drawn as a crumb),
`onBack`, `onForward`, `onJump(index)`. The row never wraps
(`flex-nowrap`, overriding `BreadcrumbList`'s own default) and folds the
middle to `BreadcrumbEllipsis` past `maxItems` (default 4, matching
`breadcrumb-folders.tsx`'s own `FOLD_AFTER`).

COLOUR: caught and fixed mid-build by `verify/trail-line/` itself — the first
version read `text-ink-tertiary`/`text-foreground` (the panel ladder) with no
rebind, and the trail nearly disappeared on the mango spine. `TrailLine`
"lies flat on the ground" the same way `rail.tsx` states its own rows do, so
every ink here is a `--spine-*` token: the component rebinds `--foreground`
and `--ink-tertiary` to `--spine-ink` on its own root (the two custom
properties `breadcrumb/breadcrumb.tsx` actually reads), and reads
`--spine-ink-disabled` directly on its own arrows. Deliberately NOT
`--spine-ink-quiet` anywhere: `rail.tsx`'s `ROW_IDLE` carries the client's own
verbatim correction on this exact ground — "nav text should ALWAYS be either
pure black or pure white — never gray — depending on what it sits on" — so
"last item current (bold ink), earlier items quiet" is carried by WEIGHT
(`BreadcrumbPage`'s existing `font-[var(--font-weight-medium)]` against
`BreadcrumbLink`'s inherited light body weight), never by a second ink
shade. The arrows' disabled state follows `rail.tsx`'s `ROW_BLOCKED`
precedent for the same reason — ink-only, no fill invented for a control
that never had one.

Verified in `verify/trail-line/` (new): strip + trail + card at 1, 4 and 9
steps, arrows enabled/disabled across all three (`one`: both disabled;
`four`: back only; `nine`: both, and the visible trail folds), the trail's
own background transparent over the ground, its left edge exactly aligned
with the strip's first tab (`trailLeftMinusLeadTabLeft: 0`), and the card's
top moving down by exactly the trail's own height plus `TRAIL_GAP` — measured
against a fourth, trail-less case, not asserted (`deltaMatchesExactly: true`
in all three cases; the delta itself, `43.12`px, is identical regardless of
step count, confirming the row's height does not depend on its content).

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system before either
app can use `trail`/`TrailLine`; no application code changes shape until
then.

### Fixed — `BreadcrumbFolders` icon-only tabs draw a rounded top-left corner again, tucked under the tab before them

Client review, 17 Sep 2026, her THIRD report on this exact silhouette: *"the
inactives on the assistant are overlapping, so they're on top of the active
tab."* A screenshot of the assistant strip (the two pinned tabs, History and
"+") next to the content strip: every content tab draws a rounded top-left
corner and a sloping shoulder that tucks under the tab before it; the
assistant's two icon-only tabs drew a flat, square top-left edge instead — a
vertical wall starting exactly where the previous tab's shoulder ends, which
reads as one tab sitting on top of another even though neither the tab's nor
the `<li>`'s z-index had moved since the last two fixes on this shape
(16 Sep, twice).

IT WAS NEVER Z-INDEX. `verify/tabstrip-parity`'s own `forcedOverlapStacking`
probe manufactures the one geometry a resting strip cannot produce on its
own — a genuine pixel overlap between the active tab and its pinned
neighbour — and reads `topElementIsActiveTab: true` against the current
source: the active tab already wins any real overlap. The corner itself was
the defect, not the paint order.

THE ROOT CAUSE: `folder.tsx`'s `crop="lip"` path is a fixed formula ("Only
FLAT runs take the width and the height") only down to its own measured
floor, `radiusLip + shoulder` (`--folder-radius-lip` + `--folder-shoulder`,
2.505rem). Below that floor, `FolderShape`'s own `Math.max(w, radiusLip +
shoulder)` widens the drawn viewBox past the box it actually measured, and
`preserveAspectRatio="none"` (that file's own "WHY IT MEASURES") stretches
the curve non-uniformly to force the two back into agreement — squashing the
top-left arc and the shoulder rather than merely narrowing them. In
`breadcrumb-folders.tsx`, `TAB_ICON_ONLY` (added 16 Sep, for the "the
assistant's two pinned tabs … read as big empty grey blocks" ruling) dropped
`min-w-0` — EVERY floor a tab carried, not just `TAB`'s 128px text one — so
nothing in the component stopped an icon-only tab's box from being asked to
render under the shape's own geometric minimum. Today's `--icon-button` and
padding tokens happen to sum to comfortably more than that floor, which is
why this sat quiet under the exact props the app passes; the contract had no
guarantee of it, and the client's staging screenshot is the proof the gap is
real regardless.

FIXED AT THE FLOOR ITSELF, not by hand-tuning today's numbers: `TAB_ICON_ONLY`
now carries `min-w-[calc(var(--folder-radius-lip)_+_var(--folder-shoulder))]`
— the same two tokens `folder.tsx`'s own `SHAPE` constants are the
brand-unit twins of, not a second, hand-copied number that could drift from
them. An icon-only tab can no longer be handed a box narrower than the one
curve `FolderShape` draws, so the corner and the shoulder are guaranteed
undistorted regardless of icon size, padding tokens, density scale or
locale — a structural guarantee, not a fix for today's specific widths.
`folder.tsx`'s own `crop` doc now states the floor `lip` callers must honour,
since this file cannot enforce it on itself (the svg is `size-full` of
whatever box its caller gives it).

Verified in `verify/tabstrip-parity` (new — the content strip's and the
assistant strip's real call sites, `app-shell.tsx`'s breadcrumb and
`agent-tab-strip.tsx`'s `items` builder, copied verbatim including the real
embedding chain) and `verify/breadcrumb-folder`: `silhouetteParity` and the
new `iconOnlyFloor_assistant` both read `passes: true`. Screenshot:
`tabs-fixed.png` — both pinned tabs draw the rounded corner and tuck under
their neighbour's shoulder, the same silhouette the content strip draws.

Files: `components/breadcrumbs/breadcrumb-folders.tsx`,
`components/folder/folder.tsx`, `verify/tabstrip-parity/page.tsx`,
`verify/breadcrumb-folder/page.tsx`.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system.

### Fixed — `BreadcrumbFolders`' strip never draws its own horizontal scrollbar

Client, 17 Sep 2026, verbatim: *"there is a certain horizontal scroll. Kill
that."* `STRIP` already hid the bar on Firefox (`[scrollbar-width:none]`)
and on WebKit/Chromium (`[&::-webkit-scrollbar]:hidden`, `display: none` on
the pseudo-element) — a renderer that honours neither (an older Chromium, or
one running with "always show scrollbars") still draws the strip's own bar
the moment the tabs overflow, which is the bar in the client's screenshot.
`[&::-webkit-scrollbar]:h-0` is added alongside `:hidden` as a second,
height-based guard, for a renderer that still reserves the scrollbar's own
gutter once the pseudo-element is `display:none`. Wheel and drag scrolling
are untouched — this is a paint change, not an `overflow` one.

Both properties are now asserted as COMPUTED STYLES in
`verify/tabstrip-parity` (`scrollbarHidden_content` /
`scrollbarHidden_assistant`, reading `scrollbar-width` and
`getComputedStyle(strip, "::-webkit-scrollbar")` directly off the live
`<ol>`), so a future edit that drops either utility fails there instead of
waiting for a Safari/old-Chromium screenshot to catch it again.

Files: `components/breadcrumbs/breadcrumb-folders.tsx`,
`verify/tabstrip-parity/page.tsx`.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system.

### Fixed — `Badge`'s dot-to-label gap no longer depends on `size="pill"`

Client review, 17 Sep 2026, over the automations status chip: *"Validated the
colors, but it's missing the space between the dot and the word. Fix that."*

THE GAP WAS NEVER THE DOT'S — it was `size="pill"`'s. `badgeVariants`'s
`pill` step carried `gap-2` in its own class string, and `size="counter"`
(the component's default, and the default a caller gets by leaving `size`
off) carried none. The doc comment on `dot` said "usually paired with
`variant="status"` and `size="pill"`" — worded as a habit, enforced by
nothing — and a census of every real `<Badge … dot=` call site in the agency
app (17 Sep 2026) found nineteen that had NOT paired it: the automations
status chip (`module-automations.tsx`, `automation-edit-sheet.tsx`), the
contacts Portal chip (`deep-link/shape.tsx`, three call sites), and fifteen
record-detail Archived/priority/status chips besides. Three call sites
(`apps-screen.tsx` twice, `app-detail.tsx`'s other badge) had remembered the
pairing and were the only ones that ever looked right — which is exactly
what made this a kit defect and not an app one: the same one-line call shape
produced two different pictures depending on whether a caller remembered a
second prop nothing enforced.

FIXED AT THE ROOT: the gap moved off `size="pill"` entirely and onto the
`dot` prop's own presence — `GAP_WITH_DOT` ("gap-2", the same `--space-2`
token), applied on the outer span whenever `dot` is truthy, independent of
`size`. A `size="counter"` badge with a dot now gets the identical 8px a
`size="pill"` one always has; a badge with no dot is unaffected (the gap
utility does nothing with a single flex child). This fixes every existing
call site without touching one of them — no nineteen-file sweep, no second
prop to remember going forward.

Files: `components/badge/badge.tsx`.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system.

### Fixed — `AgentChat`'s `Cite` mark no longer collides with the line above it at narrow widths

B0297 / T3660, client review meeting, 16 Sep 2026, verbatim: *"Restore
sentence-level citations in KB responses, fix numbering/text overlap on
smaller screens."* And: *"NotebookLM-style per-sentence numbered citations
were removed earlier because the numbers overlapped with text on some
screen sizes. Decision: fix the overlap rather than dropping the feature."*

THE MECHANISM WAS NEVER GONE. `Cite` has rendered a numbered `<sup>` since
Ruling D7-2 (2026-08-24) — nothing about that ruling, the derived numbering,
or the pill underneath was touched. The fault was the raise: `align-super`
won the `vertical-align` back from the kit's own `sub`/`sup` reset
(`vertical-align: baseline; line-height: 0`), and the `text-micro` utility
re-asserted a real line-height (`1.3`) on top of that reset's `0` — so a
mark was raised by both the browser's own `super` shift AND the reset's
`position: relative; top` offset at once, inside a line box no longer
pinned flat. On a sentence wrapped tightly at 375px that plants the number
on the line above it.

FIXED: `align-super` is gone, so `vertical-align: baseline` stays in force
(the reset's own value — nothing invented) and the mark is offset by
position alone. `top-[-0.35em]` raises it the same visual amount
`align-super` did; `leading-[0]` puts the line-height back to the reset's
zero, the same trailing-utility-wins order `turnVariants` already relies on
(`text-caption leading-[var(--leading-normal)]`). `--text-micro` and
`--font-weight-medium` are unchanged — no token invented — and nothing
about the hit target or hover changes: `Cite`'s `<sup>` was never
interactive itself, only the source pill below it is a link.

New `verify/agent-chat-cite/`: `AgentChat` mounted at 375px (the driver
resizes the real viewport, `verify/crumb-mobile`'s own reason — a
fixed-width host cannot answer a question about the document's own
cascade), one turn with a single closing citation, one with three
CONSECUTIVE citations mid-sentence (the reported stress case), and the
same three-citation turn again in a narrower 20rem host. `window
.__citeOverlap()` builds each line's rect from real TEXT NODES ONLY (never
the `<sup>` itself, so the mark's own inflation can never hide inside the
thing it is measured against), then checks every citation's painted rect
against the text line immediately above it. RED-PROOFED: swapped the
pre-fix `align-super` version back in against this same harness — every
cell measured a positive overlap (~1.48px, the number's box physically
painting into the ascenders of the line above, confirmed by screenshot);
restored the fix, re-ran, negative (a real gap) in all three cells.

Files: `components/agent-chat/agent-chat.tsx` (`Cite`'s `<sup>`
`className` only), `verify/agent-chat-cite/` (new — `page.tsx`, `main.tsx`,
`index.html`, `entry.css`, `vite.config.ts`, port 5312).

### Removed — `ScreenShell`'s assistant resize feature, entirely: the aside is back to one fixed width

Client, 16 Sep 2026, evening, on the shipped build: *"Let's forget about the
resize. It's a disaster. Remove it."* The whole feature two rulings earlier
the same day had added — drag the seam, snap to 320/400/520 — is gone, not
disabled: the invisible `RESIZE_SEAM` grab and its hover-reveal
`cursor-col-resize` arrow, the pointer/keyboard drag logic on `EdgeHandle`
(`dragMoved`/`dragStart`, `nextWidth`, the pointer-down/move/up handlers, the
live width readout, the `role="slider"` wiring), and the whole
`asideWidth`/`defaultAsideWidth`/`onAsideWidthChange`/`asideMinWidth`/
`asideMaxWidth`/`asideResizeLabel` API on `ScreenShellProps`. The four
constants that governed it — `ASIDE_WIDTH_MIN`, `ASIDE_WIDTH_MAX`,
`ASIDE_WIDTH_DEFAULT`, `ASIDE_WIDTH_SNAP_POINTS` — and the two functions that
computed against them (`clampAsideWidth`, `snapAsideWidth`) are deleted, not
kept unused.

THE COLUMN RETURNS TO **ONE FIXED WIDTH: `ASIDE_WIDTH`, `23.75rem`** — the
same 380px-at-the-16px-reference measure the shell drew before the resize
ruling ever touched this file (ch19's own floating-card `max-width`,
confirmed against `git log`/this file's own history rather than assumed).
The `--aside-width` custom property the drag wrote every frame is gone with
it; `--motion-column-size` and the panel's own `w-` both read the literal
`23.75rem` again, exactly as they did before 2026-09-16.

EVERYTHING ELSE ABOUT THE ASIDE IS UNTOUCHED, on the same instruction: open
and close (`asideOpen`/`onAsideOpenChange`, the round `EdgeHandle`, the
narrow bottom sheet), `asideTabs` (pinned tabs at the strip's own trailing
end), and `onCloseAll` (close-all) all render exactly as they did before
today. `asideHandleOnOpen={false}` also still suppresses the round handle's
OPEN branch exactly as it did before the resize ruling reused that branch
for the bare seam — with the seam gone, that caller's slot draws nothing
again, which is what it did before 2026-09-16 too.

New `compositions/templates/check-screen-shell.mjs` — REWRITTEN rather than
deleted, per the brief: it used to pin which edge the (now-removed) seam sat
on; it now asserts the opposite, that no working trace of the resize
feature (every constant, prop and CSS custom property above, matched as a
declaration/call-site shape so it cannot fire on this changelog entry's own
prose) has come back, and that `ASIDE_WIDTH` is still the literal
`"23.75rem"`. Wired into `npm run check`, unchanged from before.

Files: `compositions/templates/screen-shell.tsx`,
`compositions/templates/check-screen-shell.mjs`,
`compositions/templates/index.ts` (drops the four retired exports),
`demo/shapes/templates-0.tsx` (drops the "asideWidth" demo panel; keeps a
trimmed `asideHandleOnOpen=false` panel, since that prop is untouched).

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system.

### Fixed — `BreadcrumbFolders` inactive tabs no longer paint over the active tab's shoulders, mid-drag, even when the active tab is only SHIFTED

Client, 16 Sep 2026, evening, over a screenshot of the compact assistant
strip: *"the shape is not behind. That's wrong. The inactive tabs are
overlapping."* — the same defect a same-day pass had believed closed: the
STATIC pair (`TAB_REST`'s `z-0` / `TAB_LIVE`'s `z-[1]`, on the inner
link/button `CrumbShape` draws inside) and the DYNAMIC lift on the tab
actually held (`draggedEl.style.zIndex = "2"`, in `onTabPointerDown`) were
both genuinely correct for the cases they were checked against — case 7/8's
own `zOrder` reads confirm it, unchanged, still `"1"`/`"0"` at rest.

THE GAP WAS ONE NEITHER READING COULD SEE: `onTabPointerMove`'s own
`drag.others.forEach` writes a bare `style.transform` onto every OTHER
movable tab a drag has moved past — active or not, held or not — with no
z-index at all. A `transform` alone is its own stacking context regardless
of `z-index` (`auto` included), so the instant the LIVE tab is merely
SHIFTED out of a neighbour's way — never dragged, never under the pointer —
its own `z-[1]`, on the link, is sealed inside a stacking context the
strip's shared comparison can no longer see into; the outer comparison then
treats the whole shifted `<li>` as one opaque box at the "auto" level, tied
on DOM order against a later, untransformed sibling — and a pinned tab
(History, "+") is *always* later, by design. That DOM-order tie is exactly
"the inactive tab in front", reproduced without the active tab ever being
the one a reader is dragging.

FIXED BY MOVING THE AUTHORITATIVE NUMBER FROM THE BUTTON TO THE `<li>` — the
element that owns the whole silhouette, shoulders included, not only the
label drawn inside it. `BreadcrumbItem`'s own className (the render, per
tab) now carries `live ? "z-[1]" : "z-0"` itself, unconditionally, on every
tab, normal and `iconOnly` alike. A `<li>` here is a flex item of
`BreadcrumbList`'s own `<ol>` (`STRIP`'s `flex`), so `z-index` applies to it
exactly as if it were `position: relative` (CSS Flexbox) — no `position` of
its own needed — and because this number lives on the CLASS rather than an
inline style, it is never cleared or trapped by the bare `transform`
`onTabPointerMove` writes: it stays explicit and numeric through every
shift, dragged or not, so the outer comparison is always a real 1-vs-0,
never a DOM-order tie-break standing in for one. The existing inline
`draggedEl.style.zIndex = "2"` (the tab actually HELD) is unchanged and
still wins over both, since 2 beats 1.

PINNED TABS AT THE END KEEP THEIR PLACE, CONFIRMED. `isMovable()` is
`onReorder !== undefined && items[index]?.closable !== false` — unrelated to
this fix and untouched by it — so History/"+" (`closable: false`) are still
never draggable and never a drop slot; `movableRange()` still stops the
contiguous run at the first pinned neighbour on either side. This is the
v1.2.98 ruling, reconfirmed rather than re-argued: a pinned tab at the END
stays fixed there through every gesture this fix touches.

VERIFIED IN `verify/breadcrumb-folder/`, red proved before green (a copy of
the fix disabled, `cp`'d back after): the STATIC `zOrder` reading grows
`liveLi`/`restLi`, reading the `<li>` itself
(`[data-slot="breadcrumb-item"]`) rather than the link/button inside it —
the previous lane's own reading, kept, plus the one the bug actually lived
in. A new host, `tabset-shift-probe` (`Puller`, `Active` — the live tab,
never held — `Filler`, then pinned `H`/`+`), and
`measureShiftedSiblingZOrder` drag `Puller` past `Active`'s own midpoint
with a real synthetic pointer gesture, confirm `Active`'s `<li>` picks up a
genuine, non-identity `transform` (`activeReallyShifted`, so the check
proves something rather than passing vacuously), and read `shiftedActiveLiZ`
against the trailing pinned tab's `shiftedHistoryLiZ` while that transform
is in effect — `"1" > "0"`, at the `<li>`, mid-shift. Disabling the fix (a
scratch copy, restored after, never `git checkout --`) reproduces exactly
the client's own defect: both read `"auto"` and the check fails. This
harness's own known limitation — `document.elementFromPoint` reads `null`
here regardless of overlap, per this file's own header — is why the proof
is the rect+z-index pair the file's existing `dragOverlapZOrder` probe
already established as sufficient under CSS's own stacking rules, extended
to the element the fix actually moved the number to.

Files: `components/breadcrumbs/breadcrumb-folders.tsx`,
`verify/breadcrumb-folder/page.tsx`.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system. No app
wiring changes.

### Fixed — check-unsaved-changes-bar reads class literals directly; no comment stripping (the consuming app forbids re-typed stripper regexes)

### Changed — `BreadcrumbFolders` drag-to-reorder now follows the pointer, Chrome's own model

Client ruling, 16 Sep 2026, second of the day on this file, over the native
HTML5-drag build the first ruling shipped: "visually it's a bit confusing.
Can we drag it instead of freely on the same edge, only horizontally, so to
say? Exactly the same behavior as when dragging tabs in Google Chrome.
Research and implement that." Native `draggable`/`dragstart`/`dragover`/
`drop` hands the browser a free-floating drag image with no sense of the
strip's own axis; replaced with pointer events and a measured `translateX`,
no new dependency, same `onReorder?: (fromIndex, toIndex) => void` contract:

- The dragged tab never leaves the strip's own axis — a signed `translateX`
  clamped to the leading/trailing edge of the CONTIGUOUS run of movable tabs
  around it; `translateY` is never written.
- It follows the pointer 1:1 while held, no easing ("the pointer is the
  clock", the same rule `cursor-glow.tsx` and `kanban.tsx`'s own carry state
  already write down for this kit).
- Every other tab in the run slides its own `translateX` live, the instant
  the dragged tab's centre crosses that neighbour's ORIGINAL centre —
  opening the drop slot before release rather than only revealing it after.
- Release settles every transform and fires `onReorder` exactly once, with
  the final slot.

A pinned tab (`closable: false`) still gets no pointer handler at all and
is never a landing slot — `movableRange()` stops the contiguous run at the
first pinned neighbour on either side, so History/"+" stay pinned last with
no extra bookkeeping. `<BreadcrumbLink>`'s own `<a>` keeps `draggable={false}`
on a movable tab: a browser's native link-drag now fires a `dragstart` that
would cancel the pointer gesture mid-flight rather than merely racing an
HTML5 drop handler. Alt+ArrowLeft/Alt+ArrowRight keyboard reorder is
unchanged. A gesture that actually moved swallows the trailing native
`click` on the dragged tab once (release, capture-phase, self-removing) so
letting go does not also re-select the tab the reader just finished
dragging; a plain tap with no movement is untouched and reaches the app's
own `onClickCapture` exactly as before.

Demo: `demo/sections/a-b.tsx`'s workspace-tab-set specimen is unchanged in
markup — same `onReorder` prop, same `reorderWithinArray` splice — and now
exercises the pointer model instead of the retired HTML5 one.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system. No app
wiring changes: `agent-tab-strip.tsx` and any future content-strip caller of
`onReorder` inherit the new drag feel for free, same prop, same contract.

### Fixed — `BreadcrumbFolders` inactive tabs never paint over the active (or dragged) one, icon-only tabs included

Client ruling, 16 Sep 2026, third of the day on this file: "the inactive
tabs' shape appears in front of the active one. That's wrong. It should be
behind. We had this so many times with the main content tabs, and it took
you many iterations to fix it." Named at the compact/icon-only assistant
tabs specifically. The STATIC half of this was already correct and stayed
correct: `TAB_REST`'s `z-0` / `TAB_LIVE`'s `z-[1]` (the 2026-09-06 fix for
the main content strip, keyed to `entry.index === activeCrumb` rather than
DOM position) are shared, unconditionally, with `TAB_ICON_ONLY` — that flag
only ever adds padding classes, never touches which z a tab gets — so
nothing in the component was ever WRONG for the static case; nothing had
PROVEN it for the icon-only shape either, until now (see below).

The DYNAMIC half is where the bug actually lives, and it is the same class
of bug wearing the new pointer-drag feature above: at rest, the strip's own
`gap-1` keeps every tab's box clear of its neighbours, so two `z-0` rest
tabs never had to be compared at all and DOM order silently stood in for a
real answer. A drag changes that — the dragged tab's `translateX` now
genuinely overlaps a sibling's box for the length of the gesture — and an
EARLIER-DOM tab dragged RIGHT over a LATER, still-`z-0` sibling lost the
DOM-order tie to it: the inactive tab painting in front, on demand, of
whichever tab a reader happened to be carrying. Fixed by lifting the
dragged `<li>` to `z-index: 2` for the length of the gesture (a `transform`
already makes it its own stacking context, the same "z-0 IS STILL A
STACKING CONTEXT" mechanism `TAB_REST`'s own comment already documents, now
read for a transform rather than a position) — high enough to beat any
sibling at `z-0`/`z-[1]`, tied with (and losing, on DOM order, to) the
card's own `z-[2]`, so a horizontal drag still never paints over content.
Cleared on release, after the settle transition finishes rather than the
instant it starts.

`verify/breadcrumb-folder/page.tsx` case 8 pins both halves so this cannot
regress a third time: `tabset-icononly` reproduces the assistant strip's
exact shape (one active text tab beside two pinned icon-only tabs) and
reads the same `zOrder` case 7 already checks; `tabset-drag-probe` fires a
real pointer gesture, drags an early tab far enough to genuinely overlap a
later one WITHOUT crossing the reorder midpoint, and proves the overlap is
real (`getBoundingClientRect`) and the dragged tab's `z-index` wins it
(`getComputedStyle`) — not `document.elementFromPoint`, which this harness's
own tiny rendered viewport (see the file's header) returns `null` from even
for a tab that never moves. Proved red on a copy first: with the lift line
disabled, the probe's own capture check (independent of the disabled line)
still reports a genuine overlap, but `z-index` reads `auto` and the check
fails — restored and green after.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system. No app
wiring changes.

### Fixed — `ScreenShell`'s bare assistant resize seam moved to the assistant's left (start) edge

Client, 16 Sep 2026, on the shipped build: "you put it on the right edge. I
want it on the left one, the one that's between the assistant and the main
content." The invisible 8px `RESIZE_SEAM` grab (`asideHandleOnOpen={false}`'s
own branch, drag-to-resize added earlier the same day) had shipped on the
aside dock's END inset — the assistant column's outer edge, one gutter short
of the window — copied from the round handle's own CLOSE-button placement two
blocks up. Moved to `start-0`, the dock's own card-facing padding edge: the
seam the assistant actually shares with the main content. Snap points
(320/400/520) and the hover-reveal arrow are unchanged.

New `compositions/templates/check-screen-shell.mjs`, wired into `npm run
check`, pins the placement string and fails if it ever carries an `end-`
inset again.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system.

### Fixed — `UnsavedChangesBar` rounds on all four corners

Client, 16 Sep 2026: "use the orange color in the kit and make sure the
container is round on all corners, because currently two corners are not
round." `ground="bare"` — the variant both real call sites (Settings ›
Appearance, Settings › Team › Roles) render — rounded only the top edge
(`rounded-t-[var(--radius)]`), on the reasoning that the app's own
`PINNED_TOOLBAR` wrapper `::before` already rounded those same corners one
layer out. The client's ruling overrides that: `bare` now matches
`page`/`panel` at `rounded-[var(--radius)]`, all four corners, unconditionally.
The fill was already the kit's own `--warning` token (`--kw-orange`,
`foundations/tokens/tokens.css`), confirmed unchanged.

New `components/unsaved-changes-bar/check-unsaved-changes-bar.mjs`, wired
into `npm run check`, pins all three `ground` variants to a four-corner
radius and forbids a literal hex/rgb/hsl in the component's class strings.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system.

### Changed — `BreadcrumbFolders` icon-only tabs no longer render at the 128px text width

Client, 16 Sep 2026, fifth ruling that day, on staging: "validated, but still
gotta fix the shape! … the assistant strip's two pinned tabs (History clock,
"+") render 128px wide — the same width as a text tab — so they read as big
empty grey blocks beside the 162px 'Conversation ×' tab, while the content
strip's tabs hug their text."

A new per-item flag, `BreadcrumbFoldersItem.iconOnly`, drops `TAB`'s 128px
text floor (`min-w-0`) and tightens both insets to icon-plus-padding
(`TAB_ICON_ONLY`: `ps-3` leading, a trailing inset that keeps the shoulder
curve's own width but drops the label's extra trailing space) instead. The
folder silhouette behind the tab needed no change at all: `FolderShape`
measures its own rendered box on every resize rather than stretching a fixed
path (that file's own "WHY IT MEASURES"), so a narrow tab is not a squashed
wide one, it is the same shape measured smaller — verified by reading the
rendered box width in a live page rather than assumed.

Demo: `demo/sections/a-b.tsx`'s `BreadcrumbFolders` workspace-tab-set
specimen grows two trailing pinned tabs, `History` (`ClockCounterClockwise`)
and `+` (`Plus`), both `iconOnly closable={false}`, so the strip reads
`[text tab active][icon tab][icon tab]` exactly as staging showed it.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system; the app's
`agent-tab-strip.tsx` should pass `iconOnly: true` on its own History/+ tabs
once the tag lands.

### Added — `BreadcrumbFolders` tabs support drag-to-reorder (`onReorder`)

Client ruling, 16 Sep 2026: "go with the drag order." A new `onReorder?:
(fromIndex: number, toIndex: number) => void` prop makes every tab whose own
`closable` is not `false` draggable — native HTML5 drag, the same
`draggable`/`onDragStart`/`onDragOver`/`onDrop`/`onDragEnd` shape
`kanban.tsx`'s cards already use, reusing motion.css's existing
`.motion-drag` / `.motion-drag-placeholder` / `.motion-drop-target` classes
rather than adding a new keyframe. A focused movable tab also takes
Alt+ArrowLeft / Alt+ArrowRight, moving it to the next or previous movable
slot and skipping over any pinned one.

A tab with `closable: false` (pinned) is never draggable and never a drop
target — dragging over one never calls `preventDefault`, so the browser's
own refusal is what stops a drop there, not a check in this file. That is
what keeps trailing pinned tabs (History, "+") pinned last with no extra
bookkeeping: nothing can ever land past them. `<BreadcrumbLink>`'s own `<a>`
gets `draggable={false}` on a movable tab, since a browser makes a link
draggable by default (drag to bookmark) and that would otherwise fire before
the `<li>`'s own `dragstart` ever sees the gesture.

The caller applies the move to its own array — `onReorder` hands back
positions, exactly as `onClose` already does, never mutating anything
itself.

Demo: `demo/sections/a-b.tsx`'s workspace-tab-set specimen wires `onReorder`
to a plain splice (`reorderWithinArray`).

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system;
`web/lib/workspace-tabs.ts` gains `reorderTab(path, toIndex)` and
`app-shell.tsx`'s content strip plus `agent-tab-strip.tsx` /
`agent-conversation-tabs.ts`'s `reorderAgentTab` wire `onReorder` once the
tag lands.

### Fixed — `Badge`'s `status` variant never drops its neutral fill, in either palette

Client ruling, 16 Sep 2026: "go for the kit fix." Ruling 26's own dark
clause put the ONE charcoal-dot pill ("in build" / "with us") on a mango
fill in dark mode; the client's own law elsewhere is "mango is the brand,
never a status" (ch11), and that clause was the one place this file broke
it. The `variant: "status", dotTone: "building"` compound variant is
removed — `variant="status"` now resolves to `--pill-fill`/`--pill-label`
for every `dotTone`, `building` included, in both palettes — and the two
tokens that carried the exception, `--pill-fill-building` and
`--pill-label-building`, are removed from `tokens.css` with it (light block
and both dark blocks; `foundations/tokens/build-tokens.mjs` confirms no
drift/orphan/px/selector regression). `--dot-building` itself is unchanged
(`--foreground`, unrelated to the pill exception — it also feeds Kanban's
column-header dot) and reads correctly against the now-always-neutral pill
fill in dark.

Demo: `demo/sections/a-b.tsx`'s "Status pills" panel note updated to say
what is now true — every tone, both palettes, no dark exception —
`demo/sheets/token-sheet.tsx` and `verify/accents/page.tsx` no longer
reference the removed tokens.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system; the app's
`web/components/apps/apps-screen.tsx` drops its `STAGE_PILL_PROPS`
className override that was patching around the old dark-mode fill (keeping
`size="pill"`), and any similar override elsewhere.

### Added — `CalendarView` opens a hover preview on an event chip (`renderEventCard`)

Client ruling, 16 Sep 2026: "Is it possible that when I hover over the card
in the calendar, it expands and I see what it is?" A new
`renderEventCard?(event, day)` prop wraps every chip AND every span mark
(the S2 caps and the middle ghost line alike) in the kit's own floating
preview: a `HoverCard` on a pointer that can hover (`(hover: none)`
decides), opening 300ms after the pointer arrives or on keyboard focus and
closing on pointer-leave or Escape — Radix's own default, nothing
reimplemented — or a `Popover` on a coarse (touch) pointer, since a phone
has no hover to open it with. The kit draws the frame; the caller returns
whatever node it wants shown — `record-calendar.tsx`'s own card: title,
kind, dates and the chip's own tone dot.

On touch the first tap on an unopened preview opens it and goes no further
(a reader who has not yet seen the card gets no benefit from tapping
straight through to the full record); a second tap, with the preview
already open, reaches the chip's own `onClick` (`onSelectEvent`) unchanged.

Returning `undefined`/`null` for a given event renders that chip exactly as
before; omitting the prop altogether wraps nothing.

Demo: `demo/collections/a-ca.tsx`'s `CalendarView` section grows a
"renderEventCard" panel wiring two events ("Northgate kickoff", "Alderbrook
renewal") to a small title/kind/dates card.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system before
`record-calendar.tsx` can wire it.

### Changed — `ScreenShell`'s bare resize seam draws nothing at rest

Client ruling, 16 Sep 2026: "can we actually not show anything and make it
so that I can grab the left rail of the assistant, and when I hover over
there, I see this kind of arrow to move?" `RESIZE_SEAM` (the bare seam added
for `asideHandleOnOpen={false}` callers, above) no longer paints its 3px
mark at rest — `before:opacity-0`, revealed only on `hover:`/
`focus-visible:` — and the hit area widens to the aside's full left edge:
`w-2` (8px) and `inset-y-0` (the column's full height, not the previous
fixed 44px band), so a reader can grab anywhere along the edge rather than
hunting for a short mark's own height. `cursor-col-resize` was already on
the handle; that IS the "arrow to move" the ruling asked for — the browser's
native glyph, nothing drawn.

The one caller's own `placement` string drops the `top-1/2 -translate-y-1/2`
pair the round (non-bare) handle still uses to centre its fixed-height box:
combined with `inset-y-0`'s `top: 0`, that pair was winning `top` back to
`50%` while leaving `inset-y-0`'s `bottom: 0` unchallenged, collapsing the
seam to the ancestor's bottom HALF — caught by reading the rendered box in a
live page, not by inspection alone. Drag, snap, keyboard stepping and
double-click reset are unchanged; the global focus ring (tokens.css §8)
still shows on keyboard focus, since nothing here sets `outline-none`. The
`asideHandleOnOpen` closed-state opener is untouched.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system; no app
wiring required beyond the existing `asideHandleOnOpen={false}` call site,
which inherits the new resting/hover behaviour for free.

### Added — `BreadcrumbFolders` gets a trailing close-all control (`onCloseAll`)

Requested by the consuming app for a "Close all tabs" control on its
workspace tab strip — Chrome's "close other tabs", drawn as the strip's own
trailing flex child rather than exported tab classes (this file's own
closing note: "ship the THING, not the string"). `onCloseAll` + a
translatable `closeAllLabel` (default "Close all tabs"), opt-in alongside
`onClose`, rendered only when there is more than one tab open — a control
that would close nothing is worse than one that is absent. It is not a tab:
no `FolderShape`, no paper, no label, drawn like `TAB_CLOSE` (the kit's
other strip-level control) rather than `TAB`/`TAB_REST`, sized to
`--folder-lip` and pulled up by `--folder-tab-overlap` as the strip's last
flex child since it has no ancestor tab box to sit over. It never touches
the live tab — the set that survives is exactly the one item this call
already marks live (`activeIndex`, or the last item by the same default).

Rebranched from v1.2.91 onto this line at v1.2.97 — cut originally against
the stale v1.2.89, replayed unchanged since `breadcrumb-folders.tsx` did not
move between v1.2.89 and v1.2.91 — and reconciled here with `onReorder` and
`iconOnly` (v1.2.95), which touch disjoint regions of the same file.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso_system; the app's
`workspace-tabs.ts`/`app-shell.tsx` wire `onCloseAll` on the content strip
alongside the existing `onClose`/`onReorder`.

### Added — `ScreenShell`'s aside column is resizable: drag the seam, snapping to 320 / 400 / 520

The client's ruling, 16 Sep 2026: *"Is it possible that we can, while using
the app, adjust the width of the assistant? If possible, make me an artifact
of how this could look."* Four variations were mocked (`verify/decisions.html`'s
sibling assistant-width artifact); her answer, choosing from them: *"A — drag
the seam, with B's three widths as its snap points."*

`ScreenShellProps` grows `asideWidth?: number` (px, controlled),
`defaultAsideWidth = ASIDE_WIDTH_DEFAULT` (400, the uncontrolled seed and the
double-click reset target), `onAsideWidthChange?: (px: number) => void`,
`asideMinWidth = ASIDE_WIDTH_MIN` (320) and `asideMaxWidth = ASIDE_WIDTH_MAX`
(520) — the exact controlled/uncontrolled shape `asideOpen`/`defaultAsideOpen`/
`onAsideOpenChange` already sets, so a caller that never wires any of them
renders byte-identical to before (`ASIDE_WIDTH`, the old fixed 23.75rem, stays
the literal `min()` falls back to; only how it reaches the cascade changed —
see that constant's own doc). Four new exported constants carry the numbers:
`ASIDE_WIDTH_MIN`, `ASIDE_WIDTH_MAX`, `ASIDE_WIDTH_DEFAULT`,
`ASIDE_WIDTH_SNAP_POINTS`.

The existing inner-edge `EdgeHandle` becomes the drag control: pointer
capture, `cursor-col-resize`, a live `${px}px` readout beside the handle
while it is pressed, arrow keys stepping ±16px and Home/End jumping to
`min`/`max` on the focused handle, and a double-click resetting to 400. A
drag that RELEASES within a small tolerance of one of the three snap points
(320/400/520) lands on it exactly; released elsewhere, the exact pixel value
stays. A plain click that never moved the pointer still closes the column —
`dragMoved`, read once per gesture and cleared, is what tells a drag and a
click apart on the one element both now live on. Below `md` the aside is
already a bottom-sheet overlay and none of this applies.

The pixel value reaches the render tree through one CSS custom property,
`--aside-width`, set once on the aside dock and read by both the motion
layer's `--motion-column-size` and the panel's own `w-`, which are STATIC
Tailwind arbitrary-value strings (`w-[var(--aside-width)]`) referencing a
variable rather than a value baked into the class name at build time — the
two existing viewport-relative caps either side of each `min()`
(`calc(100vw-var(--shell-gutter)*2)`, `40vw`) are unchanged, so a wide drag
on a narrow window is still bounded by the same mechanism that already
protected the content column.

FOR THE CALLER THAT SUPPRESSES THE ROUND HANDLE'S CLOSE-ON-CLICK
(`asideHandleOnOpen={false}`, 2026-09-15's own ruling removing a redundant
mid-edge close circle): the round handle's open branch stays suppressed —
the client's "we don't need this [circle]" still stands — but a new BARE
resize seam (`RESIZE_SEAM`: a thin 3px mark, no glyph, no mango fill,
matching the shell-redesign spec's own "3px edge handles") renders in its
place whenever the aside is open, so today's ruling reaches that caller too
without reintroducing the visual weight the earlier ruling removed. It never
calls `onToggle`.

Demo: `demo/shapes/templates-0.tsx`'s `screen-shell` section gets a new
"asideWidth" panel, live and draggable — one uncontrolled at the 400 default,
one with `asideHandleOnOpen={false}` showing the bare seam.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso-system before the
app can use it (`shared/ui/` there is vendored and pinned).

### Added — `CalendarView` draws a multi-day record as a span: S2 "start-and-end caps"

The client's ruling, 16 Sep 2026: *"In the calendar, we should see sprints
lasting multiple days, so maybe we need to redesign this component… for
calendar, I choose S2, Start-and-end caps."* Before this, `CalendarEvent`
belonged to exactly one `CalendarDay` — a twelve-day sprint got one chip, on
one date, indistinguishable from a one-day task, and nothing on the grid said
it had been running for a week and a half already (the artifact at
`verify/decisions.html`'s sibling calendar-spans page walks the three
concrete failures this produced in a real September–October mock).

`CalendarEvent` gains `span?: { id: string; position: "start" | "middle" |
"end" | "only" }`, read per DAY, exactly as every other field on this type
— the component still does no date maths and holds no calendar (the file's
own long-standing law). `start` and `end` still draw a chip, capped (a real
pill corner) on the record's own boundary edge and flattened on the edge
that runs into the next day's mark — `rounded-s-pill rounded-e-none` /
`rounded-e-pill rounded-s-none`, the same directional-rounding idiom
`sort-control.tsx` already uses, and deliberately never combined with a bare
`rounded-pill` in one class list (`tailwind-merge`'s `rounded` group does
not know the two conflict — measured, not assumed; see `eventChipVariants`'s
own header). `middle` draws no chip at all: a thin ghost line
(`spanLineVariants`, a small `cva` of its own) in the event's own `tone`, at
low alpha, thin enough that a twelve-day span still fits the cell's ordinary
`maxEvents` column. `only` is a one-day span — an ordinary chip, both
corners capped — kept as its own name so a caller that always sets an end
day never special-cases the one-day case itself. Overlap of two spans in one
cell stacks for free: each is one more item in the cell's existing flex
column, in `events` order. Week wrap is not this file's job either — a
`middle` day at a row's own first or last column is handed one `CalendarDay`
like any other and draws its line the same way; the caller's own day-by-day
walk is what makes it reappear on the next row.

THE COMPACT (below-`sm:`) DOTS SHOW ONLY THE START AND END, same ruling: a
`middle`-position event is filtered out of `CompactDaySummary`'s dot count
entirely — a dot with no label already carries less than a chip, and a dot
for "somewhere inside a span" has nothing new to say on the screen with the
least room to spend on one.

Demo: `demo/collections/a-ca.tsx`'s `calendar-view` section gets a new S2
panel — two overlapping September spans, one crossing the week boundary at
13/14 to prove the wrap needs nothing special, the other nested inside it to
prove the stack.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso-system before the
app can use it (`shared/ui/` there is vendored and pinned).

### Added — `Badge` and `Kanban` get four priority tones: red, orange, purple, blue

The client's ruling, 2026-09-15, over the consuming app's Tasks table:
*"For the priorities: 4: keep the red. 3: use the orange. Urgent: use the
purple. Whenever: use the blue."* The app had been colouring a task's
priority by borrowing four of `Badge`'s six lifecycle dot tones — blocked,
building, review, archived — because they were "the only reusable name in
reach", not because a priority is a stage. One borrowing was a real defect:
`building` is charcoal, the exact hex `--surface-inverse` is in light, so a
priority-3 dot vanished wherever the two met, and in dark it tripped this
kit's `building`-on-mango special case by accident, painting the whole chip
the one colour this system reserves for the brand.

Four new tokens, `tokens.css`: `--dot-red` (`--destructive`), `--dot-orange`
(`--warning`), `--dot-purple` (`--kw-lavender`, admitted 2026-09-02), and
`--dot-blue` (`--kw-sky`, the same hex `--info` already reaches, under a name
that means priority rather than "informational"). No new hex for any of the
four — every one is a colour this file had already admitted. `Badge`'s
`dotTone` variant and `Kanban`'s `KanbanColumnDot` both grow the matching
four entries, additively: none of the four is `building`, so the dark-mode
mango special case stays scoped to that one tone alone and never fires for a
priority chip. Measured against this file's own `mark` tier (1.5,
`check-contrast.mjs`) rather than WCAG's 3:1 — ruling 26's "the dot never
speaks alone" already set that floor for a 7px dot — all four clear it
against every ground a dot renders on in this kit (`--pill-fill` and
`--surface-inverse`, both palettes), with one bare, logged exception: blue
against `--surface-quiet` in light measures 1.49, a ground no status-pill
dot renders on today.

Demo: `demo/sections/a-b.tsx`'s `badge` section gets a new "Priority tones"
panel, the four new dots at the exact CH11 status-pill geometry, labelled
with the consuming app's own four priority words.

### Added — `ScreenShell` gets `asideTabs`, the aside's own tab level, handed to the caller

The client's ruling, 2026-09-15, over a screenshot of an application that had
drawn its own conversation tabs (History · one folder tab per open thread ·
"+") one level BELOW the shell's single `asideLabel` tab, because `asideLabel`
is a `string` and a string cannot be a strip: *"You got it completely wrong.
The tabs need to be at the same level as the assistant tab, so it will have
no assistant name. We know that's what it is. Rather, each tab will have the
name. Now you create it like a sub-level, but no, no, it's only one tab
level."*

`asideTabs?: React.ReactNode`, new on `ScreenShellProps`. When given, it
replaces the ITEM the kit draws inside `screen-shell-aside-tab`, not the
slot: the wrapper `<div>`, its `ASIDE_TAB` geometry and its
`--folder-tab-overlap` attachment to the card below it are unconditional
either way, so a caller-supplied strip sits in exactly the same place the
kit's own one fixed tab (`<BreadcrumbFolders items={[{ label: asideLabel
}]}>`) always has. `asideLabel` is not retired: it is still `aria-label` on
`screen-shell-aside`'s `role="complementary"` landmark, and it is still the
whole story for every existing caller, who passes no `asideTabs` and renders
byte-for-byte as before. The kit draws no close machinery around a
caller-supplied strip — `toggleAside`/`onCurrentActivate`/the tab's own ×
stay wired to the kit's own fixed tab only, because a caller with its own
tabs has its own close targets and its own "closing the last one shuts the
column" rule; the edge handle remains every caller's unconditional way to
shut the column from outside the strip.

Demo: `demo/shapes/templates-0.tsx`'s `screen-shell` section gets a new
"asideTabs" panel, the kit's one fixed tab beside a caller-supplied strip in
the identical slot, side by side.

### Added — `Kanban` gets `emptyColumns="bare"`, an empty column with no box and no words

The client's ruling, 2026-09-15, on the tasks board view: *"when empty,
don't show anything at this stage."* Every empty column has always drawn
`EmptyRegister` — a box of tertiary-ink words, doubling as the drop target
for the column's first card — and the ruling asks for that box GONE, not
reworded.

New prop, board-wide, default `"register"` (every existing caller draws
exactly as before): `emptyColumns="bare"` swaps every empty column's
`EmptyRegister` for an unstyled `<div role="group" aria-label>`, tall
enough to stay a findable drop target for the same reason `EmptyRegister`
itself gives — "a 12-tall strip is not something a pointer can reliably
find" — so a screen reader can still learn the column is there and empty
while nothing at all draws for a sighted reader. One prop for the whole
board rather than per column: a board where one empty column drew a box and
its neighbour did not would read as a bug, not a style. The empty BOARD
register (no columns at all) is untouched — this is about a column, never
the board.

Demo: `demo/collections/i-l.tsx`'s `kanban` section gets a second "empty
column" example next to the existing one, `emptyColumns="bare"` on the
identical data, so the two read side by side.

### Fixed — `CalendarView`'s compact (below `sm:`) dots open the day, and read `event.dot`

The client's ruling, 2026-09-15: the calendar is the month grid, full stop,
even on a phone — *"Agenda is a different component than month. Inside the
calendar, the whole month agenda: disable that. When I mean calendar, I mean
the month view."* That removed the one escape hatch a busy phone had, and
left chapter 18's below-`sm:` dots exactly where CV-3 (the "+N more"
more-line, v1.2.9) found the desktop chips before it: `aria-hidden`, no
`onSelectEvent`/`onSelectMore` wiring, and nothing to tap — a phone reading
the month grid could see that a day had records and could not open a single
one.

Three fixes, one file. **(1)** The dots now sit inside `CompactDaySummary`,
a real `<button>` the moment the caller can open the day —
`onSelectMore` preferred (the SAME handler the desktop more-line calls, so
the day opens identically from either width, handed every event on that
day), `onSelectDay` the fallback. Its accessible name is the day's own
visible label plus the count, read off the button's ordinary subtree rather
than a hand-assembled `aria-label` (`day.label` is a caller node; this file
formats nothing, ruling 07) — a new `formatDaySummary` prop overrides the
words, the same override `formatMoreEvents` already offers the desktop
line. Where the cell is ALREADY a button (`onSelectDay`, `pickable`), a
nested button would be invalid HTML, so the count instead rides the cell's
own accessible name through a plain `sr-only` span. **(2)** Each dot reads
`event.dot` (27.25's status colour) before falling back to `tone` — the
same precedence `eventChipClass` already uses for the chip it stands in
for below `sm:`; before this the dot read `tone` only, so a task's priority
colour never reached the phone at all. **(3)** Capped at three dots
(`MOBILE_MAX_DOTS`, independent of `maxEvents`, which caps the desktop chip
column only) plus a small "+N" mark, matching chapter 18's small drawing.

Demo: `demo/collections/a-ca.tsx`'s `calendar-view` section gets a new panel
showing the compact control at the phone width switch, and 5 September's
four events (two `dot`, two `tone`-only, one over the cap) exercise all
three fixes on one cell.

### Added — `ScreenShell` gets `asideHandleOnOpen`, so a caller can drop the OPEN mid-edge close grab

The client, 2026-09-15, verbatim, over a screenshot of the consuming app's
open assistant: *"remove the button with the emoji and the mango background
that's vertically in the middle of the screen on the extreme right when I
have the assistant opened. It has a function to close it. We don't need
this. Keep the one on the top right when the assistant is closed, but the
one in the middle when the assistant is open, remove it."*

`ScreenShell`'s aside `EdgeHandle` has always drawn in two places: the
SHUT branch takes the screen's top-trailing corner (the only way back into
a column that draws nothing else, added 2026-09-04) and the OPEN branch
takes a `top-1/2` mid-edge close grab on the column's own edge. The
consuming app already carries a second close control on the open column —
the × its `BreadcrumbFolders` folder tab draws (`onClose`, in
`web/components/shell/app-shell.tsx`) — so the mid-edge circle was a second
way to do the one thing the tab already does, on the exact screen the
client is looking at.

New prop, default `true` (every other consumer draws exactly as before,
unconditionally): `asideHandleOnOpen={false}` drops the OPEN branch only —
the SHUT branch is untouched, because it is still every caller's only way
back in. Gated at the `EdgeHandle` call site with
`{(asideHandleOnOpen || !isAsideOpen) && (…)}`; see the props interface for
the full ruling, including why this is a per-caller opt-out and not a
kit-wide default change (a caller with no other close control on the open
column would lose its only way back with nothing offered in trade).

### Changed — `UnsavedChangesBar` gets a visible band, not a matching one

The client, 2026-09-15, verbatim, over the shipped v1.2.82/83 row: *"the 'You
have unsaved changes' pinned bar at the top had a different color. Please
implement that because right now it's in the same color as the container,
which makes it not so visible."* Exactly right: the two real call sites
(`kwapso_system`'s Settings › Appearance and Settings › Team › Roles) both
leave `ground` at its default, `"bare"`, so the row painted nothing and the
app's own `PINNED_TOOLBAR` wrapper painted the container's own tone straight
through it — a warning DOT was the only thing distinguishing "you have
unsaved changes" from the panel it sat in.

The row now paints its own translucent warning wash unconditionally —
`bg-warning/10` plus a `--warning`-tinted hairline at 35% (the boundary law's
inset-shadow remedy, `foundations/rules/borders.mjs`; a `border-*` utility is
forbidden outright) — instead of matching whichever paper it stands on.
`ground` no longer picks a fill (every value now paints the same wash); it
now decides only which corners round: `"bare"` rounds the top edge alone
(`rounded-t-[var(--radius)]`, R31's own second named position, "the top band
of a pinned toolbar," R63 part 4) so it agrees with `PINNED_TOOLBAR`'s own
corner engineering instead of rounding the same edge a second way, and
`"page"`/`"panel"` round all four for the un-pinned, standing-alone mount.

Measured against every ground this row is ever laid over — light/dark
`--surface-panel` and `--surface-raised` — the 10% wash still clears AA
4.5:1 for the caption's `text-ink-secondary` with wide margin (7.55 / 8.27 /
9.56 / 8.54); see the component's own header, "MEASURED", for the script and
the four flattened hexes. This is a deliberate, narrow exception to `Alert`'s
own law ("the panel stays neutral — accents never become a background") —
the component's header says why a row whose entire job is being the one
non-neutral thing on the screen is not the case that law was written for.

### Added — `UnsavedChangesBar`, the dirty-draft flag and its two acts

The consuming app (kwapso_system), 14 Sep 2026: the client, over a screenshot
of Settings › Appearance and Settings › Team › Roles — both stage a draft
behind a Save button today, one of them (Roles) with no way to back out at
all — *"We need some kind of hint or flag, very visible, probably not at the
bottom, that allows me to save or to restart… however we call it normally in
UI, to not save the changes."* The consuming app's own design lane built a
five-option comparison artifact against that sentence and she picked the
first: a quiet band pinned directly under the tab strip, reusing the idiom
the app's own collection toolbar already pins with (its R63) rather than a
fourth kind of sticky chrome.

`dirty` / `onSave` / `onDiscard` / `saving?`, plus every string as a prop
(`message`, `saveLabel`, `discardLabel`, `savingLabel?`) — this file carries
no English of its own, the same boundary every component in this package
holds since `shared/ui/` is outside the consuming app's translation walk.
Renders nothing at all while `dirty` is false. `ground` is `ToolbarRow`'s own
`bare`/`page`/`panel` triple, not a fourth opinion about which paper a
toolbar-shaped row stands on — `bare` (the default) is correct wherever a
caller wraps this in the app's own `PINNED_TOOLBAR`, which already paints
the ground and rounds the top corners behind it. The flag dot is
`--warning`, never `--primary`/mango: both screens this ships on already
spend their one mango on the Save button's own primary fill, and a second
mango mark on the same view is the exact violation `roles-matrix.tsx`'s own
header argues against at length. `role="status"` on the row itself is the
whole of its accessibility contract — the row's own appearance is the
announcement, the same shape the kit's `data-table.tsx` selection line
already uses.

See the component's own header for the full account, including why it does
nothing special at narrow widths (the artifact's own ruling: "chrome
describing form state, not a surface sliding in" — R59 governs modals and
pickers, not this).

### Fixed — `UnsavedChangesBar` narrows by truncating, not by wrapping

The row shipped `flex-wrap`, so a long flag sentence at phone width dropped
the two buttons to a second line instead of truncating — caught rendering
the consuming app's own verify rig at 390px. The artifact's own words are
explicit: "It just narrows: the caption text truncates before the buttons
do." `flex-nowrap`, one line at every width, matching the row's own `min-w-0
truncate` message span the header already documented.

### Added — `ThemeSwatch`, a small colour mark for Settings › Appearance's Light/Dark/System pills

The consuming app (kwapso_system), 2026-09-14, the same day as the two
entries below: the client rejected the shipped Settings › Appearance panel a
second time, pointing at her own design lane's comparison artifact
(`appearance-layouts.html`, option 3) and, separately, "also in appearance
add colors (like in background)" — the Background pills already carry a
small colour swatch before the word, and Appearance's Light/Dark/System pills
should too, matched in size, shape and position.

Background's swatch is a ROLE token, `--spine-fill`, resolved through
`SpinePicture`'s own `[data-spine]` cascade — reachable from the consuming
app's code because it is a semantic token, not a raw palette one. Appearance
has no equivalent: a light/dark swatch is PALETTE-FIXED by definition (the
same reason `ThemePicture`, two exports up, pins hex rather than riding the
theme cascade — a swatch of what dark mode looks like must not flip when the
reader is already in dark mode), and the consuming app's own closed-palette
law (R32) forbids a raw `--kw-*` reference outside this package. So the mark
is drawn here, at swatch scale rather than `ThemePicture`'s thumbnail one —
13px, `--radius-sm`, `ThemePicture`'s own three hex sets transcribed rather
than re-derived — and the app reaches it as a part.

### Changed — `AppearancePreview`'s specimen is a chip, a title and a body, in lorem

The client, 2026-09-14, the same day as the two entries below: *"on the
settings appearance display, do it with chip, title and body — use lorem
ipsums."* Three decisions in that sentence, all applied to the specimen row
(the one row of the three that carries copy and moves with `scale`):

1. **The chip sits above the title, not beside it** — the consuming app's own
   R65 ("on a card that stands for a record, the chip sits above the
   title"), so the preview now demonstrates that law rather than inventing a
   card layout of its own. The chip is a fixed-size mark, like the two
   texture rows beneath it; it does not move with `scale` — only the title
   and the body do.
2. **Lorem is deliberate, not a placeholder for real copy.** A preview is a
   picture of the shape a record takes, not of anyone's data, and it is now
   language-neutral specifically because the consuming app's Language control
   sits immediately beside it (`AppearancePanel`) — an English specimen next
   to a chosen non-English language would read as a bug. Confirmed against
   the consuming app's own `scripts/lib/i18n-source.mjs`: `resolveImport`
   refuses every specifier under `shared/ui/`, so this file is outside the
   translation walk entirely and lorem here can never be catalogued,
   uncatalogued, or flagged stale by it either way.
3. **The body is long enough to make the scale mechanic visible** — the same
   lorem sentence at every step, wrapping onto more lines as the size grows,
   which is a truer demonstration of "the type gets bigger, nothing is added
   or removed" (`ScalePicture`'s own ruling) than a short one-line status
   ever was.

`APPEARANCE_PREVIEW_SCALE`'s second field renamed `meta` → `body` to match.
See `AppearancePreview`'s own header for the full account.

### Changed — `AppearancePreview` reads as a product, not a placeholder

Shipped in v1.2.77 (see the entry directly below), seen live by the client the
same day, and corrected the same day: *"Fix the preview because it looks
shit. It was already good in your artifact, so fix that."* Her own words for
the shipped preview: *"a flat mango rectangle containing one rounded white
card with 'Record title / Status · 4 open' and a grey bar."* The artifact was
a design-lane review page with four candidate layouts for the panel; the
reference she meant was the small live app mock its fourth ("preview-led")
layout carried — a standalone page with its own throwaway tokens, not
something to copy into the kit, but diagnosable: it was POPULATED (a title,
a meta line and two more content rows, not one row adrift in a padded panel),
its top chrome was legible (a real bar, not a 2px hairline at 32% opacity —
which is the exact "grey bar" she named), and its layers read as layers
rather than collapsing into one box.

Applied to this component's own real parts, in its own real tokens: the panel
now holds three rows, top-aligned — the first is still the one specimen that
carries copy and moves with `scale`, the two beneath are fixed-size texture,
fading per row so the eye reads "list continues"; the breadcrumb is two
segments, thicker and more opaque, so it reads as a trail rather than a
stray line; and the panel now wears the same `shadow-[var(--hairline)]` the
row already wore, so its edge survives where panel-on-card's own colour
contrast (1.103 light, 1.111 dark) is too thin to carry it alone — the
identical move the consuming app's `sections-stand-on-paper` law had to make
for a real panel on a real card, applied here to a picture of one. Nothing
about the resolved-theme contract, the ground/rail/card hierarchy, or the
scale mechanic changed; none of those were what she was pointing at. See this
file's own `AppearancePreview` header comment for the full diagnosis.

### Added — `AppearancePreview`, so Background stops being a swatch on a rail

The client, 2026-09-14, choosing between four Settings · Appearance layouts a
consuming app put in front of her, picked the preview-led one and ruled on
what was wrong with the picture Background had: *"Represent in the preview
better the background (currently it's the old coloured navbar only)."* The
only picture on offer was `SpinePicture` — a 44px `THUMB_RAIL` swatch — and it
was never built to carry the argument `screen-shell.tsx`'s own 2026-09-02
reshape makes: the spine is the ground the WHOLE window stands on, not a
stripe down one edge.

`AppearancePreview` draws that hierarchy at preview size — ground, the rail
lying on it painting nothing, a floating card, the soft panel inside it, a row
at the chosen scale — the same four rungs `screen-shell.tsx`'s own diagram
draws for the real screen, so ink/paper/mango read as different at a glance
for the reason they are different in the real app, and `--shadow-lifted`
carries the thin edges (paper, mango) rather than the preview faking only the
strong one (ink).

It takes `theme` already resolved (`"light" | "dark"`, never `"system"` — a
picture has no clock; see `ThemePicture`'s own precedent for why), `spine`,
and an optional `scale`, and is pure and prop-driven like its three siblings:
no internal state, safe to re-render on every control press.

### Changed — the grid turns rather than being handed its axes backwards, and the column that names a row stops scrolling away

Two things came back from the consuming application on the day it shipped a
roles matrix built out of `PermissionMatrix`, and they are one story: **it drew
the grid transposed, and every row-shaped thing in the component was then on
the wrong axis.** `rights` was the first one somebody counted. It was not the
only one, and that is why the answer is not another prop for `rights`.

**THE TRANSPOSE, AND WHY IT WAS ALLOWED.** The app's Team tab draws its four
roles down the side and its twenty-two modules across the top — the client's
own approved shape, *"a matrix in which we see all the roles as rows and the
properties as columns"*. `PermissionMatrix` draws CH27.12's: collections down
the side, roles across. So the app handed its roles to `modules` and its
modules to `roles`, which the props permitted because their own doc strings
said "one row" and "one column" and nothing in the file said which noun was
load-bearing. Everything worked. Then v1.2.72 added `PermissionModule.rights`
— *"an unoffered box stops pretending to be a switch"* — and it could not be
used at all.

**`rights` IS ON THE COLLECTION AND THE COLLECTION HAD BECOME THE COLUMN.**
Whether `teams` has a delete door is constant DOWN that column and varies
ACROSS it; a row-shaped prop is constant across the row and varies down it. The
two never coincide. **The app measured what that costs and the number is
exact: eight of its twenty-two modules restrict their rights, so FIFTEEN of the
eighty-eight boxes in every role's band still look like switches and decide
nothing** — R36's defect, the one that prop was written to remove, surviving a
single rotation of the drawing.

**THE SHAPE THAT WAS REFUSED, AND WHY IT IS THE SMALLER DIFF AND THE WORSE
ANSWER.** `rights` on `PermissionRole` as well was the other suggestion. Three
reasons against, each sufficient on its own:

- **It invents a product rule nobody has ruled.** On a collection, `rights`
  means "this collection has no delete door". On a ROLE it would have to mean
  "this role may never be given delete anywhere" — a cap on a role, a second
  concept wearing the first one's word. The client named four actions and ruled
  that all sixteen subsets are legal; they have never been asked about a role
  that cannot be given one. A kit that ships that prop has legislated past its
  own rulebook.
- **It needs an intersection rule the moment both are set**, and there is no
  right answer to invent: a grid whose row offers `see` and whose column offers
  `edit` draws either nothing or something, and either way this file would be
  deciding a product's policy inside a `&&`.
- **It fixes one of several.** `description` is a collection's quiet line and
  has nowhere to go in a column head; the lock's mark sits on a row and names
  the roles it locked, which transposed must name MODULES; the narrow render
  draws one card per collection; the width floor counts roles. Answering
  `rights` alone leaves a grid that is right in one cell and wrong in five
  places around it.

**SO THE AXES BECAME A PROP AND THE DATA STAYED WHERE IT BELONGS.**
`PermissionMatrix` grows `orientation`, defaulting to `"modules-as-rows"` —
CH27.12's own, and every grid drawn before today is unchanged to the pixel.
`"roles-as-rows"` turns it. **Nothing moves in the data:** `held`, `rights` and
`locked` stay on `PermissionModule`, because whether a collection has a delete
door is a fact about the collection and the drawing turning is not a fact about
anything. A caller stops passing its roles as `modules`, and the one thing it
has to know is which way round the grid is drawn, which is a thing it can see.

What turns, and what deliberately does not:

- **the row** carries the name, the quiet line and the lock's mark at either
  orientation. `PermissionRole` grows `description` for that reason and no
  other — the symmetric half, absent by default, so a transposed grid is a
  whole drawing rather than one missing the line its rows can carry;
- **the lock's mark names the other axis.** Locking is still stated per role
  inside a module, so a locked cell is the same cell either way; the mark sits
  on whichever entity is the row and names the other one when only some are
  locked. Measured in the browser: drawn the kit's way the `capacity` row reads
  *"Capacity — Locked by policy: Manager"*, and turned, the same data reads
  *"Manager — Locked by policy: Capacity"*. `formatLockedLabel` is unchanged;
- **the cell's sentence does not rotate.** `formatCellLabel` is still
  `(collection, role, held, locked, notOffered)` and the default still reads
  *"Admin · Capacity: See, Create, Edit, Delete"* — byte-identical at both
  orientations, verified. A screen reader is not scrolling anything, and a
  sentence that reordered itself with the drawing would make one cell announce
  two ways in two apps;
- **the narrow render follows the rows.** CH27.12 says *"one card per
  collection with its roles listed inside"*; turned, that is one card per role
  with its collections inside — the same instruction read on the axis the
  caller chose, not a second layout;
- **the width floor counts columns.** It always meant columns; it said "roles"
  because until today the two were the same word.

**AND THE OTHER HALF THE SAME TRANSPOSE EXPOSED: `Table` HAD A STICKY HEADER
AND NO STICKY COLUMN.** Twenty-two columns overflow, the grid scrolls inside
its own container — correctly, and it is why the page never scrolls sideways —
and the column that says WHICH row this is goes with it. Scrolled to the end
the reader sees four bands of `S C E D` with no idea which one is Admin.

**IT IS THE KIT'S, NOT THE APP'S, AND THE ARGUMENT IS ONE SENTENCE:** this is a
table that can overflow, whichever way round it is used, and `TableHeader
sticky` has answered exactly this question on the block axis since it was
written. There was simply no inline twin. The app could only have fixed it by
writing `position: sticky`, a ground, a z-order, an inline-start inset and
three row washes into a `className` on the kit's own cells — a kit bug wearing
an app's diff (§13, and the client's *"the kit is the only UI input"*).

**`TableHead` and `TableCell` grow `sticky`.** One prop on the two cells that
need it; `Table` learns nothing and the sixteen call sites that do not want it
are untouched. `PermissionMatrix` spends `stickyNames` and `stickyGround` on
them and draws nothing of its own.

- **THE PIN IS LOGICAL.** `start-0` is `inset-inline-start`, so the column pins
  to the reading start and mirrors in Arabic, Urdu and Persian with no second
  rule. `z-[1]`, not `z-10`: a sticky header is a positioned element with its
  own stacking context, so a pinned cell inside one is already above every body
  cell and the two numbers never have to be compared.
- **THE PAPER IS THE CALL SITE'S, AND 1.000 IS THE RIGHT NUMBER.** A pinned
  cell must be opaque or the scrolled cells read through it, and it must be the
  SAME paper as the ground or it is a pale band down the side of every grid
  that never scrolls. Everywhere else in this kit two surfaces at 1.000 is the
  defect the contrast law hunts; here it is the point, and that law already
  says so about a sticky strip in as many words — *"an element that names the
  same token as its ground is a continuation, not a boundary"*. So it takes
  `--background` and the call site swaps it, exactly as `TableHeader sticky`
  has always asked (GAPS-D TBL-2), and `PermissionMatrix`'s `stickyGround`
  names one of the three papers a kit table stands on rather than guessing one.
  **`stickyNames` is OFF by default for the same reason**: a pin that guessed
  would paint that band on every grid that never scrolls.
- **THE ROW'S THREE WASHES ARE REPLAYED ON THE PINNED CELL.** `TableRow` paints
  hover, selected and disabled on the `<tr>`; a cell with an opaque fill covers
  all three, so a pinned name column would sit dead while the rest of its row
  lit up. The three are restated on the cell in MUTUALLY EXCLUSIVE selectors —
  disabled, then selected-and-not-disabled, then hover-and-neither — which is
  `TableRow`'s own precedence written as CSS that cannot race. PATTERN §4
  forbids leaning on Tailwind's emission order to break a tie; the `:not()`s
  are what make sure there is never a tie to break.
- **THE HOVER WASH IS A SECOND LAYER, AND THAT IS ARITHMETIC RATHER THAN
  TASTE.** `--accent` is `rgba(26,25,24,.05)`. An alpha written as this cell's
  `background-color` REPLACES the opaque paper instead of sitting on it, and
  the scrolled cells come back through the ninety-five per cent that is left.
  So the paper stays the colour layer and the wash goes on the image layer,
  which paints above it. It composites to **#ECE7E0 light and #272623 dark —
  the same two hexes the row's own wash makes over the same ground.** The pin
  does not approximate the row; it repeats it.
- **NO EDGE, and there is nowhere to draw one anyway.** Chapter 13's subtitle
  is *"Colour separates, strokes don't"* and a pinned column is the paper
  rather than a panel on it. It is also unbuyable: the row's hairline is an
  inset shadow this file puts on the CELLS through `[&>*]:shadow-…`, which
  outranks any `shadow-` a cell writes on itself, so an edge would need a
  selector invented to beat the row.
- **NO SCROLL PADDING FOR IT, LOGGED RATHER THAN GUESSED.** The container
  carries `scroll-p-1` so a focus ring in an off-screen column comes fully into
  view. Tabbing BACKWARDS to a control off-screen at the inline start still
  brings it to the container's edge, which is under the pin. A scrollport
  cannot measure what is pinned to it, so no number is invented; a call site
  that knows its own name column may pass a `scroll-ps-*` through
  `containerClassName` (§11.1).

**MEASURED IN REAL CHROME, BOTH PALETTES, AT `verify/permission-turn`.** The
transposed grid is 2559 wide in a 1190 container. Scrolled to its end the name
cell moved **0** and a run moved **−1369**, with **56 cells passing underneath
the pin**; with `stickyNames` dropped the name cell moved −1369 with the rest
and nothing was underneath anything. The pinned fill reports
`rgb(247, 242, 235)` in light and `rgb(28, 27, 24)` in dark — byte-identical to
the ground element's own fill in both, alpha 1. Every band is **88 boxes with
15 dashes and 73 pressable slots**, which is the application's arithmetic
reproduced exactly; the Manager band drops to 69 pressable, which is its one
locked collection. The pin was proved on the axis it was NOT asked for as well
— twelve roles, the kit's own orientation, 1510 in a 1175 container, name cell
moved 0, 88 cells underneath.

Measured against the token model, light / dark: pinned paper against its own
ground **1.000 / 1.000**; the guess — page paper on a panel ground —
**1.103 / 1.079**, and on a card ground **1.000 / 1.198**, which is the band
`stickyGround` exists to prevent; the selected wash on the pin against a panel
ground **1.103 / 1.111**; the disabled wash **1.214 / 1.252**; the hover wash
over the pin against the paper **1.103 / 1.143**; the row's name on the pinned
paper **15.763 / 17.056** and the lock's mark **5.899 / 8.807**.

**TWO PROBES, AND BOTH OF THEM FOUND SOMETHING, WHICH IS THE ONLY REASON TO
RUN THEM.**

- **The wash rules were not being emitted, and nothing looked wrong.** The
  three replayed washes are arbitrary Tailwind variants; the classes were in
  the DOM and the browser was painting none of them. The CSSOM probe that says
  so returned an empty list on its first run — because it walked each sheet's
  TOP-LEVEL rules, and Tailwind v4 emits every utility inside `@layer
  utilities`: 134 rules seen of 1558. The probe recurses now and reports
  exactly three matching rules, one per wash, with the declaration each one
  makes. A check that has stopped looking prints the same green as a check that
  passed.
- **The contrast law cannot see a pinned cell's ground, and this is recorded
  rather than assumed.** A probe put the wrong paper under a pinned column —
  `bg-background` on a `--surface-raised` ground, two different names resolving
  to one colour, 1.000 in light, the exact bug shape that law exists to catch
  — and the run came back GREEN. Three arrangements were tried: the ground
  inside `PermissionMatrix`, the ground on the demo's `Panel`, and the ground
  on a bare `<div>` around the table. All green. The reason is structural: a
  pinned cell's fill sits behind `Table` → `TableHeader` → `TableRow` →
  `TableCell`, and the ground walker does not carry a call site's paper through
  that many component boundaries. **The probe did fix one thing on the way** —
  `permission-matrix.tsx`'s paper was an object literal indexed inside a
  render, a shape the walker cannot read at all, and it is a module-level table
  now, the `COLUMN_DOT[dot]` form the check states it reads. The blind spot is
  written into `table.tsx` beside the numbers, which are measured off the same
  token model the law uses.

**THE SPECIMENS DRAW THE DEFECT, NOT A TIDY VERSION OF IT.** The picture law's
own entry records specimens drawing a 32×32 square through the one slot whose
only question was what happens to something that is not one, so: the
`PermissionMatrix` section gains the app's grid at its real size — twenty-two
collections, four roles, eighty-eight boxes a band, fifteen of them dashes —
**drawn twice, once pinned and once not**, so the thing that is wrong is on the
page beside the thing that fixes it; and a third panel draws twelve roles in
the kit's own orientation, whose floor is 91.5rem, because a pin proved only on
the axis that motivated it is a pin proved on half the claim. `Table` gains a
"Pinned column" panel beside its sticky-header one, with a selected row and a
disabled row in it so the replayed washes are visible rather than described.

**WHAT A CONSUMING APPLICATION CHANGES.** `web/components/team/roles-matrix.tsx`
stops transposing: `modules={moduleColumns}` and `roles={roleRows}` swap back
to their own nouns, `orientation="roles-as-rows"` says which way to draw,
`moduleLabel`/`roleLabel` name the two headings, `rights` finally goes on the
module rows it always belonged to, and `stickyNames stickyGround="panel"` pins
the role's name. Its `offered()` guard and the two hand-written honesty patches
under it — filtering a held tick to the offered rights, and swallowing a press
on an unoffered box — are deleted, because the kit does all three now. Its
`formatCellLabel` keeps its five parameters and gets them in the kit's declared
order at last: `(moduleLabel, roleLabel, held, locked, notOffered)`, with the
fifth no longer arriving empty. The upstream ask written into that file's
header — *"the kit needs the same prop on `PermissionRole` … or an
`orientation` on the matrix itself, which is the better shape"* — is answered,
and it is answered the way that file guessed.

`npm run check` exits **0**.

### Changed — a picture fills its box: the client's `"fill, not fit"`, applied where it belongs and then made a law, because the census that found the sites had already missed two

The client, 2026-09-09: *"everywhere for images: do fill, not fit!"* — and she
named the price in the same breath. **A wide logo losing its ends is the
intended consequence, not a side effect to design around.** That sentence
overrules `KWAPSO-SPEC.md` CH27.28's *"Portrait assets letterbox onto paper
rather than being cropped to fill"*, which is quoted by name in four files
here and was the stated reason for every `object-contain` in the kit.

**THE COUNT THAT ARRIVED WITH THE TASK WAS WRONG, AND THAT IS THE ENTRY.** A
grep across both repositories reported nine `object-contain` against eleven
`object-cover`, four of the nine in this kit. It missed two, for one reason: a
fit is not always spelled as a class.

- **`components/gallery/gallery.tsx` letterboxed the entire gallery wall** —
  written `<Image fit="contain">`, a PROP. It is the single most visible
  picture surface either product draws and it was invisible to the count sent
  to find it.
- the consuming app's `attachment-preview.tsx` does the same thing the same
  way, and was missed the same way.

So the fix is not five strings. It is four components, one of which nobody
knew about, plus a law that derives the census on every run instead of
trusting one taken by hand on one afternoon.

**THE THREE OPTION MARKS WERE DISAGREEING WITH THE KIT'S OWN RECORD MARK, AND
THAT IS THE REAL DEFECT UNDER THE RULING.** `SelectItem`, `DropdownMenuItem`
and `Choice` each draw a picture beside a label — ruling 30's square record
mark, at 24, 24 and 32. All three contained. But a RECORD's mark is
`Avatar shape="square"`, whose `AvatarImage` has covered since it was written,
and `compositions/screens/company-hub.tsx` draws a supplied company logo
through exactly that, under CH27.43's own sentence: *"A supplied logo is
placed inside that square, never floated free and never allowed to set its own
shape."* `List`'s row mark covers too. So Padelbase's logo was **cropped in
the record and letterboxed one row down in the picker that chooses it** — one
asset, one size, two silhouettes. All three now cover. The sizes still differ
by row height and deliberately do; the fit no longer does.

`GAPS-REVIEW1B.md` OPT-1 had this open as a question — *"the artifact draws no
option with a picture in it"*, the mark assembled from rulings rather than
drawn, with a **Confirm** attached. The ruling is the confirmation, and it
went the other way from the guess.

**`components/gallery/gallery.tsx` drops `fit="contain"` and passes no `fit` at
all.** The absence is the decision: `Image` defaults to `cover`, and naming
`fit="cover"` here would be a second copy of that default in the file least
likely to be revisited when it moves. `fit` is not forwarded as a `Gallery`
prop either — a wall whose tiles could each choose is the ragged wall. It is
also the header bullet finally agreeing with itself: CH27.28's own grid
sentence is *"the grid fills, it does not stretch — a tile never grows to
400"*, and the whole point of `auto-fill` at a 200 minimum is that every tile
is the same box. Identical boxes each holding a differently-shaped picture
floating on quiet paper is a ragged wall with tidy geometry underneath.
**What it costs is stated in the file rather than buried:** a portrait asset
now shows its middle, and the chapter's worry about cutting a face out of the
frame is real and is answered by the ruling, not by this note.

**`components/image/image.tsx` DID NOT CHANGE A DEFAULT, BECAUSE THE DEFAULT
WAS ALREADY RIGHT.** It has offered `fit` as a cva variant since it was
written, defaulting to `cover`. So the ruling is about a default this file
already had, and **not one call site in either repository re-crops** — the
kit's own `Image` uses take the default, and of the app's five, four take it
and one asks for `contain` explicitly. What changed is that the default
stopped being this file's preference and became `RULES.md` §4.4, checked.
**`contain` STAYS ON OFFER**, and that is the one `contain` kept in this
repository: the ruling is about what a picture does when nobody says
otherwise, and §9.1 forbids dropping a variant value in any case — an app
pinned to an older tag would stop compiling on upgrade. It is recorded as the
one `images` entry in `foundations/rules/exemptions.json`, with the argument
written out, and it rot-checks against the branch itself.

**`foundations/rules/images.mjs` — the fourth law in the conformance seam.**
`docs/RULES.md` §4.4 is the prose; this is the same sentence executed, over
the kit's own source with no arguments and over a consuming app's with paths.

- **It reads four spellings**, because the hand census proved that reading one
  is not a census: the utility (`object-contain`, `md:object-contain`,
  `data-[state=open]:object-none`, `object-[contain]`), the `fit` prop, **a
  component's own destructuring default `fit = "contain"`** — a component
  quietly letterboxing for every caller who says nothing, which is worse than
  one call site asking — and an inline `objectFit`. `fit === "contain"` is
  excluded by a lookahead: a comparison inside `image.tsx` is the component
  implementing the prop, not anybody choosing a value.
- **It enumerates the SUBJECT where `borders.mjs` enumerates the exceptions,
  and the header says why.** The boundary law cannot enumerate borders because
  Tailwind can always grow a fourteenth spelling. `object-fit` has exactly five
  values and a sixth would be a CSS Working Group decision. Everything else
  under `object-*` is `object-position` — a different property, counted and
  passed over. One such utility exists in this kit (`sign-in.tsx`'s
  `object-[51%_50%]`) and is correctly none of this law's business.
- **`fill` is a finding, and that is not a slip.** `object-fit: fill` stretches
  the picture and distorts it. "Fill" is the client's own word for what she
  wants and `fill` is not it; a law that waved it through on the strength of
  its name would ship the one result nobody asked for. `none` and `scale-down`
  the same.
- **The blindness tripwire is not `borders.mjs`'s**, and the difference is the
  point. That law can only go blind by reading no classes. This one has a
  second and sharper way, and it is the failure that actually happened: a run
  that **saw pictures and could not see one decision about how they fill** —
  fits in a `.css` file this scanner does not read, or arriving through a
  variable. Elements carrying a `src` are counted for exactly this, and a walk
  with pictures and zero readable fits is reported BLIND, not OK.
- **What it deliberately does not check** is in the header with its reason
  each: whether a picture has a fit at all (an `<img>` at natural size in an
  unsized box needs none, and there are several here — a clause demanding one
  would put `object-cover` on every glyph-shaped `<img>` to satisfy a
  scanner); `background-size: contain`, which is genuinely its subject, has
  zero matches in this repository, and is named-and-unwritten the way
  `borders.mjs` leaves `divide-*`; and which picture has a real claim to
  letterbox, which is a judgement and therefore exemption data.

**PROVEN BY BREAKING WHAT IT GUARDS, which is the only evidence a green check
is worth.** Six probes, each run to an exit code rather than a pipe: a class
`object-contain` (1 finding), a `fit="contain"` prop (caught where the grep
was not), `object-fill` (caught on the trap word), an inline
`objectFit: "scale-down"`, and `md:object-[contain]` beside
`data-[state=open]:object-none` in one list (2 findings) — all exit 1. Then
the tripwire: two pictures whose fit arrives through a template interpolation
reports **BLIND**, exit 1, and goes green the moment one readable `cover`
joins them. Then the rot check, both directions: the `image.tsx` entry over a
root without that file reports **dead**, and the kit run with the exemption
list emptied reports `components/image/image.tsx:261` — so the entry is
load-bearing rather than decorative.

**`docs/RULES.md` §4.4 is new prose, and §12 and §13 were corrected rather
than appended to.** §12's table gains `images`; the adoption commands and
`--law` list gain it. §13's classification gains the picture law to the group
the app has no twin for — and it gains a paragraph on why, because this is the
pattern that section exists to name: a client sentence arrived, the hand census
sent to apply it missed two sites, the app had six live sites and no law that
read any of them, and there was never going to be an app-side twin because the
app's `record-mark.tsx` resolves cover-or-contain from a component's shape,
which is an answer to the question rather than a check on it. **§13's closing
count is also split in two, because it was ambiguous before this change and
adding to it would have made it worse:** *"16 of 55"* is the app's laws the
kit owns; *"five executable"* is `check-contrast.mjs` plus the four in
`conformance.mjs`. Those are different sets and the old sentence read as one.

**The specimen was drawing a square through the slot whose only question was
what happens to something that is not one.** `demo/sections/c-d.tsx` and
`n-s.tsx` built their option marks from a 32×32 data URI, which renders
identically under `cover` and under `contain` — the panel could not have shown
the defect and could not have shown the fix. A `wordmark` helper at 3:1 now
draws one option in each of the three, so the ruling is visible: the mark
fills its square and the ends of the word are gone. `demo/sections/f-m.tsx`'s
`fit` panel keeps both examples and stops presenting them as peers — the cover
example drops the redundant `fit="cover"` to show the default doing the work,
and the labels say which is the default and which is opt-in.

**Every `contain` in this repository, with its decision.** Four class sites and
one prop site were found; four were changed, one was kept, and the kept one is
the only `contain` left: `select.tsx`, `dropdown-menu.tsx` and `choice.tsx`
now cover because their mark was disagreeing with the record's;
`gallery.tsx` now covers because the ruling overrules the chapter it was
obeying; `image.tsx`'s branch stays because it is the prop, not a picture.

### Added — `PermissionModule.rights`: a collection may offer fewer capabilities than the matrix draws, and an unoffered box stops pretending to be a switch

The cell has had four boxes since the client's 2026-08-24 ruling, and it drew
four whether or not four decisions existed behind them. The switch was there
because the GRID has four capabilities; nobody had ever asked whether the
COLLECTION has four. The consuming application counted, and the answer was
**fifteen of eighty-eight boxes decided nothing** — one whole collection had
four boxes and no door behind any of them. An inert box looks exactly like a
live one, so an owner who ticked it was told they had granted something, and
the grid was the thing telling them.

**`components/permission-matrix/permission-matrix.tsx`** —
`PermissionModule.rights?: readonly string[]`. Absent, every capability is
offered and every grid drawn before today is unchanged, measured rather than
assumed. Given, it is the subset this collection offers **at all**, and the
distance from `held` is the whole prop: `held` says whether a role HAS the
capability, `rights` says whether the capability EXISTS here to be given.

**The slot keeps its place and loses its control.** Not its place, because
position is the one property approach A was chosen for — four collections
drawing four, two, four and three slots would put every letter under a
different column and there would be nothing left to read down. So an unoffered
slot is the same 1.375rem in the same order, and what it drops is the well and
the letter.

| | offered, held | offered, not held | **not offered** |
| --- | --- | --- | --- |
| element | `<button role="checkbox">` | `<button role="checkbox">` | `<span aria-hidden>` |
| fill | `--surface-inverse` | `--card` | none |
| edge | none — the fill is the edge | `--hairline-strong` | none |
| mark | the capability's initial | the capability's initial | `—` |
| ink | `--ink-on-inverse` | `--ink-tertiary` | `--ink-tertiary` |
| tab stop | yes | yes | **no** |
| tooltip | the capability's word | the capability's word | **none** |

**Why a mark and not an empty box.** Rule 5.4 says prefer nothing to a
placeholder and never invent a dash to fill a hole — and that is about a value
that has NOT ARRIVED, where a dash claims knowledge the component does not
have. Here the dash IS the knowledge. The empty box cannot carry it, for a
reason this file already had written down: a not-held slot's own edge measures
**1.526 light / 2.185 dark**, the system's accepted failure, so an empty slot
beside a not-held one would differ by an edge below the 3:1 floor and a reader
could not tell "no switch" from "switch, off" — R36's defect, rebuilt inside
the kit. The mark is `--ink-tertiary`, **5.899** on the darkest paper it meets
in light and **7.928** in dark against 4.5, so it is legible whether or not
the wells around it are. The glyph is the kit's own no-value em dash, the one
the demo already draws for a value that is not there in five places, not a
coined one; it is not a string prop because it is the same glyph in Arabic,
Urdu and Persian, and the WORDS for the state are `notOfferedLabel`, which is.

**And the lozenge breaks where the decision does not exist, which is correct.**
Held slots fuse because a held slot drops its hairline; an unoffered slot
between two held ones stops them fusing. Measured on Invites (`see`, `create`,
`delete` offered, `edit` not): the run reads S·C fused, a dash, then D
standing alone. Two adjacent decisions are one shape and two decisions with no
decision between them are two — the silhouette is telling the truth it was
built to tell.

**It is not counted, and the disagreement is a real case.** `holds` returns
false for an unoffered capability whatever the sheet says: a right withdrawn
from a collection leaves rows behind it, and a capability that does not exist
here cannot be one somebody has. Nothing is written and nothing is corrected.
Measured on a row offering only `see` whose sheet gives the owner `edit`: with
`rights` the cell announces **"Owner · Activity: See · Create, Edit, Delete:
not offered"**, and with `rights` dropped the same data announces **"Owner ·
Activity: See, Edit"**. One prop is the only variable between those two
sentences.

**Said in words, once.** The cell's accessible name names the capabilities the
collection does not offer and the slot is `aria-hidden`, which is the rule
`LockMark` already follows — a fact read once per cell rather than five times.
`formatCellLabel` takes them as a **fifth parameter, not a second prop**: a
function of four parameters is assignable to a type of five, so every existing
formatter still compiles and still behaves, and word order stays in the
formatter a caller already owns. On a partly-locked row both clauses land in
order: **"Lead · Capacity: See, Locked by policy · Create, Delete: not
offered"**.

**The legend gains the third register the locked one never earned.** A legend
turns a mark that is not words into words; the lock's mark IS words on the row
a few millimetres away, and this one is an em dash. It is drawn only when a
shown row actually withholds something — measured, four registers with
`rights` and three without — and it shows the dash WHERE IT LIVES, one hole in
a run of wells rather than a lone dash, because position is the part the
reader has to learn.

**Measured in `verify/permission-rights` with real Chrome, both palettes, 1280
and 380.** The four slot rects in a withheld cell are **552.86 / 573.48 /
594.11 / 614.73, all 20.63 × 20.63** — identical to the hundredth to the same
cell with `rights` dropped, so nothing moves when a capability is withdrawn.
An unoffered slot reports `background rgba(0,0,0,0)`, `box-shadow none`, ink
`#5f5d59` light / `#bdb9b1` dark, and `focusable false` while its offered
neighbour in the same run reports `focusable true`. Clicking all four slots of
that cell through the real DOM produced exactly **one** change,
`activity/owner/see=false` — the three dashes called nothing. The narrow
render below 45rem draws the same four slots with the same sentence, and 380
has no horizontal overflow.

The canary is the same harness against the previous file: `rights` is not a
prop, every slot is a well and a letter whatever the URL says, no dash appears
anywhere, and the legend reports two registers in both modes.

### Added — `CalendarView onSelectMore`: the more-line stops being a sign on a locked door

GAPS-COL1 CV-3 added `formatMoreEvents` so a busy cell would SAY how many
events it was not showing, instead of losing them silently under the chip
column's cap. It shipped as a `<span>`. A count of hidden records that cannot
be opened is a locked door with a sign on it: the reader is told there are
three more and given no way to reach them, which is a worse resting state than
the honest overflow it replaced, because it advertises the loss. The consuming
application's answer was to fold the overflow into a fake event chip with a
sentinel id so `onSelectEvent` would fire on it — a record that is not a record,
invented downstream to buy a click the kit would not sell.

**`components/calendar-view/calendar-view.tsx`** — `onSelectMore?: (day,
hidden) => void`. The rule is the one the file already applies twice:
`onSelectDay` given makes an enabled cell a real `<button>`, `onSelectEvent`
given makes a chip one, and `onSelectMore` given makes the more-line one.
Absent, the line is the same text it always was and not a tab stop. Read-only
stays honest — three handlers absent is three plain elements, and no cell is
ever drawn with the disabled skin just because nothing is listening.

**It hands back the events, not the number.** `(day, events.slice(maxEvents))`,
in the caller's own order, so the caller opens what the cell withheld without
recounting it off a formatted string. `formatMoreEvents` keeps exactly the job
it had — the WORDS — and what the line DOES is now a separate prop, because a
label and a gesture are two decisions and one of them was standing in for both.

**The drawing did not move, and that is a measurement.** The resting line is
one class constant used by both elements, so a control and a caption cannot
drift apart in a later edit. `verify/calendar-more` with real Chrome, a cell
holding six events at `maxEvents={3}`:

| | `<span>`, handler absent | `<button>`, handler given |
| --- | --- | --- |
| box, x · y · w · h | 225.17 · 264.94 · 146.42 · 15.19 | 225.17 · 264.94 · 146.42 · 15.19 |
| step · ink | 11.25 · `--ink-tertiary` #5f5d59 | 11.25 · `--ink-tertiary` #5f5d59 |
| inline inset | 7.5, the chip's own — dx 0 from the chip edge | 7.5, dx 0 |
| text-align | start | start — a button centres, so it is told not to |
| corner | 0 | 999 (`rounded-pill`), for the wash to have a shape |
| cursor | auto | pointer |
| focusable | **false** | **true** |

Same rect to the hundredth in both states: the line does not shift when a
handler arrives, and nothing above or below it reflows.

**The hover is the cell's own, and it is a colour.** `--accent` — the neutral
row and item wash this file already uses for a selectable cell and chip — over
0.12s on `--ease-kwapso`, with the ink lifting to `--foreground` so the line
reads as a control without borrowing a second colour. Never mango, never an
opacity, per this component's own state 2. Measured on the cell paper:
tertiary rests at **6.506** light / **7.928** dark, sits at **5.890** / **6.848**
once the 5% wash is under it, and the hover ink reads **15.741** / **13.262** —
every one over 4.5.

**The click stops at the line.** Inside a pickable cell the cell is itself a
button and the more-line sits within it, so the handler calls
`stopPropagation`, exactly as the chip's does. Proved rather than assumed:
with `onSelectDay` also given, clicking the line through the real DOM reported
`received: [{ day: "sep-8", hidden: ["b4","b5","b6"] }]` and `dayPicked: []` —
the day was not picked. Below `sm:` nothing changes: the more-line lives in the
chip column that the phone layout already replaces with dots, so it is not
drawn at either setting, and the 380-wide page has no horizontal overflow.

The canary is the same harness against the previous file: the line is a `<span>`
whatever the props say, the probe reports it unfocusable, and a click calls
nothing.

### Added — `ArticleBody quote="pull" | "passage"`: a quoted reply stops being a headline, and a `notDelivered` entry closes

`manifest.json → notDelivered` has carried "A non-editorial quote register on
ArticleBody" as a known limitation, and its own reasoning is the whole case:
every `blockquote` inside the prose was drawn as ruling 13's pull-quote —
SerrifCondensed at the h3 step, primary ink, 48 above and below, "one per
page" — with no second register and no way to opt out, because the treatment
was unconditional descendant CSS on the root. The kit's law-book does not rule
on quotes at all; `blockquote` appears in none of RULES, PATTERN,
BUILD-A-COMPONENT, BUILD-A-SCREEN or TOKENS. THE CASE THAT HAD NO ANSWER was
a quoted reply inside a ticket or a meeting note — several per page, none of
them editorial — which is the ORDINARY shape of user-authored prose, since an
editor that emits HTML emits `<blockquote>` for a quote a person typed
mid-sentence. A pull-quote is the author raising their voice; a passage is
somebody else's words, lowered. Drawing the second as the first made every
quoted reply a headline, and the consuming app has been holding a one-line
override against this entry since it was logged.

`components/article-body/article-body.tsx` — a third variant axis, `quote`,
beside `size` and `measure`. `pull` is chapter 13's pull-quote and the
DEFAULT; `passage` is the register the entry recommended, built as it was
written: "sans, body step, quiet ink, marked by a rule rather than by the
serif". One prop for the whole body, because the markup arrives authored and a
component cannot mark quotes it never sees.

**`pull` did not move, and that is a measurement.** The serif block left the
shared prose list for a variant, so the class STRING changed; the computed
style must not. `verify/article-quote` run against v1.2.64's file and this
one, both palettes, both grounds a body lands on: family, size, leading,
tracking, ink, margins and the gap actually drawn above each quote — identical
on all eight `pull` rows. SerrifCondensed 22.5 / 28.125 / −0.1125, the
primary ink, 45 above and below (24 / 48 at the 15px root). And in the
previous build the `passage` columns came back equal to `pull` — the old
component ignoring the prop — which is what proves the prop is the only
variable.

**What `passage` is, read off the screen rather than the class list:**

| | `pull` | `passage` | the paragraph beside it |
| --- | --- | --- | --- |
| family · size · leading | SerrifCondensed · 22.5 · 28.125 | Saans · 15 · 21.75 | Saans · 15 · 21.75 |
| tracking | −0.1125 | normal | normal |
| ink, light / dark | `--foreground` | `--ink-tertiary` #5f5d59 / #bdb9b1 | `--ink-secondary` |
| mark | none | 2px rule at the inline start, in the quote's own ink | — |
| inset after the mark | 0 | 18.75 (the list's 20) | — |
| space above · below | 45 · 45, its own | 13.125 · 0 — the flow's own 14, nothing of its own | 13.125 |

`sameTypeAsParagraph` and `ruleIsInk` are true on all eight `passage` rows.
The variant writes NO family, NO step and NO margin: the register is the
absence of the serif, and the flow's `[&>*+*]` is what spaces it, so three
quoted replies in one body read as three paragraphs somebody else wrote.

**The ink is tertiary and the rule is that ink — decided by measurement, not
taste.** "Quiet" on this ladder is one tier under the body's secondary, and
`--ink-tertiary` is legible where a passage lands: off tokens.css, against the
darkest paper prose meets in each palette, **5.899** on `--surface-panel` in
light and **7.928** on `--card` in dark, against 4.5 (6.506 / 9.500 on the
page tone). The natural reach for the mark is `--hair-strong`, the section
rule's tone — and it measures **1.526 light / 2.185 dark** against a 3:1
floor for a mark that carries meaning: the "system's accepted failure"
`permission-matrix.tsx` records and mitigates with a letter in every slot. A
quote has no letter. The rule IS the register's whole signal, so it takes the
ink and measures what the ink measures; `currentColor`, so the two cannot
drift. 2 is one of the two widths that live off the scale as grid lines
(RULES §1.2), and the inset after it is the list's drawn 20, so a quote and a
list share one left edge.

> **Corrected on the way in, 2026-09-09.** This register was written against
> v1.2.64 and drew its rule as `border-s-2 border-current`. The boundary law
> (`foundations/rules/borders.mjs`) landed in v1.2.70, after it, and makes a
> CSS border a finding wherever one is drawn; an inset shadow is one of the
> three remedies it names. The rule is now
> `shadow-[inset_0.125rem_0_0_currentColor]` — the shape `comments.tsx`
> already uses for a quoted reply's inline-start rule, at 2px in the ink
> rather than 1px in `--hair` — and nothing renders differently, because the
> colour and the width are the ones that were already there.
>
> **Two blind spots were measured on the way, and neither is closed.** The
> boundary law never saw the border: a utility behind an arbitrary variant
> (`[&_blockquote]:border-s-2`) is outside what it parses — the bare spelling
> is judged, the prefixed one is not — so this was found by hand and the run
> over this file was green throughout. And the swap does NOT hand the mark to
> the contrast law, which is what a first draft of this note claimed:
> `strokes read` is 1,239 before the change, 1,239 after, and 1,239 again
> with the variant prefix removed, because the colour is `currentColor` and
> that law measures token values against a ground. `border-current` had the
> same property. The contrast argument in this entry was never gate-checked
> and still is not, which is why `verify/article-quote` was fixed rather than
> trusted: it was reading `borderInlineStartColor`, which an element with no
> border still reports as `currentColor` — a test that would have passed on a
> quote drawing no rule at all — and it now reads the computed `box-shadow`
> in both palettes. Both blind spots are stated here rather than filed as
> law changes: widening `borders.mjs` to parse arbitrary variants is a change
> to a law that runs against other people's source, and that is the lead's
> call, not this merge's.

**Which register is the default was the open half of the entry, and it is
answered the conservative way.** The editorial register stays, so every quote
drawn today draws the same tomorrow; a body of quoted replies asks for
`quote="passage"` once. The entry is CLOSED (`severity: resolved`, with the
resolution written into it) rather than the default re-decided, which would
have been a change to every existing quote on the strength of a gap entry.
An artifact question is owed, not a correction: chapter 13 draws one quote
and says nothing about a second.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso-system before the app
can delete the override the manifest entry names.

### Added — `verify/article-quote/`

Both registers, on both grounds a body lands on, in either palette by `?t=`.
`__quote()` returns one row per blockquote of computed styles only — family,
size, leading, tracking, ink, the rule's width, style and colour, the inset,
the margins, and the gap actually drawn above it from rects — plus two
booleans that are the claims themselves: `sameTypeAsParagraph` and
`ruleIsInk`. The canary is the harness run against the previous file: `pull`
must come back identical and `passage` must come back equal to `pull`, and
both did.

### Added — `DialogContent presentation`: where the one modal lands, and the consuming app's last reach past the kit closes

The kwapso app's screen engine draws a dialog four ways — responsive (a
bottom sheet on a phone, a centred card on a desktop), overlay, sheet and
fullscreen — and could only do so by importing the Radix primitive underneath
this component and drawing a second dialog on it. Its own law (R39,
`UI_PACKAGE_EXEMPT`) carries that import as the app's LAST exemption and names
the fix in the exemption's own words: "UPSTREAM FIX: a `presentation` prop on
the kit's DialogContent. Delete this line the day it ships." Two dialogs on one
primitive are two dialogs that can disagree about a scrim, a radius or an
entrance without either file changing — and they had: the app's copy carried a
`bg-black/50` scrim beside this file's charcoal 36% until somebody noticed the
two side by side and corrected it by hand.

`components/dialog/dialog.tsx` — `DialogContentProps.presentation?:
"responsive" | "overlay" | "sheet" | "fullscreen"`, default `overlay`. The
positioner's alignment and gutter (`LANDING`) and the surface's size and
corners (`SHAPE`) are one record each, keyed by the prop; everything the
surface IS — `--popover`, `--shadow-overlay`, the 32 inset, the scrim at 36%
and z 60, the close chip — is unchanged and shared by all four. The type is
exported as `DialogPresentation`.

**`overlay` is the default and did not move, and that is a measurement, not a
promise.** The classes moved from one constant into two, so the class STRING
changed; what must not change is what it draws. `verify/dialog-presentation`
was run against v1.2.64's `dialog.tsx` and against this one, at 380 × 812 and
1280 × 800 — rect, the four gutters, radius, inset, width, max-width,
max-height, fill, shadow, animation name and duration, the positioner's
alignment and padding, the close chip's centre, the axis and distance of
travel, and the document's horizontal overflow. **Identical, every field, at
both widths**: 335 wide inside a 22.5 gutter on the phone (24 at the 15px
root), 431.25 inside 30 on the desktop, a 7.5 rise over 0.2s. The 115 call
sites that pass nothing got yesterday's dialog.

> **Re-checked against v1.2.71 on the way in, 2026-09-09.** The baseline in
> that measurement is v1.2.64's `dialog.tsx`, and this file moved once between
> then and the tag this landed on: v1.2.70 replaced the scrim's hand-mixed
> `color-mix(in srgb, var(--kw-charcoal) 36%, transparent)` with `bg-scrim`, a
> NAMED utility over the `--scrim` token minted in tokens.css §3. The sentence
> above still holds — `--scrim` is `rgba(26, 25, 24, .36)`, which is what that
> `color-mix` resolved to, so the scrim is the same colour at the same z 60 and
> the merge kept v1.2.70's spelling rather than reinstating v1.2.64's.
> **The presentations do not reach it.** The scrim is drawn once on the
> Overlay, outside `LANDING` and `SHAPE`, so all four presentations share it,
> which is what "everything the surface IS … is unchanged and shared by all
> four" already said.
>
> **And it stays the MODAL scrim, deliberately, now that there are two.**
> v1.2.70 also minted `--scrim-drawer` at 28% and tokens.css records the rule
> it was minted for: `edge-panel.tsx`, "whose narrow presentation is the drawer
> and therefore wants the drawer's 28%." A `sheet` or narrow `responsive`
> dialog takes the drawer's GEOMETRY and the drawer's MOTION (motion.css §3d),
> so the question is live — and the answer is this entry's own rule, stated a
> paragraph below about the 32 inset: *the presentation changes where it lands,
> not what it is.* `Sheet` and `EdgePanel` wear 28% at z 55 and z 50 because
> they ARE drawers; a dialog is a modal wherever it lands, so it keeps 36% at
> z 60. Nothing here fights the scrim work; the two tokens divide on modality,
> which is the axis they were minted on.

**What the sheet is: `sheet.tsx`'s bottom sheet, and the SAME one, not a
similar one.** The `sheet` presentation is four classes and the narrow half of
`responsive` is those four with `max-[45rem]:` in front of each — the
construction `NARROW_BOTTOM` uses in `sheet.tsx`, for the reason it gives
there: "Two kinds of bottom sheet on one phone would be a worse answer than
the side drawer we started with." Measured at 380 × 812, both presentations:

| | `sheet` | `responsive` below 45rem | `overlay` (for scale) |
| --- | --- | --- | --- |
| anchored to | left + right + bottom | left + right + bottom | nothing — centred |
| width | 380 | 380 | 335 |
| height cap | 690.2 (85dvh) | 690.2 (85dvh) | 100% of a 22.5-inset track |
| corners | 22.5 22.5 0 0 | 22.5 22.5 0 0 | 22.5 all round |
| grabber | 39 × 4, dx 0 from the surface's centre | the same | none |
| travel | 316.41 on Y — its own height — 0 on X | the same | 7.5 on Y |
| duration | 0.36s, `--duration-overlay` | the same | 0.2s, `--duration-entrance` |
| close chip, up from the foot | 279 | 279 | 536 |

The two sheet columns agree to the hundredth. The one computed difference
between them is `max-width: 100%` against `none`, which cannot draw. And the
close chip's 257 drop toward the hand is the number the drawer's own ruling
put on the same affordance (122 there, from a taller start). Above 45rem
`responsive` is the overlay rect for rect, and its grabber is `display: none`.
`fullscreen` is the whole track — 380 × 812, then 1280 × 800 — with a 0
radius and §3's rise, because §6.2 states the fade-plus-rise "for a panel,
dialog or page" and a surface with no gutter is the page. The document does
not overflow sideways in any of the eight cases.

**Why `responsive` is NOT the default, written down so it is not read as an
oversight.** The client's rule of 2026-09-04 — "everythung that's slisde in in
desktop, should be slide up in mobile" — is about panels that ARRIVE FROM THE
SIDE; `sheet.tsx` applied it to `left` and `right` and left `top` and `bottom`
alone for exactly that reason. A centred modal does not arrive from a side; it
rises 8 and fades in place. Whether every modal on a phone should become a
bottom sheet is therefore a ruling this rule does not already contain, and it
is a change to 115 screens. The prop makes it one word per call site today, or
one default here the day it is ruled — a design decision, logged rather than
guessed (BUILD-A-COMPONENT §14).

**The inset is the modal's 32, not the drawer's 24, and this is the one place
the two sheets are allowed to differ.** `.kw-drawer` hands its body 24;
`.kw-modal` states 32. A dialog that lands as a sheet is still a modal's
content — the h3 title, the 14/300 body, the action row — that has landed
somewhere else. The presentation changes where it lands, not what it is, and
this file's own breakpoint note has always held that shrinking the inset
"would break the one measurement the kit does state". Measured: `padding: 30px`
in all eight cases.

**The motion is one class reading one attribute — `motion.css` §3d.** The
surface keeps `.motion-dialog` in every presentation and sets
`data-presentation`; the stylesheet reads it, the way §3a reads `data-side`
off the sheet. Below the threshold the keyframe AND the duration change — §3's
own division of labour gives `--duration-overlay` to "a surface travelling its
own full width or height" and `--duration-entrance` to "the 8px rise of a
dialog" — so §3d restates the whole shorthand rather than swapping
`animation-name` alone as §3a does. The specificity is the part that bites: a
sheet entrance written as `.motion-dialog[data-presentation="sheet"]` alone is
(0,2,0), the same as §3's base exit, and sits later in the file, so on the
closed frame the sheet would have played its ENTRANCE on the way out. Both
rules carry `data-state`, at (0,3,0), so each matches exactly one state.
`alert-dialog` sets no `data-presentation` and is untouched. The threshold is
the drawer's own `45rem` in the range syntax, so the motion and the geometry
flip on the same pixel — measured: name `motion-sheet-in-bottom` and duration
0.36s below it, `motion-rise-in` and 0.2s above.

An artifact question is owed, not a correction: CH20 draws one modal and one
drawer and says nothing about a modal on a phone. This adds the choice without
making it.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso-system before the app
can delete `shared/web/screen-engine/screen-renderer.tsx` from
`UI_PACKAGE_EXEMPT` (`shared/ui/` there is vendored and pinned).

### Added — `verify/dialog-presentation/`

One presentation per URL, because the surface is fixed to the viewport and
stacking four would give each a viewport the product never has. `__rects()`
reports the rect against the viewport — which edges it touches, the four
gutters, the computed radius per corner, the positioner's alignment, the
grabber's size and its offset from the surface's centre, the close chip's
height above the foot; `__axis()` closes, reopens and samples the transform
matrix over real frames so the axis, the distance and the duration that PLAYED
are numbers rather than a reading of the rule that won; `__hscroll()` says
whether the document scrolls sideways. The canary is the harness itself run
against the previous `dialog.tsx`: `overlay` must come back identical, and did.

### Added — the two laws the consuming app wrote because the kit was missing a part: `Title` gets its h1 rung, and `ToolbarRow` gets out of `CollectionFrame`

Classifying the app's 55 laws against §11 turned up thirteen that are "the
kit's rule over the app's source", and **two of those thirteen were not app
faults at all** — they were parts this kit did not ship, written down as laws
because something had to hold them. `docs/RULES.md` said so in one sentence
and then left it there. This closes both, in the kit's own terms rather than
by importing the app's answers.

`npm run check` **exits 0**.

#### `Title` had three rungs and was being asked to draw five things

The ladder stopped at 32 because chapter 13's **section header** is what
`title.tsx` was transcribed from, and 32 is the top of a section header.
Nothing was ever decided about the rungs above; the ladder ended where its
design source did. Then it travelled:

| where | what it said | what it actually was |
|---|---|---|
| `RecordDetail` | `titleSize?: "h2" \| "h3" \| "h4"`, default `h3` | a record's own name, capped at 32, defaulted to 24 |
| `SHAPE_HEADING_SIZE` | `Record<ScreenDensity, "h2" \| "h3">` | **not a rule about doors** — `Title`'s top two rungs, written down somewhere else |
| `ScreenRenderer` | `density === "calm" ? "h3" : "h2"`, inline | the same two values typed a **third** time, matching by coincidence |
| `CollectionFrame` | `headingSize?: "h2" \| "h3" \| "h4"` | a fourth copy of the same ceiling |

**The rungs were never missing from the system.** The kit's own type-scale
table names every step with the role it is for — `display-m · 56 · "Page
title"`, `h1 · 44 · "Record heading"`, `h2 · 32 · "Section title"` — and
`Headline` has carried both of the top two since it was written. The same two
steps existed in the tokens and in one kit component and were unreachable from
the other. So nothing here is chosen: `Title` gains `display-m` and `h1`, matched
to `--tracking-display-m` and `--tracking-h1` exactly the way its other three
rungs are matched, and **the default does not move** — a section header is
still 32, because chapter 13 is still this component's design source. Raising a
ceiling is not raising a floor.

**Was the 32 cap the right ceiling or the bug?** It was the bug, and precisely
because it was never a ceiling anyone set. It is `Title`'s ladder end, copied
into three type unions that read like decisions about doors and records. What
IS a real decision — whether a door's page title should climb to the scale's own
"Page title" rung — is now a one-line change in **one** place (`SCREEN_TITLE_STEP`)
instead of a component limitation, and it is not made here: it is visible on
every screen in both doors and it is the client's. `verify/decisions.html` has
the side-by-side.

`RecordDetail`'s default DOES move, h3 → **h1**, because the scale settles that
one outright: the rung named "Record heading" is 44 and this component is the
record heading. Two sources disagree and the disagreement is written into the
prop rather than smoothed over — ch24.6 draws that band at 18, which is not a
rung either way; a drawing sets a specimen, a role name assigns a step, and the
role name is what generalises to the next screen. `RecordChrome` stopped passing
`titleSize={SHAPE_HEADING_SIZE[measure]}` at the same time: that was the
**screen's** per-door step handed to a **record's** heading, two roles the scale
names separately.

Three copies became one. `SCREEN_TITLE_STEP` lives beside the `ScreenDensity`
type it is keyed by; `SHAPE_HEADING_SIZE` is now that object rather than a
promise to match it; `ScreenRenderer` reads it instead of retyping it. And
`TITLE_STEP_CHILD` — whose own comment already insisted it was "a RELATION, not
a size" while being spelled as the pair of values the relation produced — is now
`titleStepDown(SHAPE_HEADING_SIZE[door])`, floored at the ladder's last rung. It
yields exactly what it yielded before, and it will keep being true if the root
step ever moves.

**What the app can delete, not move.** `RECORD_TITLE_SIZE`
(`[&_[data-slot=title-heading]]:text-4xl`, applied at every detail call site and
policed by a census) exists to reach 44 from outside a component that could not
offer it. The right step now arrives by default on both of its detail paths, so
the constant and its half of the law go. `TITLE_ACTIONS_SPLIT` — the 80% title /
actions split — is a different ruling about a different property and stays where
it is.

#### The toolbar contract was never missing. A way to REACH it was.

`CollectionFrame` has always drawn the row the kit's dev note fixes — "toolbar
order never changes: search, then filters, then view switcher, then actions
pinned right … the 4th+ action collapses under a '···'" — with the one-row lane
of 2026-09-04 behind it, the elastic search slot, the chip slot as the row's
shock absorber, and every measurement that rejected a `···` fold, an in-flow
disclosure and a double render. All of it welded inside a frame that also owns
the heading, the count chip, the figure strip, the tab strip, one soft-paper
panel, three registers, the body and the pager.

A screen whose tab body is a month grid, a chart or a grouped pair of lists
cannot adopt all of that to get a search box and a `+`. So it writes
`<div className="flex justify-end">` instead. **The consuming app wrote that
four times, noticed, and built a private `ToolbarRow` — which grew eighteen call
sites and four laws to police them.** The duplicated markup is not the cost. The
cost is that a second copy of a contract cannot receive the contract's later
rulings: that private row still carries `flex-wrap`, so it draws a two-, four-
and five-row toolbar at exactly the widths this kit measured and rebuilt to fix,
and it has no scrolling lane, no group rules and no overflow menu — not because
anyone decided against them, but because the ruling landed on the kit's row and
the app was not holding the kit's row.

So the row is extracted, **and `CollectionFrame` renders it**. Same markup, one
module instead of two; `data-slot="collection-frame-toolbar"` is passed through,
so every probe that ever measured it still does. The frame's own file is 300
lines lighter and four imports shorter, and it lost nothing: the whole argument
travelled with the code rather than being summarised away.

#### Two things it needed that the frame's panel used to provide, and three it deliberately refused

**A GROUND, ASKED RELATIONALLY.** `ground` is `bare` (default — something else
painted, which is what the frame passes), `page` (standing on off-beige, so the
row takes soft paper) or `panel` (standing on soft paper, so it takes
off-beige) — `CollectionFrame`'s own `tone` question, in the same words, because
a toolbar cannot know its ground and a fixed fill is right on exactly one
screen. **Named utility classes, and that is load-bearing rather than tidy:**
the app painted this identical row `bg-[var(--surface-raised)]`, the same colour
by a different class, so none of tokens.css's ground selectors matched, the
`--btn-secondary-fill` rebind never fired, and every button in its toolbar was
beige on beige — reported twice before it was traced. `ground="panel"` resolves
to the fill that app hand-derived after two rounds of client feedback, which is
the relation working.

**THE GAP TO WHAT COMES NEXT.** `TOOLBAR_ROW_GAP` is `--space-5` — the third
place in this kit to spend that number on that sentence, beside `TABS_STRIP_GAP`
and the collection panel's own `gap-5`. The app re-derived it as
`--toolbar-content-gap` after fourteen call sites had drifted into five values
doing one job (7.5 / 11.25 / 15 / 22.5px and an `mb-4` passed straight to the
row). The kit owns the number, so the kit pays it — but only where the row is
standing on its own; inside a host that stacks it, the host's gap **is** that
number and paying it twice is the bug the app's law was written about. `ground`
answers both questions at once, so it is asked once.

Refused, each with its reason in the file header:

- **A sixth `sort` slot.** The evidence behind the app's version is real — eight
  of its call sites had smuggled a `<SortControl>` into the `search` slot, where
  it sat inside the one *growing* box at whatever label treatment that screen
  typed. But the contract here has no sort slot to fill: `SortControl` shares
  slot 4 by CH27.13's "the view switcher and the sub-tab picker are controls",
  and override 28's precedent for growing this row is explicitly *"a chapter
  draws a control in this toolbar that none of the existing slots describes"*.
  Slot 4 describes it. Adding a sixth would be legislating past the rulebook.
- **An `empty` gate that hides the whole row.** A good mechanism, and not this
  kit's ruling: `compositions/states/empty-collection.tsx` is 27.21 transcribed,
  and 27.21 draws the search box, the chips and the actions over a collection
  with nothing in it. Two client rulings genuinely disagree, and the kit is not
  the place to settle that silently.
- **A fill and a radius picked by name.** See `ground`.

#### Proved on itself

The three conformance laws were pointed at the new file with five planted
violations in one `cva` value — a bare `rounded-lg`, a `border`, a `border-b-2`,
a hex in an arbitrary class and `var(--kw-mango)`. **radii 1, palette 2, borders
2, exit 1.** Reverted, exit 0. A law that has never been red on a file has not
read it.

### Added — the kit stops shipping rules as prose: `foundations/rules/`, and a seam that runs them against somebody else's source

The client's sentence on 7 Sep: *"how we will use the ui kit: as the onlly
ui&ux input for other apps. i wanna void iteration tehre, so make sure rules
are good set."* Until today the kit shipped **components** and shipped its
rules as `docs/RULES.md` — 948 lines that every consumer vendors and none
executes. The consuming app re-derived 55 machine-checked laws of its own by
iterating with the client, and **two of them are word for word about the
kit's own vocabulary**. A second app would have paid for those two again.
That is the cost this removes.

`npm run check` **exits 0**, with a seventh gate on the end of it.

#### Three laws, chosen because the kit can check its OWN source for them

| | what it holds, and what it DERIVES rather than lists |
|---|---|
| `radii` | Two radii and no third. The vocabulary is every `--radius*` at `:root`; the safe bare spellings are the `@theme inline` bridge. So `rounded-lg` is refused **because tokens.css re-points `--radius-lg` and does not bridge it** — the load-order trap of §4.2, stated by a check that can see both halves — and `rounded-4xl` is refused because tokens.css declares no such thing. No deny-list of Tailwind keys anywhere; ship `--radius-huge` and `rounded-[var(--radius-huge)]` is legal the same second. |
| `palette` | Every colour resolves through a token, in all five positions one can reach the screen: an arbitrary class value, a `style={{ }}` object, a Tailwind ramp, an SVG paint attribute, and **the raw `--kw-*` ramp** (§8.3, never enforced before). The ramp clause is the derived one and the prefix is *not* the test: `--kw-kanban-col` and `--kw-dl-label` are component-local properties, not pigments, and a prefix check reports all five of them. A name is the ramp **iff tokens.css declares it** — 17 today. |
| `borders` | §2.7, which no law anywhere has ever enforced. A boundary is a paper step, a fill (`bg-border` on a 1px element), or an inset shadow — the third of which the **contrast law can read**, which is why a stroke written as a `border` is not merely off-vocabulary but invisible to the measurement that discharged `--surface-idle` at 1.042 last week. The two are one argument. |

The kit passes all three with **four reasoned exemptions**: the spinner's arc
in `spinner.tsx` and `button.tsx` (the border *is* the shape — a rotating ring
has no fill and no inset shadow that draws a partial arc), `file-upload.tsx`'s
dashed drop target (§2.7's own blessed case), and one `#0000` in
`record-detail.tsx` that is CSS's spelling of *no shadow* rather than a colour.
Every one is rot-checked in both directions and can only shrink.

#### A clause that was written, fired 24 times, and was deleted

The first `radii` draft called `rounded-[var(--radius-select)]` a finding —
the token is bridged, so `rounded-select` is already its word. It produced 24
findings against the kit's own source, which is the right number for a real
rule and a warning sign for an invented one. **It was invented.** §4.1's table
reads *"`rounded-select` **or** `rounded-[var(--radius-select)]`"*, in bold. A
law stricter than the document it claims to check has stopped being a check.
The clause is gone, its argument is in the file's header, and the spelling
census is printed as a number instead: **140 spelled as the word, 23 spelled
the long way** — visible to anyone who wants to argue for one, binding on
nobody until the client rules.

#### The conformance seam — and the constraint that decided its shape

`foundations/rules/conformance.mjs` takes an app's directories and an app's
exemption file, and holds that source to the kit's rules:

```bash
node shared/ui/foundations/rules/conformance.mjs \
     --exemptions web/test/kit-conformance.json \
     web/components web/app web/lib web-portal/components shared/web
```

**It lives under `foundations/` because that is the only way it arrives.**
`kwapso_system/scripts/sync-design.mjs` copies exactly nine entries out of a
tag; a `rules/` directory at the repo root is not one of them, and a seam that
exists upstream and is absent downstream is not a seam. For the same class of
reason it uses **Node builtins only**: inside a consumer it sits in a vendored
directory with no `package.json` and no `node_modules`. And the **exemptions
stay outside the kit** — an app that hand-edits `shared/ui/` fails its own
vendored-kit hash, so the rules are the kit's and the exceptions are the app's,
in the app's own diff. `docs/RULES.md` §12 is the copy-pasteable version.

#### Pointed at the real consuming app, because a suite nobody has aimed is a suite nobody should trust

314 files across `web/`, `web-portal/` and `shared/web/`. **44 findings in 15
files, exit 1.** Nine bare `rounded` (Tailwind's 4px, where the kit has a 4px
token and `tickets-dashboard.tsx`'s own comment shows the author looking for
one and not finding it); `--kw-charcoal` reached directly in
`screen-renderer.tsx`'s overlay; Google's four brand hexes in
`google-sign-in.tsx` (a textbook exemption, not a fault); and **30 CSS
borders** across twelve files, which no test in that repository has ever read
because the rule lived only in a document it vendors.

#### Two bugs found by aiming it, one of them in this repo's existing law

Both were found by the scan getting *quieter* where the source got more
interesting, which is this repository's oldest tell:

- **A template literal with an apostrophe desynchronised the literal
  scanner.** `` `Couldn't list your ${noun}s.` `` is not matched by the
  backtick arm of the obvious regex, so the walk opened a single-quoted string
  at the apostrophe and closed it 32 lines later, hiding everything between —
  including a real bare `rounded` in `google-source-dialog.tsx:352`. The run
  was green on that file and the file was not clean. `source.mjs` now walks
  instead of matching, and quotes must close on their own line or they were
  never quotes. **`literalsIn` in `foundations/tokens/ground-map.mjs` still
  carries the original regex and the contrast law stands on it** — left alone
  deliberately, because that law is finished and re-reading its source would
  move published numbers, but the blind spot is the same one and it is written
  down now.
- **A template literal is not one string.** Skipping an interpolated template
  wholesale dropped both the static chunks *and* the branches — the shape the
  app writes every conditional class in. Chunks are now literals in their own
  right and every `${ }` is re-scanned from the top. Coverage against the app:
  **3,006 → 4,589 class lists**, and 12 more findings.

#### Proved by breaking it, not by reading it

A green law measures nothing until something makes it red. Eleven planted
violations in one file: ten caught, exit 1 (the eleventh — a bare `rounded`
alone in a one-word literal — is the documented cost of the class-list
heuristic, and is caught the moment it sits beside any other utility, which is
how all nine app findings were caught). An empty directory turns every law
**red on its blindness tripwire**, not green. A deliberately false exemption
turns the run **red as rotted**. All three are asserted, not asserted-about.

### Changed — the law learns the kit's other boundary: a step **or** a stroke

The two findings the entry below left red on purpose are closed, and not by
moving anything. `npm run check` **exits 0**.

**The kit has always drawn a boundary two ways and the law could only see
one.** `tokens.css` forbids the `border` property outright — review 1A · fix
2 — and sanctions in its place either a fill one step from the ground or an
inset stroke; `--hairline` is `inset 0 0 0 1px var(--hair)` and exists for
nothing else. `badge.tsx`'s `outline` variant draws with it, `card.tsx` has a
`hairline` prop for it, and `StatusStepper`'s own not-yet-reached mark has
used it since yesterday's fix. The contrast law measured the fill, saw 1.042,
and reported an absent boundary for an element that draws one — while its own
header said, in as many words, that it *"does not credit an inset hairline for
a boundary the fill fails to make"*. Half of that sentence was wrong. The
record-footer entry two passes ago had already written the true version:
**the boundary is a step AND a rule.**

#### The rule, and it is a derivation rather than an exemption

> A fill below the boundary tier is acceptable **if and only if** the element
> also draws a hairline whose own contrast against that same ground clears the
> hairline tier.

**Nothing about a threshold moves.** Boundary is still 1.05, quiet is still
1.10, hairline is still 1.05, no tier is renamed, and `EXEMPT` is still the
same two entries it has been — still rot-checked, still shrinking-only. What
changed is that a second **measured** fact can now answer the question the
first one asked. The law resolves the `shadow-[…]` class through the same
token model that turns `--surface-record-footer` into `#26241F` three hops
down, reads what comes back as a shape and a colour, composites the alpha the
way an ink's is composited, and holds the result to the hairline tier against
the ground the fill just failed against. A hairline that is itself invisible
discharges nothing.

| | fill vs ground | the ring, light | the ring, dark |
|---|---|---|---|
| later pill · overflow tail on `--popover` | **1.042** | **1.175** | **1.161** |
| later pill · overflow tail on `--surface-raised` | **1.042** | **1.175** | **1.161** |

`--ink-disabled` on `--surface-idle` is **untouched at 2.335 light / 3.979
dark** — GAPS-CONTRAST §2 row 8, the pair the client ruled on, to three
decimals. That is the whole point of taking this route: `--surface-quiet`
would have cleared the boundary at 1.339 / 1.324 and dropped that ruled label
to 1.817 / 2.508.

#### Four things that keep it from being a blanket pass, each asserted on every run

The regression set proves the law still catches a bad fill; it can prove
nothing about a discharge, because a rule reading *"anything with a shadow
class passes"* would leave all four of those fixtures red and still be a
blanket pass wearing a measurement's clothes. So the discharge has its own
fixtures — **five, of which four assert a REFUSAL** — checked both ways the
way `EXEMPT` is:

| stroke drawn round a 1.042 fill | verdict | why |
|---|---|---|
| `var(--hairline)` | **DISCHARGED** 1.175 / 1.161 | the ring the kit actually draws |
| `inset 0 0 0 1px var(--hair-faint)`, dark | refused at **1.022** | the rule is invisible: 6% ink on that fill |
| `var(--hairline-under)` | refused | one edge, not a shape — same ink as row 1 |
| `0 0 0 1px var(--hair-strong)` | refused | identical but for `inset`, in a **darker** ink |
| nothing | refused | the finding exactly as it stood |

Rows 3 and 4 are the shape test and are drawn in inks that would sail past the
floor if the shape test let them through; row 2 is the colour test and is the
kit's own faintest hairline. **The stroke is also measured the worse of the two
honest ways** — an inset shadow paints on the element's fill, so its true
colour is stroke-over-fill, but a reader may as fairly ask what it measures
over the ground alone, and the LOWER of the two is the one that has to clear.
Picking the kinder of two defensible numbers is how a law starts negotiating
with itself. And the stroke must be provably on WITH the fill: the same arm of
the same `cn()`, or an unconditional group on the same element. A stroke in
the other arm of a ternary is not a stroke this fill has.

Every one of those was verified by mutation, not by reading: soften the
hairline floor, take the max instead of the min, drop the compositing, widen
the ring to any inset, drop the `inset` requirement, soften the boundary floor,
or blind the walker to `shadow-[…]` altogether — **each one turns the check
red, and each names which fixture it broke.** Blinding the walker brings back
the original two findings verbatim, which is the proof that the discharge is
read out of `status-stepper.tsx` and not out of a list.

#### A discharged boundary is printed, not disappeared

New **DISCHARGED** band in the report, beside QUIET, carrying the fill's
number, the stroke that carries it, and the ring's figure in **both** palettes
with the over-fill and over-ground readings shown separately. A boundary held
by a rule rather than by a step is a thing the client should be able to count.
And an **IDLE DISCHARGE** tripwire fails the check if the kit ever stops
drawing one, so the machinery cannot outlive its use the way a stale exemption
would — the same discipline `EXEMPT`'s rot check applies from the other side.

Census 103 → 105 pairs: a stroke is now part of a pair's identity, so one fill
on one ground drawn with a hairline in one place and bare in another is **two**
boundaries and exactly one of them may be discharged. No anchor died, no floor
moved, and the four regression fixtures still measure 1.000 / 1.000 / 1.000 /
1.019 red-before.

#### And the component

`StatusStepper`'s later pill and its overflow tail take
`shadow-[var(--hairline)]` beside the fill they already had. The fill is the
ruled one; the boundary is the stroke. The comment at the pill, which said the
finding was *"logged as the law's known backlog"*, now says what was actually
done.

### Fixed — the contrast law's first eleven, triaged: nine closed, two of them the law's own, two left red on purpose

> **Superseded in part, 2026-09-08.** The two findings this entry left red are
> closed by the entry above — by teaching the law that a boundary can be
> carried by a stroke, not by moving a threshold and not by darkening the
> ruled fill. `npm run check` exits 0.

The entry below arrived deliberately RED on **11 pairs**, reported for triage
rather than patched in the pass that found them. They have now been read one at
a time, and the answer was not the same three times running — which is the
whole reason they were left for a person:

| # | pair | verdict |
|---|---|---|
| 1 | `--card` on `--popover`, both | **BUG** — `Alert` inside a `Sheet`. Fixed at the token. |
| 2 | `--card` on `--surface-raised`, both | **BUG** — `StatusStepper` on the shell's content region. Same fix. |
| 3 | `--background` on `--surface-raised`, light | **CALL SITE** — the book's cards on the book's raised panel. |
| 4 | `--btn-secondary-fill` on `--background`, light | **FALSE PAIR** — the law could not see §8. Fixed in the LAW. |
| 5 | `--surface-idle` on `--popover` / `--surface-raised`, light | **REAL, LEFT RED** — see below. |
| 6 | `--ink-on-accent` on `--popover` / `--surface-raised`, dark | **FALSE PAIR** — a fragment and a local const. Fixed in the LAW. |
| 7 | `--foreground` on `--surface-brand`, dark | **BUG** — off-beige ink on mango. The right token already existed. |

**`npm run check` exits 1, on two findings and a written reason.** That is the
honest state and it is the one worth having.

#### The one that mattered most: two names, one colour, four papers

`--surface-raised` **is** `--card` — tokens.css §4 declares it as
`var(--card)` — and `--popover` is that colour again in both palettes by
ch12's design. So an element painting `bg-card` to say *"I am a raised thing"*
has **no boundary at all** whenever what it is standing on is any of those
four papers. Not by anybody's mistake. By the definition of the tokens, in
both palettes, permanently.

The law found three of them inside the kit and one in the book:

- **`Alert` in a `Sheet`.** Not hypothetical: `Form`'s error summary IS an
  `Alert`, and `BulkEditScreen` renders that form inside a sheet. A
  destructive alert with a coloured dot, correct copy and no panel under it.
- **`StatusStepper`'s pill and mark** on `ScreenShell`'s content region.
- **the book's own shadow swatch**, which is a shadow specimen with nothing
  under the shadow.

**THE PROBLEM IS THE ONE RULING 01 ALREADY SOLVED FOR A BUTTON**, so the fix
is that answer and not a new one. *"A band and its buttons are never the same
tone"* is a RELATION, and a relation cannot be held by a flat value:
`--btn-secondary-fill` is rebound by the GROUND in §8. tokens.css §4 now
carries **`--surface-lift`**, the same mechanism given a name a surface can
use — `var(--card)` by default, which is correct on the soft-paper panel where
cards and forms live, and rebound by §8 to soft paper inside an off-beige
region and back to the raised paper inside a soft-paper one.

| | before | after |
|---|---|---|
| `Alert` on a sheet / popover, light | **1.000** | **1.103** |
| `Alert` on a sheet / popover, dark | **1.000** | **1.111** |
| stepper pill · mark on the shell body, light | **1.000** | **1.103** |
| stepper pill · mark on the shell body, dark | **1.000** | **1.111** |
| the book's shadow swatch on its raised panel, light / dark | **1.000** / **1.000** | **1.103** / **1.111** |
| `Alert` on a soft-paper panel, light / dark | 1.103 / 1.111 | **unchanged** |

1.103 and 1.111 are not new numbers. They are the kit's own page/panel step
and the pair the client ruled on in register row 77.

**It does not replace `--card`.** A `Card` that knows its ground is right to
name the paper it wants. `--surface-lift` is for the parts that are HANDED a
ground they cannot see: an alert a call site drops into a sheet, a stepper the
shell puts on its content region, a swatch the book stands on either.

#### And one arbitrary background that took a whole region out of §8

`ScreenShell`'s BODY painted `bg-[var(--surface-raised)]`. That is the
identical colour to `bg-surface-raised` and **not the same thing to a
stylesheet**: Tailwind emits the arbitrary form under its own escaped
selector, so the shell's entire content region sat outside every ground-keyed
rebind in §8 — which is exactly why that constant had to hand-write
`[--btn-secondary-fill:var(--surface-panel)]` underneath it. §10's note on
`--color-surface-record-footer` records the same failure from the other side,
in the same words: the arbitrary form *"took the element out of every
ground-keyed rebind in §8 without rendering any differently"*.

Both grounds now use the named class — the shell's body and the book's
`Panel` — and the hand-written secondary fill is deleted because §8 supplies
it. (`--pill-fill` is still written by hand there: it is not one of §8's
relational tokens, and adding it would be a change to ruling 26's
`--pill-fill-building` that nobody has asked for.)

#### Off-beige ink on mango — the `--dot-building` shape, again

`demo/sheets/motion-sheet.tsx`'s demo box was `bg-[var(--surface-brand)]
text-foreground`. Mango does not flip; `--foreground` does. **12.072 in light,
1.440 in dark** — correct in the palette it was written in and all but
invisible in the other, which is the same sentence this CHANGELOG wrote about
`--dot-building` a day ago and has the same answer already sitting in
tokens.css. `--ink-on-accent` is declared with the comment *"the accent law,
as a token"* and is charcoal in both palettes because the ground it names is.
**12.072 in light AND dark.**

#### TWO OF THE ELEVEN WERE THE LAW'S OWN, AND THAT IS THE MORE USEFUL HALF

A law that misses a pair leaves a hole. A law that INVENTS one costs more,
because the first thing a person does with a false finding is stop reading the
true ones. Two of the eleven were false, and neither was a colour problem:

**§8 was invisible to it.** `--btn-secondary-fill` resolved to its `:root`
value on every ground, so the law measured the exact pair the rebind exists to
prevent and reported the mechanism itself as a 1.000 bug. It now reads the
ground scopes out of tokens.css — no list, same discipline as everything else
in the file — and resolves a relational token against **the ground being
measured**, never a merge across an element's branches. It also reads
Tailwind's `[--tok:value]` arbitrary-property utility, which is how the shell
rebinds a fill on a ground §8 cannot reach. `--btn-secondary-fill` on the
book's card: **1.000 → 1.103 light / 1.079 dark**, which is what the browser
was drawing all along.

**A fragment was not a node, and a class constant had to be at column zero.**
`<>` carries no tag name, so `ground-map.mjs` walked past it — and with it
past the structure that makes `const inner = (<>…</>)` a binding, so
everything inside was reparented onto whatever element the fragment sat in.
Separately, `const skin = cn(…)` written inside a render read as an element
with no fill, and an element that paints nothing hands its ANCESTOR's ground
to its children. Together those two put `StatusStepper`'s current pill's
number — charcoal `--ink-on-accent`, sitting on the mango pill that covers
it — against the DIALOG behind the stepper: **1.132 dark, for a pair no screen
has ever drawn.** Both fixed in `ground-map.mjs`, with the argument beside
each. The census moved 103 → 99 pairs and back to 103; no anchor died, no
floor was touched.

**No exemption was added.** The list is still the two that were there, and
still rot-checked.

#### LEFT RED, WITH THE REASON — the later stage's fill

> **Answered 2026-09-08, and the reasoning below is why it was answered this
> way rather than by `--surface-quiet`.** The fill stays; the boundary is now
> drawn as an inset hairline and the law measures it. See the entry at the top
> of Unreleased.

`--surface-idle` measures **1.042** against off-beige paper in light, under
the 1.05 invisibility gate, wherever a stepper is placed on a raised ground.
It is a real finding: the later pill's and the overflow tail's SHAPE genuinely
does not exist in light on that paper.

**The obvious fix makes a ruled number worse, so it is not this pass's to
take.** CH23's specimen line says *"later stages take the quiet fill"*, and
`--surface-quiet` would clear the boundary at 1.339 light / 1.324 dark. But
the pair the client actually ruled on is GAPS-CONTRAST §2 row 8 — *"a later
pill at 2.335:1 light / 3.979:1 dark"* — and those two figures are
`--ink-disabled` on `--surface-idle`, reproduced here to three decimals. On
`--surface-quiet` the same label reads **1.817 / 2.508**. Closing the boundary
would darken the ground under the one word CH23 insists stays readable: *"a
record that hides its future reads as finished, and the client cannot see what
they are waiting for."* That is a trade for the client to make with both
numbers in front of her. **A red law with a known backlog is worth more than a
green one that was talked into it.**

#### The two regression fixtures that say STILL OPEN now say something truer

`--surface-raised` on `--card` is **1.000 by design and can never go green**:
the two names are one colour on purpose. The fixture keeps asserting exactly
that, because it is a permanent proof that the law still catches a 1.000. What
changed is that nothing in the kit DRAWS it any more, and the fixture now says
so and names `--surface-lift`. If a component starts painting `bg-card` on the
shell body again it is the FINDINGS list that will report it, not this
fixture.

### Fixed — `npm run check` now fails on a stale `tokens.json`

`--check` ran the generator's four guards and wrote nothing, and *"wrote
nothing"* was reported as a pass — so the generated file could disagree with
`tokens.css` indefinitely behind a green build. **That is not hypothetical: it
was found on 2026-09-07 still carrying BOTH of that evening's colour bugs**
(`--surface-record-footer` dark as `#26241F`, and no dark half for
`--dot-building` at all) days after the stylesheet had been corrected, and it
had to be found by a person reading a file.

`--check` now RENDERS the document it would have written and fails if that is
not what is on disk, naming the tokens that differ. It still writes nothing.
**What it would have caught:** both of last night's bugs, on the first `npm run
check` after the fix landed in `tokens.css` — and, this morning, `--surface-lift`
itself, which is how the guard was proved.

`tokens.json` is the copy a consuming app reads. A generated artifact that can
contradict its source and still pass the gate is a second, silent opinion
about what a token is, which is the whole subject of the law next door.

### Fixed — two gaps the consuming app was paying for

**`RecordChrome` dropped `activityAction`.** `RecordDetail` gained that slot in
v1.2.67; `compositions/templates/record-chrome.tsx` forwards ~24 props into it
and that was not one of them, so the app was smuggling its control through
`activityLabel` — which is the EYEBROW. A label slot carrying a control means
the eyebrow's own type step and ink apply to it and the two can never be
styled apart. One line, and **the app's documented workaround is now
deletable.**

**The required-field marker sits at the trailing edge, in the kit.** The
client ruled the label goes left and the marker right. `Field`'s label row was
`flex items-baseline gap-2` with both children at their natural width, so the
marker sat wherever the label happened to end — and the app was pushing it
over from OUTSIDE, with a descendant selector into the kit's own slot:
`[&_[data-slot=field-required]]:order-last` plus `ms-auto`. An app reaching
through the kit's markup to restate a layout the kit should own.

Three classes, each doing a job: `justify-between` on the header row (logical,
so it follows `dir="rtl"` with nothing else written), `min-w-0` on the label
so a long one SHRINKS instead of shoving the marker off the end — which the
app's `ms-auto` never fixed either — and `shrink-0` on the marker, which is
three characters with nothing to give up. **The app's override
(`[&_[data-slot=field-required]]:order-last`, `ms-auto`) can be removed.**

### Added — a contrast law: every pair the kit draws, both palettes, measured against the surface it is actually on

The entry below this one ends with a FINDING rather than a fix: *"nothing in
this kit measures a token against the surface it is actually used on."* Three
bugs in one evening were three shapes of that one hole —

| surface | measured |
|---|---|
| record footer on the card it sits inside (dark) | **1.000** |
| toolbar well on the shell's content card (**both** palettes) | **1.000** |
| `--dot-building` bare on `--surface-panel` (dark) | **1.02** |

— and not one of them could go red. This is the check that closes it:
`foundations/tokens/check-contrast.mjs`, wired into `npm run check` as the
last gate.

**IT DERIVES EVERY PAIR. IT KEEPS NO LIST, AND THE ARGUMENT AGAINST LISTS IS
THIS REPOSITORY'S OWN.** `GAPS-TRACK1.md` STA-2 recorded *"nothing in the kit
consumes the six `--dot-*` tokens"* as the JUSTIFICATION for leaving those six
values alone. It was true when it was written. It expired the day `Kanban`
grew a column header, and nobody edited it, because nothing made them. A
hand-kept register of "these must differ" would rot the same way and for the
same reason.

So the pairs come out of three things that cannot go stale without somebody
editing code:

- **the token values**, through `token-model.mjs` — which is
  `build-tokens.mjs`'s own reader, lifted out so that both checks use it.
  `--surface-record-footer` → `--surface-raised` → `--card` → `#26241F` is a
  three-hop chain and the bug was only visible at the end of it; a check that
  compared NAMES would have called that pair different and passed. **A second
  resolver would have been a second opinion about what a token resolves to,
  which is the same failure the law exists to catch, one level up.**
- **the utility names**, out of tokens.css's own `@theme inline` bridge —
  the same source `build-tokens.mjs`'s DEAD SELECTOR guard reads from the
  other side.
- **what sits on what**, out of the components — `ground-map.mjs`. The kit's
  law is that a ground-painting element uses a NAMED utility class, so the
  tree of those classes IS the answer. The walk crosses component boundaries
  (a `<Card>` is its cva's fill, and a caller's `className` merges over it the
  way tailwind-merge makes it), follows children through slots, reads class
  TABLES (`COLUMN_DOT[dot]` — the shape that made bug three unreadable in the
  first place), and breaks the chain at a portal, because an overlay does not
  sit on the card its trigger happened to be in.

**`demo/` IS IN SCOPE AND HAS TO BE.** `components/` says what each part
paints; almost none of them say what they are placed ON. The book is the only
place in this repository where several of them meet a ground at all.

103 pairs, 206 measurements, 210 files, 7 809 component expansions.

#### The tiers, and why not WCAG

Four, because the kit draws four different things with colour and they have
nothing in common: a word, a 7px dot, a card boundary, a hairline.

| tier | floor | earned by |
|---|---|---|
| **ink** | **4.5** | the number this kit has spent two hexes on. `--kw-forest` moved to `#20955B` because 4.44 was *"under AA's 4.5 for the 12px badge label"*; `--kw-poppy-ink` was minted at 4.98/4.52 the same way. Its own ladder sits far above it — `--ink-tertiary`, the palest ink it writes a word in, is 6.51 light / 7.93 dark. |
| **mark** | **1.5** | ruling 26 — *"the dot never speaks alone"* — so a dot beside a word is not text and 4.5 would be a category error. But a mark is TINY, and area is what makes a small step readable, so it needs MORE than a card's boundary. 1.5 is the smallest same-family separation this kit has ever defended in writing (the record footer's well, 1.499 / 1.587) applied as a floor to a shape a thousand times smaller. |
| **boundary** | **1.05**, quiet at 1.10 | see below. |
| **hairline** | **1.05** | ch13's subtitle is *"Colour separates, strokes don't"*, so a hairline that shouted would be the wrong fix. `--hair-faint` composites to 1.127; the one hairline bug this kit has had measured exactly 1.000. |

**THE BOUNDARY FLOOR IS THE ONE WORTH ARGUING, AND IT IS DELIBERATELY LOWER
THAN IT LOOKS.** Not 3:1 — WCAG's non-text threshold would fail almost every
surface this kit ships, and the client has ruled on these exact numbers
repeatedly (1.103/1.111 is override 77's answer for a selected row; 1.198 is
last night's corrected footer). And **not 1.10 either**, which is the harder
call: the kit's own page/panel alternation, which CH26.04 states as law,
measures **1.079** in dark. *A law whose first act is to fail the foundation
of the system it guards is a law that gets switched off within a week.* So the
GATE is the invisibility line and nothing more, and **1.10 is kept as the
QUIET line** — every boundary under it is printed with its number on every
run, so the register grows and the client can rule on the band.

**The bar that is not negotiable is that nothing may be INVISIBLE.** 1.000 is
not a low-contrast surface, it is the same surface, and 1.02 is not a design
position. Everything else in the file is a judgement a person may overturn
with a reason; that one is arithmetic.

#### Proved on the evidence, not on a clean tree

**A law that passes on a FIXED tree tells you nothing, because green is also
what a law that has stopped looking prints.** So the three bugs are kept in
the check as fixtures, with the values `tokens.css` carried before the fix,
and every run asserts the law calls each of them a failure — and, where a fix
exists, that the corrected value now clears the floor:

| fixture | pre-fix | today |
|---|---|---|
| `--surface-record-footer` on `--card`, dark | **1.000** | 1.198 |
| `--surface-raised` on `--card`, light | **1.000** | **still open** |
| `--surface-raised` on `--card`, dark | **1.000** | **still open** |
| `--dot-building` on `--surface-panel`, dark | **1.019** | 17.056 |

Those pre-fix figures are the check's own arithmetic, not transcriptions: the
colour maths reproduces every number this CHANGELOG has ever published —
1.198, 1.587, 17.386, 1.499, 17.06, 1.103, 1.111, 12.07, 4.61 — to three
decimals. Soften a threshold, rename a tier, widen an exemption or drift the
maths, and the fixtures go red before anything else does.

#### A blindness tripwire, because silence and a clean bill of health look identical

A resolver that has stopped matching reports "all clear" in the same words a
passing check uses. That failure mode has cost this project two evenings
already — STA-2's assumption expiring unnoticed, and `verify/out.css` going on
resolving `--dot-building` to a colour the source had changed. So the
derivation has to prove it is still looking, and it does it with **anchors**
rather than a count, because a count can be met by any old rubbish while an
anchor names a chain through named files:

- `--card` on `--surface-panel` — proves component expansion and cva variants
  still work; that pair is written in no single file.
- `--dot-building` on `--card` — proves class TABLES are still read.
- `--ink-on-record-footer` on `--surface-record-footer` — proves a caller's
  `className` still wins over the component's own cva.

Plus collapse floors on the census (files, components, expansions, pairs), set
well under today's numbers: their job is to notice the walk has stopped
working, not to freeze a count that legitimately moves.

**Two exemptions, both rot-checked** — an exemption that matches nothing FAILS
the check, so the list can only shrink and shrinking it takes a person
deleting a line, exactly as `demo/check-book.mjs`'s `TOOLBAR_EXEMPT` works.
They are `--ink-disabled` and its `--btn-disabled-label` sibling (tokens.css
§3 states it in the declaration itself: *"disabled means disabled and nothing
else, and disabled is exempt from contrast"*), and `--surface-selected` on the
four papers it can equal — **RULED D15-B, register row 77**, where the client
took the artifact's lift after seeing it drawn AND MEASURED in red. That one
is exempt because it was ruled, not because it is fine.

#### What it deliberately does not assert

It does not say a low number is wrong; it says an invisible one is. It does
not enter states it cannot reach — 564 `hover:` / `data-[state]` / breakpoint
grounds are counted and printed, never measured. It does not assert
co-occurrence it cannot prove: two conditional fills chosen inside ONE
component are two props, and a `dot="shipped"` on a `variant="destructive"`
badge is a product no call site writes, so 1 892 such pairs are declined and
counted. It does not see a ground changed by a custom property (135 of them;
`record-detail.tsx`'s footer grid rebinds `--card` with no class attached).
And **it does not see the consuming app** — every pair here is one the KIT
draws, and an app that composes two kit parts in a way the kit never does can
still make an invisible one. That is exactly how bug two reached a screen. The
answer is this same check running there, over the same tokens.

#### THE CHECK ARRIVES RED, AND THAT IS THE POINT

**11 pairs are below their tier's floor on today's tree and none of them has
been touched.** A law that arrives with its own violations quietly patched is
a law nobody can trust, so they are reported for triage rather than fixed in
the pass that found them. The first of them is the third bug of last night,
still live in the kit:

| pair | palettes | measured | where |
|---|---|---|---|
| `--card` on `--surface-raised` | both | **1.000** | a `raised` card inside the shell's content region — `screen-shell.tsx`, `status-stepper.tsx:350/447` |
| `--card` on `--popover` | both | **1.000** | a `raised` card inside a `Sheet` — `alert.tsx:157` |
| `--background` on `--surface-raised` | light | **1.000** | `demo/sheets/*` inside the book's content card |
| `--btn-secondary-fill` on `--background` | light | **1.000** | `demo/sheets/motion-sheet.tsx:551` |
| `--surface-idle` on `--popover` / `--surface-raised` | light | **1.042** | `status-stepper.tsx:629`'s overflow tail |
| `--ink-on-accent` on `--popover` / `--surface-raised` | dark | **1.132** | `status-stepper.tsx:578`'s number span |
| `--foreground` on `--surface-brand` | dark | **1.440** | `demo/sheets/motion-sheet.tsx:504` — off-beige ink on mango, which does not flip |

Three sit in the QUIET band and fail nothing: `--btn-primary-fill` on
`--surface-quiet` (1.075 light), and the page/panel alternation at 1.079 dark,
twice.

#### One thing found on the way, and not by the law

`foundations/tokens/tokens.json` was **stale in the repository** — it still
carried `--surface-record-footer` dark as `#26241F` and no dark half for
`--dot-building` at all, which is to say it still shipped both of last night's
bugs. `npm run check` runs the generator with `--check`, which writes nothing,
so nothing noticed. Regenerated here; the diff is two lines and both are the
fix that already landed in `tokens.css`. **Flagged rather than treated as
routine: a generated artifact that can disagree with its source and still pass
the gate is the same shape of hole as the one this entry is about.**

### Fixed — two dark-palette colours that were not faint but absent

The client, on a dark ticket screen: *"in dark mode cannot see the footer- fix
it"*, and, on the ticket board: *"grerat but status (th header) have no color
associated."* Both read like taste. Neither was.

**THE RECORD FOOTER WAS PAINTING ITSELF ITS OWN PARENT'S COLOUR.** In dark,
`--surface-record-footer` resolved to `--surface-raised`, which resolves to
`--card` — and the record detail's own card *is* `--card`. #26241F on #26241F.
**Contrast 1.000.** Not a low-contrast surface; the same surface. Every child of
that footer was drawn correctly, laid out correctly, and sitting on nothing.

CH27.8's dark clause says the ink footer "stops being an inverse surface and
becomes an ordinary RAISED card", and that sentence is true — of a footer
sitting on the PAGE. This one sits on a card. Nothing in the clause, and nothing
in any check, asked what was behind it. **Two tokens can each be correct and
still name one colour**, which is the whole lesson and the reason the entry
below shares this heading.

The rule both palettes now keep is the one light already stated: the footer is
the record's DARKEST band. In light it is the ink card on paper (17.386). In
dark it RECESSES below the card instead of matching it — `--kw-unlit-page`, an
existing brand paper, nothing minted. Measured both ways, because this is a card
that also holds one: **1.198** against the record card above it, and it carries
`--hair-record-footer` as well, so the boundary is a step AND a rule; and the
well inside it now reads **1.587**, which is *better* separation than the 1.499
the same pair manages in light. `docs/TOKENS.md` rows 136 and 137 are corrected.

**AND `--dot-building` WAS INVISIBLE IN DARK — 1.02.** Ruling 26's dark clause
puts a `building` dot on a MANGO pill, where charcoal is the only legible ink,
and `GAPS-TRACK1.md` STA-2 recorded the justification plainly: *"Nothing in the
kit consumes `--pill-fill` or the six `--dot-*` tokens."* That was true when it
was written. `Kanban`'s column header consumes one now — a bare 7px dot on
`--surface-panel` — and a value tuned against mango is nothing at all there.
`docs/TOKENS.md` had documented dark `--dot-building` as `#FFFEF9` the whole
time and `verify/out.css` still resolved it to off-beige, so source, docs and
the verify build had been disagreeing with each other.

**So the pill becomes the exception, not the token.** `--dot-building` returns to
`--foreground` (17.06 on the panel, and the docs are right again), and
`badge.tsx`'s `variant="status"` + `building` compound variant now repaints its
own dot with `--pill-label-building` — the charcoal that pill already sets for
its label, so the dot and the words cannot drift apart. The dot gained a
`data-slot="badge-dot"` so that variant can reach it without a `span` selector
that would also catch anything nested in `label`.

Measured, on `--surface-panel`:

| tone | light | dark before | dark after |
|---|---|---|---|
| `building` | 15.76 | **1.02** | 17.06 |

The other five are unchanged and are argued separately: `--dot-review` (1.81
light) and `--dot-archived` (2.21 light) are low, but every one of the six was
sized for a dot INSIDE a labelled pill, where ruling 26's "the dot never speaks
alone" holds and the words carry the meaning. The board is the first surface to
use one bare. Retuning all six for the harder context is a real decision and is
not being taken in a bug fix — **but no tone may be invisible, and 1.02 was not
a design position.**

#### FINDING — the check that should have caught both

Neither of these could go red, because nothing in this kit measures a token
against the surface it is actually used on. Both bugs are the same shape: a
value that is correct in the context it was written for, consumed in a context
nobody re-measured. A contrast law — every shipped pair, both palettes, red when
illegible — would have caught both before either reached a person, and it
matters more than either fix, because this kit is about to be the only UI input
for more than one application.


### Changed — a board card reads its chips BEFORE its title, and they are the title's overline rather than a fourth row

Client, 2026-09-07, over a screenshot of a board card reading title-then-chips,
verbatim: *"in cards put chips above title."*

`KanbanCard` drew `title`, `description`, `content`, `badges`. It now draws
the chips and the title as one HEAD, then the description, then `content`. Only
the chips moved — `content` is a body (a mark, a bar, a row of avatars) and
stays last.

**APPLIED AT THE COMPONENT AND NOT OFFERED AS A PROP**, which is the decision
worth arguing rather than the swap. A `badgesPosition` would let two boards in
the same app disagree about what a card is, and a kit whose components hold
both answers to a question the client has answered is a kit that has stopped
ruling. It is also the wrong shape for this component in particular: CH27.24
draws a board card as *"only number, title, owner and age"* and states **no
status pill**, so the `badges` slot is already past what the chapter draws, and
giving an unruled affordance a second axis of variation is the one move a kit
cannot afford. A caller who genuinely needs another arrangement has `content`,
the documented hole for "anything else inside the card"; the ordered parts are
not a menu.

**THE OBJECTION, ANSWERED RATHER THAN AVOIDED.** On the RECORD page the client
ruled the other way — 2026-08-26, KWAPSO-SPEC row 73 — moving the identity
chips from above the title to *"directly underneath the title"*, which reversed
CH27.8's own stated reason that *"keys sit above because they tell you which
record this is before you read what it's called"*. A board card now restores
exactly the reason 27.8 discarded. That is not reconciled here and should not
be: a record page is one object read at full size, with a heading that carries
the page on its own; a board card is a caption-step line in a column of twenty,
where the chips ARE how you find the card you are looking for before you read
any of them. Both rulings are hers, both are recorded, neither is generalised
over the other.

**THE RHYTHM CHANGED WITH THE ROLE, AND THIS IS THE HALF A PURE SWAP WOULD HAVE
MISSED.** `CardContent` is `gap-2`, and gap is directionless, so nothing
"breaks" when two children trade places: the chips would simply keep the
stack's own 7.5 (`--spacing` is `0.25rem`, the root is 15px, ruling 18).
Keeping it is still wrong. Along the foot the chip row was a PEER of the meta
line — last in a stack, equally spaced from everything, which is what it was.
Above the title it is the title's OVERLINE, and an overline sitting at the
stack's own step tells the reader all four rows are equally related while the
strongest mark on the card, a filled pill, sits at the top out-shouting the
title it is supposed to introduce.

So the number is the kit's one stated number for a mark above a title —
`--space-1h`, written in `title.tsx` as *"6 under the eyebrow, and nothing at
all without one"* — taken rather than newly chosen. Measured at the 15px root,
counting each text line's half-leading because a filled pill has none (its
border-box IS its edge):

```
chips → title   5.625 + (15.234 − 12.1875)/2       =  7.15
title → meta    7.5 + 1.52 + (14.953 − 10.3125)/2  = 11.34
```

7.15 against 11.34 is a head and a body. At the old 7.5 it would have been 9.02
against 11.34 — a difference too small to group anything, which is the gap
sized for the old order that this avoids.

The margin needs a wrapper, because a margin inside a flex column ADDS to the
gap (7.5 + 6) and the only other way under the stack's step is a negative
margin. So the head is one flex item spaced internally — precisely how
`title.tsx` builds its own eyebrow-and-heading pair, which means the
construction is borrowed too, not just the number. With no chips the head is
one `<p>` in a `<div>` and preflight zeroes the paragraph's margins, so a card
without chips renders at exactly the metrics it did before.

**A CARD WITH CHIPS AND NO TITLE NOW READS CORRECTLY, AND DID NOT BEFORE.**
`title` is typed required, but `ReactNode` admits `null` and the title's `<p>`
was drawn unconditionally — an empty paragraph is not nothing, it is a 15.234px
line box. Before today that hole sat at the TOP of the card where it was easy
to miss; the reorder would have moved it into plain view between the chips and
the meta line. Both parts of the head are guarded now, and so is the head
itself: chips with no title close up, title with no chips is unchanged, neither
draws no head at all rather than an empty div taking a gap on both sides.

**THE ORDER IS THE DOM's, NOT `order:`.** A CSS reorder would leave a pressable
card (`role="button"`) announcing its name in the old sequence while the eye
reads the new one. **So the spoken name of a card does change with this ruling**
— chips first, then title — and that is correct: what is seen first is what is
said first. No `aria-label` is invented to paper over it; this file's law is
that every user-facing string is a prop, and a label here would be the
component writing one.

**NOT CHANGED: `Swimlane`.** Its card already carries `card.stage` as a 10/500
uppercase eyebrow above the title, drawn from CH19 view 08's own HTML, and
chips above that would be two overlines stacked on one 13-step title. The
client's screenshot is a board card and the ruling is applied where she pointed
it. Flagged here so the next reader does not think it was missed.

Nothing else in the kit asserted the old order — no demo state note, no
specimen and no book page names it — so nothing else needed updating. The
`badges` and `title` prop docs on `KanbanCard` say what they now are.

### Added — `EdgePanel`, the docked rail: beside the record above 45rem, the drawer's own bottom sheet below it

Client, 2026-09-07, on the record-activity shapes, verbatim: *"recoerd
activity- implemet 'A · in the eyebrow row' across the app. kill all old
activity tabs. For the design, let's do a a 6 - but make it slide in in desktop
and slide up in phone"*, and the day before, 2026-09-06: *"I don't want to have
activity as a tab anywhere but on the footer, on top of the dates. On the right
column, on Latest Activity, I would like some view or expand or whatever, and
this would open a slide-in with all the activity."*

Two sentences, three decisions. The Activity TAB dies. The record's footer
summary becomes the only activity on the page. And the door out of it opens
**this** — the thing there was no component for.

**"A 6" IS SHAPE 06 OF THE ARTIFACT SHE REVIEWED, AND WHICH SHAPE IT IS, IS THE
WHOLE SPECIFICATION.** Shape 06 is the DOCKED RAIL: the history stands at the
inline end while the record stays live beside it. She picked it over three
SHEET shapes on the same page, and the single thing that separates it from all
three is the thing this component exists to preserve — **it is not modal**.
Nothing dims, nothing locks, nothing traps, and the reader keeps working with
the history open. A rail that dimmed the record would be one of the three
shapes she did not pick, so the non-modality is not a simplification that could
be tidied up later; it is the ruling.

**HER AMENDMENT TURNED IT FROM A PANE THAT PUSHES INTO ONE THAT SLIDES OVER.**
Shape 06 as drawn takes its 420 out of the layout and moves the record across.
"Slide in in desktop" does not. So the panel is `position: fixed`, portalled,
and lands **over** the inline end: the record keeps its measure, and not one
line of it reflows while the reader is in the middle of reading it. That is
also why there is no `push` variant — the artifact's version and hers are not
two options, the second replaces the first.

**IT NEEDED NO NEW MECHANIC, WHICH IS THE POINT OF THE RULE SHE GAVE THREE DAYS
EARLIER.** 2026-09-04, standing: *"everythung that's slisde in in desktop,
should be slide up in mobile"* — already law in
`foundations/motion/motion.css` §3a/§3b and quoted in full in `sheet.tsx`.
§3b's `.motion-edge-panel` is described in that file, in its own words, as "the
same rule for A PANEL THAT IS NOT A SHEET", and it was written for the shell's
assistant column. So "slide in in desktop and slide up in phone" was a class
that already existed before she asked for it. **`motion.css` is untouched by
this release.** The component attaches one class and satisfies its five-point
contract literally — the class on the panel element itself (never a wrapper,
because the keyframes translate 100% of the animated box), `data-side` and
`data-state` on that same element, the caller placing the panel where it lands,
and the unmount lag.

**IT IS `EdgePanel` AND NOT `ActivityRail`.** PATTERN §9 forbids product
vocabulary in a kit file, and it would be wrong on the merits anyway: the
motion contract had already named this box, and a component and the class that
moves it must not end up with two names for one idea. It leaves the box general
enough for the second caller it was drawn for — the shell's assistant column —
and for the next rail after that.

#### THE ASYMMETRY, WHICH IS THE ONE THING IN THIS COMPONENT MOST LIKELY TO BE "FIXED" BY SOMEBODY MAKING IT CONSISTENT

Above 45rem the panel takes **no scrim, no focus trap and no page lock**. Below
45rem it takes **all three**. Both halves are deliberate, and the entry states
the argument rather than mentioning it, because a reader who meets only one
half will read it as an oversight.

Above 45rem, non-modality is true by construction and is the ruling. The rail
is 420 of a 1440 viewport; the record is fully visible beside it and fully
operable. Dimming it, trapping focus in the rail, or freezing the page would
take away the exact property she chose shape 06 for — the reader working with
the history open. A rail that locked the page would BE one of the sheets.

Below 45rem none of that survives, and the shape has changed underneath the
argument. The panel is full width and 85dvh tall: the record is not beside it,
it is under it. A page that is 85% covered, still scrollable, still tabbable
and still clickable is not "non-modal" — it is a page you can operate **blind**.
The reader tabs from the last control in the sheet into a form they cannot see;
the thumb is over the sheet, the momentum lands on the record, and nothing on
screen says which one moved. The honest name for that is a trap. So below
45rem the panel takes a scrim, a focus trap and a page lock.

Put the other way round, and this is the version to remember: **the asymmetry
is not between two widths, it is between two shapes.** Above 45rem this is a
rail beside a record. Below it, it is the drawer — the kit already has one, it
is already modal, and this panel becomes it. The root element's role changes
with it, from `aside` to `role="dialog" aria-modal="true"`, because that is the
truth at each width and a component that lied about one of them would be
readable by nobody.

**THE GEOMETRY BELOW 45rem IS `sheet.tsx`'s, COPIED AND NOT RE-DERIVED.** Eight
declarations, line for line — `inset-x-0`, `top-auto`, `bottom-0`, `h-auto`,
`w-full`, `max-h-[85dvh]`, `rounded-t-[var(--radius)]`, `rounded-b-none` — each
one fighting a specific base declaration, and the 85dvh is the client's own
85/15 ruling in `dvh` rather than `vh` for the drawer's reason: on a phone the
browser chrome is the difference between a footer you can press and one under
the address bar. Two bottom sheets on one phone that differed by a pixel would
be the worst possible outcome of a rule whose entire purpose is that panels
behave the same way. The grabber (ch27.2's, *"On narrow it rises from the
bottom as a sheet with a grabber"*) comes with the geometry, and is
`display: none` above 45rem where the drawer draws none either.

**EVERY VISIBLE DECISION IS A MEDIA QUERY; ONLY THE UNPAINTED ONES READ THE
VIEWPORT.** The scrim's existence, the bottom anchoring, the radius flip and
the grabber are all `max-[45rem]:` classes, for the reason `sheet.tsx` and
motion.css §3a already state: a JS breakpoint read during render gives the
server the desktop answer and the client the phone answer, and even where it
hydrates cleanly the first painted frame is a panel flying in from the side
before it corrects itself. A focus trap, a page lock and an ARIA role are not
painted — they are attached in an effect, which never runs on the server and
runs after the first client paint, so reading `matchMedia` there mismatches
nothing and flashes nothing. The one visible consequence is that for a single
frame on a phone the panel is announced as a complementary region rather than
as a dialog; the scrim is already drawn by then, because the scrim is CSS. Both
halves are written against the **range** form — `max-[45rem]:` compiles to
`width < 45rem` and the effect asks `matchMedia("(width < 45rem)")` — rather
than `max-width: 45rem`, so the two halves cannot flip one pixel apart.

#### The rest of what it does, and the reasons

- **It portals to `document.body`, and that is not optional.** Everything here
  is `position: fixed`, which resolves against the viewport only while no
  ancestor establishes a containing block. This kit ships one that always
  does: `.motion-page` (motion.css §2) animates `transform` with
  `animation-fill-mode: both`, so the route wrapper holds `translateY(0)` for
  the whole life of the page — a non-`none` transform, and therefore a
  containing block, long after the entrance has finished. A rail mounted inside
  a route would anchor to the route's box instead of the window, and it would
  look *almost* right, which is worse. `Sheet` never had to think about this
  because Radix's `Portal` was doing it; there is no Radix here.
- **The exit is waited out, and the duration is READ rather than written.**
  Unmounting in the same commit that sets `data-state="closed"` lands
  `display: none` on the exit's first frame, so the panel disappears instead of
  leaving and the class looks broken when the caller is what broke it. `inert`
  goes on immediately — a panel on its way out must be unreachable from the
  keyboard, the accessibility tree and the pointer while it is still painted —
  and removal waits for `--duration-exit`, resolved off the document. RULES
  §6.1 says a component writes no duration; this one writes none, and gets
  reduced motion for free because tokens.css §9 zeroes that token and the read
  returns the zero. An unreadable token returns 0, which is the coherent answer
  rather than a fallback guess: if the stylesheet declaring `--duration-exit`
  is absent, so is the stylesheet that would have animated the exit. It is a
  timer and **not** `animationend`, for PATTERN §12's recorded case: an
  embedded browser pane at `document.hidden === true` never ticks a CSS
  animation, so a surface that unmounts on that event never unmounts.
- **Escape works at both widths, and listens on the document.** Above 45rem the
  panel is non-modal and focus is normally somewhere else entirely; a rail you
  can only dismiss while your cursor is inside it is a rail you cannot dismiss.
- **Above 45rem nothing takes focus, and exactly one focus move is allowed.**
  A rail that stole focus from the record would have taken away the thing shape
  06 was chosen for. The exception: if the reader **was** working inside the
  rail when it closed, focus would otherwise land on `<body>` and the next Tab
  would restart the page from the top, so it is returned to whatever opened the
  panel. That is recorded on the way in (`onFocusCapture`) rather than measured
  on the way out, because by then the panel is already `inert` and the browser
  has moved focus off it, so asking afterwards always says no.
- **The page lock restores what was there before**, not a blank, so a host that
  sets its own `overflow` gets it back.
- **The narrow trap re-reads its stops on every Tab.** A rail's contents change
  under the reader — a feed loads, a register is replaced — and a list captured
  once at open would send Tab to a control that has since left. With no stops
  at all, focus is held on the panel rather than let out onto the page the
  sheet is covering, which is why the panel carries `tabIndex={-1}`: a target,
  never a stop.
- **z 50 — one rung under the drawer.** The ladder stated in `select.tsx` is
  sheet 55, dialog and alert-dialog 60, the four anchored surfaces at 70. A
  rail belongs under all of them: it must cover the page and the shell's own
  chrome (which tops out at 10), and it must not cover a drawer or a dialog
  opened from inside it. The scrim takes the same 50 and the two are ordered by
  DOM order, which is how the drawer's pair is ordered too.
- **`open` is controlled with no uncontrolled twin.** A rail is opened from
  somewhere else on the screen — a footer's action, a toolbar, a shortcut — and
  the thing that opens it is the thing that has to know it is open, so a second
  copy of that state inside the panel could only ever disagree with it.
- **No `onClose`, no close chip.** `showClose` defaults to `true` and is
  honoured, but a chip that cannot dismiss anything is worse than no chip, so
  the panel with no handler draws none and the caller closes it from outside.
- **There is no `top` or `bottom` side, and that is a decision.**
  `.motion-edge-panel` supports four and `Sheet` exposes four because 18 call
  sites already passed them. Nothing passes this one yet, so the API is the
  honest size. A `bottom` edge panel is a bottom sheet at every width and the
  kit already draws that; a `top` one cannot obey the client's rule at all —
  `sheet.tsx`'s sentence is the whole argument, *"a `top` sheet that rose from
  the bottom would arrive at the edge it did not come from"*. Two sides are the
  two the rule is about.
- **Nothing about it is mango**, no ring is written (tokens.css §8 rings
  everything at once), separation is a fill or an inset shadow and never a
  border, and every user-visible string is a prop with a default.

**REJECTED.** A `variant="push"` that took its width out of the layout (her
amendment replaced it, and keeping both would let two rails in one app disagree
about whether the record moves). A JS breakpoint driving the geometry
(hydration mismatch and a wrong first frame — this is why the seam is where it
is). `animationend` as the unmount signal (PATTERN §12). A `Sheet` with its
scrim switched off (the scrim is not the modality — the trap, the lock and the
role are, and a `Sheet` with four things disabled is a second component wearing
the first one's name). Widening the rail with the viewport: 420 is the measure
the kit states for its drawer, and past about 480 a history column stops being
a margin note and starts competing with the record for the reader's eye, which
is the failure she rejected when she rejected the sheets.

**API.** `EdgePanel`, `edgePanelVariants`. Props: `open` (required),
`onClose`, `side` (`"left" | "right"`, default `"right"`), `title`,
`description`, `footer`, `showClose` (default `true`), `closeLabel` (default
`"Close"`), `label`. Slots published for the app's own probes:
`edge-panel`, `-scrim`, `-grabber`, `-header`, `-title`, `-description`,
`-body`, `-footer`, `-close-button`.

Filed in the book under **Feedback & overlays**, with the dialog, the alert
dialog and the sheet, because a reader comparing "which of these covers the
page" wants all four on one screen. `demo/sections/c-d.tsx` grew a letter to
C–E rather than gaining a sixth registry file for one section — the section
index sorts the merged array by slug, so which file a section is declared in
has never decided where it appears.

#### Where to look

- **`demo/` → Feedback & overlays › EdgePanel** — the reading-end rail with a
  head and a pinned foot, the start-edge twin, and the bare panel with no head,
  no foot and no chip. The section's caveat is the instruction that actually
  demonstrates the component: open one and keep scrolling, keep tabbing, keep
  pressing things underneath it — then narrow the window under 720 and open it
  again.
- **`demo/` → Templates › RecordDetail**, panel *"activityAction — the door the
  Activity tab left behind"*, where the footer's door and this rail are drawn
  as the one flow she asked for.

#### FINDING — `verify/edge-panel/` is scaffolded and does not run

Recorded rather than papered over. The sandbox has its `index.html`,
`entry.css`, `main.tsx` and `vite.config.ts` (port 5307), and all four of them
reference a `page.tsx` that **is not written**: `main.tsx` imports `./page` and
`entry.css` has it as a `@source`. `npm run check` does not catch it, and that
is not a fluke — `tsconfig.json`'s `include` covers `components`, `lib`,
`compositions`, `foundations/icons`, `demo` and `mini-app`, and has never
covered `verify/`, so a broken sandbox is invisible to the gate by design.
Until that page exists, the settled-geometry numbers this component would
otherwise print under each state are unmeasured, and this entry deliberately
does not claim any. The travel itself is already measured next door, in
`verify/sheet-slide-up/`, whose whole subject is the keyframes.

### Added — `RecordDetail.activityAction`, the door the Activity tab left behind

Client, 2026-09-06: *"I don't want to have activity as a tab anywhere but on
the footer, on top of the dates. On the right column, on Latest Activity, I
would like some view or expand or whatever, and this would open a slide-in with
all the activity."* And 2026-09-07, naming the place: *"recoerd activity-
implemet 'A · in the eyebrow row' across the app. kill all old activity tabs."*

With the Activity tab gone, the footer's summary is the only activity on a
record page — so the door to the full history has to be somewhere, and she said
where. `activityAction?: React.ReactNode` is the trailing slot on the "Latest
activity" eyebrow's own row. The first caller fills it with
`All activity · 48 ›` and opens an `EdgePanel` with it.

**IT SUPPLIES THE PLACE, THE TYPE STEP, THE LEADING AND THE INK — AND NOT THE
CONTROL.** A `Button variant="link"`, an anchor, whatever the route's router
needs. Two reasons it is a node and not a `{ label, onSelect }` pair: a kit
component must not own a string (PATTERN §7), and it must not own a navigation
either.

**WHAT IT MUST NOT BE IS A BUTTON WITH A BOX**, and the reason is local to this
card. The record's footer already teaches one shape: a pill on it is a CONTROL
BY ELIMINATION, which is the note field's own argument and the whole reason
that field can afford to have no edge. A second pill up here would make the
reader ask which of the two is the field. `Button variant="link"` is the shape
that fits — the kit's `.kw-link`, which *"inherits its ink, underlines on
hover, occupies no box"*, compounding to `h-auto p-0`, so it takes the ink this
row hands it and adds no height at all.

**IT COSTS NO HEIGHT, AND THAT IS ARITHMETIC RATHER THAN AN EYEBALL.**
`--footer-eyebrow-line` is the eyebrow's line BOX, written once on the row the
way `activity-feed.tsx` writes `--feed-line` and for the identical reason: two
things measure against it and they must not drift.

```
--footer-eyebrow-line
  = --text-micro × --text-micro--line-height
  = 0.6875rem × 1.3
  = 0.89375rem
  = 13.406px at the shipped 15px root (ruling 18)
```

`RecordFooterEyebrow` is `text-micro`, whose own line height IS that 1.3, so
its line box is that expression by construction. Handing the same length to the
action makes the two boxes identical, `items-baseline` lands them on one
baseline, and the row's height is the height the lone eyebrow already had.
Nothing below moves: the feed's `mt-3` starts from the same y it always did.

**`text-xs` FOR THE ACTION, AND FOUR THINGS KEEP IT FROM READING AS A SECOND
EYEBROW:** it is sentence case, its tracking is 0 where the eyebrow's step
carries 0.08em, it takes no medium weight, and it is in the FULL footer ink
where the eyebrow is in the quiet one. The ink is the load-bearing one of the
four — the label is quiet and the target is not — which is chapter 13's
"colour separates" doing the work a box would otherwise have to. Measured in
both palettes against `--surface-record-footer`, the card's own ground, so the
number is the one the reader actually sees:

| | light, on `#1A1918` | dark, on `#26241F` |
| --- | --- | --- |
| the action, `--ink-on-record-footer` `#FFFEF9` | **17.386:1** | **15.353:1** |
| the eyebrow beside it, `#d5d1c9` | 11.531:1 | 10.183:1 |

The instrument was checked against the fault this component already
records — the 2026-08 eyebrows at `#5F5D59` on charcoal — and returns that
case's 2.672:1, so it can still say no. Nothing here is anywhere near it.

**THE INK IS NAMED RATHER THAN INHERITED**, and the redundancy is deliberate.
The card above already sets `text-ink-on-record-footer`, so the class looks
like nothing. It is not: this row is the one place in the card where a quiet
ink and a full ink sit side by side and MEAN different things, and an ink that
arrives by inheritance is an ink nobody has decided. Stated on the element, it
survives the next change to the card's own text class.

**`whitespace-nowrap`, because the derived leading is a ONE-LINE
measurement.** A wrapped action would stack two 13.406 boxes and the "costs no
height" claim would stop being true. The eyebrow keeps the flexible side and
wraps first, which is the right order — the label can afford two lines, the
door cannot.

**OMITTED, THE ROW IS BYTE-IDENTICAL TO WHAT IT WAS, AND THAT IS A PROPERTY OF
THE STRUCTURE RATHER THAN A PROMISE ABOUT A DEFAULT.** The flex row lives
inside the `else` branch, not around both: with no action the eyebrow is
rendered by the same `RecordFooterEyebrow` call it always was, with no wrapper
around it and nothing new in the DOM. It is the old element, unchanged, reached
by the same expression.

**IT CAN BRING THE FOOTER'S ACTIVITY COLUMN INTO EXISTENCE, ALONGSIDE THE TWO
THINGS THAT ALREADY COULD, AND FOR THEIR REASON.** The door to the full
history is a fact about the record even on a day when nothing has happened yet,
and a route that hid it because the summary was empty would have hidden the
only way to the entries that are not summarised. It is gated on
`activityVisible` with the rest, so permissions still HIDE (ch24.6) and a
portal route passing `activityVisible={false}` gets no door either. A caller
that passes nothing changes nothing: the condition is the old one with a term
that is `undefined`.

**IT IS NOT A SECOND EXCEPTION TO THE CARD'S READ-ONLY RULE**, and must not be
read as one. `onAddNote` is an exception because it writes. This slot writes
nothing, changes no value and submits nothing. It is a door, and a page being
read-only has never meant a page you cannot leave.

Slots: `record-detail-activity-row` and `record-detail-activity-action`.

#### Where to look

- **`demo/` → Templates › RecordDetail**, panel *"activityAction — the door the
  Activity tab left behind"*: the same footer twice, given and omitted, with
  the press wired to a live `EdgePanel` so the whole 2026-09-06 sentence — the
  summary in the footer, the door on the eyebrow's line, the slide-in with all
  the activity — is drawn end to end rather than described.

### Changed — the kit's two scrims are a token, so no component mixes its own charcoal any more

`--scrim` (charcoal at 36%) and `--scrim-drawer` (charcoal at 28%) are minted
in tokens.css §3 and bridged in §10 as `bg-scrim` / `bg-scrim-drawer`. Four
files stop hand-mixing and consume the name: `dialog.tsx`, `alert-dialog.tsx`,
`sheet.tsx`, and `ScreenShell`'s narrow aside. **Nothing renders differently.**

This closes GAPS-A.md OVL-2, which had logged the problem and named the fix in
its own words — *"A component may not write a colour, so the value has to come
from a token — but the ruling is charcoal in BOTH palettes, and every semantic
token that is charcoal in light flips to off-beige in dark (`--foreground`,
`--surface-inverse`, `--focus`). Mixing from any of them produces a WHITE scrim
in dark mode."* There was no token that could hold it, so four files each wrote
the mix out by hand against the raw palette layer, each with its own paragraph
explaining the exception. **These two names are that token.** They are the only
names in §3 deliberately not re-declared in either dark block, and that is the
whole ruling: a scrim is charcoal at both ends of the palette, so a dark
override would be the bug rather than the completeness.

**A FIFTH CONSUMER IS WHAT FINALLY FORCED IT.** `edge-panel.tsx`'s narrow
presentation is the drawer and therefore wants the drawer's 28%. Adding a fifth
hand-mixed exception was the alternative, and was declined.

**THE KIT'S OWN LITERAL, AND NOT A `color-mix` OFF `--kw-charcoal` — MEASURED,
NOT PREFERRED.** The first draft mixed the raw charcoal, which reads better and
keeps the 36 and the 28 visible as percentages. Compiled, it does not survive:
Tailwind rewrites a `color-mix` in a custom property into a PAIR — the un-mixed
colour, then an `@supports (color: color-mix(in lab, red, red))` block with the
real value — so a browser without `color-mix` gets **fully opaque charcoal**
where a 36% dim was asked for. A scrim is the one value where that fallback is
not a graceful degradation but a black screen over the record. The same pair
was already being emitted for all four hand-mixed call sites — verified by
compiling the old arbitrary class against the current tokens file — so this is
a trap being **removed**, not one being avoided. `rgba(26, 25, 24, …)` is also
what the kit literally states, and how every other alpha-on-a-ground value in
that file is already written (`--border`, `--hair-faint`, `--hair-inverse`).
The value is identical either way: `color-mix(in srgb, #1A1918 36%,
transparent)` resolves to exactly `rgba(26, 25, 24, .36)`.

They are bridged as utilities rather than left as bare custom properties
because an element that PAINTS A GROUND uses a named utility — the same law the
record footer's arbitrary background was written to enforce, and the reason the
four old call sites each carried an arbitrary background that `cn` merges by
the wrong group.

### Added — `ScreenShell.asideLead`, so a screen can put something on the assistant's own row instead of in its body

Client, 2026-09-07, with a screenshot of a ticket screen where the running
timer floats over the content: *"Back to overall design: I want the timer out
of the main body. I want it exactly at the same level on the left of the
assistant button opener, and of course, if I open the assistant, they should
also move. Do you understand what I mean?"*

This is a shell-level placement, not a nudge on a pill. The shell's public
slots — rail, aside, navLead, ambient, breadcrumb, header, eyebrow, title,
actions, recordNumber, collectionLabel, chips, tags, meta, figureStrip,
children, footer, fallback — had **nothing beside the assistant's opener**.
That was the gap.

**WHICH OPENER, ESTABLISHED BEFORE ANYTHING WAS DRAWN.** The shell has two
drawings of one control and they never coexist: `screen-shell-assistant-trigger`,
a `variant="secondary"` (paper) button that is `md:hidden`'s child and so
exists only below 768; and the aside's `EdgeHandle`, which is `HANDLE_HIT` —
`--btn-primary-fill`, i.e. **mango** — and which when shut takes the screen's
true top-trailing corner on her own earlier instruction ("real top right
corner"). Her screenshot is a wide screen with a mango circle at the top
right, and paper is not mango. It is the shut `EdgeHandle`. The consuming
application confirms it from the other side: it passes `narrowTopBar={false}`
and draws its own phone bar, so the kit's narrow trigger is not even mounted
in the product she photographed.

**THE SLOT.** `asideLead?: React.ReactNode` — one prop, no label, no second
control. Named for the place, not for the timer: the next caller will be a
save state, an unsaved-changes count or a live-connection mark, and a prop
called `timer` would be product vocabulary in a kit file (PATTERN §9). `Lead`
is already this shell's word for "the node at the leading end of a bar" — see
`navLead`. It paints nothing: no fill, no radius, no hairline, no ink, so
there is no ground here to name a utility class for and the two-radii rule is
untouched. It publishes `data-slot="screen-shell-aside-lead"`.

**IT IS ANCHORED TO THE ASSISTANT DOCK'S LEADING EDGE, WITH NO STATE BRANCH IN
ITS PLACEMENT.** `top-[var(--shell-gutter)] end-full
me-[calc(var(--control-height-button)+var(--space-2h))]`, and that one string
answers all three states:

- **Open** — the dock's inline size is the column's, and
  `.motion-column-collapse` (motion.css §7) is already easing it. A percentage
  inset against a box whose width is animating resolves on every frame, so the
  row *glides* inland with the column. That is her "if I open the assistant,
  they should also move", and the shell writes **no duration and no curve** for
  it (law 6.1). Measured at 1440: the row travels 375.00, which is the column's
  own width.
- **Shut** — the dock collapses to its own leading gutter, so the same anchor
  lands the row `--space-2h` (9.37 at the 15px root) short of the corner
  circle. `--space-2h` is `Stopwatch`'s own gap between the parts of a pill, so
  the client's component supplies the air beside her circle.
- The trailing reserve is **constant in both states** and that is the trade
  that buys the glide. Branching it on `isAsideOpen` recovers ~47px of
  tightness when open and turns a continuous travel into a jump on the state
  frame; a CSS transition on the margin would be a component writing motion,
  which is law 6.1 with the sign flipped. The reserved band is the opener's own
  footprint and the opener stands in it half the time.

**"EXACTLY AT THE SAME LEVEL" IS A DERIVATION, NOT AN EYEBALLED LITERAL.** The
row spends `--shell-gutter` for its block inset and `--control-height-button`
for its height — the same two tokens the shut opener spends — and is
`items-center`. Measured at 1440: both tops 18.75, both centres 37.50, Δ 0.00.
Open, the assistant's folder tab holds the same line (the dock pays its top
gutter *inside* the tab), so Δ top is 0.00 there too; the centres differ by the
folder's own greater height, which is its shape and not a misplacement.

**NO ASIDE AT ALL — IT IS STILL DRAWN, AT THE ROW'S END.** `aside={null}`
renders no dock and no opener, so this instance is a child of the SCREEN and
takes `top-[var(--shell-gutter)] end-[var(--shell-gutter)]` — the corner the
opener would have had, flush with the content column's own trailing inset. The
reserve is dropped with the opener. It does **not** go unrendered: a clock that
disappeared because a screen happens to have no assistant is a clock that
stopped existing while it was still running.

**BELOW `md` IT IS NOT DRAWN, AND THE APPLICATION IS NOT FORCED TO DRAW ITS
PILL TWICE.** `max-md:hidden` — `display: none`, so the caller's node is out of
the tab order and out of the accessibility tree, measured with a focus sweep at
375 rather than with `checkVisibility`. It is the same suppression the shut
`EdgeHandle` already takes, for the same collision: on a phone the opener is in
a top bar, not in the corner, and below 45rem the dock is a full-bleed bottom
sheet that `end-full` would carry the row clean off the leading edge of the
window. So the app keeps its own narrow copy in its own phone bar and hands the
wide copy to this slot instead of to `header` — one drawing at each width, with
the breakpoint doing the choosing.

**WIDTH.** `w-max`, capped at `40vw`, one line, never wrapped. `w-max` is
load-bearing rather than decorative: an absolutely positioned box with an `end`
inset of `100%` has a *negative* shrink-to-fit available width, so `width: auto`
would collapse the pill onto its min-content floor. The 40vw cap is the
assistant column's own (`lg:max-w-[40vw]`), reused rather than invented — what
it protects is the **breadcrumb**, which shares this line from the leading side
and keeps at least three fifths of it. Inside the cap the caller truncates: the
row hands its children `min-width: 0`, the same one-line enabler
`.motion-column-collapse > *` already gives, so a `truncate` engages instead of
overflowing. Measured with a deliberately long title: 258.89 × 37.50 — one line
of `--control-height-button`, and the trail ends at 562.83 with the row
starting at 702.98.

**Every inset is logical** (`end`, `me`, and a `top` on the axis that does not
mirror), so "on the left of the assistant button" is the reading end in both
directions. `?dir=rtl` reports identical numbers.

**`z-10` and `pointer-events-auto`, both the handle's own.** Above `lg` the
dock is an in-flow item at `z-auto` and the row hangs out of it over the card,
which is `relative z-[2]` — at the default stack level the caller's node would
be painted *under* the card. Ten is the rung the handle already spends for
exactly that overhang. `pointer-events-auto` takes the events back from the
dock's `max-lg:pointer-events-none`; without it the pill is a control you can
see and cannot press between 768 and 1024, which is the precise defect the
phone's top bar found and fixed once. Verified at 900 with the column open:
`elementFromPoint` over the pill returns `stopwatch-action`, not the overlay.

#### FINDING FOR THE CLIENT — this placement puts two mangos on one line

Not fixed here, and deliberately so. The kit rules **one mango per view**
(docs/RULES.md §2.5). The shut opener paints `--btn-primary-fill`; the
`Stopwatch` in her screenshot paints its action disc `--surface-brand`, and
that component's own source calls it *"the one mango in the pill"*. Both are
#FED069, and this slot stands them 9.37px apart. Neither is the shell's to
restyle, and a kit that quietly demoted a client's control to keep its own law
would be hiding the collision rather than reporting it. Three honest answers,
hers to pick: the opener goes paper on wide screens as it already did on the
phone; or the pill's disc goes charcoal while a timer sits on this row; or the
rule takes a stated exception for the screen's chrome corner. It is drawn as it
stands in `verify/aside-lead/` and in the book so the choice is made from a
picture.

#### Where to look

- **`verify/aside-lead/`** — the three states stacked, at the window's real
  width, with the numbers behind every claim printed under each one, plus a
  LIVE panel whose toggle shows the row and the column travelling together.
  `?dir=rtl`, `?t=dark`, `?spine=ink|paper|mango`.
  `npx vite --config verify/aside-lead/vite.config.ts` → :5273.
- **`demo/` → Screens › Templates › ScreenShell**, panel *"asideLead — the
  assistant's row, in all three states"*, with the two-mango finding as a
  `Caveat` beneath it.

### Added — `Sankey`, so "what did it arrive as, and what did it turn out to be" is a component rather than a picture in a document

Client, 2026-09-07, pointing at a chart in an approved design artifact: "for
the Raised as, then triaged as i want this graphic you proposed / also, if its
not there, include in ui-ux components". It was not there. The kit's charts
stop at bar/line/area, the donut, the rings, the radar, the gantt, the heat map
and the pulse band; chapter 19's flowchart draws edges between RECORDS and its
comparison draws two records side by side. Nothing in the kit draws COUNTS
moving between two categorisations of one population.

**`components/sankey/sankey.tsx`**, and it is generic on purpose. PATTERN §9
forbids product vocabulary in a component, so the file knows only `nodes` and
`flows`; what the two columns MEAN is two caption props. The client's figure is
one call site of it, not its definition.

**Node totals are DERIVED, and there is no `value` on a node.** A supplied
total and a summed one can disagree, and there is no honest drawing of a
disagreement — a bar longer than the ribbons leaving it is a gap with no
meaning. Her own reference is the proof the derivation is the natural one:
`Issue 149` down the left and `71 Issue` down the right are exactly the row sum
and the column sum of ONE matrix.

**Colour is the source's, from the chart series tokens, and a caller may hand
one per node.** `--chart-1..5` in `chart.tsx`'s own order by default; the
consuming application passes its fixed four (poppy / orange / lavender / sky)
and they stay put when the sort order does not. Mango is nowhere near it.

**The ribbons are a COLOUR, never an alpha** — `color-mix`, the mechanism and
the reasoning `chart.tsx` already states — at 34% for the body and 68% for the
edge, where the kit's stated area fill is 16%. 34 because an area fill sits
behind a curve and is read as shading, while a ribbon is read as an object and
is crossed by others; at 16% one ribbon and two overlapping ribbons are the
same tone.

**Paint order is thickest first, thinnest last, and thickness means the
ribbon's NARROWEST end.** The artifact's own trend chart already paid for
getting this wrong: a small translucent area behind a large one has no findable
edge. Order alone does not fix two ribbons of the same hue, so every ribbon
also carries its own 1-unit outline. Measured on `verify/sankey`, light on the
page tone: body **1.569** against its ground, edge **2.528**, edge against its
own body **1.611**. Dark: **1.691 / 3.319 / 1.963**. All above the step
override 77 already ships as a visible surface change (1.103 / 1.111).

**The diagonal is quieter by default, and it is a prop.** "Arrived an issue,
still an issue" is usually the biggest ribbon and the least interesting one, so
`selfFlow="quiet"` draws it at the kit's 16% with no edge and `selfFlow="equal"`
draws it like anything else. Measured 1.229 light / 1.225 dark against the page
— present, and beaten by every correction crossing it (1.276 / 1.381). There is
deliberately no `"hidden"`: totals are derived from the flows, so a hidden
diagonal would leave every bar longer than the ribbons explaining it.

**A minimum thickness, and the honesty cost written down rather than tuned
until nobody notices.** A ribbon is never under 0.9% of the plot and a node
band never under 8% — under three device pixels and one caption line
respectively at the default height. THE COST: two flows whose true thickness
both fall under the floor are drawn IDENTICALLY. On her own 180-record
population a 1 and a 2 are the same band; a 3 clears the floor and is drawn
true. What pays for it is that no value here is readable ONLY from a thickness
— every flow states its exact number in the readout, in its button's accessible
name and in the hidden table, and the floor can distort none of the three.
Drawing a 1 to scale is honest about proportion and silent about existence.

**Accessibility is answered three ways, and this shape is the hard case.** The
figure has a name; it has a real textual equivalent — a visually-hidden
`<table>` carrying the same matrix with both margins, because "148 flows" read
as prose is useless and a table can be navigated cell by cell; and every ribbon
is a REAL `<button>` carrying its whole readout as its accessible name, wrapped
in `HoverCard` so the card opens on focus as well as hover. That is the kit's
established pattern, reused rather than re-invented. `interactive={false}`
removes the buttons, the cards and the hover entirely — the one thing not
offered is the middle case, a hover-only readout on something not focusable.
**This closes the hole `chart.tsx` and `donut.tsx` both had to log** (GAPS-COL1
CHT-5: "the SVG is not focusable, so the tooltip is pointer-only").

The hit area is exactly the mark and is NOT inflated: a comfortable 24-tall
target over a thin ribbon would sit on top of the thick ribbon under it and
open the wrong readout. **Built the other way round first and measured on
verify/sankey** — the buttons were in the reverse of the paint order, so every
thin ribbon's control sat UNDER the thick one crossing it and the ribbon you
could see was never the one you could reach. One order for both now.

**Two nothings, drawn differently, because they are different.** No categories
at all: the quiet register stands in for the plot, since a flow figure with no
categories has no axes to draw. Categories but nothing moved: the columns ARE
drawn, with their labels and their zeros, and the words sit under them. An
empty box there would throw away the one thing that is known.

**Where to look.** The book: Charts → **Flow**, a new page (`demo/book.ts`),
because a Sankey is not a plot along an axis, not circular and not a calendar
ramp, and filing it under any of the three would make it unfindable on the one
page a reader would open. Section in `demo/collections/data-viz.tsx` beside the
other charts. **`verify/sankey/`** draws the seven awkward cases — the real
figure, a 1 against a 149, the diagonal quiet beside equal, one node with
everything, zero flows, labels far longer than the track, and no categories at
all — each on two grounds, in both palettes, with `?only=N` to review one on
its own.

Seven decisions the artifact does not settle are logged in **`/GAPS-FLOW.md`**
as FLW-1 … FLW-7, including one that is not this component's: `chart.tsx` and
`donut.tsx` both still warn that `--chart-4` and `--chart-5` repeat 1 and 2,
and `tokens.css` has said lavender and orange for some time. Two headers
warning about a hole that is filled will make somebody avoid a colour for no
reason. FLW-7.

### Changed — the ink footer wears no outline, in either palette, and CH27.8's dark clause is overruled

Client, 2026-09-06, on a screenshot of a ticket's detail screen in dark mode:
"in dark mode the footer is wrong no? what are this outline??? review this".
What she is looking at is two outlined boxes, one inside the other — the ink
footer card holding "LATEST ACTIVITY" and "RECORD", and the "Add a note" field
inside it.

**Both edges were deliberate and both were transcriptions, which is why this is
a reversal and not a fix.** CH27.8's dark clause, verbatim: "On dark, ink would
sit almost on top of the page, so the card moves up to raised #26241F **with a
hairline** — same two columns, same content." The chapter's own markup draws the
note field with `box-shadow: inset 0 0 0 1px var(--invhair)` besides. The
component transcribed both faithfully and said so in its comments.

**Measured first, on `verify/ink-footer`, both palettes, before anything moved.**

| edge | light | dark |
| --- | --- | --- |
| the card's own | 8% charcoal over #1A1918 — **1.000** | 12% off-beige over #26241F — **1.455** |
| the note field's | 12% off-beige over #26241F — **1.455** | 12% off-beige over #141310 — **1.391** |
| the two columns' row rules | **1.423** | **1.455** |

Three findings in that table. The card's light edge **was never drawing at all**
— 1.000, exactly its own ground — so the file's old claim that "the light card
has no edge, as drawn" was true, and light mode has nothing to lose here. The
field's edge was visible in **both** palettes, not only in the one she
screenshotted. And every one of the three is the same 12%: an outline around a
card, an outline around a control and a rule between rows, all at one weight.
That is the whole complaint.

**What the card is now: its fill, and a seat.** Chapter 13's subtitle is
"Colour separates, strokes don't", and `card.tsx`'s law reserves the hairline
for SAME-TONE separation — two cards of one tone against each other, which this
card is in neither palette. So the outline goes and the fill does the work it
was already doing: **17.386** against the page in light, **1.198** against
`--background` and **1.111** against `--surface-panel` in dark. Both dark
figures are at or above steps this kit already ships as visible surface changes
(override 77 measures its selected wash at 1.103 light / 1.111 dark and calls
that the answer). Under it, `shadow-sm` — which the bridge points at
`--shadow-rest`, the elevation `Card variant="raised"` gets for free, and in
dark this card **is** a raised card by the chapter's own words. It measures
**1.057** against the dark page and **1.103** against dark soft paper, so it is
loudest exactly where the fill is quietest. A shadow, not a stroke: the standing
rule that separation is a fill or an inset shadow and never a border is
satisfied by the change rather than bent around it.

**What the field is now: its well, its shape, its placeholder and its ring.**
This is the harder half, because override 42 is emphatic that a field's resting
edge earns its keep — "a resting field and a disabled one carried the SAME edge,
and telling those apart is the one job that edge has" — so the stroke could not
simply be deleted and paid for nowhere. It is paid for with the fill. The well
was two tones pointing in opposite directions (`--kw-unlit-raised` in light, the
page tone in dark) measuring **1.132** and **1.198**, each leaning on the stroke.
It is now **one tone in both palettes**, `--surface-record-footer-well`
(#3A3833) — RULED N2's own lift, minted for the identical failure: "a quiet
badge measured 1.13:1 against the card it sat on … the pill stopped existing and
only the label carried." Measured **1.499** on the light footer and **1.324** on
the dark one, so **the fill alone is now stronger than the fill and the stroke
used to be**. Beside it, three things that are not strokes: the pill shape at 38
tall, which nothing else in this card has; the placeholder "Add a note" at
**7.69** on the well, which is also the field's accessible name; and tokens.css
§8's ring, on the ink that reads on this card, the moment it is used.

**The row rules are untouched.** A line between two rows is not an outline
around a shape, and the client's word was "outline". They are chapter 13's
blessed case exactly — same-tone separation between stacked rows inside one
shell.

**Light mode does not regress**, and that is a measurement rather than a hope:
the card's edge was 1.000 before and is absent now, so nothing visible changed
about the card except a 1.105 rest shadow; the field went from a 1.132 well
under a stroke to a 1.499 well without one.

An artifact correction is owed against 27.8's dark clause and against its
note-field markup, alongside the one override 49 already owes it. The whole
argument — what the chapter asked for, what she said, what was measured, what is
drawn — is written into `record-detail.tsx` immediately above region 4, next to
the code, where somebody about to "restore" it will be standing.

### Fixed — the ink footer's card had been outside every ground-keyed rebind in the system, and rendered correctly anyway

Found while measuring the above, and the reason the footer now paints its ground
with a real utility. The card carried `variant="inverse"` **and**
`bg-[var(--rd-footer-surface)]`. `cn`'s tailwind-merge files both in the
`bg-color` group and keeps the last, so `bg-surface-inverse` **was deleted from
the element before it reached the DOM** — confirmed on the built lane, where the
class list carries no such name and the card's `--hair` reads
`rgba(255,254,249,.12)` straight off `:root` rather than off tokens.css §8's
`.bg-surface-inverse` block, whose entire job is to make hairlines correct on
this kind of ground. The card rendered the right colour and sat outside every
ground-keyed rebind in the system. **That is the `--btn-secondary-fill` freeze
in a different costume**, and it is why the house rule is a named utility,
always.

Fixed by naming the pair instead of branching inline. tokens.css §3 and §6/§7
grow `--surface-record-footer`, `--ink-on-record-footer`,
`--ink-on-record-footer-secondary`, `--hair-record-footer` and
`--surface-record-footer-well`; §10 bridges the two that need a class. The
component's `light-dark()` pairs are gone with them — the palette split already
exists in the stylesheet and did not need re-stating in a `style` attribute.

`--surface-record-footer-well` is declared **only** in `:root`, and the omission
is the point: the ink footer is a dark surface in light mode and a dark surface
in dark mode, so the paper a field is sunk into does not have to flip.

`variant="inverse"` is kept even though both of its classes are merged away —
`data-variant="inverse"` is what a consuming app keys on, and the variant is
still the truth in light. `data-surface="inverse"` is deliberately **not** set:
§8's rebind would then fire in dark too, where this card is an ordinary raised
card, and its rules would flip to charcoal-on-#26241F — invisible.

### Fixed — `shadow-none` does not beat `shadow-[var(…)]`, so the note field does not ask it to

A second merge trap, in the same family as the one `lib/utils.ts` was written
for, in a group its `extend` does not cover. Measured, not assumed:

```
twMerge("shadow-[var(--hairline-strong)]", "shadow-none")
  -> "shadow-[var(--hairline-strong)] shadow-none"
```

tailwind-merge cannot see inside an opaque `shadow-[var(…)]`, so it files it
under shadow-COLOUR rather than shadow, the two do not conflict, both survive,
and the winner is Tailwind's emission order rather than the caller —
**PATTERN §1's promise that a call site can always win is not true for this
pair**. It happens to render correctly today, by luck of ordering. The note
field therefore rebinds the SHAPE on its own element instead, which is scoped,
cannot be reordered, and is the escape hatch tokens.css §4 states in its own
words: "Set them all to `0 0` and every edge disappears." It stays a valid
shadow (`0 0 #0000`, Tailwind's own spelling) rather than `none`, because the
utility composes five comma-separated parts into one `box-shadow` and a `none`
in the middle of that list invalidates the whole declaration — taking the ring
with it.

### Added — `verify/ink-footer/`

The footer as it shipped at v1.2.62 beside the footer that ships now, in both
palettes and on both grounds it lands on. One iframe per palette, because
tokens.css §6/§7 key dark off `:root[data-theme]` and a document is one palette
at a time; `?t=dark` is the switch, as in every other lane. The left cell is a
verbatim quotation of the old code — including the arbitrary background and both
strokes — so the pair differs only in the thing under discussion; the right cell
is the real `RecordDetail`, so it cannot drift from what ships. Every figure in
the entries above is printed on the page beside the drawing it came from.

### Fixed — the feed's mark sat 3.414 below its sentence, and `items-center` was the wrong way to raise it

Client, 2026-09-06: "align horizontally avatar + text on activity + footer",
with two screenshots of a one-line entry — an "AT" mark beside "Aurora Thalassa
added a note". The two places are one component: `ActivityFeed`, which the
record's Activity tab and the ink footer's "Latest activity" column both
compose.

Measured on `verify/feed-align`, before anything moved: the mark's centre sat
**3.414px below the first line's centre**, identically in both hosts and in both
shapes. It decomposes exactly. The mark is 22.5 (`--avatar-sm`, 1.5rem at the
shipped 15px root) and the sentence's line box measures **17.672** — so under
`items-start`, with their TOPS flush, the mark's centre is already
(22.5 − 17.672) / 2 = 2.414 low. The `mt-px` on the mark then pushed it a
further 1 the same way. The nudge that was there to fix this was making it
worse.

**`items-center` is the obvious answer and it is wrong**, which is why this is a
derivation and not a one-word diff. The same row carries WRAPPED entries — a
note that runs to four lines is ordinary here — and a centred mark on a
four-line block floats to the middle of the paragraph instead of sitting beside
the sentence it belongs to. The row keeps `items-start` and the MARK takes an
offset onto the first line's own centre:

```
margin-top = (--feed-line − --avatar-sm) / 2 = (1.178125rem − 1.5rem) / 2 = −0.1609375rem
```

`--feed-line` is the first line's box and **the one place it is written**:
`calc(var(--text-caption) * var(--leading-normal))`. Note WHICH leading. The
caption step carries `--text-caption--line-height: 1.4` by default, but this row
overrides it to `--leading-normal`, 1.45; deriving from the token's own 1.4
would have been 0.6px wrong and would have looked right. The sentence now takes
`--feed-line` as its leading too, so the leading the reader sees and the offsets
measured against it are literally the same declaration and cannot drift.

**The equal and opposite `margin-bottom` on the mark is not decoration.** A grid
track is sized from the MARGIN box, so a bare negative `margin-top` would have
quietly shortened every one-line row by the same 2.414 and let the mark eat into
the 12 of padding chapter 18 draws above it. Cancelling the lift at the bottom
keeps the mark's LAYOUT footprint at exactly 24 — ruling 30's "24 with
`flex: none`" — while only its OPTICAL position moves. The one-line row now
measures 45.0, which is the drawn geometry with no nudge in it at all; it was
46.0, and the extra 1 was the `mt-px`.

**The trailing timestamp's `mt-px` was doing something, and it is kept as a
derivation rather than deleted.** The time is `text-xs`, a SHORTER line
(0.75rem × 1.35 = 15.188), so it has to come DOWN to meet the sentence:
(17.672 − 15.188) / 2 = **1.242**. `mt-px` is 1, which left the time 0.242
high — invisible, and a coincidence of the 15px root rather than a rule.
Deleting it would have been a 1.242 regression; leaving it at `px` would be
wrong in both directions at the other two text scales, where the true value is
1.077 and 1.408.

Every number here is a product of tokens, so all three follow the text-size
control. Measured at all three: **0.014 / 0.008 / 0.002** residual at 13 / 15 /
17px root, which is subpixel rounding. A hand-picked pixel would have been right
at one scale and wrong at two.

One residue is known and deliberately not chased. This centres the mark on the
LINE BOX. Saans's own content box (ascent+descent, 14 here) is not centred
inside that line box — the browser reports 1 of half-leading above it and 2.672
below — so the glyphs' own centre is a further 0.836 above where the mark sits.
Chasing it would mean hardcoding one font file's vertical metrics, which no
token holds and which the fallback face does not share; tokens.css §5.0 records
the same trap for `ch`. **The line box is the only centre a stylesheet can
hold.**

Fixes all four call sites at once, because none of them redraws the row:
`RecordDetail`'s footer, `Notifications`, `QuickView` and `CompanyHub`.

`Comments` and `Notes` draw the same 24 mark beside the same caption body and
**were left alone, on a measurement rather than a shrug.** In both, the line
beside the mark is a name and a time on a shared baseline and the sentence is a
line BELOW it; the plain row's header box is 17.063 and the mark reads 2.719
low, which is the same fault. But that header also holds an unread dot, a
resolved badge and a mark-read button when the caller sets them, and with those
present it measures **43.313**. The feed's derivation assumes the first line is
one type step; there it is whatever the caller put in it. Copying this across
would be right for the plain row and 10.4 wrong for the full one, so those two
need their own answer to "which line is the first line".

### Added — `verify/feed-align/`

The one-line entry and the wrapped one, side by side, in both hosts — the
ordinary panel and a verbatim copy of `RecordDetail`'s ink-footer token rebind,
because the client saw the fault on both grounds. The left column is a replica
of the row as it shipped at v1.2.61 so the two states can be looked at together;
the right column is the real `ActivityFeed`, never redrawn.

`window.__feedAlign()` returns, per row, the mark's centre against the first
line's centre in page pixels — **0 is the pass** — and reads the line box two
ways, from `getComputedStyle().lineHeight` and from a `Range` over the first
text node, so a disagreement between the two methods cannot hide inside one
number. It is that second reading that surfaced the font-metric residue above.
`Comments` and `Notes` are drawn underneath with the specimen that disqualifies
them.

### Added — every glyph is now checked against the art it claims to be, and 1,509 of 1,512 already were

Two glyphs have shipped wrong out of this folder and **both were found by eye**.
`Check.svg` held Phosphor's `check-square-fill` — a filled rounded rectangle —
under the name `Check`, and went to ten sites drawing a box wherever the product
meant a tick. `Asterisk.svg` held the fill weight where the client had asked for
regular. Neither was a sloppy file: both were well formed, correctly named, and
passed every guard `generate-icons.mjs` has. That is the whole problem. **The
generator checks that a glyph is well FORMED and has never checked that it is
the right PICTURE**, because this folder has no upstream dependency — art
arrives by hand, one `.svg` per export, and a hand-dropped file is exactly as
authoritative as whoever dropped it. A name is not evidence.

**So all 1,512 were compared against the authentic upstream art, and the answer
is better than feared: 1,509 correct at the intended name and weight, zero
hand-drawn, zero from another set, and no second instance of the `Check`
defect.** The comparison ran against the WHOLE upstream set — six weights of
1,512 names, 9,072 files — rather than against the matching name, because a
same-name diff can only ever say a file is wrong. Searching everything says what
it actually IS, which is the difference between "Check.svg does not match check"
and "Check.svg is `check-square-fill`". The three exceptions were all naming;
they are below, and none of them was a wrong picture.

**`check-icon-art.mjs` is what stops this recurring, and it runs OFFLINE in `npm
run check` — which is the load-bearing decision in this change, not an
optimisation.** The obvious design fetches Phosphor at check time and diffs. It
is worse three ways. A check that needs a CDN goes red on a DNS blip, a rate
limit or an aeroplane, and the first time it fails for a reason nobody caused,
somebody adds `|| true` — **and a disabled check looks exactly like the nothing
that let a filled square ship as a tick.** Second, upstream is not an authority
on what we decided: when 2.2.0 redraws a glyph, a live diff reports our correct
file as wrong and invites a "fix" nobody asked for. Third, it would re-derive
the answer at check time from a source it cannot authenticate, when the control
that was actually missing is **a human reading a diff**.

So `icon-art.manifest.json` is the authority: every glyph's art as a hash,
beside the upstream name and weight it was verified against, with the pack
version pinned at `@phosphor-icons/core@2.1.1`. It goes through review like
anything else, so changing a picture means showing someone. The network is used
only to BUILD it — `npm run refresh:icon-art`, one 1.4MB tarball for the whole
pack rather than 9,072 CDN round trips, printing what moved. Nine thousand
requests to answer one question is rude enough that somebody would narrow it to
"just the ones we use", and "just the ones we use" is how a wrong glyph waits in
the folder for the screen that finally draws it.

The hash is of the ART, not the file: geometry-bearing attributes in document
order, whitespace collapsed. A reformat, a re-indent or a rewritten root `<svg>`
compare equal — vendoring is allowed to normalise on the way in and did for the
Iconoir pack — while a single moved coordinate does not. A check that failed on
things nobody can see is a check that gets deleted. **Both failure modes are
proved rather than asserted: dropping `check-square-fill` back over `Check.svg`
fails with the file's real identity in the message, and an unmanifested `.svg`
fails as UNVERIFIED** — because a file nobody has compared is precisely the
state `Check.svg` was in for its entire shipping life.

**Three files were spelled in a way phosphor.dev is not.** `LightBulb.svg`,
`SnowFlake.svg` and `TextBox.svg` are now `Lightbulb`, `Snowflake` and
`Textbox`. The art in all three was already perfect — authentic
`lightbulb-fill`, `snowflake-fill`, `textbox-fill`, byte-for-byte — so this is
the defect running the other way, and it is the exact one the folder's contract
exists to prevent: Phosphor spells these as single words, so reading `lightbulb`
off the website and writing `<Lightbulb />` was a compile error, and the only
way to find the working spelling was to open this directory. That is the
translating step the client twice said she did not want. An alias was
deliberately not the fix — this folder has no alias table on purpose, and adding
one to paper over a misspelling would reintroduce the layer her ruling deleted
in order to solve a problem caused by not following it. §9.1's "never rename an
export" is the rule that ruling overturned for this folder, so the rename is the
contract being applied, not an exception to it. Zero call sites used the old
spellings in this repo or in the app; they appeared only in `manifest.json` and
in generated files, all of which regenerate.

**`ATTRIBUTION.md`'s weight list was two glyphs out of date, and that is worth
more than the correction.** It said fill about `Asterisk` and `Check` on the day
both were changed to regular — the edits moved the art and did not move the
prose. An audit run against the rule AS WRITTEN would have reported both as
defects and "corrected" them straight back into the bugs they had just come out
of. The list now names all ten plus the 96 arrows, and the manifest records
every glyph's verified weight as DATA, because a weight rule that lives only in
a paragraph drifts silently from the art it describes. Counted: 108 regular,
1,404 fill.

### Fixed — the map could remove its own sandbox, on a default that argued itself out of being safe

`Map` framed its embed with `allow-scripts allow-same-origin`. The HTML standard
calls out that exact pair: a SAME-ORIGIN framed document can reach
`window.parent`, rewrite its own `sandbox` attribute and reload itself out of
the sandbox entirely — so the component's own header promise, "a provider's
embed URL, framed and sandboxed", was not true of a first-party `src`.

**`WebEmbed` had already fixed this on 2026-09-02, and `Map`'s comment cited
that fix and then declined to follow it** — on the grounds that this component's
`src` is a third party's URL by definition. The comment then wrote down, in its
own last paragraph, the reason that is not good enough: *"it rests on `src`
never being first-party, which nothing in the type system enforces."* `src` is a
`string`. A screen that frames a URL a person pasted, or an application that
points at its own map surface by URL rather than through `children`, hands this
component a first-party document while the type checker nods along. **A default
may not rest on a convention the compiler cannot see** — and a comment that
states the counter-argument to its own conclusion has already made the decision;
it just had not been actioned.

The default is now `allow-scripts` alone, and `allowSameOrigin` is an opt-in
boolean — **the same name, the same shape and the same resolution order
`WebEmbed` uses, deliberately.** Two components in one kit that both frame
foreign content must not hold two opinions about what a sandbox is: a reader who
learns the rule at one has learned it at the other, and a security default that
varies by component is a default nobody can state. A boolean rather than a
hand-typed sandbox string keeps the dangerous pair **one greppable word at the
call site** instead of a token buried in a string nobody re-reads, so the call
site states its trust rather than inheriting it. A call site's own `sandbox`
still replaces everything wholesale, tested with `!== undefined` and never for
truthiness, because the empty string is the maximally restrictive sandbox and a
real thing to ask for.

**Nothing legitimate pays for this.** A cross-origin provider — Google, Mapbox —
was already in a different origin and never had access to ours, so an opaque
origin takes away nothing it had. A provider that genuinely needs its own
storage for tiles or preferences says so by name, once, at the call site.

`verify/writeback/` gains stage D2: the same three questions already asked of
`WebEmbed` — default, opted in, own string — asked of `Map`, on the same page
rather than in a harness of its own, so the two components' defaults are read
off the DOM side by side. That is the only arrangement under which "they give
the same answer" stays checkable instead of remembered.

### Changed — a view switcher offering ONE view now draws the pill as a label instead of drawing nothing

Client, 2026-09-06, verbatim: "And then, when there is no other option, so
there is only one, include this in the kit. Basically, it looks exactly like if
it was selected, only that you cannot click, and there is no dropdown."

**This reverses a decision this kit had written down and argued for, and the
argument it reverses was right about the wrong thing.** `ViewSwitch` has
rendered `null` below two views since it was written, on the reasoning that a
control offering no choice is not a control — `/meetings`'s standing decision
(OPEN.md §C21) made general so no route had to remember it. That is a correct
statement about the CONTROL and a wrong one about the ROW. The client has twice
demanded the toolbars stop varying between screens — *"why the fuck i still have
different toolbar variations??? unify joder"* — and a third zone that is present
on one tab and gone on the next **is** that variation: the actions slide left,
the row's rhythm changes, and two screens of the same product stop looking like
the same product. Drawing the pill costs one inert `<span>` and buys a toolbar
that reads identically everywhere.

**Exactly ONE view draws the pill exactly as the selected trigger draws it, and
"exactly" is enforced by there being one copy of it.** The skin the pill wears —
`w-auto min-w-0`, `--control-height-button`, `justify-start`, `shadow-none`,
`--btn-secondary-fill` / `--btn-secondary-label`, `--font-weight-medium` — moved
out of the trigger's `className` into a `VIEW_PILL_SKIN` constant that both
drawings compose, on top of the same `selectTriggerVariants({ state: "default" })`
the interactive one already sat on. A claim of sameness kept by two class lists
that happen to agree is a claim with a review step in it, and the last time this
toolbar moved, `SortControl` and `ViewSwitch` drifted apart on exactly this list.
**Measured: width delta 0.0, height delta 0.0, both palettes.**

**The hover is the one resting rule the two must NOT share**, so it stayed at
the interactive call site rather than moving into the constant. A label that
lightens under the cursor is a control saying "press me" about nothing.
`cursor-default` is the only class the static branch adds, and it is the whole
of the pointer's story: the arrow does not become a hand, so a reader learns
there is nothing to press before they press it.

**It is not a disabled button, and that is the load-bearing call.** A disabled
control is a promise deferred — assistive technology says "dimmed",
"unavailable", and a reader who hears it goes looking for the condition that
would switch it on. There is no such condition and there never will be one: the
collection ships one body, and the day it ships two this becomes a real `Select`
rather than an enabled version of this. So `disabled`, `aria-disabled`,
`role="button"` and `role="combobox"` are all refused, and `tabIndex={-1}` with
them — you cannot remove from the tab order a thing that was never in it, and
writing it would imply there was a control to exclude. The `disabled` PROP is
ignored in this drawing for the same reason: dimming a fact would announce the
body you are currently looking at as unavailable.

**It is text.** A `<span>` with no role, the glyph `aria-hidden` exactly as the
trigger's is, and the naming context — the word "View" — carried as `sr-only`
text rather than `aria-label`, because a roleless `<span>` is not a reliable
naming target and several screen readers ignore a label on one. That would have
left a non-sighted reader with a bare "Board" floating in a toolbar. The two
drawings therefore tell a screen reader the same two facts and differ only in
the third — `"View, Board, combobox"` against `"View, Board"` — and the colon in
the hidden text is a pause, not a word, so the two do not run together into
"Viewboard". Hiding the pill entirely was the other short route and gives the
non-sighted reader less than the sighted one gets, which is the reverse of the
point: the pill exists to say which view you are in.

**There was no caret to remove.** The trigger has drawn none since 2026-09-02
("same on views - rmeove the chevron"), and `hideChevron` does not hide the
glyph — it declines to render it, so the 16 of glyph and the 8 of gap went with
it then. The one-view pill is therefore not the two-view pill minus something;
both are `[glyph, label]` in the same box, and the metric question the caret
would have raised does not arise. Proved by a count rather than by the source:
one `<svg>` each, and it is the view's.

**`data-slot="view-switch-static"`, a slot of its own rather than a second
spelling of `view-switch`.** The two differ in tag name and in whether they can
be operated, and a shared slot would make `[data-slot="view-switch"]` a lie
about being a button — the app and the harness both need to be able to ask which
one is on screen. The glyph keeps `data-slot="view-switch-icon"` in both, so
anything targeting the mark is written once, and the label's word is reachable
at `data-slot="view-switch-label"`.

**ZERO views is unchanged and still renders nothing.** The ruling is a sentence
about one. With none there is no view to name, the only word a pill could show
would be one this kit invented — the thing `views` refuses everywhere else — and
an absent third zone is not a toolbar variation but an absence of data.

**Consuming apps: a toolbar that used to lose its third zone will now keep it.**
Nothing in a call site changes and no prop is added; a route already passing one
view starts drawing a label where it drew a hole. A rule that exempts a
single-view toolbar from the "every toolbar has a view zone" check on the
grounds that nothing is drawn is now exempting a case that no longer exists.

Measured in `verify/toolbar-trio`, which gains a one-view pill beside a two-view
one **carrying the same label** — a width comparison between "Board" and "List
view" would prove nothing — and diffs every property that could make the two sit
differently: box, inline padding, radius, resting fill and ink, type step and
weight, gap, glyph box, and the SVG count. The readout prints the list of keys
that differ, and the expected content of that list is exactly four — `tag`,
`cursor`, `spokenText`, `ariaLabel`. **Any fifth key is the bug the page exists
to catch**; `paintedText` appearing in it would mean the hidden name leaked into
the paint, and `widthPx` or `heightPx` appearing would mean a one-view toolbar
sits differently from a two-view one on the same screen. It also asks the DOM
rather than the source whether the label is a control — role, `aria-disabled`,
`tabIndex`, and a real `focus()` call followed by "who is `document.activeElement`
now" — and counts the zero-view host's children to show that case still draws
nothing. Light and dark: four differing keys, `widthDelta 0.0`, `heightDelta
0.0`, `tabIndex -1`, `takesFocusOnCall false`.

**One harness bug was found and fixed on the way.** The new probe first sampled
on mount and read the control 36.9px narrower than the label with an empty
`paintedText` — Radix renders a `Select`'s chosen value by cloning the selected
`ItemText`, and the item registers in its own effect, so a trigger measured
synchronously on mount is a pill with no word in it. It now samples on a
`setTimeout` rather than the `requestAnimationFrame` the older probe on that page
uses: a browser runs no animation frames for a tab it is not painting, so in a
background tab that callback never fires and the readout sits on its placeholder
while every number on the page is ready. A timer is throttled in the background;
it is not cancelled.

The demo's `CollectionFrame` page draws the one-view frame directly beneath a
two-view one so the two toolbars can be compared without a devtools panel, and
gains a third specimen for the zero-view case.

### Added — a breadcrumb strip can be a workspace tab set, and its tabs can be closed with a keyboard

Client, 2026-09-06, on the live product: "all tabs i open stay open unless i
close them", with "a x icon on the tabs to close them". The app had built its
half of that against `BreadcrumbFolders` and two things this kit could not
express were in the way. Both are now props on
`components/breadcrumbs/breadcrumb-folders.tsx`, both are opt-in, and a call
site that passes neither renders the DOM it rendered yesterday.

**`onClose?: (item, index) => void` — the × is a REAL CONTROL.** It renders a
`<button>` as a SIBLING of the crumb's link inside the `<li>`, never inside the
anchor: interactive content inside an `<a>` is invalid HTML, which is why the
app's own stopgap had to be an `aria-hidden` `<span data-tab-close>` caught by
an `onClickCapture`. The cost of that workaround is the whole reason this
exists — **a keyboard or screen-reader user could not close a tab at all**, and
the span was rightly hidden rather than promise an affordance assistive
technology cannot operate. As a sibling it takes focus, `Enter` and `Space` fire
it natively, and tokens.css §8 rings it like every other control.

It sits IN THE TAB ORDER, immediately after the tab it closes. A roving
`tabindex` and a bare key binding were both considered and rejected: this strip
is an `<ol>` of links and not a `role="tablist"`, so it has no keyboard model to
hang an arrow-key scheme on, and an undiscoverable shortcut is — for the one
user this change is for — the same as nothing. `filter-bar.tsx` settled the
identical shape in its own words: "A REMOVABLE CHIP HAS TWO FOCUS TARGETS… and
both are in the tab order." The cost is that a strip has twice the stops.

Each control is announced with the tab it shuts — "Close tab: Halloway", not a
row of five identical "Close"es. `closeLabel` is the verb, `formatCloseLabel`
replaces the join for a language "verb: name" does not fit, and an item's own
`closeLabel` replaces the result — which is the answer when a crumb's `label` is
a node rather than a string, because an accessible name cannot be read out of
arbitrary markup and this file does not guess at one. The same trio
`filter-bar.tsx` already runs.

`BreadcrumbFoldersItem` is exported: `BreadcrumbsItem` plus `closable` (default
`true`; `false` pins the tab a set may not be emptied below) and the per-item
`closeLabel`. It EXTENDS the shared item rather than widening it — `BreadcrumbsItem`
is also the phone's text trail and `ScreenRenderer`'s recipe data, and a field
only the desktop strip can honour does not belong in a type two other renderers
must silently ignore. Every existing `BreadcrumbsItem` already is one,
structurally, so nothing has to change to adopt it.

**`activeIndex?: number` — WHICH tab is live, decoupled from WHERE it sits.**
The live paper, `aria-current="page"`, the z-lift and the scroll-into-view were
all wired to `items.length - 1`; the only way to mark a tab live was to move it
to the end, so every switch re-ordered the strip under the reader's cursor —
the opposite of the thing being copied, where a tab stays where it was opened.
Defaults to the last item, so a trail is untouched. An index outside the array
marks no crumb as current, deliberately: that is a real state for a tab set, and
clamping would announce a crumb the caller never named while hiding the
off-by-one that produced it.

`Breadcrumbs` gained the identical prop on the same day. Below `md` the strip is
`display: none` and that component IS the trail, from the same array — without
it a phone would announce a different `aria-current="page"` than the desktop
does, which `breadcrumbs.tsx`'s own header names as the class of bug to refuse.

**Three consequences, each argued at its own site in the source:**

- **A tab set does not fold.** A folded tab can be re-opened from the `···`
  menu and cannot be closed from it: a `DropdownMenuItem` is a `role="menuitem"`
  in a menu that moves focus with the arrow keys, so a second control inside a
  row is not keyboard-reachable at all. A menu of tabs you can open and not shut
  is exactly the half-affordance this change deletes. The strip already scrolls,
  and that is also what a browser does with a tab strip. `foldAfter` is a
  trail's lever and is ignored while `onClose` is given.
- **A tab set keeps its tabs on a phone.** The 2026-09-04 ruling — "in monile,
  lets use normal breadcrumbs (like they ware before, jhust teh text)" — is
  about the breadcrumb TRAIL, and text has nowhere to put a close control.
  `onCurrentActivate` already made and won this argument for its own tab.
- **The fold can no longer hide the current location.** It keeps the head and
  the last two, which was safe only while live meant last. With `activeIndex`
  pointing into the middle, nothing folds.

**The z-order moved by one step and paints identically today.** `TAB_REST` drops
from `z-[1]` to `z-0`; `TAB_LIVE` keeps the `z-[1]` the 2026-09-03 fix gave it,
so the live tab is still strictly below a card at `z-[2]` and still cannot paint
over content. The lift used to be held by DOM order — true only while live was
last. There is no integer between 1 and 2, so it is bought by lowering the
others. `z-index: 0` still establishes a stacking context, so `CrumbShape`'s
`-z-10` stays inside its tab.

**Sizing: `--control-height-pill` (26), and the reason is measured.** A tab is
`--folder-tab-height` (47.5) with `--folder-tab-overlap` (17.02) of it spent as
the foot the card rides over, so a control may occupy `--folder-lip` — 30.48.
The dialog's own close chip is `--control-height-dense` (32) and would break the
silhouette's top edge; 26 is the only one of the kit's five control heights that
fits, with 2.24 of air at each end. It is NOT the 44 touch row and cannot be:
the lip is chapter 14's, client-ruled, and "reuse the existing folder tabs
without changing anything on the shape" forbids growing the tab. The TAB stays
the large target (128 x 47.5) and the strip is `md` and up.

No resting fill — the control is drawn on the tab's own paper and six discs down
a strip would compete with the labels the tabs exist to show. The mark is the
affordance at rest; `bg-accent` arrives on hover, a named utility, never mango.
The glyph is Phosphor's `X` at `--icon-16`.

**`TAB` / `TAB_REST` / `TAB_LIVE` are still not exported, and that was decided
rather than skipped** — the argument is written at the bottom of the file. A
class string is not an interface: exporting it freezes every value in it (the
z-index moved in this very change), and tailwind-merge lets a consumer silently
delete any class in the skin by naming one in the same group. The papers are
already reachable as `--kw-crumb-rest` / `--kw-crumb-live` on the `<nav>`, and
every part carries a `data-slot`. If an app needs a tab-shaped control that is
not a crumb — a "+" slot — that is a component this folder should ship, not a
string it should leak.

Measured in `verify/breadcrumb-folder/`, which gains three five-level hosts
(trail / set / pinned) asserting: every close control's parent is the `<li>` and
`closest("a")` is null; each one's `aria-label` names its own tab; the tab order
alternates tab, its close, tab, its close, taken by focusing each candidate and
asking `document.activeElement` who took it; the control's box sits inside the
lip (2.09 above, 24.38 tall, 2.11 below, at the 15px root); and the z-order
reads live 1 · rest 0 · close 1 · card 2. A trail in the same harness still
folds at five, marks the last tab current and draws zero close controls.

Also **fixed in that harness, a wrong reading it has printed since the mobile
split landed on 2026-09-04**: every structural query started at the case host,
and an ordinary trail renders the hidden text trail FIRST — so the strip's own
rect came back all zeros (`overlapPx` was measuring the card's distance from the
viewport origin) and the weights block reported the text trail's 400 /
`--ink-tertiary` where a rest tab is 300 / `--ink-secondary`. A `display: none`
element answers every query without erroring, which is how it survived. Scoped
to the strip, the numbers return: `overlapPx` 15.95 against
`--folder-tab-overlap` 15.96, rest 300 on `--ink-secondary`, live 500 on
`--foreground`. Nothing about the component was ever wrong.

The demo gains a live tab set under `breadcrumbs` — five tabs, the second live,
the head pinned — because a still picture cannot show that closing one leaves
the others where they were.

### Changed — the asterisk is the regular weight, not the filled disc

Client, 2026-09-06: "everywhere there's asterisk, use the regular version
instead of solid."

`Asterisk.svg` held Phosphor's FILL weight — verified byte-for-byte against
`@phosphor-icons/core` `assets/fill/asterisk-fill.svg`, which is a solid 104r
disc with the star knocked out of it. At tab size that reads as a filled dot
with some texture, not as an asterisk. The art is now `assets/regular/
asterisk.svg`, the six strokes alone, fetched from the same package rather than
drawn here — the icon folder has no upstream dependency, so art arrives by hand
and the only defence against a wrong glyph is taking it from source. (The Check
glyph shipped as a filled square under the right name for exactly this reason,
across ten sites.)

Its one consumer today is the "All" tab (`tabs-view.tsx`, `all: "asterisk"`).

NOT A GENERAL SHIFT. Ninety glyphs in this pack still carry the filled-disc
shape and are untouched; this is the one she named. If the disc weight is wrong
elsewhere it is a separate decision, taken by looking, not inferred from here.


### Fixed — the sort control carried three times the gap it looked like it had

Client, 2026-09-06: "sort and view should have same spacing between icon and
text. I know sort has the break, keep it, but make it more compact; to the eye
it should look the same as the view selector."

Measured on `verify/toolbar-trio`: `ViewSwitch` puts 8 between its glyph and its
label. `SortControl` put 26 — and none of it was a gap. The two halves are
FUSED, with no `gap-2` between them at all, so every one of those 26 pixels was
padding: 8 inside the direction square (a 16 glyph centred in a 32 box) plus the
field's own leading `--space-4h`, 18.

So the field's LEADING inset drops to `--space-2` when fused. That token's own
line in the scale reads "chip padding, icon to label" — it is the same 8
`ViewSwitch` spends on exactly this relationship, rather than a number picked to
look right. The TRAILING inset keeps its 18: that edge faces the pill's outside,
where nothing changed and the component header's width arithmetic still holds.
Only when FUSED — an unfused field has no seam and no glyph beside it, so it
keeps the symmetric inset it always had.

The direction square is untouched, as its own header requires. Its 8 (or 10 at
the standing height) is the glyph's own centring, so the seam now sits between
two comparable margins instead of one against three.


### Fixed — an icon rename had reached inside the sentences people read

The Iconoir -> Phosphor swap renamed `Search` to `MagnifyingGlass` and `Check`
to `CheckFat`, and it went through STRING LITERALS as well as identifiers.
Twelve places across eight shipped files have since been offering to
"MagnifyingGlass this collection" and advising people to "CheckFat the number":
`components/command/command.tsx` (the palette's own description),
`compositions/templates/collection-screen.tsx`, `compositions/states/
no-results.tsx` and `empty-collection.tsx` (their search labels),
`compositions/overlays/filter-builder.tsx`, `compositions/screens/home.tsx`
(placeholder and label), `compositions/overlays/import.tsx` (the commit step)
and `compositions/screens/not-found.tsx` (its advice, twice).

Every one is a DEFAULT, so a consumer passing its own copy never saw it —
kwapso-system passes `t("Search members…")` and its own `NotFound`, and none of
the corrupted strings appear in its translation catalogue. Latent there, and
plainly visible in this repo's own demo, which is where it was found.

Fixes are quote-anchored (`"MagnifyingGlass ` -> `"Search `), so no JSX usage
moved: `<MagnifyingGlass size={16} />` is the icon and stays the icon. The
discriminator that makes this findable again: a MULTI-WORD CamelCase glyph name
cannot occur in English prose, while `Record`, `Ticket`, `Check` and `List` are
ordinary words and yield nothing but false positives.

### Changed — `demo/` is a book you navigate, not a completeness check

Not a delivered surface, so nothing an app imports changes. Recorded because
the demo is how a reader finds a component, and the way in is now different:
five parts and thirty pages (foundations · components · charts · data views ·
screens) with an address per page, replacing one scrolling document filed under
the commission's 27 numbered chapters. `demo/artifact.ts` is deleted; the
component's NAME is the largest thing on its card, with its source path
copyable beneath. Live at https://kwapso-ui-ux.kwapso.workers.dev

`demo/book.ts` is the map and `demo/check-book.mjs` guards it in `npm run
check`: a section on no page, a page holding nothing, a map entry naming a slug
nothing uses, a data view drawn without its toolbar, an exemption that stopped
being true, and a component folder no section draws. `docs/BUILD-A-COMPONENT.md`
§12.2 carries the two steps this asks of a new component.

### Added — `FilterBar`'s "+ filter" slot takes an optional badge node

A consuming app's filter row (kwapso-system's `shared/web/screen-engine/
filter-bar.tsx`) needs its active-facet count to always read as `Badge`'s own
mango counter geometry (`size="counter"`: `h-5 min-w-5 px-2`, `rounded-pill`,
the shape `TabsCount`'s active state and `CollectionFrame`'s own heading count
already wear — GAPS-RULINGS.md R-4a, reversed 2026-09-03), inside the SAME "+
filter" pill the count already lives beside, per the client's own ruling
("only a count niside the filter pill"). `addFilterLabel` is typed `string`
and rendered as bare text, so there was no slot in the button for a `Badge`
node — the caller could not do this without either a second, adjacent pill
(rejected: the ruling puts the count INSIDE the one pill) or copying `Badge`'s
classes into app code (a restyled clone, forbidden by `kit-supplies-the-ui`).

`components/filter-bar/filter-bar.tsx` — `FilterBarProps.addFilterBadge?:
React.ReactNode`, rendered as an ADDITIVE sibling of `addFilterLabel` inside
the same button. Nothing here draws the badge's shape; a caller hands it a
real `<Badge count={n} variant="default" />` and this file only places it,
after the label, inside `CHIP_ADD`'s own `gap-1`. Omitted, the button is
byte-identical to before every existing call site is unaffected.

Needs a tag + `scripts/sync-design.mjs` pull into kwapso-system before the
app can use it (`shared/ui/` there is vendored and pinned).

## v1.2.29 — 2026-09-03

### Fixed — the leading breadcrumb tab's corner, reversed

Client, on the live product, the day after ruling for the square: "When I am
on the left tab, the top corner needs to be more rounded. That's not how the
tabs are, so go and fix it." Then, narrower: "not more rounded as a random,
but folders and tabs have a shape … the leftmost one is missing the roundness
on the corner … it's not subjective."

`components/breadcrumbs/breadcrumb-folders.tsx` — the `--folder-radius-lip`
patch that squared the leading tab's own top-left arc to match the card is
DELETED, not reduced. `CrumbShape` no longer takes a `lead` flag; every tab
draws the identical `FolderShape crop="lip"` element, measured in
`verify/tab-joint/` as byte-identical path data against a middle tab's.

`compositions/templates/screen-shell.tsx`'s card keeps `rounded-ss-none`. The
two squares were introduced together on 2026-09-02 but were never one
mechanism: the card's radius (24) is bigger than the strip's own overlap
(17.02), so an un-squared card corner shows ~7 of its own 24-unit arc peeking
out below the tab's dead-straight left edge, regardless of what the tab's own
top corner does. Un-squaring the tab removes none of that collision, so the
card's corner stands on its own argument now, spelled out in the file's
header.

### Fixed — the tab-to-content gap, made one rule instead of three numbers

Client: "there needs to be space between the tabs and the beginning of the
content … go and uniform that, and make sure that you don't hard-code page by
page, but rather you change the rule and you apply it everywhere," then,
same session: "make sure to maintain the space between tabs and content on
all screens, even when I scroll down."

Three kit files drew three different numbers for the same join —
`CollectionFrame`'s `gap-4`/`gap-5` (density-driven), `RecordDetail` and
`ScreenRenderer`'s `gap-[var(--space-3h)]` (14). `tabs.tsx` now exports
`TABS_STRIP_GAP` — `pb-[var(--space-5)]` (20), the number the live product's
own detail-screen mechanism already used and named "the blank page-tone
space the client asked for … a real token rather than a guess." All three
files read it.

It is PADDING on the strip's own wrapper, not a flex `gap`, so it survives a
strip that pins on scroll: a `gap` is a static distance between siblings and
stops meaning anything once one of them goes `position: sticky`, padding on
the pinned box does not. `RecordDetail`'s sticky strip (opacity + position)
moved onto that same wrapper, off `TabsList` itself, because `TabsList`'s own
hairline is anchored to ITS bottom edge and padding there would drag the rule
into the gap. Measured, at rest and after a real scroll, in
`verify/tab-joint/`.

### Added — the quiet-spine resting crumb, `--spine-quiet-crumb-rest`

Client, on the live product: the resting breadcrumb tabs on the Quiet spine
in light were reading as invisible — measured 1.000 against their own
ground, because the quiet spine IS `--surface-panel` and the rest fill was
too. Shown alternatives, she picked `#EDE8E1`, quiet-light only (1.094
against the ground, 1.207 against the live tab, the label at 5.39). Mango
(1.306) and quiet-dark (1.000, unmoved by this ruling — the live tab still
carries that strip) are untouched. `foundations/tokens/tokens.css` names the
value once, bound to `--spine-crumb-rest` on `[data-spine="quiet"]` in light
and reverted to `--surface-panel` in both dark blocks;
`breadcrumb-folders.tsx` reads `var(--spine-crumb-rest, var(--surface-panel))`
so mango needs no second declaration.

### Changed — tab hover is a weight move only, colour does not follow

Client: "when i hover over a tab i want that it gets the same weight as the
active tab (without changing the color) replicate the behaviour we already
have in navbar." `rail.tsx`'s `ROW_IDLE` is exactly that — a fixed ink at
every state, weight the only thing that steps on hover. `components/tabs/
tabs.tsx`'s `TRIGGER_SKIN` and `breadcrumb-folders.tsx`'s `TAB_REST` both
drop their `hover:text-foreground` (the breadcrumb's own override,
`hover:text-ink-secondary`, wins the merge against `BreadcrumbLink`'s shared
part). Weight alone previewing the active state, unchanged from 2026-09-02.
Measured in `verify/tab-joint/`, including the row's own content width at
rest and after a real hover, to catch the weight step reflowing the strip.

### Fixed — the active tab count's "circle" reversed; it wears the title count's own shape

The 2026-09-02 fix for "Tickets 96" (a two-digit count reading wrong) was
built as `size-[1.125rem]` on `TabsCount`'s active state (`components/tabs/
tabs.tsx`) — a fixed square forced round by `rounded-pill`, so a two- or
three-digit count clipped against a box that could not grow. Client, today:
"You were right that the circle is not correct, but rather a round shape like
you have on the title when they have a count. Please reverse these. It was a
mistake to change it." The reference shape was never a geometric circle — it
is `Badge`'s own COUNTER geometry (`badge.tsx`, `size="counter"`: `h-5
min-w-5 px-2`, `rounded-pill`), the exact shape `CollectionFrame`'s heading
count (`countChip`, a bare `<Badge count={…} />`) already draws. `TabsCount`'s
active state now takes `h-5 min-w-5 px-2` instead of `size-[1.125rem]` —
`rounded-pill` was correct all along and is unchanged; only the fixed square
is gone, replaced by a minimum-width pill that grows on its inline axis past
one digit exactly as `Badge` does everywhere else. `GAPS-RULINGS.md` R-4a
carries the reversal in full, with the client's words. Not implemented as a
literal shared component — the active shape has to key off `group/tab`'s own
`data-state` with no JS branch, which `Badge` has no CSS-only switch for, and
Tailwind needs each class written out literally in source rather than
composed at runtime — so the two are kept in step by restating `Badge`'s
counter tokens verbatim and proving it: `verify/tab-joint/page.tsx`'s
`5_count_shape` case measures both elements' computed height, width,
border-radius and inline padding at one/two/three digits, in both palettes —
geometry agrees at every digit count. Background and text colour are read
alongside and are NOT expected to match: the active tab's mango fill is
R-4a's own separate, deliberate ruling, and nothing today asks it to change.

## v1.2.28 — 2026-09-02

### Added — `BreadcrumbFolders`, the breadcrumb drawn as a strip of folder tabs

Client, verbatim: *"REUSE THE EXISTING FOLDER TABS WITHOUT CHANGING ANYTHING ON
THE SHAPE. Each path level is a folder tab, stacked left to right. Every tab
before the last is the inactive color; the last (current location) is same
color as the big content card in the middle, the main color — the same hover,
and font weight rules apply as they already exist. Deeper paths just add more
tabs."*

`components/breadcrumbs/breadcrumb-folders.tsx`. It takes the SAME items array
`Breadcrumbs` takes and renders `breadcrumb/`'s own parts — the `<nav>`
landmark, the `<ol>`, the crumb `<li>`, `BreadcrumbLink`, `BreadcrumbPage` with
`aria-current="page"`, and `BreadcrumbEllipsis` for the fold — so the trail a
screen reader hears is unchanged and only the drawing is new.

```
<BreadcrumbFolders items={[…]} label? foldAfter?=4 ellipsisLabel? listClassName? />
```

**WHY `breadcrumbs/` AND NOT `breadcrumb/`.** `breadcrumb/`'s own header says
what it is: seven parts, and *"it elides nothing — it renders exactly the
crumbs it was written with."* A strip that folds its own middle is not that.
`breadcrumbs/` is the array form, and it already *"owns the rule about when a
deep trail collapses"* — so `collapse()` is exported from `breadcrumbs.tsx` and
reused rather than re-derived. A second file in an existing folder also costs
the demo nothing: `demo/content.tsx`'s guard is one folder → one slug and
`gen-states.mjs` keys on the folder, so both TEN STATES blocks land under
`breadcrumbs`. A new `components/breadcrumb-folder/` would have owed the demo a
section.

**THE FOLD.** Four levels render in full; at five or more everything between
the first and the parent collapses into one `···` tab. The rule is the client's
and the SHAPE of the fold is `collapse()`'s: the threshold is applied here
(`items.length > foldAfter`) because `collapse` couples its threshold to its
tail and the client's rule does not, but which crumbs survive and in what order
is decided once. The `···` tab is a `DropdownMenuTrigger` wearing the rest
fill, carrying `BreadcrumbEllipsis` — glyph `aria-hidden`, announced label
outside that wrapper — and it OPENS what it hides: the elided crumbs as real
`<a role="menuitem" href>` rows. `breadcrumb.tsx`'s own note on
`BreadcrumbEllipsis` already said this is where an expandable elision belongs.

**THE TWO PAPERS, AND WHERE THEY ARE RESOLVED.** `--kw-crumb-live:
var(--surface-raised)` and `--kw-crumb-rest: var(--surface-panel)`, both on the
`<nav>` — TAB-C1's mechanism, for TAB-C1's reason: a caller that rebinds
`--surface-panel` around the strip must not be able to make the live tab and
the card disagree. The live paper is the content card's own, by ruling;
`screen-shell.tsx` paints that card `--surface-raised`, so that is the token
and not `--card` and not `--spine-chip-fill` (the three agree in light and part
company on the mango spine in dark). The rest paper is one step off it in the
direction the palette already steps — the same step `screen-shell.tsx`'s CARD
block makes when it rebinds a filled control on the card to soft paper
(ruling 01) — so it is `--kw-soft-paper` in light and `--kw-unlit-panel` in
dark, derived, with nothing per spine anywhere in the file.

**THE LEADING TAB IS SQUARE ON ITS TOP-LEFT, DRAWN ADDITIVELY.**
`FolderShape`'s top-left radius is a fixed 6.6 brand units at every size and is
not a prop; squaring it in the path would be changing the silhouette, which the
client forbade in the same breath as asking for the square corner. So the
corner is FILLED IN: one `--folder-radius-lip` square of the shape's own
`currentColor`, laid over the arc's exact bounding box (one brand unit is
0.1rem and the arc runs x,y ∈ [0, 6.6], so 0.66rem covers it and nothing else).
`folder.tsx` is untouched. Only the tab that leads the strip gets the patch,
because that is the only tab whose corner the card below squares too.

**MEASURED — `verify/breadcrumb-folder/`, kept.** A measuring harness, not a
picture: the Browser pane renders it at about 42×46px whatever the viewport
says, so every figure is `getComputedStyle` / `getBoundingClientRect` read off
the live document and printed as JSON. At the harness's 15px root:

```
levels        1 → 1 tab, current "Clients"      · 1 square corner
              2 → 2 tabs, no fold               · 1 square corner
              4 → 4 tabs, no fold               · 1 square corner
              6 → 4 tabs, folded, current last  · 1 square corner

live tab      EQUAL to the card in all four cases:
              quiet light  #FFFEF9 = #FFFEF9    quiet dark  #26241F = #26241F
              mango light  #FFFEF9 = #FFFEF9    mango dark  #26241F = #26241F

overlap       strip bottom − card top = 15.95px
              --folder-tab-overlap    = 15.96px  (1.06375rem × 15; 17.02 at
                                                  the 16px authoring base)
tab height    44.53px = 2.96875rem × 15         (47.5 at the base)
square patch  9.89 × 9.89px = 0.66rem × 15, colour equal to the shape's fill

type/weight   rest 300 · --ink-secondary   live 500 · --foreground
              13 (12.1875px) on BOTH — the size never moves between states
```

Rest fill against the ground the strip stands on (`--spine-fill`):

```
MANGO · LIGHT   ground #FED069 · rest #F7F2EB 1.306 · live #FFFEF9 1.440
MANGO · DARK    ground #FED069 · rest #1C1B18 11.843 · live #26241F 10.661
QUIET · LIGHT   ground #F7F2EB · rest #F7F2EB 1.000 · live #FFFEF9 1.103
QUIET · DARK    ground #1C1B18 · rest #1C1B18 1.000 · live #26241F 1.111
rest vs live    1.103 light, 1.111 dark — the same step the card has
```

**ONE FIGURE IS LOGGED, NOT FIXED, AND IT IS OWED A CLIENT RULING.** On the
QUIET spine a resting tab measures **1.000** against the ground, in both
palettes, because the quiet spine IS `--surface-panel` — tokens.css §7b says so
in as many words, and that identity is the whole reason the client cut to two
spines. A resting crumb there has no edge and reads as a label until it is
hovered; the live tab still carries the strip at 1.103 / 1.111. The alternative
is `--muted` (#FAF9F7 / #2F2D28, "inactive tabs, idle wells"), the kit's third
paper and the retired folder tab's own idle fill: it clears the ground on quiet
and costs mango-light, where rest and live would sit 1.021 apart instead of
1.103. The client named soft paper, on mango, so soft paper is what this draws.
`--kw-crumb-rest` is the one lever and needs no edit to this file.

### Removed — the folder tab VARIANT. `TabsVariant` is line-only

Client, verbatim: *"the whole concept of folders as tabs gets killed. All the
current folders as tabs we have will become line tabs. Completely kill and
remove folder tabs… I don't want any dead body around… the only tabs that we
will have are the line tabs because folders will only be used for the
breadcrumbs."*

**The distinction, because it decides what was over-deleted and what was not:
the folder TAB VARIANT died; the folder SHAPE lives.** `components/folder/`
is byte-identical. `--folder-tab-overlap`, `--folder-tab-height`,
`--folder-tab-min-width`, `--folder-shoulder` and `--folder-radius-lip` all
stay, because the breadcrumb reads every one of them. No token was touched.

`components/tabs/tabs.tsx` — `TabsVariant` is `"line"`. Gone with the second
member: the `FolderShape` import, `LIST_SKIN.folder`, `TRIGGER_SKIN.folder`,
`TRIGGER_SELECTED.folder`, `TRIGGER_SELECTED_WITH_INDICATOR.folder`,
`TRIGGER_DISABLED.folder`, `FOLDER_SHAPE_FILL` (both halves), `INDICATOR_SKIN.
folder`, `TABS_COUNT_SKIN.folder`, the `--kw-folder-live` / `--kw-folder-idle`
pair on the root and its whole TAB-C1 block, the `gap-0` branch, the
`resolved !== "folder"` half of the indicator's switch, the
`:not([data-slot=folder-shape])` guard on the shared icon rule, and
`TabsContent`'s card branch with TAB-C2's argument for it. Six `Record<
TabsVariant, string>` maps became six constants, `TabsVariantContext` went with
them, and the `variant` OVERRIDES on `TabsList` and `TabsTrigger` went too —
both existed only to let one strip differ from its root. `variant` stays on
`Tabs` and `TabsView` as the compile fence, exactly as the `pill` deletion left
it: `variant="folder"` now fails to build rather than drifting.

`TRIGGER_DISABLED` also lost its FILL. A line tab has no resting box, so
`--btn-disabled-fill` was the silhouette's half of the pair and left with the
silhouette; a dead tab is an ink and a cursor.

**The default was the conversion.** `CollectionFrame.tabsVariant` defaulted to
`"folder"` under ruling E, so every collection in the kit drew a folder strip
through it. The prop is deleted, and with it the two rebindings that moved the
shape's fills without editing `tabs.tsx` (`--card: var(--surface-panel)` on
`Tabs`, `--surface-panel: var(--muted)` on `TabsList`) and the
`rounded-t-[var(--radius)] bg-surface-page` band the strip stood on — removed
rather than left inert, because an inert rebinding is what the next reader
"fixes". Ruling J2's zero gap goes with them: the frame's stack takes its
ordinary band gap at every density, because a line strip has no feet to hide.
`ScreenRenderer` stopped stating `variant="folder"`, and the demo's own folder
strip (`demo/sections/f-m.tsx`) and two-variant matrix (`t-z.tsx`) are one
strip and one breadcrumb now.

**The redundant `line`s are deleted, which is the "no dead body" half.**
`RecordDetail` stated `variant="line"` so a record would not inherit the folder
default; there is no folder default, so the line is gone. So are the two
`verify/` harnesses' folder halves — `verify/tabs-hover/` keeps the line
question it was built to answer, `verify/folder/` and `verify/kit-bc/` now show
the lip crop in its one real consumer.

**Ruling E is superseded, and the rule it stated is rewritten rather than
deleted.** `SHELL.md`'s "TWO TAB SHAPES, NEVER MIXED, NEVER A THIRD ROW" is now
"ONE TAB SHAPE, AND THE FOLDER IS THE BREADCRUMB", with the strip's geometry,
its two papers and the fold stated there; `GAPS-RULINGS.md` R-2 carries a
superseded banner naming every line of its own "what was done" that v1.2.28
undoes. CH27.13 is vindicated twice over; CH24.3's folder tabs on a record are
twice stale; CH27.1's "figures, folder tabs, then the collection panel" is
stale by one word and its ORDER is not.

### Fixed — `DropdownMenuItem asChild` crashed the tree

Found by the breadcrumb's fold, which is a menu of links and has to be one.
The row rendered `{leadingSlotOrNull}{children}`, which is TWO children even
when the leading slot is `null` — and Radix's `asChild` routes through `Slot`,
which throws *"Expected a single React element child"* on more than one. So
`<DropdownMenuItem asChild><a … /></DropdownMenuItem>` unmounted the whole
subtree, on a prop the component inherits from Radix and never removed. A row
with no icon and no image now passes its child through alone. Written as a
ternary rather than a fragment for the same reason a fragment would not have
helped: a fragment around the pair is still a second child.


### Changed — ONE SHELL. `MainScreen` and `DetailScreen` collapse into `ScreenShell`

Client, verbatim: *"Let's completely get rid of these three variations. Let's
just do one shell, and then let's just explain that there are variations for
the title if it's main screen with no parents or not. Also, just define which
pages have a footer."*

She asked for the proposal validated rather than agreed with. **The kit already
agreed, in writing, in both files.** `detail-screen.tsx`'s own header: *"`SHELL.md`'s
table is exhaustive: a main screen and a detail screen differ in EXACTLY THREE
PLACES … THE SHELL AND THE RAIL ARE IDENTICAL TO A MAIN SCREEN'S. Neither file
draws either one: `ScreenShell` does, once, and both hand it the same rail."*
`main-screen.tsx` carried the same sentence with the names swapped, and
`SHELL.md`'s own section opened *"The shell above is identical on both."* Three
named differences on one shared shape is a shape with three slots.

**There are four, and the fourth is one nobody had counted: the FIGURE STRIP.**
`SHELL.md`'s table has six rows and none is the figures; the client's list has
four items and none is the figures. The table was not wrong — it compares what
the two screens each draw in a shared region, and a record has no strip *and
nothing in its place*, so there was no cell to fill. That is an absence, not a
difference, and `record-chrome.tsx` had already made the identical argument
about the stage progression. It is a slot now, and it is still DATA rather than
a node, for `main-screen.tsx`'s own reason: `SHELL.md` says the strip lies BARE
on the body pane, and a route handed a slot would have to remember
`surface="bare"` forty times.

**THE FOUR SLOTS.**

| slot | a top-level collection | a record |
|---|---|---|
| title step | the door's own — h2 system, h3 portal | one rung down — h3 / h4 |
| identity | — | `recordNumber` · `collectionLabel` · `chips`, **under** the title |
| figures | the bare strip, first in the body | — |
| footer | none | declared, and last in the body |

**THE TITLE'S STEP IS DERIVED AND NO CALL SITE CAN NAME ONE.** The breadcrumb
decides it: a one-tab trail is a top-level location. `ScreenShell` is told the
trail's LENGTH — `breadcrumbDepth`, the same array the caller hands its
breadcrumb strip, default 1 — and owns the mapping from a length to a step.
`SHAPE_HEADING_SIZE` is imported unchanged for the root case, so the door's
step is still the one number `ScreenRenderer`, `CollectionFrame` and
`RecordChrome` all read; the only new typography in the file is one rung DOWN,
and it is a relation rather than a size, which is how it can be written at all
in a folder whose law is that no file in it writes a type step. The depth rule
is "root or not", never one rung per crumb: `Title`'s ladder has three rungs
and calm's nested step lands on the last of them, so a five-deep trail and a
two-deep trail take the same step. **Measured**, at the product's own 15px root
(ruling 18, not ruling 28's 16px authoring reference): depth 1 → `h2`, **30px**,
tracking -0.6px; depth 2 → `h3`, **22.5px**, tracking -0.315px; no breadcrumb
at all → `h2`, **30px**, because a screen with no trail has no parent.

**WHY THE SHELL IS TOLD RATHER THAN LOOKING.** The `breadcrumb` slot stays a
plain node — another agent's `BreadcrumbFolders` is what goes in it, and this
change imports nothing from it. The shell will not inspect that node: its own
rule, written before this change, is that *"a shell that inspected its children
to police them would be guessing at element types across a `React.Fragment` and
would be wrong the first time somebody wrapped their trail in a provider."*
Counting `<li>`s in CSS is the same guess wearing a selector, and could not
reach `Title`'s `size` prop anyway without the shell writing a type step by
hand. So the caller states a fact about navigation, which is the caller's, and
the shell owns the typography, which is not.

**THE IDENTITY ROW KEEPS OVERRIDE 73 AND ENFORCES MORE OF IT THAN BEFORE.**
The black ID chip first, then the collection chip, then the rest, on the line
directly under the title — and the shell wraps the first two in
`Badge variant="inverse"` and `Badge` itself rather than taking finished nodes,
because *"the black chip is always the ID. we always use black chips for IDs"*
is a rule and a slot would have made it a request. Measured on the record case:
first chip fill **rgb(26, 25, 24)**, chip row top **11.25px** below the title's
box (`--space-3` at the 15px root), `identityBelowTitle: true`.

**ONE OF `detail-screen.tsx`'s CLAIMS WAS STALE AND IS CORRECTED, NOT CARRIED.**
It said "the header band is left EMPTY" and that `RecordChrome` carries the
title. That was override 73 read through August's shell, whose band sat under a
breadcrumb-and-eyebrow bar — the bar the client told us to remove. There is no
such bar: the trail left the band entirely on 2026-09-02 and lives on the
GROUND as folder tabs. So a record's title and chips are in the BAND now, and
override 73 is satisfied more literally than it was — *"the chips are directly
underneath the title"*, *"the edit button should be aligned with the title"*,
and no second bar anywhere. `RecordChrome` is no longer handed `title`,
`recordNumber`, `collectionLabel`, `chips`, `tags`, `meta` or `actions`; it
keeps the banner, the stages, the sub-view tabs, the panel and the audit
footer, and `RecordDetail`'s own `Title` renders `null`, which is that
component's documented empty state.

**THE MANGO IS ONE MECHANISM, NOT TWO.** `SHELL.md`'s third difference was "the
`+` on a main screen, `Edit` on a detail screen". Both are *the screen's one
mango*, both stand at the inline end of the title's row, both drop below the
narrow breakpoint. `onCreate` draws the glyph (26.01: "create is always the
glyph, never the word"); `onEdit` draws the pencil AND the word (26.01's one
stated exception). Passing both is two mangos, which ruling 26 forbids, so the
shell keeps the create, drops the edit and warns in development — an
enforcement neither template had. The four-reason argument that the header's
`+` stays mango on the mango spine moved into `screen-shell.tsx` unabridged,
including the one question it leaves open for the client.

**THE FOOTER IS DECLARED.** `footer`, `footerVisible`, `narrowFooter`; last in
the card's body, in normal flow, inside the same scroller as `children` —
`SHELL.md`'s "in normal flow, once per record", drawn rather than asserted.
**This is a real loss of enforcement and it is recorded as one:** "no footer
slot on this shape" was how `MainScreen` made `SHELL.md`'s *"appears on zero
main screens"* impossible to break, and with one shell a collection can reach
the slot. The client asked for a declaration; a declaration you can make is one
you can make wrongly. `SHELL.md` now says so at the footer section.

### Changed — the card's top-left corner is square

Client, choosing between the options put to her: *"I choose option 1 to square
it."* The breadcrumb strip attaches to the card's leading edge and its leading
tab is square on its own top-left, so the tab and the card read as one
silhouette.

**NO FIFTH RADIUS IS INVENTED.** Kit ruling 03 flattens the whole ladder onto
`--radius` (24) and `rounded-pill` (999), and `docs/RULES.md` calls a fifth
radius invented for one component a rejection. The card takes `--radius` on all
four corners and then REMOVES one: `rounded-ss-none` is zero, and zero is the
absence of a radius rather than a new one. Written as a removal after the
radius, in that order, so the file reads as "the system's one box radius, minus
one corner". `rounded-ss`, not `rounded-tl` — start-start, so the corner mirrors
with the trail in RTL for free. **Measured**: start-start **0px**, the other
three **22.5px** each (`--radius` at the 15px root), on all three harness cases.

**TWO SQUARES, TWO OBJECTS, NOT ONE DRAWN TWICE.** `BreadcrumbFolders` fills its
leading tab's arc in with a `--folder-radius-lip` patch, because the folder
silhouette's corner is a fixed path it may not edit. The shell removes the
CARD's corner, which is a CSS radius it owns. Different elements, different
mechanisms, one joint; neither file draws the other's.

**THE JOINT'S GEOMETRY IS THE SHELL'S HALF AND IT WAS WRONG.** The breadcrumb
wrapper paid `pb-[var(--space-3)]`, which was right for a line of trail text
floating above the card and is wrong for a strip that attaches: the strip
carries its own `margin-block-end: calc(var(--folder-tab-overlap) * -1)`, and
any padding here is subtracted from it — 12 against 15.96 would have left 3.96
of the approved overlap. It is zero now. The wrapper also declares no
`z-index`, no `isolate`, no `transform`, `opacity` or `filter`, so the strip's
`z-[1]` / `z-[3]` resolve against the SCREEN's `isolate` around the card's new
`z-[2]` — which is the contract `breadcrumb-folders.tsx` states in its own
words (*"kept so a caller that draws its card at `z-[2]` gets ch14's 'clipped by
the card edge' for the rest tabs and an attached live tab"*). This shell is that
caller and now says so.

### Added — `verify/one-shell/`

Vite + React, port 5251, kept. Five cases: a top-level collection (one
breadcrumb tab, big title, figures, no footer), a record (two tabs, the smaller
title, identity chips under the title, a footer), a shell passing NONE of the
optional slots, and then the same collection and the same record again through
the two deprecated adapters — because "the adapters still produce the same
screen" is a claim no type-check can hold. Screenshots are useless — the
Browser pane renders it at roughly 42 × 46 px whatever is asked — so the page
measures itself with
`getComputedStyle`, `getBoundingClientRect` and `elementFromPoint` once
`document.fonts.ready` resolves, and prints the readings as text. It gates on
the fonts rather than on a frame deliberately: a hidden or throttled pane never
services `requestAnimationFrame`, so a probe written against one prints
"measuring…" forever in exactly the pane it runs in.

The breadcrumb is a **stand-in and deliberately not `BreadcrumbFolders`** — the
slot takes a plain node and the harness must not turn that into an import. It
reproduces only the three things the real strip does to the joint: the negative
`--folder-tab-overlap` margin, the `z-[1]` / `z-[3]` pair, and a squared leading
corner.

**Read off the live cascade at 1440 × 900, light, root 15px:**

| | A collection | B record | C bare | D `MainScreen` | E `DetailScreen` |
|---|---|---|---|---|---|
| `data-title-step` | `h2` | `h3` | `h2` | `h2` | `h3` |
| title font-size | 30px | 22.5px | 30px | 30px | 22.5px |
| title tracking | -0.6px | -0.315px | -0.6px | -0.6px | -0.315px |
| card radius start-start | **0px** | **0px** | **0px** | **0px** | **0px** |
| card radius, other three | 22.5px | 22.5px | 22.5px | 22.5px | 22.5px |
| card `z-index` | 2 | 2 | 2 | 2 | 2 |
| breadcrumb slot `padding-bottom` | 0px | 0px | — | 0px | 0px |
| breadcrumb slot `z-index` / `isolation` | auto / auto | auto / auto | — | auto / auto | auto / auto |
| trail overlap onto the card | 15.95px | 15.95px | — | 15.95px | 15.95px |
| lead tab's leading edge vs the card's | 0px | 0px | — | 0px | 0px |
| hit 4px inside the card, under the live tab | tab | tab | — | tab | tab |
| hit 4px inside the card, under a rest tab | — | **card** | — | — | **card** |
| identity row present | false | true | false | false | true |
| first chip's fill | — | `rgb(26, 25, 24)` | — | — | `rgb(26, 25, 24)` |
| identity top − title bottom | — | **+11.25px** | — | — | **+11.25px** |
| shell `footer` slot drawn | — | ✓ | — | — | — |
| `RecordDetail`'s own footer drawn | — | — | — | — | ✓ |
| figures / body stack | ✓ / ✓ | — / ✓ | — / — | ✓ / ✓ | — / — |

**D matches A and E matches B on every design number**, which is the adapters
proven rather than assumed. Their only two divergences are both correct and
both expected: `DetailScreen` routes the record's footer through
`RecordChrome` → `RecordDetail` rather than through the shell's slot (same
region, same normal flow, one footer), and it therefore has one thing in the
body and gets `children` alone rather than the stack.

`--folder-tab-overlap` is `1.06375rem` = **15.96px at the product's 15px root**
(17.02 at ruling 28's 16px authoring reference, which is the number the token's
own comment states). The measured overlap of **15.95** is that value, so the
strip lands exactly where it means to. The two hit tests are ch14's "clipped by
the card edge" proven rather than reasoned about, and they **scroll the card
into view first** — `elementFromPoint` is defined in viewport coordinates and
returns `null` outside them, so a case below the fold answers "nothing is here",
and a probe that read that as "the card won" printed a passing number for a test
that never ran. It did, on the first run, for both adapter cases. The bare case
reports no body stack, which is the shell drawing `children` alone in the padded
body — byte-for-byte the markup it drew before the collapse.

### Deprecated — `MainScreen` and `DetailScreen`

Both survive, both keep their prop types, and **neither holds any design**. Each
is a mapping from old prop names onto `ScreenShell`'s slots plus the one
composition below the band that was never the shell's — `CollectionFrame` for a
collection, `RecordChrome` for a record. Every ruling their headers carried was
MOVED into `screen-shell.tsx`, unabridged, into a section named after it; their
headers now carry a list of where each one went and nothing else.

**The client said *"I don't want any dead body around"* about the folder tab
variant and the same instinct applies — to the design, which is gone.** There is
exactly one place a screen's shape is decided. What kept the two names alive is
this file's own existing argument for `Rail.collapsible`: *"the kit is vendored
into two applications this repo cannot see and removing a prop is a build break
for a change that is purely visual."* Nineteen call sites in this repo import
one of the two names, several of them in files under concurrent edit today.
**Deleting them is owed**: one line each in `compositions/templates/index.ts`
plus nineteen mechanical call-site rewrites.

**Migration, for a caller of either.** No prop was removed or renamed, so
nothing breaks. Two things about the RENDER moved:

- `MainScreen` — the figure strip is placed by the shell rather than by
  `CollectionFrame`: same place on the screen, one level up in the markup, and
  the gap between it and the panel is the shell's `--space-6` / `--space-5`
  instead of the frame's. `tabsVariant="folder"` is gone with the folder tab
  variant the client retired the same day, so this file no longer passes it —
  which is also the one `tsc` error that stood in the tree before this change.
- `DetailScreen` — the record's title, identity chips, tags, meta and actions
  move from the body pane into the header band. `RecordChrome` keeps the
  banner, stages, tabs, panel and audit footer.

A screen written today composes `ScreenShell` directly:
`<ScreenShell breadcrumb={…} breadcrumbDepth={2} title={…} recordNumber={…}
onEdit={…} footer={…}>`.

**`ScreenShell.header` is deprecated too** and still works: passing it replaces
the built band entirely, so there is one band either way and never two. Exactly
two call sites still hand the shell a finished band —
`demo/shapes/templates-0.tsx`'s catalogue specimen and `verify/shell-chat/`'s
harness — and both are another session's files today. Each is a small,
mechanical move to `title` / `eyebrow` / `actions` / `meta`, and it is owed.

**NOT DONE, AND NAMED RATHER THAN LEFT TO BE FOUND.**

- `SHELL.md`'s "THE TWO SCREENS" section is rewritten here as "ONE SCREEN, AND
  FOUR SLOTS", editing around another agent's concurrent rewrite of its
  tab-shape section rather than over it.
- The nineteen `MainScreen` / `DetailScreen` call sites, the two `header` call
  sites and the deletion of the two exports are all owed; none was attempted,
  because each meant editing a file this pass did not own.
- **`compositions/templates/record-route.tsx` composes `ScreenShell` and
  `RecordChrome` directly with an empty band** — override 73's own fix, made
  before the collapse existed — so the live record route still draws its title
  and chips in the BODY while `DetailScreen` now draws them in the BAND. Two
  spellings of a record, which is precisely what this change exists to remove.
  It is one mechanical move (`title`, `recordNumber`, `collectionLabel`,
  `chips`, `tags`, `meta`, `actions` up to the shell) and it was not made
  because that file is under concurrent edit today.

## v1.2.27 — 2026-09-02

**Three gaps the app was working around, closed in the kit.** All three were
approved on staging tonight and all three shipped there as app-side
workarounds; the standing rule is that an approved fix goes back to the kit
before anything else moves, so the app can now delete them. Verified in
`verify/toolbar-writeback/` — a measuring harness, not a picture: every figure
below is `getComputedStyle` / `getBoundingClientRect` read off the live
document in both palettes.

### Fixed — the "+ filter" pill was still not `SelectTrigger`'s box. Four measures, not one

Client, verbatim, on the pills v1.2.20 had already been through once: *"the
filter button-pill it's still differnet than the other 2. fix and uniform
it"*. v1.2.20 moved four properties onto `CHIP_ADD` — `--control-height-button`
(40), `--btn-secondary-fill`, `--btn-secondary-label`, `--btn-secondary-hover`
— and stopped there. Measured off this repository's own source, four were
left, and they are why the three pills still did not read as one family:

| | `CHIP_ADD` before | `SelectTrigger` |
|---|---|---|
| inline padding | 12 (`px-3`) | **18** (`--space-4h`) |
| type step | 12 (`--text-badge`) | **14** (`--text-sm`) |
| leading | 1 (`leading-none`) | **1.45** (`--text-sm`'s own) |
| weight | inherited (300 / 400) | **500** (`--font-weight-medium`, `ViewSwitch`'s override) |

`CHIP_ADD` now takes `px-[var(--space-4h)]`, `text-sm` and
`font-[var(--font-weight-medium)]`. `leading-none` is REMOVED rather than
restated as 1.45: `text-sm` already carries `--text-sm--line-height`, and the
`leading-none` on top of it was the whole reason this pill's string was set
solid where the other two were not.

Measured on the real toolbar ground (`collectionPanelVariants`' soft paper with
`--btn-secondary-fill` re-resolved to off-beige), Filter / Sort / View, at the
harness's 15px root:

```
height             MATCH 37.5px      (2.5rem)
padding-inline     MATCH 16.875px    (1.125rem)   was 11.25px on Filter
font-size          MATCH 13.125px    (0.875rem)   was 11.25px
line-height        MATCH 19.0312px   (×1.45)      was 11.25px
font-weight        MATCH 500                      was 400
background         MATCH  light rgb(255,254,249) · dark rgb(38,36,31)
radius             999 on all three (Sort is a fused pair: each half flat on
                   the joined edge, the silhouette 999 999 999 999)
```

**`filterChipVariants` deliberately did NOT move.** A removable facet chip, and
the "Clear filters" control that shares its drawing, stay at `--text-badge` on
`px-3` — measured 11.25px / 400. Those are CH11's `.kw-chip`, drawn at badge
type in the fragment `filter-bar.tsx` cites, and the ruling names "the filter
button-pill" against "the other 2", which is the add slot against `SortControl`
and `ViewSwitch`. A chip is not one of the other 2. The consequence — a bar
drawing both chips and the add slot now carries two type steps in one row — is
logged on the register rather than hidden, with the client question it needs.

### Added — `CompactFacet`, the short facet that is also searchable

`FilterBar` shipped two facets and neither is short: `SearchableFacet` is
always expanded (heading, search pill, every option as a checkbox row) and
`RangeFacet` is two numeric fields. A toolbar or a filter panel that wants ONE
FIELD reading "Any client" had nothing to reach for, so the consuming app
composed one out of the kit's `Select` — and `FacetLabel` was private to this
file, so its two classes were written out again over there.

**The cost was a feature, and it was measured.** A `Select` scrolls and takes
typeahead; it does not SEARCH. The app's Waves screen filters 131 clients, and
the day that facet became a compact select those 131 became a plain scroll —
the one thing `SearchableFacet`'s search pill exists to prevent. Neither facet
could be short AND searchable, so the app had to choose, and choosing short
dropped the search.

`CompactFacet` is a trigger over the same filtered list `SearchableFacet`
draws. `searchable` defaults to **false** — a facet over eight words does not
need a search field. It reuses rather than redraws: `selectTriggerVariants` for
the closed field (literally the recipe the sort and view pills are drawn
through), `FacetRegister` for busy / empty / failed, and — new in this version
— `FACET_OPTION_ROW` and `FacetSearch`, two shared pieces `SearchableFacet` was
rewired onto in the same pass, so the two facets cannot draw two different
lists. The panel is `PopoverContent` sized by `selectContentClasses`' own rule:
never narrower than the field, free to grow to its longest option, capped by
the width Radix measured.

`FacetLabel` is now **exported**, and the export is the point: it was the
private constant a consuming app had to copy.

One value or none, not a set — `SearchableFacet` stays the multi-select
drawing. A compact facet shows its value in its trigger, and a trigger holding
a set has to summarise it ("3 selected"), which is a wording the kit has not
been given. Logged, not guessed. It is also not a `combobox`: the trigger is a
disclosure button over a `listbox`, because the text input inside is a search
over the options and not the value, and announcing the two as one control would
tell a screen-reader reader that typing sets the facet.

Measured, light and dark: closed field 41.25px tall (`--control-height-input`)
at 16.875px inline padding, 13.125px / 300 — CH09's field step, NOT the toolbar
pills' 500, because a facet is a field and lives in the panel the Filter pill
opens. `size="dense"` gives 30px for a column of facets inside that panel. The
open panel measures exactly the trigger's width (195px against a 195px field),
`--space-2h` inset, 22.5px radius, the overlay shadow; the searchable one draws
the 30px search pill and 132 rows (131 clients plus the "Any client" row) in a
210px list that scrolls; the plain one draws no search pill and 3 rows. The two
closed facets put no panel in the document at all.

### Added — `CollectionFrame` grows a `toolbarPanel` slot, between the toolbar and the rows

Client, verbatim: *"the expanded toolbar shoudl not be an overlay, but literaly
expand the space"*. A filter panel opened off the toolbar's own pill has to
push the rows down. This frame owns every line of markup between its toolbar
and its body, so there was nowhere in flow for such a panel to land: the app
wrapped the whole frame in a context provider, published a DOM node as the
first child of the body and `createPortal`'d the panel into it — roughly 90
lines of shipped app code to reach a position the component can simply offer.

`toolbarPanel` is that position. A placement and not a drawing, exactly as
`band` and `period` are, drawn only when a node is passed. This is the SECOND
use of override 28's precedent (2026-08-23, "the contract can grow a slot"),
and the header says so rather than leaving a reader to wonder: the region order
inside the panel is now **band → toolbar → toolbar panel → rows → pager**.

Measured, two identical frames side by side, one with the slot filled:

```
slot position           static          (an overlay would be absolute)
slot between toolbar
  and body               true           and a sibling of the body
panel column row-gap    18.75px
toolbar → body, shut    18.75px         the gap alone
toolbar → body, open   157.50px
body pushed down by    138.75px         = 120 slot height + 18.75 gap
```

**And the `filters` wrapper keeps no `position`, which is the answer rather
than an omission.** The question came in as "anything a host puts in `filters`
has nothing to anchor against". It does not need one: the ruling above is that
a toolbar control's panel expands the space, so its place is `toolbarPanel`, in
flow — and adding `relative` there would publish the anchor for exactly the
shape the ruling refuses, in the one file a call site cannot edit. Everything
that legitimately floats off a control in this system is Radix-portalled and
positions itself against its own trigger; a positioned ancestor is not what any
of them read. The wrapper stays, though, because it earns its three utilities:
`gap-2` is what holds a multi-control `filters` slot at the chip measure rather
than the toolbar's `gap-3`, `flex-wrap` is what lets a long facet row break
instead of pushing the view switch off the line, and `min-w-0` is what lets it
shrink at all. Measured `position: static` on the live frame.

### What the consuming app can now delete

`shared/web/screen-engine/filter-bar.tsx`'s `FILTER_PILL_MATCHES_THE_OTHER_TWO`
override (four classes on the adapter's wrapper), its `SelectFacet` and the
`ANY_VALUE` sentinel under it, its hand-copied `FacetLabel` classes, and the
`FilterPanelProvider` / `FilterPanelOutlet` / `createPortal` machinery that
existed only to reach a position `toolbarPanel` now names. Its rot-check —
`web/test/filter-row-is-the-kits.test.tsx`, "THE FILTER PILL'S BOX IS THE SORT
AND VIEW PILLS' BOX" — is designed to go red on this version and will: it
asserts `CHIP_ADD` does NOT contain the three classes it now contains.

### Not delivered, logged on the register

Three entries added to `manifest.json` → `notDelivered`: the mixed type steps
in a chip row (needs a client ruling), a multi-select compact facet (needs a
summary wording the kit has not been given), and arrow-key navigation inside a
facet's option list (a behaviour change to a shipped component, and its own
change rather than a rider on a write-back).

## v1.2.26 — 2026-09-02

**The client cut the three sidebar spines to two: MANGO and QUIET.** `ink` and
`paper` cease to exist as spines. Mango is untouched, down to the byte. Quiet's
two grounds are her own, chosen off rendered screenshots — light `#F7F2EB`,
dark `#1C1B18` — and they are the first and third of today's three spine
fills, one taken from paper-in-light and one from ink-in-dark.

**Those two values cost no new hex, because they already had a name.** They are
`--surface-panel` in each palette exactly. So the quiet spine is not a new pair
of colours: it is the system's own **panel → raised** elevation step, worn by
the rail. `--spine-fill` is `--surface-panel`, the chip one rung off it is
`--surface-raised`, and the floating content card beside the rail is
`--surface-raised` too.

### Why she cut to two — the number, measured

The old paper spine's dark fill was `--kw-unlit-raised` `#26241F`, which is
also what `--card` resolves to in dark. A content card floating on that rail
measured **1.000** against it: no edge at all, in the one place the shell has
nothing but a shadow to fall back on. `screen-shell.tsx` had already routed
this as a token fact rather than a layout one. Quiet takes the ink spine's dark
ground instead, and the step comes back — **measured live in `verify/spines/`,
ground versus card on all three grounds the system now has:**

| ground | rail | card | ground vs card |
|---|---|---|---|
| quiet · light | `#F7F2EB` | `#FFFEF9` | **1.103** |
| quiet · dark | `#1C1B18` | `#26241F` | **1.111** |
| mango · light | `#FED069` | `#FFFEF9` | **1.440** |
| mango · dark | `#FED069` | `#26241F` | **10.661** |
| *(was)* paper · dark | `#26241F` | `#26241F` | *1.000* |

Quiet's step is the same size in both palettes, which the three-spine
arrangement never managed: paper stepped 1.103 in light and 1.000 in dark.

### Removed — four flip-halves, and a fifth renamed

§4 carried six "halves that flip" for the spines. Four had no consumer once
their spine went, and `grep` over the kit is what proved it — each was read by
exactly one `[data-spine=…]` block and nothing else:

| token | only consumer | outcome |
|---|---|---|
| `--spine-ink-fill` | `[data-spine="ink"]`, and `settings.tsx`'s picture *of* the ink spine | removed |
| `--spine-ink-quiet-label` | `[data-spine="ink"]` (twice) | removed |
| `--spine-ink-member-fill` | `[data-spine="ink"]` | removed |
| `--spine-paper-fill` | `[data-spine="paper"]` | removed → `var(--surface-panel)` |
| `--spine-paper-chip` | `[data-spine="paper"]` | removed → `var(--surface-raised)` |
| `--spine-paper-member-fill` | `[data-spine="paper"]` | **renamed** `--spine-quiet-member-fill` |

`--spine-paper-chip` only ever meant *"the paper one rung off the spine"* —
27.1 draws a `var(--card)` chip on a `var(--sheet)` rail. Once the rail **is**
the panel, one rung off it is the raised paper by definition, in both palettes,
with no half to state. Light is byte-identical at `#FFFEF9`; dark moves
`#2F2D28` → `#26241F` because the ground moved `#26241F` → `#1C1B18` underneath
it. The step against the rail is 1.127 before, **1.111** after.

**One half survives, and it is the one the client's own ruling forces.** The
member-chip ruling of 2026-09-02 — *the chip at the rail's foot is BLACK
whenever the app is in dark mode (any spine) or whenever the spine is mango
(either palette)* — bites in one palette only, so quiet needs a light value
(`--surface-raised`, `#FFFEF9`, today's chip) and a dark one (`--kw-charcoal`).
Mango still needs no dark half. `--spine-quiet-member-fill` resolves to exactly
what `--spine-paper-member-fill` resolved to: `#FFFEF9` / `#1A1918`.

### Changed — bare `:root` keeps the quiet values, for two better reasons

`:root` and `[data-spine="quiet"]` share a block, as `:root` and
`[data-spine="paper"]` used to. The old reason was thin — paper happened to be
first. Two hold it now, and neither is *"mango is the default"*, which is a
settings default (override 56) and not a stylesheet fallback:

- **Quiet is the only spine statable in the absence of a ground.** Every value
  in the block resolves through `--surface-panel`, `--foreground` and `--hair`,
  so on bare `:root` it is simply *"the rail is a panel"*, correct in either
  palette with nothing stamped. Mango's block is palette-independent literals
  chosen *for* a mango ground; on bare `:root` it would paint every unshelled
  rail brand yellow and rebind `--btn-secondary-fill` to off-beige inside it.
- **It is the safe landing for a stale value.** An account whose stored spine is
  still `"ink"` or `"paper"` matches no block, inherits `:root`, and paints
  **quiet** rather than nothing. Verified in `verify/spines/`: a specimen
  stamped `data-spine="paper"` reads back all thirteen names identical to
  quiet's. There is no transitional alias anywhere in the file and no token is
  left defined for a spine that no longer exists — the cascade does the job.

### Changed — Settings and onboarding, and a picture that cannot drift

`SpinePicture` **stamps `data-spine` and reads `--spine-fill`** instead of
switching on a name and reaching for a token per spine. The old version had to
be edited in three places to follow this ruling, and two of the tokens it named
no longer exist. Stamping the attribute the real screen stamps makes the
picture resolve through tokens.css §7b itself — the same cascade the real rail
paints from — so it is correct by construction, and a future spine needs no
change there at all.

**The captions are new, and they are no longer 26.05's.** The old three
described fills — *"Charcoal spine, mango active row."*, *"Soft-paper spine,
the quiet one."* — which worked when the reader was choosing between three
colours and the caption told her which. With two options named Mango and Quiet,
the name carries the colour and the caption has nothing left to add by
repeating it, so these say what the choice is like to live with:

| | Settings | Onboarding |
|---|---|---|
| **Mango** | Warm colour down the sidebar. Easy to find your place. | Warm, and easy to find. |
| **Quiet** | A calm sidebar that lets the work stand out. | Calm, and out of the way. |

The field's help line goes with them: *"Two looks for the sidebar. The rest of
the app does not change."*

### Every name in the quiet block, both palettes

| token | light | dark | why |
|---|---|---|---|
| `--spine-fill` | `#F7F2EB` | `#1C1B18` | `--surface-panel`. The client's two chosen grounds, and one token states both. |
| `--spine-ink` | `#1A1918` | `#FFFEF9` | `--foreground`. 15.763 / 17.056 on the rail. |
| `--spine-ink-quiet` | `#5F5D59` | `#BDB9B1` | `--muted-foreground`. 5.899 / 8.807. |
| `--spine-ink-disabled` | `#A8A59F` | `#76746F` | `--btn-disabled-label`. 2.206 / 3.689 — exempt from contrast, but a real step under the quiet tier in both. |
| `--spine-active-fill` | `#FED069` | `#FED069` | The caption law: the active row is mango on this spine. |
| `--spine-active-ink` | `#1A1918` | `#1A1918` | `--ink-on-accent`. 12.072 on the row, both. |
| `--spine-active-hover` | `#F4BE4B` | `#F4BE4B` | `--btn-primary-hover`, declared in light only, so it does not flip — which is what a mango row under a charcoal label needs. 10.294 both. |
| `--spine-chip-fill` | `#FFFEF9` | `#26241F` | `--surface-raised`, one rung off the rail: 1.103 / 1.111. |
| `--spine-mark-fill` | `#1A1918` | `#FFFEF9` | `--surface-inverse`. 15.763 / 17.056 against the rail. |
| `--spine-mark-ink` | `#FFFEF9` | `#1A1918` | `--ink-on-inverse`. 17.386 on the plate, both. |
| `--spine-member-fill` | `#FFFEF9` | `#1A1918` | `--spine-quiet-member-fill` — the client's black-in-dark chip. |
| `--spine-member-ink` | `#1A1918` | `#FFFEF9` | `--spine-ink`, already correct on both fills: 17.386 either way. |
| `--spine-hair` | `rgba(26,25,24,.08)` | `rgba(255,254,249,.12)` | `--hair`, unchanged and needing no inverse half: the quiet spine **is** `--surface-panel`, the ground everything else that reads `--hair` stands on. 1.172 / 1.430 composited. |

### Logged, not fixed

- **The black member chip on the quiet rail in dark measures 1.019** — the
  chip's shape all but disappears and only its label carries (17.386). Not new
  and not a consequence of this cut: `#1C1B18` was the ink spine's dark ground,
  the chip was black on it under the same 2026-09-02 member ruling, and 1.019
  is what the client was looking at when she chose this ground. On the old
  paper spine's `#26241F` it measured 1.132.
- **A blocked row and a quiet row rest at the same ink on the mango spine.**
  Unchanged; the other half of that note left with the ink spine, because quiet
  keeps `--btn-disabled-label` and keeps its two tiers apart in both palettes.

### Verify

`verify/spines/` — Vite + React, one palette per load (`?t=dark`), four
specimens: quiet, mango, bare `:root`, and a stale `data-spine="paper"`. Each
draws a rail from `var(--spine-*)` and a content card at `--surface-raised` on
the same ground. Every figure above is read back with `getComputedStyle` from
the real cascade and the ratio computed in the page from those values;
`window.__spines` carries the whole table. **Nothing here is verified by
looking** — the Browser pane renders the harness at roughly 42×46px whatever is
done to it. The rails are drawn in the harness rather than imported, because
`rail.tsx` and `screen-shell.tsx` were being rewritten while it was written and
their `spine` prop type still spells the old three values.

### Changed — `ScreenShell` is the chat shape: the ground is the spine, and only the content floats

Client-approved, same day. Until today the rail sat in a **filled column**
inside an off-beige screen card and `--spine-fill` painted that column alone.
It now paints the **whole window**, and the content is the one thing on it with
a radius and an elevation.

- `--spine-fill` and `--spine-ink` move **out of `RAIL_COLUMN` and onto the
  PAGE and the SCREEN**. The rail column's class list drops from five classes
  to one (`p-[var(--rail-inset)]`); measured live, its own `background-color`
  goes `rgb(247,242,235)` → `rgba(0,0,0,0)`. **Not one class in `rail.tsx`
  changed for this**, because the rail never named a colour — what it reads
  (`--spine-ink`, `--spine-chip-fill`, `--spine-active-*`) simply arrives from
  a higher ancestor.
- The two chip rebindings (`--btn-secondary-fill` / `--pill-fill` →
  `--spine-chip-fill`) move up with the fill, so anything standing on the
  ground — the member chip, a control in the aside, the breadcrumb — resolves
  the same way the rail's own contents already did.
- **The content becomes a floating card**: `--surface-raised`,
  `rounded-[var(--radius)]`, `shadow-[var(--shadow-lifted)]`. The header band
  and the body live inside it and the two page-side rebindings
  (`--btn-secondary-fill` / `--pill-fill` → `--surface-panel`, ruling 01) move
  down onto it with the off-beige, so a call site sees the identical value it
  saw before.
- **The shadow is named, not aliased.** `--shadow-lg` is the same value; the
  alias reads as a rung on a size ladder and this is not a size. Measured
  ground-to-card: **quiet 1.103 light / 1.111 dark, mango 1.440 / 10.661**. On
  quiet the shadow is carrying the card's edge, not agreeing with it.
- **Full viewport height, no page scroll.** `page` draws `100dvh` with
  `overflow: hidden`; three scrollers live inside it. Measured at 1440×560 with
  every scroller driven to its maximum: `document.scrollHeight` stays equal to
  `clientHeight` (560) and `window.scrollY` stays 0, while the rail's `<nav>`
  travels 602, the card's body 1126 and the aside 242 — and the breadcrumb, the
  header band, the member chip and both handles move **0.00px**. v1.2.23's
  pinned foot is preserved and the header band is now pinned the same way.

### Added — a third column (`aside`), a breadcrumb slot, and the two edge handles

- **`aside`** — the assistant's column, flat on the same ground, mirroring the
  rail. **Additive**: omit it (or pass `null`) and there is no column, no
  gutter and no handle on that side. `ASIDE_WIDTH` is exported at `23.75rem`
  (380 at ruling 28's reference), reusing ch19's stated `max-width: 380px`
  rather than coining a number; **logged as owed** — the kit states no docked
  assistant width.
- **`breadcrumb`** — a slot on the ground, above the card, aligned to its
  leading edge (measured: both at x 217.5 wide, x 22.5 narrow). It **carries
  navigation text and nothing else** — a client rule, stated at the prop, not
  enforced in code, because a shell that inspected its children to police them
  would be guessing at element types. It takes `--spine-ink` by inheritance.
- **The edge handles.** A **3 × 34px** rounded bar in a **20 × 44px** invisible
  `<button>`, hover thickening to 5 × 44 on `--duration-colour` (120ms,
  `ease-kwapso`). **Position is the whole affordance** — outer rim when open,
  the column's inner edge when shut — so the bar always stands on the side the
  column will travel toward. No chevron: three pixels will not hold one.
- **The colour is `--spine-ink` and may never be a fixed charcoal.** Measured:
  a literal `#1A1918` on quiet's dark ground `#1C1B18` is **1.019**, an
  invisible control. `--spine-ink` measures **12.072** on mango, **15.763** on
  quiet-light and **17.056** on quiet-dark.
- **The geometry is in px, and that is a deliberate departure from ruling 28's
  rem.** 44 is a WCAG 2.5.5 target-size minimum, stated in CSS pixels, and must
  not shrink to 35.75 at `data-scale="small"`; a 3px bar is a hairline, and the
  kit already writes those in px (`--focus-width: 1px`). Everything else the
  shell draws stays on the rem ladder, because all of it is measure.
- **The rail's foot toggle goes away.** `Rail.collapsible` is `@deprecated`,
  stays off and is not removed — the kit is vendored into two applications this
  repo cannot see. The rail's footer holds only the member chip again.

### Changed — `ScreenSpine` is `"quiet" | "mango"`, and `Rail` loses a branch

Fulfilling this version's own "the `spine` prop type still spells the old
three". `screen-shell.tsx` and `rail.tsx` both narrow to the two live names,
and `Rail`'s `markField` drops from three branches to one:
`spine === "mango" ? "brand" : "paper"`. The `unlit` cut is **not re-homed onto
quiet** — it existed because `ink` was the one ground that stayed dark while
the palette went light, and quiet's ground follows the palette by definition.
`demo/shapes/templates-0.tsx` and `verify/spine-colors/` drop to two spines
(the latter from a 6-cell grid to 4; it still measures a live question).
TypeScript now rejects `"ink"` / `"paper"` at a call site while the cascade
still forgives a stale stored one, which is the right way round.

### Verify — `verify/shell-chat/`

Vite + React, **one case per URL** (`?rail=`, `?aside=`, `?spine=`, `?t=`,
`?mode=`), because the shell claims `100dvh` and stacking cases down one page
would give each a height the product does not have. `window.__shellProbe()` is
installed by the page itself so it survives navigation. **Nothing is verified
by looking** — the pane renders at roughly 42×46px. Measured at 1440×900,
against the kit's own 15px root (ruling 18), so `13rem` reads 195:

| case | rail handle hit | aside handle hit | aside column | card |
|---|---|---|---|---|
| both open | **0 → 20** (window's leading rim) | **1420 → 1440** (trailing rim) | 1083.75, w 356.25 | x 217.5, w 843.75 |
| both shut | **55 → 75** (collapsed column's inner edge, 75) | **1417.5 → 1437.5** (gutter's inner side) | **absent from the DOM**; dock = 22.5, the gutter alone | x 97.5, **w 1320** |
| rail open · aside shut | 0 → 20 | 1417.5 → 1437.5 | absent | w 1200 |
| rail shut · aside open | 55 → 75 | 1420 → 1440 | 1083.75, w 356.25 | w 963.75 |

The bar is **3.00 × 34.00** and the hit area **20.00 × 44.00** in every case, on
both spines and both palettes; both are `rounded-pill`, so the global
`:focus-visible` ring lands on the 20 × 44 target and never on the bar. **The
rail's handle travels 55px** between its two states and the aside's 2.5px —
the aside's small delta is the gutter and the target being nearly the same
width, and its real signal is the column itself arriving.

**The hover step is verified from the emitted rule, not by hovering.** The pane
reports `:hover` on the element but does not recalculate hover styles — a
hand-injected `.group:hover … { height: 44px }` does not apply either — so the
harness reads `.group-hover\:h-\[44px\]:is(:where(.group):hover *) { height:
44px }` and its width twin out of the stylesheet, inside a `@media (hover:
hover)` that matches, and reads `transition-property: height, width` /
`0.12s` / `cubic-bezier(0.16, 1, 0.3, 1)` off the bar.

**The rail's rows are unchanged, and that is a diff rather than a claim.**
`verify/shell-chat/before-shell.tsx` is a frozen v1.2.25 copy of the shell,
rendered against the same `Rail`. Across **all 20 rows**, x, width, height,
y-relative-to-the-nav's-scroll-origin, `background-color`, `color`,
`font-weight`, `border-radius` and `padding-left` are **identical — zero
differences**. The column is x 0, w 195, padding 22.5 in both; the member chip
keeps its rect, its `#FFFEF9` fill and its 999 radius. The only computed
difference anywhere in the rail is the column's own `background-color`, which
is the change.

**Narrow (380 × 800): both docks are `display: none`,** both handles collapse
to zero rects and leave the accessibility tree with them, and the card keeps
the ground's gutter on all four sides (x 22.5 → 357.5) with the breadcrumb
aligned to it. **That is the answer for `aside` on a phone: it is dropped, like
the rail, and no drawer is grown** — a drawer is a hamburger by another name,
and ch19 already gives the assistant a floating, non-modal form that needs no
column.

## v1.2.25 — 2026-09-02

The client released two brand colours — lavender `#B1A3CF` and orange
`#F7953E`, her own typed values — and they close the two oldest colour gaps in
the file. Both were real defects and both were the same defect twice: a
distinction the system draws in words, drawn in one colour on screen.

`--chart-4` and `--chart-5` repeated `--chart-1` and `--chart-2`, so a
four-series chart had one duplicated pair and a five-series chart had two.
`--warning` and `--warning-foreground` resolved to `--surface-quiet` and
`--ink-secondary`, which is *exactly* what `Badge variant="secondary"` already
draws — measured live in `verify/accents/` at a contrast of **1.000 on both the
fill and the ink, in both palettes**. `DataPreviewTable` draws that pair side by
side: `unchanged` takes `secondary` and `changed` takes `warning`, and its own
header reasons the two outcomes apart at length.

Both hexes are written in `tokens.css` §2 and nowhere else. The client also
attached a brand sheet drawing near-neighbours `#BDADD5` and `#F29436`; that
difference is back with her and unresolved. Every use is a `var()` at one of the
two names, so a correction is one line per colour.

### Added — two accents, admitted against the palette's own rule

§2 states the rule at its head: *"A new accent is admitted only if it carries
charcoal type at both its light and its dark value."* Charcoal measures
**7.53:1** on lavender and **7.79:1** on orange, against AA's 4.5. Each clears
it at a single value, so neither has a second one — for scale, the four accents
already in the file carry charcoal at mango 12.07, sky 8.69, forest 4.61 and
poppy 4.59, which puts the two admitted today second and third in the palette.

**Neither is a lift, and that is measured rather than reasoned by analogy.**
Forest and poppy carry `-lift` hexes because their own values land at 4.07 and
4.05 against a dark card; `--kw-sky` carries none and is not redefined in dark
because it measures 7.68 there. Lavender and orange measure 6.65 and 6.88 — in
sky's band, not forest's. A `-lift` would have been a hex invented against a
number that already passes, and a value that does not flip between palettes is
not given a dark half.

**Neither is an ink.** As TEXT both fail on both light papers — lavender 2.31 on
off-beige and 2.09 on soft paper, orange 2.23 and 2.02 — and both pass on a dark
card at 6.65 and 6.88. Nothing writes a word in either colour.

### Fixed — `--chart-4` and `--chart-5` are colours, not repeats

`--chart-4` = `--kw-lavender`, `--chart-5` = `--kw-orange`.

**The assignment is decided by hue distance**, because this palette's series are
told apart by hue and not by lightness. As HSL angles: poppy 7.9, orange 28.2,
forest 150.3, sky 207.1, lavender 259.1. Orange sits **20.3** from poppy, by far
the tightest pair in the set — every other pair is at least 52.0 apart. So
orange goes last, where a chart only reaches it at five series:

| | series | closest pair that is actually adjacent |
|---|---|---|
| four series | sky · forest · poppy · lavender | 52.0 (sky/lavender, and they are not neighbours) |
| five series | the above, then orange | 108.8 (poppy/lavender); 5 wraps to 1 at 178.9 |

The reverse assignment stands poppy and orange side by side at 3 and 4, 20.3
apart, in **every** four-series chart in the system.

Neither takes a dark entry, for the reason above — 2 and 3 are re-pointed in
dark at their lifts, 1 is not re-pointed at all, and these two follow 1.

**An observation about the whole set, recorded and not solved.** Every mark in
this palette is a pastel or mid-tone read against paper. On a light card: sky
2.00, orange 2.23, lavender 2.31, forest 3.77, poppy 3.79; on a light panel each
drops again (1.81 / 2.02 / 2.09 / 3.42 / 3.43). The already-shipped `--kw-sky`
is the *lowest* of the five, so the two admitted today land above the bar in the
file rather than under it — this is not a new defect and not these colours'
doing. What is worth stating plainly is that the set separates on hue alone:
forest and poppy differ in luminance by a ratio of **1.00** and lavender and
orange by **1.03**, so in greyscale, in print, or to a reader with a
colour-vision deficiency each of those pairs is one mark. A series in this
system needs a direct label, a pattern or a shape as well as its colour. That is
a charting rule and not a token.

### Fixed — `--warning` is a colour again, and it is the orange

The block this replaces was written as a holding position and named its own
exit in its last line: *"The client is adding colours; when an amber or
equivalent exists, `--warning` should take it and this block goes."* It exists.

`--warning` = `--kw-orange`. `--warning-foreground` = `--ink-on-accent`, and
**that half is not cosmetic** — it is the consumer the repoint would otherwise
have broken. `--ink-secondary` is an ink tuned for paper; on the new fill it
measures **4.00 in light**, under AA, and **1.48 in dark**, which is not a label,
it is a stain. Charcoal measures 7.79 on the new fill in both palettes. Neither
token takes a dark half, because the fill has none.

**Every consumer, found and checked.** `badge.tsx`'s `variant="warning"` is the
one and only place in `components/` or `compositions/` that reads either token,
as `bg-warning text-warning-foreground`; it is fixed by the repoint and needed no
edit beyond its comment. `DataPreviewTable` reaches it indirectly, mapping
`changed` → `warning`, and gets the colour its own header always argued for.
Nothing reads `--warning-strong` at all.

**Poppy is untouched** and still means blocked and nothing else. Ruling 3B moved
warning *off* poppy; this moves it off the quiet chip it was parked on, and 3B
stands.

**`--warning-strong` did not move, and that is a measurement rather than an
omission.** It is the ink half — the warning *word*, not the fill — with zero
call sites across the kit. Orange AS TEXT measures 2.23 on off-beige and 2.02 on
soft paper, so pointing it at `--kw-orange` would ship a word nobody can read;
minting it a darkened orange the way ruling 43 gave poppy `--kw-poppy-ink` would
invent a hex the client never typed, for a consumer that does not exist. Ruling
43 moved because every destructive word in the system was failing AA; nothing is
failing here. It stays `--ink-primary` and stays the one flagged token in
`manifest.json`'s `notDelivered` for this family.

**One divergence, logged rather than settled.** `Alert variant="warning"` draws
a **mango** dot — ch20's own drawing, restored by the 2026-08-26 fidelity
re-audit under override 17 after it had once already followed this very token
down to the quiet fill. It reads `--primary`, not `--warning`, so this ruling
does not reach it. A warning *badge* is now orange and a warning *alert dot* is
still mango: two components spelling one word in two colours. That needs a
client ruling, not a repoint of a value the artifact states outright.

### Considered and declined

* **A lavender or orange status dot.** There are exactly six `--dot-*` tokens
  and exactly six dot tones in `badge.tsx`; no state is without a colour, so a
  seventh would be inventing a semantic rather than filling a gap.
* **Splitting `--dot-shipped` from `--dot-done`.** They resolve identically
  (forest, 3.77 against a light pill and 5.95 against a dark one) but that is
  ruling 04's deliberate synonym — the system says "shipped" and the portal says
  "Done" for one state — not a collapsed distinction.
* **Moving `--info` or `--dot-review` off sky.** Sky also backs `--chart-1`, but
  those are different token families and are never drawn against each other in
  one view. Nothing collapses.
* **`--pill-fill-building`'s mango dark fill.** Which accent it should be is
  `GAPS-TRACK1.md` STA-1, an open client question that predates these colours.

### Verified

`verify/accents/` (Vite + React, port 5241, kept). Screenshots are useless in
this environment — the Browser pane renders at roughly 42×46px whatever the
viewport is emulated to — so nothing on that page is checked by eye.
`window.__ACCENTS__()` reads every swatch out of `getComputedStyle` on the live
element, flips `data-theme` on `<html>`, reads again, and returns both palettes
as JSON. The page names tokens and never a hex; R32 holds inside the harness.

Read back, light / dark: `--chart-4` `#B1A3CF` / `#B1A3CF` and `--chart-5`
`#F7953E` / `#F7953E` through the real `bg-chart-*` utilities, against
`--chart-2` and `--chart-3` flipping to their lifts as they always did; the
warning badge `#F7953E` under `#1A1918` at **7.79 in both palettes**; and the
old binding beside the quiet chip, which is the defect this release closes.

That last one, stated as the numbers it actually was rather than as one
headline — the first draft of this entry said "1.00 on fill and 1.00 on ink"
and only half of that was true:

| | fill | ink |
|---|---|---|
| light | 1.21 | 1.95 |
| dark | **1.00** | 1.51 |

In DARK the two chips were the same token — `--warning` and `--secondary` both
resolved to `--kw-unlit-secondary`, so "Will change" and "Unchanged" in
`DataPreviewTable` were one chip and the label carried the whole distinction.
In LIGHT they were two pale beiges a fifth of a step apart: bad, but not the
same colour. After: **2.02** light, **5.20** dark.

`tokens.json` regenerated and diffed — `--check` runs the guards only and does
not compare output. `unresolvedFlagged` falls 21 → 13. `npm run check` green.

## v1.2.24 — 2026-09-02

Four of the five entries below existed already, as corrections written
downstream in the app's `shared/web/library-overrides.css` because a vendored,
hash-pinned `shared/ui/` could not be hand-edited. Three of those blocks each
carried the same closing sentence — "the real fix is upstream; delete this the
day a synced tag ships it" — and none of them had ever travelled. They travel
here. An override is a second place a decision lives, and that file's own
header says what a second place costs: a rule written on 30 June was still
fighting a library fix that had shipped in v0.13.0, and it tinted every card
in both apps for nine days before anyone connected the two.

### Changed — the focus ring is drawn ON the edge it answers for, not 2px beside it

`--focus-offset` is `0px`. Client, 2026-08-31, over a plain "Price sold" text
input: "when in select something you draw an overline bigger [than] the
already existing outline. do not do that. just change the color of the
existing outline. everywhere where you show the selected whatever."

The fix is geometric and not chromatic — `--focus` is already the ink this
system uses for every other "selected" mark, so the colour was never the bug.
An `outline` paints outside its border box by `outline-offset`, while a
field's own edge is an INSET shadow painted immediately inside that same box,
and `input.tsx` says outright that the hairline does not move on focus (review
1A · fix 4 stopped it moving on purpose). At 2px those were therefore two
concentric strokes with a visible gap between them: precisely "an overline
bigger than the already existing outline", never a recolour of anything. At 0
the ring lands on the box the hairline is drawn against, so a focused control
reads as its own edge changing colour and weight in place.

`--focus-width` and `--focus` do not move: still 1px, still charcoal
(off-beige on an inverse ground), still `:focus-visible` only, still §8's one
rule for every control at once. Only where it is drawn changed. This is the
SECOND override of kit ruling 24 — the width went to 1px on 2026-08-22 (B2) —
and §3 now carries both rulings in full beside the values. `docs/TOKENS.md`
and `docs/RULES.md` both stated `2px` for the width AND the offset; the width
had been wrong in the docs since 22 Aug and both rows are corrected here.

Measured in `verify/writeback/` §A, on a focused `Input`, both palettes: a
`1px solid` outline at `outline-offset: 0px` on the control's own 999px
radius, immediately outside the border box its own `0 0 0 1px inset` hairline
is drawn inside. Rebinding the token back to `2px` on the live page moved the
ring to `2px` and nothing else, which is the whole of the change.

`rail.tsx`'s scroll gutter needed no edit and got none: it is written as
`calc(var(--focus-offset) + var(--focus-width))` and states no literal, so it
narrows from 3px to 1px and still clears the ring exactly.

### Fixed — the assistant's mark rides the bubble's top, not its full height

`AgentChat`'s turn row was `flex items-end`, which bottom-aligned the mark
against the row's tallest child on every turn. A one-line reply hides this
completely — there is only one line to align against either way — which is why
it survived to be reported from an app, on a genuinely tall answer where the
mark sat level with the bubble's BOTTOM rather than beside the first line a
reader's eye starts at.

The kit already drew this the other way one component over: `chat.tsx`'s own
`Message` is `items-start` and states the ruling in its own words, "CH19 view
16 levels the 24 mark with the TOP of the bubble". `AgentChat` was the one
surface still drawing the older behaviour, so this is not a new rule — it is
the already-ruled alignment reaching the last component that had not picked it
up. The thinking turn takes the same row shape for the same reason; its own
dots are never tall enough to show the difference, which is not a reason for
two sibling rows to disagree.

The avatar's `mb-1` went with it. It was the bottom-aligned row's nudge, and
at `items-start` a cross-axis END margin moves the mark nowhere — it only
padded the row's own height on a short turn.

Measured in `verify/writeback/` §B on a 163.875px bubble: the mark's top is
now 0.000px from the bubble's top. Forcing the old `items-end` + `mb-1` back
on the live row puts it 141.125px lower, 4px clear of the bubble's bottom.
Row height is 163.875px either way — the mark moved, the layout did not.

### Fixed — the composer's ring belongs to the pill, not to the bare field inside it

Client, 2026-09-01, over the assistant's message field: "when i select the
text field, the 'select' outline is inside? should outline the full component!
but remember, this should only change the color of the outline (like in the
add/edit screens)."

`AgentChat`'s composer is a decorated pill (`bg-card`, its own radius and
padding) wrapped around a BARE `<textarea>` — `border-0`, `shadow-none`, no
fill and no radius of its own. Focus lands on the textarea, which has no
visible box, so the ring drew a plain rectangle sized to it, sitting inside
the rounded pill the reader perceives as the field.

`tokens.css` §8 has named and solved this shape since review 1A · fix 4, for
`search-input.tsx` and `filter-bar.tsx`'s facet field: the bare node hands its
ring to the shell it sits in through `:has()` and suppresses its own. This
composer was simply never marked with either attribute. It is marked now —
`data-focus-shell` on the pill, `data-focus-proxy` on the Textarea, on the
INSTANCE and not in `textarea.tsx`, because a standalone Textarea is its own
visible box and already rings correctly. No ring is written in the component;
§8 still owns the only one, and §8's own tally of who carries the pair is
updated rather than left one file short.

Measured in `verify/writeback/` §C, with the textarea focused: the pill draws
`1px solid rgb(26,25,24)` at offset 0 on its own `999px` radius across its
full 487.5 × 45 box, and the textarea's own `outline-style` is `none` — its
408.75 × 30 rectangle is no longer ringed. Typed to three lines, the ring
follows the pill into the stadium radius without a second rule, because an
outline always takes the radius of the box it is drawn on.

### Fixed — `WebEmbed`'s sandbox default was the documented escape hatch

`DEFAULT_SANDBOX` was `"allow-scripts allow-same-origin"` while the file's own
header said "THE SANDBOX IS DEFAULTED CLOSED". The header was right about the
intent and the code was the wrong half: the HTML standard says of this exact
pair that framed content served from the embedder's origin can reach its own
DOM through `window.parent`, rewrite its own `sandbox` attribute and reload
itself out of the sandbox entirely. The default permitted the one thing the
paragraph above it claimed to prevent.

The default is now `allow-scripts` and nothing else, which puts the frame in
an opaque origin — the thing that actually walls it off from this app's
cookies, storage and DOM. It costs an ordinary third-party embed nothing: a
video, a map or a form on somebody else's origin was already cross-origin and
was never reading ours.

The one legitimate need is an opt-in prop rather than a default. A first-party
embed — our own page, needing its own storage — passes `allowSameOrigin`. A
named boolean, not a hand-typed `sandbox` string, so the dangerous pair is one
greppable word at the call site instead of a token buried in a string nobody
re-reads, and the call site states the trust rather than inheriting it.

A second untrue sentence went with it: the header claimed
`sandbox={undefined}` removed the attribute entirely. It never did —
`sandbox` was a defaulted parameter, so `undefined` is exactly the value that
selects the default — and it is not wanted either. An unsandboxed frame is not
a state "defaulted closed" can have. `sandbox` is no longer defaulted in the
destructure (the default depends on `allowSameOrigin` now) and a call site's
own string still replaces everything wholesale, empty string included.

Measured in `verify/writeback/` §D, off the rendered `<iframe>`'s own
attribute: default `allow-scripts`; with `allowSameOrigin`, `allow-scripts
allow-same-origin`; with `sandbox="allow-forms"`, `allow-forms`.

`map.tsx` carries the same pair and KEEPS it, deliberately: its `src` is a
provider's embed URL by its own definition, where the pair grants the provider
its own storage and grants it nothing of ours. Its comment said "same default
as `web-embed`", which is no longer true and is rewritten — including the part
that is a judgement and not a ruling, since nothing in the type system makes
that `src` third-party. Whether it should follow is logged there, unruled: the
demo makes no network calls, so which providers actually break without
`allow-same-origin` cannot be measured in this repo.

### Fixed — the right is called `create`, and the matrix called it `add`

`PermissionMatrix` shipped `RIGHTS = ["see", "add", "edit", "delete"]` and
`WRITE_RIGHTS = ["add", "edit", "delete"]`. The client SAID "add" on
2026-08-24 and the ids were transcribed straight out of that sentence, but the
application that enforces these switches has one name for the right and it is
`create` — `shared/workers/gating.ts` types it `"read" | "create" | "edit" |
"delete"`, the sheet stores `can_create`, and the glossary's own definition of
an access right reads "read, create, edit, or delete". An id is a key two
systems match on, not a transcript.

The label follows the id rather than keeping a second word for the same
switch, which was already this file's own stated rule — "keeping a second set
of words for the same four things is how two lists drift" — and had been
broken by this id since the day it was written. The slot letters stay four
distinct initials: S · C · E · D. The demo's own permission data and section
summary move with it, and the header's three passages that spelled the order
"see · add · edit · delete" are corrected rather than left describing a build
that no longer exists.

`see` is left alone and the divergence is recorded rather than tidied away:
the enforcing name for that one is `read`, it was not asked for, and it is a
word in front of a reader where `Create` versus `Add` is not.

Measured in `verify/writeback/` §E, off the rendered grid: the slot letters
read S · C · E · D, the legend reads "See · Create · Edit · Delete", and a
slot's accessible name reads "Owner · Accounts · Create: held".

**Downstream note.** The app maps both vocabularies in one place
(`web/components/role-detail.tsx`, `RIGHT_TO_KIT` / `KIT_TO_RIGHT`). Its
`create: "add"` / `add: "create"` halves become `create: "create"` /
`create: "create"` when this tag is vendored, and `KIT_TO_RIGHT`'s type will
not compile until they do.

### Housekeeping — `tokens.json` caught up on two tokens it had never seen

Rebuilding the generated file for `--focus-offset` also picked up
`--spine-paper-member-fill` and `--spine-ink-member-fill`, which have been in
`tokens.css` since the spine work and had never reached the JSON. Nothing
flagged it, because `build-tokens.mjs --check` runs the four guards and does
not diff the emitted file against the one on disk — worth knowing, since the
same silence would hide the next one. Declared count 279 → 281.

## v1.2.23 — 2026-09-02

### Fixed — the rail's collapse toggle and member chip no longer scroll with the entries

Client, verbatim: "when i svroll down the expand/collpase button in navbar
also moved. make sure this does not happen."

`Rail` (`rail.tsx`) scoped no scroll region of its own anywhere — the file
contained no `overflow-y-auto` and no `min-h-0` before today. Its `<nav>`
carried `flex-1` and nothing else, so a rail with more entries than fit
simply grew past the bottom of its column, and the only box a consuming
application could then put `overflow-y-auto` on was the whole `<Rail>`,
foot included. That is why the collapse toggle and the member chip — real
siblings AFTER the `<nav>`, already structurally at the foot — travelled
upward with the list.

The scroll is the composition's now, and it is the `<nav>`'s: `min-h-0`
(without which `flex-1` still floors that item at its content's height and
nothing can ever overflow) plus `overflow-y-auto`. The toggle and the chip
sit outside the scroller and cannot move, in both rail states. The rail
root also gained `max-h-full` alongside its existing `min-h-full`, so the
rail is EXACTLY its column wherever the column has a height to be exact
about; against an auto-height parent 100% resolves against nothing and the
rail grows exactly as it always did.

The `<nav>` also takes a `calc(--focus-offset + --focus-width)` negative
margin and an equal padding. That is not spacing: a scroll container clips
its other axis too, and tokens.css §8 rings every control off its edge, so
a focused row against the new box's edges would have had its ring sliced.
The two cancel exactly — 212 elements across the harness's three static
cases were compared before and after, and the only computed difference in
any of them is that padding/margin pair on the `<nav>`, which paints
nothing. No row shape, no active pill, no spine colour, no chip styling, no
token moved.

`verify/rail/` gains a `scroll` case: two height-bounded columns, expanded
and collapsed, each with more entries than fit and each keeping the
application's own outer `overflow-y-auto` in place, because the fix has to
hold with that wrapper still there. Measured on it, scrollTop 0 → max: the
toggle and the chip move 0px in both states while the rows move the full
675px (expanded) / 472px (collapsed). Before the fix the same probe moved
the toggle and the chip 630px / 473px, in lockstep with the rows.

## v1.2.22 — 2026-09-02

### Changed — the rail's active row is an inset pill, not a full-bleed one

Client, after the rounding itself finally landed: "allow a bit of blank
space on the sides so it's not touching the edge." `ROW_EXPANDED` used to
cancel the rail's own ambient `--rail-inset` with a negative inline margin
to reach the column's true edge, then pay the inset back as padding so the
icon/label still landed where an idle row's already sat. Dropping the
cancel-and-respend leaves the row inside the same padding every other row
already sits in — the blank space is exactly `--rail-inset`, the value the
shell already publishes on the column, not a new number. `rounded-pill`
and the row's height are unchanged; only the outer box's own bleed is
gone. Two other passages in this file described the old full-bleed
mechanic as current and were updated to match (the geometry summary's
"FULL-BLEED" bullet, and the brand mark's own alignment comment); a third,
the historical record of the square-vs-pill reversal, is left alone since
it correctly describes what was true at the time.

## v1.2.21 — 2026-09-02

### Changed — the fused sort chip's order flipped: arrow on the left, field on the right

Client, verbatim: "on the sort by, cange the ordre: so on tge left of the
fused we have the arrow and on the right the value and dropdow." The chip's
DOM order in `SortControl` (`sort-control.tsx`) is now `[direction, field]` —
the arrow button first, the field (value + chevron) second — reversing the
order set the same day in v1.2.20's fusion.

Rounding was reasoned in logical terms throughout, not swapped by literal
side: `directionVariants` now carries `rounded-s-pill rounded-e-none` (its
outer corner is the chip's START, since it is now the first half) and
`fieldVariants`'s `fused` variant carries `rounded-e-pill rounded-s-none`
(its outer corner is now the chip's END). The file's own RTL paragraph is
rewritten to match: the direction control sits at the chip's inline start,
the field's own chevron stays at ITS inline end via `SelectTrigger`'s
`justify-between`, unaffected by the outer reorder.

Verified in `verify/sort-chip/`, extended with an explicit `dir="rtl"` row.
Read back via `getBoundingClientRect` and computed `border-radius`: in LTR
the direction control sits left of the field with `border-radius: 999px 0 0
999px` against the field's `0 999px 999px 0` (one seamless pill, rounded
outer corners only); in RTL the two swap physical sides (direction right of
field) and each one's rounded corner follows it, confirming the reorder is
driven by logical properties and not hardcoded sides. Separately confirmed,
and NOT part of this fix: `SelectTrigger`'s own corner is governed by Radix,
which stamps `dir="ltr"` on itself absent a mounted `DirectionProvider` —
`demo/App.tsx` already documents this as a pre-existing, out-of-scope
limitation (client ruling 10: the system is LTR-only). That limitation
existed identically before this reorder, just mirrored to the other corner,
and is unrelated to the swap.

### Changed — tabs now use the rail's exact idle/active font weights, not just its hover preview

Client: tabs should use "the same weights as in navbar." The rail's own
`ROW_IDLE` (`compositions/templates/rail.tsx`) states an idle row's weight
explicitly as `--font-weight-light` (300) and its active row (and an
inactive row's hover) as `--font-weight-medium` (500). Tabs
(`components/tabs/tabs.tsx`) already got the HOVER half of this right
tonight — `enabled:hover:font-[var(--font-weight-medium)]` on both
variants — but the RESTING state carried no weight class at all. A
`<button>` inherits `font: inherit` from Preflight and nothing in
`text-sm`/`text-caption` sets a weight, so an idle tab's computed weight was
the browser's default 400 — a third value the rail never draws.

`TRIGGER_SKIN.line` and `TRIGGER_SKIN.folder` both now carry
`font-[var(--font-weight-light)]` at rest, alongside the untouched hover and
active rules, so a tab's idle/hover/active sequence reads the identical
three numbers (300/500/500) the rail's nav rows do.

Verified in `verify/tabs-hover/`, extended with `data-probe` attributes and
a live computed-`font-weight` readout. Read back via
`getComputedStyle(...).fontWeight`: idle tabs read `300` and active tabs
read `500` in both `line` and `folder`, matching the rail exactly. The
hover rule was confirmed present and correctly compiled — `.enabled\:hover\
:font-\[var\(--font-weight-medium\)\]:enabled:hover { font-weight:
var(--font-weight-medium); }` — in the built stylesheet; genuine `:hover`
could not be triggered reliably through this session's browser automation,
but the compiled rule and token are identical to the one the rail already
uses and already ships.

### Investigated — `ScalePicture`'s three states drew a different AMOUNT of content, not just a different size

Client, verbatim: "the representation is worng, chnaging the size chnages
the size of the text, not how much data is show. so your display is
wrong." Confirmed: `ScalePicture` (`compositions/screens/settings.tsx`) drew
"compact" with a SECOND metadata line ("Sprint 24 · shipped"), "default"
with one, and "large" with a SHORTER one (just "Status", the "· 4 open"
dropped) — so scrubbing the setting looked like it changed how much the
app shows. `shared/scale.ts` (kwapso_system) confirms the real mechanism is
a single root font-size per step; it never adds, removes or shortens a row.

Redrawn to show the SAME content — one title, one metadata line, word for
word — at three point sizes (12/10, 14/12, 16/14), with the block's own gap
and padding stepping up alongside the type so "spacing scales too" is
visible without touching content.

Verified in `verify/scale-picture/`: reads back each step's rendered text
nodes. All three arrays are identical (`["Record title", "Status · 4
open"]`); computed `font-size`/`gap`/`padding` increase monotonically
compact → default → large.

### Fixed — the error register was missing the eyebrow and dot the client's own reference card showed

Client: "but i gave you a specific design inside a card, you took it only
partially" — about the 27 call sites in kwapso_system moved onto
`ShapeStateBody` for their load-failure state. Her reference card ("LOAD
FAILED") showed a small red dot beside an uppercase eyebrow, a bold title,
a description, and TWO buttons (Retry + a plain-text Copy) side by side.

Traced `ShapeStateBody` (`compositions/states/states.tsx`) into
`ScreenRegister` (`components/screen-renderer/screen-renderer.tsx`) and
found the eyebrow was genuinely absent — `screen-renderer.tsx`'s own SCR-4
comment already logged it: "The EYEBROW half of CH21's register is still
missing here and needs a new prop, so it is logged, not smuggled in." The
kit had already drawn it correctly once, in `form.tsx`'s own LOCAL
`Register` (chapter 21's failure eyebrow: a 7px poppy dot, `--dot-status`,
`bg-destructive`, then an uppercase micro word at weight 500) — it had
simply never reached the shared component `ShapeStateBody` renders through.
The two-button action row needed no fix: `ScreenRegister`'s `action` slot is
already a `flex flex-wrap` row, so a Retry and a secondary Copy both fit one
`action` node exactly as a single button does — the 27 call sites passing
only one plain button is a call-site choice in the other repo, not a kit
limitation, and is not this repo's to fix.

Added `eyebrow` to `ScreenRegisterProps`, transcribed straight off
`form.tsx`'s own recipe, with the poppy dot scoped to `tone="error"` only
(the other three registers get an eyebrow with no dot, matching chapter
21). Added `errorEyebrow` to `ShapeStateCopy` (default "Load failed",
matching `form.tsx`'s own default for the identical register), wired into
`ShapeStateBody`'s call to `ScreenRegister`.

Verified in `verify/state-error/`, rendering `ShapeStateBody` at
`state="error"` inside a `--surface-panel` card with a Retry + "Copy error
code" action pair. Screenshot shows the dot, the "LOAD FAILED" eyebrow, the
bold title, the description and both buttons side by side, matching the
reference. Read back the dot's own computed `background-color`:
`rgb(233, 74, 50)` — exactly `--kw-poppy` / `#E94A32`.

## v1.2.20 — 2026-09-02

### Changed — Filter and Sort brought to the toolbar's one pill, matching `ViewSwitch` exactly

Client, verbatim: "all the components in toolbar (the sort, the filter, the
view) i want them in the same pill aspect exactly. match filter and sort to
the existing view selector component (i am happy with how that is)."
`ViewSwitch` was the reference: `--control-height-button` (40) tall,
`--btn-secondary-fill` solid with no hairline, `--btn-secondary-hover` on
hover, weight 500 — `select.tsx`'s trigger, overridden exactly that way.
Measured against it, `FilterBar`'s chips and `SortControl`'s field were both
off, in different ways.

`FilterBar`'s three toolbar-row pills (`filterChipVariants` — an applied
facet chip and the "Clear filters" control it's shared with — and `CHIP_ADD`,
the "+ filter" idle affordance) all took `--control-height-pill` (26, `.kw-
chip`'s own drawn height, right for a chip inside a facet's results but short
for this row) and `--surface-raised` for their fill — a token that happens to
equal `--btn-secondary-fill` in light mode only, and visibly splits from it in
dark. `CHIP_ADD` also carried "the one bordered control in the system": a
dashed `1px dashed var(--hair-strong)` outline, ch26's drawn "not yet set"
cue. The client's ruling is explicit that this dash goes too. All three now
take `--control-height-button`, `--btn-secondary-fill`, `--btn-secondary-
label`, and `CHIP_ADD` gains `--btn-secondary-hover` on hover and drops its
border entirely.

`SortControl`'s field (`fieldVariants`) was already the right height, but
still wore `select.tsx`'s CH09 field skin wholesale: `bg-background`, a
resting `--hair-strong` hairline, weight 300, no hover — correct for a lone
select, and a visibly different pill from `ViewSwitch` standing next to it.
It now overrides the same four properties `ViewSwitch` does. The direction
button fused to it (`directionVariants`, the 2 Sep fusion) mirrored the
field's OLD skin to draw one continuous hairline across both halves; mirroring
that same skin now that the field has moved would have put the hairline back
on one side of a chip built specifically to erase it, so the direction half
was brought to the same `--btn-secondary-fill`/`shadow-none`/`--btn-secondary-
hover` skin instead of a bare hairline mirror. Its own active-press nudge and
focus-visible ink shadow are untouched.

`RangeFacet` and `SearchableFacet` draw no toolbar-row pills of their own —
their fields and search pill live inside a facet's popover, not the bar —
and are unchanged.

Verified in `verify/toolbar-pills/`: Search, Filter (idle and one facet
picked), the fused Sort chip and `ViewSwitch` rendered on the real toolbar
ground (`collectionPanelVariants`'s panel, not a generic `.bg-surface-panel`),
in both palettes. Computed `height`/`background-color`/`box-shadow` now read
identical across all five controls in both light and dark; before this
change they matched only by light-mode coincidence.

## v1.2.19 — 2026-09-02

### Added — three more client rulings on the rail and on tabs: the member chip's fill, weight as a third nav signal, and hover-weight on tab labels

Three follow-ups to v1.2.18, same review.

**The rail's member chip is black in dark mode, and always black on mango.**
Verbatim: the foot chip's fill should be black whenever the app is in dark
mode (any spine) or whenever the spine is mango (either palette); light-paper
and light-ink are unchanged. `MemberChip`'s `shell` read `--spine-chip-fill`,
which also re-binds `--btn-secondary-fill` / `--pill-fill` for anything else a
route renders inside the rail column (`screen-shell.tsx`'s `RAIL_COLUMN`), so
repointing it would have blackened controls the client never saw. Two new
tokens instead, read only by the chip: `--spine-member-fill` (paper and ink
keep today's chip in light, both go to `--kw-charcoal` in dark; mango is
`--kw-charcoal` unconditionally, needing no dark half — same law as the rest
of tokens.css §7b) and `--spine-member-ink` (reuses `--spine-ink` on paper and
ink, since that was already the right value against both the old fill and the
new black one; mango gets its own `--kw-off-beige`, because on mango the
chip's fill just became the same charcoal the name text already was, and the
text has to invert rather than vanish against its own background). Two new
helper variables, `--spine-paper-member-fill` / `--spine-ink-member-fill`,
carry the light/dark split alongside the four existing ones in §4.

### Changed — font-weight is now a third, explicit signal on the rail's nav rows

Alongside fill and colour, an inactive row now hovers to `--font-weight-
medium` — `ACTIVE_TREATMENT`'s own weight, the heaviest this face ships,
`--font-weight-semibold`/`bold`/`extrabold` all alias to the same 500 — with
NO `--spine-active-fill` wash added: "the pill is earned by being current, not
by being pointed at." Resting weight (`--font-weight-light`, 300) is unchanged
in value but is now named on `ROW_IDLE` instead of merely inherited from the
body default, so it survives a rail rendered somewhere that default doesn't
reach. `rail.tsx` only; the collapsible toggle shares `ROW_IDLE` and picks up
the same hover for free.

### Changed — an inactive tab's hover previews the active weight, in both variants

`components/tabs/tabs.tsx`'s `TRIGGER_SKIN.line` and `.folder` each gain one
line, `enabled:hover:font-[var(--font-weight-medium)]`, beside the existing
`enabled:hover:text-foreground` — which is untouched, per the client's
explicit instruction that colour does not move. A no-op on an already-active
trigger (already at that weight, unconditionally), so neither needs a
`data-[state=inactive]` guard.

## v1.2.18 — 2026-09-02

### Fixed — the rail's idle nav text was gray on every spine; the client wants full ink, always

Live against all six spine × theme combinations, the client's verdict was
verbatim: "nav text should ALWAYS be either pure black or pure white — never
gray — depending on what it sits on." `rail.tsx`'s `ROW_IDLE` was reading
`--spine-ink-quiet`, D5 = C's deliberate muted resting tier (26.01's ghost,
darkening to full on hover) — correct for the hierarchy ruling it implements,
but not what this client instruction asks for on this component. The idle
label now reads `--spine-ink` outright, the same full-contrast token the row
used to darken TO on hover (so the hover rule is gone, not redundant-but-kept):
charcoal on mango and on paper-in-light, off-beige on ink and on
paper-in-dark, at rest and unconditionally. The mango spine's own resting
colour does not visibly change — D3/D5 already pin its quiet ink to
`--ink-on-accent`, so `--spine-ink-quiet` and `--spine-ink` were already the
same value there — which is why her mango findings read as already-correct
once this was checked live. Scoped to the destination label alone:
`--spine-ink-quiet` itself is untouched in `tokens.css`, so the group heading
and the idle count badge — neither of them "nav text" — keep the quiet tier
exactly as D5 = C drew it. The active row's own ink (`--spine-active-ink`)
was not touched; it was never the complaint. Separately, the reported
dark-mode-mango logo defect (the mark must always be the black cut on any
mango ground, per `brand.tsx`'s own law) could not be reproduced against this
repo's current `rail.tsx` → `brand.tsx` path — `markField` already resolves
mango to `"brand"` in both palettes, `BrandArtwork` renders only the black
`<img>` for that field with no dark-mode class applied to it, and a repo-wide
search turned up no second render path and no CSS filter or recolour
targeting `[data-slot="brand-cut"]`. Verified correct, live, in all six
combinations at `verify/spine-colors/`; left alone rather than "fixed" with
no defect to point at.

## v1.2.17 — 2026-09-02

### Changed — `SortControl`'s field and direction button fuse into one chip

The client's reference artifact draws the sort control as one seamless chip;
the built control drew the field's own full pill beside a borderless
direction glyph, separated by a gap — two boxes, not one, and the artifact
was explicit that this reads wrong. Both halves now draw the SAME resting/
disabled/read-only hairline (`select.tsx`'s own convention, not restated
elsewhere) right up to where they meet, and each squares off only its
shared inner corner (`fieldVariants`'s new `fused` variant, on when
`showDirection` is true) — two 1px inset shadows on the same line read as
one border, with no wrapper duplicating `select.tsx`'s state logic and no
change to `showDirection: false`'s field-alone shape. The two remain
separately focusable and clickable (WCAG's two-hit-target reasoning this
file already documents is unchanged) — only the seam between them is gone.

## v1.2.15 — 2026-09-01

Five UI-level decisions the client confirmed against live `kwapso_system`
screens the night of 2026-08-31, re-imported here rather than left as the
app's own CSS overrides — see GAPS-RULINGS.md R-4 for the full record,
including which of these are bug fixes against this kit's OWN pre-existing
rules and which are genuinely new decisions made that night. Both kinds are
covered below; neither is unauthorized drift.

### Fixed — a folder tab's count was a `Badge` a second time, and a line tab's was a `Badge` a first time

`screen-renderer.tsx` put a `<Badge count={…} />` inside every folder-variant
tab, which is the exact defect override 45 had already fixed once elsewhere
(`collection-frame.tsx`) — ch14's "counts are quiet, never badges" was never
swept into this file. `record-detail.tsx`'s line-variant tabs had the same
`Badge`, which CH27's own "underline strip with a quiet count" forbids too.
Both now go through one new component, `TabsCount` (`components/tabs/tabs.tsx`),
so the shape lives in one place instead of three.

### Added — an active line-variant tab's count is a small mango circle, by ruling

The client's new decision, on top of the fix above: `line`'s count stays quiet
at rest, and on the ACTIVE tab only, becomes a small fully circular mango fill
with primary-ink text (`TabsCount`, same file). `folder`'s count is unchanged
by this — ch14's law was never in question, only whether the build kept it.

### Verified — the rail's active-item pill is already a deliberate, named shape

No code change. `compositions/templates/rail.tsx`'s collapsed active item
already reads `rounded-pill` (999px) by the kit's own name, not an accidental
clamp of radius and row height; its expanded active row is deliberately
SQUARE, per an existing 2026-08-24 ruling (KWAPSO-SPEC.md row 55) that reversed
an earlier pill build on the client's own screenshots. Checked and left alone.

### Added — Badge's quiet fill gets a documented, non-border fallback for an ambient ground

`badge.tsx`'s `secondary` fill is now `bg-[var(--badge-quiet-fill,
var(--surface-quiet))]` rather than a bare token — every existing call site is
pixel-identical — so a caller whose badge sits on `--muted` (measured at 1.175
contrast in dark, worse than the already-exempted panel case in
GAPS-CONTRAST.md) can rebind one custom property to a darker quiet tone. A
fill shift only, never a border or a shadow, matching this kit's law
throughout.

### Added — a hairline divider between a rail's named sections

`compositions/templates/rail.tsx` groups now separate with a thin inset-shadow
hairline (never before the first group), reading a new spine-aware token,
`--spine-hair` (`foundations/tokens/tokens.css` §7b) — one value per rail
spine, following the same "the mango spine never flips with the palette" law
`--spine-active-hover` already states in the same block.

### Not changed — no floating rail collapse toggle exists in this kit

Checked and confirmed there is nothing to fix or document: this kit's collapse
control is an in-flow row at the foot of the rail's own column
(`data-slot="rail-collapse"`), per KWAPSO-SPEC.md line 4316, not a floating
control overlapping the rail's edge.

## v1.2.14 — 2026-08-31

### Added — `AgentChat onAttach`/`attachLabel`, and a per-turn `eyebrow`

Two gaps a consuming app logged rather than worked around by hand-editing the
vendored copy (Brimba's `agent-panel.tsx`, ITEM 4 and ITEM 7, 31 Aug – 1 Sep
2026): the composer had no attach slot, and a turn had no field for anything
drawn ABOVE the bubble, on the panel's own ground.

`TicketThread` already carries both shapes, for the same composition
(ch27.10 — "the assistant… [is] the same composition with a different header
and a different participant list"): `onAttach`/`attachLabel` draw a real
paperclip button inside the composer's own pill, left of the field; its
author/authorMeta/time row draws outside the bubble, above it. `AgentChat`
had neither, so a caller reaching for either had to lay a control outside
the composer's own row by hand, or squeeze a timestamp inside the bubble's
own padding via a negative margin escape hatch.

Both are mirrored onto `AgentChat`, not re-invented: `onAttach`/`attachLabel`
render the identical control `TicketThread` does (absent by default — a
caller with nothing to attach gets the unchanged composer), and `eyebrow`
takes the author/time row's visual register (tertiary ink, the micro step,
tabular figures) as a single node per turn, since a two-party assistant
conversation has no second author field to draw — the sighted counterpart to
the `sr-only` role name already beside it, not a second one.

Not carried over: `TicketThread`'s `hidden sm:inline-flex` on its attach
button, which exists because that thread can fall back to a per-message
attachment list on a narrow screen. `AgentChat` has no such fallback, so its
attach control stays in the row at every width.

## v1.2.13 — 2026-08-31

Three, from three lanes, batched so a consuming app syncs once. Two are the
same shape: a rule the file's own words make CONDITIONAL, drawn
unconditionally.

**v1.2.12 IS A DUD — DO NOT SYNC IT.** It points at the same commit as v1.2.11
and carries nothing of its own. I created it by accident: a malformed shell
heredoc executed the tag command before the commit existed, and it reached the
remote before I caught it. It is left in place rather than deleted, because
deleting a pushed tag on a shared remote is destructive and other lanes watch
this repository. Syncing it is harmless — you get v1.2.11 — but you get none of
the three changes below.

### Fixed — the upload zone opened the file picker for a caller's own controls

The dashed zone carries `onClick={open}` and `hint` renders INSIDE it, so an
anchor or a button passed to `hint` fired the OS file picker as well as doing
its own job, and the caller could not prevent it because the caller does not own
the zone. THIS FILE ALREADY KNEW: its own Browse button calls
`event.stopPropagation()` before `open()` for exactly this reason. The courtesy
was never extended to a consumer's controls. A click that landed on a control is
now that control's click, which also stops the hidden input's own programmatic
`click()` bubbling back and re-entering `open()`.

### Fixed — `CardHeader` drew its under-hairline with nothing beneath it

Its own sentence says it "carries the hairline that separates it from the BODY";
chapter 13's caption, transcribed at the top of the same file, is "header, body,
and footer are hairline-separated inside one 24px shell"; the file's own law
restates it as "one shell, TWO hairlines". All three presume a region on the
other side of the line.

It drew unconditionally. A header-only card is a shape THIS KIT DEMONSTRATES —
four of the seven card specimens in its own demo have a header and no content —
so the kit drew a separator against nothing in more than half its own examples.
Measured by a consuming app on real data: where a row of cards stretches to its
tallest member and a title wraps to two lines, the rule lands 0px from the
card's own bottom edge, reading as a second border in a lighter tone.

`:not(:last-child)` is the whole fix — no prop, no value, no colour, no caller
change. A header followed by a body OR a footer still draws it.

### Added — `ImportWizard uploadAside`

A node beneath the zone and OUTSIDE `FileUpload`, for what a reader needs beside
choosing a file rather than as part of it. Not a workaround for the click bug
above: `hint` renders as a `<p>`, so a list or a table inside it is invalid
markup and the browser builds a different tree than the caller wrote; and
anything inside the dashed target reads as part of the drop area. Both hold
whatever the zone does about clicks. `undefined` renders the same single element
as before.

## v1.2.10 — 2026-08-31

### Fixed — `ArticleBody` advertised `dangerouslySetInnerHTML` and refused it

The interface extends the div props, so it has always ADVERTISED the prop; the
render writes its own children, so React refused the combination outright —
*"Can only set one of `children` or `props.dangerouslySetInnerHTML`"*. Same
fault `Stopwatch` carried at v1.2.7 with `children`: a type accepting what the
implementation cannot deliver.

It matters more here. The kit's own Notes editor emits HTML, so a body that
arrives as a string is the ORDINARY case for user-authored prose — and the
workaround a consumer is forced into, wrapping the string in one div, silently
kills the vertical rhythm, because every rule that spaces this prose is a
DIRECT-child selector (`[&>*+*]`, `[&>*+:is(h2,h3)]`…). Measured: a wrapped
render leaves exactly one element under the root for them to act on.

When a caller injects, the root now takes the HTML and draws nothing of its own.
No class, no colour and no spacing is added — the prose treatment, the measure
and the size are the same variants the normal path resolves — and the branch is
not entered unless the prop is actually present, so no existing caller moves.

### Logged — a non-editorial quote register (manifest.json → notDelivered)

`ArticleBody` draws every `blockquote` as ruling 13's pull-quote, one per page
by editorial rule, with no second register and no opt-out. The law-book does not
rule on quotes at all. A quoted reply inside a ticket or a meeting note — several
per page, none editorial — has no answer, and inventing one would be a guess that
looks like law. Logged with a recommendation so it can be closed in one edit.

## v1.2.9 — 2026-08-29

### Fixed — `media={null}` never drew the single column its own doc promised

`media`'s prop doc says, verbatim: *"Pass a node to override, or `null` to draw
a single column."* Both auth frames wrote `md:grid-cols-2` unconditionally, so
`null` removed the photograph and left a two-column grid with one empty column.
Measured at 1710 on the consuming app's live sign-in: content 840 wide at x=0,
870px of nothing beside it, every word pinned to the left half.

`SignIn` (templates) and `AuthShell` (screens) both carried it; the second is
shared by sign-in, invite-acceptance, link-sent and session-expired.

### Fixed — `SignIn` had no page inset, so its content sat flush to the window

`AuthShell` states the auth page inset in words — *"the page inset steps
24 → 32"*, ch05's "24–32px card inset" range — and draws it.
`SignIn` drew none. Measured: at 1710 WITH a photograph the title's right edge
was 0px from the window, and on a 390 phone it touched both edges. Independent
of the media bug, and true before it. `SignIn` now uses its sibling's tokens and
breakpoint rather than a number invented for it.

**This changes the with-photograph render**, which is stated rather than
buried: the shell gains its inset, so at 1710 the columns go 840/840 → 810/810
and the content's right margin 0 → 30. The column COUNT, the breakpoint and the
content's start (x=870) are unchanged. No call site in either front door passes
`media`, so nothing in the consuming app moves.

### Note — the same shape, three times in one day

The single column was DOCUMENTED and not enforced. So was PATTERN.md §10's
`@source` advice, which asked every consumer to remember. So was
`AccessDeniedScreen`'s empty register, which its own default made unreachable.
A sentence in a doc is not a mechanism.

## v1.2.8 — 2026-08-29

### Docs — PATTERN.md §10 records that the kit now ships its own exclusion

§10 already described this exact bug and prescribed `source(none)`. It was
right and it was not enough: it asked every CONSUMER to remember, and a
consumer writing plain `@import "tailwindcss"` inherits Tailwind's automatic
walk regardless. Since v1.2.5 `tokens.css` scans code rather than directories
and carries `@source not` for markdown, so the exclusion travels with the thing
it describes. §10 now says so, and records the half no exclusion can reach —
three SOURCE COMMENTS that named a forbidden radius in order to forbid it, and
emitted it, fixed in v1.2.6 by describing rather than spelling.

### Docs — PATTERN.md §12, on checking the claims this document makes

Nine wrong answers in one day from probes that all looked like they worked, two
of which reached other people. Run the canary first; build it from the hardest
instance rather than the simplest; distrust any bound the moment a probe reports
nothing; plant a sentinel when a count cannot name its source. The worst failure
is the confident all-clear, because a wrong finding argues with the code and
dies, and a wrong all-clear agrees with everybody.

No component, token or behaviour changed.

## v1.2.7 — 2026-08-29

### Fixed — `Stopwatch` advertised `children` and threw them away

`StopwatchProps` extends the div props, so the TYPE said children were
accepted; the render writes its own explicit JSX children, and explicit
children beat a spread, so anything a caller passed was discarded in silence.
`children` is now omitted from the interface: the type tells the truth.

### Added — `Stopwatch leading`, because a second clock makes the first ambiguous

One stopwatch needs no name. Two running at once are two durations and nothing
else, and a name in a `title` tooltip is invisible on a phone. There was
nowhere to put the name, so the consuming app hand-drew a near-identical pill
beside this one — a duplicated component, which is what makes this a gap
rather than a preference.

`leading` is a PLACEMENT, not a drawing: nothing styles the node, the same way
`ScreenShell` places a rail and `CollectionFrame` places a toolbar. The pill's
fill, radius, glyph and disc are untouched, and `undefined` renders nothing at
all — not an empty wrapper. The three default renders (plain, readOnly,
disabled) were captured through the consuming app's React before and after and
are BYTE-IDENTICAL.

## v1.2.6 — 2026-08-29

### Fixed — three comments that compiled the class they forbid

The last of v1.2.4/v1.2.5's tail, and the sharpest form of it. Tailwind scans
every file it is pointed at, source and prose alike, and it cannot tell an
explanation from an intention. So `components/card/card.tsx` saying *there is
no fifth radius and X is re-pointed at 24, so it is never reached* — and two
comments in `tokens.css` doing the same — **emitted X**, which after v1.2.5
was the only thing left in a consuming app's whole build asking for a third
box radius. Measured in the kwapso app's real stylesheet, both doors.

All three now DESCRIBE the step instead of spelling it, with the reason
recorded at card.tsx's header so the next person does not undo it. Nothing
about any radius changed; the value was always 24.

## v1.2.5 — 2026-08-29

Five bugs, no design. Every one found by RUNNING the kit under the consuming
app's toolchain (Next + jsdom) rather than by reading it — which is the one
toolchain this repository's own `tsc` and Vite build cannot see.

### Fixed — the shipped `@source` scanned PROSE, and compiled it

`foundations/tokens/tokens.css` named three bare DIRECTORIES. Tailwind's own
file walk reads markdown, so `components/PATTERN.md` — the law-book, which
quotes class names in order to FORBID them — was compiled into every
consumer's stylesheet. Two of the results are not valid CSS:

    .text-\[length\:var\(--text-\*\)\] { font-size: var(--text-*) }
    .hover\:bg-\[…\]:hover              { background-color: … }

The first is a parse error reported on every build of both kwapso front
doors ("Unexpected token Delim('*')"). Beside them came `rounded-sm`, `-md`,
`-xl` and `-2xl` — the four box radii PATTERN.md exists to forbid and the
app's own R31 forbids again — emitted because the law-book names them.

The globs now say `**/*.{ts,tsx}`, which is what `demo/demo.css`,
`mini-app/mini.css` and `verify/entry.css` have said all along; the shipped
scan was the only one that did not. Measured with `source(none)` so nothing
else could be the cause: the directory form emits **71 lines the code form
does not, and the code form emits nothing the directory form does not.** A
strict subtraction of prose.

**And the globs were only half of it, which is why v1.2.5 exists.** A
consumer that writes `@import "tailwindcss"` WITHOUT `source(none)` also gets
Tailwind's automatic content walk — the consumer's own, rooted at their
project, reading markdown, reaching this vendored kit whatever the globs say.
Measured: tightening the globs cleaned a `source(none)` build and changed
NOTHING in the kwapso app's real Next build, which reported the same parse
error. So `@source not "../../**/*.md"` states the exclusion where it cannot
be forgotten, one line covering every consumer either way — and THAT is what
made the warning go from the app's build.

### Fixed — `BrandRoute` threw in every consumer's test run

`compositions/screens/brand.tsx` called `window.matchMedia` bare. `typeof
window === "undefined"` does not catch jsdom, which HAS a window and, by
default, no `matchMedia` — so any unit test an application writes about its
brand screen died with "window.matchMedia is not a function". Two other
files here already guard the same call the same way
(`overlays/delete-confirmation`, `overlays/quick-view`); this was the odd
one out. A missing `matchMedia` now means no palette-change event, which the
MutationObserver and the sentinel poll beside it already cover.

### Fixed — `AccessDeniedScreen` had no way to say "there is nobody to ask"

The prop said `Undefined draws no grantor block at all` and state 7 said
`an invented name would be worse than none`, and neither was reachable:
`grantor` defaulted to the specimen, so an application that supplied none
shipped **"Member name · workspace owner" and support reference "4182-AC"**
to a real reader on a real denial. `grantor={null}` and `reference={null}`
are now the opt-out — the same shape `ScreenShell` uses for `rail`, and the
documented empty register is reachable for the first time. The default is
unchanged, so nothing that renders today moves.

### Fixed — ten user-visible strings no application could translate

A string written into a render is a string that ships in English to somebody
who chose another language, on a screen that looks finished. Three screens
had one, and in every case every NEIGHBOURING string was already a prop —
they were missed, not decided:

* `LoginRoute` wrote `emailLabel="Work email"`, byte-for-byte `SignIn`'s own
  default for the same prop, so the literal added nothing and cost the route
  the prop. `emailLabel`, `emailHelp`, `codeLabel`, `backLabel` and
  `resendLabel` are now forwarded — the same four its portal sibling,
  `PortalLoginRoute`, has exposed through `labels` all along.
* `HomeRoute` wrote `countLabel`, `searchLabel` and `bodyLabel`. All three
  are ACCESSIBLE names, so the cost fell on the one reader who cannot see
  the screen.
* `OnboardingRoute` wrote ten: five `<Field label>`s, two help lines, a
  select placeholder and the appearance badge three times. They arrive as
  `fieldLabels`, a partial over `OnboardingFieldLabels`.

Every default is the word that shipped, and the eight affected default
renders were proved **byte-identical** before and after under the app's own
React.

### Fixed — `QuickView` logged a Radix warning into every console

The one of five dialog overlays with neither a `DialogDescription` nor an
explicit `aria-describedby={undefined}`. A peek has no summary line above
its facts, so the honest half of Radix's contract is the one taken rather
than inventing a sentence to quieten a log.

## Unreleased — 2026-08-26

**controls/ and structures/ merge into components/.** Client ruling,
verbatim: *"i still don't understand the difference between controls /
structures. please merge them, and rename to components."* The second
folder restructure in one day, and the one that changes a consuming app's
import prefix count from two down to one.

### Changed — one flat `components/`, not two tiers

67 control folders and 42 structure folders become 108 under one
`components/` — no `components/controls/` or `components/structures/`
subfolder, per the client's explicit "not even as a subfolder split." Every
folder moved with `git mv`, so `git log --follow` still works across the
second rename this repo's had today. **README.md carries the new import
table**, appended after the 2026-08-24 one rather than overwriting it.

### Removed — `PortalConversation`, deleted outright

Client ruling, verbatim: *"delete portal conversation."* Checked every real
call site first: `PortalConversation` and `PortalApprovalBand` had exactly
one consumer in the whole repository — a demo gallery specimen — and no
composition (template, screen, overlay or state) ever imported either
export. Deleted cleanly; nothing functional depended on it. `components/`
is 108 rather than 109 as a result.

### Fixed — the recurring `@source` failure, a third time

Same class of bug as 2026-08-24's restructure and D10-B before it: a moved
source folder compiles to zero classes while `tsc` and both builds stay
green, because Tailwind treats a missing `@source` as a smaller stylesheet,
not an error. `demo/demo.css`, `mini-app/mini.css` and eight `verify/`
harness stylesheets all still read `../controls/**` and `../structures/**`.
Fixed, and two of them had picked up a genuinely duplicated `../components/
**` line from a blind find-replace during the same pass — deduped, not
just renamed. Proved with a sentinel class, built, grepped the compiled
CSS, confirmed, removed.

### Fixed — map's chapter table still said "primitive"

Client ruling, verbatim: *"about structures - map is a collection view.
recategorize."* The component itself had been a structure since
2026-08-24; what was still wrong was `demo/artifact.ts`'s internal chapter
lookup (`map` was keyed in `PRIMITIVE_CHAPTERS`, with a comment asserting
it "is the one view that is NOT in this folder: it is a primitive"),
`docs/ARTIFACT-MAP.md`'s chapter-21 and 27.29 rows (`controls/map/`, never
updated after the 2026-08-24 move), and a missing `tier="structures"` on
the Map `<Section>` in `demo/collections/views-h-q.tsx` — the one section
in that file that didn't say so, which is why the demo rail filed it under
"— UNFILED" instead of "19 · Collection views." All four corrected.

### Changed — demo nav, three words now

`foundations · controls · structures · compositions` → `foundations ·
components · compositions`. The "Controls" and "Structures" bands merge
into one "Components" band; the rail still runs the two former tiers as
separate chapter-grouped sections (08–16, then 17–23) under that one view.
Also shortened all four `VIEW_META` captions to one line each — a client
screenshot of the Compositions caption's full paragraph, always rendered
at the top of the page, came with the instruction "remove this or put it
somewhere else. the goal is to have a slimmer top nav"; applied to all
four rather than singling one out, since all four were the same shape. The
fuller history lives in README.md's Layout section.

### Fixed — the folder tab's active fill and its own panel finally agree

Client, verbatim: *"very important: fix the folder tabs! the active needs
to be the same color as the container (white). all disabled have the same
color. and more! we have already reviewed folder tabs multiple times!
review your own work."* Read the whole history first, because this exact
component has three WITHDRAWN overrides behind it (30, 38, 39, all gone
with 2026-08-23's K1 reversal) and the register is explicit that the active
tab and its panel are BOTH soft paper `#F7F2EB` (`#1C1B18` dark) — not
white. So the question was never "does the client want white now" (a
fourth flip on the same ruling); it was whether the build actually renders
the register's own answer. It does not, in exactly one place.

**The bug, measured on the client's own specimen** (`demo/sections/t-z.tsx`'s
`Tabs variant="folder"` — Overview / Details / Disabled, the same three
tabs the screenshot shows): the active tab's fill is `--kw-folder-live`,
resolved straight to `--surface-panel` on the `Tabs` root (TAB-C1), and it
was already correct everywhere — `#F7F2EB` light, `#1C1B18` dark, standalone
or inside `CollectionFrame`. `TabsContent`'s own panel, on the same variant,
painted `bg-card` instead — and `--card` is the kit's OFF-BEIGE page tone
(`--kw-off-beige` `#FFFEF9` / `--kw-unlit-raised` `#26241F`), not the panel
tone, *unless* a caller separately rebinds `--card` to `--surface-panel`.
`collection-frame.tsx` does exactly that rebinding for its own internal
strip — which is why the mismatch never showed up there — but a bare
`<Tabs variant="folder">`, exactly what the demo specimen and the client's
screenshot both are, gets no such rebinding, so the panel measured one
whole paper lighter than the tab sitting on it: `#FFFEF9` vs `#F7F2EB`
(1.081 apart) light, `#26241F` vs `#1C1B18` (1.238 apart) dark. THAT is the
seam the client is seeing, and their read of it — "the active needs to
match the container" — is correct; it is simply the CONTAINER that was
wrong, not the tab. **Fix (TAB-C2, `components/tabs/tabs.tsx`):**
`TabsContent`'s folder skin now paints `bg-[var(--kw-folder-live)]` — the
identical property the active shape already reads — instead of `bg-card`,
so the panel and the active tab share one value in every container by
construction, and nothing needs a rebinding to agree twice.

**"All disabled have the same color" — checked, and it already was.**
Measured the disabled tab standalone and inside `CollectionFrame`, both
palettes: `#E2DDD4` light / `#2F2D28` dark in both places, because
`--btn-disabled-fill` is a fixed token the shape reads directly and never
depends on the surrounding `--card`/`--surface-panel` rebinding that caused
the panel bug above. No change needed there; logged so it is not
re-litigated as a fourth pass on this component. Measured live, both
palettes, standalone and inside `CollectionFrame`, before and after the fix.

## v1.0.7 — 2026-08-26

A patch off `v1.0.6`. One fix, found by watching a real reply stream.

### Fixed — the chat follows the words, not the flags

v1.0.6's follow was keyed on the message count and the streaming flag — but a
streaming reply GROWS its last message without changing either, so the effect
fired once and then watched 1,700px of answer walk below the fold (measured
live). A MutationObserver now follows growth, and only while the reader is
already near the foot — scrolling up mid-stream to re-read is respected, a
new turn still snaps down.

## v1.0.6 — 2026-08-26

A patch off `v1.0.5`; still none of the *Unreleased* restructure.

### Fixed — the agent chat fills its host, scrolls, and follows its foot

`agent-chat` was a plain flex column with no growing region and no internal
scroll. In a height-constrained host (the assistant slide-in hands it
`h-full`) everything huddled under the header — empty state and composer at
the top, a void beneath — and a long thread walked invisibly out of the panel
with no way to reach it. The owner's verdict from the screen: "the chat
function is completely broken."

The turns region now grows (`flex-1 min-h-0`) and scrolls, which is also what
pins the composer to the foot where a thumb expects it; the empty register
centres in the grown region; and the region follows its own newest words on a
new turn and while streaming. In the standalone auto-height card all of it is
inert — no free space, nothing to scroll, no surplus to follow.

## v1.0.5 — 2026-08-25

A patch off `v1.0.4`; still none of the *Unreleased* restructure.

### Added — `overDialog` on `SheetContent`

The layer model is right: a page drawer (55) sits under a dialog (60). But a
picker that opens a SEARCH SHEET from inside a dialog is not a page drawer —
it is an input surface anchored to a control, which is the 70 layer's whole
definition. Without a way to say so, a client picker's sheet opened BEHIND
the form asking for it on every phone: options visible in a sliver at the
screen's foot, nothing tappable (25 Aug 2026 — the same handset report that
found the Select, one surface later). `overDialog` lifts the scrim and the
panel to 70; dismissal already belonged to the topmost Radix layer.

## v1.0.4 — 2026-08-25

A patch off `v1.0.3`. Two measured fixes from a phone at 375, and like the
three before it this does NOT carry the restructure under *Unreleased*.

### Fixed — a tab never shrinks under its own words

In the scrolling strip the triggers are flex children, and flex shrinks them
to `min-width` BEFORE the strip overflows: every folder tab clamped to 144,
the icon overflowed the start padding to x=0 and the count ran into the
shoulder curve — read from the screen as "icons spilling out and badge
numbers cut off". `shrink-0` on both variants: a tab takes its content's
width, the STRIP scrolls.

### Fixed — the comment composer's pill has a boundary

`--surface-raised` in the dark palette sits one step off the panel, so the
inline composer's pill vanished: a reader saw a bare placeholder floating
over a dead Send and called the thread broken. The field was real; nothing
said so. The pill now carries the 20% hairline ring, the tier the thread's
own dividers already use.

## v1.0.3 — 2026-08-25

A patch off `v1.0.2`. Two changes to one structure, and like the two before it
this does NOT carry the restructure under *Unreleased*: an app pinned to the
v1.0.x line takes it without moving an import.

### Changed — the rejoin gathers every branch

`structures/flowchart/flowchart.tsx` drew a fork's rejoin as ONE elbow from
ONE branch (`continues`, "the first wins"). Read on a real process map, that
says only that branch carries on — the owner's exact reading: "if it's a join,
then both splits … should be drawn from all of them." The elbow is replaced by
a merge rail, the mirror of the fork above: every branch column drops a rail
down its own remaining height (so uneven branches meet the run cleanly), one
horizontal run spans the outer centres, one centre drop carries on to the
trunk. Marking ANY branch `continues` now draws the full merge; a fork whose
ways never meet again still marks none and draws nothing.

### Added — return lines for loops

A `FlowNode` may name `loopTo`: the id of an earlier node the work goes back
to. The chart draws it as a dashed 1px return line up the left margin in
ink-tertiary, one lane per loop so two never share a rail, with an arrowhead
where the work lands. Measured off the DOM after layout (the tree is DOM, so
the browser's geometry is the only honest one) and re-measured on resize. The
line is a cue, not a sentence — the words on the node stay the call site's.

## v1.0.2 — 2026-08-25

A patch off `v1.0.1`. One fix, and like v1.0.1 it does NOT carry the
restructure described under *Unreleased* below, so an app pinned to the v1.0.x
line can take it without moving a single import.

### Fixed — a Select inside a Dialog opened behind it

`controls/select/select.tsx` put its portalled list at `z-50`. The system's
layers are sheet 55, dialog and alert-dialog 60, then popover, dropdown-menu,
tooltip and hover-card at 70 — the four anchored surfaces that must clear a
dialog, because a dialog is where a form lives and a form is where you pick
things. Select was the only portalled surface left under that line.

Inside a dialog the list was painted behind the dialog it was opened from:
options visible, every click landing on the dialog in front. On a phone, where
the list fills most of the screen, the effect is a form whose pickers do not
work at all — reported from a handset with three dead pickers on one form.

Raised to `z-[70]`, which is the layer the kit already assigns to "anchored to
a control, must clear a dialog". `date-picker`'s panel also reads `z-50` and is
deliberately untouched: it is `absolute`, not portalled, so its number is scoped
to its own field rather than to the overlay stack.

## v1.0.1 — 2026-08-25

A patch off `v1.0.0`. It carries **one fix and nothing else** — in particular
it does NOT carry the restructure described under *Unreleased* below, so an app
pinned to `v1.0.0` can take it without moving a single import.

### Fixed — every chart was drawing its data and none of its furniture

`structures/chart/chart.tsx` built its grid, both axes, the zero line, the
tooltip and the legend inside a **fragment** and handed that to the recharts
chart. recharts does not read its children the way React renders them: it walks
them itself and drops anything whose `displayName` it cannot match. Its
fragment-descent line is guarded by `isFragment` from `react-is@18`, which
identifies an element by `Symbol.for("react.element")` — and React 19 stamps
`Symbol.for("react.transitional.element")`. So the guard answered false for
every fragment, and everything inside it was discarded without a warning.

The bars drew. Nothing else did. On every chart, in every app on this kit.

The furniture is now an **array of keyed elements**, which
`React.Children.forEach` flattens before `isFragment` is ever consulted. No
other file in the kit renders recharts, so this is the whole of it — but the
rule it earns is general: **never hand a fragment to a recharts chart.**

## Unreleased — 2026-08-24

**The restructure.** The repository takes the four names the client uses, and
the example pages go. Nothing changed what it does; this is a move, a delete
and a relabel. Every move is a `git mv`, so all 113 renamed files keep their
history.

### The tree

```
foundations/  tokens/ · icons/ · motion/   (moved in under D10-B — see below)
controls/     67   was components/primitives/
structures/   42   was components/collections/
lib/          2    was components/lib/
compositions/
  templates/  15   was compositions/shapes/
  screens/    17   the client's named exceptions, and only those
  overlays/   8    new — what opens OVER a screen
  states/     5    new — the same screen with nothing in it
```

`components/`, `compositions/shapes/`, `compositions/system/` and
`compositions/portal/` no longer exist. **README.md carries the full import
rewrite table**; six rules cover the whole surface.

### Removed — 24 files, 11,731 lines

Sixteen collection routes, two detail routes and three screens (9,504 lines),
on the client's ruling: *"we only needed the 'template' for main / detail
screens! ... we don't need the actual pages (only exception home, settings,
external pages (sign in etc). those are screens."* Plus `system/process-map`
(the structure already existed twice as `flowchart` and `flowdetail`),
`screens/onboarding` (a second copy of a screen that also existed as a route)
and `screens/password-security` (its own subtitle: *"A Settings tab, not a
special place"*). Each is listed separately in its commit so any one can be
vetoed on its own.

### Changed — two exports, and only two

`NotificationsScreen` → **`Notifications`**, and `NotificationsScreenProps` →
`NotificationsProps`. The client ruled notifications a component; the PANEL
branch is what became the control and the `MainScreen` page branch was
deleted. **The full-page inbox is gone** — CH27.34 asks for both surfaces by
name, and the control's own header records what the override costs.

`map` moved from the controls to the structures and `portal-conversation`
from the templates to the structures. No export was renamed by either.

### Fixed — four things that were quietly wrong

- **Four templates had no demo section at all**: `screen-shell`,
  `main-screen`, `detail-screen`, `rail` — the first four the client's own
  structure names. `demo/shapes` asserted `EXPECTED_SHAPES = 12` against a
  folder of 16, so the guard passed. All four are drawn now.
- **The `brand` control was invisible**, for the same reason —
  `EXPECTED_PRIMITIVES = 66` against a folder of 67. It was missing from
  `manifest.json` too, along with `folder`.
- **Every count in the demo is now read from its folder.** The header printed
  *"66 primitives · 26 collections · 12 shapes · 29 routes"* against 67, 40,
  16 and 30. Not one number is typed in any more, and every registry reports
  a missing file AND a phantom section BY NAME. It worked on the first load:
  it named a composition I had left out of my own placement table.
- **`manifest.json` had 163 dead file paths.** Rebuilt against the real tree.

### The one that would have shipped broken

Tailwind's `@source` globs in `demo/demo.css`, `mini-app/mini.css` and
fifteen `verify/` harness stylesheets all still read `../components/**`. That
folder had just been renamed, so **Tailwind silently compiled no class that
appears only in `controls/` or `structures/`** — an `Avatar` marked `sm` drew
at 480px because `size-8` was never generated. `tsc` was clean. Both builds
were clean. A missing `@source` is not an error, it is a smaller stylesheet.
It was found by looking at the page, and nothing else would have found it.

### Found and deliberately not fixed

Both are behavioural, both predate this work, and both are written into the
header of the file that owns them.

- `structures/progress-dashboard` draws its value in a fixed 34px
  `flex-none` span that cannot shrink or wrap. `screens/portal-impact` passes
  whole sentences into it, so at 380 the row's right edge lands at 479 in a
  380 window. **`documentElement.scrollWidth` does not report this** — it was
  found by measuring each element's own right edge against the viewport.
- `controls/brand`'s `max-w-full` does not constrain a lockup centred in a
  `grid place-content-center`: the grid area is sized from the element's own
  max-content, so the constraint is circular. Splash, the system door and the
  portal boot screen each draw a 450px lockup in a 380 window.

### `foundations/` — ruled `D10-B` and built

`foundations/` **is** a folder now. The client ruled `D10-B` after seeing the
full cost drawn in `verify/decide-2.html` §D10, and `tokens/`, `icons/` and
`motion/` moved into it by `git mv`, history intact.

**The count was eighty, not thirteen.** Re-grepped rather than trusted: eighty
tracked files reach the three folders by relative path, across 107 reference
lines.

| group | n | how it fails if missed |
|---|---|---|
| Decision & index pages under `verify/` | 14 | **silently** — plain HTML, one `<link>` each |
| Verify harnesses | 11 | 10 Tailwind entry sheets + 1 `.tsx` |
| Kit source | 42 | 20 `controls/` · 11 `structures/` · 11 `compositions/`; `tsc` catches these |
| Demo & mini-app | 7 | loud |
| Docs & prose | 6 | stale text only |
| Named without a `../` | 5 | `package.json` · `tsconfig.json` · `manifest.json` · `README.md` · `vite.config.ts` |

**Two references that grep did not count, because they point OUT of the moved
folders rather than into them, and both broke on the move:**

- `foundations/tokens/tokens.css` reached `../assets/fonts/` for its three
  `@font-face` rules. Left alone this fails **silently in the worst way** —
  the fonts 404, the page renders in the fallback, and computed
  `font-family` still reads `"Saans"`, so the obvious assertion passes while
  the page is wrong. Now `../../assets/fonts/`.
- `foundations/icons/icon-base.tsx` reached `../lib/utils`. Now `../../`.

**Consuming apps.** There is no `exports` map and no path alias — the kit is
vendored source, so every path is literal. Two stylesheet imports and one
import specifier change; `README.md`'s import table carries the rows.

```css
@import "kwapso-design/foundations/tokens/tokens.css";
@import "kwapso-design/foundations/motion/motion.css";
```
```tsx
import { Pencil } from "kwapso-design/foundations/icons";
```

`controls/`, `structures/`, `compositions/` and `lib/` are untouched.

**The verification is the work, not the move.** All fourteen decision pages
were reopened in a browser and asserted styled — stylesheet count, computed
body `font-family` against the kit stack, and computed background against the
token colour — because a missing stylesheet is not an error in HTML and no
build, test or console would have told anyone.

All fourteen pass in both palettes, plus `verify/whats-left.html`, which a
sibling agent was writing while this move was in flight and which this move
broke. Each page resolves its stylesheet (25 rules from the external sheet),
computes `font-family: Saans, system-ui, …`, and paints
`rgb(255, 254, 249)` in light and `rgb(20, 19, 16)` in dark.

**The assertion was checked against a negative control**, because an assertion
that cannot fail proves nothing: `needs-you.html` was re-served with its link
reverted to the old `../tokens/tokens.css` and the same check reported
`font: "Times"`, `background: rgba(0, 0, 0, 0)` and `0` rules from the
external sheet — §D10's drawing, reproduced. The check has teeth.

`document.fonts.check('300 1rem Saans')` is part of the assertion, because the
font-url break is the one failure that `font-family` alone cannot see: the
computed value still reads `"Saans"` while the browser paints the fallback.
`/assets/fonts/Saans-Light.woff2` returns 200 and the face loads on every page.

Demo and mini app verified at 380 / 834 / 1440 in both palettes — twelve
combinations, all green, icons rendering in each.

**Three verify harnesses do not build, and did not before this move:**
`kit-f`, `rulings-c` and `track3c` import `demo/screens/wall`,
`compositions/screens/triage-sitting` and `compositions/screens/notifications`,
all deleted in the restructure above; `overflow` imports `OnboardingScreen`,
which was renamed `OnboardingRoute`. `rail`, `kit-bc` and `kit-de` build clean.
Left alone — stale harnesses are their own repair, not this one.

## v0.4.0 — 2026-08-22

**The rewrite.** Everything below v0.4.0 was a design *specification* — tokens,
rulings, prose, and CSS classes with plain-HTML specimen pages. It was correct
and it could not be installed, because the two apps are React component
libraries and a CSS class is not a React component.

This tag replaces it with **React + TypeScript source**. Commission steps 1–5.

The v0.1.0–v0.3.0 tags still resolve and their history is intact — this is a
merge, not a force-push. Their entries are kept below.

### Added

- **`tokens/`** — 234 tokens under the commission's own names with the kwapso
  kit's values. Both palettes, three text scales, one global focus rule.
  `build-tokens.mjs` guards drift between the two dark blocks, orphans, and px
  leaks; each guard verified by deliberately breaking it.
- **`icons/`** — 96 React exports (93 commissioned + `ChevronDown`,
  `ChevronUp`, `Star`, which primitives needed and the commission did not
  name). Five sizes, `currentColor`, lucide-compatible props.
  **Artwork is placeholder**; names, API and sizing are final, so swapping in
  real art is: replace `icons/<Name>.svg`, run the generator, done.
- **`motion/motion.css`** — 57 classes covering all 16 cases of section 10.
  Every duration and curve from a token; `prefers-reduced-motion` honoured.
- **`components/primitives/`** — all 65, 169 exports, every name spelled as the
  1,122 existing call sites expect.
- **`demo/`** — every component, every state, both themes, three scales.
- **`manifest.json`** — the contract. `renamedFrom` is empty by design.
- **`GAPS.md`** — every unresolved question and every ruling, with reasoning.

### Decided by looking at it, not by argument

Each of these was settled from a side-by-side page in `verify/`:

- An unqualified `<Badge>` is **quiet**, not mango — six mango chips in an
  eight-row list made the colour meaningless.
- Modal footers are **end-aligned, primary last**, departing from the kit
  drawing because 229 existing footers are written cancel-first.
- A dark modal sits on the **raised** tone; the kit's page tone made it the
  same colour as the page behind it.
- `ProgressToggle` keeps its 18×8 drawing and gains a **24×24 target**.
- A card's ground is **`--surface-panel`**, not `--background` — in light they
  are the same colour and cards were carried by shadow alone.
- `--warning` drops to the quiet chip (**provisional**, pending new colours).
- Forest lightened `#1F9259` → `#20955B` so the success chip clears AA at 4.61.

### Known limitations

- **Icon artwork is placeholder.** Client is supplying the real set.
- **`--chart-4` / `--chart-5` repeat 1 and 2** — a five-series chart shows two
  indistinguishable pairs.
- **RTL is not supported**, by decision. Components use logical properties
  throughout, so the door is open, but nothing has been rendered RTL.
- **Fonts not shipped** — Saans and SerrifCondensed are a licence question.
  Both are named first with a real fallback stack.
- 27 findings from the visual audit are in `GAPS-DEMO.md`.

### Not in this tag

The 26 collections, the compositions, and the four documents.

---

# Before v0.4.0 — the specification era

Kept for the record. Do not build from these; `tokens/tokens.css` in this tag
supersedes every token file below.


## v0.3.0 — 2026-08-21

**Foundations (build order step 2), orchestrated build.** First step under the
subagent structure: four builder agents (shell, iconography, focus, state
matrix), each verified independently against kit v10 by the controlling
session before assembly — token purity, palette flip, focus discipline,
verbatim fidelity (15/15 matrix cells, 10/10 focus strings, 30/30 glyphs),
snap logging.

### Added

- **`specimens/patterns.html`** — the second specimen page (chapters 4–23 as
  they get built), with the same theme/scale controls as the core page and
  fragment markers for the steps ahead.
- **Ch4 Iconography** — 4 sizes, the four colour states, all 30 glyphs
  rendered from `assets/icons/` via CSS mask so external SVGs take
  `currentColor` (commented as technique, not design law).
- **Ch6 Focus & keyboard** — all kit prose verbatim; one theme-following demo
  card (no hand-drawn dark twin, per "dark is a token flip").
- **Ch7 State matrix** — the 8-state × 4-treatment matrix and all 14
  Dos/Don'ts, verbatim.
- **`assets/`** — the kit's own icon set (30 filled + 7 outline), folder
  9-slice pieces, logos. Fonts and app-icons deliberately absent (licence
  question / not yet designed — see assets/README.md).

### Gaps logged (merged into GAPS.md build log)

Nine entries from the builders; two are kit contradictions needing a ruling:
the ch6 ring-shape sentences (own-radius vs always-a-pill — repo builds to
own-radius) and the ch7 disabled-ink cell (#5f5d59 vs the ink scale's
#a8a59f). No inventions — every unspecified value was logged, not guessed.

### Explicitly NOT in this tag

Tier 1 patterns (ch9–13, 20–23), folder shapes + ch15–18, the floating layer,
the 45 compositions (blocked on an archetype decision), and the written docs.

---

## v0.2.0 — 2026-08-21

**The corrections + kit-sync pass.** Brings the tokens and existing specimens
into line with kit **v10** (the kit moved v7→v10 across four exports on
2026-08-21; each was reconciled and snapshotted). This tag contains **no new
components** — it fixes what v0.1.0 shipped that the kit has since settled
differently, and it is honest about that scope.

### Corrected (the six)

1. **Type scale replaced wholesale** — the 13 steps of kit v9/v10
   (96/72/56/44/32/24/20/18/16/14/13/12/11) with per-step tracking and
   leading. The old 64/46/38 scale is gone; `--text-meta` (12.5) is deleted —
   12.5 is retired as a step. New names: `--text-badge` (12, ruling 02),
   `--text-micro` (11, eyebrows), `--text-body-s` (14), `--text-caption` (13).
2. **Radius: three tokens → four** (ruling 03, stated in full in v10):
   `--radius-card` 24 · `--radius-pill` 999 · `--radius-select` 6 (marks and
   selection controls) · **new `--radius-bar` 4** (bars, heat cells, decision
   nodes). Code-input cells move OFF the 6px exception — they are 24px boxes.
3. **Spacing replaced** with ruling 28's scale: `--space-1…11`
   (4/8/12/16/20/24/32/48/64/96/128) + half-steps `--space-1h…4h` (6/10/14/18).
   The 13-step carried-forward scale is gone; specimen references remapped
   (one snap logged in GAPS.md: 56px page-chrome padding → 48).
4. **Focus rings restored** (ruling 24, reversed): `--focus` #1A1918/#FFFEF9,
   `--focus-width` 2px, `--focus-offset` 2px, one shared `:focus-visible` rule
   in the specimen CSS. Every `outline: none` removed. Verified live: the rule
   resolves to `2px solid` at `2px` offset in both palettes.
5. **Dark hairlines corrected** to .08/.12/.24 (v0.1.0 guessed the light
   triple).
6. **Light raised corrected**: `--surface-raised` = `--card` over `--sheet`
   (#FFFEF9 on #F7F2EB). The old `#FAF9F7` is the kit's `--idle` (inactive
   tabs) and now ships under its right name, `--surface-idle`.

Also: control heights per ruling 28 (32/38/40/44/56), `--avatar-lg` 38→48 per
ruling 30, `exclusions.md` and `library-map.md` re-stated for the reversed
focus ruling and the four-radius law, and the specimen page's "no focus
states" warning replaced with the restored-ring note.

### Added

- **`tools/snapshot.py`** — kit-export versioning: gzips each export into
  `kit-current/.history/`, diffs against the previous one (chapter spans,
  counts, radius census), and raises explicit rule-3 alarms for lost chapters,
  rulings or compositions. Alarms verified against a deliberately damaged
  export. The `.history/` archive itself stays local; only the tool is
  versioned here.

### Gap status

GAP-1/2/3/5/6/7/11 closed (see GAPS.md for who closed what — mostly the kit
itself, v8–v10). GAP-4 (hairline roles), GAP-8 (body measure), GAP-9 (dark
hovers) and GAP-10 (paper-tone flip mechanism) remain open. One kit-side
caveat stands: ruling 28's spacing scale has 0 references in the kit's own
markup, so composition geometry will be transcribed-and-snapped, each snap
logged.

### Explicitly NOT in this tag — the build order ahead

2. Foundations the repo has never had: ch4 iconography, ch6 focus utility
   page, ch7 state matrix
3. Tier 1 completion: ch9–13, 20–23 (incl. record marks, stage hero)
4. Folder shapes (ch14), then ch15–18 (incl. pulse band)
5. The floating layer: assistant + timer (rulings 29/31/32)
6. Archetypes & compositions (12 present, 4 partial — transcribed with
   spacing snapped and logged)
7. `ruleset.md`, `contract.md`, `responsive.md`; `library-map.md` remains a
   stub pending `@kwapso/ui` token names

---

## v0.1.0 — 2026-08-20

First tag. Tokens and Tier 1 specimens, extracted from the Claude Design project
**"UI Kwapso System"** (`Kwapso UI Kit.dc.html`, v6 · 25 chapters · 27 rulings).

### Added

- **`tokens/tokens.css`** — 126 tokens, both palettes, rem-relative.
  - Dark implemented as a real mechanism, not documentation: light on bare
    `:root`, dark redefined under both `prefers-color-scheme` and
    `[data-theme="dark"]` so an explicit choice wins in either direction.
  - Three-step text scale (`data-scale`) moving the root to 13 / 15 / 17px.
  - Four-weight ink scale per rulings 25 + 27.
  - Button, status-pill and chart tokens derived from the semantic layer.
- **`tokens/build-tokens.py`** — generates `tokens.json` from `tokens.css` so
  the two cannot drift. Fails loudly if the two dark blocks stop matching, which
  is the bug that makes "system dark" and "I picked dark" render differently.
- **`tokens/tokens.json`** — generated. Carries `unresolved` flags through to
  machine-readable form.
- **`specimens/kwapso-ui.css`** + **`specimens/index.html`** — Tier 1 components
  written as real CSS consuming the tokens, with live theme and scale controls.
  Buttons, status pills, badges, fields, selection controls, cards, list items,
  tabs, skeletons, empty states.
- **`GAPS.md`** — 11 open gaps.
- **`exclusions.md`** — the canonical "never build" list.
- **`tokens/semantic-map.md`** — raw → semantic, with the reasoning.
- **`tokens/library-map.md`** — ★ stub. kwapso column filled, library column
  deliberately blank.

### Superseded

Two earlier token files are now stale and must not be built from:

- `_ds/…/colors_and_type.css` — 5-step ink, tertiary `#76746f`, micro 11px, and
  **no dark values at all**.
- `kwapso-tokens.css` (root) — v5, 23 rulings, values still marked `PROPOSED`
  for rulings 24–27.

Both predate the final rulings. The kit itself was correct; the token files had
not been regenerated since the rulings closed.

### Verified

- Every probed token changes between light and dark — no token silently shared.
- Root font-size and all component sizes track the scale control together.
- No px leaks in consuming CSS beyond the deliberate 1px press-drop and a 1px
  tab-border offset.
- The `build-tokens.py` drift guard fails with exit 1 on an injected mismatch.

### Known limitations

- **`library-map.md` is a stub.** Blocked on `@kwapso/ui` token names, which are
  not knowable from outside that library. A wrong crosswalk is worse than none —
  unmapped tokens are exactly where old styling survives a swap.
- **`archetypes/` is empty.** `get_file` caps at 256 KiB and the kit exceeds it,
  truncating mid-chapter 19. The 18 kwapso-native archetypes live in chapters
  20–25 and are unverified. They need a read by an uncapped route.
- **No fonts committed.** Saans and Serrif Condensed redistribution is a
  licensing question, not a technical one. The specimen page falls back to
  `system-ui`, which contradicts the kit's stated "no fallback stack" rule —
  a fallback is what makes the page reviewable before the fonts land.
- **`ruleset.md`, `contract.md`, `responsive.md` not written.** Priority 5 in the
  coverage checklist, after specimens.
- **Ruling 24 (no focus states) is implemented as specced.** Keyboard-only users
  cannot see focus on buttons, tabs, rows, chips or menu items. This is an
  explicit, twice-recorded kwapso decision and a deliberate departure from WCAG
  2.4.7. Text fields keep their focus cue — the ruling does not cover them.

### Needs a decision before v1.0.0

In rough order of blast radius:

1. **GAP-11** — are the kit's px figures authored at base 16 or base 15? Affects
   every measurement in the system.
2. **GAP-3** — the 9 spacing steps. The current scale is carried forward from a
   superseded file.
3. **GAP-10** — a mechanism for the card/page paper-tone flip. Changes how every
   component is written, so it should land before the specimens harden.
4. **GAP-9** — dark button hover direction and values.
5. **GAP-6** — dark shadows, or a ruling that dark expresses elevation through
   surface tone alone.
