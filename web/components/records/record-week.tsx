"use client"

// THE WEEK VIEW — a caller-narrowed week, drawn as five workday columns
// (Monday–Friday) plus ONE folded weekend column (Saturday and Sunday,
// stacked). Client ruling, 15 Sep 2026, choosing this shape over three other
// designs sketched in the same session's artifact (2175565d-5459-4d2d-80cd-
// c06379943aa6, "W4 — Mon–Fri plus weekend folded"): *"For the agenda [the
// week design], I love your designs. I will go with W4, Monday to Friday,
// plus weekend folded. Just make sure that on each card, you add an eyebrow
// with the time."*
//
// WHY THIS FILE IS APP-SIDE, NOT A THIRD KIT EXPORT BESIDE `CalendarView`
// AND `Agenda`. The vendored kit (`shared/ui/`) draws a month grid
// (`calendar-view/calendar-view.tsx`) and a day-by-day list
// (`agenda/agenda.tsx`); it has no week-columns primitive, and `shared/ui/`
// is pinned and hand-edits there turn the build red (CLAUDE.md, `web/test/
// vendored-kit.test.ts`) — a gap gets logged and worked upstream, never
// patched here. So this is built from three of the kit's own PARTS instead
// of a fourth kit COMPONENT: `Card` (`components/card/card`, each entry's
// own bordered box — `variant="raised"` + `hairline`, which is a shadow-
// based stroke, never a literal CSS `border`: BUILD-A-SCREEN.md §6.1, "no
// CSS border, ever"), `Badge` (`components/badge/badge`, the "+N more"
// overflow chip — a label-only badge is exactly what that chip is), and
// `ScrollArea` (`components/scroll-area/scroll-area`, the phone pager's
// single-day body, which can run longer than the viewport once a day's own
// cap is lifted — see below).
//
// THE ONE-CALENDAR LAW STILL HOLDS (`web/test/rules.test.ts`'s
// `one-calendar`, this module's file header on `RecordCalendar`/
// `RecordAgenda` above it in the same folder): nothing outside
// `record-calendar.tsx` may import the kit's `calendar-view` or `agenda`
// directly. This file imports NEITHER — it is a third, independent shape,
// same as `RecordAgenda` is a third shape reached through its own door
// rather than a mode switch inside `RecordCalendar` (2026-09-15: "Agenda is
// a different component than month... When I mean calendar, I mean the
// month view"). `RecordWeek` reads `CalendarEntry` (`record-calendar.tsx`,
// this same folder) so all three shapes bucket the identical rows.
//
// THE EYEBROW IS THE TIME, AND ONLY THE TIME. `CalendarEntry.time` (extended
// there, this ruling's own paragraph) is drawn exactly the way
// `RecordFooterEyebrow` draws the ink footer's own eyebrow — `text-micro`
// uppercase `text-ink-tertiary` (`shared/ui/components/record-detail/
// record-detail.tsx`) — because that IS the kit's eyebrow style, the same
// treatment `record-chrome.tsx`'s own header points at for the identical
// reason. A card with no `time` draws no eyebrow: there is no placeholder
// dash, no reserved blank line: the row is one line shorter.
//
// AND THE SECOND LINE IS `detail`, ADDED 23 Sep 2026 — Aurora, verbatim:
// *"tasks agenda view - show department"*. This component read `time`,
// `dotTone` and `title` off the entry and silently ignored `detail`, which is
// why a Tasks week card never showed the department the Tasks screen had been
// computing for it since 16 Sep 2026 (`weekDetail`, tasks-screen.tsx). Drawn
// under the title in the kit's own card-meta step (`List`'s
// `list-description`, `cards` variant), truncating, and — like `time` and
// like a face — absent entirely when the caller has nothing to say. Meetings
// hand this component no `detail` at all, so nothing there changes.
// `EntryCard` below carries the whole reasoning, chip included.
//
// THE PRIORITY DOT IS `dotTone` ONLY, NEVER `accent`. `RecordCalendar`'s own
// chips fall back to `accent`'s department hash when `dotTone` is absent
// (`dotClass`, that file); this component does not, because the ruling this
// file answers is specifically about the PRIORITY circle — "always show the
// priority color circle" (2026-09-15, quoted in full on `CalendarEntry.
// dotTone` itself) — not the department hash, which is a Month-grid-only
// convention. A card with no `dotTone` draws no dot, exactly as a card with
// no `time` draws no eyebrow.
//
// NO SORT CONTROL, ANYWHERE IN IT — client ruling, the same session:
// *"Never put the sort in calendar components. Make this a law. Makes no
// sense."* That law is R78 (`shared/rules/registry.ts`, enforced centrally in
// `web/components/deep-link/screen-bits.tsx`'s `<ToolbarRow>`, which drops
// its own sort control the moment a caller's `view.value` is "calendar",
// "week" or "agenda"): a screen that wires this component into its own
// `<ToolbarRow view={...}>` gets the suppression for free, structurally, the
// moment its view value is `"week"`. `RecordWeek` itself never had a sort
// slot to begin with — it draws no toolbar of any kind — so there is nothing
// here for R78 to guard; the guarantee lives one layer up, at the seam every
// calendar-shaped view already shares.
//
// PHONE = A DAY PAGER, SIX PAGES — the artifact's own W4 phone note: "Day
// pager, six pages. Continues the same compression: five weekday pages, one
// combined weekend page." So the phone pager does not offer seven pages for
// seven days; it offers the same five-plus-one shape the desktop grid draws,
// paged. Below `sm:` the grid is `hidden` and the pager takes over — a CSS
// breakpoint switch, not a device check in JS (the ADR `record-calendar.tsx`
// itself draws on, since kit v1.2.86 killed its own last device branch: "no
// device check any more").
import * as React from "react"

import { cn } from "@shared/ui/lib/utils"
import { Button } from "@shared/ui/components/button/button"
import { Card } from "@shared/ui/components/card/card"
import { Badge } from "@shared/ui/components/badge/badge"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ScrollArea } from "@shared/ui/components/scroll-area/scroll-area"
import { CaretLeft, CaretRight } from "@shared/ui/foundations/icons"
import { orderChips } from "@shared/web/chip-order"

import { PeopleFaces } from "@shared/web/people-faces"
import { useLanguage } from "@shared/web/language"
import type { Language, Vars } from "@shared/i18n"

import type { CalendarEntry, EntryDotTone } from "./record-calendar"

/* --------------------------------- dates ----------------------------------- */

const pad = (n: number) => String(n).padStart(2, "0")

/** Local `YYYY-MM-DD` — the same shape `record-calendar.tsx`'s own `dayKey`
 * builds, and for the identical reason: never `toISOString()`, which is UTC
 * and renders a meeting on the wrong side of midnight for anybody east of
 * Greenwich. */
function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** The reverse of `dayKeyOf` — LOCAL midnight, never `new Date(iso)` (that
 * constructor reads a bare date string as UTC). A key that is not three
 * numbers falls back to today rather than throwing. */
function parseLocalDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date()
  return new Date(y, m - 1, d)
}

function mondayOf(d: Date): Date {
  const offset = (d.getDay() + 6) % 7 // days since Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Mon…Sun, in the reader's own locale — `record-calendar.tsx`'s own
 * `weekdayLabels`, copied rather than imported (it is not exported, and this
 * file owns no edit to that one beyond `CalendarEntry`). */
function weekdayShortLabels(lang: Language): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    // 5 Jan 1970 was a Monday.
    new Date(1970, 0, 5 + i).toLocaleDateString(lang, { weekday: "short" })
  )
}

/** "Sep 14–20, 2026" (or "Sep 28 – Oct 4, 2026" across a month boundary) —
 * `record-calendar.tsx`'s own `monthLabel` reasoning, read the same way:
 * `Intl` directly, with the reader's own `lang`, never the ambient runtime
 * locale `undefined` would ask for. */
function weekRangeLabel(monday: Date, lang: Language): string {
  const sunday = addDays(monday, 6)
  const sameMonth =
    monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()
  const start = monday.toLocaleDateString(lang, { month: "short", day: "numeric" })
  const end = sunday.toLocaleDateString(
    lang,
    sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" }
  )
  const year = sunday.toLocaleDateString(lang, { year: "numeric" })
  return `${start} to ${end}, ${year}`
}

/* --------------------------------- colour ----------------------------------- */

/** THE PRIORITY DOT'S OWN FILL — copied in shape from `badge.tsx`'s own
 * `DOT_FILL` (the app-stage six `--dot-*` tokens, plus priority's own four)
 * for the same reason `record-calendar.tsx` already copies it rather than
 * importing it: the kit exports the `Badge` COMPONENT, not this map, and
 * `Badge` itself is reserved in this file for the overflow chip (see
 * `WeekOverflowChip` below) — a card wearing a `Badge` around its whole body
 * would nest one rounded, coloured surface inside another. A
 * `Record<EntryDotTone, …>` (never a template literal) means a ninth tone
 * the kit ever grows fails this file's type check instead of silently
 * painting nothing.
 *
 * EXTENDED TO THE FOUR PRIORITY TONES (kit v1.2.89, `--dot-red`/`--dot-
 * orange`/`--dot-purple`/`--dot-blue`) the day `PRIORITY_DOT_TONE`
 * (`shared/departments.ts`) stopped borrowing four of the app-stage six —
 * `record-calendar.tsx`'s own identical map grew the same four, the same
 * day, for the same reason. */
const DOT_FILL: Record<EntryDotTone, string> = {
  shipped: "bg-[var(--dot-shipped)]",
  building: "bg-[var(--dot-building)]",
  review: "bg-[var(--dot-review)]",
  blocked: "bg-[var(--dot-blocked)]",
  archived: "bg-[var(--dot-archived)]",
  done: "bg-[var(--dot-done)]",
  red: "bg-[var(--dot-red)]",
  orange: "bg-[var(--dot-orange)]",
  purple: "bg-[var(--dot-purple)]",
  blue: "bg-[var(--dot-blue)]",
}

/* ------------------------------- the pieces --------------------------------- */

/* THE WEEK'S OWN SPACING STEP — THE ONE PLACE IT IS DECIDED.
 *
 * CLIENT RULING, 23 Sep 2026, VERBATIM: *"everywhere week view add a bit
 * more spacingto the cards"*. "Everywhere" is this file: Tasks
 * (`tasks-screen.tsx`, both the Planned and the Everyone bodies), Stories
 * (`stories-screen.tsx`) and Meetings (`meetings-screen.tsx`) all draw
 * their week through `RecordWeek` and nothing else, so one edit here is
 * every week view in the app.
 *
 * EVERY GAP AROUND AND BETWEEN A WEEK CARD MOVED UP EXACTLY ONE RUNG on the
 * kit's own ladder — `--space-*`, `shared/ui/foundations/tokens/tokens.css`
 * §2 — never a typed pixel (`docs/RULES.md` 1.1 and 1.2 for why the rung
 * and not the number):
 *
 *   between two cards in a day, and a day head to its first card   8 → 12
 *   between two day columns, and the phone pager's own stack      12 → 16
 *   inside the folded weekend column                                6 → 8
 *
 * THE CARD'S OWN INSET IS UNTOUCHED. She asked for spacing to the cards,
 * not inside them; `EntryCard`'s `p-2` is the card's business and moving it
 * would change how a card reads, not how far apart two of them sit.
 *
 * `web/test/week-view-card-spacing.test.ts` fails if any of these three
 * drops back a rung, or if a week-view gap is written as a bare Tailwind
 * numeric again instead of through one of these three names. */
const WEEK_CARD_GAP = "gap-[var(--space-3)]"
const WEEK_COLUMN_GAP = "gap-[var(--space-4)]"
const WEEK_WEEKEND_GAP = "gap-[var(--space-2)]"

/* NO CAP. THE DAY SHOWS EVERYTHING IT HAS — Aurora, 23 Sep 2026, choosing
 * week-view variation One, "Open column", verbatim: *"also what is this
 * 'show more'? should show all."* `MAX_PER_DAY` (3, borrowed from the month
 * grid) and the `WeekOverflowChip`/day-dialog pair it fed are gone from this
 * file with it: a column grows with its entries and the PAGE scrolls.
 *
 * THE MONTH GRID'S OWN "+N more" IS UNTOUCHED AND SHARES NO CODE WITH THIS.
 * `record-calendar.tsx` has its own chip, its own dialog and its own
 * `DayRows` list; this file had a second, independent copy (the two were
 * kept in step by hand, which the registry's own bounded-lists note called
 * "THE IDENTICAL SHAPE, ONE ROOM OVER"). Deleting this one leaves the month
 * exactly as it was — a month SQUARE genuinely cannot grow, so a fold there
 * is answering a different question from the one she ruled on here.
 *
 * NOT VIRTUALISED, deliberately. A week's entries are what one screen's
 * toolbar already narrowed to, and nothing here has been measured slow; a
 * virtual window would be a performance fix with no measurement behind it,
 * which this repo does not ship. If a real one ever arrives, the measurement
 * comes first. */

function EntryDot({ tone }: { tone: EntryDotTone }) {
  return <span aria-hidden className={cn("size-1.5 shrink-0 rounded-pill", DOT_FILL[tone])} />
}

/** ONE ENTRY, drawn as its own bordered card — the mockup's `.task-card`.
 * `Card` supplies the box (`variant="raised"` + `hairline`, a shadow-based
 * stroke); a real `<button>` inside it is the whole target, so the click
 * target, the focus ring and the hover state are all the browser's, not
 * hand-rolled. Undefined `onSelect` still draws the card — a caller with
 * nothing to open on select still gets a face for the record — it just
 * is not a button. */
function EntryCard({
  entry,
  onSelect,
}: {
  entry: CalendarEntry
  onSelect?: (entry: CalendarEntry) => void
}) {
  /* R94's own seam decides the order; this file only says which KIND each
     chip is. A record with neither name builds an empty array and the row
     above draws nothing at all — the same silence the card keeps about a
     missing time, a missing detail and missing faces. */
  const parentChips = orderChips<React.ReactNode>([
    ...(entry.appName
      ? [
          {
            kind: "mainParent" as const,
            node: (
              <Badge key="app" variant="secondary" size="pill" className="max-w-full">
                <span className="block min-w-0 truncate">{entry.appName}</span>
              </Badge>
            ),
          },
        ]
      : []),
    ...(entry.accountName
      ? [
          {
            kind: "secondaryParent" as const,
            node: (
              <Badge key="account" variant="secondary" size="pill" className="max-w-full">
                <span className="block min-w-0 truncate">{entry.accountName}</span>
              </Badge>
            ),
          },
        ]
      : []),
  ])

  const body = (
    <>
      {/* THE EYEBROW — the file header's own ruling. Undefined `time` draws
          nothing at all, never a placeholder line. */}
      {entry.time ? (
        <span className="text-micro block font-[var(--font-weight-medium)] uppercase text-ink-tertiary">
          {entry.time}
        </span>
      ) : null}
      {/* WHOSE IT IS — THE APP AND THE ACCOUNT, AS CHIPS, ABOVE THE TITLE.
          Aurora, 23 Sep 2026, choosing week-view variation One ("Open
          column"): her example was a meeting, and she wants the card to show
          the app or the account chip beside the people's faces.

          ABOVE THE TITLE IS R65, NOT A PREFERENCE (`shared/rules/registry
          .ts`): "ON A CARD THAT STANDS FOR A RECORD, THE CHIP SITS ABOVE THE
          TITLE" — her own ruling, twice, because "a card is read top-down in
          one glance and the chip is what SORTS it". A week card is exactly
          that card. Source order IS visual order here, as it is in a kit
          `Card` ("a card is a column"), so the chips opening before the
          title in this fragment is the law, drawn.

          THE ORDER BETWEEN THEM IS R94, THROUGH THE ONE SEAM. `orderChips`
          (`shared/web/chip-order.ts`) fixes id → status → type → MAIN PARENT
          → SECONDARY PARENT; the app is the main parent and the account the
          secondary, which is the reading `TicketChips` already takes for its
          own app chip. Routing two chips through the seam rather than writing
          them in order by hand is the point of R94: the order becomes a
          property of the data, not of which line this file happens to put
          first.

          THE TREATMENT IS THE APP'S OWN PLAIN CHIP — `Badge variant=
          "secondary" size="pill"`, the same lozenge `TicketChips` draws for
          the app and `contacts-screen.tsx` for the account. Not a LINK: the
          week card is already one big button that opens the record, and an
          anchor inside a button is invalid HTML — which is also why neither
          chip is underlined (the kit reserves `LINK_UNDERLINE` for a badge
          that really is an anchor).

          IT TRUNCATES, AND THE CARD IS WHAT MAKES IT. `badge.tsx`'s own
          ten-states note says a badge "never wraps and never truncates. A row
          that runs out of width is the parent's problem to wrap or scroll."
          This is the parent taking that problem: the row wraps, and each chip
          is capped at the card's own width (`max-w-full` plus a `truncate`
          child) so a long client name ellipses INSIDE the column instead of
          pushing its edge out. The badge is not shrinking to match its
          neighbours — the column is capping it, which is the case that
          paragraph hands to the parent. */}
      {parentChips.length > 0 ? (
        <span className="flex min-w-0 flex-wrap items-center gap-1">{parentChips}</span>
      ) : null}
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        {entry.dotTone ? <EntryDot tone={entry.dotTone} /> : null}
        <span className="min-w-0 truncate text-sm">{entry.title}</span>
      </span>
      {/* WHAT IT IS ABOUT — `CalendarEntry.detail`, the caller's own quiet
          second line. Aurora, 23 Sep 2026, verbatim: "tasks agenda view -
          show department" — the week board is the shape she named "the
          agenda" when she chose it (this file's own header quotes her: "For
          the agenda [the week design], I love your designs"), and the Tasks
          screen has built that line for this card since 16 Sep 2026
          (`weekDetail`, tasks-screen.tsx: the task's department, and nothing
          else) only for this component to drop it on the floor — computed,
          handed over, never drawn.

          PLAIN TEXT, NEVER A SECOND CHIP. The department already has exactly
          one chip in this app, on the BOARD card, above the title, which is
          where R65 puts a chip that sorts a record card; a week COLUMN is the
          narrowest box in the app and a pill in it would either wrap the card
          or overflow it. So this is the kit's own meta step for a card —
          `text-micro` with the eyebrow's tracking reset, tertiary ink,
          `truncate` (`List`'s own `list-description` in its `cards` variant,
          shared/ui/components/list/list.tsx) — the same register the
          "+N more" day dialog below already reads `detail` in. A long
          department ELLIPSES inside the card rather than pushing its edge.

          NOTHING AT ALL WITHOUT ONE. `weekDetail` answers `undefined` for a
          task with no department, so the card is one line shorter — never the
          word "None", never a reserved blank row: the identical silence this
          card already keeps about a missing `time` and a missing face. */}
      {entry.detail ? (
        <span className="text-micro block truncate tracking-[var(--tracking-normal)] text-ink-tertiary">
          {entry.detail}
        </span>
      ) : null}
      {/* WHO IS IN IT — Aurora, 23 Sep 2026, verbatim: "meetings week view,
          show the avatars on whos in the meeting after title". AFTER the
          title, so it is its own line under it rather than a fourth thing
          competing for the title's own row: a week COLUMN is the narrowest
          box in the app and a face beside a truncating name would eat the
          name. `PeopleFaces` (shared/web/people-faces.tsx) is the one row of
          round `choice` marks the meetings TABLE's Attendees column already
          draws — never a second, hand-rolled stack — and it renders NOTHING
          at all for an entry with no faces, the same silence a card with no
          `time` keeps about its eyebrow. */}
      {entry.faces?.length ? <PeopleFaces people={entry.faces} /> : null}
    </>
  )
  return (
    /* SOFT PAPER, NOT OFF-BEIGE — rulebook L43 going app wide, 21 Sep 2026.
       This card used to stand inside a painted collection frame, where
       `raised` (`--card`, off-beige) read 1.221 against soft paper. The
       frame is plain now, so its ground is the PAGE, and `--card` IS the
       page's own colour in light (#FFFEF9): `raised` here would measure
       1.000 and the card would be held up by its shadow alone. `default`
       is soft paper, the same 1.103 the search pill and every other
       object on this ground reads at. The Minimal Kit page named exactly
       this sweep: "check that nobody passed `raised` explicitly for a
       tile row that used to sit on a panel". */
    <Card variant="default" hairline className="min-w-0">
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(entry)}
          className="flex w-full min-w-0 flex-col gap-0.5 rounded-[var(--radius)] p-2 text-start"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-col gap-0.5 p-2">{body}</div>
      )}
    </Card>
  )
}

/** ONE DAY'S HEADING — PLAIN TEXT, NO BOX.
 *
 * AURORA, 23 Sep 2026, choosing week-view variation One ("Open column"),
 * verbatim: *"you invented the color of the 'not today' days"*. Until this
 * ruling a day head was a FILLED PILL — `bg-muted` under tier-3 ink for an
 * ordinary day, `bg-surface-inverse` under on-inverse ink for today. Both
 * fills are real kit tokens, so this was never a palette breach (R32 is
 * untouched either way); what nobody ever ruled is that a day should be a
 * filled box at all. It was carried over from the month grid's own square,
 * where a cell IS a box, and a column head is not a cell.
 *
 * SO: the weekday, the date number and THE DAY'S COUNT, as text.
 *
 *   an ordinary day   tier-3 ink (`text-ink-tertiary`), nothing else
 *   TODAY             full ink, and a RULE UNDER IT rather than a fill
 *
 * THE RULE IS A ONE-EDGE HAIRLINE, `--hairline-under-strong` — the kit's own
 * heavy under-rule, the same shape `Title` draws under a section and the same
 * device the current stage label carries. Kit `docs/RULES.md` §2.8 (the
 * container-box law, 23 Sep 2026) removes the box AROUND a container and
 * blesses exactly this: a rule BETWEEN things, on one edge, is a separator
 * and not a box. Marking today with a line rather than a fill is that law and
 * this ruling agreeing.
 *
 * THE COUNT IS THE SECOND HALF OF "OPEN COLUMN". Once the fold is gone
 * (`MAX_PER_DAY`'s note above) a column's length IS its count, so a reader
 * scanning the week for "which day is heavy" reads the number in the head
 * instead of counting cards. Zero is printed, not hidden: a day with nothing
 * on it says 0 rather than leaving a reader to wonder whether it failed to
 * load.
 *
 * `compact` is the folded weekend's own smaller step — one component, two
 * sizes, rather than a second copy, exactly as before. */
function WeekDayHead({
  weekday,
  dateNum,
  count,
  today,
  compact,
}: {
  weekday: string
  dateNum: number
  /** how many entries the day holds — printed in the head since the fold went */
  count: number
  today: boolean
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2 pb-[var(--space-1)]",
        compact ? "text-[10px]" : "text-xs",
        today
          ? "text-foreground shadow-[var(--hairline-under-strong)]"
          : "text-ink-tertiary"
      )}
    >
      <span className="flex min-w-0 items-baseline gap-1.5 truncate">
        <span className="font-[var(--font-weight-medium)] uppercase tracking-wide">
          {weekday}
        </span>
        <span className="tabular-nums font-[var(--font-weight-medium)]">{dateNum}</span>
      </span>
      <span className="tabular-nums shrink-0">{count}</span>
    </div>
  )
}

/** ONE DAY'S BODY — the loading skeleton, the "nothing here" dash, or EVERY
 * entry the day holds.
 *
 * NO `cap` PROP ANY MORE — Aurora, 23 Sep 2026, "Open column": *"also what
 * is this 'show more'? should show all."* Both callers used to pass one (the
 * desktop grid `MAX_PER_DAY`, the phone pager `null`) and the phone's
 * reading — one day gets everything — is now the only reading there is.
 *
 * THE HONEST CONSEQUENCE, STATED RATHER THAN DESIGNED AROUND: an uneven week
 * now LOOKS uneven. A Tuesday with nine meetings stands beside a Thursday
 * with one and the grid's rows no longer line up. That is the point of the
 * change — the fold used to hide exactly the information a week view exists
 * to show. */
function WeekDayBody({
  entries,
  loading,
  onSelect,
  t,
}: {
  entries: CalendarEntry[]
  loading: boolean
  onSelect?: (entry: CalendarEntry) => void
  t: (english: string, vars?: Vars) => string
}) {
  if (loading) {
    return (
      <div className={cn("flex flex-col", WEEK_CARD_GAP)}>
        <Skeleton className="h-12 w-full rounded-[var(--radius)]" label={t("Loading…")} />
        <Skeleton className="h-12 w-full rounded-[var(--radius)]" label={t("Loading…")} />
      </div>
    )
  }
  if (entries.length === 0) {
    return (
      <p aria-hidden className="px-1 py-2 text-center text-xs text-ink-disabled">
        &mdash;
      </p>
    )
  }
  return (
    <div className={cn("flex flex-col", WEEK_CARD_GAP)}>
      {entries.map((e) => (
        <EntryCard key={e.id} entry={e} onSelect={onSelect} />
      ))}
    </div>
  )
}

/* -------------------------------- the week ---------------------------------- */

export function RecordWeek({
  entries,
  weekOf,
  onSelect,
  onWeekChange,
  loading = false,
}: {
  /** every record with a date, in any order — this component buckets them by
   *  `day` itself, the same contract `RecordCalendar` takes. */
  entries: CalendarEntry[]
  /** WHICH WEEK IS ON SCREEN AT MOUNT, as any ISO day inside it — default
   * today. Read ONCE: exactly like `RecordCalendar`'s own month, the week
   * this component is looking at is state it owns from here on, moved by its
   * own Prev/Next/Today controls, and told to the host through
   * `onWeekChange` rather than fed back in. A caller that needs to jump this
   * component to a specific week after mount remounts it (a fresh `key`),
   * the same escape hatch every other engine-owned piece of state in this
   * app takes. */
  weekOf?: string
  /** open the record — handed the whole entry, never just its id, since a
   *  week's cards do not carry a second lookup table the way `RecordCalendar`
   *  needs one for its `onOpen(id)`. */
  onSelect?: (entry: CalendarEntry) => void
  /** WHICH WEEK IS ON SCREEN, told to the host as the week's own Monday,
   * `YYYY-MM-DD` — on mount and on every move, the identical contract
   * `RecordCalendar`'s `onMonthChange` keeps for its month. */
  onWeekChange?: (weekStartIso: string) => void
  /** busy — every day draws two skeleton bars instead of its cards. Weekly
   *  navigation stays live while loading; only the entries are unknown. */
  loading?: boolean
}) {
  const { t, lang } = useLanguage()
  const weekdayLabels = React.useMemo(() => weekdayShortLabels(lang), [lang])

  const [monday, setMonday] = React.useState(() =>
    mondayOf(weekOf ? parseLocalDay(weekOf) : new Date())
  )
  const weekTag = dayKeyOf(monday)
  React.useEffect(() => {
    onWeekChange?.(weekTag)
  }, [weekTag, onWeekChange])

  const weekDays = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday]
  )

  // THE PHONE PAGER'S OWN PAGE — 0..4 are Mon..Fri, 5 is the combined
  // weekend page (the artifact's own "six pages" note, file header above).
  // Clamped rather than wrapped into the next/previous week: the week-level
  // Prev/Next controls (drawn on BOTH breakpoints, above the grid and above
  // the pager alike) are the one door that moves the week; the pager's own
  // arrows step a day at a time inside it and stop at either edge.
  const [pagerIndex, setPagerIndex] = React.useState(() => {
    const todayIdx = weekDays.findIndex((d) => dayKeyOf(d) === dayKeyOf(new Date()))
    return todayIdx === -1 ? 0 : Math.min(todayIdx, 5)
  })

  const todayKey = dayKeyOf(new Date())

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    for (const e of entries) {
      const list = map.get(e.day)
      if (list) list.push(e)
      else map.set(e.day, [e])
    }
    return map
  }, [entries])

  function goToWeek(nextMonday: Date, pagerTo = 0) {
    setMonday(nextMonday)
    setPagerIndex(pagerTo)
  }

  function goToday() {
    const now = new Date()
    const dow = (now.getDay() + 6) % 7 // 0=Mon…6=Sun
    goToWeek(mondayOf(now), Math.min(dow, 5))
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* THE PERIOD, AND THE MOVE — one row, both breakpoints: which week,
          then the three ways to move it. Same shape `RecordCalendar` draws
          for its month (this folder's own header comment on that
          component). */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{weekRangeLabel(monday, lang)}</div>
        <div className="flex items-center gap-1">
          {/* R98 — a toolbar button is the kit's default height, never `sm`. */}
          <Button variant="secondary" onClick={goToday}>
            {t("Today")}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Previous week")}
            onClick={() => goToWeek(addDays(monday, -7))}
          >
            <CaretLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Next week")}
            onClick={() => goToWeek(addDays(monday, 7))}
          >
            <CaretRight />
          </Button>
        </div>
      </div>

      {/* FIVE WORKDAY COLUMNS + ONE FOLDED WEEKEND COLUMN — W4, hidden below
          `sm:`. */}
      <div className={cn("hidden grid-cols-[repeat(5,minmax(0,1fr))_minmax(160px,200px)] sm:grid", WEEK_COLUMN_GAP)}>
        {weekDays.slice(0, 5).map((d, i) => {
          const key = dayKeyOf(d)
          return (
            <div key={key} className={cn("flex min-w-0 flex-col", WEEK_CARD_GAP)}>
              <WeekDayHead
                weekday={weekdayLabels[i]}
                dateNum={d.getDate()}
                count={(byDay.get(key) ?? []).length}
                today={key === todayKey}
              />
              <WeekDayBody
                entries={byDay.get(key) ?? []}
                loading={loading}
                onSelect={onSelect}
                t={t}
              />
            </div>
          )
        })}
        <div className={cn("flex min-w-0 flex-col", WEEK_COLUMN_GAP)}>
          {/* THE WEEKEND'S OWN LABEL — plain text now, for the same ruling
              that took the fill off the day heads beside it ("you invented
              the color of the 'not today' days"). It was the identical
              `bg-muted` pill; leaving one filled lozenge standing in a row
              of plain heads would have been the ruling applied to four of
              five things. Tier-3 ink, no box. */}
          <div className="pb-[var(--space-1)] text-xs font-[var(--font-weight-medium)] uppercase tracking-wide text-ink-tertiary">
            {t("Weekend")}
          </div>
          {[5, 6].map((i) => {
            const d = weekDays[i]
            const key = dayKeyOf(d)
            return (
              <div key={key} className={cn("flex min-w-0 flex-col", WEEK_WEEKEND_GAP)}>
                <WeekDayHead
                  compact
                  weekday={weekdayLabels[i]}
                  dateNum={d.getDate()}
                  count={(byDay.get(key) ?? []).length}
                  today={key === todayKey}
                />
                <WeekDayBody
                  entries={byDay.get(key) ?? []}
                  loading={loading}
                  onSelect={onSelect}
                  t={t}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* PHONE: ONE DAY AT A TIME, SIX PAGES — hidden at `sm:` and above.
          `ScrollArea` carries whatever does not fit. This branch was already
          uncapped before the 23 Sep "Open column" ruling (it passed
          `cap={null}`); the ruling made its reading the only reading, so the
          prop went and the two branches are now the same call. */}
      <div className={cn("flex flex-col sm:hidden", WEEK_COLUMN_GAP)}>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Previous day")}
            disabled={pagerIndex === 0}
            onClick={() => setPagerIndex((i) => Math.max(0, i - 1))}
          >
            <CaretLeft />
          </Button>
          <div className="text-sm font-medium">
            {pagerIndex < 5
              ? `${weekdayLabels[pagerIndex]} ${weekDays[pagerIndex].getDate()}`
              : t("Weekend")}
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="size-8"
            aria-label={t("Next day")}
            disabled={pagerIndex === 5}
            onClick={() => setPagerIndex((i) => Math.min(5, i + 1))}
          >
            <CaretRight />
          </Button>
        </div>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <div className={cn("flex flex-col pe-3", WEEK_COLUMN_GAP)}>
            {pagerIndex < 5 ? (
              <WeekDayBody
                entries={byDay.get(dayKeyOf(weekDays[pagerIndex])) ?? []}
                loading={loading}
                onSelect={onSelect}
                t={t}
              />
            ) : (
              [5, 6].map((i) => {
                const d = weekDays[i]
                const key = dayKeyOf(d)
                return (
                  <div key={key} className={cn("flex min-w-0 flex-col", WEEK_WEEKEND_GAP)}>
                    <WeekDayHead
                      compact
                      weekday={weekdayLabels[i]}
                      dateNum={d.getDate()}
                      count={(byDay.get(key) ?? []).length}
                      today={key === todayKey}
                    />
                    <WeekDayBody
                      entries={byDay.get(key) ?? []}
                      loading={loading}
                      onSelect={onSelect}
                      t={t}
                    />
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>

    </div>
  )
}
