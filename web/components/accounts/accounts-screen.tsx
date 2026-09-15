"use client"

// ACCOUNTS MAIN — the client's ruling, 14 Sep 2026, verbatim: "for accounts
// main: use gallery and add table as alternate view. filter by account
// manager, country, status. sort by name - in the table columns: name status,
// account manager, country." Five decisions, and this file is where all five
// land.
//
// ── WHY THIS IS ITS OWN FILE, NOT A BRANCH OF `collection-content.tsx` ───────
//
// The switch that used to hold this branch is deliberately pure (no hooks, no
// state — see its own header), and a gallery/table toggle needs a piece of
// state to live somewhere. Every other module that needed one already solved
// it the same way: its own component (`contacts-screen.tsx`,
// `processes-screen.tsx`, `stories-screen.tsx`, …), never a hook smuggled into
// the switch. This is that file, one module along.
//
// ── THE GALLERY IS NOT THE KIT'S `Gallery` COMPOSITION ────────────────────────
//
// `components/gallery` (the engine's `display: "gallery"` path,
// `screen-renderer.tsx`) is image-led: a 16:9 tile, a soft-paper title when
// there is no picture, and no second slot for anything else. Its own header
// names the reason it is wrong here, by name: *"Offered only where images
// exist… It is never offered for tickets, accounts or sprints — an image-led
// view of text records is a grid of empty boxes pretending to be content."*
// It also has no slot at all for the account manager's avatar chip the client
// asked for, and extending it would mean hand-editing the vendored,
// hash-pinned kit (R39) — out of reach here regardless of the brief.
//
// So the wall below reuses `CardGrid` and `RecordMark` — the SAME two
// primitives `members-gallery.tsx` already composes into "a wall of record
// cards" (her own words for that screen, approved 2026-09-09), which is
// exactly what she is asking for again here. Not a second grid mechanism: the
// same `CardGrid` the Members wall and the Knowledge sources wall already
// draw, wrapped in the SAME `CollectionFrame` seam `RecordTable` already wraps
// the table in two lines down — so the gallery and the table are two bodies
// of one composition, not two different kinds of thing.
//
// ── ALL THREE FACETS ARE REAL DOOR FILTERS NOW ────────────────────────────────
//
// She asked for three: account manager, country, status. All three are wired
// as `<PagedFind>` facets below, and all three are the DOOR's — never a
// client-side narrowing of the loaded page (`collection-filters.ts`'s own
// header spends its whole length on why that would quietly answer the wrong
// question — "the companies among the newest fifty" — and this app has
// already shipped and fixed that exact bug once, the knowledge base's "2 of
// 52" report).
//
// Status was always `AccountFilters.archived`. Account manager and country
// were flagged rather than faked here (14 Sep 2026) because the door did not
// parse them yet — `workers/tenancy/src/lib/accounts.ts`'s `AccountFilters`
// gained `manager` and `country` the same day, closing the gap: `accountsWhere`
// now carries two more `WHERE` clauses through the same bound-parameter path
// every other filter uses, the list stays paged and bounded exactly as before
// (R14), and `workers/tenancy/test/accounts.test.ts` (`filtering by account
// manager and country`) locks the contract, including the one asymmetry
// between the two — see the next paragraph.
//
// MANAGER IS A ROW FACET, its options built below from `assignableMembers`,
// the same staff picker the account FORM's own manager field already uses
// (R35: every option carries its face). It is also the one facet on this
// screen a PORTAL caller must not get a real answer from: `toAccount` already
// nulls `accountManagerId` on the way out to a client login (0091's own
// header, "our own staffing decision about them, not theirs to read"), and a
// WHERE clause that still narrowed by it would let the same caller learn the
// same fact by ABSENCE instead of by value — probe two ids, watch which one
// keeps an account in the page. So `accountsWhere` drops the filter outright
// for a portal scope; the CONTROL still renders here (this screen has no
// portal-only branch to hide it behind, and the agency side always answers
// for real), the DOOR is what refuses to answer for a client login (R21).
//
// COUNTRY is a row facet too, but for a duller reason: it is a per-team
// vocabulary (`shared/selectable-groups.ts`'s "Country"), a closed set in DATA
// rather than in CODE, so — like `helpType` on the tickets screen —
// `collection-filters.ts` cannot spell its options and this screen fills them
// in, from the SAME "selectable:all" cache the account form already reads
// (R56: one door, whichever screen asks first).

import * as React from "react"

import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Plus, SquaresFour, Table as TableIcon } from "@shared/ui/foundations/icons"

import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import {
  CollectionCreateActionProvider,
  CollectionFrame,
} from "@shared/web/screen-engine/collection-frame"
import type { CollectionConfig } from "@shared/web/screen-engine/config"
import type { ScreenActionContext, ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import { RecordMark } from "@shared/web/record-mark"
import { useCached } from "@shared/web/store"
import { sortedOptions } from "@shared/web/sorted-options"
import type { Language } from "@shared/i18n"

import { CollectionHeading } from "@/components/records/collection-heading"
import { CountedAbove } from "@/components/records/counted-tabs"
import { CollectionCard, AddButton } from "@/components/deep-link/screen-bits"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { InAppLink } from "@/components/shell/in-app-link"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind } from "@/components/records/paged-find"
import { RecordTable, visibleActions, type TableColumn } from "@/components/records/record-table"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import { shapeAccountsList } from "@/components/deep-link/shape"
import { assignableMembers } from "@/lib/members"
import { withDataDrivenCollection } from "@/lib/screens"
import { formatCount } from "@shared/web/format-count"
import { accountsKey } from "@/lib/live-resources"
import { tenancy } from "@/lib/api"
import type { Can } from "@/lib/perms"
import type { Account, TeamMember } from "@shared/types"

type Translate = (english: string) => string

/** One shaped accounts row, read by BOTH bodies below — `shapeAccountsList`'s
 * own contract (`web/components/deep-link/shape.tsx`). The `Record<string,
 * unknown>` intersection is what lets `RecordTable`'s own `T extends
 * TableRowData` accept this shape without a second, looser cast at every call
 * site; the named fields are what keep a typo here a compile error rather
 * than a silent `undefined`. */
type ShapedAccountRow = Record<string, unknown> & {
  id: string
  name: React.ReactNode
  nameText: string
  status: React.ReactNode
  manager: React.ReactNode
  country: string
  logoUrl: string | null
}

/** THE CARD'S FLOOR — reused from `members-gallery.tsx`'s own measured 12rem
 * rather than re-measured here: the two cards are the same CLASS (a mark, a
 * name, one chip line under it), so the widest line on one is the widest kind
 * of line on the other. See that file's header for the arithmetic. */
const GALLERY_MIN_CARD = "12rem"

/** THE WALL — a `RecordMark` face, the name, and the account manager's avatar
 * chip (R35: a record never appears without its face; `shapeAccountsList`
 * already built the manager chip, reused as-is rather than redrawn).
 *
 * Wrapped in `CollectionFrame` for the SAME reason `RecordTable` (two exports
 * down) is: the one empty register (R62), fed by `CollectionCreateActionProvider`
 * above it, rather than a bespoke zero-state this file would have to keep in
 * step with the table's.
 *
 * A LOWERCASE FUNCTION, DELIBERATELY, NOT A SECOND COMPONENT — R48's own wall
 * census (`web/test/rules.test.ts`, `recordWalls()`) attributes a `<CardGrid>`
 * to its nearest CAPITALISED enclosing function, which is how it tells a wall
 * that searches from one that does not: a search box in a sibling component
 * is invisible to it by construction. This wall genuinely IS searched — by
 * `AccountsScreen`'s own `<PagedFind>`, and it genuinely DOES page, through
 * that same screen's `<LoadMore>` — so the honest fix is to stay inside
 * `AccountsScreen`'s own function room (this is called as a plain function,
 * not rendered as a `<Tag>`), not to claim a `TOOLBAR_EXEMPT` line the census
 * itself refuses to a paging collection ("a search box over a handful of rows
 * … is false the moment the handful is a page of something larger"). */
function accountGalleryBody({
  teamId,
  rows,
  config,
  narrowedOutside,
  t,
}: {
  teamId: string
  rows: ShapedAccountRow[]
  config: CollectionConfig
  narrowedOutside?: boolean
  t: Translate
}): React.ReactNode {
  return (
    <CollectionFrame
      config={config}
      data={rows}
      // INERT ON A PAGED COLLECTION — `config.searchable` is false (R14), so
      // the frame's own in-memory match never runs; required all the same,
      // the same way `RecordTable`'s own `searchKeys` is (record-table.tsx).
      searchKeys={["name"]}
      memoryKey="accounts-gallery"
      narrowedOutside={narrowedOutside}
      renderItems={(page) => (
        <CardGrid
          fluid
          minItemWidth={GALLERY_MIN_CARD}
          label={t("Accounts")}
          empty={page.length === 0}
        >
          {page.map((row) => (
            <Card key={row.id} variant="raised" className="hover:bg-accent motion-hover">
              {/* A REAL ANCHOR (R37) — the same shape `members-gallery.tsx`
                  draws for its own card wall: middle-click, copy-address and a
                  screen reader's link list all work, and only the plain left
                  click is intercepted into the shell. */}
              <InAppLink href={`/t/${teamId}/accounts/${row.id}`} className="block">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  {/* THE BIG FACE — `size="band"`, not `row.mark` (that node is
                      sized for a list's leading slot). Square by default
                      (R35/R60): every account is a rounded square, sole
                      traders included, and the picture fills the box. Most
                      accounts hold none, so this reads as an initial tile far
                      more often than a logo — same honesty the table's own
                      column carries. */}
                  <RecordMark picture={row.logoUrl} name={row.nameText} size="band" />
                  <CardTitle className="text-sm">{row.nameText}</CardTitle>
                  {/* W2: a card hides an empty field; a table cell keeps its column */}
                  {row.manager}
                </CardContent>
              </InAppLink>
            </Card>
          ))}
        </CardGrid>
      )}
    />
  )
}

/** THE TABLE'S FOUR COLUMNS, in her order: "in the table columns: name status,
 * account manager, country." Only Name sorts — `ACCOUNT_SORTS`
 * (`workers/tenancy/src/lib/accounts.ts`) has no `status`/`manager`/`country`
 * key, and a header the door cannot answer draws a plain header rather than a
 * lit arrow over rows that never move (`record-table.tsx`'s own argument,
 * `contacts-screen.tsx`'s identical column-header shape one screen over). */
function accountTableColumns(t: Translate): TableColumn[] {
  const nameSort = COLLECTION_SORTS.accounts.options.find((o) => o.value === "name")
  return [
    {
      key: "name",
      label: t("Name"),
      sort: nameSort?.value,
      defaultDir: nameSort?.defaultDir,
      // Search on nameText, not on the rendered JSX node. The shaper builds
      // the mark+name JSX in the `name` field and keeps the plain text in
      // `nameText` for search and sort.
      searchKey: "nameText" as const,
    },
    { key: "status", label: t("Status") },
    {
      key: "manager",
      label: t("Account manager"),
      render: (v) => v == null ? "—" : undefined
    },
    { key: "country", label: t("Country") },
  ]
}

export function AccountsScreen({
  teamId,
  t,
  lang,
  go,
  sectionPath,
  tab,
  accountsQ,
  membersQ,
  total,
  entityTotal,
  recipe,
  rights,
  can,
  onAction,
  onIntent,
}: {
  teamId: string
  t: Translate
  lang: Language
  go: (path: string, q?: Record<string, string>) => void
  sectionPath: string
  /** `ctx.query.tab` — Companies/All, exactly as today. */
  tab: string | undefined
  accountsQ: { data: Account[] | undefined; error: unknown }
  /** the cached members list the account-manager chip resolves off (R56). */
  membersQ: { data: TeamMember[] | undefined }
  /** the exact server totals (R16) — every account, and companies alone. */
  total: number | undefined
  entityTotal: number | undefined
  recipe: ScreenRecipe
  rights: ScreenRights
  can: Can
  onAction: (actionId: string, ctx: ScreenActionContext) => void
  onIntent: (intent: ScreenIntent) => void
}) {
  // THE ONE PIECE OF STATE THIS SWITCH BRANCH COULD NOT HOLD — R53's `view`
  // slot, gallery first ("the one on first load" — her ruling names no other
  // order). Local, like `ctx.knowledgeView`/`ctx.taskView` one module over,
  // except owned by this component instead of the host: nothing else on the
  // app needs to know which body the accounts screen is showing.
  const [view, setView] = React.useState<"gallery" | "table">("gallery")

  // THE COUNTRY FACET'S OPTIONS — the team's own "Country" vocabulary
  // (`shared/selectable-groups.ts`), read through the SAME "selectable:all"
  // cache key `account-form-dialog.tsx` already reads (R56: one door, once —
  // opening the filter panel costs nothing if the account form has already
  // primed this cache this session, and vice versa). Unconditional (not
  // gated behind a dialog's `open`, the way the form gates it): this screen is
  // mounted for as long as Accounts is, so there is no "closed" state to save
  // a fetch against.
  const vocabularyQ = useCached("selectable:all", () => tenancy.selectable().then((r) => r.values))

  if (accountsQ.error) return <Skeleton variant="list" lines={4} />
  const loaded = accountsQ.data === undefined ? null : accountsQ.data

  const accountTab = tab === "all" ? "all" : "companies"
  const accountsBadge = formatCount(total)
  const accountTabs = [
    {
      value: "companies",
      label: t("Companies"),
      icon: "building",
      badge: formatCount(entityTotal),
      badgeVariant: "" as const,
    },
    { value: "all", label: t("All"), icon: "users", badge: accountsBadge, badgeVariant: "" as const },
  ]
  const canCreateAccount = can("accounts", "create")

  // THE ACCOUNT MANAGER FACET'S OPTIONS — `assignableMembers(membersQ.data)`,
  // already computed above for the table/gallery's own manager chip, so this
  // is the SAME cached members read (R56) and not a second fetch. Each option
  // carries its face (R35), the identical `<RecordMark … shape="round">` the
  // form's own manager picker and the table's own manager cell already draw.
  // `sortedOptions` here matches the form's own manager picker (R75); the
  // central facet seam (`filter-bar.tsx`'s `optionsFor`) sorts it again at
  // render regardless, so a caller of `translatedFacets` never has to rely on
  // this array's own order — it is done for clarity, not because it is load-
  // bearing.
  const managerOptions = sortedOptions(assignableMembers(membersQ.data), lang, (m) => m.name).map((m) => ({
    value: m.id,
    label: m.name,
    mark: <RecordMark picture={m.photo} name={m.name} shape="round" />,
  }))
  // THE COUNTRY FACET'S OPTIONS — the same "Country" group the account form's
  // own picker offers (`account-form-dialog.tsx`'s `group("Country")`),
  // active values only.
  const countryOptions = sortedOptions(
    (vocabularyQ.data ?? []).filter((v) => v.type === "Country" && v.active),
    lang,
    (v) => v.value
  ).map((v) => ({ value: v.value, label: v.value }))

  return (
    <CountedAbove active={accountsBadge !== ""}>
      <div className="flex flex-col gap-4">
        <CollectionHeading sectionKey="accounts" total={total} action={<ModuleSettingsGear teamId={teamId} segment="accounts" />} />
        <PagedFind<Account>
          listKey={accountsKey(teamId)}
          placeholder={t("Search accounts…")}
          matches={{
            none: t("No accounts match"),
            one: t("1 account matches"),
            many: t("{count} accounts match"),
          }}
          // SORT BY NAME — her ruling, verbatim. A single field with the
          // direction toggle `SortControl` always draws beside it is still a
          // real choice between two orders (the identical shape
          // `members-gallery.tsx` carries, and its own header has the
          // argument for why one field is not an empty control). Local to
          // THIS screen: `COLLECTION_SORTS.accounts.defaultSort` stays
          // "created" for Contacts, one file over, which was not asked to
          // change.
          sorts={translatedSorts("accounts", t).filter((o) => o.value === "name")}
          defaultSort="name"
          restingEmpty={loaded !== null && loaded.length === 0}
          restingLoading={loaded === null}
          fixed={accountTab === "all" ? undefined : { type: "entity" }}
          facets={translatedFacets("accounts", t, { manager: managerOptions, country: countryOptions })}
          fetchPage={(query, cursor) =>
            tenancy
              .accounts({ ...query, cursor })
              .then((r) => ({ rows: r.accounts, nextCursor: r.nextCursor, total: r.total }))
          }
          tabs={{
            config: { ...defaultTabsConfig, tabs: accountTabs },
            value: accountTab,
            onValueChange: (v) => go(sectionPath, v === "companies" ? {} : { tab: v }),
          }}
          view={{
            views: [
              { value: "gallery", label: t("Gallery"), icon: <SquaresFour className="size-4" /> },
              { value: "table", label: t("Table"), icon: <TableIcon className="size-4" /> },
            ],
            value: view,
            onValueChange: (v) => setView(v === "table" ? "table" : "gallery"),
          }}
          actions={() => (
            <>
              {canCreateAccount && (
                <AddButton
                  label={t("New account")}
                  onClick={() => go(sectionPath, { panel: "add", module: "accounts" })}
                />
              )}
            </>
          )}
          wrap={(inner) => <CollectionCard>{inner}</CollectionCard>}
        >
          {(found) => {
            const rows = found.active ? found.rows : loaded
            if (rows === null) return <Skeleton variant="list" lines={4} />
            // 0091 — off the SAME cached members list every picker in the app
            // already reads (R56: no second fetch for the manager column).
            const data = shapeAccountsList(rows, true, assignableMembers(membersQ.data), lang)
            const shaped = (data.rows ?? []) as unknown as ShapedAccountRow[]
            // R62 — the frame draws both zeros from one register and chooses
            // its words off `narrowedOutside`, the same seam the table below
            // and the gallery above both read `config` from.
            const tunedRecipe = withDataDrivenCollection(recipe, shaped)
            const config = tunedRecipe.collection as CollectionConfig
            return (
              <CollectionCreateActionProvider
                action={
                  canCreateAccount
                    ? {
                        label: t("New account"),
                        icon: <Plus className="size-4" />,
                        onCreate: () => go(sectionPath, { panel: "add", module: "accounts" }),
                      }
                    : null
                }
              >
                {view === "table" ? (
                  <RecordTable
                    columns={accountTableColumns(t)}
                    rows={shaped}
                    config={config}
                    order={found.order}
                    actions={visibleActions(tunedRecipe, rights, onAction)}
                    narrowedOutside={found.active}
                    onRowClick={(row) => onIntent({ kind: "open", module: "accounts", id: String(row.id) })}
                  />
                ) : (
                  accountGalleryBody({
                    teamId,
                    rows: shaped,
                    config,
                    narrowedOutside: found.active,
                    t,
                  })
                )}
                <LoadMore
                  listKey={found.listKey ?? accountsKey(teamId)}
                  label={t("Load more accounts")}
                  fetchPage={found.fetchPage}
                />
              </CollectionCreateActionProvider>
            )
          }}
        </PagedFind>
      </div>
    </CountedAbove>
  )
}
