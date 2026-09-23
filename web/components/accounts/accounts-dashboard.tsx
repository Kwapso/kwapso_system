"use client"

// THE ACCOUNTS DASHBOARD — her ruling, 23 Sep 2026, verbatim: "ok, implement
// dashbaprd for clients, make it te 1st tab (dhasbaprd always first card). do
// not sdd the sections what you do not know yet, nor the cities, nor how lon
// its been, nor can reach the portal."
//
// She reviewed a design and struck four things from it. Three survived: how
// many active accounts there are and how many countries they sit in, where
// they are BY COUNTRY, and when they arrived, month by month, off each
// account's own `created_at`.
//
// ── HER SECOND PASS, THE SAME DAY, LOOKING AT THE BUILT SCREEN ──────────────
//
// Four rulings, verbatim:
//
//   1. "on accounts oevrview, fix how the kpis cards look, and add the median
//      tenure"
//   2. "make the where as a donut graphic (when hover show)"
//   3. "make the how long weve had this account a line graphic, and when hover
//      show who (like tickets tendency)"
//   4. "on accounts dashbard, the mandatory space between tabs and content is
//      missing"
//
// AND A FIFTH, LATER THE SAME DAY: "add metric industry (side of where they
// are , so in the same row country & industry)." So the country split has a
// twin beside it now, read through the identical fence and drawn through the
// identical component (`SplitDonut`), in ONE grid row that stacks below `lg`
// the way every panel row on the ticket dashboard already does. Her second
// ruling of the pair — "make it a drop down, adjustable on settings" — is not
// in this file at all: it is the account FORM, the write DOOR and team
// migration 0120, because a breakdown of a free-typed column is a chart of
// typing habits ("Insurance" and "Insurance Broker" are two live spellings of
// what may be one trade). This tab draws whatever words the book holds and
// merges nothing; merging two of them is a rename on the Choices screen, and
// Aurora's to make.
//
// ITEM 4 IS NOT IN THIS FILE, ON PURPOSE. It is R83, and it was missing here
// because the law is paid by the CONTENT under a strip and the only payer
// the app had written was a `[data-slot="card"]` — every other tab on this
// strip is a `<CollectionCard>`, this one is bare panels. A per-screen margin
// here would be the second opinion about one number R83 exists to forbid, so
// the payment moved into `web/app/globals.css` beside the card's own, where
// every bare-bodied tab in the app collects it at once. See
// `web/test/tab-content-gap.test.ts`.
//
// ITEM 1 IS A LOOK COMPLAINT, NOT A DATA ONE — except for the median, which
// is new. The figures were a wrapping baseline row (`text-3xl` beside a grey
// word, `gap-8`), which is a sentence rather than a set of figures: nothing
// aligned down the screen, no label register, and the two numbers read as one
// run-on line. They are the KIT'S OWN STAT REGISTER now — `text-micro`
// uppercase eyebrow over a `text-4xl` figure, `stat-grid.tsx`'s own two steps
// — laid on a real grid so three figures line up on one baseline and each
// owns a column. STILL NOT CARDS AND STILL NOT `<StatGrid>` (R97: "a count
// never gets its own card", and the kit's own primitive is a number-and-label
// CARD by construction). Her running direction is the same subtraction the
// rest of this tab already keeps: less chrome, no box, the hierarchy done in
// type.
//
// ── THE SHAPE, BORROWED FROM THE ONE SCREEN THAT ALREADY HAS A DASHBOARD ────
//
// `tickets-dashboard.tsx` is the established pattern for exactly this kind of
// tab in this app: one door read of grouped counts, drawn as small pictures
// rather than tallied over a loaded page. This file follows it — the same
// three states (loading, error, nothing yet), the same "plain" surface (R67),
// and, since her item 3, the same HOVER LANGUAGE: a real `<button>` hit area
// over the plot, the kit's `HoverCard` on it (which opens on FOCUS as well as
// on hover), and the whole readout repeated as the button's accessible NAME
// so a screen reader hears the figures whether or not the card ever opens.
// That is `ClosureTrend`'s own arrangement, copied rather than re-invented —
// her "like tickets tendency" is a request for the same behaviour, not a
// second one that looks like it.
//
// TWO PALETTES ON ONE TAB, AND THE LINE BETWEEN THEM. The donut takes the
// kit's data sequence (`--chart-1..5`, through the kit component) because its
// whole job is telling countries APART. The line takes one neutral ink
// (`--ink-tertiary`) because it is ONE series — the same mark
// `tickets-dashboard.tsx`'s own `RaisedByRow` uses for a single-series rank.
// A hue on a single series is a legend entry with nothing to distinguish.

import * as React from "react"

import { Card, CardContent } from "@shared/ui/components/card/card"
import { Donut } from "@shared/ui/components/donut/donut"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@shared/ui/components/hover-card/hover-card"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Button } from "@shared/ui/components/button/button"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"
import { formatMonth } from "@shared/web/format"
import type { Language } from "@shared/i18n"

import { tenancy } from "@/lib/api"
import type { AccountsDashboard as AccountsDashboardData } from "@/lib/api/tenancy"
import { accountsDashboardKey } from "@/lib/live-resources"

type T = (s: string, vars?: Record<string, string | number>) => string

/** THE ONE MARK ON THE LINE — see this file's own header for why one neutral
 * ink is the whole palette on a single-series picture, and why the donut
 * beside it is the one thing on this tab that takes data hues. */
const LINE_COLOUR = "var(--ink-tertiary)"

/** `donut.tsx`'s own `SEGMENT_COLOURS`, in the same order — see `SplitDonut`'s
 * legend comment for why it is restated rather than imported, and for the
 * check that keeps the two from drifting. */
const DONUT_SEGMENT_COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

/** THE GREGORIAN MEAN MONTH, in days — the one conversion between the unit
 * the database can measure exactly (`julianday`, days) and the unit this
 * screen reads in.
 *
 * MONTHS, NOT DAYS AND NOT YEARS, because months are the unit the picture
 * under it already uses: the arrivals line's x-axis is one point per calendar
 * month, so "31 months" and the month a reader can point at on the line are
 * the same ruler. A tenure in days ("947") is a number nobody holds in their
 * head, and a tenure in years loses the resolution of a book whose oldest
 * account is about three years old.
 *
 * THE MEDIAN ITSELF IS NOT COMPUTED HERE. `readAccountsDashboard`
 * (workers/tenancy/src/lib/accounts.ts) takes it in the database, over every
 * active company rather than a loaded page; this is only how its answer is
 * spelled. */
const DAYS_PER_MONTH = 30.436875

/** R108's OWN EYEBROW, the same small-caps register every record section's
 * title already carries (`TicketSidePanel`/`EmptyGatedPanel`) — this tab has
 * no record to stand on, so it is spelled out here rather than reached
 * through either host, but the class is theirs, verbatim, so a reader sees
 * one style for "a title over a section" everywhere in the app. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-micro text-muted-foreground uppercase">{children}</h3>
}

/** ONE FIGURE — the kit's own stat register, by hand and deliberately not
 * through `<StatGrid>`.
 *
 * WHY NOT THE KIT PRIMITIVE. `StatGrid` is a number-and-label CARD by
 * construction, and R97 is explicit that a count never gets one ("just a
 * count next to the title … same as related tickets or related stories or
 * stakeholders"); its own census (`web/test/counts-beside-titles.test.ts`)
 * names every call site that draws one and requires an exemption with a
 * reason. Three counts on a dashboard are not the named exception, and
 * asking for one would be asking to overturn her rule rather than obey it.
 *
 * SO THE REGISTER IS BORROWED AND THE BOX IS NOT. The two type steps are
 * `stat-grid.tsx`'s own, verbatim — `text-micro` / 500 / uppercase for the
 * eyebrow (its "11 / 500 / uppercase / 0.08em" comment) and `text-4xl` / 500
 * for the figure (its "44 / 500 / -0.025em / 1.04") — so a reader sees one
 * treatment for "a headline number" whether it arrived through the kit
 * component or through this tab. */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-micro text-muted-foreground font-[var(--font-weight-medium)] uppercase">
        {label}
      </span>
      <span className="text-4xl font-[var(--font-weight-medium)] tabular-nums">{value}</span>
    </div>
  )
}

/** THE MEDIAN TENURE, SPELLED — `null` is the door's own "there is nothing to
 * be in the middle of" and is never printed as a zero (see `DAYS_PER_MONTH`
 * above, and the door's own header for why the value is `null` rather than 0).
 * A book younger than a month rounds to "0 months", which is true and readable;
 * it is not the same value as "no answer". */
function tenureText(days: number | null, t: T): string {
  if (days === null) return t("No answer yet")
  const months = Math.round(days / DAYS_PER_MONTH)
  return t("{count} months", { count: months })
}

/** A SPLIT OF THE BOOK, AS A DONUT — her item 2, verbatim: "make the where as
 * a donut graphic (when hover show)", and, the same day, "add metric industry
 * (side of where they are, so in the same row country & industry)".
 *
 * ONE COMPONENT, TWO SECTIONS, because they are one reading of two columns:
 * how the active company book divides by a single word each account carries.
 * A second hand-drawn legend would have been a second chance to disagree with
 * the ring beside it about what a colour means.
 *
 * THE RING IS THE KIT'S OWN `Donut` and nothing here draws a second one. It
 * supplies the ring, the `--chart-1..5` sequence and the empty register; this
 * file supplies only the data and the reading.
 *
 * THE LEGEND IS THIS FILE'S, AND THAT IS THE WHOLE OF THE DEVIATION — a
 * REPORTED KIT GAP, not a preference. `donut.tsx`'s own state table says it
 * in its own words: "2. hover — none drawn … it is switched off here (chapter
 * 18 and 19 draw no hover state on either specimen)". There is no
 * per-segment callback, no `activeIndex`, and the ring is rendered inside the
 * component, so a hover target cannot be handed in from outside either. Her
 * ruling asks for exactly the affordance the kit declines to draw. So the
 * ring comes from the kit (`legend={false}`) and the legend is drawn here as
 * real `<button>`s under the kit's `HoverCard` — the SAME hover language
 * `tickets-dashboard.tsx`'s `TallyBar` and `ClosureTrend` already use, rather
 * than a third one invented for this tab. A kit lane is building the real
 * per-segment hover; when it lands this legend collapses back into
 * `legend`/`showPercent`.
 *
 * AT REST THE PICTURE IS WHOLE — the ring and every word and colour. What
 * HOVER adds is the VALUE: how many accounts that slice is, and what share of
 * the book. Nothing is hidden that a reader needs to identify the picture;
 * the figure behind a slice is the thing they have to ask for. */
function SplitDonut({
  rows,
  label,
  empty,
  t,
}: {
  /** already busiest-first, from the door — never re-sorted here. */
  rows: { word: string; n: number }[]
  /** the figure's own accessible name, the section title it sits under. */
  label: string
  /** the one sentence a split with nothing in it says. */
  empty: string
  t: T
}) {
  if (rows.length === 0) return <p className="text-muted-foreground text-xs">{empty}</p>

  const total = rows.reduce((sum, r) => sum + r.n, 0)
  const segments = rows.map((r) => ({ id: r.word, label: r.word, value: r.n }))
  const shareOf = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  /** One row's whole readout as one sentence — the accessible NAME of its own
   * hit area, in the same words and the same order the card prints them, so
   * what a screen reader hears and what a sighted reader sees can never be
   * two different claims (`ClosureTrend`'s own rule, this file's header). */
  const said = (word: string, n: number) =>
    `${word} · ${t("{count} accounts, {percent}% of the book", { count: n, percent: shareOf(n) })}`

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-[var(--space-4)]">
      <Donut
        data={segments}
        legend={false}
        size="8.5rem"
        label={label}
        summary={rows.map((r) => said(r.word, r.n)).join(" · ")}
      />
      {/* THE LEGEND'S DOTS READ THE SAME SEQUENCE THE RING DOES, by position
          — `donut.tsx`'s `SEGMENT_COLOURS` is `--chart-1..5` cycled by index
          and is not exported, so the sequence is restated here rather than
          reached for privately across a module boundary that was never made
          public (the kit's own file says the same thing about copying
          `chart.tsx`'s list). It is pinned by
          `web/test/accounts-dashboard-tab.test.ts`, which reads BOTH files
          off disk and fails if they ever disagree — a colour key that drifts
          from its own ring is worse than no key. */}
      <div className="flex min-w-0 flex-col gap-1">
        {rows.map((r, i) => (
          <HoverCard key={r.word} openDelay={60} closeDelay={60}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                aria-label={said(r.word, r.n)}
                data-slot="split-slice"
                className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-1 text-start text-xs hover:bg-muted data-[state=open]:bg-muted"
              >
                <span
                  aria-hidden="true"
                  className="size-[0.5625rem] shrink-0 rounded-pill"
                  style={{ background: DONUT_SEGMENT_COLOURS[i % DONUT_SEGMENT_COLOURS.length] }}
                />
                <span className="min-w-0 truncate">{r.word}</span>
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="flex flex-col gap-1">
              <p className="text-sm">{r.word}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {t("{count} accounts, {percent}% of the book", { count: r.n, percent: shareOf(r.n) })}
              </p>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>
    </div>
  )
}

/** HOW LONG WE HAVE HAD THEM, AS A LINE — her item 3, verbatim: "make the how
 * long weve had this account a line graphic, and when hover show who (like
 * tickets tendency)".
 *
 * WHAT THIS REPLACED, AND WHY IT IS THE SAME QUESTION. The section was a row
 * of vertical bars, one per calendar month, over each active company's own
 * `created_at` — "When they arrived". How long we have had an account IS its
 * arrival read from today: a point far to the left is a client of three
 * years, a point on the right is one of three weeks. So the DATA is
 * unchanged and the MARK is what she ruled on; nothing was thrown away to
 * build this and no second door read was added for it.
 *
 * THE HOVER NAMES WHO, which is the half the bars could not do at all: a bar
 * with a `title` attribute said "Feb 2023 · 1" and left the reader to go and
 * find out which client that was. The door now hands back the NAMES behind
 * each month (`arrivals[].names`, bounded — see its own doc), and the exact
 * `n` rides beside them so a month with more companies than the panel may
 * name says how many more rather than pretending the list was all of them.
 *
 * IT IS `ClosureTrend`'S ARRANGEMENT, NOT A LOOKALIKE. Her "like tickets
 * tendency" is a request for that behaviour: a unit-square `viewBox` under
 * `preserveAspectRatio="none"` with the strokes kept honest by
 * `vector-effect`, the months drawn as rules BEHIND the mark, one HTML hit
 * area per month laid over the plot (an element hit area keeps its own
 * geometry where an SVG `<rect>` would be stretched with everything else),
 * each hit area a real `<button>` so the kit's hover card opens on focus too,
 * and the whole readout carried as that button's accessible name. */
function Arrivals({
  rows,
  lang,
  t,
}: {
  rows: AccountsDashboardData["arrivals"]
  lang: Language
  t: T
}) {
  if (rows.length === 0)
    return <p className="text-muted-foreground text-xs">{t("Nothing has arrived yet.")}</p>

  const top = Math.max(1, ...rows.map((r) => r.n)) * 1.15
  const x = (i: number) => (rows.length === 1 ? 50 : (i / (rows.length - 1)) * 100)
  const y = (v: number) => 100 - (v / top) * 100
  const points = rows.map((r, i) => `${x(i)},${y(r.n)}`)

  /** The month's whole readout as one sentence — see this component's own
   * header. The names are the same list, in the same order, the card below
   * prints, so the two channels can never make different claims. */
  const said = (r: AccountsDashboardData["arrivals"][number]) => {
    const rest = r.n - r.names.length
    return [
      formatMonth(`${r.month}-01`, lang),
      t("{count} arrived", { count: r.n }),
      ...r.names,
      ...(rest > 0 ? [t("and {count} more", { count: rest })] : []),
    ].join(" · ")
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* `--radius-sm`, not `--radius-bar`: this box is not a bar, it is the
          plot's GROUND — the identical reasoning `ClosureTrend`'s own plot
          box carries. The height is this panel's own floor: unlike the ticket
          trend it has no grid sibling to measure itself from, so it carries
          the number rather than trusting an auto-height ancestor. */}
      <div className="bg-muted relative h-40 min-w-0 overflow-hidden rounded-[var(--radius-sm)]">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("How long we have had them, month by month")}
          className="absolute inset-0 block size-full"
        >
          {/* THE MONTHS, AS RULES BEHIND THE WORK — drawn first so the line
              and its fill sit on top of them. `--border` is the app's own
              hairline token, which flips with the palette, so one value is
              right on both papers. NAMED with a slot of this panel's own:
              the lone-month DOT below is also a `<line>`, and a check about
              the data must never end up counting the furniture (the same
              trap `ClosureTrend`'s own `trend-month-rule` comment records). */}
          {rows.map((r, i) => (
            <line
              key={r.month}
              data-slot="arrivals-month-rule"
              x1={x(i)}
              y1={0}
              x2={x(i)}
              y2={100}
              stroke="var(--border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {rows.length === 1 ? (
            /* ONE MONTH IS STILL A MARK. A zero-length line with a round cap
               is a DOT in SVG, and it is the one dot shape that survives
               `preserveAspectRatio="none"` — `vector-effect` makes the cap a
               true circle in device pixels where a `<circle>` would be
               squashed into an ellipse by the same non-uniform scale. */
            <line
              data-slot="arrivals-point"
              x1={x(0)}
              y1={y(rows[0]!.n)}
              x2={x(0)}
              y2={y(rows[0]!.n)}
              stroke={LINE_COLOUR}
              strokeWidth={5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <>
              <polygon
                points={`${x(0)},100 ${points.join(" ")} ${x(rows.length - 1)},100`}
                fill={LINE_COLOUR}
                opacity={0.2}
              />
              <polyline
                data-slot="arrivals-line"
                points={points.join(" ")}
                fill="none"
                stroke={LINE_COLOUR}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
        {/* ── ONE HIT AREA PER MONTH, IN HTML, OVER THE PLOT ────────────────
            Each band runs from the midpoint of the gap before its month to
            the midpoint of the gap after it, so the area a pointer has to
            find is centred on the point it is about — the first and last
            months own only their half, which is why this is arithmetic
            rather than a flex row of equal children. `ClosureTrend`'s own
            shape, and its own reasons. */}
        <div className="absolute inset-0">
          {rows.map((r, i) => {
            const left = i === 0 ? 0 : (x(i - 1) + x(i)) / 2
            const right = i === rows.length - 1 ? 100 : (x(i) + x(i + 1)) / 2
            const rest = r.n - r.names.length
            return (
              <HoverCard key={r.month} openDelay={60} closeDelay={60}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    aria-label={said(r)}
                    data-slot="arrivals-month"
                    className="absolute inset-y-0 rounded-[var(--radius-sm)] hover:bg-background/50 data-[state=open]:bg-background/50"
                    style={{ left: `${left}%`, width: `${right - left}%` }}
                  />
                </HoverCardTrigger>
                <HoverCardContent className="flex flex-col gap-1">
                  <p className="text-sm tabular-nums">{formatMonth(`${r.month}-01`, lang)}</p>
                  {/* WHO — her own word. The names are the point of this
                      card; the count above them is what says whether the
                      list is the whole month or the front of it. */}
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {t("{count} arrived", { count: r.n })}
                  </p>
                  {r.names.map((name) => (
                    <p key={name} className="text-xs">
                      {name}
                    </p>
                  ))}
                  {rest > 0 ? (
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {t("and {count} more", { count: rest })}
                    </p>
                  ) : null}
                </HoverCardContent>
              </HoverCard>
            )
          })}
        </div>
      </div>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{formatMonth(`${rows[0]!.month}-01`, lang)}</span>
        {rows.length > 1 ? <span>{formatMonth(`${rows[rows.length - 1]!.month}-01`, lang)}</span> : null}
      </div>
    </div>
  )
}

/** THE DASHBOARD TAB ITSELF. One door read (`tenancy.accountsDashboard`), one
 * cache entry (`accountsDashboardKey`), no toolbar — the same reasoning the
 * ticket dashboard's own header gives for dropping its search box: there is
 * nothing on this tab for a browser to sieve, R48's named exception rather
 * than an oversight. */
export function AccountsDashboard({ teamId, lang }: { teamId: string; lang: Language }) {
  const t = useT()
  const dashQ = useCached<AccountsDashboardData>(accountsDashboardKey(teamId), () =>
    tenancy.accountsDashboard()
  )
  const data = dashQ.data
  const loading = data === undefined

  // NO PAPER (R67/R103) — `variant="plain"` and no padding class of its own,
  // the identical shape the ticket dashboard's own error and empty registers
  // draw (that file's own header, "NO PAPER, 22 SEP 2026"): the whole
  // dashboard family reads as one plain surface rather than one tab
  // disagreeing with the other.
  if (dashQ.error)
    return (
      <Card variant="plain" data-surface="plain">
        <CardContent>
          <ShapeStateBody
            shape="collectionScreen"
            state="error"
            copy={{ errorTitle: t("Couldn't load the dashboard.") }}
            action={
              <Button variant="secondary" onClick={() => dashQ.refresh()}>
                {t("Try again")}
              </Button>
            }
          />
        </CardContent>
      </Card>
    )

  if (loading) return <Skeleton className="h-48 w-full rounded-[var(--radius)]" />

  // R103's OWN QUESTION, ASKED HONESTLY. A team with no active accounts yet
  // draws one sentence and nothing else — never a chart of nothing, and never
  // a figures row reading "0" beside two empty panels underneath it. The
  // door's own `activeCount` is the one honest gate: it is exact (R16) and it
  // is the same fence every other figure on this tab is counted through, so
  // there is nowhere for this check and the panels below it to disagree. It
  // is also the one state in which `medianTenureDays` is `null`, which is why
  // no figure below has to draw a "no answer" it can never actually reach.
  if (data.activeCount === 0)
    return (
      <Card variant="plain" data-surface="plain">
        <CardContent>
          <ShapeStateBody
            shape="collectionScreen"
            state="empty"
            copy={{
              emptyTitle: t("No active accounts yet."),
              emptyDescription: t("Add your first account and its figures will show here."),
            }}
          />
        </CardContent>
      </Card>
    )

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* THE FIGURES — her item 1. A real grid rather than the wrapping
          baseline row it was, so three figures line up on one baseline and
          each owns a column at every width; no card and no `<StatGrid>`
          (R97), the register borrowed from the kit and the box left behind.
          See `Figure` above. */}
      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        <Figure label={t("Active accounts")} value={String(data.activeCount)} />
        <Figure label={t("Countries")} value={String(data.countryCount)} />
        <Figure label={t("Median tenure")} value={tenureText(data.medianTenureDays, t)} />
      </div>

      {/* TWO SECTIONS IN ONE ROW — her item, verbatim: "add metric industry
          (side of where they are , so in the same row country & industry)".
          `lg:grid-cols-2` and one column below it, which is the SAME
          arrangement every panel row on `tickets-dashboard.tsx` keeps (its own
          `grid min-w-0 gap-4 lg:grid-cols-3`): a stacking rule invented here
          would be a second opinion about a question that screen has already
          answered. The gap is this column's own `gap-6`, so a pair side by
          side is exactly as far apart as two sections stacked. */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <SectionTitle>{t("Where they are")}</SectionTitle>
          <SplitDonut
            rows={data.byCountry.map((r) => ({ word: r.country, n: r.n }))}
            label={t("Where they are")}
            empty={t("No country is set on an active account yet.")}
            t={t}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {/* "WHAT THEY DO", not "Industry" — the neighbouring title is a
              QUESTION ("Where they are"), and a pair of sections reading
              "Where they are" and "Industry" is two registers on one row. The
              FIELD is still called Industry everywhere a person sets one (the
              form's label, the Choices group, the record's own fact line), so
              nothing here invents a second word for the thing itself. */}
          <SectionTitle>{t("What they do")}</SectionTitle>
          <SplitDonut
            rows={data.byIndustry.map((r) => ({ word: r.industry, n: r.n }))}
            label={t("What they do")}
            empty={t("No industry is set on an active account yet.")}
            t={t}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <SectionTitle>{t("How long we have had them")}</SectionTitle>
        <Arrivals rows={data.arrivals} lang={lang} t={t} />
      </div>
    </div>
  )
}
