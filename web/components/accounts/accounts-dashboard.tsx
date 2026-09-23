"use client"

// THE ACCOUNTS DASHBOARD — her ruling, 23 Sep 2026, verbatim: "ok, implement
// dashbaprd for clients, make it te 1st tab (dhasbaprd always first card). do
// not sdd the sections what you do not know yet, nor the cities, nor how lon
// its been, nor can reach the portal."
//
// She reviewed a design and struck four things from it. What survives is
// three: how many active accounts there are and how many countries they sit
// in, where they are BY COUNTRY, and when they arrived, month by month, off
// each account's own `created_at`. Nothing else — no missing-field readout,
// no town breakdown, no tenure, no portal-reach column. Those four are not
// filtered out of a bigger read here; `readAccountsDashboard`
// (workers/tenancy/src/lib/accounts.ts) never asks the database for them at
// all, so there is nothing this file could accidentally draw a chart of.
//
// ACTIVE, EVERYWHERE — her own emphasis. Every number on this tab is over the
// active company book (never inactive, never archived, never a person linked
// under one): the door's own fence, not a filter this component could get
// wrong.
//
// ── THE SHAPE, BORROWED FROM THE ONE SCREEN THAT ALREADY HAS A DASHBOARD ────
//
// `tickets-dashboard.tsx` is the established pattern for exactly this kind of
// tab in this app: one door read of grouped counts, drawn as small pictures
// rather than tallied over a loaded page. This file follows it at a much
// smaller scale — three questions instead of eleven, so three small marks
// rather than six panels — and keeps the same three states (loading, error,
// nothing yet) and the same "plain" surface (R67: a grouping section paints
// nothing by default) rather than inventing a fourth reading for one tab.
//
// A MINIMAL READING ON PURPOSE — her own screen struck four sections from a
// design that had them; what is left is drawn at R67/R103/R108/R109's own
// ceiling and no higher: no hover cards, no legend, no second colour. A bar
// is `var(--ink-tertiary)` throughout — the same neutral mark
// `tickets-dashboard.tsx`'s own `RaisedByRow` uses for a single-series rank —
// because nothing on this tab is a SERIES needing telling apart; it is one
// number, counted two ways.

import * as React from "react"

import { Card, CardContent } from "@shared/ui/components/card/card"
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

/** THE ONE MARK ON THIS TAB — see this file's own header for why one colour is
 * the whole palette here. */
const BAR_COLOUR = "var(--ink-tertiary)"

/** R108's OWN EYEBROW, the same small-caps register every record section's
 * title already carries (`TicketSidePanel`/`EmptyGatedPanel`) — this tab has
 * no record to stand on, so it is spelled out here rather than reached
 * through either host, but the class is theirs, verbatim, so a reader sees
 * one style for "a title over a section" everywhere in the app. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-micro text-muted-foreground uppercase">{children}</h3>
}

/** ONE HORIZONTAL BAR ON A TRACK — the same shape `tickets-dashboard.tsx`'s
 * own `Bar` draws, reused here as a plain function rather than an import: it
 * is four lines, and importing a ticket-shaped internal into an accounts
 * screen would tie two modules together for a primitive neither owns. */
function Bar({ fraction }: { fraction: number }) {
  return (
    <div className="bg-muted h-5 min-w-0 flex-1 overflow-hidden rounded-[var(--radius-bar)]">
      <div
        className="h-full rounded-[var(--radius-bar)]"
        style={{
          width: `${Math.max(fraction * 100, fraction > 0 ? 3 : 0)}%`,
          backgroundColor: BAR_COLOUR,
        }}
      />
    </div>
  )
}

/** WHERE THEY ARE, BY COUNTRY ONLY — her own strike-through leaves nothing
 * else this panel could rank by. A country nobody set on the account is not a
 * row here (`readAccountsDashboard`'s own header says why): this draws only
 * what the door counted, and says nothing about what it left out — the town
 * breakdown and the missing-field readout are both struck, not summarised. */
function ByCountry({
  rows,
  t,
}: {
  rows: AccountsDashboardData["byCountry"]
  t: (s: string) => string
}) {
  if (rows.length === 0)
    return <p className="text-muted-foreground text-xs">{t("No country is set on an active account yet.")}</p>
  const scale = Math.max(1, ...rows.map((r) => r.n))
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {rows.map((r) => (
        <div key={r.country} className="flex min-w-0 items-center gap-2">
          <span className="w-28 shrink-0 truncate text-xs" title={r.country}>
            {r.country}
          </span>
          <Bar fraction={r.n / scale} />
          <span className="w-6 shrink-0 text-right text-xs tabular-nums">{r.n}</span>
        </div>
      ))}
    </div>
  )
}

/** WHEN THEY ARRIVED, OFF EACH ACCOUNT'S OWN `created_at` — one bar per
 * calendar month, oldest first, over the WHOLE relationship (never a rolling
 * window: see `readAccountsDashboard`'s own header for why this differs from
 * the ticket dashboard's twelve-month trend). Plain bars rather than the
 * ticket dashboard's filled SVG trend: there is one series here, not four,
 * and a month-by-month count is a bar chart's own shape, not an area's. */
function Arrivals({
  rows,
  lang,
  t,
}: {
  rows: AccountsDashboardData["arrivals"]
  lang: Language
  t: (s: string) => string
}) {
  if (rows.length === 0)
    return <p className="text-muted-foreground text-xs">{t("Nothing has arrived yet.")}</p>
  const scale = Math.max(1, ...rows.map((r) => r.n))
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* A FIXED-HEIGHT TRACK, so a percentage bar inside it has something
          real to be a percentage OF — the same reason the ticket dashboard's
          own trend box measures itself from a sibling rather than trusting an
          auto-height ancestor. This panel has no sibling to measure from, so
          it carries its own floor instead. */}
      <div className="flex min-w-0 items-stretch gap-1 overflow-x-auto" style={{ height: "5rem" }}>
        {rows.map((r) => (
          <div
            key={r.month}
            className="flex h-full min-w-[0.4rem] flex-1 flex-col justify-end"
            title={`${formatMonth(`${r.month}-01`, lang)} · ${r.n}`}
          >
            <div
              className="w-full rounded-t-[var(--radius-sm)]"
              style={{
                height: `${Math.max((r.n / scale) * 100, r.n > 0 ? 4 : 0)}%`,
                backgroundColor: BAR_COLOUR,
              }}
            />
          </div>
        ))}
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
  // there is nowhere for this check and the panels below it to disagree.
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
      {/* THE SMALL ROW OF FIGURES — her own words, "a small row", so this is
          text beside its own label rather than a card (R97: a count never
          gets its own card). Active accounts, then the countries they sit
          in, both exact (R16) and both counted over the identical fence. */}
      <div className="flex flex-wrap items-baseline gap-8">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-[var(--font-weight-medium)] tabular-nums">{data.activeCount}</span>
          <span className="text-muted-foreground text-sm">{t("active accounts")}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-[var(--font-weight-medium)] tabular-nums">{data.countryCount}</span>
          <span className="text-muted-foreground text-sm">{t("countries")}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <SectionTitle>{t("Where they are")}</SectionTitle>
        <ByCountry rows={data.byCountry} t={t} />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <SectionTitle>{t("When they arrived")}</SectionTitle>
        <Arrivals rows={data.arrivals} lang={lang} t={t} />
      </div>
    </div>
  )
}
