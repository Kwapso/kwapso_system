# REPORT — lane `upstream` · the design kit `Kwapso/kwapso-ui-ux`

**All four branches are built, green and pushed. Nothing was merged and nothing was tagged.**

Clone: `/Users/alaap_kanchwala_apple/kwapso-lanes/kit-upstream-work` (left in place, working tree clean).

---

## Read this before you open a compare link

**The four branches are based on `v1.2.64`, not on `main`.** The kit's tags live on
`origin/feat/ui-ux`, which is **27 commits ahead of `origin/main`** (`origin/feat/ui-ux` and
`v1.2.64` are the same commit, `e4ed931`; `origin/main` is `de57ea1`). My predecessor branched
off the tag, which is right — the design lead tags off that line — but it means the
`main...<branch>` URL the brief asked for shows those 27 unrelated commits on top of the one
that matters.

So each branch below carries **two** links. Give her the second one.

Every branch is **exactly one commit** off `v1.2.64`.

---

## 1 · `feat/dialog-presentation`

- **Commit** `4f0ef39a80c24bbae44d6f27ff07dcfb50491195` — "A dialog says where it lands, and the app stops reaching past the kit for it"
- **Compare (as briefed)** https://github.com/Kwapso/kwapso-ui-ux/compare/main...feat/dialog-presentation
- **Compare (the change alone)** https://github.com/Kwapso/kwapso-ui-ux/compare/v1.2.64...feat/dialog-presentation
- **`npm run check`** — run unpiped on the branch tip: **exit 0**
- 10 files, +739 −12. `components/dialog/dialog.tsx`, `foundations/motion/motion.css`, `demo/sections/c-d.tsx`, `manifest.json`, `CHANGELOG.md`, `verify/dialog-presentation/`.

**PR body to paste:**

> `DialogContent` gains `presentation?: "responsive" | "overlay" | "sheet" | "fullscreen"`,
> defaulting to `overlay`. The consuming app's screen engine draws exactly these four and could
> only do so by importing the Radix primitive underneath this component and drawing a second
> dialog on it — its own R39 law carries that import as the app's last exemption and names this
> prop as the fix. Two dialogs on one primitive are two dialogs that can disagree about a scrim,
> a radius or an entrance without either file changing, and they had. The sheet half is
> `sheet.tsx`'s bottom sheet line for line: `sheet` is four classes, the narrow half of
> `responsive` is those four behind `max-[45rem]:`, the same construction as `NARROW_BOTTOM`,
> with the drawer's grabber and the drawer's 45rem threshold; the motion is one class reading
> one attribute (motion.css §3d, the shape of §3a), both rules carrying `data-state` so a sheet
> entrance can never tie with the base exit on the closed frame. Measured in
> `verify/dialog-presentation` with real Chrome at 380×812 and 1280×800: `overlay` is identical
> to v1.2.64's dialog in every field at both widths — 335 in a 22.5 gutter, 431.25 in 30, a 7.5
> rise over 0.2s — and `responsive` above 45rem is the overlay rect for rect. Below 45rem it is
> anchored left, right and bottom, 380 wide, capped at 690.2 (85dvh), corners 22.5 22.5 0 0,
> grabber 39×4 at dx 0, travelling 316.41 on Y and 0 on X over 0.36s. No horizontal overflow in
> any of the eight cases. `responsive` is deliberately not the default: the 2026-09-04 rule is
> about panels that arrive from a side, a modal rises in place, and turning 115 modals into
> phone sheets is a ruling not yet given.

**Verified independently:** the app's `UI_PACKAGE_EXEMPT` entry
(`shared/rules/registry.ts:893`) names `shared/web/screen-engine/screen-renderer.tsx`, says
"UPSTREAM FIX: a `presentation` prop on the kit's DialogContent. Delete this line the day it
ships", and that file's `layerContent` map declares exactly `responsive`, `overlay`, `sheet`,
`fullscreen`. The four names match; the app's last R39 exemption can be deleted the day she
tags this.

---

## 2 · `feat/article-body-quote-register`

- **Commit** `eb005fd7e4a536733e02cf4e5c23777a8d79af48` — "A quoted reply is a passage, not a headline: ArticleBody grows a second quote register"
- **Compare (as briefed)** https://github.com/Kwapso/kwapso-ui-ux/compare/main...feat/article-body-quote-register
- **Compare (the change alone)** https://github.com/Kwapso/kwapso-ui-ux/compare/v1.2.64...feat/article-body-quote-register
- **`npm run check`** — run unpiped on the branch tip: **exit 0**
- 9 files, +421 −12. `components/article-body/article-body.tsx`, `demo/collections/a-ca.tsx`, `manifest.json`, `CHANGELOG.md`, `verify/article-quote/`.

**PR body to paste:**

> `ArticleBody` gains `quote?: "pull" | "passage"`, defaulting to `pull`. Every `blockquote`
> inside the prose was drawn as ruling 13's pull-quote — the serif at the h3 step, one per page
> — with no way to opt out, and `manifest.json`'s `notDelivered` entry had the case that had no
> answer written out: a quoted reply inside a ticket or a meeting note, several per page, none
> of them editorial, which is the ordinary shape of user-authored prose because an editor that
> emits HTML emits `<blockquote>` for a quote typed mid-sentence. The register the entry
> recommended is built as written — sans at the body step, quiet ink, marked by a rule rather
> than by the serif — and the entry is closed in the same commit with the reasoning written into
> it. The pull block moved out of the shared prose list into the variant so neither register has
> to undo the other; the passage writes no family, no step and no margin, because its register
> IS the absence of the serif and the flow's own 14 is what spaces it. Measured in
> `verify/article-quote` with real Chrome, both palettes, both grounds: `pull` is identical to
> v1.2.64's file on all eight rows (SerrifCondensed 22.5 / 28.125 / −0.1125, primary ink, 45
> above and below), and `passage` is Saans 15 / 21.75 / normal — the paragraph's own type — in
> `--ink-tertiary`, with a 2px rule in that same ink inset 18.75. The ink is tertiary because it
> measures 5.899 light / 7.928 dark on the darkest paper prose meets, against 4.5; the rule is
> the ink and not `--hair-strong` because the hairline measures 1.526 / 2.185 against a 3:1
> floor and a quote has no letter to mitigate it with, the way a permission slot does. The
> default stays editorial on purpose: re-deciding it would change every existing quote on the
> strength of a gap entry.

**Manifest entry closed as briefed** — the `notDelivered` line "A non-editorial quote register
on ArticleBody" keeps its `item`, `reason` and `recommendation` and gains a `resolution`
paragraph, with `severity` moved from `known-limitation` to `resolved`. It stays in the array as
a record rather than being deleted, which is how that register works.

---

## 3 · `feat/calendar-more-click` — *finished this session*

- **Commit** `f0345d0` — "The more-line stops being a sign on a locked door: CalendarView grows onSelectMore"
- **Compare (as briefed)** https://github.com/Kwapso/kwapso-ui-ux/compare/main...feat/calendar-more-click
- **Compare (the change alone)** https://github.com/Kwapso/kwapso-ui-ux/compare/v1.2.64...feat/calendar-more-click
- **`npm run check`** — run unpiped on the branch tip: **exit 0**
- 9 files, +372 −20. `components/calendar-view/calendar-view.tsx`, `demo/collections/a-ca.tsx`, `demo/states.generated.ts`, `CHANGELOG.md`, `verify/calendar-more/`.

**PR body to paste:**

> `CalendarView` gains `onSelectMore?: (day, hidden) => void`. GAPS-COL1 CV-3 added "+N more" so
> a busy cell would say how many events it was not showing, and shipped it as a `<span>` —
> `formatMoreEvents` changed the words and nothing changed what they did. A count of hidden
> records that cannot be opened is a locked door with a sign on it, and it advertises the loss
> the honest overflow merely had; the consuming app's answer was to fold the overflow into a
> fake event chip with a sentinel id so `onSelectEvent` would fire on it, which is a record that
> is not a record, invented downstream to buy a click the kit would not sell. The rule is the one
> this file already applies twice — `onSelectDay` given makes an enabled cell a real button,
> `onSelectEvent` given makes a chip one, `onSelectMore` given makes the more-line one; absent,
> it is the same text and no tab stop. It hands back `events.slice(maxEvents)` in the caller's
> own order so the caller can open what the cell withheld without recounting it off a formatted
> string, and `formatMoreEvents` keeps exactly the job it had, the words. The resting drawing is
> one class constant shared by both elements and did not move: measured in
> `verify/calendar-more` with real Chrome on a cell of six events at `maxEvents={3}`, the box is
> 225.17 · 264.94 · 146.42 · 15.19 as a span and as a button, step 11.25, `--ink-tertiary`,
> inline inset 7.5 at dx 0 from the chip edge, text-align start; only the cursor, the corner
> (0 → 999, so the wash has a shape) and focusable (false → true) differ. The hover is the cell's
> own `--accent` over 0.12s on `--ease-kwapso` with the ink lifting to `--foreground` — tertiary
> rests at 6.506 light / 7.928 dark, sits at 5.890 / 6.848 under the 5% wash, and the hover ink
> reads 15.741 / 13.262. With `onSelectDay` also given, a real click reported the hidden three on
> the right day and `dayPicked: []`: the click stops at the line, as the chip's does. Below `sm:`
> the more-line lives in the column the phone layout replaces with dots, so nothing is drawn and
> 380 has no overflow.

**What I found on resuming and what I added.** My predecessor had already written
`calendar-view.tsx`, the demo panel and the `verify/calendar-more/` harness, and had
regenerated `demo/states.generated.ts` (the "TEN STATES" table the planner saw it working on —
that was finished, not half-done). What was missing was the measurement, the CHANGELOG entry
and the commit. I ran the harness against real Chrome (Playwright from the app's
`node_modules`), wrote the register entry from the numbers, and committed. No manifest change:
the kit's `props` map records **variant enumerations only** (25 of 117 components have one) and
`onSelectMore` is a handler, so recording it there would have been the first non-variant entry
in that map.

---

## 4 · `feat/permission-matrix-offered-rights` — *built this session; the one `dead_end_review` is blocked on*

- **Commit** `fa1e790` — "An unoffered box stops pretending to be a switch: PermissionModule grows rights"
- **Compare (as briefed)** https://github.com/Kwapso/kwapso-ui-ux/compare/main...feat/permission-matrix-offered-rights
- **Compare (the change alone)** https://github.com/Kwapso/kwapso-ui-ux/compare/v1.2.64...feat/permission-matrix-offered-rights
- **`npm run check`** — run unpiped on the branch tip: **exit 0**
- 9 files, +677 −22. `components/permission-matrix/permission-matrix.tsx`, `demo/collections/p-r.tsx`, `demo/states.generated.ts`, `CHANGELOG.md`, `verify/permission-rights/`.

**PR body to paste:**

> `PermissionModule` gains `rights?: readonly string[]` — the capabilities a collection offers at
> all. Absent, every capability is offered and every grid drawn before today is unchanged. The
> cell has drawn four boxes since the 2026-08-24 ruling whether or not four decisions existed
> behind them: the switch was there because the GRID has four capabilities, and nobody had asked
> whether the COLLECTION has four. The consuming app counted fifteen of eighty-eight boxes
> deciding nothing, one whole collection with four boxes and no door behind any of them, and an
> owner who ticked one was told they had granted something. `held` says whether a role HAS the
> capability; `rights` says whether the capability EXISTS here to be given. An unoffered slot
> keeps its place — position is the one property approach A was chosen for, and four collections
> drawing four, two, four and three slots would put every letter under a different column — and
> loses the well and the letter: no fill, no hairline, the kit's own no-value em dash in
> `--ink-tertiary`, `aria-hidden`, never a button, never a tab stop, no tooltip, and never
> counted as held whatever the sheet says. The lozenge stops fusing across it, which is correct:
> two decisions with no decision between them are two shapes. It is not "draw nothing", and the
> reason is this file's own recorded failure — a not-held slot's edge measures 1.526 light /
> 2.185 dark, so an empty slot beside a not-held one would differ by an edge below the 3:1 floor
> and a reader could not tell "no switch" from "switch, off", which is the very defect the prop
> removes, rebuilt inside the kit. The dash measures 5.899 / 7.928 on the darkest paper it meets,
> against 4.5. `formatCellLabel` gains a fifth parameter rather than a second prop — arity four
> is assignable to arity five, so no existing formatter breaks and word order stays where a
> caller already owns it — and the legend gains the third register the locked one never earned,
> drawn only when a shown row actually withholds something, showing the dash in a run of wells
> because position is the part to learn. Measured in `verify/permission-rights` with real Chrome,
> both palettes, 1280 and 380: the four slot rects in a withheld cell are 552.86 · 573.48 ·
> 594.11 · 614.73, all 20.63 square, identical to the hundredth to the same cell with `rights`
> dropped, so nothing moves when a capability is withdrawn. An unoffered slot reports background
> `rgba(0,0,0,0)`, box-shadow `none`, ink `#5f5d59` / `#bdb9b1` and focusable false beside an
> offered neighbour at focusable true. A row offering only `see` whose sheet nevertheless gives
> the owner `edit` announces "Owner · Activity: See · Create, Edit, Delete: not offered", and the
> same data with `rights` dropped announces "Owner · Activity: See, Edit" — one prop is the only
> variable between those two sentences. Clicking all four slots of that cell through the real DOM
> produced exactly one change. Four legend registers with `rights`, three without.

### The API, for the app lane wiring R36

```ts
// added to PermissionModule
rights?: readonly string[]          // absent = every capability offered

// added to PermissionMatrixProps
notOfferedLabel?: string            // default "not offered"

// widened, NOT breaking — arity 4 is assignable to arity 5
formatCellLabel?: (
  moduleLabel: string,
  roleLabel: string,
  held: readonly string[],
  locked: boolean,
  notOffered: readonly string[],    // NEW, in `capabilities` order
) => string
```

No export was renamed or dropped (kit rule 9.1). No manifest change: `rights` is an array of
ids, not a variant enumeration.

### Measured evidence, per claim

| claim | measured | result |
|---|---|---|
| the slot keeps its place | slot rects of `activity/owner` with `rights` vs with `rights` dropped | `552.86 / 573.48 / 594.11 / 614.73`, all `20.63 × 20.63` — **identical to the hundredth** in both |
| it loses the well | computed style of an unoffered slot | `background rgba(0,0,0,0)`, `box-shadow none` |
| it is legible | `--ink-tertiary` on the darkest paper it meets | **5.899** light / **7.928** dark against 4.5 |
| it is not a control | focus asked of the document | unoffered `focusable false`; its offered neighbour in the same run `focusable true` |
| clicking it does nothing | all four slots of a withheld cell clicked through the real DOM | exactly **one** change fired, `activity/owner/see=false` |
| it is not counted | a row offering only `see` whose sheet gives the owner `edit` | with `rights`: `"Owner · Activity: See · Create, Edit, Delete: not offered"`; without: `"Owner · Activity: See, Edit"` |
| the lock clause still lands | a partly-locked withheld row | `"Lead · Capacity: See, Locked by policy · Create, Delete: not offered"` |
| the lozenge breaks honestly | Invites — `see`, `create`, `delete` offered, `edit` not | `S·C` fused, dash, `D` standing alone |
| the legend register is earned | legend words with and without `rights` | 4 registers with, 3 without |
| the narrow render agrees | 380 wide | same four slots, same sentence, `scrollWidth 380 = clientWidth 380` |

**Canary** (written into the harness header): run the same harness against the previous
`permission-matrix.tsx` and `rights` is not a prop, every slot is a well and a letter whatever
the URL says, no dash appears anywhere, and the legend reports two registers in both modes.

### Two design decisions I made that the brief left open — flag these to her

1. **The brief said "an unoffered cell draws no control"; I kept the cell and emptied the
   SLOT.** A collection offering two capabilities drawing a two-slot run would put every letter
   under a different column and destroy the one property approach A was chosen for. Four
   positions always; the withheld one is a dash.
2. **A dash rather than nothing at all**, against kit rule 5.4's "never invent a dash to fill a
   hole". 5.4 is about a value that has not arrived, where a dash claims knowledge the component
   lacks; here the dash IS the knowledge. The deciding argument is the file's own recorded
   accepted failure: the not-held well's edge is 1.526 / 2.185, below the 3:1 floor, so an empty
   box beside a not-held box would be indistinguishable — R36's defect rebuilt inside the kit.
   The glyph is the kit's own no-value em dash, which the demo already draws in five places, not
   a coined one.

---

## The gate, itemised

`npm run check` in this kit is `build-tokens --check && generate-icons --check &&
check-icon-art && gen-states --check && check-book && tsc --noEmit`. Run **unpiped**, exit code
read directly (`npm run check > /tmp/x.log 2>&1; echo EXIT=$?`), on each branch tip in turn:

| branch | tip | exit |
|---|---|---|
| `feat/dialog-presentation` | `4f0ef39` | **0** |
| `feat/article-body-quote-register` | `eb005fd` | **0** |
| `feat/calendar-more-click` | `f0345d0` | **0** |
| `feat/permission-matrix-offered-rights` | `fa1e790` | **0** |

Its own reported counts on the last run: tokens 290 declared / 59 redefined in dark, drift ·
orphans · px · selectors all OK; 1512 glyphs in the pack, all valid, 0 with no upstream match
against `@phosphor-icons/core@2.1.1`; `gen-states` clean at 262 TEN STATES blocks; book 137
sections across 31 pages, 26/27 data views wearing a toolbar with 1 reasoned exemption; `tsc
--noEmit` silent.

---

## Housekeeping

- **Nothing merged, nothing tagged, no PR opened** — as ruled. Four branches pushed to
  `origin`, each one commit off `v1.2.64`.
- **`shared/ui/` in the app repo was not touched.** All work is in the kit's own clone.
- **No neurons spent.** The measurements are Playwright driving real Chrome against a local
  vite server; no model call, no API key.
- **Both vite verify servers (ports 5308 and 5309) are stopped.** The worktree is clean and left
  in place.
- **Commit trailer:** the two branches my predecessor committed carry
  `Co-Authored-By: Claude Fable 5.1`; the two I committed carry
  `Co-Authored-By: Claude Opus 5`, which is what LANE-COMMON and CLAUDE.md specify. Cosmetic,
  but she will see both spellings in one push.
- **Playwright is not in the kit's `node_modules`.** I required it from the app's
  (`/Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa/node_modules`) via `createRequire`, so the
  kit's closed dependency list (rule 9.3) is untouched and the harnesses add no dependency. The
  measurement scripts live in this session's scratchpad, not in the repo — the committed
  `verify/*/page.tsx` files carry the probes (`__slots`, `__click`, `__legend`, `__clickRow`) so
  anyone can re-run the numbers.

## What I could not do

- **No PR.** There is no `gh` in this environment and the stored credential cannot open one.
  The compare links above are the handover; she merges and tags.
- **I did not re-measure branches 1 and 2's numbers myself.** I re-ran their gate (exit 0 each)
  and verified branch 1's four prop names against the app's own `UI_PACKAGE_EXEMPT` reason and
  `screen-renderer.tsx`'s `layerContent` map, and branch 2's manifest entry closure. The
  contrast and geometry figures in those two commit bodies are my predecessor's; I have not
  re-derived them, and I am flagging that rather than passing them on as mine.
