"use client"

// ACCOUNTS MAIN — the client's ruling, 14 Sep 2026, verbatim: "for accounts
// main: use gallery and add table as alternate view. filter by account
// manager, country, status. sort by name - in the table columns: name status,
// account manager, country." Five decisions, and this file is where all five
// land.
//
// THE SECOND BODY IS "LIST" NOW, NOT "TABLE" — R80, the client's own
// follow-up ruling one day later, 15 Sep 2026, verbatim: "On accounts, I
// want the views to be gallery and list. I don't like this table anywhere,
// so anywhere in the app where you have it, replace it with list. I don't
// want to say this again." Nothing about the 14 Sep brief changed underneath
// it — same second body, same `<RecordTable>`, same four columns, same three
// facets — what changed is the SHAPE that component draws (see
// `record-table.tsx`'s own header) and the word this screen's view switch
// puts on it, matched to Tickets' own list icon and label.
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
//
// ── A THIRD VIEW, MAP, ON ACTIVE ONLY — Aurora's ruling, 23 Sep 2026, verbatim:
// "for accounts/active add a map view." The kit's `Map`
// (`shared/ui/components/map/map.tsx`) had zero direct call sites before this;
// its own header is emphatic about what it does and does not draw (no tiles,
// no projection — the APPLICATION hands it pins at an `x`/`y` PERCENTAGE across
// a muted plate, "DATA, not a design value"), and it is followed to the letter
// here rather than reinvented: the list stays beside the plate always, an
// account this screen cannot place is counted in words under the list rather
// than dropped, and the plate demotes to a header strip below 720px — all of
// that is the kit's own law, not this file's. WHAT TURNS A COUNTRY INTO A
// POSITION lives in `./country-centroids.ts`: a small, hand-kept table of
// country centroids (not fetched, not guessed from the free-text address —
// see that file's own header for the honest argument), and `./account-map.ts`
// is the pure function that turns a page of accounts into the plate's pins
// and the list's rows, one pin per account (several accounts sharing a
// country stand in a small ring around it, never folded into one pin — see
// that file's header). ONLY OFFERED ON THE ACTIVE TAB, her own word: her
// ruling names "accounts/active" and not the other three, and the map has
// never been asked to draw a mix of active/inactive/archived pins together —
// so `accountTab === "active"` below is what decides whether "map" is even
// among the choices `<PagedFind>`'s own `view` slot offers, and a reader who
// had it open and then switches tab falls back to gallery rather than the
// view switch pointing at an option that is no longer on the list.
//
// ── A REAL GOOGLE MAP, NOT THE KIT'S PLATE — Aurora's ruling, 23 Sep 2026 ────
//
// Her review of the map view above, verbatim: "ok but, there's no actual map
// lol, how do we get a google map there? remove the side panel, when i click
// in one i want a slight little overlay card with name and loogo and full
// adress (including ountry) then if i click there it takes me to detail
// screen." And, choosing between the options laid out for her: "build with
// the google maps api." The kit's own `Map` (quoted above) still supplies
// the loading/error/empty chrome and the plate's own frame — R39 — but its
// `pins`/`items`/`missingLabel` percentage-plate contract is gone from this
// screen: `google-account-map.tsx`'s `<GoogleAccountsMap>` is the
// application's own renderer, handed to the kit's `children` slot exactly as
// that component's header anticipates, and it draws a real, pannable Google
// Map with a marker per account. THE LIST IS GONE (her own words, "remove
// the side panel") — `mapPlacement.pins` still carries every placeable
// account and `mapPlacement.missingCount` still carries an honest count of
// who is not, but there is no second `items` array beside it any more, and
// nothing here builds one. `account-map.ts`'s own header has the full
// account of what turns an address into a position (a geocoded `lat`/`lng`
// when one is stored, the same country-centroid fallback as before when it
// is not) and exactly where that stops at an unminted migration.
//
// ── THE STRIP BECOMES STATUS, 16 SEP 2026 — "keep active, inactive, and all" ─
//
// Second client ruling, same evening as the Settings › Team split above it in
// this session, verbatim: "For account status, let's keep active, inactive,
// and all." Companies · All — the ENTITY-TYPE strip the 14 Sep brief above
// built — is retired outright and replaced by a STATUS strip: Active ·
// Inactive · All, in that order, default tab Active. None of the three new
// tabs sends its own `type` — but that no longer means untyped: since her
// 20 Sep 2026 ruling ("a person is a contact; the Accounts screen lists
// COMPANIES"), the door itself (`accountsWhere`,
// `workers/tenancy/src/lib/accounts.ts`) narrows an untyped read to
// `account_type = 'entity'`, so Active/Inactive/All show companies only —
// linked or standalone, no individual rides any of the three. The
// type-vs-status distinction the old strip drew is gone from this screen's
// TABS; it is answered one layer down instead, once, for every tab here.
//
// THE STATUS FACET GOES, THE TABS REPLACE IT — her own words, parenthetical
// but exact: "(the status filter goes, the tabs replace it)". The "Status"
// facet (`{ field: "archived", label: "Status", options: ACCOUNT_STATUS }`,
// `web/lib/collection-filters.ts`) is NOT this lane's to edit —
// `collection-filters.ts` is outside settings-screen.tsx/accounts-screen.tsx/
// pages.ts/screens.ts, the only files this lane owns — so it is dropped at
// THIS screen's own call site instead, by filtering `translatedFacets`'
// return array for `field !== "archived"` before it reaches `<PagedFind>`.
// The declaration itself still exists in that file and is now unreferenced by
// this screen; a lane that owns collection-filters.ts can delete the
// now-dead `{ field: "archived", … }` entry and, if nothing else reads it,
// `ACCOUNT_STATUS` beside it.
//
// MANAGER AND COUNTRY STAY — her own words: "filters manager and country
// stay". Neither changes shape; only Status leaves the facet list.
//
// THREE EXACT COUNTS (R16), NOT TWO. The door already returns an exact
// `total` for whatever query was actually asked (`listAccounts`'s own
// `counted`, `workers/tenancy/src/lib/accounts.ts`) — which is what "All"
// badges, unconditionally, exactly as it always did (the `total` prop this
// screen already received). Active and Inactive need a total EACH, badged
// simultaneously, on tabs somebody may not have pressed yet — the same "two
// tab badges, and they are a different question from `total`" argument that
// door file makes for `entityTotal`/`individualTotal` beside the rows. Rather
// than asking `workers/tenancy/src/lib/accounts.ts` (a worker file, also
// outside this lane's four owned files) to grow a THIRD always-computed
// total, this screen asks the SAME `tenancy.accounts()` door a second time,
// with `archived: "yes"` and nothing else narrowing it, and reads that
// response's own exact `total` (`inactiveTotalQ`, below) — the identical
// `AccountFilters.archived` parameter the retired Status facet used to send,
// just asked once, unconditionally, rather than only when a reader had
// picked "Archived" from a dropdown. Active is DERIVED — `total -
// inactiveTotal` — rather than a third door call: every NON-ARCHIVED account
// is exactly one of the two (deactivate, never delete — there is no third
// pile AMONG THEM), so the arithmetic is exact whenever both operands are,
// and a caller who wants to audit the assumption can watch the two badges
// sum to All's own.
//
// AMENDED 22 Sep 2026 (0117) — FOUR COUNTS NOW, NOT THREE, and the sentence
// above is HISTORY: the wire word this screen sent for the Inactive tab's own
// total was `archived` until this same round, renamed to `inactive` the
// instant `archived` gained a real, stronger meaning of its own (her ruling,
// "archived is different than inactive"). A fourth badge, `archivedTotalQ`,
// asks the identical door a THIRD time, `{ archived: "yes" }`, for her new
// state's own tab — and "Active + Inactive = All" above is now true only
// because `total` (All) and `inactiveTotal` both exclude an archived row by
// the door's own default (`accountsWhere`'s unconditional `archived_at IS
// NULL` unless asked otherwise); an archived account is never a silent
// fourth summand hiding inside either operand.

import * as React from "react"

import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Plus, SquaresFour, ListBullets, MapTrifold } from "@shared/ui/foundations/icons"

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
import { accountsKey, totalKey } from "@/lib/live-resources"
import { tenancy } from "@/lib/api"
import type { Can } from "@/lib/perms"
import type { Account, TeamMember } from "@shared/types"
import type { Vars } from "@shared/i18n"
import { placeAccountsOnMap } from "@/components/accounts/account-map"
import { GoogleAccountsMap } from "@/components/accounts/google-account-map"

// `vars?` widened in, matching `contacts-screen.tsx`'s own `Translate` one
// module over — needed here now because the map view's missing-count
// sentence (below) carries a `{count}` hole, the same shape `t()` already
// takes at every OTHER call site in this app (`shared/i18n.ts`'s `translate`);
// this file's own narrower alias had just never asked for the second
// argument before.
type Translate = (english: string, vars?: Vars) => string

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
            <Card key={row.id} variant="default" className="hover:bg-accent motion-hover">
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
  /** `ctx.query.tab` — Active/Inactive/All since 16 Sep 2026 (this file's own
   * header, "THE STRIP BECOMES STATUS"), replacing the retired Companies/All
   * entity-type pair. Anything else (unset, or the retired `"companies"`
   * value an old link might still carry) falls through to "active" — the
   * client's own default. */
  tab: string | undefined
  accountsQ: { data: Account[] | undefined; error: unknown }
  /** the cached members list the account-manager chip resolves off (R56). */
  membersQ: { data: TeamMember[] | undefined }
  /** the exact server total (R16) for EVERY account, any status, any type —
   * what "All" badges, unconditionally. Active/Inactive get their own exact
   * totals from `inactiveTotalQ` below rather than a second prop, so this
   * screen owns fetching them rather than asking its caller (outside this
   * lane's four owned files) to grow a matching pair. */
  total: number | undefined
  /** THE RETIRED COMPANIES/ALL STRIP'S OWN COUNT — still sent by this
   * screen's one caller (`web/components/deep-link/collection-content.tsx`,
   * outside this lane's four owned files: settings-screen.tsx,
   * accounts-screen.tsx, pages.ts, screens.ts), still typed here so that
   * caller keeps compiling, no longer READ anywhere below since the
   * 16 Sep 2026 status-tab ruling retired the entity-type strip this number
   * used to badge. A lane that owns collection-content.tsx (and the
   * `totals.accountsEntity` it reads off `web/lib/live-resources.ts`) can
   * drop the prop and its door-side companion once nothing types against it. */
  entityTotal?: number | undefined
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
  //
  // NOTHING PERSISTS ACROSS A REMOUNT, "map" INCLUDED — this was already true
  // of gallery/list and stays true rather than growing a store this screen
  // did not have before: leave Accounts for another module and come back, or
  // reload, and the switch reads "gallery" again, her own first-load default.
  // WITHIN one mount it is ordinary React state, so switching tabs and back
  // (see `effectiveView` below) does remember which body was picked.
  const [view, setView] = React.useState<"gallery" | "list" | "map">("gallery")

  // THE COUNTRY FACET'S OPTIONS — the team's own "Country" vocabulary
  // (`shared/selectable-groups.ts`), read through the SAME "selectable:all"
  // cache key `account-form-dialog.tsx` already reads (R56: one door, once —
  // opening the filter panel costs nothing if the account form has already
  // primed this cache this session, and vice versa). Unconditional (not
  // gated behind a dialog's `open`, the way the form gates it): this screen is
  // mounted for as long as Accounts is, so there is no "closed" state to save
  // a fetch against.
  const vocabularyQ = useCached("selectable:all", () => tenancy.selectable().then((r) => r.values))

  // THE INACTIVE TAB'S OWN EXACT COUNT (R16) — the door's own `total` for a
  // read narrowed to `inactive: "yes"` and nothing else, the SAME parameter
  // (and the same exactness) the retired Status facet used to send, just
  // asked unconditionally rather than only behind an opened dropdown. Cached
  // by team (R56: one door, once — a tab switch never re-asks this), off
  // `totalKey` (`web/lib/live-resources.ts`) so this reads the app's own
  // naming convention for a collection's supplementary total rather than a
  // one-off string. See this file's header, "THREE EXACT COUNTS (R16), NOT
  // TWO", for why this is a client-side fetch rather than a third
  // always-computed field on the door's own response.
  //
  // RENAMED FROM `archived` TO `inactive` (0117, 22 Sep 2026) — the wire word
  // this door answered to until the same day a real, stronger `archived`
  // state joined `AccountFilters`. The door's default (no `archived` sent)
  // already excludes that new state, so this total still counts exactly the
  // inactive pile, never an archived row riding along uncounted.
  const inactiveTotalQ = useCached(totalKey("accounts-inactive", teamId), () =>
    tenancy.accounts({ inactive: "yes" }).then((r) => r.total)
  )
  // THE ARCHIVED TAB'S OWN EXACT COUNT (R16, 0117) — the identical pattern
  // beside it: the door's own `total` for a read narrowed to `archived:
  // "yes"` and nothing else, her stronger, second put-away state. A second
  // client-side fetch rather than a fourth always-computed field on the
  // door's own response, for the same reason `inactiveTotalQ` is one and not
  // a third — see this file's header.
  const archivedTotalQ = useCached(totalKey("accounts-archived", teamId), () =>
    tenancy.accounts({ archived: "yes" }).then((r) => r.total)
  )
  // ACTIVE IS DERIVED, NOT FETCHED — `total` (every account, unconditional —
  // and, since 0117, never an archived one either, the door's own default)
  // minus the inactive count above. Every NON-ARCHIVED account is exactly
  // one of the two (deactivate, never delete: there is no third pile among
  // them), so this is exact whenever both operands have loaded, and it costs
  // no third door read.
  const activeTotal =
    total !== undefined && inactiveTotalQ.data !== undefined ? total - inactiveTotalQ.data : undefined

  if (accountsQ.error) return <Skeleton variant="list" lines={4} />
  const loaded = accountsQ.data === undefined ? null : accountsQ.data

  // ACTIVE · INACTIVE · ARCHIVED · ALL, BY STATUS — client ruling, 16 Sep
  // 2026, verbatim: "For account status, let's keep active, inactive, and
  // all." Replaced the entity-type Companies/All pair (this file's header
  // has the whole account). DEFAULT "active" — her own word — so anything
  // else unrecognised (unset, or a bookmark still carrying the retired
  // `?tab=companies`) falls through to it rather than to a value this strip
  // no longer offers.
  //
  // ARCHIVED JOINS THE STRIP (0117, 22 Sep 2026) — "Give the new state a
  // door and a way back, matching how the existing one is offered": Inactive
  // already has its own tab, excluded from every other tab and from every
  // picker; Archived gets the identical shape, one notch stronger — also
  // excluded from All (the door's own default, `AccountFilters.archived`
  // unset), which Inactive is NOT. This is the one place in the app an
  // archived account is ever listed, and the one door back to it.
  const accountTab =
    tab === "archived" ? "archived" : tab === "all" ? "all" : tab === "inactive" ? "inactive" : "active"

  // MAP, ACTIVE ONLY — her ruling names "accounts/active", not the other
  // three tabs, and the map has never been asked to draw inactive/archived
  // pins beside active ones. DERIVED rather than a second piece of state: a
  // reader who picked "map" and then switched to Inactive sees gallery (the
  // switch itself only ever OFFERS map on Active, below), and switching back
  // to Active without a remount reads `view` unchanged and draws the map
  // again — no effect, no stale flag to reset, just what the tab allows this
  // render.
  const showMapView = accountTab === "active"
  const effectiveView = view === "map" && !showMapView ? "gallery" : view

  // THE MAP'S OWN SCRIPT URL — asked for only when the map is actually the
  // body on screen (the same "don't build what nobody reads" the table/
  // gallery split and `mapPlacement` below already keep), and cached under a
  // fixed key rather than one keyed by team: `GOOGLE_MAPS_BROWSER_KEY` is a
  // per-DEPLOY setting (`workers/tenancy/src/env.ts`), not a per-team one, so
  // every team asks the identical question and the one cache entry serves
  // them all (R56). `undefined` while this hook has not resolved yet reads as
  // "still asking" to `<GoogleAccountsMap>`; `{ scriptUrl: null }` once
  // resolved and the key is unset reads as "nothing to connect" — the map's
  // own honest empty register, never a broken plate.
  const mapsConfigQ = useCached(effectiveView === "map" ? "maps-config" : null, () =>
    tenancy.mapsConfig()
  )

  const accountsBadge = formatCount(total)
  const accountTabs = [
    {
      value: "active",
      label: t("Active"),
      // `TAB_ICONS["active"]`/`["inactive"]` (shared/web/screen-engine/
      // tabs-view.tsx: "check-circle" / "prohibit") already resolve these two
      // values and that table wins over anything a call site passes — the
      // same "spelled out anyway so the two agree on the page rather than by
      // accident" the Modules/Automations tabs in settings-screen.tsx keep
      // for their own already-resolved glyphs. `apps-screen.tsx`'s own
      // Active/Inactive pair spells the identical two values the same way.
      icon: "check-circle",
      badge: formatCount(activeTotal),
      badgeVariant: "" as const,
    },
    {
      value: "inactive",
      label: t("Inactive"),
      icon: "prohibit",
      badge: formatCount(inactiveTotalQ.data),
      badgeVariant: "" as const,
    },
    // ARCHIVED — her stronger state, its own tab, its own exact count
    // (0117). `TAB_ICONS["archived"]` already resolves to `"archive"`
    // (shared/web/screen-engine/tabs-view.tsx) — spelled out here anyway so
    // the two agree on the page rather than by accident, the same reason
    // Active/Inactive above spell theirs.
    {
      value: "archived",
      label: t("Archived"),
      icon: "archive",
      badge: formatCount(archivedTotalQ.data),
      badgeVariant: "" as const,
    },
    { value: "all", label: t("All"), icon: "asterisk", badge: accountsBadge, badgeVariant: "" as const },
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
      {/* --heading-strip-gap (web/app/globals.css), 16px - was already this
          screen's own number; Aurora's 22 Sep 2026 "too much space above the
          folder tabs" ruling made it the app-wide token rather than a literal
          this screen happened to already agree with. */}
      <div className="flex flex-col gap-[var(--heading-strip-gap)]">
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
          // BY STATUS, NOT BY TYPE — `inactive` replaces the retired
          // `{ type: "entity" }` Companies narrowing; "all" fixes nothing, as
          // it always did (and, since 0117, still never an archived row —
          // the door's own default). `AccountFilters.inactive`
          // (`workers/tenancy/src/lib/accounts.ts`) is the same "yes"/"no"
          // pair the retired Status facet sent, renamed from `archived` the
          // same round a real, stronger `archived` gained its own tab below
          // — this screen still asks the door the identical question, only
          // from the tab strip's own fixed narrowing now rather than from an
          // open-ended filter control. THE ARCHIVED TAB sends `archived:
          // "yes"` instead and nothing else, her second and stronger state
          // (0117) — its own pile, not a slice of Active/Inactive/All.
          fixed={
            accountTab === "all"
              ? undefined
              : accountTab === "archived"
                ? { archived: "yes" }
                : { inactive: accountTab === "inactive" ? "yes" : "no" }
          }
          // THE STATUS FACET IS GONE HERE, THE TABS REPLACE IT — her own
          // parenthetical, verbatim, next to the status-tab ruling above. The
          // declaration (`{ field: "inactive", … }`,
          // `web/lib/collection-filters.ts`) is not dropped at its source —
          // that file is outside this lane's four owned files — so it is
          // filtered out of `translatedFacets`' own return array at THIS call
          // site instead: manager and country pass through untouched (her
          // own "filters manager and country stay"), inactive never reaches
          // `<PagedFind>`'s facet row. (Archived, her stronger state, was
          // never a facet at all — see the header above.)
          facets={translatedFacets("accounts", t, { manager: managerOptions, country: countryOptions }).filter(
            (f) => f.field !== "inactive"
          )}
          fetchPage={(query, cursor) =>
            tenancy
              .accounts({ ...query, cursor })
              .then((r) => ({ rows: r.accounts, nextCursor: r.nextCursor, total: r.total }))
          }
          tabs={{
            config: { ...defaultTabsConfig, tabs: accountTabs },
            value: accountTab,
            // "active" IS DEFAULT (her ruling), so a press back onto it omits
            // `tab` from the URL entirely — the same "default tab has no
            // query param" shape the retired Companies tab used, now pointed
            // at the new default instead of the old one.
            onValueChange: (v) => go(sectionPath, v === "active" ? {} : { tab: v }),
          }}
          view={{
            views: [
              { value: "gallery", label: t("Gallery"), icon: <SquaresFour className="size-4" /> },
              // R80 (client, 15 Sep 2026, verbatim): "I don't like this table
              // anywhere, so anywhere in the app where you have it, replace
              // it with list." The second body is still `<RecordTable>` —
              // that draws the list shape unconditionally now — this is only
              // the WORD on the switch and the glyph beside it, matched to
              // Tickets' own list icon (`tickets-collection.tsx`).
              { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
              // THE THIRD BODY, ACTIVE TAB ONLY (her ruling, this file's own
              // header) — spread in rather than a third literal so the array
              // this screen offers and `showMapView` never say two different
              // things about whether "map" is on it.
              ...(showMapView
                ? [{ value: "map", label: t("Map"), icon: <MapTrifold className="size-4" /> }]
                : []),
            ],
            value: effectiveView,
            onValueChange: (v) => setView(v === "list" ? "list" : v === "map" ? "map" : "gallery"),
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
            // THE MAP'S OWN PINS — built off `rows` (the raw `Account[]` page,
            // not `shaped`): `placeAccountsOnMap` (`./account-map.ts`) wants
            // `country`/`logoUrl`/`street`/`postalCode`/`city` off the real
            // row, not the JSX `shaped` has already turned them into.
            // Computed only when the map is actually the body on screen — the
            // same "don't build what nobody reads" the table/gallery split
            // above already keeps.
            const mapPlacement = effectiveView === "map" ? placeAccountsOnMap(rows) : null
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
                {effectiveView === "list" ? (
                  <RecordTable
                    columns={accountTableColumns(t)}
                    rows={shaped}
                    config={config}
                    order={found.order}
                    actions={visibleActions(tunedRecipe, rights, onAction)}
                    narrowedOutside={found.active}
                    onRowClick={(row) => onIntent({ kind: "open", module: "accounts", id: String(row.id) })}
                    rowPath={(row) => `/t/${teamId}/accounts/${row.id}`}
                    rowLabel={(row) => row.nameText}
                  />
                ) : effectiveView === "map" && mapPlacement !== null ? (
                  // A REAL GOOGLE MAP, HER RULING (this file's own header,
                  // "A REAL GOOGLE MAP, NOT THE KIT'S PLATE"). No side list —
                  // `mapPlacement.pins` is the only thing fed in; a marker
                  // click opens the overlay card, and the card's own click
                  // calls the SAME `onIntent` the table's `onRowClick` above
                  // already does — a map pin, like the kit's own, is not a
                  // real anchor (R37 is the table and gallery's law).
                  <GoogleAccountsMap
                    pins={mapPlacement.pins}
                    missingCount={mapPlacement.missingCount}
                    totalCount={mapPlacement.totalCount}
                    scriptUrl={mapsConfigQ.data?.scriptUrl}
                    t={t}
                    onOpenAccount={(id) => onIntent({ kind: "open", module: "accounts", id })}
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
