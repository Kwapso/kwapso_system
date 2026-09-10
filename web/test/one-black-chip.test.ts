// A REFERENCE IS DRAWN ONE WAY, BY ONE COMPONENT, ON BOTH FRONT DOORS.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// Seven kinds carry a team-wide reference (`shared/workers/refs.ts`): a ticket
// `T0412`, a story `B0188`, a sprint `S0012`, a meeting `M0009`, an app
// `A0003`, a wave `W0001`, an input `I0007`. The client ruled on how one looks
// twice — "Chip 1 in black for the ID", then "put the ID before the title to
// the left, with the usual black chip design" — and `shared/web/record-ref.tsx`
// is that ruling as a component: the black chip, `shrink-0 tabular-nums`, and
// nothing at all when the record has no number.
//
// ── WHY A TEST AND NOT A CODE REVIEW ──────────────────────────────────────
//
// On 6 Sep 2026 four surfaces drew that lozenge and every one of them rendered.
// Three had copied `shrink-0 tabular-nums` from each other and the fourth — the
// record DETAIL header, the screen a person is on when they read the number out
// loud — had neither, so the same reference set differently on a record's own
// page and in the list they reached it from. No rule in this repo could see it:
// R31 sees a radius, R32 sees a colour, R39 sees which package a control came
// from, and all four spellings passed all three. Drift in a MARK is only ever
// visible in aggregate, and nobody sees the aggregate — which is the identical
// argument `shared/web/record-mark.tsx` makes about the seventeen ways this app
// used to draw "a record with no picture".
//
// The same day, six other surfaces said the number a fifth way: glued into the
// name as `S0012 · Redesign the board`. That is not a chip at all, and it is
// the shape the client replaced on tickets — so it is the second clause here.
//
// ── TWO CLAUSES, AND THEY FAIL FOR DIFFERENT REASONS ──────────────────────
//
//   1. THE MARK. A `<Badge variant="inverse">` — the one black lozenge in the
//      product — may only be built inside `record-ref.tsx`. A new surface that
//      hand-rolls one is a fifth spelling waiting to drift.
//   2. THE POSITION. A reference may not be interpolated into a display string
//      beside a record's name. A joined string is not the approved treatment,
//      and worse, it hides the reference from the one rule above: a `.join()`
//      draws no Badge at all, so clause 1 would pass a screen that says the
//      number in prose.
//
// Both deny-lists are DATA with a reason each and are ROT-CHECKED both ways, so
// they can only shrink: an exemption whose line stops offending fails the build
// exactly as loudly as an unlisted offender.

import { describe, expect, it } from "vitest"
import { join } from "node:path"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const REPO_ROOT = join(__dirname, "..", "..")

/** THE SUBJECT: everything either front door draws with. `shared/ui/` is out of
 * scope on purpose — it is a VENDORED copy of the design kit (R39) whose own
 * compositions legitimately draw a `recordNumber` badge, and this repo may not
 * hand-edit it anyway. `web/e2e` and both `test` folders are out because a
 * fixture asserting the wrong markup should fail as a test, not as a law. */
const ROOTS = [
  join(REPO_ROOT, "web", "app"),
  join(REPO_ROOT, "web", "components"),
  join(REPO_ROOT, "web", "lib"),
  join(REPO_ROOT, "web-portal", "app"),
  join(REPO_ROOT, "web-portal", "components"),
  join(REPO_ROOT, "web-portal", "lib"),
  join(REPO_ROOT, "shared", "web"),
]

/** The one file allowed to build the black chip. */
const THE_ONE_PLACE = "shared/web/record-ref.tsx"

/** A `<Badge …>` opening tag carrying `variant="inverse"`. Attributes only —
 * the match stops at the first `>` — so this reads the ELEMENT and never the
 * children under it, and a `Button variant="inverse"` (the triage Undo, the
 * portal's send control) is a different control and correctly not caught. */
const INVERSE_BADGE = /<Badge\b[^>]*?variant="inverse"/g

/** A record's reference glued into a display string: `${x.ref}` inside a
 * template literal, or a `.ref` on a line that also carries the app's own
 * ` · ` joiner. Both are how the six pre-chip surfaces said it. */
const REF_INTERPOLATED = /\$\{[^}]*\.ref\b[^}]*\}/
const REF_JOINED = /\.ref\b[\s\S]*?" · "|" · "[\s\S]*?\.ref\b/

/** EVERY SURFACE THAT LEGITIMATELY BUILDS A BLACK CHIP OF ITS OWN, with the
 * reason it is not a record's reference. One line, and it should stay that
 * way. */
const INVERSE_BADGE_OK: Record<string, string> = {
  "web/components/process/process-map.tsx":
    "NOT A REFERENCE. The two badges there are a LEGEND KEY — the short code " +
    "(`A`, `B`) standing in front of each side's label on a comparison bar, " +
    "paired with a `secondary` badge for the other side so the two sides read " +
    "as opposites. It is charcoal because it is the loud half of a pair, not " +
    "because it names a record; nothing on that map has a `ref` at all.",
}

/** EVERY SLOT THAT IS A STRING BY CONSTRUCTION, so a chip cannot go in it and
 * the reference stays a prefix. Named "path:line", so a line that shifts is
 * caught by the rot check rather than quietly kept alive.
 *
 * THIS IS THE HONEST BOUNDARY OF THE TREATMENT, and it is worth naming rather
 * than apologising for: a `PickerOption.label`, a `WorkLogsPanel.recordLabel`,
 * a `CalendarEntry.title` and a React list key are all typed `string`. Putting
 * the chip in one of them would mean widening a prop that many other callers
 * pass plain text to, which trades a real inconsistency for a bigger one. In
 * every one of these the reference still LEADS, in the same order the chip
 * uses, so a person reading down a picker sees the number first either way. */
/* EVERY PIN BELOW MOVED ON 8 Sep 2026, when main and feat/ui-ux were merged:
 * main's own edits (the reviewer row, the screen-recording row, a page of
 * stories leaving the words of the work behind) landed ABOVE these lines in
 * five files. The reasons are unchanged — only the addresses are. */
/** THE SLOTS THAT GENUINELY CANNOT HOLD A CHIP, keyed by WHAT THE LINE SAYS
 * rather than by which line it is.
 *
 * It was `path:line` until 2026-09-10, and the reasons had turned into a
 * changelog of its own maintenance: help-detail.tsx alone was re-pinned from
 * :931 to :945 to :909 to :973 to :995 in four days, and its sibling from :1074
 * to :1088 to :1052 to :1116 to :1138, every time by somebody who had come to
 * this file to do something else entirely. A pin that moves whenever an
 * UNRELATED line is added above it does not identify a call site — it
 * identifies a position, and the position is not what was reviewed. Twice in
 * one session it turned a green branch red for no reason a reader could act on.
 *
 * A `contains` fragment is checked against the offending line itself, so it
 * moves with the code and dies with it. Ambiguity is the thing a substring can
 * newly get wrong, so it is asserted away below: a fragment matching two sites
 * in its file fails, because otherwise one reviewed exemption could silently
 * cover a second site nobody ever looked at. */
type RefAsString = { file: string; contains: string; why: string }

const REF_AS_STRING_OK: RefAsString[] = [
  {
    file: "web/lib/picker-sources.ts",
    contains: "label: t.ref ?",
    why:
      "`PickerOption.label` is typed `string` (web/components/records/record-picker.tsx) " +
      "— the picker draws the record's FACE from `picture`/`mark`/`swatch` and " +
      "its name from this one field. A ticket option leads with its number " +
      "because that is what somebody types to find it.",
  },
  {
    file: "web/lib/picker-sources.ts",
    contains: "label: s.ref ?",
    why: "same slot, a story option — see the ticket one above.",
  },
  {
    file: "web/components/work/stories-screen.tsx",
    contains: "label: t.ref ?",
    why:
      "the ticket picker on the story form, building the same `PickerOption.label` " +
      "the two lines in picker-sources.ts build.",
  },
  {
    file: "web/components/tickets/help-detail.tsx",
    contains: "recordLabel={[ticket.ref",
    why:
      "`WorkLogsPanel.recordLabel` is typed `string` — it names the record a time " +
      "entry is being logged against, inside sentences and a dialog title, not on " +
      "a row of its own.",
  },
  {
    file: "web/components/tickets/help-detail.tsx",
    contains: "label: [ticket.ref",
    why:
      "`fixedTicket.label` on the story form dialog — the same `PickerOption` " +
      "string slot as picker-sources.ts, for the ticket the form is pinned to.",
  },
  {
    file: "web/components/work/story-detail.tsx",
    contains: "recordLabel={story.ref ?",
    why: "`WorkLogsPanel.recordLabel` again, for a story — see help-detail.tsx above.",
  },
  {
    file: "web/components/work/sprints-screen.tsx",
    contains: "title: s.ref ?",
    why:
      "`CalendarEntry.title` is typed `string`, and a month grid is the one place " +
      "the chip would be wrong even if the slot allowed it: a day cell is a few " +
      "characters wide and a lozenge in it is furniture, not information.",
  },
  {
    file: "web-portal/components/delivery-block.tsx",
    contains: "s.ref ?? s.name",
    why:
      "A REACT LIST KEY (`id:`), never rendered — the client reads `s.name` and " +
      "the dates on that row. Kept as the key because a sprint's reference is the " +
      "stablest thing about it.",
  },
]


/** THE FILE'S LINES WITH EVERY COMMENT REMOVED AND NOT ONE LINE LOST, so a
 * `path:line` pin means what it says.
 *
 * This used to be a hand-rolled stripper right here, because the shared one
 * closed the file up — a block comment became a single space and every line
 * under it moved, which is fine when the answer is a boolean and useless when it
 * is an address. It is not true any more: `stripComments` keeps every newline a
 * comment spanned. The hand-roll went with the reason for it, and its own
 * blindness with that — it read `accept="image/*"` as a comment opener and
 * blanked the sixty lines below, exactly as the regexes it replaced did. */
function codeLines(source: string): string[] {
  return stripComments(source).split("\n")
}

describe("one black chip, one reference", () => {
  it("nothing but record-ref.tsx builds the black chip", () => {
    const offenders: string[] = []
    const used = new Set<string>()
    for (const file of sourceFiles(ROOTS, {
      extensions: [".ts", ".tsx"],
      skipTests: true,
      relativeTo: REPO_ROOT,
    })) {
      if (file.rel === THE_ONE_PLACE) continue
      if (!INVERSE_BADGE.test(stripComments(file.source))) continue
      INVERSE_BADGE.lastIndex = 0
      if (INVERSE_BADGE_OK[file.rel]) {
        used.add(file.rel)
        continue
      }
      offenders.push(file.rel)
    }
    expect(
      offenders,
      `these build a black chip themselves instead of using <RecordRef> (${THE_ONE_PLACE}). ` +
        `A reference is drawn one way; if this badge is NOT a reference, add it to ` +
        `INVERSE_BADGE_OK with the reason:\n  ${offenders.join("\n  ")}`
    ).toEqual([])

    const stale = Object.keys(INVERSE_BADGE_OK).filter((rel) => !used.has(rel))
    expect(
      stale,
      `INVERSE_BADGE_OK names files that no longer build a black chip — delete them:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })

  it("a reference is never glued into the name beside it", () => {
    const offenders: string[] = []
    /** Which sites each exemption actually covered — the input to BOTH rot
     * checks below: none is a dead line, more than one is an ambiguous one. */
    const hits = new Map<RefAsString, string[]>()
    for (const file of sourceFiles(ROOTS, {
      extensions: [".ts", ".tsx"],
      skipTests: true,
      relativeTo: REPO_ROOT,
    })) {
      if (file.rel === THE_ONE_PLACE) continue
      // COMMENTS ARE NOT CODE, and this repo's comments quote the very shape
      // being banned — `record-ref.tsx`'s own header and half the call sites
      // explain what they replaced by writing it out. Blanked LINE BY LINE
      // rather than through `stripComments`, which closes up the file and would
      // make every pinned line number a fiction one edit later.
      const lines = codeLines(file.source)
      lines.forEach((line, i) => {
        if (!/\.ref\b/.test(line)) return
        if (!REF_INTERPOLATED.test(line) && !REF_JOINED.test(line)) return
        const at = `${file.rel}:${i + 1}`
        const excused = REF_AS_STRING_OK.filter(
          (e) => e.file === file.rel && line.includes(e.contains)
        )
        if (excused.length > 0) {
          for (const e of excused) hits.set(e, [...(hits.get(e) ?? []), at])
          return
        }
        offenders.push(`${at}  ${line.trim()}`)
      })
    }
    expect(
      offenders,
      `a reference belongs in the black chip in FRONT of the name (<RecordRef> + REF_LEADS_NAME, ` +
        `${THE_ONE_PLACE}), never joined into the name as text. If the slot is typed \`string\` ` +
        `and genuinely cannot hold a node, add the line to REF_AS_STRING_OK with the reason:\n  ` +
        offenders.join("\n  ")
    ).toEqual([])

    const stale = REF_AS_STRING_OK.filter((e) => !hits.has(e)).map((e) => `${e.file}  ${e.contains}`)
    expect(
      stale,
      `REF_AS_STRING_OK names code that no longer glues a reference into a string — the file moved ` +
        `or the surface was fixed. Delete the entry (it can no longer need "re-pinning"):\n  ` +
        stale.join("\n  ")
    ).toEqual([])

    // AND THE FAILURE A SUBSTRING CAN HAVE THAT A LINE NUMBER COULD NOT. One
    // reviewed exemption must not quietly cover a second site nobody read.
    const ambiguous = [...hits.entries()]
      .filter(([, at]) => at.length > 1)
      .map(([e, at]) => `${e.file}  "${e.contains}" matches ${at.length}: ${at.join(", ")}`)
    expect(
      ambiguous,
      `an exemption's \`contains\` matches more than one site in its file, so it excuses a line ` +
        `nobody reviewed. Make it specific enough to name one:\n  ` + ambiguous.join("\n  ")
    ).toEqual([])
  })

  it("the chip decides the absent case, so no call site has to", () => {
    const src = sourceFiles(join(REPO_ROOT, "shared", "web"), {
      extensions: [".tsx"],
      relativeTo: REPO_ROOT,
    }).find((f) => f.rel === THE_ONE_PLACE)
    expect(src, `${THE_ONE_PLACE} is the component this whole file stands on`).toBeTruthy()
    const code = stripComments(src!.source)
    // A record with no reference draws NOTHING — an empty black lozenge reads
    // as a value that failed to load rather than as a record that never had
    // one, and five of the seven kinds mint no reference without a client.
    expect(code).toMatch(/if\s*\(!value\)\s*return null/)
    // The two classes that make a reference readable and unclippable, and the
    // reason the guard cannot live at a call site: a caller that forgot either
    // would still render.
    expect(code).toMatch(/shrink-0 tabular-nums/)
    expect(code).toMatch(/variant="inverse"/)
    expect(code).toMatch(/size="pill"/)
  })
})
