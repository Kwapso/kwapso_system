"use client"

// THE ACTIVITY RAIL — the door on the record footer, and the slide-in behind it.
//
// THE CLIENT, 2026-09-06, VERBATIM: "I don't want to have activity as a tab
// anywhere but on the footer, on top of the dates. On the right column, on
// Latest Activity, I would like some view or expand or whatever, and this would
// open a slide-in with all the activity." And 2026-09-07, naming the shape:
// "recoerd activity- implemet 'A · in the eyebrow row' across the app. kill all
// old activity tabs. For the design, let's do a a 6 - but make it slide in in
// desktop and slide up in phone".
//
// The tabs are gone. This is the other half of that sentence: the DOOR (a link
// on the footer's Latest-activity eyebrow row, costing no vertical space) and
// the ROOM behind it (the kit's `EdgePanel` — shape 06, non-modal beside the
// record above 45rem, a modal bottom sheet below it, which is her "slide in in
// desktop and slide up in phone" already written; edge-panel.tsx carries the
// whole argument and the asymmetry is deliberate).
//
// ONE COMPONENT, TWO HOSTS, THIRTEEN-PLUS SCREENS. The trigger and the panel
// share one piece of state — "is it open" — and the thing that opens a rail is
// the thing that has to know it is open (`EdgePanel`'s own `open` doc says why
// there is no uncontrolled twin). So they are ONE node, not two, and the whole
// node goes in the footer's trailing slot. That is safe because `EdgePanel`
// PORTALS to `document.body`: nothing of the panel is painted at the trigger's
// position, so a rail rendered inside a 13px inline span is still a 420-wide
// panel fixed to the viewport's reading edge. What the hosts have to place is
// one node in one slot, which is what made this cheap to wire centrally instead
// of at every record screen —
//   · web/components/record-chrome.tsx      the thirteen bespoke details
//   · web/components/deep-link/module-content.tsx  the recipe-driven ones
// and nowhere else.
//
// ── WHAT IS BEHIND THE DOOR IS `<ActivityPanel>`, UNCHANGED ─────────────────
//
// web/components/activity-panel.tsx was the body of the Activity TAB on every
// record: the feed, its three registers (loading / error / empty), the note
// composer and the R14 pager. Not one line of it changed for this move, which
// is the point — a tab was a PLACE, not the thing. R14 is satisfied here and
// nowhere else on a record screen: the footer's own column is a SUMMARY (the
// newest three), the count on this door is the exact server total of the WHOLE
// history, and the only way that number is not a lie about what a person can
// reach is that pressing it opens a feed with `<LoadMore>` under it.
//
// ── WHEN THERE IS NOTHING BEHIND IT, THE DOOR IS NOT DRAWN ──────────────────
//
// The decision, and the argument against it first, because the kit makes it:
// `RecordDetail`'s own note says this slot "can bring the footer's activity
// column into existence … the door to the full history is a fact about the
// record even on a day when nothing has happened yet, and a route that hid it
// because the summary was empty would have hidden the only way to the entries
// that are not summarised."
//
// That reasoning is right and it does not reach this record. The kit is
// guarding against a footer whose SUMMARY is empty while the HISTORY is not —
// a route that shows two rows of a hundred, or none of a hundred. Here the
// summary and the history are the same feed read twice: the footer takes
// `items.slice(0, 3)` of the very rows this panel pages. When the count is
// zero there are no entries the summary failed to show, because there are no
// entries. A door opening on "No activity yet." is the footer's own silence,
// restated in a bigger box, one press further away.
//
// So the existence of the door is DERIVED FROM THE SAME NUMBER IT PRINTS —
// `formatCount` (R16), which renders "" for a zero and for a total that has not
// arrived yet. One expression decides both, so the count and the door can never
// disagree, and there is no state where a person reads "All activity ·" with
// nothing after it. A record with no history keeps exactly the footer it has
// today: the eyebrow, and — where the reader may write one — the note field,
// which is how a first entry gets made.
//
// AND THE COLUMN'S OWN GATE HAS TO BE TOLD, WHICH IS WHY `hasActivityDoor`
// IS EXPORTED (2026-09-08). `RecordDetail` draws the Latest-activity column
// when it has rows, a composer, or this door — `showActivityColumn`, and its
// door term is `activityAction !== undefined`. That term is about the PROP, and
// a React element whose component returns null at render time is still a
// defined prop: the kit cannot see that this rail drew nothing. So "the door is
// absent exactly when the rows are" is true of the PIXELS and not of the prop,
// and a host that passes the element unconditionally hands the kit a door that
// is not there. MEASURED, 2026-09-08, on a knowledge record with no history and
// no composer: a 14.296875px column carrying a bare "LATEST ACTIVITY" eyebrow
// and nothing under it.
//
// The gate is therefore ONE expression with TWO readers rather than two copies
// of one rule: this component asks it to decide whether to draw, and a host
// asks it to decide whether to pass the prop at all. A host that forgets is
// wrong in the direction of an empty column, never a missing door.
//
// ── NO `description` ON THE PANEL ───────────────────────────────────────────
//
// The title is the glossary's own word and nothing more. Above 45rem the rail
// is NOT modal — the record it belongs to is still on screen, still lit, still
// scrollable beside it, which is the entire reason the client picked shape 06
// over the three sheets — so a line naming the record would be naming something
// the reader can see. Below 45rem the sheet does cover the record, and the
// reader got there by pressing a control on it one tap ago, over a scrim that
// takes them back. Either way a description would be the only text in this rail
// that is not a real entry in the record's history.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { EdgePanel } from "@shared/ui/components/edge-panel/edge-panel"
import { CaretRight } from "@shared/ui/foundations/icons"

import { ActivityPanel } from "@/components/activity-panel"
import type { ActivityFeedRow } from "@/lib/use-record-activity"
import { formatCount } from "@shared/web/format-count"
import { useT } from "@shared/web/language"

/** What the rail needs to open: `<ActivityPanel>`'s own five fields, plus the
 * exact server total the door prints.
 *
 * STRUCTURALLY TYPED, like the panel's own prop and for the same reason — the
 * rail needs these six things and no knowledge of which read produced them.
 * Both feeds in the app satisfy it as they stand: `useRecordActivity` (one
 * record's generic (table, id) slice, R5) and the deep-link host's own
 * team/member/invite scope feed. Neither had to grow a field for this. */
export type RailActivity = {
  items: ActivityFeedRow[]
  /** The EXACT server COUNT(*) of the whole history — R16's number, never the
   * loaded page's length. `undefined` until page one lands, which is the same
   * thing `formatCount` renders as nothing, which is why the door waits for it
   * rather than printing a number it would have to correct. */
  total: number | undefined
  loading?: boolean
  error?: unknown
  listKey: string
  fetchPage: (cursor: string) => Promise<{ rows: unknown[]; nextCursor: string | null }>
}

/**
 * IS THERE A DOOR TO DRAW? The one expression, named so a host can ask it
 * before it builds the node — see "AND THE COLUMN'S OWN GATE HAS TO BE TOLD"
 * in this file's header for why a host has to ask at all.
 *
 * `undefined` for the bundle itself is a record screen that was handed no
 * activity at all; `formatCount` (R16) answers "" both for a zero total and for
 * a total still in flight, and both are records with nothing to open.
 *
 * A TYPE PREDICATE rather than a `boolean`, because "there is a door" and
 * "there is a bundle to build it from" are the same sentence, and a host that
 * has asked should not then have to assert what it just proved.
 */
export function hasActivityDoor(activity: RailActivity | undefined): activity is RailActivity {
  return activity !== undefined && formatCount(activity.total) !== ""
}

export function ActivityRail({
  activity,
  onAddNote,
  notePlaceholder,
  head,
}: {
  activity: RailActivity
  /**
   * The SAME `addNote` the record footer's own composer is already given, gated
   * the same way — omitted entirely for a reader without that module's create
   * right, never a no-op and never a disabled field, which is the rule
   * `RecordScreen` and `ActivityPanel` both already apply. Two composers, one
   * decision about who may write, so they cannot disagree.
   */
  onAddNote?: (value: string) => void
  /** The footer's own placeholder, forwarded unchanged. */
  notePlaceholder?: string
  /**
   * Anything that belongs ABOVE the feed inside the rail. One caller today: the
   * ticket's stage strip (`<TicketStages>`), which the client asked to read "in
   * activity" — and "in activity" is this room now. A slot rather than a
   * built-in because it is true of ONE record type out of fourteen, and the
   * rail must not learn what a ticket is.
   */
  head?: React.ReactNode
}) {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  // ONE EXPRESSION DECIDES THE NUMBER AND THE DOOR — see the header. R16's seam
  // answers "" for a zero and for a total still in flight; both are records
  // with nothing to open. `hasActivityDoor` above is that same expression,
  // named, and it is what a host asks; this is what it decides here.
  const count = formatCount(activity.total)
  if (!hasActivityDoor(activity)) return null
  return (
    <React.Fragment>
      {/* A LINK, NOT A BUTTON WITH A BOX. The kit's ruling, and the reason is
          local to the card this sits on: the ink footer already teaches one
          shape, where a pill is a CONTROL BY ELIMINATION — that is what lets
          the note field below have no edge at all. A second pill up here would
          make a reader ask which of the two is the field. `variant="link"` is
          the kit's `.kw-link`: inherits its ink, underlines on hover, occupies
          no box (`h-auto p-0`).

          THE FOUR CLASSES ARE THE SLOT'S OWN MEASUREMENTS, RESTATED ON THE
          CONTROL, because `Button`'s base would otherwise overwrite three of
          them: it ships `text-sm`, `leading-none` and the medium weight, and
          the row is built on a 13.406px line box (`--footer-eyebrow-line`,
          derived once by the kit as `--text-micro × 1.3`) that the action has
          to match exactly or the "costs no vertical space" claim stops being
          true. `text-xs` and the normal weight are also three of the four
          things the kit names as keeping this from reading as a second eyebrow
          beside the real one.

          The caret is sized DOWN from `--icon-button` (16) to 12: a 16px glyph
          in a 13.406px line box would grow the row, which is the one thing this
          door is not allowed to do. `rtl:rotate-180` because it points at a
          reading edge, not at a physical right — the same treatment the kit's
          own pagination and submenu chevrons take. */}
      <Button
        variant="link"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="gap-1 text-xs leading-[var(--footer-eyebrow-line)] font-[var(--font-weight-normal)] [&_svg]:size-3"
      >
        {t("All activity · {count}", { count })}
        <CaretRight aria-hidden="true" className="rtl:rotate-180" />
      </Button>

      {/* SHAPE 06, AT THE READING END — `side="right"` is `EdgePanel`'s own
          default and is left to it rather than restated, since the client
          named that edge and the kit's default already is it.

          `title` is the glossary's word for what is inside (`Activity`: "A
          history of what changed on a record, and who changed it."), which is
          also the word every one of these screens used on the tab that used to
          hold this. No `description` — the header comment argues it. */}
      <EdgePanel
        open={open}
        onClose={() => setOpen(false)}
        title={t("Activity")}
        closeLabel={t("Close")}
      >
        <div className="flex flex-col gap-6">
          {head}
          <ActivityPanel
            activity={activity}
            onAddNote={onAddNote}
            notePlaceholder={notePlaceholder}
          />
        </div>
      </EdgePanel>
    </React.Fragment>
  )
}
