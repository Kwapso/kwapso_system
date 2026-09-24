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
// their own components, in ONE grid row that stacks below `lg`
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
import { StatGrid } from "@shared/ui/components/stat-grid/stat-grid"
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
import { RecordMark } from "@shared/web/record-mark"
import type { Language } from "@shared/i18n"

import { tenancy } from "@/lib/api"
import type { AccountsDashboard as AccountsDashboardData } from "@/lib/api/tenancy"
import { accountsDashboardKey } from "@/lib/live-resources"

type T = (s: string, vars?: Record<string, string | number>) => string

/** THE ONE MARK ON THE LINE — see this file's own header for why one neutral
 * ink is the whole palette on a single-series picture, and why the donut
 * beside it is the one thing on this tab that takes data hues. */
const LINE_COLOUR = "var(--ink-tertiary)"

/** `donut.tsx`'s own `SEGMENT_COLOURS`, in the same order — see `CountrySplit`'s
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

/** ONE FIGURE — THE KIT'S OWN STAT TILE, IN THE KIT'S OWN CARD.
 *
 * Aurora, 23 Sep 2026, verbatim: "the cards kpi need some kind of background,
 * like effort." So this is `effort-card.tsx`'s treatment, not a third one:
 * `<StatGrid surface="bare">` (the kit's eyebrow-over-figure register) inside
 * a `<Card variant="default">`, which is the card background `StatGrid` itself
 * cannot give a tile nested this deep — her own word for what a tile is, the
 * same session she named it: "this is a metric, like in kit".
 *
 * IT IS A TONE, NOT A BOX, so the kit's newest law is not in tension with her
 * ruling. §2.8 (kit docs/RULES.md, her own 23 Sep ruling "by rule no borders
 * nowhere in the kit") forbids a container told from its ground by a STROKE —
 * a `border`, or the hairline shadow the kit used as its remedy for one.
 * `Card variant="default"` draws neither: it is soft paper, `.kw-card`, a
 * FILL. Checked rather than assumed, because "give it a background" is the
 * one instruction a reader could answer with an outline.
 *
 * AND IT OVERTURNS R97 FOR THIS TAB, WHICH IS HER CALL AND NOT THIS FILE'S.
 * R97 is "a count never gets its own card, UNLESS EXPLICITLY SAID" — the
 * exception its own text leaves open, and which the law's own exemption table
 * has carried as "pending her word" for the three dashboard-shaped `StatGrid`
 * sites since it shipped. She has now said it, of this exact tab, so
 * `accounts-dashboard.tsx` joins that table with her sentence as the reason
 * rather than a guess. The previous shape of this component — the same two
 * type steps by hand, no card — is what she was looking at when she asked for
 * the background. */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="default">
      <CardContent>
        <StatGrid items={[{ id: label, label, value }]} surface="bare" label={label} />
      </CardContent>
    </Card>
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

/** WHERE THEY ARE, AS A DONUT, AND THE HOVER SAYS WHO — her 23 Sep 2026
 * rulings, verbatim: "make the where as a donut graphic (when hover show)" and
 * then "when hover in donut in country, show which aacounts with name adn
 * logo".
 *
 * THE RING IS THE KIT'S OWN `Donut` and nothing here draws a second one. It
 * supplies the ring, the `--chart-1..5` sequence, the empty register — and,
 * since v1.2.167, the ACTIVE SEGMENT: `activeId`/`onActiveChange` report which
 * slice a pointer is on, which is what makes her second ruling answerable at
 * all. The kit's own header used to read "hover — none drawn"; the lane that
 * changed that is why this component can ask the question.
 *
 * SO THE READOUT IS DRIVEN BY THE RING, not by a second control beside it.
 * Hovering a slice (or focusing its legend row, which sets the same state)
 * names the companies in it, each with the face the app already draws for a
 * company — `RecordMark` over the account's own `logoUrl`, falling back to its
 * letter tile where there is no picture. Nothing here invents a second
 * fallback; a company with no logo looks the way it looks everywhere else.
 *
 * BOUNDED, AND HONEST ABOUT IT. The door names at most
 * `ACCOUNTS_COUNTRY_FACES_PER_ROW` companies per country while `n` stays
 * exact, so a slice with more says how many more rather than showing eight and
 * implying that is all of them.
 *
 * THE LEGEND ROWS ARE STILL REAL `<button>`s, because a hover is not an
 * affordance everybody has: they are in the tab order, they set the same
 * active slice on focus, and each carries its own whole readout as its
 * accessible NAME — `ClosureTrend`'s own rule, one translation read twice. */
function CountrySplit({
  rows,
  t,
}: {
  rows: AccountsDashboardData["byCountry"]
  t: T
}) {
  const [active, setActive] = React.useState<string | null>(null)

  if (rows.length === 0)
    return (
      <p className="text-muted-foreground text-xs">
        {t("No country is set on an active account yet.")}
      </p>
    )

  const total = rows.reduce((sum, r) => sum + r.n, 0)
  const segments = rows.map((r) => ({ id: r.country, label: r.country, value: r.n }))
  const shareOf = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const said = (country: string, n: number) =>
    `${country} · ${t("{count} accounts, {percent}% of the book", { count: n, percent: shareOf(n) })}`
  const shown = rows.find((r) => r.country === active) ?? null

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-[var(--space-4)]">
        <Donut
          data={segments}
          legend={false}
          size="8.5rem"
          /* CONTROLLED AT ALL TIMES, and `null` is a VALUE here rather than
             an absence. `donut.tsx` decides control with `activeId !==
             undefined`, so handing it `undefined` when nothing is hovered
             would flip the ring back to its own internal state mid-life and
             leave the two disagreeing about which slice is lit. `active` is
             `string | null` and is passed straight through. */
          activeId={active}
          onActiveChange={setActive}
          label={t("Where they are")}
          summary={rows.map((r) => said(r.country, r.n)).join(" · ")}
        />
        {/* THE LEGEND'S DOTS READ THE SAME SEQUENCE THE RING DOES, by position
            — `donut.tsx`'s `SEGMENT_COLOURS` is `--chart-1..5` cycled by index
            and is not exported, so the sequence is restated here rather than
            reached for privately across a module boundary that was never made
            public. Pinned by `web/test/accounts-dashboard-tab.test.ts`, which
            reads BOTH files off disk. */}
        <div className="flex min-w-0 flex-col gap-1">
          {rows.map((r, i) => (
            <button
              key={r.country}
              type="button"
              aria-label={said(r.country, r.n)}
              data-slot="split-slice"
              onMouseEnter={() => setActive(r.country)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(r.country)}
              onBlur={() => setActive(null)}
              className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-1 text-start text-xs hover:bg-muted"
            >
              <span
                aria-hidden="true"
                className="size-[0.5625rem] shrink-0 rounded-pill"
                style={{ background: DONUT_SEGMENT_COLOURS[i % DONUT_SEGMENT_COLOURS.length] }}
              />
              <span className="min-w-0 truncate">{r.country}</span>
            </button>
          ))}
        </div>
      </div>

      {/* WHO IS IN THE SLICE — under the picture rather than floating over it.
          A hover card would cover the ring the pointer is ON, and the list is
          faces rather than one line, so it wants room a popover does not have.
          The row keeps its own height whether or not anything is hovered (an
          empty `min-h`), so the panels beneath it do not jump as a pointer
          crosses the ring. */}
      <div className="min-h-9" data-slot="country-accounts">
        {shown ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {shown.accounts.map((a) => (
              <span key={a.id} className="flex min-w-0 items-center gap-1.5 text-xs">
                <RecordMark picture={a.logoUrl} name={a.name} />
                <span className="min-w-0 truncate">{a.name}</span>
              </span>
            ))}
            {shown.n > shown.accounts.length ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                {t("and {count} more", { count: shown.n - shown.accounts.length })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** WHAT THEY DO, AS BARS — her 23 Sep 2026 ruling, verbatim: "make industry a
 * bar chart."
 *
 * COUNTRY STAYS A DONUT AND THEY STILL SHARE THE ROW, which is the whole of
 * the instruction: two readings of the book side by side, told apart by their
 * MARK rather than by their place. A donut answers "what share of the whole",
 * which is the question about where clients are; a ranked bar answers "which
 * is biggest, and by how much", which is the question about what they do — and
 * an industry list is longer and its words are longer, so a legend of eleven
 * countries' worth of colour would have been unreadable where a column of
 * eleven named bars is not.
 *
 * ONE NEUTRAL INK, NOT THE CHART SEQUENCE. A ranked bar chart is a SINGLE
 * SERIES: the name is beside every bar, so a hue would be a second encoding of
 * a fact already written down. The same mark `tickets-dashboard.tsx`'s own
 * `RaisedByRow` uses, and the same argument the arrivals line beside it makes.
 *
 * THE VALUE IS NOT BEHIND A HOVER HERE. Her "(when hover show)" was said of
 * the donut, where a slice has nowhere to write a number; a bar has its own
 * row and the count sits at the end of it, which is what every other ranked
 * bar in this app already does. */
function IndustryBars({
  rows,
  t,
}: {
  rows: AccountsDashboardData["byIndustry"]
  t: T
}) {
  if (rows.length === 0)
    return (
      <p className="text-muted-foreground text-xs">
        {t("No industry is set on an active account yet.")}
      </p>
    )
  const scale = Math.max(1, ...rows.map((r) => r.n))
  return (
    <div className="flex min-w-0 flex-col gap-1.5" data-slot="industry-bars">
      {rows.map((r) => (
        <div key={r.industry} className="flex min-w-0 items-center gap-2">
          <span className="w-28 shrink-0 truncate text-xs" title={r.industry}>
            {r.industry}
          </span>
          {/* A BAR ON A TRACK — the shape `tickets-dashboard.tsx`'s own `Bar`
              draws, written out here rather than imported: it is four lines,
              and pulling a ticket-shaped internal into an accounts screen
              would tie two modules together for a primitive neither owns. */}
          <div
            data-slot="industry-bar"
            className="bg-muted h-5 min-w-0 flex-1 overflow-hidden rounded-[var(--radius-bar)]"
          >
            <div
              className="h-full rounded-[var(--radius-bar)]"
              style={{
                width: `${Math.max((r.n / scale) * 100, r.n > 0 ? 3 : 0)}%`,
                backgroundColor: LINE_COLOUR,
              }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs tabular-nums">{r.n}</span>
        </div>
      ))}
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
          <CountrySplit rows={data.byCountry} t={t} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {/* "WHAT THEY DO", not "Industry" — the neighbouring title is a
              QUESTION ("Where they are"), and a pair of sections reading
              "Where they are" and "Industry" is two registers on one row. The
              FIELD is still called Industry everywhere a person sets one (the
              form's label, the Choices group, the record's own fact line), so
              nothing here invents a second word for the thing itself. */}
          <SectionTitle>{t("What they do")}</SectionTitle>
          <IndustryBars rows={data.byIndustry} t={t} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <SectionTitle>{t("How long we have had them")}</SectionTitle>
        <Arrivals rows={data.arrivals} lang={lang} t={t} />
      </div>
    </div>
  )
}
