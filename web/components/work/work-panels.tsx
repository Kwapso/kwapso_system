"use client"

// THE WORK ENGINE'S NESTED COLLECTIONS — the same four lists, wherever they hang.
//
// The owner's ruling put every one of apps, sprints, stories and tasks in TWO
// places: a section of its own AND a tab on the record above it. Two places for
// four collections is eight lists, and eight hand-written lists is seven chances
// for the account's sprints and the app's sprints to disagree about what a
// sprint looks like. So each one is written ONCE here and hung wherever it is
// needed, exactly as account-detail-panels.tsx does for the customer spine.
//
// EACH PANEL ASKS THE SERVER ITS OWN QUESTION. That is the whole reason these
// are components with their own reads rather than a filter over a list the host
// already holds: the backlog is PAGED (R14), so narrowing a loaded page by app
// in the browser answers "this app's work among the newest fifty" — which looks
// exactly like an answer and is not one. The doors take `appId`, `sprintId`,
// `ticketId` and `accountId`, and the exact total (R16) that badges the tab comes
// back from the same call that fetched the rows, over the same WHERE.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/components/table/table"
import { Button } from "@shared/ui/components/button/button"
import { Checklist } from "@shared/ui/components/checklist/checklist"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Prohibit, CaretRight, ListBullets } from "@shared/ui/foundations/icons"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"

import { AppMark } from "@/components/apps/app-tiles"
import { LoadMore } from "@/components/records/load-more"
import { ApiFailure, content as contentApi, tenancy } from "@/lib/api"
import { cursorKey, todosDoneKey, todosKey, totalKey } from "@/lib/live-resources"
import { RecordMark } from "@shared/web/record-mark"
import { RecordRef, REF_LEADS_NAME } from "@shared/web/record-ref"
import { softNavigate } from "@/lib/nav"
import type { AppRow, HelpTicket, Meeting, ProcessSummary, Sprint, Story, Todo, TodoViewName } from "@shared/types"
import { formatDate } from "@shared/web/format"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { invalidate, primeCache, useCached, useCachedValue } from "@shared/web/store"
import { useLanguage, useT } from "@shared/web/language"
import type { Language } from "@shared/i18n"
import { AddButton, type ToolbarViewSlot } from "@/components/deep-link/screen-bits"
import { Swatch } from "@/components/records/record-picker"
import { ticketTypeColour } from "@/lib/type-colours"
import { Icon } from "@shared/web/screen-engine/icon"
import { CONCEPT_ICON } from "@/lib/pages"
import { TicketsDashboard } from "@/components/tickets/tickets-dashboard"
import { useRemembered } from "@shared/web/remembered"
import { CollectionCreateActionProvider, CollectionEmptyState, CollectionFrame } from "@shared/web/screen-engine/collection-frame"
import { richTextPlain, safeHref } from "@shared/web/rich-text"
import { TabsView, defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { formatCount } from "@shared/web/format-count"
import { PagedFind, type FindPage, type FindQuery } from "@/components/records/paged-find"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { HELP_STATUS } from "@/components/deep-link/shape"
import { defaultCollectionConfig, type FilterFacet, type SortOption } from "@shared/web/screen-engine/config"

/** The four states a story moves through, in the words a person reads. The
 * states the code trusts are STORY_STATUSES; this is only their spelling. */
export const STORY_STATUS_LABEL: Record<Story["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
}

/** A row in one of these lists, faded when the record is switched off or
 * finished. Nothing here is ever hidden for being done: "finished" is a state,
 * not an absence, and a sprint's whole point is that you can look back at it.
 *
 * IT HAS NO BORDER OF ITS OWN ANY MORE, and its list carries one instead
 * (`RowList` below). A bordered box per row inside a gapped column draws TWO
 * cues at every boundary — a drawn line AND a space — where N6 allows exactly
 * one, and it did it seven times in this file alone. The COLLECTION is the block
 * that earns a container; a row inside one is a row. */
function Row({
  live,
  mark,
  children,
}: {
  live: boolean
  /** THE RECORD'S OWN FACE, and it is a REQUIRED prop on purpose (R35).
   *
   * A record is known by its picture as much as by its name, and these nested
   * lists were the largest place in the app where it was missing: a story inside
   * a sprint, a ticket inside an app, a contact inside an account — the same
   * record that leads with its glyph on its own collection led with nothing here.
   *
   * REQUIRED rather than optional because that is the only version of this rule a
   * twenty-first panel cannot quietly skip. `null` is a real answer and says so
   * out loud at the call site; an omitted optional prop says nothing at all, and
   * "did you remember?" is exactly the question source-scanning cannot ask. */
  mark: React.ReactNode | null
  children: React.ReactNode
}) {
  return (
    <li className={`flex flex-wrap items-center gap-2 px-3 py-2 ${live ? "" : "opacity-60"}`}>
      {mark}
      {children}
    </li>
  )
}

/** The container those rows sit in: one hairline round the collection and one
 * between each pair, which is N6's "a block earns a container when it holds a
 * collection of two or more rows". Written once so seven panels cannot drift
 * into seven spellings of one list. */
function RowList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">{children}</ul>
}

/** The clickable name of a record, in the URL form the caller arrived through. */
function OpenLink({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    // The kit's `link` variant IS this control: no box, inherited ink, an
    // underline that arrives on hover. Everything overridden below is LAYOUT,
    // not look — the name has to flex and truncate inside a row, and the base
    // skin is `shrink-0 justify-center`. `shrink` is spelled out rather than
    // left to `flex-1`, because `flex-1` and `shrink-0` are different
    // tailwind-merge groups and both would survive, leaving which one paints
    // to stylesheet order.
    <Button
      type="button"
      variant="link"
      onClick={onOpen}
      className="hover:text-primary min-w-0 flex-1 shrink justify-start text-left underline-offset-2"
    >
      {/* The truncation lives on a SPAN inside, not on the control. `truncate`
          is `text-overflow: ellipsis`, and that applies to a block container's
          line box — the kit's skin is `inline-flex`, so the label becomes an
          anonymous flex item and the ellipsis is silently dropped: the name
          still clips at exactly the same width, with no "…" to say it did.
          Measured, both at 283.71px. */}
      <span className="min-w-0 truncate">{label}</span>
    </Button>
  )
}

/** THE ARROW AT THE END OF A ROW, AND IT DOES SOMETHING.
 *
 * It was a bare `<CaretRight>` — no click target, no label, not inside a
 * button. The owner reported the Processes row as "unable to expand", which is
 * exactly right and exactly the fault: a chevron is the universal "this opens"
 * glyph, so a decorative one is a promise the row does not keep. Only the NAME
 * was clickable, which is a small target and an invisible rule.
 *
 * It is not an expander — the row opens the record, and the row's own list has
 * no steps in it to expand (the door returns a count, not the steps). So it does
 * what it looks like it does, and says so to a screen reader. */
function OpenChevron({ label, onOpen }: { label: string; onOpen: () => void }) {
  const t = useT()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onOpen}
      aria-label={t("Open {name}", { name: label })}
      // `ghost` IS this treatment — `--ink-tertiary` is `--muted-foreground`
      // and its hover is the ink going to full, which is what was written by
      // hand here. The overrides are the touch box only: `size="icon"` is a
      // 40-square, and this one is touch padding (UI-RULEBOOK S6) taken back
      // out of the row with the negative margin, so the box measures the same
      // 30 it did before and the row does not grow. The glyph is untouched:
      // `--icon-button` is 1rem, which is what `size-4` already was — measured,
      // 15x15 on both sides of the swap.
      className="-m-2 size-auto shrink-0 p-2"
    >
      <CaretRight className="size-4" />
    </Button>
  )
}

/** What a panel needs from whoever hung it. `base` is the URL PREFIX the person
 * is already in — "" at the top level (so a link reads /stories/<id>) or
 * "/t/<teamId>" inside a team — so a cross-link never bounces them between the
 * two shapes of the same address. */
export type PanelHost = { base: string }

/** THE CACHE KEY FOR ONE NARROWED SLICE. Keyed by the record it hangs off, not
 * by the team: the app's stories and the sprint's stories are two collections
 * that happen to come from one table, and one key for both would mean opening a
 * second app showed the first one's work until it refetched. */
export function sliceKey(kind: string, ownerId: string): string {
  return `${kind}-of:${ownerId}`
}

/** THE REAL TOOLBAR a PAGED nested panel wears: search always, sort where the
 * door has one, filters where a real field backs them, the create button
 * pinned right — then the RESTING list until somebody asks the door
 * something, and the door's OWN answer once they do. Exactly the switch
 * `tickets-collection.tsx` makes for its own paged sub-tab (`scopedQ` vs
 * `found`), pulled out here because four of these panels are that switch and
 * nothing else — the same reason `Row`/`RowList` above are one function
 * rather than four near-identical copies.
 *
 * The panel's OWN cache key doubles as `<PagedFind>`'s `listKey`: there is one
 * resting list per panel instance (never a second tab sharing it), so nothing
 * is lost by handing over the same key both places, and it is what
 * `tickets-collection.tsx` does too. */
function PagedPanelBody<T>({
  listKey,
  placeholder,
  matches,
  sorts = [],
  defaultSort = "",
  facets = [],
  fixed,
  fetchPage,
  restingData,
  restingError,
  errorText,
  onRetry,
  onNew,
  newLabel,
  emptyTitle,
  loadMoreLabel,
  renderRows,
  view,
}: {
  listKey: string
  placeholder: string
  matches: { none: string; one: string; many: string }
  sorts?: SortOption[]
  defaultSort?: string
  facets?: FilterFacet[]
  /** what the panel is ALREADY asking, above whatever the person types (e.g.
   * `{ appId }`) — see `<PagedFind fixed>`'s own doc. */
  fixed?: FindQuery
  fetchPage: (query: FindQuery, cursor: string | null) => Promise<FindPage<T>>
  /** the resting (unsearched) list this panel already held — `undefined`
   * while its first read is still on its way. */
  restingData: T[] | undefined
  restingError: unknown
  errorText: string
  /** Re-runs the resting read this panel already holds — every caller has its
   * own `useCached` in hand (`q.refresh`), so a failed read is a real retry
   * rather than a dead end. */
  onRetry: () => void
  onNew?: () => void
  newLabel: string
  emptyTitle: string
  loadMoreLabel: string
  renderRows: (rows: T[]) => React.ReactNode
  /** THE OTHER BODY THIS PANEL'S TAB OFFERS, where there is one (R53's `view`
   * slot, forwarded whole to `<PagedFind>` so the row builds the control).
   *
   * Only the app record's Tickets tab passes one today — its list and its
   * dashboard are two views of one tab, because a record's tab cannot grow a
   * strip of its own ("there can never be 2 rows of tabs"). Every other panel
   * here has one body and PASSES NOTHING, which draws nothing. Note the
   * distinction since kit v1.2.60: passing NO slot is still silent, but
   * passing a single view now draws a static label naming it — so "one body"
   * and "no switch" stopped being the same statement. */
  view?: ToolbarViewSlot
}) {
  const t = useT()
  if (restingError)
    return (
      <ShapeStateBody
        shape="recordChrome"
        state="error"
        copy={{ errorTitle: errorText }}
        action={
          <Button variant="secondary" onClick={onRetry}>
            {t("Try again")}
          </Button>
        }
      />
    )
  if (restingData === undefined) return <Skeleton variant="list" lines={3} />
  return (
    <PagedFind<T>
      listKey={listKey}
      placeholder={placeholder}
      matches={matches}
      sorts={sorts}
      defaultSort={defaultSort}
      facets={facets}
      fixed={fixed}
      actions={() => (onNew ? <AddButton label={newLabel} onClick={onNew} /> : null)}
      // R50 — this ONE seam is every nested panel's own toolbar (Stories,
      // Processes, App meetings, App tickets, To-dos): the resting read
      // above is this panel's whole answer to "does it have any rows yet",
      // computed once and forwarded rather than re-derived per panel.
      restingEmpty={restingData.length === 0}
      view={view}
      fetchPage={fetchPage}
    >
      {(found) => {
        const rows = found.active ? found.rows : restingData
        if (rows === null || rows === undefined) return <Skeleton variant="list" lines={3} />
        if (rows.length === 0) {
          return found.active ? (
            <p className="text-muted-foreground text-sm">{found.emptyText}</p>
          ) : (
            <CollectionEmptyState title={emptyTitle} onCreate={onNew} />
          )
        }
        return (
          <>
            {renderRows(rows)}
            <LoadMore listKey={found.listKey ?? listKey} label={loadMoreLabel} fetchPage={found.fetchPage} />
          </>
        )
      }}
    </PagedFind>
  )
}

/* ------------------------------- the stories ------------------------------ */

/** One story, in one line: where it is, who has it, when it is due, and which
 * request it answers. The same sentence the backlog row says, because it is the
 * same record — a person reading it on a sprint should not have to re-learn it. */
function storyLine(s: Story, ownerKind: "sprint" | "app" | "ticket", lang: Language): string {
  return (
    [
      STORY_STATUS_LABEL[s.status],
      // R54: an assignee is always one of ours — a story is agency work.
      staffNameFromSnapshot(s.assigneeName) || "unassigned",
      s.sprintEndsOn ? `due ${formatDate(s.sprintEndsOn, lang)}` : null,
      // THE OWNER IS NOT A FACT ABOUT THE ROW. This list hangs off a sprint, an
      // app or a ticket, and it used to name the sprint and the ticket on every
      // row of all three — so the sprint's own Stories tab said "Sprint 14" forty
      // times under a heading that said Sprint 14, and the ticket's said its own
      // reference. Five facts against D5's three, and the fifth was the record
      // the reader was already looking at. The one that is NOT the owner still
      // earns its place: on an app's stories, which sprint a story sits in is
      // real information.
      ownerKind === "sprint" ? null : s.sprintName,
      ownerKind === "ticket" ? null : s.ticketRef,
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  )
}

/** THE WORK ON ONE THING — a sprint's, an app's, or a ticket's. Paged (R14),
 * because the backlog it is a slice of only ever grows: a two-year app has
 * hundreds of stories against it and the oldest is the one somebody is looking
 * for. `total` is the door's exact COUNT(*) over this same filter, parked in the
 * sidecar the tab badge reads. */
export function StoriesPanel({
  ownerKind,
  ownerId,
  filter,
  marks,
  host,
  onNew,
  emptyText,
}: {
  /** what it hangs off — only ever part of the cache key */
  ownerKind: "sprint" | "app" | "ticket"
  ownerId: string
  filter: { sprintId?: string; appId?: string; ticketId?: string }
  /** THE TEAM'S GLYPH FOR EACH TYPE (R35), handed in rather than fetched.
   * A panel hangs off three different records and has no team id of its own;
   * the screens that mount it all hold the vocabulary already, so passing it
   * costs nothing and fetching it here would cost a round trip per panel. */
  marks?: Map<string, string>
  host: PanelHost
  /** present = the caller may add work here, and this opens the form */
  onNew?: () => void
  emptyText: string
}) {
  const { t, lang } = useLanguage()
  const key = sliceKey(`stories-${ownerKind}`, ownerId)
  const q = useCached<Story[]>(key, () =>
    // `view: "all"` on purpose: this is the record of what was done, not a
    // backlog to work through, so hiding the finished work would hide the point.
    contentApi.stories({ ...filter, view: "all" }).then((r) => {
      primeCache(totalKey(`stories-${ownerKind}`, ownerId), r.total)
      primeCache(cursorKey(key), r.nextCursor)
      return r.stories
    })
  )

  const renderRows = (rows: Story[]) => (
    <RowList>
      {rows.map((s) => (
        <Row key={s.id} live={s.status !== "done"} mark={<RecordMark mark={marks?.get(s.storyType ?? "") ?? null} name={s.storyType ?? s.title} />}>
          <div className="min-w-0 flex-1">
            {/* THE NUMBER IN FRONT OF THE NAME, as the black chip — the same
                mark and the same order the ticket rows above use, and the
                client's own instruction for it. It was `B0188 · Redesign the
                board` glued into the link's own label: one string, so the
                reference was underlined on hover as if it were part of the
                name, and it wrapped and truncated with the title. */}
            <span className={REF_LEADS_NAME}>
              <RecordRef value={s.ref} />
              <OpenLink label={s.title} onOpen={() => softNavigate(`${host.base}/stories/${s.id}`)} />
            </span>
            <p className="text-muted-foreground truncate px-0 text-xs">{storyLine(s, ownerKind, lang)}</p>
          </div>
          {s.status === "done" && (
            <Badge variant="secondary" className="text-badge">
              {t("Done")}
            </Badge>
          )}
        </Row>
      ))}
    </RowList>
  )

  return (
    <PagedPanelBody<Story>
      listKey={key}
      placeholder={t("Search stories…")}
      matches={{
        none: t("No stories match"),
        one: t("1 story matches"),
        many: t("{count} stories match"),
      }}
      sorts={translatedSorts("stories", t)}
      defaultSort={COLLECTION_SORTS.stories.defaultSort}
      // THE ONE REAL FACET this narrower view can offer without a second
      // fetch: the four stages every story moves through, the same words
      // `STORY_STATUS_LABEL` renders on the row. `assigneeId`/`sprintId` are
      // door filters too (COLLECTION_FILTERS.stories), but both need an
      // OPTIONS list — the team's members, the app's sprints — this panel is
      // not handed, and a facet with nowhere to get its options from is the
      // useless dropdown `translatedFacets` itself refuses to draw.
      facets={[
        {
          field: "status",
          label: t("Status"),
          control: "select",
          options: Object.entries(STORY_STATUS_LABEL).map(([value, label]) => ({ value, label: t(label) })),
        },
      ]}
      // WHAT THIS PANEL IS ALREADY ASKING — the sprint/app/ticket it hangs off
      // — forwarded to the door exactly as the resting read above does.
      fixed={Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) as FindQuery}
      fetchPage={(query, cursor) =>
        contentApi
          .stories({ ...filter, view: "all", ...query, cursor: cursor ?? undefined })
          .then((r) => ({ rows: r.stories, nextCursor: r.nextCursor, total: r.total }))
      }
      restingData={q.data}
      restingError={q.error}
      errorText={t("Couldn't load the work.")}
      onRetry={() => q.refresh()}
      onNew={onNew}
      newLabel={t("New story")}
      // No import wiring here (composition 27.21's second button): the
      // real `stories` import target (workers/data-ops) writes UNSCOPED
      // rows, and this collection is always narrowed to one sprint/app/
      // ticket — a generic import cannot land its rows on this owner, so
      // offering the button would point at an act that does not do what
      // it says.
      emptyTitle={emptyText}
      loadMoreLabel={t("Load more work")}
      renderRows={renderRows}
    />
  )
}

/* ------------------------------- the sprints ------------------------------ */

/** A sprint, in one line: what kind, whose, when, and how much of it is left.
 * The counts are the door's own exact counts over the stories inside it (R16),
 * never the length of anything loaded here. */
export function sprintLine(s: Sprint, lang: Language): string {
  const done = s.storyCount - s.openStoryCount
  return (
    [
      s.sprintType,
      s.accountName,
      s.appName,
      // Dates through the ONE formatter (shared/web/format.ts), never raw. A row
      // reading "2026-02-23T00:00:00.000Z → 2026-03-20T00:00:00.000Z" is a
      // timestamp somebody has to decode, on a list built for a manager to scan.
      s.startsOn && s.endsOn
        ? `${formatDate(s.startsOn, lang)} → ${formatDate(s.endsOn, lang)}`
        : (formatDate(s.startsOn, lang) || formatDate(s.endsOn, lang) || null),
      s.storyCount > 0 ? `${done} of ${s.storyCount} done` : "no work in it yet",
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  )
}

/** THE SAME SPRINT, ON A LIST THAT HAS ALREADY SAID ITS KIND — three facts, not
 * five.
 *
 * The Sprints overview groups by kind and puts the kind's own word above each
 * group, and then every row underneath repeated it: "Retainer · Northwind ·
 * Portal · 3 Feb → 20 Mar · 3 of 11 done", under a heading that said Retainer.
 * A fact restated once per row is not information, it is noise with a job title,
 * and it took that band to seven units against N1's four.
 *
 * So the KIND comes off (the heading says it) and HOW MUCH IS DONE comes off
 * (it becomes the row's trailing number, where a number belongs — T4), leaving
 * the three facts D5 allows a status line: whose, which app, and when.
 *
 * `sprintLine` above is unchanged and still carries all five, because the flat
 * "All sprints" list and the panels on an account and an app are NOT grouped by
 * kind, and there the kind is the one word telling you what sort of block of
 * work you are looking at. Two lines, because there are two situations, not
 * because there are two opinions. */
export function sprintLineInKindGroup(s: Sprint, lang: Language): string {
  return (
    [
      s.accountName,
      s.appName,
      s.startsOn && s.endsOn
        ? `${formatDate(s.startsOn, lang)} → ${formatDate(s.endsOn, lang)}`
        : (formatDate(s.startsOn, lang) || formatDate(s.endsOn, lang) || null),
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  )
}

/** THE BLOCKS OF WORK SOLD on one app, or to one account. Bounded, not paged —
 * a sprint is a contract, so the whole set is the answer and its exact total
 * comes back beside it. */
export function SprintsPanel({
  ownerKind,
  ownerId,
  filter,
  marks,
  host,
  onNew,
  emptyText,
}: {
  ownerKind: "app" | "account"
  ownerId: string
  filter: { appId?: string; accountId?: string }
  /** THE TEAM'S GLYPH FOR EACH TYPE (R35), handed in rather than fetched.
   * A panel hangs off three different records and has no team id of its own;
   * the screens that mount it all hold the vocabulary already, so passing it
   * costs nothing and fetching it here would cost a round trip per panel. */
  marks?: Map<string, string>
  host: PanelHost
  onNew?: () => void
  emptyText: string
}) {
  const { t, lang } = useLanguage()
  const key = sliceKey(`sprints-${ownerKind}`, ownerId)
  const q = useCached<Sprint[]>(key, () =>
    contentApi.sprints(filter).then((r) => {
      primeCache(totalKey(`sprints-${ownerKind}`, ownerId), r.total)
      return r.sprints
    })
  )

  if (q.error)
    return (
      <ShapeStateBody
        shape="recordChrome"
        state="error"
        copy={{ errorTitle: t("Couldn't load the sprints.") }}
        action={
          <Button variant="secondary" onClick={() => q.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )
  if (q.data === undefined) return <Skeleton variant="list" lines={3} />

  // BOUNDED (R14), like the top-level Sprints screen this mirrors: a sprint is
  // a contract, so this whole collection is already in the browser and
  // ordering/narrowing it here is honest and free — `CollectionFrame`, never
  // `<PagedFind>`. A DERIVED field, because the door's own `completedAt`/
  // `active` columns are two facts and the facet is one question: "is this
  // block still live, or wrapped?" — the exact split `sprintState` groups the
  // Overview by, one file along.
  const rows = q.data.map((s) => ({ ...s, wrapped: s.completedAt || !s.active ? "yes" : "no" }))

  return (
    <CollectionCreateActionProvider action={onNew ? { label: t("Start a sprint"), onCreate: onNew } : null}>
      <CollectionFrame
        useKitPanel
        config={{
          ...defaultCollectionConfig,
          searchPlaceholder: t("Search sprints…"),
          emptyText: emptyText,
          userFilter: true,
          filterFacets: [
            // WHICHEVER OF THE TWO ISN'T ALREADY FIXED by hanging here — an
            // account's Sprints tab still spans several apps; an app's
            // always has exactly one account, so that facet would offer a
            // single, useless choice and is left off.
            ...(ownerKind === "account"
              ? [{ field: "appName", label: t("App"), control: "select" as const }]
              : []),
            { field: "sprintType", label: t("Kind"), control: "select" as const },
            {
              field: "wrapped",
              label: t("Status"),
              control: "select" as const,
              options: [
                { value: "no", label: t("Active") },
                { value: "yes", label: t("Wrapped") },
              ],
            },
          ],
          sortable: true,
          sortOptions: [
            { value: "name", label: t("Name"), defaultDir: "asc" },
            { value: "startsOn", label: t("Start date"), defaultDir: "desc" },
            { value: "sprintType", label: t("Kind"), defaultDir: "asc" },
          ],
        }}
        data={rows}
        searchKeys={["name", "ref", "refWas", "sprintType", "accountName", "appName"]}
        renderItems={(page) => (
          <RowList>
            {page.map((s) => (
              <Row key={s.id} live={!s.completedAt} mark={<RecordMark mark={marks?.get(s.sprintType ?? "") ?? null} name={s.sprintType ?? s.name} />}>
                <div className="min-w-0 flex-1">
                  {/* The number in front of the name, as the black chip —
                      see the stories panel above for the whole argument. */}
                  <span className={REF_LEADS_NAME}>
                    <RecordRef value={s.ref} />
                    <OpenLink label={s.name} onOpen={() => softNavigate(`${host.base}/sprints/${s.id}`)} />
                  </span>
                  <p className="text-muted-foreground truncate text-xs">{sprintLine(s, lang)}</p>
                </div>
                {s.completedAt && (
                  <Badge variant="secondary" className="text-badge">
                    {t("Complete")}
                  </Badge>
                )}
              </Row>
            ))}
          </RowList>
        )}
      />
    </CollectionCreateActionProvider>
  )
}

/* --------------------------------- the apps -------------------------------- */

/** An app, in one line: whose it is, where it is up to, and its address. */
function appLine(a: AppRow, accountName?: string | null): string {
  return [accountName ?? "the agency's own", a.stage, a.url].filter(Boolean).join(" · ") || "—"
}

/** THE SYSTEMS BUILT FOR ONE ACCOUNT. An app belongs to ONE account, always (the
 * owner's ruling), so this is that account's whole inventory and the door counts
 * exactly it. */
export function AppsPanel({
  accountId,
  accountName,
  host,
  onNew,
}: {
  accountId: string
  accountName: string
  host: PanelHost
  onNew?: () => void
}) {
  const t = useT()
  const key = sliceKey("apps-account", accountId)
  const q = useCached<AppRow[]>(key, () =>
    tenancy.apps(accountId).then((r) => {
      primeCache(totalKey("apps-account", accountId), r.total)
      return r.apps
    })
  )

  if (q.error)
    return (
      <ShapeStateBody
        shape="recordChrome"
        state="error"
        copy={{ errorTitle: t("Couldn't load the apps.") }}
        action={
          <Button variant="secondary" onClick={() => q.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )
  if (q.data === undefined) return <Skeleton variant="list" lines={3} />

  // BOUNDED (R14) — an account has tens of systems, not thousands, so this is
  // its whole inventory read whole. `CollectionFrame`, the same seam the top-
  // level Apps screen would reach for if it were recipe-driven (it isn't —
  // see apps-screen.tsx's own note — but its `appsListRecipe` facets, "Client
  // / Stage / Archived", are exactly where these three come from).
  return (
    <CollectionCreateActionProvider action={onNew ? { label: t("Record an app"), onCreate: onNew } : null}>
      <CollectionFrame
        useKitPanel
        config={{
          ...defaultCollectionConfig,
          searchPlaceholder: t("Search apps…"),
          emptyText: t("Nothing built for {account} yet.", { account: accountName }),
          userFilter: true,
          filterFacets: [
            { field: "stage", label: t("Stage"), control: "select" as const },
            {
              field: "active",
              label: t("Status"),
              control: "select" as const,
              options: [
                { value: "true", label: t("Active") },
                { value: "false", label: t("Archived") },
              ],
            },
          ],
          sortable: true,
          sortOptions: [
            { value: "name", label: t("Name"), defaultDir: "asc" },
            { value: "stage", label: t("Stage"), defaultDir: "asc" },
          ],
        }}
        data={q.data}
        // `ref` because the row shows one now — a number a person can read off
        // a row is a number they will type into the box above it.
        searchKeys={["name", "ref", "stage", "url"]}
        renderItems={(page) => (
          <RowList>
            {page.map((a) => (
              <Row key={a.id} live={a.active} mark={null}>
                {/* THE SAME RECORD, THE SAME SQUARE. These rows and the tiles on
                    the apps screen list the identical AppRow, and only one of them
                    drew the client's mark — so an app was a picture on one screen
                    and a line of text on the next. */}
                <AppMark app={a} size="row" />
                <div className="min-w-0 flex-1">
                  <span className={REF_LEADS_NAME}>
                    <RecordRef value={a.ref} />
                    <OpenLink label={a.name} onOpen={() => softNavigate(`${host.base}/apps/${a.id}`)} />
                  </span>
                  <p className="text-muted-foreground truncate text-xs">{appLine(a, accountName)}</p>
                </div>
                {!a.active && (
                  <Badge variant="secondary" className="text-muted-foreground text-badge">
                    {t("Archived")}
                  </Badge>
                )}
              </Row>
            ))}
          </RowList>
        )}
      />
    </CollectionCreateActionProvider>
  )
}

/* -------------------------------- the maps -------------------------------- */

/** THE PROCESS MAPS DRAWN INSIDE ONE APP. Paged (R14) like the maps list itself:
 * every app of every client grows them and none is ever deleted, because a
 * saving computed from a baseline has to stay checkable years later. */
export function ProcessesPanel({
  appId,
  host,
  onNew,
}: {
  appId: string
  host: PanelHost
  /** Map a process from inside the app it belongs to (CHECKLIST 8.12). Absent
   * when the reader cannot create one, which is why it is a prop rather than a
   * permission this panel re-derives. */
  onNew?: () => void
}) {
  const t = useT()
  const key = sliceKey("processes-app", appId)
  const q = useCached<ProcessSummary[]>(key, () =>
    tenancy.processes({ appId }).then((r) => {
      primeCache(totalKey("processes-app", appId), r.total)
      primeCache(cursorKey(key), r.nextCursor)
      return r.processes
    })
  )

  const renderRows = (rows: ProcessSummary[]) => (
    <RowList>
      {rows.map((p) => (
        <Row key={p.id} live={p.active} mark={<RecordMark name={p.name} />}>
          <div className="min-w-0 flex-1">
            <OpenLink
              label={p.name}
              onOpen={() => softNavigate(`${host.base}/processes/${p.id}`)}
            />
            <p className="text-muted-foreground truncate text-xs">
              {[
                `${p.stepCount} step${p.stepCount === 1 ? "" : "s"}`,
                p.versionCount > 1 ? `version ${p.versionCount}` : "baseline only",
              ].join(" · ")}
            </p>
          </div>
          <OpenChevron
            label={p.name}
            onOpen={() => softNavigate(`${host.base}/processes/${p.id}`)}
          />
        </Row>
      ))}
    </RowList>
  )

  return (
    <PagedPanelBody<ProcessSummary>
      listKey={key}
      placeholder={t("Search processes…")}
      matches={{
        none: t("No processes match"),
        one: t("1 process matches"),
        many: t("{count} processes match"),
      }}
      // "App" comes off the top-level sort menu: every row here is already
      // this one app's, so ordering by it would be furniture.
      sorts={translatedSorts("processes", t).filter((o) => o.value !== "app")}
      defaultSort={COLLECTION_SORTS.processes.defaultSort}
      // ARCHIVED — the one real door filter left once `appId` is already
      // fixed by hanging here (COLLECTION_FILTERS.processes).
      facets={[
        {
          field: "archived",
          label: t("Archived"),
          control: "select",
          options: [
            { value: "no", label: t("No") },
            { value: "yes", label: t("Yes") },
          ],
        },
      ]}
      fixed={{ appId }}
      fetchPage={(query, cursor) =>
        tenancy
          .processes({ appId, ...query, cursor: cursor ?? undefined })
          .then((r) => ({ rows: r.processes, nextCursor: r.nextCursor, total: r.total }))
      }
      restingData={q.data}
      restingError={q.error}
      errorText={t("Couldn't load the processes.")}
      onRetry={() => q.refresh()}
      onNew={onNew}
      newLabel={t("Map a process")}
      // No `processes` import target — a map is drawn from inside the app
      // it belongs to (CHECKLIST 8.12), never bulk-loaded.
      emptyTitle={t("No processes drawn inside this app yet.")}
      loadMoreLabel={t("Load more processes")}
      renderRows={renderRows}
    />
  )
}

/* --------------------------- the meetings list ----------------------------- */

/** THE MEETINGS ABOUT ONE APP. Asked of the SERVER by `appId`, never narrowed in
 * the browser: the meetings list is paged, and "this app's meetings among the newest
 * fifty" is an answer that looks like an answer. Paged (R14) for the same
 * reason — a two-year system accumulates meetings and the oldest is the one
 * somebody is digging for. `total` is the door's exact COUNT(*) over this same
 * filter, parked in the sidecar the tab badge reads (R16). */
export function AppMeetingsPanel({
  appId,
  host,
  onNew,
}: {
  appId: string
  host: PanelHost
  /** present = the caller may arrange one from here, and this opens the form */
  onNew?: () => void
}) {
  const { t, lang } = useLanguage()
  const key = sliceKey("meetings-app", appId)
  const q = useCached<Meeting[]>(key, () =>
    contentApi.meetings({ appId }).then((r) => {
      primeCache(totalKey("meetings-app", appId), r.total)
      primeCache(cursorKey(key), r.nextCursor)
      return r.meetings
    })
  )

  const renderRows = (rows: Meeting[]) => (
    <RowList>
      {rows.map((m) => (
        <Row key={m.id} live={m.active} mark={<RecordMark name={m.accountName ?? m.title} />}>
          <div className="min-w-0 flex-1">
            <span className={REF_LEADS_NAME}>
              <RecordRef value={m.ref} />
              <OpenLink label={m.title} onOpen={() => softNavigate(`${host.base}/meetings/${m.id}`)} />
            </span>
            <p className="text-muted-foreground truncate text-xs">
              {[formatDate(m.startsAt, lang), m.accountName].filter(Boolean).join(" · ")}
            </p>
          </div>
          {/* A "Held" badge sat here, reading a status column that is
              retired: the date on the line above already says whether the
              meeting has happened, and a badge repeating it in a word
              somebody had to remember to tick could contradict it. */}
        </Row>
      ))}
    </RowList>
  )

  return (
    <PagedPanelBody<Meeting>
      listKey={key}
      placeholder={t("Search meetings…")}
      matches={{
        none: t("No meetings match"),
        one: t("1 meeting matches"),
        many: t("{count} meetings match"),
      }}
      // "Account" comes off the top-level menu: an app belongs to one account
      // always (the owner's ruling), so every meeting here is already that
      // account's and ordering by it would be furniture.
      sorts={translatedSorts("meetings", t).filter((o) => o.value !== "client")}
      defaultSort={COLLECTION_SORTS.meetings.defaultSort}
      // NO FACETS: `accountId` is fixed the same way the sort option above is
      // furniture, and `purposeId` — the one real door filter left
      // (COLLECTION_FILTERS.meetings) — needs an options list (the team's
      // meeting purposes, id → name) this panel is not handed, so offering it
      // would be the useless, optionless dropdown `translatedFacets` itself
      // refuses to draw.
      fixed={{ appId }}
      fetchPage={(query, cursor) =>
        contentApi
          .meetings({ appId, ...query, cursor: cursor ?? undefined })
          .then((r) => ({ rows: r.meetings, nextCursor: r.nextCursor, total: r.total }))
      }
      restingData={q.data}
      restingError={q.error}
      errorText={t("Couldn't load the meetings.")}
      onRetry={() => q.refresh()}
      onNew={onNew}
      newLabel={t("Arrange a meeting")}
      // The `meetings` import target is real, but it writes UNSCOPED rows —
      // this list is always narrowed to one app, so a generic import
      // cannot land on it (see StoriesPanel's own note above).
      emptyTitle={t("No meetings about this app yet.")}
      loadMoreLabel={t("Load more meetings")}
      renderRows={renderRows}
    />
  )
}

/** THE TICKETS ABOUT ONE APP (CHECKLIST 8.6). Asked of the SERVER by `appId`,
 * exactly like the meetings above and for the same reason: the ticket list is a
 * GROWING collection that pages, so "this app's tickets among the newest fifty"
 * would be an answer that looks like an answer. `total` is the door's exact
 * COUNT(*) over the same narrowing, parked where the tab badge reads it (R16). */
export function AppTicketsPanel({
  appId,
  helpTypeOptions,
  host,
  onNew,
  view,
}: {
  appId: string
  /** the team's live `Ticket type` values (the same list `tickets-collection.tsx`
   * builds its own strip from) — what the Kind facet below offers. Absent
   * draws no such facet at all, rather than one with nothing in it. */
  helpTypeOptions?: string[]
  host: PanelHost
  /** present = the caller may raise one from here, and this opens the form */
  onNew?: () => void
  /** THE TAB'S SECOND BODY — this list is the DEFAULT view of the app record's
   * Tickets tab, and the dashboard is the other one (`AppTicketsTab`, which owns
   * the state and hands the identical config to both). Forwarded to the toolbar
   * so the control sits in the same slot whichever body is on screen. */
  view?: ToolbarViewSlot
}) {
  const { t, lang } = useLanguage()
  const key = sliceKey("tickets-app", appId)
  const q = useCached<HelpTicket[]>(key, () =>
    contentApi.help({ appId }).then((r) => {
      primeCache(totalKey("tickets-app", appId), r.total)
      primeCache(cursorKey(key), r.nextCursor)
      return r.tickets
    })
  )

  /* ══ THE LIST — A TABLE, THE SAME SHAPE THE TICKET LIST ALREADY DRAWS ═════
     Client, 6 Sep 2026: "create me, in each app, the ticket page. Put me in the
     list." What stood here was a `RowList` of two text lines per ticket — the
     description on top, and `ref · type · status` under it as one dot-joined
     string. Three facts flattened into prose you cannot scan down: the type of
     row four is not above the type of row five, so comparing two tickets means
     reading two sentences.

     THE SHAPE IS REUSED AND NOT REINVENTED. The main Tickets screen's own list
     view (`tickets-collection.tsx`, drawn to the client's spec: "1. Title.
     2. Type with the colors, same as we have with the chips. Also include the
     number, the ID. 3. App. 4. Date.") composes the kit's `Table` primitives
     directly, and every argument it makes applies here word for word:

       · NOT `RecordTable`, which requires a `CollectionConfig` and wraps
         `CollectionFrame` — its own search box, its own filter bar, its own
         "Showing X of Y" and its own pager. This panel already has every one of
         those, drawn by `<PagedFind>` one element up and counted ONCE by the
         tab badge above it (R16). Adopting it would draw a second search box
         under the first and a second count on a record that already shows one.
       · PLAIN HEADERS, none of them sorting. The order is the DOOR's — the
         toolbar's sort control asks `content.help` for it — and the list PAGES
         (R14), so a clickable header would reorder the fifty rows in hand and
         present that as the order of the whole collection. A header that lights
         up while the rows sit still reads as broken data, not a broken button.
       · THE ROW OPENS AND SO DOES THE TITLE. The mouse gets the whole row; the
         keyboard and a screen reader get a real `variant="link"` control in the
         first cell, with `stopPropagation` so one press is never two.

     ── THE COLUMNS, AND THE ONE THAT IS NOT HERE ──────────────────────────────

     Title · Type · Stage · Raised. Her fourth column ("3. App") is the record
     this list is nested inside: every row would say "Bergman dispatch" under a
     heading that already says it, which is the same subtraction the Dashboard
     view makes when it drops the "Which app" panel — a column whose every cell
     is the page you are on is furniture, not information.

     WHAT TAKES ITS PLACE IS THE STAGE, and that is a restoration rather than an
     invention: the text line this replaces already carried it (`ref · type ·
     status`), it is the one fact about a ticket that changes while you are
     working on it, and it is one of the two facets in this panel's own toolbar
     — so the column a reader wants to narrow by is the column they can see.

     THE MARK LEADS THE FIRST CELL (R35). Every collection row in this app
     carries its record's own face — `leading: "mark"` in the recipe engine, the
     `Row` mark one function up — and a ticket's face is the team's glyph for
     its type, set as data on the Dropdown values screen. The triage list omits
     it because a ticket waiting for triage often has no type at all; here they
     do. It is a picture, not a column, so it costs no header. */
  const renderRows = (rows: HelpTicket[]) => (
    <Table
      // Four columns, so the kit's own specimen width is the right pin — its
      // doc asks a call site that knows its column count to pass one. Below
      // that the container scrolls on the inline axis rather than crushing the
      // title, which is the kit's stated mobile answer: it never restacks a
      // table into cards.
      minWidth="42rem"
      aria-label={t("Tickets")}
    >
      <TableHeader>
        {/* NO HOVER ON THE HEADER — `TableRow` carries the kit's row wash
            unconditionally, because on a body row that wash is the affordance
            saying "this opens". On a header that does nothing, and whose
            columns deliberately do not sort, it is a lie: a surface that lights
            under the pointer and then refuses the click reads as broken. */}
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("Title")}</TableHead>
          <TableHead>{t("Type")}</TableHead>
          <TableHead>{t("Stage")}</TableHead>
          <TableHead>{t("Raised")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((ticket) => (
          <TableRow
            key={ticket.id}
            // Tickets live at their own top-level URL, so the link is built off
            // the host prefix rather than the section we are standing in.
            onClick={() => softNavigate(`${host.base}/tickets/${ticket.id}`)}
            className="cursor-pointer"
          >
            <TableCell>
              <span className={REF_LEADS_NAME}>
                {/* NO GLYPH LEADS THE NUMBER HERE. A `<RecordMark>` for the
                    ticket's TYPE used to sit in front of the ref, fed by a
                    `marks` prop off the mounting record. Client, 2026-09-07:
                    "for type, kill the emojis. this is legacy. in current
                    system we use colors." `MARK_GROUP.ticket` is gone
                    (web/lib/type-marks.ts carries the ruling and what it
                    deliberately left alone), so the kind is carried by the
                    coloured pill in the Type column below and by nothing else.
                    The story and sprint panels in this file still draw theirs:
                    her sentence was about tickets. */}
                {/* THE NUMBER LEADS THE TITLE, in "the usual black chip design",
                    through the ONE component that draws one
                    (shared/web/record-ref.tsx). This cell used to spell the
                    badge out itself, identically to the ticket collection's own
                    table one file along — two copies of one mark, agreeing by
                    copy-paste, which is the arrangement that quietly stops
                    agreeing. */}
                <RecordRef value={ticket.ref} />
                <Button
                  variant="link"
                  onClick={(e) => {
                    // The row is already opening; without this one press would
                    // navigate twice.
                    e.stopPropagation()
                    softNavigate(`${host.base}/tickets/${ticket.id}`)
                  }}
                  // `variant="link"` is not a box (no height, no padding), so it
                  // inherits the cell's own type rather than drawing a control
                  // inside a row. `block` + a measure is what lets a long title
                  // end in an ellipsis instead of pushing the other three
                  // columns off the screen.
                  className="block max-w-[28rem] truncate text-start"
                >
                  {/* THE SAME NAME THIS PANEL ALWAYS SHOWED, and the same one
                      the ticket collection's own rows show (`shapeHelpList`,
                      deep-link/shape.tsx): the description's plain text. This
                      pass changed the SHAPE of the list and deliberately not
                      what a ticket is called — a renaming is a separate
                      decision and would have arrived disguised as a layout fix.

                      TOLD, NOT HIDDEN: the triage card and its list table name
                      a ticket `titleEn || titleDe || description` instead
                      (`ticketTitle`, tickets-collection.tsx), because 788
                      imported tickets have a German title and no English one.
                      Two ticket tables in this app therefore name a row two
                      ways. That divergence predates this panel and is one
                      shared helper away from being settled; it is not settled
                      here, silently, on the way past. */}
                  {richTextPlain(ticket.description)}
                </Button>
              </span>
            </TableCell>
            <TableCell>
              {/* THE SAME DOT, FROM THE SAME MAP as the chip line and the type
                  picker draw — `Swatch` + `ticketTypeColour` rather than a
                  second lozenge that agrees with them today. A ticket with no
                  type still gets its pill, saying so with an em dash: a column
                  with a pill on four rows and a hole on the fifth reads as the
                  broken row rather than the untyped one. */}
              <Badge variant="secondary" size="pill">
                <Swatch colour={ticketTypeColour(ticket.helpType)} />
                {ticket.helpType ?? "—"}
              </Badge>
            </TableCell>
            {/* THE TWO QUIET COLUMNS, in secondary ink, so the title and the
                coloured pill are what the eye lands on going down the page.
                The stage is read through `HELP_STATUS` — the same closed
                vocabulary this panel's own Stage facet offers — so the word a
                person filters by and the word they read back are one string. */}
            <TableCell className="text-muted-foreground">
              {t(HELP_STATUS[ticket.status])}
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
              {/* Through the shared formatter and the reader's own language, so
                  one ticket cannot carry two spellings of one day across the
                  two screens that show it. */}
              {formatDate(ticket.createdAt, lang)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <PagedPanelBody<HelpTicket>
      listKey={key}
      placeholder={t("Search tickets…")}
      matches={{
        none: t("No tickets match"),
        one: t("1 ticket matches"),
        many: t("{count} tickets match"),
      }}
      sorts={translatedSorts("help", t)}
      defaultSort={COLLECTION_SORTS.help.defaultSort}
      facets={[
        // ARCHIVED — the same door parameter (`view`) Tickets' own toolbar
        // offers (COLLECTION_FILTERS.help), and the reason `ticket.archivedAt`
        // above is worth reading at all: the resting read defaults to the
        // live pile, so an archived one only ever appears once this is asked.
        {
          field: "view",
          label: t("Archived"),
          control: "select",
          options: [
            { value: "live", label: t("No") },
            { value: "archived", label: t("Yes") },
          ],
        },
        // STAGE — closed vocabulary, the same words the row's own line prints.
        {
          field: "status",
          label: t("Stage"),
          control: "select",
          options: Object.entries(HELP_STATUS).map(([value, label]) => ({ value, label: t(label) })),
        },
        // KIND — the team's own vocabulary, exactly as the top-level Tickets
        // tab strip is built from it. A real door filter with nowhere to draw
        // a strip in this narrower view, so it becomes a facet here instead.
        ...(helpTypeOptions && helpTypeOptions.length > 0
          ? [
              {
                field: "helpType",
                label: t("Kind"),
                control: "select" as const,
                options: helpTypeOptions.map((v) => ({ value: v, label: v })),
              },
            ]
          : []),
      ]}
      fixed={{ appId }}
      fetchPage={(query, cursor) =>
        contentApi
          .help({ appId, ...query, cursor: cursor ?? undefined })
          .then((r) => ({ rows: r.tickets, nextCursor: r.nextCursor, total: r.total }))
      }
      restingData={q.data}
      restingError={q.error}
      errorText={t("Couldn't load the tickets.")}
      onRetry={() => q.refresh()}
      onNew={onNew}
      newLabel={t("Raise a ticket")}
      // No `help`/tickets import target exists.
      emptyTitle={t("Nothing has been raised about this app yet.")}
      loadMoreLabel={t("Load more tickets")}
      renderRows={renderRows}
      view={view}
    />
  )
}

/** THE APP RECORD'S TICKETS TAB — one tab, two views (client, 6 Sep 2026):
 *
 *   "Once you are convinced, I want you to create me, in each app, the ticket
 *    page. Put me in the list and also create another view for the dashboard.
 *    Make the dashboard a view inside the Tickets tab inside the app, and
 *    include whatever you think is relevant from the main dashboard for
 *    tickets, like a mini version, a filtered version."
 *
 * THE LIST LEADS, and that is her order and not a default this file picked:
 * "put me in the list" comes first in the sentence, and it is what a person
 * standing on a system usually wants — which ticket, not how many. The
 * dashboard is one press away and is remembered per record (`useRemembered`),
 * so a reader who lives on the numbers keeps them on THIS app without deciding
 * it for every other one.
 *
 * WHY A VIEW SWITCH AND NOT A SECOND TAB STRIP. The Tickets SCREEN puts its
 * dashboard on the folder strip beside Triage and the list, because a screen
 * has a strip. A record's tab does not, and it may not grow one — the client,
 * verbatim and unconditionally: "there can never be 2 rows of tabs, no folder
 * tabs, no line tabs. just never." So the two bodies are VIEWS, and the switch
 * sits in the toolbar's own `view` slot (R53), where the app already draws
 * Tiles/List on Apps, List/Timeline on Waves and Queue/List on Triage.
 *
 * ONE CONFIG, HANDED TO BOTH BODIES. The list draws its toolbar through
 * `<PagedFind>` and the dashboard draws its own `<ToolbarRow>`; both take the
 * SAME `ToolbarViewSlot` and both render it from the same fixed slot order, so
 * the control does not move under the hand that just pressed it. Building two
 * would have been two chances for it to sit in two places.
 *
 * NOTHING IS FETCHED HERE. Each body reads its own door — the list its paged
 * `content.help({ appId })`, the dashboard its grouped `content.helpDashboard({
 * appId })` — and the body that is not on screen is not mounted, so opening
 * this tab still costs exactly one read. */
export function AppTicketsTab({
  teamId,
  appId,
  helpTypeOptions,
  host,
  onNew,
  ticketTotal,
}: {
  teamId: string
  appId: string
  helpTypeOptions?: string[]
  host: PanelHost
  onNew?: () => void
  /** THIS APP'S OWN EXACT TICKET COUNT (R16), the sidecar the tab badge above
   * already reads — spent here on R50's question, which is about the
   * COLLECTION and never about a filtered answer: an app nobody has raised
   * anything about draws no toolbar on either view. `null` is the third answer
   * (the role may not read the module) and is treated as "not yet known", which
   * is the honest reading — this tab is only rendered behind `help:read` at
   * all, so the value cannot legitimately be null by the time anybody is
   * looking at it. */
  ticketTotal: number | null | undefined
}) {
  const t = useT()
  // REMEMBERED PER RECORD, NEVER PER PERSON-EVERYWHERE, which is `ViewSwitch`'s
  // own stated contract and the same slot shape `triage-view` uses one screen
  // along: the memory is scoped to the address the host published, so choosing
  // the dashboard on one app says nothing about the next one you open.
  const [view, setView] = useRemembered<"list" | "dashboard">("tickets-view", "list")
  const viewSlot: ToolbarViewSlot = {
    views: [
      // A VIEW SHAPE FOR THE LIST, A CONCEPT GLYPH FOR THE DASHBOARD, and the
      // difference is deliberate rather than an inconsistency. "List" is a way
      // of looking at rows and wears the same `ListBullets` the Triage switch
      // wears for the identical body; "Dashboard" is an IDEA this product
      // already has one icon for, and UI-CONVENTIONS §4 says a concept gets one
      // glyph reused at page, tab and button level — so it resolves through
      // `CONCEPT_ICON` exactly as the Tickets screen's own Dashboard tab does,
      // and the two cannot drift apart.
      { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
      {
        value: "dashboard",
        label: t("Dashboard"),
        icon: <Icon name={CONCEPT_ICON.dashboard} className="size-4" />,
      },
    ],
    value: view,
    onValueChange: (v) => setView(v === "dashboard" ? "dashboard" : "list"),
  }

  if (view === "dashboard")
    return (
      <TicketsDashboard
        teamId={teamId}
        appId={appId}
        // The team's own `Ticket type` words, the same list the Kind facet on
        // the list view offers and the same one the create dialog writes with —
        // read once by the record above and handed to both, so the pipeline
        // columns, the matrix axes and the filter can never be three different
        // vocabularies of one thing.
        helpTypeOptions={helpTypeOptions ?? []}
        ticketTotal={ticketTotal ?? undefined}
        viewSlot={viewSlot}
        // "RAISE A TICKET", ON BOTH VIEWS OF THIS TAB. The list view gets it
        // from `PagedPanelBody`'s own `onNew`, which builds exactly this
        // `<AddButton>` into `<PagedFind>`'s `actions` slot; the dashboard's own
        // `<ToolbarRow>` had no actions at all until 6 Sep 2026 ("on the
        // dashboard, I'm missing the full toolbar"). Same label, same glyph,
        // same slot in the same fixed order, so pressing the view switch does
        // not move the button that sits beside it.
        actions={onNew ? <AddButton label={t("Raise a ticket")} onClick={onNew} /> : null}
      />
    )

  return (
    <AppTicketsPanel
      appId={appId}
      helpTypeOptions={helpTypeOptions}
      host={host}
      onNew={onNew}
      view={viewSlot}
    />
  )
}

/* -------------------------------- the to-dos ------------------------------- */

/** WHICH LIST THIS PANEL IS HOLDING — one key per (client, pile).
 *
 * FOUR KEYS AND NOT ONE, because each is a separate paged read with its own
 * cursor sidecar and its own ordering. Sharing a key between the open pile and
 * the done pile would park a cursor minted under one ordering beside rows from
 * the other, and `<LoadMore>` would hand it back to a door that (correctly)
 * refuses it — or, before the two orderings carried different signatures, would
 * have been answered with a page that read as an answer and skipped rows.
 *
 * Every key but the plain open one sits inside `TODO_SLICE_PREFIX`, which the
 * live registry drops on any `todos` ping. */
export function todosListKey(teamId: string, accountId: string | undefined, view: TodoViewName): string {
  if (accountId) return sliceKey(view === "done" ? "todos-account-done" : "todos-account", accountId)
  return view === "done" ? todosDoneKey(teamId) : todosKey(teamId)
}

/** The count sidecar each of this panel's two tabs badges (R16) — the exact
 * server number for THAT pile, over the same narrowing the rows came from.
 *
 * The record tab ABOVE the panel badges `todos-account`, which is BOTH piles:
 * the tab reveals a panel that shows either, so a badge counting one of them is
 * a number the list can walk away from. Three keys, three questions, no number
 * said twice. */
function todoTotalKey(teamId: string, accountId: string | undefined, view: TodoViewName): string {
  if (accountId) return totalKey(view === "done" ? "todos-account-done" : "todos-account-open", accountId)
  return view === "done" ? totalKey("todos-done", teamId) : totalKey("todos", teamId)
}

/** WHAT WE ARE WAITING ON A CLIENT FOR — and WHAT HAS COME BACK.
 *
 * The one collection in the work engine a client login writes to: they complete
 * it and upload a file in their own portal, so this panel only ever WITHDRAWS
 * one — we stop needing it.
 *
 * IT HAS TWO VIEWS NOW, and the second one is the whole point of this file
 * changing. `completeTodo` writes `file_url` and `completed_at` in the SAME
 * UPDATE, so a to-do carries the document a client sent us if and only if it is
 * completed — and every list on both front doors filtered the completed out. The
 * only rows that could hold a client's file were exactly the rows nobody could
 * see. The `Done` badge below has been in this file since it was written and was
 * unreachable the whole time, which is the tell that the open-only default was a
 * later regression rather than a design.
 *
 * R14: the done pile accumulates for ever, so the collection PAGES — keyset
 * cursor, exact totals, and the `<LoadMore>` at the bottom that reaches page two.
 *
 * `accountId` narrows it to one client (the account record's own tab); without
 * it, it is everything anywhere. */
export function TodosPanel({
  teamId,
  accountId,
  canCancel,
  onNew,
}: {
  teamId: string
  accountId?: string
  canCancel: boolean
  onNew?: () => void
}) {
  const { t, lang } = useLanguage()
  const [view, setView] = React.useState<TodoViewName>("open")
  const key = todosListKey(teamId, accountId, view)
  const openTotal = useCachedValue<number | null>(todoTotalKey(teamId, accountId, "open"))
  const doneTotal = useCachedValue<number | null>(todoTotalKey(teamId, accountId, "done"))

  const q = useCached<Todo[]>(key, () =>
    contentApi.todos({ ...(accountId ? { accountId } : {}), view }).then((r) => {
      // EVERY NUMBER OFF ONE READ, whichever pile was asked for (R16): the badge
      // on the tab you are not looking at cannot be counted from the rows you
      // are, and the record tab above wants both piles added up.
      primeCache(todoTotalKey(teamId, accountId, "open"), r.openTotal)
      primeCache(todoTotalKey(teamId, accountId, "done"), r.doneTotal)
      if (accountId) primeCache(totalKey("todos-account", accountId), r.allTotal)
      primeCache(cursorKey(key), r.nextCursor)
      return r.todos
    })
  )

  async function cancel(id: string) {
    try {
      await contentApi.cancelTodo(id)
      invalidate(key)
      toast.success(t("Withdrawn."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't withdraw that."))
    }
  }

  // The two piles, as the library's own strip (R3 — never a hand-rolled toggle).
  // No override needed any more — `defaultTabsConfig` draws the one line shape
  // itself since v1.2.28 retired the folder variant this used to opt out of
  // (tabs-view.tsx's header has the ruling).
  const tabs = (
    <TabsView
      config={{
        ...defaultTabsConfig,
        tabs: [
          {
            value: "open",
            label: t("Open"),
            icon: "clipboard-text",
            badge: formatCount(openTotal),
            badgeVariant: "" as const,
          },
          {
            value: "done",
            label: t("Done"),
            icon: "check",
            badge: formatCount(doneTotal),
            badgeVariant: "" as const,
          },
        ],
      }}
      value={view}
      onValueChange={(v) => setView(v as TodoViewName)}
    />
  )

  // THE DONE PILE IS A RECORD, NOT A LIST OF ACTIONS — the open pile's
  // row carries one (Withdraw), and Checklist's row has no slot for it
  // (checked: mark/number/label/owner+when, nothing else). A finished
  // to-do offers nothing to press, so the shape that had no action slot
  // to miss fits it exactly, and its mark says "done" as a real
  // checkmark where the open-pile row said nothing at all. `onToggle`
  // omitted is the composition's own read-only register (its own doc
  // header: "Absent, the whole list is read-only and no mark is
  // interactive") — verified by rendering, not assumed: the checkbox
  // comes back `disabled`, `aria-checked="true"`, `aria-readonly` on
  // the list.
  const renderDone = (rows: Todo[]) => (
    <Checklist
      numbered={false}
      showProgress={false}
      label={t("Sent back by the client")}
      items={rows.map((todo) => {
        const fileLink = safeHref(todo.fileUrl)
        return {
          id: todo.id,
          done: true,
          // Checklist's own label span has no truncation of its own —
          // the kit draws a multi-line task description there, and a
          // to-do's title mid-length is closer to a table row's single
          // line. Truncated here rather than left to wrap: at 27 rows,
          // five or six lines apiece (measured against real staging
          // titles) turned the list into something nobody scans.
          label: (
            <span className={REF_LEADS_NAME}>
              <RecordRef value={todo.ref} />
              <span className="min-w-0 truncate">{todo.title}</span>
            </span>
          ),
          owner: todo.accountName,
          when: todo.completedAt ? t("done {date}", { date: formatDate(todo.completedAt, lang) }) : null,
          dateTime: todo.completedAt ?? undefined,
          meta:
            todo.completedByName || todo.fileName ? (
              <>
                {/* R54: a to-do is finished by the client's own person or by one
                    of ours on the phone with them — `completedByIsClient` is the
                    row's own answer to which. */}
                {todo.completedByIsClient
                  ? todo.completedByName
                  : staffNameFromSnapshot(todo.completedByName)}
                {todo.completedByName && todo.fileName ? " · " : null}
                {todo.fileName &&
                  (fileLink ? (
                    <a
                      href={fileLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {todo.fileName}
                    </a>
                  ) : (
                    todo.fileName
                  ))}
              </>
            ) : null,
        }
      })}
    />
  )

  const renderOpen = (rows: Todo[]) => (
    <RowList>
      {rows.map((todo) => {
        // WHAT THE CLIENT ACTUALLY SENT US, as a thing you can open.
        //
        // The filename used to be a third item in the ` · ` join below — a
        // string in a paragraph — while `todo.fileUrl` sat on the row and
        // was read by no component in either front door. So the agency asked
        // a client for a document, the client uploaded it through the
        // portal's "Send a file", the door wrote the bytes to the bucket and
        // the row, and a member of staff was shown the word "invoice.pdf"
        // that they could not click. The upload worked every time; nothing
        // ever led back to it — and then the row itself stopped rendering,
        // because attaching the file is what completes the to-do.
        //
        // Through `safeHref` like every other file on a screen, even though
        // this path is one THIS app minted (/media/…): the seam decides, not
        // the origin of the string. A URL it refuses prints as the plain
        // text it always was — the same fallback `staff-panel.tsx` gives a
        // certificate, whose shape this copies rather than inventing a third.
        const fileLink = safeHref(todo.fileUrl)
        const meta = [
          todo.accountName,
          todo.dueOn ? t("due {date}", { date: formatDate(todo.dueOn, lang) }) : t("no date"),
        ]
        return (
          <Row
            key={todo.id}
            live={!todo.completedAt && !todo.cancelled}
            mark={<RecordMark name={todo.title} />}
          >
            <div className="min-w-0 flex-1">
              <p className={`${REF_LEADS_NAME} text-sm`}>
                <RecordRef value={todo.ref} />
                <span className="min-w-0 truncate">{todo.title}</span>
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {meta.filter(Boolean).join(" · ")}
                {todo.fileName && (
                  <>
                    {" · "}
                    {fileLink ? (
                      <a
                        href={fileLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {todo.fileName}
                      </a>
                    ) : (
                      todo.fileName
                    )}
                  </>
                )}
              </p>
            </div>
            {/* The row that has just been completed under the reader's
                eyes, patched in place by the live layer, before the tab
                it now belongs to has caught up. */}
            {todo.completedAt && (
              <Badge variant="secondary" className="text-badge">
                {t("Done")}
              </Badge>
            )}
            {canCancel && !todo.completedAt && !todo.cancelled && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={t("Withdraw this input")}
                onClick={() => void cancel(todo.id)}
              >
                <Prohibit className="size-3.5" />
              </Button>
            )}
          </Row>
        )
      })}
    </RowList>
  )

  return (
    <div className="flex flex-col gap-2">
      {tabs}
      {/* THE PANEL'S REAL TOOLBAR — search only, answered by the DOOR (R14):
          the done pile keeps every completed to-do for ever, so a browser
          could only ever search the page it had loaded. No sort control and
          no facet: `view` is already this strip's own tab, `accountId` is
          already fixed wherever one is handed in, and the two piles are
          deliberately two ORDERINGS (`TODO_SORTS`,
          workers/content/src/lib/todos.ts) rather than one list a user
          control could reorder — a search asked while looking at Open still
          knows the Done pile's own match, from the very same read. */}
      <PagedPanelBody<Todo>
        listKey={key}
        placeholder={t("Search inputs…")}
        matches={{
          none: t("No inputs match"),
          one: t("1 input matches"),
          many: t("{count} inputs match"),
        }}
        fixed={{ view, ...(accountId ? { accountId } : {}) }}
        fetchPage={(query, cursor) =>
          contentApi
            .todos({ ...(accountId ? { accountId } : {}), view, ...query, cursor: cursor ?? undefined })
            .then((r) => ({ rows: r.todos, nextCursor: r.nextCursor, total: r.total }))
        }
        restingData={q.data}
        restingError={q.error}
        errorText={t("Couldn't load the inputs.")}
        onRetry={() => q.refresh()}
        onNew={view === "open" ? onNew : undefined}
        newLabel={t("Ask for something")}
        // No import target for to-dos — they are asked of a client one at a
        // time. The "done" pile has nothing to ADD (it is what came BACK), so
        // its empty state carries no button at all (`onNew` above is already
        // `undefined` on that tab).
        emptyTitle={
          view === "done"
            ? t("Nothing has come back from a client yet.")
            : t("Nothing outstanding with a client.")
        }
        loadMoreLabel={t("Load more inputs")}
        renderRows={view === "done" ? renderDone : renderOpen}
      />
    </div>
  )
}
