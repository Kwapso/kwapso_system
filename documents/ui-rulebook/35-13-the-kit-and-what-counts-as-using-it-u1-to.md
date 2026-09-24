# 13. The kit, and what counts as using it (U1 to U4)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## 13. The kit, and what counts as using it (U1 to U4)

The twelve sections above decide how a screen is arranged. This one is about the lego
itself: which parts of the kit this app has taken up, and where a part of the app lives
when you write one. It is the only section here that constrains a FILE rather than a
pixel — which is why it is short, and why every rule in it is a written decision rather
than a taste.

Read it beside "Do not do" [#2](#do-not-do) ("do not re-implement a library primitive
locally"): that line tells you to check before you build, and these three are what make
"we checked" a thing somebody can verify a year later.

### U1: every part of the kit is either reached or has a written reason

**The rule.** The kit at `shared/ui/` ships a set of components and three foundations
(icons, tokens, motion), and **every one of them** resolves to one of two things: an
adoption this app really reaches, or a line saying why not. The owner's instruction:
*"all 118 components should be imported, and if you're not using some, I understand that,
but there should be nothing hard-coded."*

**How many there are is DERIVED and written down nowhere** — `kitInventory()` in
`scripts/kit-coverage.mjs` reads it off the pinned tree, so the number moves with the pin
instead of rotting in four documents.

**"Reached", not "imported", and the difference cost seven real adoptions.** Counting
import lines undercounts in one direction, always by dropping a genuine adoption: six kit
parts reach this app only THROUGH another part it has already adopted (notes through
Comments, folder through Tabs, progress through the file upload), and `motion` reaches both
front doors **only through a CSS `@import`** in their own `globals.css` — a reference no
JavaScript grep can see in either direction, because there is no import line in that
language to miss. So the walk closes over the kit's own cross-references, in both languages
the kit speaks.

**What a reason has to be.** One sentence a non-technical reader can check: no surface in
this app has this shape, or adopting it would break another rule. Each one names a GAP to
fix upstream. The list is rot-checked both ways, so it can only shrink.

**Law.** [R46](../RULES.md) (`component-coverage`).

### U2: every whole-screen composition the kit ships is DECIDED

**The rule.** U1's sibling, one directory level up: the kit's `compositions/` are its
screen-shaped assemblies, and each one is either adopted for real or carries a written
reason — a structural mismatch, a shape this app already assembles from other adopted parts
under a different name, a real gap it should or should never have, or a question left for
the owner.

**Two outcomes are acceptable and one is not.** Adopted, or deliberately not used for a
stated reason. A composition nobody looked at, or hand-rolled screen UI that quietly
duplicates one, is the unacceptable result. The owner's own words: *"make sure that we get
47 out of 47 compositions… if there are some compositions that we don't use, I completely
get that, but flag those… there should be nothing that we have hard-coded unless it's some
kind of composition that does not exist."*

**Why a check rather than a note.** Two lanes had worked through 37 of the 47 by hand, in
prose, with nothing behind it — so the count could regress the moment a kit update landed a
new composition, or the moment somebody hand-rolled a screen that duplicated one, and
nothing would have said so.

**Law.** [R45](../RULES.md) (`composition-coverage`).

### U3: a new component joins a folder, and the folder says what belongs in it

**The rule.** `web/components/` has **no top-level files**: one folder per MODULE
(`tickets/`, `work/`, `accounts/`, `team/`, …) or per KIND (`shell/`, `records/`,
`deep-link/`, `assistant/`, `screens/`). What belongs in each is written **once**, one line
per folder, in `web/components/README.md` — and the permitted set is derived from that
file's own rows, so the paragraph a person reads and the rule a build enforces cannot
disagree, because there is only one of them.

**Three ways to fail**: a component left loose at the top level, a folder nobody described,
and a described folder nobody has.

**The two axes, because neither pair is guessable** and that is exactly why the words exist
and not just the check: `tickets-screen.tsx` sits in `tickets/` because it draws a module,
and `home-screen.tsx` in `screens/` because there is no home module; `collection-heading.tsx`
sits in `records/` because every collection reuses it, and `collection-content.tsx` in
`deep-link/` because only the routing shell renders it.

**One practical consequence for everything else in this book.** Name a component by
BASENAME wherever you can, never by folder path: the source walks recurse, so a law that
finds a screen by name still finds it after a move, while a literal path in a document or a
test has to be moved by hand (UI-CONVENTIONS.md §1).

**Law.** [R57](../RULES.md) (`component-folders`).

### U4: an app-side override targets a token the kit owns, never a class name it happens to emit

**The rule.** The team-chip colour ruling — client, 2026-08-31, pointing at a Contact's
"Contact"/"Can sign in" pills: *"there's a color that you keep getting wrong on the pills.
use this color #F7F2EB (the main token for beige)"* — was correctly made that day and was
DEAD for two weeks without anyone knowing. The fix matched `Badge`'s literal
`bg-surface-quiet` class; a later kit resync (v1.2.13 → v1.2.15) turned that class into
`bg-[var(--badge-quiet-fill, var(--surface-quiet))]`, a custom property with a fallback,
and the old class selector matched nothing from that point on. Every plain badge app-wide
quietly kept drawing the kit's default grey, invisibly, because a dead selector fails
green — nothing asserted the class it targeted still existed. The client re-flagged the
identical colour a second time, Settings › Team, 2026-09-14: *"the chips in team this color
#F7F2EB."*

**The fix moved to the seam.** `[--badge-quiet-fill:var(--surface-panel)]` on `<body>` in
both front doors' root layouts (`web/app/layout.tsx`, `web-portal/app/layout.tsx`) —
`Badge`'s own documented escape hatch, ordinary CSS custom-property inheritance, no class
string to go stale the next time the kit's build changes its generated output.

**The rule is the lesson, not the colour.** A CLASS the kit emits is compiled output and is
nobody's contract; a TOKEN or a custom property the kit documents as an override point is
the contract. An app-side override that matches the former dies silently on the kit's next
resync; one that rebinds the latter survives it — the same seam `IDENTITY_ROW`
(`web/components/records/record-chrome.tsx`) and the tickets triage card already use for a
LOCAL rebind of the identical property.

---
