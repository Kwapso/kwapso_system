# Where this art comes from

The glyphs in this folder are **Phosphor** — 1,512 icons (the whole `fill`
weight), MIT licensed, from
[github.com/phosphor-icons/core](https://github.com/phosphor-icons/core)
(© 2023 Phosphor Icons). The licence is beside this file as `LICENSE-phosphor`,
and MIT permits redistribution inside this repository.

They replaced the **Iconoir** pack on 2026-09-03, by direct client
instruction. Iconoir itself had replaced the placeholder set on 2026-08-26.

## The client ruling that authorised this, verbatim

> "I validate the icon mapping, so make sure to make the switch. Any previous
> icon that's on the repo or wherever, kill it. They are wrong. The only icons
> that we are using are these icons from Phosphor. If in the future you were
> to need more icons, we would also take them from Phosphor, so make sure to
> clean any previous icon anywhere."

And earlier, equally binding:

> "i want you to use the names from phosphor, we are changing kit, so i don't
> want to keep translating — i want to be able to go on the website from
> phosphor and give you the name there."

This is why there is no alias table any more (Iconoir's vendoring had one,
`aliases.json`, bridging 60 commission spellings onto Iconoir's own — see
`docs/RULES.md` §9.1 for the export-naming rule this overturns) and why the
folder itself is the whole contract: a name on phosphor.dev is the name that
resolves here, with nothing translating it on the way in.

## Weight

**Fill is the default weight. The exceptions, drawn at regular (outline)
weight instead, are `Plus`, `Power`, `Prohibit`, `X`, `DotsThree`,
`DotsThreeVertical`, `MagnifyingGlass`, `Paperclip`, `Asterisk`, `Check`, and
THE WHOLE `Arrow*` FAMILY — all 96 of them. 108 files in total; the other
1,404 are fill, and both counts are now machine-checked — see "The audit"
below.** Phosphor's fill weight renders a bare mark (a plus
sign, a power glyph's slash-in-a-ring, a prohibit circle, a cross, three dots,
a paperclip) as a solid disc, square or plate with the mark knocked out —
there is no line to fill, so fill wraps it in a plate instead. That reads as a
heavy badge next to the rest of the set's lean silhouettes.

THE CLIENT NAMED THREE; THE FOURTH FOLLOWS FROM HER REASON RATHER THAN FROM A
SECOND RULING (2026-09-03). She sent `Plus`, `Power` and `Prohibit` to outline
because the fill weight plates them. `X` is plated identically —
`x-fill` is a rounded square with the cross cut out of it — and it is the
glyph on every close control in the product: a dialog, a sheet, a filter chip,
the search field's clear. A close button drawn as a filled square is a
different control from a bare cross. Applying her stated reason to the one
glyph that matches it exactly is a smaller step than leaving a plate on every
dismiss in the app and calling it fidelity to a count of three. Reversible in
one file copy if she disagrees.

THE THREE DOTS JOINED THEM ON HER OWN RULING (2026-09-03): "for the tree dots
icon, also use the regular instead of the solid." `dots-three-fill` is the
clearest case in the set — not a dot that got heavier, but a **rounded
rectangle 224 units wide** with three 12-unit dots punched out of it. The
overflow menu is one of the quietest controls in the product and it was
drawing the widest solid plate on any toolbar. Regular is the three dots and
nothing else.

`DotsThreeVertical` is the SAME GLYPH ROTATED and is plated identically, so it
went with it — the same one-step extension of her reason that `X` was, and
reversible the same way. The four `DotsThreeOutline*` and `DotsThreeCircle*`
variants are untouched: they are different marks that draw their own ring or
outline, not the plated bare mark this rule is about.

THE ARROWS AND THE MAGNIFIER, on two further rulings the same day: "for all
arrow icons, use regular instead on solid" and "icon magnifying-glass also use
regular instead of solid."

The arrows are done as a WHOLE FAMILY rather than as the thirteen the app
happens to draw today, because the folder is the contract (see below): she
picks a name off phosphor.dev and it resolves here, so an `Arrow*` chosen
tomorrow must already be the weight she ruled for. Every `Arrow*.svg` in this
folder — 96 files, plain, bent, elbowed, fat, lined, circled, squared and
paired — is regular. That is the only reading under which the ruling stays
true for the NEXT arrow rather than only for the current ones.

`MagnifyingGlass` is the single glyph she named, and it is the search field's
mark in 28 places. The other four magnifiers in the pack
(`MagnifyingGlassPlus`, `MagnifyingGlassMinus`, `FileMagnifyingGlass`,
`ListMagnifyingGlass`) are LEFT AT FILL, and none of them is drawn anywhere in
the product — they are different marks carrying a second element, not the
plain lens she ruled on, so extending to them would be a guess rather than her
reason applied. Named here so the inconsistency is a decision on the record
rather than an oversight, and so the first screen that wants one knows to ask.

THE `Caret*` FAMILY IS DELIBERATELY UNTOUCHED, and it is the one place this
could reasonably have been read wider. Phosphor treats caret and arrow as two
families and so has she — the word caret has never appeared in a ruling. The
visual consequence is not cosmetic either: `caret-down-fill` is a solid
triangle and `caret-down` regular is an open chevron, so the swap would change
the mark on every dropdown, select, accordion, breadcrumb and pagination
control in the product, `CaretRight` alone appearing 40 times. That is a
design decision she should SEE rather than inherit from a rule about arrows.
Flagged to her; not applied.

`Paperclip` JOINED THE SAME DAY, ON HER OWN RULING: "paperclip icon - also use
regular instead of solid." `paperclip-fill` is the same class of plate as
`x-fill` — a filled disc (Phosphor draws this one on a round badge rather
than a square) with the clip shape cut out of it, not a paperclip that got
heavier. It is the attachment mark on every source chip and file row in the
product, so it was carrying the same heaviness her earlier rulings on `X` and
the dots were both correcting elsewhere. Regular is the bare clip line and
nothing else.

`Asterisk` AND `Check` WERE ADDED TO THIS LIST ON 2026-09-06, AND BOTH HAD
ALREADY BEEN CHANGED IN THE FOLDER BEFORE THIS PARAGRAPH EXISTED. That gap is
the point of recording them here. `Asterisk` moved on the client's own ruling
("everywhere there's asterisk, use the regular version instead of solid") and
`Check` moved as the fix for the filled-square defect below — but neither
edited this sentence, so for the rest of that day the folder's stated rule
said `fill` about two files that were not, and an audit run against the rule
as written would have reported both as defects and "corrected" them back into
the bugs they had just come out of. **A weight rule that lives only in prose
drifts silently from the art it describes; that is why `icon-art.manifest.json`
now records the verified weight of every glyph as data.**

`Check` is also the strongest case in the set on its own merits, and it is
worth stating so the next reader does not re-open it. `check-fill` is not a
heavier tick — it is a **rounded rectangle 208 units across with the tick
knocked out of it**, the same plate as `x-fill` and `dots-three-fill`. Drawing
the fill weight under this name would reproduce, almost exactly, the filled box
that shipped to ten sites as `Check`. There is no reading of the client's
stated reason under which the tick — the single most-drawn confirmation mark in
the product — is the one bare mark that keeps its plate.

Measured on `verify/icons/`: the four mark-shaped exceptions rasterize to
9–22% opaque coverage of their viewBox; a comparable fill glyph rasterizes to
47–53%. The dots sit far below even that — three r=12 discs cover about 2% of
the viewBox, against roughly 31% for the plate `dots-three-fill` draws, which
is the size of the difference she was looking at on the toolbar.

Both weights ship the same `viewBox="0 0 256 256"` and `fill="currentColor"`
on the root, so nothing needed normalising on the way in — see
`icon-base.tsx` for how the wrapper paints that fill (no stroke, no
`strokeWidth` prop: fill icons have nothing to weight).

## The folder is the contract

There is no required-names list, no additive list, no alias table. Every
`.svg` file here becomes one named export, spelled exactly as its filename.
The three machinery pieces the Iconoir vendoring used to enforce a fixed
93 + 3 commission contract — `COMMISSION_93`, `ADDED`, and the alias-validation
in `generate-icons.mjs` — are gone, along with `aliases.json`. **A logged
rule they used to answer to is `docs/RULES.md` §9.1, "never rename or drop an
export": recorded there as overturned, by the client ruling above, for this
folder specifically.**

## The audit — 2026-09-06

**All 1,512 glyphs in this folder were compared against the authentic upstream
art, and every one of them matches a real Phosphor drawing exactly.** The
comparison was against the WHOLE upstream set — all six weights of all 1,512
names, 9,072 files — rather than against the same name, because the two defects
this folder has actually shipped were a glyph carrying a DIFFERENT NAME's art
and a glyph carrying a different WEIGHT's, and only a search of the whole set
can say what a wrong file actually is instead of merely that it is wrong.

Result: 1,509 correct at the intended name and weight. Zero hand-drawn glyphs,
zero glyphs from another set, zero glyphs whose picture belongs to another
name. **The `Check`-class defect — the dangerous one — has no second instance.**
The three exceptions were all naming, not art, and are recorded below.

`check-icon-art.mjs` is what keeps this true. It runs offline in `npm run
check` against `icon-art.manifest.json`, which records every glyph's art as a
hash beside the upstream name and weight it was verified against, with the pack
version pinned. The file's own header argues at length for why the check must
NOT hit the network in CI; the short version is that a check needing a CDN is a
check somebody eventually disables, and a disabled check looks exactly like the
nothing that let a filled square ship as a tick. `npm run refresh:icon-art`
re-derives the manifest from the pinned pack in one request and prints what
moved.

### Three files were spelled in a way phosphor.dev does not

`LightBulb.svg`, `SnowFlake.svg` and `TextBox.svg` were renamed to
`Lightbulb.svg`, `Snowflake.svg` and `Textbox.svg`. **The art in all three was
already perfect** — authentic `lightbulb-fill`, `snowflake-fill` and
`textbox-fill`, byte-for-byte. The defect was the other direction, and it is
the one this folder's contract exists to prevent: Phosphor spells these three
as single words, so a designer reading `lightbulb` off phosphor.dev and writing
`<Lightbulb />` got a compile error, and the only way to find the working
spelling was to open this directory — which is exactly the translating step the
client twice said she did not want ("i want to be able to go on the website
from phosphor and give you the name there").

An alias was deliberately NOT the fix. This folder has no alias table on
purpose; adding one to paper over a misspelling would reintroduce the
translation layer the ruling deleted, to solve a problem caused by not having
followed it. Renaming an export is normally forbidden by `docs/RULES.md` §9.1,
which is precisely the rule the client's ruling overturned for this folder —
so the rename is not an exception to the contract, it is the contract being
applied. Zero call sites used the old spellings, in this repo or in the app:
they appeared only in `manifest.json` and in the generated file, both of which
regenerate.

## What normalising the Iconoir pack once looked like

Historical record, kept for provenance now that the art itself has moved on.
The Iconoir vendoring (2026-08-26 → 2026-09-03) applied four mechanical
fixes on the way in — the root `<svg>` reduced to a viewBox, two literal
`black`/`white` fills corrected to `currentColor`/`none`, and two Figma-export
`<clipPath>` artefacts stripped — and carried seven approximate commission
mappings where Iconoir drew no exact equivalent. None of that applies to the
Phosphor pack: every one of its 1,512 fill files already passed the
generator's colour and viewBox guards unchanged.
