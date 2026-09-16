"use client"

// APPS — the systems we have built. An app belongs to ONE account, always (the
// owner's ruling), and everything else in the work engine hangs off it: a sprint
// covers one app, and a story is on one app whether or not it is in a sprint.
//
// AN APP IS THE ONE RECORD A PERSON RECOGNISES BY SIGHT (CHECKLIST 8.1, 17 Aug
// 2026) — it has a mark, a client and a stage, and the previous screen spent
// all three on a dot-separated subtitle nobody read. UI-RULEBOOK K9 permits a
// card grid exactly where the record carries an image, and G3 says the mark
// sits in a rounded square where a logo would; both are true here.
//
// TWO VIEWS, GALLERY AND BOARD — the client's ruling, 15 Sep 2026, verbatim:
// "For the main screen for the apps, I want the gallery icon laid out. Make
// sure you add a chip with the status. I also want you to add an alternate
// view board by stage. Include the icon, and in both of them, I want to see
// the status. In the gallery, make this a chip, then the title and the
// subtitle: the name of the account. In the board, make the icon bigger, and
// as you have it, the title and subtitle: account name." This REPLACES the
// Tiles/List pair the 2026-08-31/2026-09-01 rulings put here: the hand-rolled
// `<a>` tile (`AppTiles`, since deleted — see app-tiles.tsx's own header) could
// never carry R65/K16's "chip above title" (it drew no kit `<CardTitle>` for a
// census to find), and the List body was a table the client's own 15 Sep
// ruling elsewhere retires app-wide ("the client is replacing tables
// app-wide"). `appGalleryCard`/`appBoardCard`, below, are the two
// replacements.
//
// "STATUS" IS THE APP'S OWN STAGE — `AppRow` carries no separate status field
// (`shared/types.ts`), and `app-detail.tsx`'s own three pills already draw the
// identical `<Badge variant="status" dot={appStageDotTone(app.stage)}>` off
// `app.stage` for the same reason: a stage IS the record's status here, the
// same way a ticket's `status` and a story's own are theirs.
//
// TWO TABS SURVIVE UNCHANGED (8.2's OTHER HALF). Active is everything still
// being worked on; Inactive is Completed and Archived, which is the only pair
// of stages that means "done with". The count on each tab is the exact number
// of rows behind it, arbitrated through CountedTabs (R16) so the heading above
// stands down rather than saying the number twice. WHAT DID NOT SURVIVE is
// 8.2's stage-HEADING grouping inside a tab — the Board now owns "grouped by
// stage" for real (a column per stage, not a heading), so the Gallery is a
// flat wall like Accounts' own (UI-RULEBOOK K18), and a second, cruder
// grouping beside a real one would be the app disagreeing with itself about
// which view answers "which stage is this app in".
//
// AN ARCHIVED APP (deactivated_at set) is a different fact from the Archived
// STAGE, and both land in Inactive on purpose: from the reader's side "put
// away" is one idea, and a card that says "archived" while sitting in the
// Archived stage's board column is the app agreeing with itself.
//
// BOTH VIEWS READ `shown` — the SAME tab+search+facet+sort-narrowed array,
// never a second fetch or a second narrowing pass (`apps` is BOUNDED, R14).
// The Board's columns are the team's own "App stage" vocabulary
// (`useAppStages`, shared with `app-form-dialog.tsx`'s own picker — see its
// header), in ITS order, never A→Z (R75 — a lifecycle pipeline is exactly the
// kind of ordered list `ORDERED_OPTIONS_OK` exists for, and this file's own
// `boardColumns` below is a plain array fed to `<Kanban columns=…>`, never a
// `<SelectItem>`/`options=` — R75's picker census does not reach it, so no
// registry line is needed for it to stay honest).

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { Kanban, type KanbanCard, type KanbanColumn, type KanbanMove } from "@shared/ui/components/kanban/kanban"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Kanban as KanbanGlyph, SquaresFour } from "@shared/ui/foundations/icons"
import { toast } from "@shared/ui/components/sonner/sonner"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import { useRemembered } from "@shared/web/remembered"
import { hasRight, type ScreenRights } from "@shared/web/screen-engine/recipe"
import type { ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import type { FilterFacet, SortOption } from "@shared/web/screen-engine/config"

import { CollectionHeading } from "@/components/records/collection-heading"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { CountedAbove } from "@/components/records/counted-tabs"
import { SectionWithCreate, AddButton, ToolbarRow } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { AppFormDialog, type AppFormValues, useAppStages } from "@/components/apps/app-form-dialog"
import { useAssignableMembers } from "@/lib/members"
import { useSessionUserId } from "@/lib/use-active-team"
import { AppMark } from "@/components/apps/app-tiles"
import { InAppLink } from "@/components/shell/in-app-link"
import { safeHref } from "@shared/web/rich-text"
import { RecordMark } from "@shared/web/record-mark"
import { useAccountNames } from "@/lib/account-names"
import { tenancy } from "@/lib/api"
import { accountsKey, appsKey, listFetch, impactKey } from "@/lib/live-resources"
import { formatCount } from "@shared/web/format-count"
import { APP_STAGES, NO_STAGE, appStageDotTone, appStageIsActive } from "@shared/app-stages"
import type { Account, AppRow } from "@shared/types"
import { invalidate, useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"

/** Record an app through the door and re-read what changed. Shared with the maps
 * screen and the account record, both of which can add one. */
export async function createAppFrom(
  teamId: string,
  values: AppFormValues,
  /** The caller's language. A plain function cannot call `useT`, so the one
   * component that CAN hands it down — the same shape `translateRecipe` uses. */
  t: (english: string) => string
): Promise<void> {
  await tenancy.createApp({
    name: values.name,
    accountId: values.accountId || undefined,
    url: values.url || undefined,
    stage: values.stage || undefined,
    logoUrl: values.logoUrl || undefined,
    toolCostCentsPerMonth: values.toolCostCentsPerMonth,
    about: values.about || undefined,
    clientContext: values.clientContext || undefined,
    solution: values.solution || undefined,
    keyActors: values.keyActors || undefined,
    // Who is on it, from the same submit (8.10 + 8.5). Sent even when empty, so
    // recording an app with nobody on it is a deliberate answer rather than a
    // field the door never heard about.
    staffUserIds: values.staffUserIds,
    leadUserId: values.leadUserId || undefined,
    stakeholderContactIds: values.stakeholderContactIds,
    mainStakeholderContactId: values.mainStakeholderContactId || undefined,
  })
  invalidate(appsKey(teamId))
  invalidate(impactKey(teamId))
  toast.success(t("App recorded."))
}

/** Is this app still being worked on? An ARCHIVED row is inactive whatever its
 * stage says, and a stage the code has never met counts as active — the harm of
 * the wrong guess is asymmetric, and an app nobody can find is the worse half. */
function appIsActive(app: AppRow): boolean {
  return app.active && appStageIsActive(app.stage)
}

/** WHAT AN APP MAY BE ORDERED BY. On the Gallery this reorders the whole wall;
 * on the Board it reorders the cards INSIDE each stage column (the column
 * itself is fixed — one per vocabulary entry, never reshuffled by a sort) —
 * the same split `PagedFind` draws between "which rows" and "what order", one
 * layer down for a bounded screen instead of a paged one. */
const APP_SORTS: SortOption[] = [
  { value: "name", label: "Name" },
  { value: "client", label: "Account" },
  { value: "created", label: "Created", defaultDir: "desc" },
]

/** A date that sorts null-last whichever way the arrow points — an app with no
 * recorded creation date (a row from before the column existed) is an ordinary
 * state, not "the year zero". */
function dateKey(iso: string | null | undefined): number {
  return iso ? Date.parse(iso) : Number.NaN
}

/** `dir` is applied INSIDE, never by negating the whole comparator at the call
 * site — a null `createdAt` must sort last whichever way the arrow points, and
 * multiplying the null tie-break by -1 would put an app with no recorded date
 * FIRST the moment somebody flips to descending (caught live, verification
 * harness: "Archived draft SOP" jumped to the top of a newest-first sort). */
function compareApps(
  a: AppRow,
  b: AppRow,
  by: string,
  accountNames: Map<string, string>,
  dir: "asc" | "desc"
): number {
  const dirMul = dir === "desc" ? -1 : 1
  if (by === "client") {
    const an = a.accountId ? (accountNames.get(a.accountId) ?? "") : ""
    const bn = b.accountId ? (accountNames.get(b.accountId) ?? "") : ""
    return an.localeCompare(bn) * dirMul
  }
  if (by === "created") {
    const ad = dateKey(a.createdAt)
    const bd = dateKey(b.createdAt)
    if (Number.isNaN(ad) && Number.isNaN(bd)) return 0
    if (Number.isNaN(ad)) return 1
    if (Number.isNaN(bd)) return -1
    return (ad - bd) * dirMul
  }
  return a.name.localeCompare(b.name) * dirMul
}

/** THE CARD'S FLOOR — reused from `members-gallery.tsx`'s own measured 12rem,
 * the same figure `accounts-screen.tsx`'s own `GALLERY_MIN_CARD` (the pattern
 * this wall copies) takes for an identical reason: mark, name, one chip line
 * under it — the same class of card, so the widest line on one is the widest
 * kind of line on the other. */
const GALLERY_MIN_CARD = "12rem"

/** THE STAGE PILL'S OWN GEOMETRY AND GROUND — client feedback, 16 Sep 2026,
 * verbatim: "show me the different colors for the pills for the status, and
 * make sure that there is a space between the color dot and the name. Make
 * sure that all the pills have a background, because currently development
 * does not. All of them should have the same color background. What changes
 * is the color of their dot."
 *
 * `size="pill"` — the default `<Badge>` geometry is `size="counter"` (the
 * 20-tall COUNT chip, no `gap-*` of its own at all), never CH11's 26-tall
 * STATUS PILL (`--control-height-pill`, `gap-2` between the dot and the
 * label). Both call sites below left `size` unset, so the dot sat flush
 * against the word — a missing kit token, not a missing space character.
 *
 * `bg-surface-panel` — why a call-site override is needed at all, and why it
 * is not a `Badge`/token bug alone: `variant="status"`'s own fill,
 * `--pill-fill`, is `var(--card)` (`shared/ui/foundations/tokens/tokens.css`),
 * because the kit's CH11 draws the status pill on `--sheet`, "the OTHER paper
 * tone from the panel it sits on" (badge.tsx's own header). Both cards this
 * chip renders inside — the Gallery's `<Card variant="raised">` and the
 * Board's Kanban card — are THEMSELVES `bg-card` (`card.tsx`'s own comment:
 * "off-beige over soft paper"), so `--pill-fill` paints the exact colour of
 * the card underneath it, in both palettes (`--pill-fill` tracks `--card`
 * byte-for-byte, tokens.css §7). A background that equals its own container
 * is `card.tsx`'s own documented failure mode ("`--card` box on the page
 * draws nothing at all") one layer further in, and it was invisible on every
 * stage, not only "Development" — a coloured dot beside it read as "a chip is
 * there" for the other five; `building`'s dot is `--foreground` (near the
 * label's own ink), so it was the one stage with nothing left to read.
 * `record-chrome.tsx`'s `IDENTITY_ROW` already rebinds the identical pill to
 * `--surface-panel` for the record head, for the identical reason (that row
 * sits on the page, not a card); this is the same fix for the two surfaces
 * this file owns, done at the call site rather than inside `Card`/`Kanban`
 * (kit components neither this lane nor this change touches).
 *
 * ONE FLAT GROUND FOR EVERY STAGE — the client's own second sentence. A KIT
 * bug, still OPEN as of 16 Sep 2026: ruling 26's dark clause puts the ONE
 * tone this app actually uses most, `building` ("Development"/
 * "Documentation"/"Iteration"), on a mango fill with a charcoal label and dot
 * in dark mode — the one stage whose pill changes colour at all, which is
 * exactly why `text-foreground` is named here rather than left to the
 * badge's own `--pill-label`: this className wins over whatever `badge.tsx`
 * computes internally (a caller's `className` is merged last, `cn()`'s own
 * contract), so it gives every stage the identical ground and ink regardless
 * of what the kit does with `building` underneath. The right fix is still to
 * retire `shared/ui/components/badge/badge.tsx`'s `status`+`building`
 * compound variant at the source — this call-site override is the visible
 * fix, not a substitute for that one — but it is a kit change, gated on a
 * second kit lane's own tag (v1.2.90) landing first; UI-RULEBOOK.md K23's
 * amendment, 16 Sep 2026, has the open item.
 */
const STAGE_PILL_PROPS = {
  variant: "status" as const,
  size: "pill" as const,
  className: "bg-surface-panel text-foreground",
}

/** THE GALLERY CARD — client ruling, 15 Sep 2026: "In the gallery, make this
 * a chip, then the title and the subtitle: the name of the account." A kit
 * `Card`/`CardTitle` (R65/K16 needs the real thing, not a hand-rolled `<span>`
 * — see app-tiles.tsx's own header for what the retired `AppTiles` cost by
 * skipping it), with the status chip ABOVE the title in source order (a
 * `Card` is `flex flex-col`, so source order IS visual order here).
 *
 * THE SUBTITLE IS A CARD FACT, NOT A PAGE HEAD (R72 does not reach it) — a
 * card is a record fact block, not a titled SECTION, so this was never R72's
 * subject; but its own census (`no-default-subtitles.test.ts`, amendment 1,
 * 2026-09-14) reads `CardTitle` as a heading now, so the subtitle is built as
 * a VARIABLE and interpolated (`{subtitle}`) rather than written as a literal
 * prose tag the very next significant JSX sibling of `<CardTitle>` — the
 * identical escape `accounts-screen.tsx`'s own `accountGalleryBody` already
 * takes for its manager chip (`{row.manager}`, built in `shape.tsx`, never a
 * bare `<span>` beside `CardTitle` in that file's own JSX). A `{…}` expression
 * child carries no JSX tag name for the census's `tagName()` to read, so the
 * pair never forms; the content is unchanged.
 *
 * A REAL ANCHOR (R37) — `InAppLink`, the same shape `accountGalleryBody`
 * draws for its own wall: middle-click, copy-address and a screen reader's
 * link list all work, and only the plain left click is intercepted into the
 * shell soft-navigation bus. */
function appGalleryCard(
  app: AppRow,
  { teamId, accountNames, t }: { teamId: string; accountNames: Map<string, string>; t: (s: string) => string }
): React.ReactNode {
  const client = app.accountId ? (accountNames.get(app.accountId) ?? t("An account")) : t("Ours")
  const href = safeHref(`/t/${teamId}/apps/${app.id}`) ?? `/t/${teamId}/apps`
  // See this function's own header for why this is a variable rather than a
  // literal tag written straight after <CardTitle> below (R72 amendment 1).
  const subtitle = (
    <span className="text-muted-foreground block truncate text-xs">
      {app.active ? client : `${client} · ${t("archived")}`}
    </span>
  )
  return (
    <Card key={app.id} variant="raised" className="hover:bg-accent motion-hover">
      <InAppLink href={href} className="block">
        <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
          {/* THE ICON — `size="band"`, the same size accounts' own gallery
              draws (K18). Square by default (R35/R60): an app's mark is a
              rounded square, filling the box, never shrunk to fit inside
              one. */}
          <AppMark app={app} size="band" />
          {/* THE STATUS CHIP, ABOVE THE TITLE (R65/K16) — "status" is the
              app's own STAGE; `AppRow` carries no separate status field, and
              `app-detail.tsx`'s own pills already draw this exact chip off
              `app.stage` for the same reason. Absent when an app carries no
              stage at all — a chip is a fact about the record, not a blank
              placeholder. */}
          {app.stage && <Badge {...STAGE_PILL_PROPS} dot={appStageDotTone(app.stage)}>{t(app.stage)}</Badge>}
          <CardTitle className="text-sm">{app.name}</CardTitle>
          {/* THE SUBTITLE — the account name (this function's own header,
              above, on why R72 does not forbid it here). */}
          {subtitle}
        </CardContent>
      </InAppLink>
    </Card>
  )
}

export function AppsScreen({
  teamId,
  rights,
  total,
  canCreate,
  onIntent,
}: {
  teamId: string
  rights: ScreenRights
  /** the exact server total (R16) — never the loaded list's length */
  total: number | undefined
  canCreate: boolean
  onIntent: (intent: ScreenIntent) => void
}) {
  const t = useT()
  const appsQ = useCached<AppRow[]>(appsKey(teamId), () => listFetch.apps(teamId))
  // The accounts an app can belong to, for the add-app picker below — page one
  // is plenty for a picker (the same cache the accounts screen holds), and a
  // picker searches rather than trusting page one to hold everything anyway.
  const accountsQ = useCached<Account[]>(accountsKey(teamId), () => listFetch.accounts(teamId))
  // The NAME each tile shows for its account — never page one alone (see
  // web/lib/account-names.ts: page one silently dropped an app's real account
  // for one outside it, 2026-08-31).
  const accountNames = useAccountNames(teamId)
  // Who can be put on an app (8.10) — the team, from the cache four other
  // screens already fill.
  const members = useAssignableMembers(teamId)
  // THE SIGNED-IN USER, preselected as staff (and lead) on a new app — client
  // ruling, 15 Sep 2026: "always put the user preselected by default."
  const myUserId = useSessionUserId()
  const [addOpen, setAddOpen] = React.useState(false)
  // Which half of the collection she was in, remembered per screen with the
  // rest of what she was looking at (web/lib/nav-memory.ts).
  const [tab, setTab] = useRemembered("tab", "active")
  // THE SEARCH BOX (the owner, 24 Aug 2026: "I cannot search through any of my
  // apps, which is a weird thing to begin with"). It narrows the LOADED set
  // rather than asking the server, and that is the right shape here for the same
  // reason the Active/Inactive split is: this collection is BOUNDED (R14), read
  // whole, and twenty-eight rows are already in the browser. Typing is instant
  // and costs nothing. The door takes a `q` as well, because the assistant and
  // an outside tool cannot hold a list in a browser (R19).
  const [query, setQuery] = useRemembered("search", "")
  // WHICH FACETS ARE ON, {} = none — the same shape WaveFinder's own facet
  // state takes, and for the same reason: this collection is bounded (R14) and
  // read whole, so a facet here is a plain filter over the array in hand rather
  // than a door parameter.
  const [facetValues, setFacetValues] = useRemembered<Record<string, string>>("filters", {})
  // THE ORDER, remembered as one slot with its direction — the field the
  // person is sorting by and which way, so a re-pick and a flip cannot land in
  // two different renders.
  const [sort, setSort] = useRemembered<{ by: string; dir: "asc" | "desc" }>("sort", {
    by: "name",
    dir: "asc",
  })
  // WHICH BODY — Gallery or Board, remembered per screen exactly like `tab`/
  // `query`/`facetValues`/`sort` above (the kit's `ViewSwitch` doc calls this
  // choice "remembered, per person" and leaves the STORE to the app; this is
  // the app's one seam for that, already scoped to one browser's own tab).
  // GALLERY FIRST, ALWAYS — CHECKLIST 8.1 (top of file) is a product ruling
  // that this collection opens on a wall of cards, not the kit's own
  // generic "put the table first" recommendation (view-switch.tsx says
  // plainly it cannot check which entry IS the table — "that route's
  // vocabulary"). Don't reorder `views` below to match the kit's default.
  // `revive` guards a value remembered from before 15 Sep 2026 ("tiles"/
  // "list", the pair this ruling retired) — an unrecognised stored string
  // falls back to the default rather than rendering a body that no longer
  // exists (`useRemembered`'s own contract).
  const [view, setView] = useRemembered<"gallery" | "board">("view", "gallery", (v) =>
    v === "gallery" || v === "board" ? v : undefined
  )

  // WHO AN APP MAY BE FILED UNDER, and WHICH STAGE — both derived from the
  // WHOLE collection (never `matching`/`shown`), so a facet's own options never
  // vanish as another control narrows the list (the same rule FilterBar's own
  // header names: "distinct values are derived from it when a facet omits
  // options … so choices don't vanish as you filter"). "Ours" (no account) has
  // no facet value of its own — an empty facet value already means "off" — the
  // same limit WaveFinder's client facet accepts for the same field.
  //
  // COMPUTED AHEAD OF THE TWO EARLY RETURNS BELOW (`appsQ.data ?? []`), so
  // `useFilterBar` — a HOOK — can be called unconditionally alongside every
  // other hook here, same discipline `shared/web/screen-engine/
  // collection-frame.tsx` keeps for its own `useFilterBar` call. A `<FilterBar>`
  // COMPONENT could mount and unmount freely with the loading state; a hook
  // cannot skip renders the same way.
  const loadedApps = appsQ.data ?? []
  /* AND EACH ACCOUNT WEARS ITS OWN FACE — client ruling, 2026-09-09: "for
     accounts include icon in select components and filters". The Stage facet
     beside this one has drawn its glyph for weeks and the tickets toolbar's own
     Account facet since 2026-09-07, so this was the last filter row on which the
     same record appeared as a bare word.
     A MAP BY ID, off the accounts read this screen already holds: `accountNames`
     one line up carries the WORD and nothing else (web/lib/account-names.ts), and
     widening that seam to carry a picture would push a rendering concern into a
     name lookup nine other screens share. The rows are right here.
     A CLIENT THIS SCREEN'S PAGE ONE HAS NEVER SEEN still gets an option and still
     gets a mark: `accountNames` already answers "An account" for a name it cannot
     resolve (accounts PAGE, R14), and `RecordMark` draws that word's own initial
     rather than an empty box. Same direction of failure the app facet on the
     tickets toolbar chose out loud — an option we cannot fully describe keeps its
     place, because the rows behind it are real.
     `size="choice"` is the dense mark size every picker option and every other
     marked facet in the app uses; nothing here decides a new one. */
  const accountsById = new Map((accountsQ.data ?? []).map((a) => [a.id, a]))
  const clientOptions = Array.from(
    new Set(loadedApps.filter((a): a is AppRow & { accountId: string } => Boolean(a.accountId)).map((a) => a.accountId))
  )
    .map((id) => {
      const label = accountNames.get(id) ?? t("An account")
      return {
        value: id,
        label,
        mark: <RecordMark picture={accountsById.get(id)?.logoUrl ?? null} name={label} size="choice" />,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
  const usedStages = new Set(loadedApps.map((a) => a.stage).filter((s): s is string => Boolean(s)))
  const stageOptions = APP_STAGES.filter((s) => usedStages.has(s.name)).map((s) => ({
    value: s.name,
    label: t(s.name),
  }))
  const facets: FilterFacet[] = [
    { field: "accountId", label: t("Account"), control: "select", options: clientOptions },
    { field: "stage", label: t("Stage"), control: "select", options: stageOptions },
  ]
  const sortOptions = APP_SORTS.map((o) => ({ ...o, label: t(o.label) }))

  // Searched FIRST, so the two tab badges count what the search left — a badge
  // saying 28 over a list showing 3 is R16's exact complaint, and the fact that
  // this split is counted in the browser does not excuse it from being honest.
  const needle = query.trim().toLowerCase()
  let matching = needle
    ? loadedApps.filter(
        // NAME OR REFERENCE. The reference is on the row now (the black chip
        // in front of the name), and the first thing a person does with a
        // number they can see is type it in here.
        (a) => a.name.toLowerCase().includes(needle) || (a.ref ?? "").toLowerCase().includes(needle)
      )
    : loadedApps
  // …THEN THE FACETS, same reason: the badges below must count what a facet
  // left too, not just what the search box left.
  if (facetValues.accountId) matching = matching.filter((a) => a.accountId === facetValues.accountId)
  if (facetValues.stage) matching = matching.filter((a) => a.stage === facetValues.stage)
  const narrowed = needle !== "" || Object.keys(facetValues).length > 0
  const active = matching.filter(appIsActive)
  const inactive = matching.filter((a) => !appIsActive(a))
  const preSort = tab === "inactive" ? inactive : active
  // …AND THE SORT LAST — it reorders what is left, it never narrows it, so it
  // has no business in the counts above. On the Board this is the order
  // CARDS read inside a column; which column a card lands in is the app's
  // own `stage`, never this control's business either.
  const shown = [...preSort].sort((a, b) => compareApps(a, b, sort.by, accountNames, sort.dir))

  // CALLED UNCONDITIONALLY — `useFilterBar`'s own `{ pill, panel }` split
  // (v1.2.27), used below only once the data has actually loaded.
  const { pill: filterPill, panel: filterPanel } = useFilterBar({
    facets,
    values: facetValues,
    data: loadedApps,
    onChange: (field, value) =>
      setFacetValues((prev) => {
        const next = { ...prev }
        if (value === "") delete next[field]
        else next[field] = value
        return next
      }),
    onClearFacets: () => setFacetValues({}),
    resultCount: matching.length,
  })

  // ALSO CALLED UNCONDITIONALLY, ABOVE THE ERROR RETURN BELOW — the same
  // discipline `useFilterBar` just above keeps: `useAppStages` is a HOOK
  // (`useCached` underneath), so it cannot skip a render the way a component
  // can. The Board reads its result further down, after `appsLoading` is known.
  const stageVocab = useAppStages(teamId)

  if (appsQ.error)
    return (
      <ShapeStateBody
        shape="collectionScreen"
        state="error"
        copy={{ errorTitle: t("Couldn't load the apps.") }}
        action={
          <Button variant="secondary" onClick={() => appsQ.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )
  // WAS A WHOLE-SCREEN EARLY RETURN (2026-09-03 audit — "nine screens blank
  // their entire toolbar while loading"): `if (appsQ.data === undefined)
  // return <Skeleton .../>` unmounted the heading, the tab strip, the
  // search/sort/view row and the create button along with the rows, so all
  // four popped into existence at once the moment the read resolved, over a
  // generic 3-line skeleton even on this, the one tile-wall screen in the
  // app. `loadedApps` above already defaults to `[]` before that happens (it
  // has to, for the hooks beneath it to run unconditionally), so the fix is
  // to keep drawing the real chrome throughout and swap only the ROWS region
  // below — the same "body swap, frame stays" law the kit's own
  // `CollectionFrame` already follows internally.
  const appsLoading = appsQ.data === undefined

  // MAY THIS READER DRAG A CARD BETWEEN STAGES? `rights` is the same sheet
  // the parent already resolved for this screen's `gate: { module:
  // "processes", right: "read" }` (web/lib/screens.ts's own binding —
  // `apps: "processes"`), read here for `update` instead: a drag is a write,
  // gated exactly like the edit form's own stage field
  // (`postUpdateApp`, `processes:update`). `hasRight` reads `rights` rather
  // than a second `usePermissions(teamId)` fetch, since the caller already
  // primed it.
  const canDragApps = hasRight(rights, { module: "processes", right: "update" })

  // THE BOARD'S OWN COLUMNS — `stageVocab` (above) is the team's own "App
  // stage" vocabulary, in ITS order — never A→Z (R75; see this file's
  // header). ONE MORE COLUMN, LAST, for an app with no stage recorded at
  // all: the same honesty `NO_STAGE` already carried for the retired Tiles
  // headings — an app nobody can find on the one screen built to show it by
  // sight is worse than an ugly extra column.

  /** One app, as a board card — read by every column below. THE ICON (bigger
   * than the Gallery's, `size="board"` — see record-mark.tsx's own note)
   * rides INSIDE `title` rather than the kit's own `content` slot: the
   * vendored `Kanban` card draws chips, then title, then description, then
   * `content` LAST, always (kanban.tsx's own law, "content stays the LAST
   * drawn thing") — there is no leading-media slot before the chip row to put
   * a big mark in without hand-editing the pinned kit (R39), so the mark
   * rides beside the name instead, inside the one slot that opens right under
   * the chip. THE STATUS CHIP is `badges` (K16/R65 — the kit draws it above
   * the title unconditionally) and THE SUBTITLE is `description` — the same
   * three facts the Gallery card below draws, in the client's own words for
   * both: "in both of them, I want to see the status … title and subtitle:
   * account name." */
  function appBoardCard(app: AppRow): KanbanCard {
    const client = app.accountId ? (accountNames.get(app.accountId) ?? t("An account")) : t("Ours")
    return {
      id: app.id,
      // Same pill, same reason: `STAGE_PILL_PROPS` (see this file's header,
      // above `appGalleryCard`) — the Kanban card is `bg-card` too, so the
      // fill needs the identical `--surface-panel` rebind and `size="pill"`
      // gap.
      badges: app.stage ? (
        <Badge {...STAGE_PILL_PROPS} dot={appStageDotTone(app.stage)}>
          {t(app.stage)}
        </Badge>
      ) : undefined,
      title: (
        <span className="flex items-center gap-2">
          <AppMark app={app} size="board" />
          <span className="min-w-0 truncate">{app.name}</span>
        </span>
      ),
      description: app.active ? client : `${client} · ${t("archived")}`,
      disabled: !canDragApps,
    }
  }

  // ONE COLUMN PER VOCABULARY STAGE, in the team's own order, plus the
  // trailing "no stage" column — cards are `shown` (the same tab+search+
  // facet+sort narrowed array the Gallery reads below), never a second fetch.
  const boardColumns: KanbanColumn[] = [
    ...stageVocab.map((s) => ({
      id: s.value,
      title: t(s.value),
      dot: appStageDotTone(s.value),
      cards: shown.filter((a) => (a.stage ?? "").trim() === s.value).map(appBoardCard),
    })),
    {
      id: NO_STAGE,
      title: t(NO_STAGE),
      cards: shown.filter((a) => !(a.stage ?? "").trim()).map(appBoardCard),
    },
  ]

  // THE BOARD'S OWN WRITE — a drop sends the MINIMAL patch `postUpdateApp`
  // accepts (`workers/tenancy/src/routes/processes.ts`): `id` + the always-
  // required `name`, and `stage` alone. Every other field is simply ABSENT
  // from the body (never set to `undefined` in a way JSON would keep — it
  // is not written here at all), which the door reads as "say nothing about
  // it" (its own patch rule) — a drag must not silently empty an app's staff,
  // logo or context, the same guarantee `savePeople`'s own comment states for
  // a machine editing an app's stage.
  async function moveAppStage(move: KanbanMove) {
    const current = (appsQ.data ?? []).find((a) => a.id === move.cardId)
    if (!current) return
    const toStage = move.toColumnId === NO_STAGE ? "" : move.toColumnId
    if ((current.stage ?? "").trim() === toStage) return
    try {
      await tenancy.updateApp({ id: current.id, name: current.name, stage: toStage })
      invalidate(appsKey(teamId))
    } catch {
      toast.error(t("Couldn't update that value."))
    }
  }

  const activeBadge = formatCount(active.length)
  const inactiveBadge = formatCount(inactive.length)
  const tabsConfig = {
    ...defaultTabsConfig,
    tabs: [
      { value: "active", label: t("Active"), icon: "app-window", badge: activeBadge, badgeVariant: "" as const },
      { value: "inactive", label: t("Inactive"), icon: "archive", badge: inactiveBadge, badgeVariant: "" as const },
    ],
  }

  return (
    // R16 ARBITRATION: the two tabs carry the split, so the heading stands down
    // rather than saying a third number two lines above them. Same shape as the
    // tasks screen's six views, and for the same reason.
    <CountedAbove active={activeBadge !== "" || inactiveBadge !== ""}>
    <div className="flex flex-col gap-6">
      {/* THE MODULE'S OWN DOOR INTO ITS SETTINGS (R61) — the app stages
          (`apps.stage`) and the deliverable kinds (`deliverables.kind`, read on
          an app's own record, so the app is the module that owns them). The
          heading's `action` slot and not the toolbar, which R50 removes entirely
          from a team with no apps yet. */}
      <CollectionHeading sectionKey="apps" total={total} action={<ModuleSettingsGear teamId={teamId} segment="apps" />} />

      <SectionWithCreate
        show={canCreate}
        label={t("Record an app")}
        icon="plus"
        onCreate={() => setAddOpen(true)}
        // Active and Inactive are one kind of record with a filter on it, which
        // is the kit's own test for the folder shape. `folderTabs` now draws
        // the tabs ALONE (client ruling, 2026-08-31, correcting the earlier
        // fix that shared this row with "Record an app") — the button moves
        // into the search row below instead, the toolbar this screen already
        // has.
        folderTabs={{ config: tabsConfig, value: tab, onValueChange: setTab }}
      >
        {/* THE TOOLBAR IS INSIDE THE CARD, BELOW THE TABS — the canonical
            shape (client ruling, 2026-08-31): a tab strip's own toolbar sits
            inside the SAME card as the rows it narrows, never on the base
            background between the strip and the card, and its own action
            button sits at the toolbar's right — never beside the tabs. The
            split is still computed over what the search left ("searched
            FIRST" above), so the box still narrows the collection and the
            tabs still divide what is left; only where the button is DRAWN has
            moved a second time.
            ONE ROW, ALWAYS (client ruling, 2026-09-01 — the toolbar spec
            Aurora approved that night): search, the filter chips, sort, then
            the create button pinned right, ALL through `<ToolbarRow>`
            (screen-bits.tsx). `filters` used to be a `<FilterBar>` drawn as
            this row's own sibling below it — the client's screenshot of
            exactly this screen ("Search apps… / Sort by / Name" on one row, a
            stranded dashed "Filter" chip under it) — so it is a slot of the
            row now instead of a second row beside it; its open panel is the
            separate `toolbarPanel` slot (v1.2.27's `useFilterBar` split).
            Options come from the WHOLE collection (see above), so narrowing
            by one facet never hides the other's choices. */}
        <ToolbarRow
          // `!appsLoading &&` — never the RAW `loadedApps.length === 0` alone:
          // that array defaults to `[]` before the read resolves, which reads
          // exactly like a genuinely empty collection unless the loading state
          // is folded into the same expression (2026-09-03 audit).
          empty={!appsLoading && loadedApps.length === 0}
          search={
            (appsLoading || loadedApps.length > 0) && (
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClear={() => setQuery("")}
                placeholder={t("Search apps…")}
                className="w-full"
              />
            )
          }
          filters={(appsLoading || loadedApps.length > 0) && filterPill}
          toolbarPanel={(appsLoading || loadedApps.length > 0) && filterPanel}
          // SORT AND VIEW ARE CONFIGS NOW, NOT NODES (R53, 2026-09-06 — the
          // client on two of her own screenshots: "why the fuck i still have
          // different toolbar variations??? unify joder"). This screen was one
          // of only two that passed `sort` through its own slot at all; eight
          // others handed a `<SortControl>` to `search` and drew it inside the
          // row's growing box. `<ToolbarRow>` builds both controls itself now,
          // so the placement, the wrapper and the `label`/`hideLabel`
          // treatment are the row's on every screen — this call site keeps
          // only what it alone knows: the columns, the choice and the
          // direction. See screen-bits.tsx's `ToolbarSortSlot`.
          sort={
            (appsLoading || loadedApps.length > 0) && {
              options: sortOptions,
              value: sort.by,
              onValueChange: (by: string) => {
                const opt = APP_SORTS.find((o) => o.value === by)
                setSort({ by, dir: opt?.defaultDir ?? "asc" })
              },
              direction: sort.dir,
              onDirectionChange: (dir: "asc" | "desc") => setSort((s) => ({ ...s, dir })),
            }
          }
          view={
            (appsLoading || loadedApps.length > 0) && {
              // GALLERY FIRST — CHECKLIST 8.1's own ruling, not the kit's
              // generic table-first default (see the state declaration
              // above and the file's header comment).
              views: [
                { value: "gallery", label: t("Gallery"), icon: <SquaresFour size={16} /> },
                { value: "board", label: t("Board"), icon: <KanbanGlyph size={16} /> },
              ],
              value: view,
              onValueChange: (next: string) => setView(next === "board" ? "board" : "gallery"),
            }
          }
          actions={canCreate && <AddButton label={t("Record an app")} onClick={() => setAddOpen(true)} />}
        />
        {appsLoading ? (
          // THE ROWS REGION ONLY — the chrome above (tabs, search, sort, view,
          // the create button) is already drawn; this is the one thing that
          // was worth a skeleton in the first place.
          <Skeleton variant="list" lines={4} />
        ) : shown.length === 0 ? (
          narrowed ? (
            /* R62 — THE SAME REGISTER, MINUS THE ADD BUTTON. Client,
               2026-09-09. This was a bare grey line while both branches below
               draw the full register; `filtered` makes them one body and takes
               the create action away, so the tab's own "Add the first" cannot
               appear over a list a search is hiding. The title is the Active
               tab's own sentence and is unread here — `filtered` says
               "Nothing matched." instead, because "No apps yet." is a claim
               about the collection and it is untrue mid-search. */
            <CollectionEmptyState filtered title={t("No apps yet.")} />
          ) : tab === "inactive" ? (
            // The same register as the Active tab below (owner ruling,
            // 2026-09-07: empty states for everything), with no act — an app
            // reaches this pile by being finished or put away on its own
            // screen, never by being added here.
            <CollectionEmptyState title={t("Nothing is finished or put away yet.")} />
          ) : (
            // GENUINELY EMPTY (no search, the Active tab): the kit's own
            // 27.21 register, not the plain sentence — there is no apps
            // import target (`workers/data-ops/src/lib/targets.ts` has none),
            // so this is "Add the first" alone, never a second button that
            // would point nowhere.
            <CollectionEmptyState
              title={t("No apps yet.")}
              onCreate={canCreate ? () => setAddOpen(true) : undefined}
            />
          )
        ) : view === "board" ? (
          // THE BOARD — one column per stage (`boardColumns`, above), fed the
          // identical `shown` cards the Gallery draws below. `onMove` is
          // withheld outright for a reader without `processes:update` —
          // `card.disabled` (set in `appBoardCard`) also refuses the pick-up
          // on a per-card basis, but the board-wide `onMove` prop is what the
          // kit's own doc calls read-only: "without it, no card is draggable,
          // no card takes the move keys, and no drop target lights up."
          // `emptyColumns="bare"` — client ruling, 2026-09-15, the same
          // sentence that shipped the tasks board's own: "when empty, don't
          // show anything at this stage." A team with two apps and eight
          // stages would otherwise draw six boxed "nothing here" registers
          // for the one thing a board already says by being thin there.
          <Kanban
            columnWidth="max(14rem, calc((100% - 3 * var(--space-2h)) / 4))"
            columns={boardColumns}
            onMove={canDragApps ? moveAppStage : undefined}
            onCardSelect={(card) => onIntent({ kind: "open", module: "apps", id: card.id })}
            label={t("Apps by stage")}
            emptyColumns="bare"
          />
        ) : (
          // THE GALLERY — a flat wall (UI-RULEBOOK K18, the same shape
          // Accounts' own draws): `appGalleryCard`, above, is the kit
          // `Card`/`CardTitle` R65/K16 needs for a chip-above-title census to
          // find, which the retired `AppTiles` never was.
          <CardGrid fluid minItemWidth={GALLERY_MIN_CARD} label={t("Apps")}>
            {shown.map((app) => appGalleryCard(app, { teamId, accountNames, t }))}
          </CardGrid>
        )}
      </SectionWithCreate>

      {/* R14: BOUNDED, not paged — an agency has tens of apps, not thousands.
          The collection that grows underneath is the process maps. */}

      <AppFormDialog
        members={members}
        open={addOpen}
        onOpenChange={setAddOpen}
        teamId={teamId}
        accounts={(accountsQ.data ?? [])
          .filter((a) => a.active && a.accountType === "entity")
          .map((a) => ({ id: a.id, name: a.name }))}
        draftKey={`app:add:${teamId}`}
        defaultStaffUserId={myUserId ?? ""}
        onSubmit={(v) => createAppFrom(teamId, v, t)}
      />
    </div>
    </CountedAbove>
  )
}
