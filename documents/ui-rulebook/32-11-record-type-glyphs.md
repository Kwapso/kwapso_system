# 11. Record type glyphs

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## 11. Record type glyphs

### G1: a record type carries a glyph

Every ticket, story, task, sprint and roadmap phase shows a small pictograph in the
leading slot of its row and in the header band's square, so the type is readable without
reading.

> **DECIDED, 17 Aug 2026: option 1.** UI-CONVENTIONS.md §5 now reads "no emoji IN COPY"
> and defines a TYPE MARK with four conditions it must meet. The law was changed first,
> deliberately and in writing, exactly as this section asked. **G2 below applies as
> written.** The reasoning is recorded in §5 itself: the owner asked for these twice in
> writing, Aurora asked for the same thing independently, and the agency's legacy data has
> carried a glyph and a colour on every ticket, story and sprint type for years. A rule
> that forbids what the business already does had stopped describing reality.

**Superseded, kept for the record.** UI-CONVENTIONS.md §5 previously said
"**No emoji.** Anywhere. (This is a hard design-language rule.)" and
`shared/rules/registry.ts` pins it. The in-rule route, in order of preference:

1. **Amend UI-CONVENTIONS.md §5** to read "no emoji **in copy**", and add the glyph to
   §4 as a *type mark*, which is what it is: it occupies the slot a kit glyph would,
   it is `aria-hidden`, it never appears inside a sentence, and it is always accompanied
   by the type word in the eyebrow or the column header. Then G2 applies as written.
2. **Or** implement G2 with the kit's own glyphs from `CONCEPT_ICON` (`web/lib/pages.ts`)
   instead, which changes nothing in the law book but gives up the colour that makes a
   type readable at a glance in a long list. *(Fact updated 7 Sep 2026: this option used to
   say "lucide glyphs", which R39 now forbids outright — no file in `web/`, `web-portal/`
   or `shared/web/` may import a UI package. `CONCEPT_ICON`'s values are Phosphor names the
   kit draws through `@shared/ui/foundations/icons`, and the line number is dropped rather
   than corrected because it has already moved once.)*

Do not ship option 1 by quietly writing emoji into components. Change the law first, or
take option 2.

Evidence for the request: `A-4.00.11`, `A-4.05.42`, `A-4.06.45`, `A-4.07.02`, `P-4.10.12`.
The old app puts a coloured pictograph on every row of every work collection and it is
the single fastest read on the screen.

### G2: the mapping, if option 1 is taken

One map, one file, sitting beside `CONCEPT_ICON` in `web/lib/pages.ts`. No emoji appear
in this document, so each glyph is named by its Unicode name and codepoint.

| Record | Glyph | Codepoint |
|---|---|---|
| Ticket, request | Thought balloon | U+1F4AD |
| Ticket, question | Red question mark | U+2753 |
| Ticket, issue | Warning sign | U+26A0 U+FE0F |
| Story, feature | Sparkles | U+2728 |
| Story, change | Twisted rightwards arrows | U+1F500 |
| Story, fix | Bug | U+1F41B |
| Task | Check mark button | U+2705 |
| Sprint, implementation | Gem stone | U+1F48E |
| Sprint, validation | Eyes | U+1F440 |
| Sprint, refinement | Sparkles | U+2728 |
| Sprint, enhancement | Rocket | U+1F680 |
| Sprint, training | Graduation cap | U+1F393 |

Every one of these is read directly off a screenshot: `A-4.05.42` (change, fix),
`A-4.06.45` (feature, change), `A-4.07.02` (issue), `A-4.06.36` (question, request),
`A-3.55.53` and `P-4.10.12` (gem, eyes, sparkles, rocket, graduation cap),
`A-4.00.11` (rocket, graduation cap).

The glyph is rendered as:

```tsx
<span aria-hidden className="shrink-0 text-base leading-none">{RECORD_GLYPH[type]}</span>
```

### G3: in the header band the glyph sits in a rounded square

`size-14 sm:size-[72px] rounded-xl bg-muted grid place-items-center text-3xl`.

Evidence: `A-3.57.42`, `A-3.58.01`, `A-4.05.45`, `A-4.05.52`, `A-4.07.25`. When the
record has a real logo (an app, an account) the logo replaces the glyph in the same
square, `object-contain` per UI-CONVENTIONS.md C5.

### G4: a glyph never carries meaning on its own

Every glyph is paired with its type word somewhere on the same screen: the eyebrow on a
detail, the "TYPE" column or the group heading on a collection. Screen readers get the
word, not the pictograph.

Evidence: `A-4.05.42` shows the glyph in the NAME column and the word in the TYPE column
of the same row.

### G5: a record never appears without its face

**The rule.** Wherever a record or a dropdown value is shown to be **chosen** or
**scanned** — a picker option, a row in a collection, a row in a nested panel inside
another record's screen — it is drawn with its visual beside its name, in this order of
preference:

1. its own picture, where it has one;
2. its type's glyph ([G1](#g1-a-record-type-carries-a-glyph)), where the type has one;
3. its initial, where it has neither.

Never nothing. **And never the glyph written INTO the words** — a pictograph inside a
sentence is the one shape [W6](#w6-no-emoji-in-the-words-and-none-in-the-data-behind-them)
refuses. Two pickers had worked around the missing slot by concatenating an emoji into the
label, which put a pictograph in the search index and on the trigger.

**Where it is actually held, and why that shape.** There is no honest way to look at a piece
of markup and say "this is a record row" — `.map(x => <li>` matches attachments, replies,
comments and steps, none of which are records. So it stands on the three CHOKEPOINTS where
a face is lost instead: the picker option types must DECLARE the visual fields, so a type
cannot drop a picture before any component sees it; every list recipe must name its
`leading` column; and the one shared nested row takes its mark as a **required** prop, with
`null` a real and visible answer.

**Why it is a rule rather than a fix.** A visual is a key identifier, not decoration — the
owner said so three times across two rounds, and each time it was applied where he pointed
and nowhere else. The census then found the real size: **thirty-three** pickers, not one of
which COULD show a visual, because the option type had no field for one; ten of fourteen
list recipes naming no leading column; around twenty nested panels drawing bare words for
records that lead with a glyph on their own screen.

**Law.** [R35](../RULES.md) (`records-carry-their-face`).

**AMENDED 18 Sep 2026 — initials draw only when there is no image.** The client's ruling,
verbatim, over a screenshot of a member card showing a photo with the initials overlaid on
top of it: *"look at first screenshot bug, we see the avatar AND the initials! should not
be, initials only if avatar is empty. implement everywhere."* `RecordMark`'s own fallback
order already reads picture → glyph → initial, but a shipped card drew BOTH the picture and
the initials at once rather than treating the list as an either/or — the initials render
only in the branch where no picture resolves, everywhere `RecordMark` draws a face.

**Status: ruled, in build, 18 Sep 2026.**

**AMENDED A SECOND TIME, 18 Sep 2026 ~06:40 (Round 17) — the account filter shows the
fallback chain, not initials alone.** The client's ruling, verbatim: *"on filter account i
want to see the icons, not only initials."* The account filter's own option list was reading
straight to step 3 of this rule's own fallback order — picture, then type glyph, then
initial — skipping the account's own logo where it has one; the filter now draws the same
three-step chain every other picker and row already honours, so an account with a logo shows
it there too, and only an account with neither a logo nor a resolvable glyph falls back to
its initial.

**Status: ruled, in build, 18 Sep 2026 (filter icons lane).**

### G6: an image fills its box; it is never shrunk to fit inside one

**The rule.** The client, 2026-09-09, blanket and unhedged: *"everywhere for images: do
fill, not fit!"* Every picture either front door draws is `object-cover` — it fills the box
it is given and is CROPPED to it. Never `object-contain`, `object-fill`, `object-none` or
`object-scale-down`, and never a `fit="contain"` handed to the kit's `Image`, which turns
exactly that value into exactly that class.

**The cost is the law, not a bug in it.** A wide wordmark in a small square loses its ends
and shows its middle. What that was weighed against is the aggregate, which is the only
place a fit is ever visible: a contained logo sits smaller, paler and a different SHAPE
than the filled face beside it and the letter tile below it. On staging only 48 of 134
accounts hold a picture at all, so most boxes are a solid letter tile either way.

**One exception, and it names the distinction to reason with.** A ticket ATTACHMENT's
preview, where the picture IS the content — rather than a mark standing for a record whose
name is written beside it.

**And a default is not a choice.** `RecordMark`, which draws almost every picture in the
product, may not grow a `fit` prop again. It had one; its square default was `contain`; and
a default applies to every caller who never made the decision.

**Law.** [R60](../RULES.md) (`image-fills`).

---
