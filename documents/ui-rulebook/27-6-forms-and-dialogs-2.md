# 6. Forms and dialogs (part 2 of 2)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

### F18: a title fits one line on a MacBook Air

**The rule.** The client's two rulings, 18 Sep 2026, verbatim: *"for all titles (main,
details, all) i would like to limit the lnght to what would fit in 1 line in a laptiop.
this menas a max charactes for titles in the forms (not sutting it) wdyt? and ow many
cahracters would taht be? consider text size regualr and the monitor size of a
macbook"* — and, shown a side-by-side of three enforcement options: *"for title lenght.
set this limit considering macbook air, enforce with e3."* Every title-shaped field (a
ticket's Title, a story's and a task's "What needs doing", a meeting's "What it is
about", a wave's and a sprint's name, an app's "What it's called", an account's Name, a
knowledge source's "What is it called?", and a to-do's "What we need from them") is
capped at `TITLE_MAX_CHARS` characters — 50 — and a title already longer than that,
written before the ceiling existed, is truncated with an ellipsis wherever it is drawn
on one line rather than rejected.

**The number.** Canvas-measured, not guessed (artifact "Title Length"): how many
characters of regular-weight text fit on ONE LINE, at MacBook Air width (1440×900), in
the app's three one-line title steps — the record heading (64 characters fit), the
collection heading (65), the list title cell (57). The narrowest of the three, rounded
down for a margin (a shorter monitor, a wider character, a translated word running
longer than the English one): 50. One constant for all three rather than three separate
ceilings, because one title moves between all three renderers — a ticket is a record
head on its own screen and a list cell in Tickets — and a field that fits its narrowest
home fits every home.

**E3.** The client's own shorthand from the side-by-side that settled this: the THIRD of
three enforcement options offered — a hard cap in every form (the input's own
`maxLength`, so the 51st character never types) plus an ellipsis fallback for a record
that already exceeded the ceiling before it existed. Not E1 (truncate silently, no cap)
and not E2 (cap only, no fallback for old records).

**The counter.** [F6](#f6-a-character-limited-text-field-shows-its-counter-under-the-input-right-aligned)'s
own format, `0/50`, drawn now through the kit `Field`'s own `count`/`countMax` footer
slot rather than a hand-built line under the input — a NUMBER, not a sentence, so it is
not a hint under [F12](#f12-a-form-carries-no-hints)'s ban.

**What is a title and what is not.** A dropdown VALUE (a Choice) is not a title. A
ROLE's name, a PROCESS's name and a STEP's name are named records of their own, but
outside this ruling's worked examples and the canvas measurement, and are left
uncapped. A PERSON's name is not a title — the client's own distinction, carried into
the law — so the contact-creation field ("Marta Bergman") is untouched.

**Status: ruled, in build, 18 Sep 2026.**

**Law.** [R87](../RULES.md) (`title-length`). A source census over the form field
configs (every `FieldConfig` literal for a title field sets `validation.maxLength` to
`TITLE_MAX_CHARS` and its `<Input>` carries the same `maxLength`) and over the matching
write doors (`requireText`/`optionalText` capped at the same constant, positionally,
R20's own discipline); a render assertion that every one-line title renderer —
`clampRecordHeading` (`shared/web/record-heading.tsx`), `CollectionHeading`, and
`RecordTable`'s own first column — truncates with an ellipsis and keeps the full title
reachable through its `title` attribute.

**AMENDED 18 Sep 2026 — an imported title is kept whole.** Shown the choice between clamping
an imported title on the way in, leaving it uncapped, or refusing it outright, the client's
ruling, verbatim: *"l1."* **I1**: the fifty-character cap binds what a person TYPES — every
title field's `maxLength` and its matching write door stay exactly as ruled above — but a
title that arrives already written somewhere else, from a FILE NAME (a knowledge upload with
no typed title of its own) or from a Google import (Drive, Gmail, Calendar, Chat), is kept
WHOLE on write, uncapped, and is only ever shortened where a one-line renderer already
truncates any other title — never rejected, never clipped at the door.
`postUploadKnowledgeFile` (`workers/content/src/routes/knowledge.ts`) already reads this way:
a caller who posts no `title` falls back to the file's own (uncapped) `fileName` rather than
to a value `TITLE_MAX_CHARS` would have refused — this amendment writes that shape down as the
rule rather than leaving it an accident of the fallback's own order.

**Law.** R87's own amendment (`title-length`), no new rule number.

**AMENDED 21 Sep 2026: an imported KNOWLEDGE title clamps; an imported ticket or story
title still does not.** Aurora's own words, verbatim: *"imported knowledge titles are
clamped on import at 50, imported ticket and story titles stay whole (I1)."* This narrows
the 18 Sep I1 amendment above rather than replacing it: I1's WHOLE-on-write protection now
belongs to a ticket's and a story's own title alone (the `ticket` and `story` kinds in
`INGEST_KINDS`, `workers/content/src/lib/knowledge-ingest.ts`, both left untouched). Every
other title that arrives already written somewhere else and lands in the knowledge base's
own `title` column, a knowledge upload's file-name fallback, every OTHER mirrored kind
(account, contact, app, process, sprint, meeting, todo, task, person, dropdown,
portal_login), a Google import (Drive, Gmail, Calendar, Chat), and the glossary's own
seeded words, now CLAMPS to `TITLE_MAX_CHARS` on the way in instead of being stored whole.
One shared helper, `clampTitle` (`shared/clamp-title.ts`): the first 49 characters plus a
single ellipsis character (U+2026) so the cut is visible, a trailing space trimmed before
the ellipsis, and the cut moved back to a nearby space (within the last 12 characters)
rather than landing mid-word where one exists. The typed form is unmoved by this amendment
either: a person-typed title over the cap is still refused, in words, at the same doors
(`requireText`/`optionalText` against `TITLE_MAX_CHARS`); nobody types their way into a
clamp, they shorten it themselves.

**Law.** R87's own amendment (`title-length`), no new rule number.

---
