"use client"

// CONTACTS — every PERSON linked into the customer spine, across every account,
// in one list (client, 31 Aug 2026: "contacts as a real sidebar page, also
// remove the tab from inside accounts"). SAME table, SAME door, SAME
// `contacts:read` gate the Companies/All strip on Accounts already checks —
// this is a second address for rows the app already fetches, not a new
// capability.
//
// ── A TABLE, AND TWO TABS. THE CLIENT'S RULING, 2026-09-09 ───────────────────
//
// She was shown five arrangements of this screen and chose one, in her own
// words: *"for contacts lets do view table, also add column role after
// account"*, and, earlier the same day, *"also tabs here: All, In portal"*.
//
// So: a TABLE, with Role sitting after Account, and a strip of two.
//
// THE COLUMNS ARE THREE, and the census behind that is written out in
// `shapeContactsTable` (deep-link/shape.tsx) rather than here: the mark and the
// name become one column, `under Bergman S.A.` becomes Account, `Person` is
// dropped because it is the same word on every row of a screen whose whole
// question is `type=individual`, and Role is the new one she asked for. N1's
// table budget is six; this spends three and has nothing honest to put in the
// other four.
//
// AN EMPTY ACCOUNT AND AN EMPTY ROLE ARE ORDINARY. On her live team 22 of 110
// contacts sit under no company and 45 carry no role. Both draw an em dash —
// the app's existing word for an absent fact (a ticket with no app on the
// tickets list) — never "None", which reads like an answer, and never a
// warning colour, which would flag two-fifths of the address book as broken.
//
// ── WHAT THE HEADERS DO, AND WHAT THEY DELIBERATELY DO NOT ───────────────────
//
// The list PAGES (R14), so an order is the DOOR's or it is a lie about fifty
// rows under a badge counting 110 — `order={found.order}` is the same handle the
// picker in the toolbar holds, so the two controls are one question
// (record-table.tsx's own header has the whole argument).
//
// ONLY THE FIRST COLUMN SORTS. `ACCOUNT_SORTS` offers name / created / updated /
// code, so `Contact` sends `name` and Account and Role draw PLAIN headers —
// exactly as App and Where do on the meetings table, and for a reason stronger
// than "the door has no name for it":
//
//   • the accounts door is on the CLIENT PORTAL's surface, and `sorting.ts` is
//     explicit that an ordering "can make a hidden VALUE inferable from a
//     position, so a menu on a door the client portal forwards may only name
//     columns that door already hands a client". `companyName` and
//     `relationship` are precisely the two fields `toAccount` withholds from a
//     client login. A `company` sort would hand back through the ORDER what the
//     projection refuses to put in the row.
//   • and `contacts-by-company.tsx` already argued the UX half in 2026: ordering
//     by the parent's id gives contiguity under a control labelled "Company",
//     "which is the kind of order that reads as broken".
//
// A header that cannot order draws no control at all. That is honest; a lit
// arrow over rows that never move is the defect record-table.tsx exists for.
//
// ── HOW "IN PORTAL" IS DERIVED ───────────────────────────────────────────────
//
// At the DOOR, as `portal=yes` (`AccountFilters.portal`), because the arithmetic
// leaves no other honest option: six of 110 contacts can sign in and a page is
// fifty rows, so a tab that filtered the loaded page would show whichever of the
// six happened to land in it, under a badge counting all six. The badge is the
// door's own `individualPortalTotal`, a COUNT(*) over the SAME `WHERE` the tab's
// rows come back through (R16) — primed here off the page this screen already
// fetches rather than read from a second door, so the number and the rows are
// one answer.
//
// SIX ROWS IS THE NORMAL STATE OF THAT TAB, not a fault. Its badge says six
// before it is pressed, so a six-row list under it reads as the answer rather
// than as a list that failed to load — which is exactly why the badge has to be
// exact rather than "50".
//
// ── ITS OWN FILE ─────────────────────────────────────────────────────────────
//
// Not a branch of `collection-content.tsx`'s big switch, because
// `web/test/rules.test.ts`'s "a tab strip is not nested inside another one"
// census counts how many times the TabsView element appears in one FILE, as its
// proxy for "one screen" (the client's ruling: "there can never be 2 rows of
// tabs … just never"). Accounts and Contacts are two screens that happen to
// share one switch statement and are never rendered together, and the census
// cannot tell that from two strips stacked in one file.
//
// A CONTACT'S ROW OPENS THE SAME RECORD IT ALWAYS DID. An individual account is
// one row of the SAME `accounts` table a company is, so `onIntent` (the
// deep-link host, deep-link-screen.tsx) resolves this list's "open" intent to
// `/accounts/<id>` — never a second address for a record that already has one.
//
// ── AND WHAT WENT ────────────────────────────────────────────────────────────
//
// The BY COMPANY tab. It was the 31 Aug arrangement of this screen and she has
// replaced it with a table; two of one collection's arrangements plus her two
// tabs would be a strip of three she did not ask for. `contacts-by-company.tsx`
// is NOT deleted — it is a working component with its own suite, and the
// grouping is the obvious second view if she wants one back — but nothing on a
// screen renders it today, and saying so here is what stops the next reader
// assuming it is live.

import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import { type ScreenActionContext, type ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import type { CollectionConfig } from "@shared/web/screen-engine/config"

import { CollectionHeading } from "@/components/records/collection-heading"
import { CountedAbove } from "@/components/records/counted-tabs"
import { LoadError, CollectionCard } from "@/components/deep-link/screen-bits"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind } from "@/components/records/paged-find"
import { RecordTable, visibleActions, type TableColumn } from "@/components/records/record-table"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import { shapeContactsTable } from "@/components/deep-link/shape"
import { tenancy } from "@/lib/api"
import { accountsKey, totalKey } from "@/lib/live-resources"
import { field, translateFields, withDataDrivenCollection } from "@/lib/screens"
import { formatCount } from "@shared/web/format-count"
import type { Account } from "@shared/types"
import { primeCache, useCachedValue } from "@shared/web/store"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"

/** WHAT THE TABLE SHOWS — her three, in her order ("add column role after
 * account"). The English is the catalogue's key and is translated on the way to
 * the screen by `translateFields`, the same seam the meetings table uses,
 * because these columns are the HOST's and are spread on after `resolveRecipe`
 * has already translated the recipe. */
const CONTACT_COLUMNS = [
  field("person", "Contact"),
  field("account", "Account"),
  field("role", "Role"),
]

/** WHAT THE DOOR CALLS EACH OF THOSE COLUMNS — the same hand-paired translation
 * the meetings table makes between a shaped row's column and the door's menu
 * name, and the same rule about a name the menu does not offer producing no
 * `sort` at all.
 *
 * ONE ENTRY, and the two absences are the decision — see this file's header for
 * why Account and Role must not be orderable on a door the client portal
 * forwards. The `defaultDir` is read off `COLLECTION_SORTS` rather than typed,
 * so a header can never land in a different direction from the picker above it
 * offering the same order. */
const COLUMN_SORT: Record<string, string> = { person: "name" }

const CONTACT_COLUMN_HEADERS: TableColumn[] = CONTACT_COLUMNS.map((f) => {
  const option = COLLECTION_SORTS.accounts.options.find((o) => o.value === COLUMN_SORT[f.column])
  return {
    key: f.column,
    label: f.field.label,
    sort: option?.value,
    defaultDir: option?.defaultDir,
    // NO `sortType`/`sortKey` on any of these, and the absence is the statement:
    // every order this table can be put in is the DOOR's (`order={found.order}`
    // below), so nothing here is ever compared in the browser. Nor is any cell
    // a formatted value — there is no date and no money on a contact row — so
    // there is nothing for a type to disambiguate either.
  }
})

export function ContactsScreen({
  teamId,
  t,
  go,
  sectionPath,
  tab,
  accountsQ,
  total,
  recipe,
  rights,
  onAction,
  onIntent,
}: {
  teamId: string
  t: (english: string) => string
  go: (path: string, q?: Record<string, string>) => void
  sectionPath: string
  /** `ctx.query.tab` — the switch is pure, so the view rides the URL exactly
   * the way Accounts' own `accountTab` does, rather than local state. */
  tab: string | undefined
  accountsQ: { data: Account[] | undefined; error: unknown }
  /** the exact server total of individuals (R16) — never the loaded page's length */
  total: number | undefined
  recipe: ScreenRecipe
  rights: ScreenRights
  onAction: (actionId: string, ctx: ScreenActionContext) => void
  onIntent: (intent: ScreenIntent) => void
}) {
  // THE SECOND BADGE (R16), read from the sidecar the fetch below primes. It is
  // the DOOR's `individualPortalTotal`: the count of contacts holding a live
  // portal login, over the whole collection rather than this call's question, so
  // it does not move while somebody types in the search box — the same sentence
  // `individualTotal` (the `total` prop) already makes one tab along.
  //
  // A HOOK, so it is called before the error branch below returns.
  const portalTotal = useCachedValue<number>(totalKey("accounts-individual-portal", teamId))

  if (accountsQ.error) return <LoadError what="contacts" />
  // WAS A WHOLE-SCREEN EARLY RETURN (2026-09-03 audit — "nine screens blank
  // their entire toolbar while loading"): unmounted the heading and the
  // whole PagedFind toolbar (search/sort/tabs) along with the rows.
  // Fixed the shared way — see processes-screen.tsx's identical note.
  const contactsLoading = accountsQ.data === undefined
  const loaded = (accountsQ.data ?? []).filter((a) => a.accountType === "individual")
  // WHO CAN SIGN IN IS ITS OWN GRANT, so the tab that asks the question is drawn
  // only for a role that holds it. The DOOR is what actually decides — without
  // `portal_users:read` the filter comes back empty and the count comes back
  // zero, through the same `accountsWhere` as the rows (accounts.ts) — and this
  // is the other half of the same sentence rather than the whole of it: a tab
  // nobody may press is a control that opens on an empty list and explains
  // nothing, which is worse than a strip of one.
  const maySeeLogins = rights.portal_users?.read === true
  // …and a URL that still says `?tab=portal` lands on All rather than on a tab
  // that is not there — a link shared by a colleague with more rights is an
  // ordinary thing to receive.
  const contactsTab = tab === "portal" && maySeeLogins ? "portal" : "all"
  const contactsTabs = [
    {
      value: "all",
      label: t("All"),
      icon: "users",
      badge: formatCount(total),
      badgeVariant: "" as const,
    },
    // HER WORDS, unchanged ("also tabs here: All, In portal"). "Portal" is the
    // glossary's own term for the client's side of the product, so this is the
    // product's word rather than a synonym invented for a tab (R34).
    ...(maySeeLogins
      ? [
          {
            value: "portal",
            label: t("In portal"),
            icon: "sign-in",
            badge: formatCount(portalTotal),
            badgeVariant: "" as const,
          },
        ]
      : []),
  ]

  return (
    // ARBITRATION (R16 iii): the badged strip wins, and the heading stands down
    // through the arbitration context rather than saying the same number twice —
    // the same shape Accounts' own `CountedAbove` draws. Read off the ALL tab's
    // badge: it is the one that carries the collection's own total, and it is
    // never empty while the strip is drawn at all.
    <CountedAbove active={formatCount(total) !== ""}>
      <div className="flex flex-col gap-4">
        <CollectionHeading sectionKey="contacts" total={total} />
        {/* R14's other half, exactly as Accounts: the list pages, so the search
            box and every filter are answered by the DOOR. */}
        <PagedFind<Account>
          listKey={accountsKey(teamId)}
          placeholder={t("Search contacts…")}
          matches={{
            none: t("No contacts match"),
            one: t("1 contact matches"),
            many: t("{count} contacts match"),
          }}
          sorts={translatedSorts("accounts", t)}
          defaultSort={COLLECTION_SORTS.accounts.defaultSort}
          // R50 — the resting, individuals-only read's own row count.
          restingEmpty={loaded.length === 0}
          // 2026-09-03 audit — see processes-screen.tsx's identical note.
          restingLoading={contactsLoading}
          // ALWAYS narrowed to people — this page has no Companies/All strip to
          // switch it off with, because it IS the "people" half of that strip —
          // and narrowed AGAIN by the tab, at the door. `portal: "yes"` is the
          // whole of the In portal tab: the rows, the "N contacts match" count
          // and the cache key it all lands in are one question the server
          // answered, so nothing on screen is a slice of something bigger.
          fixed={contactsTab === "portal" ? { type: "individual", portal: "yes" } : { type: "individual" }}
          facets={translatedFacets("accounts", t, {})}
          fetchPage={(query, cursor) =>
            tenancy.accounts({ ...query, cursor }).then((r) => {
              // R16, primed from the SAME read as the rows. `individualPortalTotal`
              // is a COLLECTION count and rides every accounts response, so this
              // is one door answering both tabs' badges rather than a second
              // request for a number — and it lands whichever tab is open,
              // because both tabs call this same fetcher.
              primeCache(totalKey("accounts-individual-portal", teamId), r.individualPortalTotal)
              return { rows: r.accounts, nextCursor: r.nextCursor, total: r.total }
            })
          }
          // THE CANONICAL SHAPE (client, 31 Aug 2026 — the same reference
          // Accounts' own strip draws from): the tab strip sits INSIDE the same
          // zero-gap join as the card below it. Contacts has no create button
          // of its own (a person is added by linking one to a company, from
          // that company's own record), so this row is the tabs alone —
          // exactly as Tickets' own row is when it has nothing to put beside
          // them either. `tabs` is a `FolderTabStrip`, so there is nowhere in
          // its shape for a button to have gone anyway.
          //
          // AND THE ABSENCE IS CHECKED NOW, not just explained here. A screen
          // with no create act owes the reader the route that DOES exist, so
          // `contacts.list` carries its own `emptyDescription` naming Accounts
          // and web/test/cold-account.test.tsx (F6) fails if that sentence is
          // ever dropped back to the frame's default — which promises an "Add
          // the first" this screen deliberately does not have. Give Contacts a
          // create button one day and that test is where it tells you the
          // sentence has to change with it.
          tabs={{
            config: { ...defaultTabsConfig, tabs: contactsTabs },
            value: contactsTab,
            onValueChange: (v) => go(sectionPath, v === "all" ? {} : { tab: v }),
          }}
          wrap={(inner) => <CollectionCard>{inner}</CollectionCard>}
        >
          {(found) => {
            // `fixed` makes a find ACTIVE on both tabs, so `found.rows` is
            // always the door's answer to the question this tab asks; `loaded`
            // is the resting fallback for the first paint before it lands.
            const rows = found.active ? found.rows : contactsLoading ? null : loaded
            if (rows === null) return <Skeleton variant="list" lines={4} />
            const data = shapeContactsTable(rows)
            // The display is decided BEFORE the collection is tuned, so the
            // tuner can see it is drawing a table — whose column headers ARE
            // its sort control — and stand its own picker down (`screens.ts`,
            // `frameSortOptions`). The columns are translated HERE, at the
            // place they are spread on, because `resolveRecipe` translated the
            // recipe before it ever saw them.
            // R62 — the SENTENCE is no longer pushed down as an `emptyText`
            // override: the frame draws both zeros from one register and picks
            // the words off `narrowedOutside` below. Contacts is a GROWING
            // collection, so its search lives in the `<PagedFind>` above and
            // the frame's own query is always empty — without that prop a
            // search matching nothing read as "this collection is empty" and
            // offered "Add the first" over people a term was hiding.
            const tableRecipe = withDataDrivenCollection(
              { ...recipe, display: "table" as const, fields: translateFields(CONTACT_COLUMNS, t) },
              data.rows ?? []
            )
            return (
              <>
                {/* No `useKitPanel`: `CollectionCard` above (drawn by `wrap`) is
                    the ONE box — the "broken combination" screen-bits.tsx warns
                    against is a card drawn twice. */}
                <RecordTable
                  columns={CONTACT_COLUMN_HEADERS}
                  rows={data.rows ?? []}
                  config={tableRecipe.collection as CollectionConfig}
                  order={found.order}
                  actions={visibleActions(tableRecipe, rights, onAction)}
                  /* R62 — the door above owns the search. */
                  narrowedOutside={found.active}
                  onRowClick={(row) =>
                    // The SAME intent the recipe engine emitted for these rows
                    // before the table replaced it: the deep-link host maps
                    // module "contacts" to `/accounts/<id>`, because a person
                    // is a row of the accounts table and has one address.
                    onIntent({ kind: "open", module: "contacts", id: String(row.id) })
                  }
                />
                <LoadMore
                  listKey={found.listKey ?? accountsKey(teamId)}
                  label={t("Load more contacts")}
                  fetchPage={found.fetchPage}
                />
              </>
            )
          }}
        </PagedFind>
      </div>
    </CountedAbove>
  )
}
