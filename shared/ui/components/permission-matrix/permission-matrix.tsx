/* ============================================================================
   PermissionMatrix — collections down the side, roles across the top, and
   FOUR INDEPENDENT CAPABILITIES in every cell (1 direct call site).

   DESIGN SOURCE
   "Kwapso UI Kit.dc.html" → chapter 27, composition 27.12 "Permissions". Its
   subtitle is the design in one line — "A matrix, not a pile of switches" —
   and the body is quoted verbatim:

       "Who can open what. One screen, one table: collections down the side,
        roles across the top, and a single word in every cell. It lives on
        Settings · Roles in the system and does not exist in the portal at
        all."

   and its footnote, also verbatim:

       "A change applies at once and is written to the activity log."

   PERMISSION IS NOT A LADDER — THE CLIENT'S RULING, 2026-08-24
   Everything the chapter says about the SCREEN survives. The sentence about
   the CELL does not. The client, verbatim:

       "it does not work like that, there are different options and you can
        have many, so rethink the design, the actions are: see, add, edit,
        delete. f.e. someone might have all, and someone only can see — all
        variations are possible."

   THE RIGHT THE CLIENT CALLED "add" IS SHIPPED AS `create` — the id and the
   label both, corrected 2026-09-02. The application that enforces these
   switches has one name for it (`gating.ts`: `"read" | "create" | "edit" |
   "delete"`), and an id is a key two systems match on rather than a
   transcript of a sentence. The reasoning is at `RIGHTS` below, `see` and its
   own divergence included.

   So a cell is not one word off a three-rung ladder. It is FOUR INDEPENDENT
   BOOLEANS and all sixteen subsets are legal, including ones nobody would
   plan. "Full" and "Read" cannot describe *create but not see*, so no single
   word can stay in the cell, and 27.12's own defence of the ladder —
   "There is no 'edit but not delete' tier: it would double the table to save
   one case" — is the sentence the ruling overturns. OVERRIDE 24 is amended in
   place in KWAPSO-SPEC.md and carries the whole change; there is no second
   row.

   WHETHER AN ODD SUBSET IS SENSIBLE IS NOT THIS FILE'S QUESTION. "Delete but
   not see" draws without comment. Nothing here warns, blocks or corrects a
   combination: that is a rule about the product, and it belongs to the
   application.

   APPROACH A — THE RUN. Drawn, measured and chosen at `verify/permissions.html`
   §A, and built here without improvisation:

     · FOUR FIXED SLOTS PER CELL, in the client's own order — see · create ·
       edit · delete. They never move and never reorder, at any width.
     · THE SLOT WEARS `Checkbox`'S SKIN. 1.375rem, `--radius-select`, `--card`
       behind a hairline when the capability is not held, `--surface-inverse`
       and NO hairline when it is — `checkbox.tsx`'s own
       `enabled:data-[state=checked]:shadow-none`, not a new rule.
     · BECAUSE A HELD SLOT DROPS ITS HAIRLINE AND THE SLOTS ARE ADJACENT, HELD
       SLOTS FUSE. All four is one unbroken charcoal lozenge; three of four is
       a paper well bitten out of it. **Position carries the meaning and the
       letter is the text alternative** — an exception is a hole in a solid
       shape rather than something to count. That is the whole reason A was
       chosen over the other three drawings.
     · COLOURLESS BY DESIGN, and it is measured rather than asserted.
       `--dot-review` sky — the colour the ladder gave "Read" — reads 2.000:1
       on card in light against a 3:1 floor for a mark that carries meaning,
       and `--chart-2` against `--chart-3` already measures 1.004. Four hues
       per cell, 120 of them, is not a scheme this palette can carry. Ruling
       26 is satisfied by leaving colour nothing to say alone.

   WHY THE SLOT IS NOT A `Checkbox` INSTANCE, STATED RATHER THAN HIDDEN
   `Checkbox` hard-codes its own indicator, so a caller cannot put the
   capability's initial where the tick goes — and the letter is load-bearing
   twice over: it is the text alternative for a position, and it is the one
   mitigation this drawing has for the hairline failure below. So the slot
   wears the skin `checkbox.tsx` states and is not an instance of it. Three
   things differ, all three deliberate:

     1. THE LETTER REPLACES THE TICK.
     2. THE RADIUS BELONGS TO THE RUN, NOT THE SLOT. Ruling 03 gives 6 to
        "marks and selection controls"; the run IS the mark here, so it takes
        the 6 at its two ends and the interior corners are square. Rounding
        each slot would put four paper notches inside a fused lozenge and
        destroy the one reading the drawing exists for.
     3. THE STATE IS RESOLVED IN JS, NOT THROUGH `:enabled` / `:disabled`.
        `checkbox.tsx` uses the native pseudo-classes because a fieldset can
        disable it behind the component's back. Here a run may be a `<span>`
        (nothing to press at 380, and nothing to press with no `onChange`),
        and a `<span>` matches neither pseudo-class — so the same four skins
        have to be reachable on both elements. Resolving in JS is what makes
        the static run and the live one identical.

   THE LOCKED STATE WAS A REAL DEFECT. THE FIRST FIX WAS NOT ENOUGH, AND THE
   CLIENT HAS NOW RULED — 2026-08-24, D4-B
   Found while drawing A. `checkbox.tsx`'s disabled rules are unconditional —
   `--hair-faint` fill, `--ink-disabled` mark — so a locked run rendered all
   four slots IDENTICALLY and ERASED which capabilities were held. The first
   fix kept the state by SWAPPING the fill and ink pair per slot: locked held
   took `--btn-disabled-fill`, locked not-held took `--hair-faint`. That kept
   the state in the DOM but it did not carry enough distance to READ it.
   Measured in the built component, both palettes, transitions suppressed:

       ON `--card`            locked held vs locked not-held  1.191 / 1.124
       ON `--surface-panel`   the same pair                   1.082 / 1.004
       locked letter on its own fill                          1.817 / 2.946

   against 3:1 and 4.5:1. `verify/permissions.html` had measured the first
   line only (1.188 / 1.130) — its stage was `--card`. THE SECOND LINE IS THE
   ONE THAT DECIDED IT: `--btn-disabled-fill` is opaque and `--hair-faint` is
   not, so the locked NOT-HELD slot took its colour from whatever paper was
   behind the grid. On soft paper in dark the two locked fills landed on
   `#2F2D28` and `#2E2D2A` — **1.004, no separation at all**. Nothing inside
   the tokens opened that pair: an opacity is a standing rejection, and giving
   locked-held `--surface-quiet` walks into override 12, which pins
   `--btn-disabled-fill` precisely so a disabled fill can never be lighter
   than an enabled secondary.

   So it went to the client as `verify/decide.html` §D4, drawn both ways. The
   ruling, verbatim: **"d4 idk, you decide"** — answered against the page's own
   printed recommendation, which was **B**. B is built.

   B: A LOCKED RUN IS DRAWN EXACTLY AS A LIVE ONE, AND THE LOCK MOVES ONTO THE
   ROW. There is no locked skin. `slotSkin` takes one argument now, because
   the second one had nothing left to decide. A locked cell measures whatever
   a live cell measures — held against not-held, 17.386 light / 15.353 dark on
   card and on soft paper alike, because both fills are opaque — and the
   letter measures what a live letter measures. Nothing is dimmed, so nothing
   is lost, and the two numbers above stop existing rather than being excused.

   WHAT MARKS IT, AND WHERE THAT COMES FROM. The mark is not invented. The
   artifact was searched for how it draws a thing that cannot be changed, and
   it draws exactly four things, none of them a glyph and none of them a
   colour:
     · ch10, the checkbox list — the WORDS "Locked by policy", in the disabled
       label ink, with `cursor: not-allowed` on the row. This is the phrase.
     · ch10, the state table — disabled is "none · not-allowed": no ring, and
       the cursor IS the pointer's answer.
     · ch10, the field list — "Read-only … System-set values lose the border
       entirely", at FULL-STRENGTH ink. Read-only is not disabled in this kit:
       a value you may not change keeps its contrast. That sentence is B.
     · ch24 record chrome — "Read-only while editing", a micro eyebrow over a
       group of fields nobody may edit; and ch27's form footer, "Locked while
       submitting". Both are words in quiet ink.
   CH27.12 ITSELF DRAWS NO LOCKED CELL AT ALL — its grid has no locked row and
   no lock mark anywhere in it. So there is no drawing to copy, and the kit's
   own vocabulary is used instead: the phrase is the artifact's, "Locked by
   policy".

   AND IT IS CARRIED BY NOTHING — "WORD ONLY", RULED 2026-08-24, D6-B
   The phrase first shipped this morning on a `Badge variant="secondary"`.
   That chip's FILL then measured 1.339 / 1.214 light and 1.324 / 1.471 dark
   against the row's paper, short of a 3:1 non-text floor, and the question of
   what to put the words in went back to the client as `verify/decide-2.html`
   §D6. The answer, verbatim:

       "d6. i dont understand, did i not decide like permissions word only?
        if unclear do another visual"

   That is an answer, not a question, and it is a fair reading of the ruling
   they had already given: "a word on the row" never meant a pill around the
   word. THE CONTAINER IS GONE. No `Badge`, no fill, no radius — and so no
   fill left to fail a floor. The words are bare.

   THE REGISTER FOR BARE WORDS IS THE ARTIFACT'S, AND IT IS NOT THE EYEBROW.
   The kit's micro uppercase eyebrow was the other candidate, and the artifact
   was searched to settle it: the eyebrow appears 268 times and every single
   one is a HEADING ABOVE A TITLE — "System · 5 roles" over "Roles", "Group ·
   118 archived" over "Collection", "Read-only while editing" over a field
   group. It never annotates a row. What the artifact DOES draw for a state on
   a row it draws twice, and it is bare words at the ROW'S OWN SIZE in `--fg3`
   after an EM DASH:

       Shift-handover.docx — unsupported format
       Some selected — indeterminate

   which is this case exactly. So the mark is:

       Capacity — Locked by policy: Lead, Guest

   THE EM DASH IS LOAD-BEARING. Taking the pill away creates one real risk —
   that the phrase reads as a suffix to the collection's NAME rather than as a
   statement about the row — and it is answered with three separations at
   once, none of them a container: the dash, the drop to `--ink-tertiary`, and
   the drop out of the name cell's medium weight to light. That is the kit's
   own device for exactly this, not a new one.

   No glyph, no dot, no icon, no second mango, and **nothing carried by hue**:
   read in greyscale the mark is still English words. Ruling 26 has nothing to
   fail on, and there is no longer even a fill to argue about.

   THE MARK SITS AT THE SCOPE OF THE LOCK, and there is one rule for that: the
   row that holds a locked cell carries the mark, in its name cell, beside the
   collection. When every shown role is locked on that row the mark is the
   phrase alone; when only some are, IT NAMES THEM — "Locked by policy: Lead,
   Guest" — because a bare mark on a partly-locked row would be a lie, and
   naming the roles is more than the old per-cell dimming ever said. Whole-grid
   `disabled` is the case where every row is fully locked, so the same rule
   draws the same phrase on every row without a second code path.

   POINTER AND KEYBOARD STILL SAY NO, AND THAT IS THE COST OF B PAID.
     · The slots were never tab stops when locked and still are not. 120 dead
       tab stops would be worse than none.
     · A locked run takes `cursor-not-allowed` — chapter 10's own stated
       disabled cursor, the same one `checkbox.tsx`, `input.tsx`, `tabs.tsx`
       and `pagination.tsx` already use. The pointer says no BEFORE the click,
       which is what a run that looks live owes it.
     · A locked run raises the lock phrase in a `Tooltip` on hover — the same
       `tooltip.tsx` a live slot uses for its capability's word. So the reason
       is on the cell, not only on the row.
     · A click does nothing, and now nothing is the answer the reader was
       already given twice before they made it.
     · The screen reader is unchanged and still complete: a locked run is one
       `role="img"` whose `aria-label` is the whole subset in words followed by
       the lock phrase — "Lead · Capacity: See, Edit, Locked by policy". The
       run is reachable in a screen reader's table browse without being a tab
       stop, which is the point.
     · READ-ONLY IS NOT LOCKED and is still drawn differently from it: with no
       `onChange` a run is a plain mark with NO not-allowed cursor and NO lock
       phrase, because a reference table is not a frozen form. State 10.

   THE LOCKED REGISTER LEAVES THE LEGEND. A legend translates a mark that is
   not words into words; this mark IS words, sitting on the row a few
   millimetres away. And a locked run drawn in the legend would now be
   pixel-identical to the "held" and "not held" registers beside it — the same
   duplication this file already refuses for the capability-order line. So
   `lockedLabel` is no longer a legend phrase: it is the mark's own text, and
   the words appended to a locked cell's accessible name. Same prop, same
   default string, capitalised because it is now a chip's label and no longer
   a clause. `LegendRun` loses its `locked` argument for the same reason
   `slotSkin` did — there is nothing left for it to draw.

   THE UNCHECKED HAIRLINE IS THE SYSTEM'S ACCEPTED FAILURE AND IS NOT PATCHED
   A not-held slot is outlined at `--hair-strong`, override 42's resting field
   edge — measured **1.526 light / 2.185 dark** against WCAG 1.4.11's 3:1.
   Three-to-one needs roughly 47% ink, which is a border, and this system has
   none. Every field, checkbox, radio and select in the kit carries the same
   edge; nothing here makes it worse and nothing here can fix it alone. WHAT A
   MITIGATES IS THE LETTER: measured **6.506 light / 7.928 dark** against 4.5,
   it marks the slot's position whether or not the well around it is visible.

   `verify/permissions.html` drew the not-held slot at `--hairline` (8%) and
   measured 1.175 / 1.455. That page was written three minutes before
   override 42 landed in `checkbox.tsx` and is one step stale on this one
   value: 8% at rest would give a resting slot and a LOCKED slot the same
   edge, which is the exact defect override 42 exists to remove. The skin
   `checkbox.tsx` actually states is built, and the divergence is recorded
   here rather than resolved silently.

   THE API CHANGED, AND IT HAD TO
   `onChange` reported `(collectionId, roleId, levelId)`. A cell is now four
   booleans, so a callback carrying one id cannot describe a change to it. It
   is now:

       onChange(collectionId, roleId, capabilityId, next: boolean)

   Override 24's own note already recorded a signature change as unavoidable
   the last time this cell was redrawn; this is the second and last one the
   model forces. EVERY EXPORT NAME SURVIVES. `PERMISSION_LEVELS` and
   `PermissionLevel` are kept as deprecated aliases of the capability set and
   its type, so no call site's import breaks on the day the model changed;
   they are two lines and cost nothing to delete once the apps have moved.

   A COLLECTION MAY OFFER FEWER THAN THE MATRIX DRAWS — `rights`, 2026-09-07
   Every cell had four boxes whether or not four decisions existed behind
   them, and an inert box looks exactly like a live one. The consuming
   application counted: FIFTEEN OF EIGHTY-EIGHT boxes decided nothing — one
   whole collection had four boxes and no door behind any of them — and an
   owner who ticked one was told they had granted something. The switch was
   drawn because the GRID has four capabilities, and nobody had ever asked
   whether the COLLECTION has four.

   `PermissionModule.rights` is that question. Absent, every capability is
   offered and every grid drawn before today is unchanged. Given, it is the
   subset this collection offers at all, and the difference from `held` is the
   whole point: `held` says whether a role HAS the capability, `rights` says
   whether the capability EXISTS here to be given.

   THE SLOT KEEPS ITS PLACE AND LOSES ITS CONTROL. Not its place, because
   position is what carries the meaning in approach A — four collections
   drawing four, two, four and three slots would put every letter under a
   different column and there would be nothing left to read down, which is the
   one property the whole drawing was chosen for. So the unoffered slot is the
   same 1.375rem in the same order, and what it drops is the well and the
   letter:

     · NO FILL AND NO HAIRLINE. The well IS the switch — a paper well behind
       override 42's edge is what says "there is a control here and it is
       off". Where there is no control there is nothing to put a well around.
     · THE KIT'S OWN NO-VALUE EM DASH, in `--ink-tertiary`. Not a coined mark:
       the demo already draws `—` for a value that is not there in five
       places. And NOT "draw nothing", which is the reading rule 5.4 invites
       — because a not-held slot's own edge measures 1.526 light / 2.185 dark,
       this file's recorded accepted failure, so an empty slot beside a
       not-held one would differ by an edge below the 3:1 floor and a reader
       could not tell "no switch" from "switch, off". That is the very defect
       this prop exists to remove, rebuilt inside the kit. The dash measures
       6.506 / 7.928 against 4.5 — the same measurement the letter relies on
       — and is legible whether or not the wells around it are.
     · NEVER A CONTROL, in either run. A live run becomes a group of
       checkboxes with a HOLE in it, not a group with a dead member: no
       button, no tab stop, and no tooltip, because the tooltip on a live slot
       says the capability's word and naming a capability that is not on offer
       is the sentence this prop exists to stop the grid saying.
     · NOT COUNTED. `holds` returns false for an unoffered capability whatever
       the sheet says — the two can disagree when a right is withdrawn from a
       collection, and a capability that does not exist here cannot be one
       somebody has. Nothing is written and nothing is corrected; the grid
       simply does not count it.
     · SAID IN WORDS. The cell's accessible sentence names the capabilities
       this collection does not offer, once per cell, and the slot is
       `aria-hidden` — the same rule `LockMark` follows. `formatCellLabel`
       takes them as a FIFTH PARAMETER rather than a second prop: a function
       of four parameters is assignable to a type of five, so no call site
       breaks, and word order stays in the formatter a caller already owns.

   AND THE LEGEND GAINS ITS THIRD REGISTER, which the locked one never earned.
   A legend turns a mark that is not words into words; the lock's mark IS
   words on the row a few millimetres away, and this one is an em dash. It is
   drawn only when a shown row actually withholds something — a register
   teaching a mark the grid does not contain is a mark the reader holds for
   nothing — and it shows the dash WHERE IT LIVES, one hole in a run of wells,
   because position is the part that has to be learnt.

   THE GRID TURNS — `orientation`, 2026-09-09, and it is the answer to a
   QUESTION ABOUT `rights` RATHER THAN A NEW DRAWING
   `rights` shipped on 2026-09-07 and was unusable within two days, in the one
   place that had counted the boxes it was written for. The consuming
   application draws this grid TRANSPOSED — its four roles down the side, its
   twenty-two modules across — by handing its roles to `modules` and its
   modules to `roles`, which the props allowed because their doc strings say
   "one row" and "one column" and nothing stopped it. Everything worked except
   the one thing that mattered: `rights` is on `PermissionModule`, which is the
   ROW, and after the transpose a module is the COLUMN. "Does `teams` offer
   anything but edit?" is constant DOWN a column and varies ACROSS it, so a
   row-shaped prop cannot answer it and the app did not pass it. ITS MEASURED
   COST: eight of its twenty-two modules restrict their rights, so FIFTEEN OF
   THE EIGHTY-EIGHT boxes in every role's band still look like switches and
   decide nothing — R36's defect, the exact one that prop removed, surviving
   one rotation.

   TWO SHAPES WERE ON THE TABLE AND THE OTHER ONE IS REFUSED HERE. `rights` on
   `PermissionRole` as well is the smaller diff and the worse answer, for three
   reasons that are each on their own sufficient:

     1. IT INVENTS A PRODUCT RULE NOBODY HAS RULED. `rights` on a collection
        means "this collection has no delete door". `rights` on a ROLE would
        have to mean "this role may never be given delete anywhere" — a cap on
        a role, which is a second concept wearing the first one's word. The
        client named four actions and said all sixteen subsets are legal; they
        have never been asked about a role that cannot be given one. A kit that
        ships that prop has legislated past its own rulebook.
     2. IT NEEDS AN INTERSECTION RULE THE MOMENT BOTH ARE SET, and there is no
        right answer to invent: a grid whose row says `see` and whose column
        says `edit` draws either nothing or something, and either way this file
        would be deciding a product's policy in a `&&`.
     3. IT FIXES ONE OF SEVERAL AND THE REST COME BACK NEXT MONTH. `rights` is
        the first row-shaped affordance the transpose broke, not the only one:
        `description` is a collection's quiet line and has nowhere to go in a
        column head; the lock's mark sits on a row and names the roles it
        locked, which transposed must name MODULES; the narrow render draws one
        card per collection; the width floor counts roles. Answering `rights`
        alone leaves a grid that is right in one cell and wrong in five places
        around it.

   SO THE AXES BECOME A PROP AND THE DATA STAYS WHERE IT BELONGS.
   `orientation="roles-as-rows"` draws roles down the side and collections
   across the top. NOTHING ABOUT THE DATA MOVES: `held`, `rights` and `locked`
   stay on `PermissionModule`, because whether a collection has a delete door
   is a fact about the collection and a rotation of the drawing is not a fact
   about anything. A caller stops passing its roles as `modules`, and the one
   thing it has to know is which way round the grid is drawn — which is a thing
   it can see.

   WHAT ROTATES AND WHAT DELIBERATELY DOES NOT
     · THE ROW carries the name, the description and the lock's mark, whichever
       axis it is. `PermissionRole` grows `description` for that reason and
       that reason only — a symmetric quiet line, absent by default, so a
       transposed grid is a whole drawing rather than half of one.
     · THE LOCK'S MARK still names what it locked. Locking is stated per role
       inside a module, so a locked cell is the same cell either way; the mark
       moves onto whichever entity is the row and names the OTHER one when only
       some are locked. `formatLockedLabel` is unchanged and its second
       argument is now module labels in a transposed grid.
     · THE CELL'S SENTENCE DOES NOT ROTATE. `formatCellLabel` is still
       `(collection, role, held, locked, notOffered)` in that order, and the
       default still reads "Owner · Capacity: See, Edit". A screen reader is
       not scrolling anything, and a sentence that reordered itself with the
       drawing would make the same cell announce two ways in two apps.
     · THE NARROW RENDER FOLLOWS THE ROWS. CH27.12 says "one card per
       collection with its roles listed inside"; transposed that is one card
       per role with its collections inside, which is the same instruction read
       on the axis the reader chose. Nothing is truncated and nothing scrolls
       sideways, at either orientation.
     · THE WIDTH FLOOR COUNTS COLUMNS, not roles — it always meant columns, and
       it said "roles" because until today the two were the same word.
     · THE LEGEND AND THE RUN ARE UNTOUCHED. A cell is four capabilities in
       four fixed slots at every orientation; that is the drawing approach A
       was chosen for and there is nothing in it that has a side.

   THE NAME COLUMN CAN BE PINNED — `stickyNames`, and it is `Table`'s law
   rather than this file's
   The same transpose exposed the same table's other unpaid half: twenty-two
   columns overflow, the grid scrolls in its own container (correctly — the
   page never scrolls sideways), and the row's NAME goes with it. Scrolled to
   the end the reader sees bands of `S C E D` and cannot tell Admin from Guest.

   IT IS NOT THIS COMPONENT'S BUG AND THE FIX IS NOT THIS COMPONENT'S EITHER.
   `TableCell sticky` / `TableHead sticky` are the answer, they are new in
   `table.tsx` today, and every hard part is stated there: the pin is
   `inset-inline-start` so it mirrors, the paper must be opaque, the row's
   three washes are replayed on a cell that would otherwise cover them, and
   1.000 against its own ground is the correct number because a pinned column
   is a continuation of the paper rather than a panel on it. This file spends
   ONE PROP on the two cells that need it and adds no drawing of its own.

   AND THE PAPER IS A DATA ENTRY, NOT A GUESS. `stickyNames` is OFF by default
   and `stickyGround` names the paper the grid is standing on, because a pinned
   column that guessed would paint a pale band down the side of every grid that
   never scrolls. Three papers, which is every paper a kit table stands on:
   `"page"` (`--background`), `"panel"` (`--surface-panel`) and `"card"`
   (`--card`). The consuming application's grid stands on a panel and says so;
   the kit's own five-role grid never overflows and asks for none of it.

   CAPABILITIES ARE A PROP, SO A FIFTH IS A DATA ENTRY
   `capabilities` defaults to `PERMISSION_CAPABILITIES` — the client's four
   actions and nothing else is invented. The header, the cells, the run's
   width and the legend all count from the array, so a fifth capability costs
   one entry and never an edit to this file. `RIGHTS` and `WRITE_RIGHTS` are
   the capability ids and the three of them that CHANGE a record; the older
   `view / create / edit / delete` LADDER vocabulary is gone, because keeping
   a second set of words for the same four things is how two lists drift.
   (`create` returned on 2026-09-02 as an id, above — same word, and that is
   the point: there is one name for that switch and this file now uses it.
   Nothing else of the ladder's vocabulary came back with it.)

   The TABLE is `table.tsx`, transcribed from f3.css `.kw-matrix`; the slot's
   skin is `checkbox.tsx`'s; the hover name on a slot is `tooltip.tsx`.
   Nothing is redrawn here. This file is the grid, its header, the run, the
   narrow cards, the legend and the three registers, and nothing else.

   THE LAW THIS FILE OBEYS
   · PERMISSIONS HIDE (ch24.6). A collection the reader may not see is absent
     from the grid, and so is a role — not greyed, not locked, not a row or a
     column of blanks. A matrix with nothing visible renders its empty
     register, and one the reader may not open at all renders nothing.
   · A SLOT THE READER MAY NOT CHANGE IS NOT A CONTROL. It is the same mark
     without a press. 120 dead tab stops would be worse than none.
   · Disabled is a fill and an ink. Never an opacity. LOCKED IS NEITHER — it
     is a word on the row, ruled D4-B, and the cell keeps its full contrast.
   · The row is 56 — `--control-height-row`, ruling 28 — because `TableRow`
     says so, at every width.
   · The header is the kit's micro uppercase eyebrow on the `--hair-strong`
     section rule, which is `TableHead`'s own drawing.
   · No `border`, no literal colour, no `px`, no font size, no opacity for a
     state.
   · Focus is ONE global rule (tokens.css §8). A slot that can be changed is a
     real `<button>` and takes the ring at its own corner.
   · NO MANGO. 120 marks and not one of them is the brand.

   RENDERING CONTEXT
   `"use client"`. Change handlers are built during render and `Tooltip` is
   Radix underneath.
   ========================================================================= */

"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Skeleton } from "../skeleton/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip/tooltip";
import { ScreenRegister } from "../screen-renderer/screen-renderer";

/* ============================================================================
   The capabilities — the client's four, and nothing beyond them
   ========================================================================= */

/**
 * The four actions, in the order the client named them.
 *
 * They are not a ladder and none of them contains another: a role holds any
 * subset of the four, and all sixteen subsets are legal.
 *
 * `create`, NOT `add` — CORRECTED 2026-09-02. The client SAID "add" on
 * 2026-08-24 and these ids were transcribed from that sentence, but the right
 * has one name in the system that enforces it and that name is `create`:
 * `shared/workers/gating.ts` types it `"read" | "create" | "edit" | "delete"`,
 * the permission sheet stores `can_create`, and the glossary's own definition
 * of an access right reads "read, create, edit, or delete". An id is a key
 * two systems match on, not a transcript. The LABEL follows it rather than
 * keeping a second word for the same switch — "keeping a second set of words
 * for the same four things is how two lists drift" was already this file's own
 * rule, and it had been broken by this id since the day it was written.
 *
 * `see` IS DELIBERATELY LEFT ALONE and it is the same divergence unfixed: the
 * enforcing name for that one is `read`. It is not corrected here because it
 * was not asked for and it is one word in front of a reader, where `Create`
 * versus `Add` is not; the mapping the app keeps for it therefore stays. It
 * is logged rather than tidied silently.
 */
const RIGHTS = ["see", "create", "edit", "delete"] as const;

/**
 * The three that CHANGE a record, as against `see`, which only opens one.
 * Kept because it is the one true relation between the four — and it is a
 * FACT about them, never a tier a cell can be set to.
 */
const WRITE_RIGHTS = ["create", "edit", "delete"] as const;

export type PermissionRight = (typeof RIGHTS)[number];

/**
 * Which capabilities something grants. A missing key is `false`, and every
 * one of the sixteen shapes this type can take is legal.
 */
export type PermissionCells = Partial<Record<PermissionRight, boolean>>;

export interface PermissionCapability {
  /** Stable key. This is the value handed to `onChange`. */
  id: string;
  /**
   * The capability's word, in the reader's language. The four are See,
   * Create, Edit and Delete; nothing else is shipped.
   */
  label: string;
  /**
   * The single character drawn in the slot. Defaults to the first character
   * of `label`, upper-cased — which is a prop and not a substring rule,
   * because a language whose four words share an initial needs to choose its
   * own four marks.
   */
  initial?: string;
}

/** The four actions in words. Each one's initial is the slot's letter, and
    all four differ: S · C · E · D. */
const CAPABILITY_LABELS: Record<PermissionRight, string> = {
  see: "See",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
};

/**
 * The client's four. Derived from `RIGHTS` so the ids in the data and the
 * slots on the screen are one list.
 */
const PERMISSION_CAPABILITIES: readonly PermissionCapability[] = RIGHTS.map(
  (id) => ({ id, label: CAPABILITY_LABELS[id] }),
);

/**
 * @deprecated The ladder is gone — see the file header. Kept only so an
 * import written against the levels API still resolves; it is
 * `PERMISSION_CAPABILITIES`, and a call site should say so.
 */
const PERMISSION_LEVELS = PERMISSION_CAPABILITIES;

/**
 * @deprecated A cell is four independent capabilities, not one level. An
 * alias of `PermissionCapability`, kept for the same reason.
 */
export type PermissionLevel = PermissionCapability;

/* ============================================================================
   The axes
   ========================================================================= */

/**
 * A role a member can hold. The COLUMN in the kit's own orientation and the
 * ROW under `orientation="roles-as-rows"`; nothing on it changes either way.
 */
export interface PermissionRole {
  /** Stable key, and the value handed to `onChange`. */
  id: string;
  /** What the role is called, in the reader's language. */
  label: React.ReactNode;
  /**
   * The quiet line under it, drawn only where the role is a ROW — under
   * `orientation="roles-as-rows"` in the grid, and in the narrow render's
   * card. It is the symmetric half of `PermissionModule.description` and
   * exists for exactly that reason: a transposed grid should be a whole
   * drawing rather than one missing the line its rows can carry. A column head
   * is a micro uppercase eyebrow and has no room for prose, so this is not
   * drawn there and nothing is silently dropped — an untransposed grid never
   * asks for it.
   */
  description?: React.ReactNode;
  /**
   * The reader may not see this role. `false` removes the COLUMN entirely —
   * ch24.6: permissions hide, they do not disable. Defaults to `true`.
   */
  visible?: boolean;
}

/**
 * One collection. The kit's word for it is "collection"; the prop keeps the
 * commission's noun so no call site has to be rewritten to read this file.
 *
 * IT IS THE ROW BY DEFAULT AND THE COLUMN UNDER
 * `orientation="roles-as-rows"`, and every fact on it is a fact about the
 * COLLECTION either way — `held`, `rights` and `locked` do not move when the
 * drawing turns. A caller drawing roles down the side still passes its
 * collections here; passing them as `roles` to get them across the top is the
 * transpose `orientation` exists to retire, and it is what put `rights` on the
 * wrong axis. See the file header.
 */
export interface PermissionModule {
  /** Stable key, and the value handed to `onChange`. */
  id: string;
  /** What the collection is called, in the reader's language. */
  label: React.ReactNode;
  /** The quiet line under it — what the collection covers. */
  description?: React.ReactNode;
  /**
   * WHICH CAPABILITIES EACH ROLE HOLDS HERE, keyed by role id. A role with no
   * entry holds NOTHING: an unstated permission is a closed door, which is
   * the same answer the retired `fallbackLevel` gave and needs no prop to
   * say it now that the empty set is expressible.
   *
   * Any subset in any order; the run always draws the capabilities in
   * `capabilities` order, never in the order they appear here.
   */
  held?: Readonly<Record<string, readonly string[]>>;
  /**
   * WHICH CAPABILITIES THIS COLLECTION OFFERS AT ALL. Absent — the default —
   * every capability in `capabilities` is offered, which is every grid drawn
   * before this prop existed.
   *
   * A SWITCH AND A DECISION ARE NOT THE SAME THING. `held` says whether a
   * role has a capability here; this says whether the capability EXISTS here
   * to be given. A collection nobody can add to has no create switch, and a
   * grid that draws one anyway tells a reader they granted something when
   * they ticked it — the box is inert, and an inert box looks exactly like a
   * live one.
   *
   * An unoffered capability KEEPS ITS PLACE and loses its control: the slot
   * draws the kit's own no-value em dash instead of a well and a letter, is
   * never a tab stop and never toggles, is not counted as held even if `held`
   * names it, and is named in the cell's accessible sentence. The place is
   * kept because position is what carries the meaning in this drawing — four
   * collections drawing four, two, four and three slots would put every
   * letter under a different column and there would be nothing left to read
   * down.
   *
   * Ids not in `capabilities` are ignored; an empty array offers nothing.
   */
  rights?: readonly string[];
  /**
   * Roles whose cell cannot be changed here. `true` locks the whole row.
   *
   * The CELLS are unchanged by this — D4-B: a locked run is drawn exactly as a
   * live one and keeps every distance a live one has. What it earns is
   * `cursor-not-allowed`, the lock's phrase on hover, no tab stop, and a
   * `lockedLabel` mark beside the collection's name that names these roles
   * when they are not all of them.
   */
  locked?: boolean | readonly string[];
  /**
   * The reader may not see this collection. `false` removes the ROW entirely
   * — ch24.6. Defaults to `true`.
   */
  visible?: boolean;
}

export interface PermissionMatrixProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange"> {
  /** The collections. Down the side by default; across the top when the grid is turned. */
  modules: readonly PermissionModule[];
  /** The roles. Across the top by default; down the side when the grid is turned. */
  roles: readonly PermissionRole[];
  /**
   * WHICH WAY ROUND THE GRID IS DRAWN. `"modules-as-rows"` is CH27.12's own —
   * collections down the side, roles across the top — and is the default, so
   * every grid drawn before this prop existed is unchanged to the pixel.
   *
   * `"roles-as-rows"` turns it: roles down the side, collections across the
   * top. THE DATA DOES NOT MOVE. `held`, `rights` and `locked` stay on
   * `PermissionModule`, because whether a collection has a delete door is a
   * fact about the collection and the drawing turning is not a fact about
   * anything. This exists because a caller that transposed by hand — passing
   * its roles as `modules` — could not pass `rights` at all, and fifteen of its
   * eighty-eight boxes went on pretending to be switches. The whole argument,
   * including the shape that was refused, is in the file header.
   */
  orientation?: "modules-as-rows" | "roles-as-rows";
  /**
   * The slots in every cell, in the order they are drawn. Defaults to the
   * client's four. ANY NUMBER IS DRAWN: the run's width, the cells and the
   * legend all count from this array, so a fifth capability is a data entry
   * and never an edit to this file.
   */
  capabilities?: readonly PermissionCapability[];
  /**
   * The first column's heading when collections are the rows — the kit's own
   * word for the side axis. Under `orientation="roles-as-rows"` it names the
   * collections' column across the top instead, because it is the collections'
   * word wherever they are.
   */
  moduleLabel?: string;
  /**
   * The roles' heading, and the mirror of `moduleLabel`: the first column's
   * when roles are the rows, and the header nothing draws otherwise, because
   * the kit's own orientation gives every role its own column and its own
   * name. A prop with a default like every other user-visible string (§7.1).
   */
  roleLabel?: string;
  /**
   * PIN THE NAME COLUMN so it survives a sideways scroll. Off by default.
   *
   * A grid with more columns than its container overflows and scrolls in its
   * own box — which is correct, and is why the page never scrolls sideways —
   * and the column that says WHICH row this is goes with it. Scrolled to the
   * end the reader sees bands of `S C E D` with nothing naming them. It is
   * `TableCell sticky` doing the work and every hard part of it is argued in
   * `table.tsx`; this is the prop that turns it on for the heading and the
   * name cell of every row, at either orientation.
   *
   * OFF BY DEFAULT BECAUSE A PIN NEEDS AN OPAQUE PAPER and the wrong one is
   * visible at rest: a pinned column that guessed would paint a pale band down
   * the side of every grid that never scrolls. Say `stickyGround` with it.
   */
  stickyNames?: boolean;
  /**
   * WHICH PAPER THE GRID IS STANDING ON, for the pinned column to paint. Only
   * read when `stickyNames` is on.
   *
   * A pinned cell must be opaque or the scrolled cells read through it, and it
   * must be the SAME paper as the ground or it is a band rather than a
   * continuation — 1.000 against that ground is the correct measurement here
   * and the wrong one everywhere else in this kit. This component cannot see
   * what it was dropped on, so the caller names it: `"page"` for
   * `--background`, `"panel"` for `--surface-panel`, `"card"` for `--card`.
   * Defaulted to `"page"`, which is `TableHeader sticky`'s own default and its
   * own reason.
   */
  stickyGround?: "page" | "panel" | "card";
  /**
   * Fires on every change, with the capability that moved and where it
   * landed. ch27.12: "A change applies at once."
   *
   * Absent, every run is a plain mark and nothing is pressable — which is
   * state 10, and is NOT the same as `disabled`.
   */
  onChange?: (
    moduleId: string,
    roleId: string,
    capabilityId: string,
    next: boolean,
  ) => void;
  /**
   * Nothing may be changed right now, though somebody could. Every cell is
   * locked, so every row carries the mark and no slot is a tab stop — and
   * every run still draws at full contrast, because a grid you may not edit
   * is still a grid somebody has to audit.
   */
  disabled?: boolean;
  /** Which body is drawn. Only the rows swap; the header and legend stay. */
  state?: "ready" | "loading" | "empty" | "error";
  /** The grid's accessible name. Defaulted so no call site ships a nameless table. */
  label?: string;
  /**
   * A width below which the wide grid overflows and scrolls rather than
   * crushing its columns. Defaults to a 7.5rem name column plus one run and
   * its cell inset per role, computed from the role and capability counts —
   * so it is right for three roles and for eight, and for a fifth capability.
   */
  minWidth?: string;
  /**
   * The sentence under the grid. ch27.12's own, verbatim, and the reason the
   * legend is drawn at all: a screen that changes a permission on the press
   * has to say so.
   */
  footnote?: React.ReactNode;
  /** Draw the legend under the grid. On, because the kit draws it. */
  legend?: boolean;
  /** The legend's word for a slot that is filled. */
  heldLabel?: string;
  /** The legend's word for a slot that is not. */
  notHeldLabel?: string;
  /**
   * THE WORDS FOR A CAPABILITY THIS COLLECTION DOES NOT OFFER — `rights`.
   * They name the state in every cell's accessible sentence, and they label
   * the legend's third register.
   *
   * THE LEGEND EARNS THAT REGISTER, unlike the locked one that left it: a
   * legend turns a mark that is not words into words, the lock's mark IS
   * words on the row a few millimetres away, and this mark is an em dash. It
   * is drawn only when a shown row actually withholds something, because a
   * register teaching a mark the grid does not contain is a mark the reader
   * has to hold for nothing.
   */
  notOfferedLabel?: string;
  /**
   * THE MARK'S OWN WORDS — the artifact's phrase, ch10. Drawn BARE, running
   * on from the collection's name after an em dash in `--ink-tertiary`, on
   * any row holding a locked cell; raised in a `Tooltip` over any locked run;
   * and appended to a locked cell's accessible name.
   *
   * It is not a legend phrase (D4-B: a locked run is drawn exactly as a live
   * one, so there is no locked register for a legend to translate) and it is
   * not a chip (D6-B, "word only": the container is gone).
   */
  lockedLabel?: string;
  /**
   * The mark's words when only SOME roles are locked on a row. Defaulted to
   * `"<phrase>: <role>, <role>"`, and a prop for the same reason
   * `formatCellLabel` is one: word order and punctuation differ between
   * languages. It is never called when every shown role on the row is locked
   * — that row draws the bare phrase.
   */
  formatLockedLabel?: (lockedLabel: string, roleLabels: readonly string[]) => string;
  /** What an empty subset is called in an accessible name. */
  nothingLabel?: string;
  /** How many skeleton rows the loading body draws. */
  loadingRows?: number;
  /** What a screen reader hears while the grid loads. */
  loadingLabel?: string;
  /** The empty register's sentence. */
  emptyTitle?: React.ReactNode;
  /** The line under it. */
  emptyDescription?: React.ReactNode;
  /** The error register's sentence. */
  errorTitle?: React.ReactNode;
  /** The line under it. */
  errorDescription?: React.ReactNode;
  /** The retry. */
  errorAction?: React.ReactNode;
  /**
   * The accessible name of a whole cell, built from the collection, the role
   * and the capabilities it holds. Defaulted, and a prop because word order
   * differs between languages: a run announced as four letters says nothing.
   *
   * `notOffered` — the fifth argument — is the capabilities this collection
   * does not offer at all, in `capabilities` order. It is a NEW PARAMETER and
   * not a new prop: a function of four parameters is assignable to a type of
   * five, so every existing `formatCellLabel` still compiles and still
   * behaves, and a caller who wants the clause in a different place in their
   * sentence has it in the formatter they already own rather than in a second
   * one they have to discover. The default appends it after the lock's clause
   * — it is the coarser fact, and it is the same reason the lock's clause
   * sits after the held list.
   */
  formatCellLabel?: (
    moduleLabel: string,
    roleLabel: string,
    held: readonly string[],
    locked: boolean,
    notOffered: readonly string[],
  ) => string;
  /**
   * The accessible name of ONE slot. Defaulted, and a prop for the same
   * reason. This is the string a screen reader reads on the checkbox itself.
   */
  formatSlotLabel?: (
    moduleLabel: string,
    roleLabel: string,
    capabilityLabel: string,
    held: boolean,
  ) => string;
}

/* ----------------------------------------------------------------------------
   The grid, once the axes have been decided

   THREE INTERNAL SHAPES AND NOTHING EXPORTED. `orientation` turns which of the
   caller's two arrays is the row and which is the column, and these are what
   that decision produces: an entry on the top axis, a cell that still knows
   its real collection and its real role, and a row that carries the name, the
   quiet line and the lock's mark. Everything downstream reads THESE and is
   never told which way round the grid is, because none of it has a side.

   `PermissionModule` and `PermissionRole` both satisfy `GridAxisEntry` and
   both satisfy the head of `GridRow`, which is not a coincidence to lean on
   quietly: it is why `description` was added to a role — a row can carry a
   quiet line at either orientation, and half a drawing would have been the
   worse answer.
   ------------------------------------------------------------------------- */

/** One entry on whichever axis runs across the top. */
interface GridAxisEntry {
  id: string;
  label: React.ReactNode;
}

/** The `data-*` a row or a cell carries for the entity it actually is. */
interface GridEntityAttr {
  "data-module"?: string;
  "data-role"?: string;
}

/** One cell. The pair is (collection, role) at every orientation. */
interface GridCell {
  key: string;
  module: PermissionModule;
  role: PermissionRole;
  attr: GridEntityAttr;
}

/** One row: a collection's, or a role's. */
interface GridRow {
  key: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  attr: GridEntityAttr;
  cells: readonly GridCell[];
}

/* ----------------------------------------------------------------------------
   Reading the data
   ------------------------------------------------------------------------- */

/** True when this role's cell on this row cannot be changed. */
function isLocked(
  module: PermissionModule,
  roleId: string,
  disabled: boolean,
): boolean {
  if (disabled) return true;
  if (module.locked === true) return true;
  if (Array.isArray(module.locked)) {
    return (module.locked as readonly string[]).includes(roleId);
  }
  return false;
}

/**
 * True when this collection offers this capability at all. Absent `rights` is
 * every capability, so a grid written before the prop existed is unchanged.
 */
function offers(module: PermissionModule, capabilityId: string): boolean {
  return module.rights === undefined || module.rights.includes(capabilityId);
}

/**
 * True when this role holds this capability on this row.
 *
 * AN UNOFFERED CAPABILITY IS NEVER HELD, whatever `held` says. The two can
 * disagree — a right withdrawn from a collection leaves rows behind it — and
 * there is only one honest reading of the disagreement: a capability that
 * does not exist here cannot be one somebody has. The sheet is not corrected
 * and nothing is written; the grid simply does not count it.
 */
function holds(
  module: PermissionModule,
  roleId: string,
  capabilityId: string,
): boolean {
  if (!offers(module, capabilityId)) return false;
  return (module.held?.[roleId] ?? []).includes(capabilityId);
}

/** The word a reader can read out loud, for an accessible name. */
function plain(node: React.ReactNode, fallback: string): string {
  return typeof node === "string" ? node : fallback;
}

/** The character in the slot. */
function initialOf(capability: PermissionCapability): string {
  return capability.initial ?? capability.label.charAt(0).toLocaleUpperCase();
}

/* ----------------------------------------------------------------------------
   The slot — `Checkbox`'s skin, with the capability's initial where the tick
   would be. See the file header for the three ways it differs and why.
   ------------------------------------------------------------------------- */

/** Everything a slot wears in every state. */
const SLOT_SHAPE = [
  /* `checkbox.tsx`: 22 square, centred content, never shrinking. 22 is off
     the ruling-28 scale and has no token; it is the literal the kit already
     uses (T10-2), not a snapped value. */
  "inline-grid size-[1.375rem] shrink-0 place-content-center",
  /* Ruling 03's 6 belongs to the RUN — see the header. The interior corners
     are square so four held slots fuse into one shape. */
  "rounded-none",
  "first:rounded-s-[var(--radius-select)] last:rounded-e-[var(--radius-select)]",
  /* The letter. `text-micro` carries the eyebrow's 0.08em, which pushes a
     single centred character off its own axis, so the tracking is returned
     to normal — a token, not a magic number. */
  "text-micro font-[var(--font-weight-medium)] tracking-normal",
  "transition-[background-color,box-shadow,color]",
  "duration-[var(--duration-colour)] ease-kwapso",
].join(" ");

/**
 * THE TWO SKINS — and there are two, not four, which is the whole of D4-B.
 *
 * HELD      `--surface-inverse` + `--ink-on-inverse`, and NO hairline — the
 *           fill is the edge once it is on, which is what lets adjacent held
 *           slots fuse.
 * NOT-HELD  `--card` + `--ink-tertiary` behind `--hairline-strong`, override
 *           42's resting field edge.
 *
 * A LOCKED CELL TAKES THE SAME TWO. It used to take a swapped disabled pair
 * that measured 1.004 on soft paper in dark; the client ruled D4-B and the
 * locked skin is gone rather than excused. `locked` is not an argument here
 * because it no longer changes a single declaration — it changes the cursor,
 * the hover pill and the row's mark, which are elsewhere and are not fills.
 */
function slotSkin(held: boolean): string {
  return held
    ? "bg-surface-inverse text-ink-on-inverse"
    : "bg-card text-ink-tertiary shadow-[var(--hairline-strong)]";
}

/**
 * THE THIRD SKIN, AND IT IS THE ABSENCE OF ONE — an unoffered capability.
 *
 * NO FILL AND NO EDGE, because the well IS the switch. A slot's paper well
 * behind override 42's hairline is what says "there is a control here and it
 * is off"; where there is no control there is nothing to draw a well around,
 * so the slot keeps only its 1.375rem place in the run.
 *
 * AND A MARK, WHICH IS WHY THIS IS NOT "DRAW NOTHING". Rule 5.4 says prefer
 * nothing to a placeholder and never invent a dash to fill a hole — that is
 * about a VALUE THAT HAS NOT ARRIVED, where a dash claims knowledge the
 * component does not have. This is the opposite case: the dash IS the
 * knowledge. And the empty box cannot carry it, for a reason this file
 * already has written down: a not-held slot's own edge measures **1.526 light
 * / 2.185 dark**, the system's accepted failure, so an empty slot beside a
 * not-held one would differ by an edge that is below the 3:1 floor. A reader
 * could not tell "no switch" from "switch, off" — which is R36's whole defect
 * reproduced inside the kit. The mark is `--ink-tertiary`, **6.506 / 7.928**
 * against 4.5, the same ink and the same measurement the letter already
 * relies on; it is legible whether or not the wells around it are.
 *
 * THE GLYPH IS THE KIT'S OWN NO-VALUE EM DASH, not a coined one — the mark
 * the demo already draws for a value that is not there in five places
 * (`last selected: —`, an unfilled description term, a token with no value,
 * a row hidden from the reader, an imported record with no VAT). It is not a
 * string prop: it is the same glyph in Arabic, Urdu and Persian, and the
 * WORDS for this state are `notOfferedLabel`, which is a prop. It carries
 * `aria-hidden` for the reason `LockMark` does — the cell's own sentence
 * already names every capability the row does not offer, and announcing it
 * per slot as well would read the same fact five times.
 */
const SLOT_UNOFFERED = "text-ink-tertiary";

/** The kit's own mark for a value that is not there. See `SLOT_UNOFFERED`. */
const NO_VALUE = "—";

/**
 * THE PAPER A PINNED NAME COLUMN PAINTS, one entry per paper a kit table
 * stands on. `stickyGround` chooses; this file never guesses.
 *
 * NAMED UTILITY CLASSES, not `bg-[var(--…)]`. tokens.css §8's ground scopes
 * are keyed on the CLASS, so the arbitrary form paints the identical colour
 * and rebinds nothing underneath it — and `check-contrast.mjs` reads the tree
 * of named ground classes to work out what sits on what, so an arbitrary fill
 * here would be a ground the contrast law cannot see.
 *
 * A TABLE AT COLUMN ZERO, AND THAT IS NOT A STYLE PREFERENCE. This was first
 * written as an object literal indexed inside the render, which is a form the
 * ground walker does not resolve: a probe that put the WRONG paper under a
 * pinned column — `--background` on a `--surface-raised` ground, two different
 * names and one colour, 1.000, the exact bug that law exists to catch — came
 * back GREEN. `COLUMN_DOT[dot]` is the shape the check states it reads, so
 * this is that shape, and the probe goes red now.
 */
const STICKY_GROUND: Record<"page" | "panel" | "card", string> = {
  page: "bg-background",
  panel: "bg-surface-panel",
  card: "bg-card",
};

/** The run's shell. One shape, rounded at its two ends only. */
const RUN_SHELL =
  "inline-flex shrink-0 items-center overflow-hidden rounded-[var(--radius-select)]";

/**
 * A run drawn purely as an example — in the legend, where it stands for a
 * register rather than for a cell. `held` decides each slot, so the same two
 * lines draw "held" and "not held".
 *
 * There is no third call. The locked register left the legend when the locked
 * skin left the component: a run drawn locked would now be pixel-identical to
 * one of these two, and the mark for a lock is a word on the row.
 */
function LegendRun({
  capabilities,
  held,
  offered,
}: {
  capabilities: readonly PermissionCapability[];
  held: (index: number) => boolean;
  /** Absent — every slot is a switch, which is the two original registers. */
  offered?: (index: number) => boolean;
}) {
  return (
    <span aria-hidden="true" className={RUN_SHELL}>
      {capabilities.map((capability, index) =>
        offered !== undefined && !offered(index) ? (
          <span key={capability.id} className={cn(SLOT_SHAPE, SLOT_UNOFFERED)}>
            {NO_VALUE}
          </span>
        ) : (
          <span key={capability.id} className={cn(SLOT_SHAPE, slotSkin(held(index)))}>
            {initialOf(capability)}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * THE MARK — the artifact's own phrase, and now the artifact's own SHAPE for
 * it, which is no shape at all.
 *
 * RULED "WORD ONLY", 2026-08-24. It shipped this morning on a
 * `Badge variant="secondary"`. The chip's FILL measured 1.339 / 1.214 light
 * and 1.324 / 1.471 dark against the row's paper, short of a 3:1 non-text
 * floor, and went back to the client as `verify/decide-2.html` §D6. Their
 * answer, verbatim: **"d6. i dont understand, did i not decide like
 * permissions word only? if unclear do another visual"** — which is an
 * answer, and it reads on the ruling they had already given: "a word on the
 * row" never meant a pill around the word. So the pill goes. No `Badge`, no
 * fill, no radius, and therefore no fill left to fail a floor.
 *
 * THE REGISTER IS THE ARTIFACT'S, AND IT IS NOT THE EYEBROW. The kit's micro
 * uppercase eyebrow was on the table as an option, but the artifact uses it
 * in exactly one way — as a HEADING ABOVE A TITLE ("System · 5 roles" over
 * "Roles", "Group · 118 archived" over "Collection", "Read-only while
 * editing" over a field group). It never annotates a row with it. What the
 * artifact DOES draw for a state on a row, twice, is bare words at the row's
 * own size in `--fg3` after an EM DASH:
 *
 *     Shift-handover.docx — unsupported format
 *     Some selected — indeterminate
 *
 * The second is a row in a list whose state is named; the first is the same
 * shape on a file row. That is this case exactly, so that is what is built:
 *
 *     Capacity — Locked by policy: Lead, Guest
 *
 * AND THE EM DASH IS LOAD-BEARING. It is what stops the phrase reading as a
 * suffix to the collection's name — three separations at once and none of
 * them a container: the dash, the drop to `--ink-tertiary`, and the drop out
 * of the name cell's medium weight to light. Remove any one and it starts to
 * look like part of the name; that is the whole risk of taking the pill away
 * and it is answered with the kit's own device rather than a new one.
 *
 * Still no hue, so ruling 26 is still satisfied by there being nothing for
 * colour to say alone — and now there is not even a fill to argue about.
 *
 * It is `aria-hidden` because the same phrase is already inside every locked
 * cell's accessible name in that cell's own sentence. Announced here too it
 * would be read once per row and once per cell, which is six extra readings
 * of a fact the reader has already been given.
 */
function LockMark({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      data-slot="permission-matrix-locked"
      /* No size of its own: it inherits the row's, which is what both of the
         artifact's two instances do. Light, so it cannot be read as more of
         the name — the name cell is medium by `TableCell`'s own rule. */
      className="font-light text-ink-tertiary"
    >
      {" — "}
      {children}
    </span>
  );
}

/**
 * The run: every capability, always in the same place, read as one shape.
 *
 * `pressable` decides the element and nothing else about the drawing. A
 * pressable run is a group of real checkboxes; a static one is a single
 * labelled image, because 120 marks that do nothing must not be 120 tab
 * stops.
 */
function PermissionRun({
  capabilities,
  isHeld,
  isOffered,
  locked,
  lockedLabel,
  cellLabel,
  slotLabel,
  onToggle,
}: {
  capabilities: readonly PermissionCapability[];
  isHeld: (capability: PermissionCapability) => boolean;
  /**
   * Whether this collection offers the capability at all. An unoffered slot
   * is the same drawing in both runs and in neither is it a control — a live
   * run is a group of checkboxes with a HOLE in it, not a group with a dead
   * member.
   */
  isOffered: (capability: PermissionCapability) => boolean;
  locked: boolean;
  /** The lock's phrase, raised on hover over a locked run. */
  lockedLabel: string;
  cellLabel: string;
  slotLabel: (capability: PermissionCapability, held: boolean) => string;
  /** Absent — the run is a mark, not a control. */
  onToggle?: (capability: PermissionCapability, next: boolean) => void;
}) {
  const pressable = onToggle !== undefined && !locked;

  /* No explicit width: the run is `capabilities.length` × 1.375rem, which for
     the client's four is the 5.5rem the design page states, and which a fifth
     capability widens without a second number to keep in step. */
  if (!pressable) {
    /* The same drawing whether it is locked or merely read-only — D4-B: a
       locked run is a live run. What separates the two is not a fill:
         · LOCKED  takes `cursor-not-allowed`, chapter 10's own disabled
           cursor, so the pointer says no before a click can be spent on it;
           and it raises the lock's phrase on hover, so the reason is on the
           cell and not only on the row.
         · READ-ONLY (state 10, no `onChange`) takes neither. A reference
           table is not a frozen form and must not claim to be one. */
    const run = (
      <span
        className={cn(RUN_SHELL, locked && "cursor-not-allowed")}
        role="img"
        aria-label={cellLabel}
      >
        {capabilities.map((capability) => (
          <span
            key={capability.id}
            aria-hidden="true"
            className={cn(
              SLOT_SHAPE,
              isOffered(capability)
                ? slotSkin(isHeld(capability))
                : SLOT_UNOFFERED,
            )}
          >
            {isOffered(capability) ? initialOf(capability) : NO_VALUE}
          </span>
        ))}
      </span>
    );

    if (!locked) return run;

    return (
      <Tooltip>
        {/* `asChild` on a span: Radix attaches the hover and the
            `aria-describedby` and adds NO tab stop, which is the whole
            requirement — the reason reaches the pointer without turning 120
            dead marks into 120 dead stops. The same words are already in
            `cellLabel`, so nothing here is pointer-only. */}
        <TooltipTrigger asChild>{run}</TooltipTrigger>
        <TooltipContent>{lockedLabel}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span className={RUN_SHELL} role="group" aria-label={cellLabel}>
      {capabilities.map((capability) => {
        const held = isHeld(capability);

        /* NOT A DEAD CONTROL — NO CONTROL. It keeps its place and takes the
           no-value mark, with no button, no tab stop and no tooltip: the
           tooltip on a live slot says the capability's WORD, and naming a
           capability that is not on offer here is the sentence this prop
           exists to stop the grid saying. The fact is in the cell's own
           accessible name, once. */
        if (!isOffered(capability)) {
          return (
            <span
              key={capability.id}
              aria-hidden="true"
              className={cn(SLOT_SHAPE, SLOT_UNOFFERED)}
            >
              {NO_VALUE}
            </span>
          );
        }

        return (
          <Tooltip key={capability.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="checkbox"
                aria-checked={held}
                aria-label={slotLabel(capability, held)}
                onClick={() => {
                  onToggle(capability, !held);
                }}
                className={cn(SLOT_SHAPE, slotSkin(held), "cursor-pointer")}
              >
                <span aria-hidden="true">{initialOf(capability)}</span>
              </button>
            </TooltipTrigger>
            {/* The letter is a legend a reader learns once; the pill is where
                they learn it. It repeats the capability's word and nothing
                else — the state is already on the control's own name. */}
            <TooltipContent>{capability.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}

/**
 * Who can open what.
 *
 * TEN STATES
 *  1. default        — a header of micro uppercase ROLE names on the section
 *                      rule, then one 56 row per collection carrying one
 *                      four-slot run per role, and the legend under it.
 *                      `orientation="roles-as-rows"` turns those two axes and
 *                      nothing else: the same run, the same slots, the same
 *                      legend, the same sentence in every cell. A
 *                      collection may offer FEWER capabilities than the grid
 *                      draws (`rights`): the slot keeps its place and takes
 *                      the kit's no-value em dash instead of a well and a
 *                      letter, so the columns still line up and the reader
 *                      can tell a decision that does not exist from one that
 *                      is merely off.
 *  2. hover          — the ROW takes `--accent`, the kit's neutral wash,
 *                      which is `TableRow`'s own treatment; a changeable SLOT
 *                      raises its capability's word in a `Tooltip`, and an
 *                      unoffered slot raises nothing, because there is no
 *                      capability there to name. Neither
 *                      is an opacity, and the slot's own fill does NOT move
 *                      on hover: `checkbox.tsx` draws no hover on a mark
 *                      (override 42) and a run whose slots lit under the
 *                      pointer would break the silhouette that is the whole
 *                      reading.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once,
 *                      at the control's own radius. The scroll container sets
 *                      `overflow-x: auto` and never `overflow: hidden`, and
 *                      `Table` carries the scroll padding that keeps a ring in
 *                      an off-screen column whole. A PINNED name column is the
 *                      one place that padding falls short — a scrollport
 *                      cannot measure what is pinned to its own edge — and
 *                      `table.tsx` records that rather than inventing a width.
 *  4. active/pressed — the capability flips. The change is instant, which is
 *                      what the footnote states.
 *  5. disabled       — per cell (`module.locked`) or whole grid (`disabled`),
 *                      and under the client's D4-B ruling it is NOT a skin.
 *                      The run is drawn exactly as a live one and keeps every
 *                      distance a live one has; the lock is the artifact's
 *                      phrase in BARE WORDS — no chip, D6-B "word only" —
 *                      running on from the collection's name after an em dash
 *                      in `--ink-tertiary`, naming the roles when only some
 *                      are locked. The run takes `cursor-not-allowed` and
 *                      raises the phrase on hover, and is still no tab stop.
 *                      The old swapped disabled pair measured 1.004 on soft
 *                      paper in dark and is gone rather than excused.
 *  6. loading        — `state="loading"`: skeleton rows inside the body, and
 *                      skeleton cards narrow. The HEADER stays, because it is
 *                      the part that names the roles being fetched, and
 *                      replacing the whole table would make the page jump
 *                      when the rows land.
 *  7. empty          — `state="empty"`, or every collection or every role
 *                      hidden: chapter 21's register in one full-width cell.
 *                      `Table`'s own JSDoc puts the empty register here rather
 *                      than in the primitive, "because only the composition
 *                      knows the column count a full-width empty cell would
 *                      need" — and here it is `roles.length + 1`.
 *  8. error          — `state="error"`: the register in its error tone,
 *                      `role="alert"`, in the same full-width cell. Never a
 *                      poppy row: a failed fetch is not a blocked record.
 *  9. selected       — a held capability IS the selection, and it is the
 *                      slot's own checked state. There is no selected ROW
 *                      here: a permission grid has no bulk bar, because 27.12
 *                      gives it one action and that action is the change. A
 *                      capability the collection does not offer can never be
 *                      selected, whatever `held` says — an unoffered slot is
 *                      not a switch that happens to be off.
 * 10. read-only      — no `onChange`: every run is a labelled mark and the
 *                      screen reads completely. Deliberately NOT the locked
 *                      skin — a reference table is not a frozen form, and 120
 *                      greyed marks would say the opposite of what is true.
 *                      An unoffered slot is read-only in a third sense and is
 *                      drawn the same way in every run: there is nothing to
 *                      change, rather than nothing you may change now.
 *
 * THREE BREAKPOINTS
 *  mobile   — BELOW 45rem THE MATRIX TURNS, which is CH27.12's own narrow
 *             instruction: "the matrix becomes one card per collection with
 *             its roles listed inside … It never becomes a horizontal
 *             scroller a thumb has to hunt through." One block per collection,
 *             one line per role, the run at full size — 30 lines for the
 *             kit's six collections and five roles, and the chapter's own
 *             "2 more roles" truncation is DROPPED because all five fit
 *             beside a 5.5rem run.
 *
 *             AT THIS WIDTH THE RUN READS RATHER THAN PRESSES. A 1.375rem
 *             slot is well under the 44 touch row, and the kit's answer to a
 *             mark that small is to widen the LABEL, which a four-slot run
 *             has nowhere to put. So the narrow run is a mark with its subset
 *             in its accessible name and the change is made at a width that
 *             has room for it. Nothing is truncated and nothing scrolls
 *             sideways.
 *
 *             AND IT TURNS WITH THE GRID. Under
 *             `orientation="roles-as-rows"` the card is a ROLE and the lines
 *             inside it are collections — the chapter's instruction read on
 *             the axis the caller chose, rather than a second layout.
 *  tablet   — the table, at 45rem and up. With five roles the grid's floor is
 *             42.5rem, so it is already inside its container when it appears
 *             and there is nothing to scroll. WITH TWENTY-TWO COLUMNS IT IS
 *             122rem and it scrolls at every width anybody owns, which is what
 *             `stickyNames` is for: the floor counts the COLUMNS, and a grid
 *             that overflows still has to say which row you are reading.
 *  desktop  — the same. The row is 56 at every width, by ruling.
 *
 * RTL — safe. `Table` scrolls on a mirroring axis, every cell inset is `px-*`,
 * the run's two rounded ends are `rounded-s` / `rounded-e`, and the name
 * column is first in DOM order and therefore at the reading start in Arabic,
 * Urdu and Persian — pinned or not, since `TableCell sticky` pins to
 * `inset-inline-start` and mirrors with it. The four slots read in the
 * client's order in both directions, which is correct: they are a fixed
 * sequence of named places, not a quantity.
 */
const PermissionMatrix = React.forwardRef<HTMLDivElement, PermissionMatrixProps>(
  (
    {
      className,
      modules,
      roles,
      capabilities = PERMISSION_CAPABILITIES,
      orientation = "modules-as-rows",
      moduleLabel = "Collection",
      roleLabel = "Role",
      stickyNames = false,
      stickyGround = "page",
      onChange,
      disabled = false,
      state = "ready",
      label = "Permissions",
      minWidth,
      footnote = "A change applies at once and is written to the activity log.",
      legend = true,
      heldLabel = "held",
      notHeldLabel = "not held",
      notOfferedLabel = "not offered",
      /* Sentence case since D4-B: it is a chip's label on a row now, not a
         clause in a legend. Inside an accessible name it reads identically. */
      lockedLabel = "Locked by policy",
      formatLockedLabel,
      nothingLabel = "nothing",
      loadingRows = 5,
      loadingLabel = "Loading…",
      emptyTitle,
      emptyDescription,
      errorTitle,
      errorDescription,
      errorAction,
      formatCellLabel,
      formatSlotLabel,
      ...props
    },
    ref,
  ) => {
    const describeCell =
      formatCellLabel ??
      ((
        collection: string,
        role: string,
        held: readonly string[],
        locked: boolean,
        notOffered: readonly string[],
      ) =>
        `${role} · ${collection}: ${held.length === 0 ? nothingLabel : held.join(", ")}${
          locked ? `, ${lockedLabel}` : ""
        }${
          /* The row's own shape, after the role's. `nothing` already says the
             role holds none of them; only this says which of them were never
             on offer, and a reader who cannot see the dashes has no other way
             to be told. */
          notOffered.length === 0 ? "" : ` · ${notOffered.join(", ")}: ${notOfferedLabel}`
        }`);

    const describeLock =
      formatLockedLabel ??
      ((phrase: string, roleLabels: readonly string[]) =>
        `${phrase}: ${roleLabels.join(", ")}`);

    const describeSlot =
      formatSlotLabel ??
      ((collection: string, role: string, capability: string, held: boolean) =>
        `${role} · ${collection} · ${capability}: ${held ? heldLabel : notHeldLabel}`);

    /* Permissions HIDE. A hidden collection is not a greyed row and a hidden
       role is not a greyed column — both are absent. */
    const shownRoles = roles.filter((role) => role.visible !== false);
    const shownModules = modules.filter((module) => module.visible !== false);

    const resolved =
      state === "ready" && (shownModules.length === 0 || shownRoles.length === 0)
        ? "empty"
        : state;

    /* WHICH AXIS IS WHICH, decided once and read everywhere below. The two
       arrays are the caller's own and neither is copied: what turns is which
       one the header counts and which one a row carries. */
    const rowsAreRoles = orientation === "roles-as-rows";
    /* The columns across the top — the axis the header names and the width
       floor counts. It always meant "columns"; until today the word for that
       was "roles". */
    const headings: readonly GridAxisEntry[] = rowsAreRoles ? shownModules : shownRoles;
    const headingLabel = rowsAreRoles ? moduleLabel : roleLabel;
    const nameLabel = rowsAreRoles ? roleLabel : moduleLabel;
    const columns = headings.length + 1;

    /* THE GRID, ONE ROW AT A TIME, and every cell still knows its real
       collection and its real role. That is the whole of the rotation: the
       pair a cell is built from never changes, only which half of it is the
       row. Nothing downstream — `holds`, `offers`, `isLocked`, the sentence,
       the run — is told which orientation it is in, because none of them has a
       side. */
    const grid: readonly GridRow[] = rowsAreRoles
      ? shownRoles.map((role) => ({
          key: role.id,
          label: role.label,
          description: role.description,
          attr: { "data-role": role.id },
          cells: shownModules.map((module) => ({
            key: module.id,
            module,
            role,
            attr: { "data-module": module.id },
          })),
        }))
      : shownModules.map((module) => ({
          key: module.id,
          label: module.label,
          description: module.description,
          attr: { "data-module": module.id },
          cells: shownRoles.map((role) => ({
            key: role.id,
            module,
            role,
            attr: { "data-role": role.id },
          })),
        }));

    /* Does any shown row withhold a capability? Off the rows themselves, not
       off a prop, so the legend's third register cannot survive the data that
       earned it. */
    const hasUnoffered = shownModules.some((module) =>
      capabilities.some((capability) => !offers(module, capability.id)),
    );
    /* Where the legend puts its hole: the second slot, or the last one in a
       run too short to have a second. */
    const gap = Math.min(1, capabilities.length - 1);

    /* A 7.5rem name column, and one run plus `TableCell`'s own `px-3` inset
       per COLUMN. Derived from both counts so nothing has to be re-typed when
       either changes — including when the columns become the collections. */
    const floor =
      minWidth ??
      `calc(7.5rem + ${String(headings.length)} * (${String(capabilities.length)} * 1.375rem + 2 * var(--space-3)))`;

    const stickyPaper = STICKY_GROUND[stickyGround];

    /**
     * THE ROW'S MARK, at the scope of the lock — `null` when the row holds no
     * locked cell. One rule covers all three ways a lock can arrive: a whole
     * grid `disabled`, a whole row `locked`, and a list of role ids. The first
     * two lock every cell on the row and take the bare phrase; the third names
     * what it locked, because a bare mark on a partly-locked row is a lie.
     *
     * IT NAMES THE OTHER AXIS, whichever that is. A collection's row names the
     * ROLES that are locked on it; a role's row names the COLLECTIONS. The
     * lock itself never moved — it is still stated per role inside a module —
     * so this reads the same cells either way and only the words change.
     */
    const lockMarkFor = (row: GridRow): React.ReactNode => {
      const locked = row.cells.filter((cell) =>
        isLocked(cell.module, cell.role.id, disabled),
      );
      if (locked.length === 0) return null;
      const words =
        locked.length === row.cells.length
          ? lockedLabel
          : describeLock(
              lockedLabel,
              locked.map((cell) =>
                rowsAreRoles
                  ? plain(cell.module.label, cell.module.id)
                  : plain(cell.role.label, cell.role.id),
              ),
            );
      return <LockMark>{words}</LockMark>;
    };

    /** One cell, wide or narrow — the same run either way. */
    const renderRun = (module: PermissionModule, role: PermissionRole, live: boolean) => {
      const name = plain(module.label, module.id);
      const roleName = plain(role.label, role.id);
      const locked = isLocked(module, role.id, disabled);
      const heldWords = capabilities
        .filter((capability) => holds(module, role.id, capability.id))
        .map((capability) => capability.label);
      /* In `capabilities` order, not `rights` order — the same rule the run
         itself follows, so the sentence and the slots read left to right
         together. */
      const notOfferedWords = capabilities
        .filter((capability) => !offers(module, capability.id))
        .map((capability) => capability.label);

      return (
        <PermissionRun
          capabilities={capabilities}
          isHeld={(capability) => holds(module, role.id, capability.id)}
          isOffered={(capability) => offers(module, capability.id)}
          locked={locked}
          lockedLabel={lockedLabel}
          cellLabel={describeCell(name, roleName, heldWords, locked, notOfferedWords)}
          slotLabel={(capability, held) =>
            describeSlot(name, roleName, capability.label, held)
          }
          onToggle={
            live && onChange !== undefined
              ? (capability, next) => {
                  onChange(module.id, role.id, capability.id, next);
                }
              : undefined
          }
        />
      );
    };

    const register =
      resolved === "error" ? (
        <ScreenRegister
          tone="error"
          title={errorTitle}
          description={errorDescription}
          action={errorAction}
        />
      ) : (
        <ScreenRegister tone="empty" title={emptyTitle} description={emptyDescription} />
      );

    return (
      <TooltipProvider>
        <div
          ref={ref}
          data-slot="permission-matrix"
          data-state={resolved}
          className={cn("flex min-w-0 flex-col gap-1", className)}
          {...props}
        >
          {/* ---- 45rem and up: the matrix ------------------------------- */}
          <Table
            aria-label={label}
            minWidth={floor}
            containerClassName="hidden min-[45rem]:block"
          >
            <TableHeader>
              <TableRow>
                {/* The name column's own heading, pinned with the column it
                    heads — a pinned column whose heading scrolled away would
                    answer half the question. The paper is the caller's, and
                    `TableHead` takes it the way `TableHeader sticky` has
                    always taken one: a class the call site knows. */}
                <TableHead
                  scope="col"
                  sticky={stickyNames}
                  className={stickyNames ? stickyPaper : undefined}
                >
                  {nameLabel}
                </TableHead>
                {headings.map((heading) => (
                  <TableHead key={heading.id} scope="col">
                    {heading.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {resolved === "loading" ? (
                /* The header stays; only the rows wait. Each skeleton row keeps
                   the 56 so the grid does not jump when the rows land. */
                Array.from({ length: loadingRows }, (_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell colSpan={columns}>
                      <Skeleton
                        announce={index === 0}
                        label={loadingLabel}
                        className="w-full"
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : resolved !== "ready" ? (
                <TableRow>
                  {/* One full-width cell — the composition knows the count. */}
                  <TableCell
                    colSpan={columns}
                    className="first:whitespace-normal first:font-light"
                  >
                    {register}
                  </TableCell>
                </TableRow>
              ) : (
                grid.map((row) => (
                  <TableRow key={row.key} {...row.attr}>
                    {/* THE NAME CELL, pinned or not. Pinned it paints the paper
                        the caller named and replays the row's washes — all of
                        that is `TableCell`'s, argued in `table.tsx`, and none
                        of it is redrawn here. */}
                    <TableCell
                      sticky={stickyNames}
                      className={stickyNames ? stickyPaper : undefined}
                    >
                      <span className="flex flex-col">
                        {/* The name, and running on from it the lock's own
                            words. Plain inline flow, not a flex row with a
                            gap: the em dash IS the separation, which is the
                            artifact's own shape for this, and the phrase must
                            sit on the name's baseline rather than beside it as
                            a box. It stays on the name's LINE, so a locked row
                            is still the 56 ruling 28 gives it. */}
                        <span>
                          {row.label}
                          {lockMarkFor(row)}
                        </span>
                        {row.description !== undefined && row.description !== null ? (
                          /* The quiet line under the row's name — the caption
                             step in tertiary ink, and it MAY wrap even though
                             the name column does not, because a description
                             that never wrapped would widen the grid without
                             limit. */
                          <span className="mt-1 whitespace-normal text-caption font-light text-ink-tertiary">
                            {row.description}
                          </span>
                        ) : null}
                      </span>
                    </TableCell>

                    {row.cells.map((cell) => (
                      <TableCell
                        key={cell.key}
                        {...cell.attr}
                        /* `TableCell` squares a cell that holds a checkbox at
                           the row height, which is right for one mark and
                           wrong for a run of four. Same selector, so
                           tailwind-merge replaces it rather than fighting it. */
                        className="[&:has([role=checkbox])]:w-auto"
                      >
                        {renderRun(cell.module, cell.role, true)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* ---- below 45rem: CH27.12's own narrow render ---------------- */}
          <div
            data-slot="permission-matrix-narrow"
            className="flex flex-col gap-3 min-[45rem]:hidden"
          >
            {resolved === "loading"
              ? Array.from({ length: loadingRows }, (_, index) => (
                  <div
                    key={`loading-${index}`}
                    className="rounded-[var(--radius)] bg-surface-panel p-4"
                  >
                    <Skeleton
                      announce={index === 0}
                      label={loadingLabel}
                      className="w-full"
                    />
                  </div>
                ))
              : resolved !== "ready"
                ? register
                : grid.map((row) => (
                    <div
                      key={row.key}
                      {...row.attr}
                      className="rounded-[var(--radius)] bg-surface-panel p-4"
                    >
                      {/* The same mark in the same place and the same shape —
                          running on from the row's name after an em dash — so
                          the narrow render and the grid say the lock the same
                          way. Inline flow here too, and this one MAY wrap: a
                          card is narrow and the phrase is prose. */}
                      <div className="text-sm font-[var(--font-weight-medium)]">
                        {row.label}
                        {lockMarkFor(row)}
                      </div>
                      {row.description !== undefined && row.description !== null ? (
                        <div className="mt-1 text-caption font-light text-ink-tertiary">
                          {row.description}
                        </div>
                      ) : null}
                      {/* ONE LINE PER CELL, which is one line per role in the
                          kit's orientation and one per collection when the
                          grid is turned — CH27.12's own instruction read on
                          the axis the caller chose. Nothing is truncated and
                          nothing scrolls sideways either way. */}
                      <div className="mt-3 flex flex-col">
                        {row.cells.map((cell) => (
                          <div
                            key={cell.key}
                            {...cell.attr}
                            className="flex h-[var(--control-height-input)] items-center justify-between gap-3 text-caption"
                          >
                            {/* Wraps rather than truncating: the narrow
                                render's promise is that nothing is dropped. */}
                            <span className="min-w-0">
                              {rowsAreRoles ? cell.module.label : cell.role.label}
                            </span>
                            {/* Reads, does not press — see THREE BREAKPOINTS. */}
                            {renderRun(cell.module, cell.role, false)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
          </div>

          {legend && resolved === "ready" ? (
            /* The kit's own legend row: the footnote, then the registers the
               grid actually uses, pushed to the inline end. It is DERIVED
               from `capabilities` — a fifth appears here without this file
               being touched — and it WRAPS at 380 rather than joining the
               grid's scroll, because it is prose.

               `padding: 14px 12px 2px` — the block-start is 14, not 12. */
            <div
              data-slot="permission-matrix-legend"
              className={cn(
                "flex flex-wrap items-center gap-y-2 px-3 pt-[var(--space-3h)]",
                "gap-x-[var(--space-3h)] text-caption text-ink-tertiary",
              )}
            >
              {footnote === undefined || footnote === null ? null : <span>{footnote}</span>}

              {/* THE ORDER, named once — and drawn as BARE LETTERS on the
                  slot's own 1.375rem pitch, never as a run. A run here would
                  be pixel-identical to the "not held" register two items
                  along and the legend would be saying one thing twice. The
                  words are the capabilities' own, so this line cannot
                  disagree with the slots above it. */}
              <span className="inline-flex items-center gap-[var(--space-2h)] sm:ms-auto">
                <span aria-hidden="true" className="inline-flex shrink-0 items-center">
                  {capabilities.map((capability) => (
                    <span
                      key={capability.id}
                      className="inline-grid size-[1.375rem] shrink-0 place-content-center text-micro font-[var(--font-weight-medium)] tracking-normal text-ink-tertiary"
                    >
                      {initialOf(capability)}
                    </span>
                  ))}
                </span>
                <span className="text-badge">
                  {capabilities.map((capability) => capability.label).join(" · ")}
                </span>
              </span>

              <span className="inline-flex items-center gap-[var(--space-2h)]">
                <LegendRun capabilities={capabilities} held={() => true} />
                <span className="text-badge">{heldLabel}</span>
              </span>

              <span className="inline-flex items-center gap-[var(--space-2h)]">
                <LegendRun capabilities={capabilities} held={() => false} />
                <span className="text-badge">{notHeldLabel}</span>
              </span>

              {/* THE THIRD REGISTER, AND IT IS DRAWN ONLY WHEN THE GRID HAS
                  ONE. The locked register left this row with the locked skin
                  (D4-B) because the lock's mark is already words on the row;
                  this mark is an em dash, which is exactly what a legend is
                  for. The register shows it WHERE IT LIVES — one hole in a
                  run of wells, not a lone dash — because position is what the
                  reader has to learn, and a dash on its own teaches the glyph
                  and not the reading. `gap` is the second slot where there is
                  one and the last otherwise, so a two-capability or a
                  one-capability grid draws a legend that is still true. */}
              {hasUnoffered ? (
                <span className="inline-flex items-center gap-[var(--space-2h)]">
                  <LegendRun
                    capabilities={capabilities}
                    held={() => false}
                    offered={(index) => index !== gap}
                  />
                  <span className="text-badge">{notOfferedLabel}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </TooltipProvider>
    );
  },
);

PermissionMatrix.displayName = "PermissionMatrix";

export {
  PermissionMatrix,
  PERMISSION_CAPABILITIES,
  PERMISSION_LEVELS,
  RIGHTS,
  WRITE_RIGHTS,
};
