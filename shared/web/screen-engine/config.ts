// =============================================================================
// Kwapso UI configuration system — the shared vocabulary every component's
// `config` is built from. See ARCHITECTURE.md "Configuration" + "Taxonomy".
//
// Model: a universal BaseConfig (visibility) sits under every component, then a
// per-category mixin (Field / Action / Collection / Content) adds shared knobs
// for that kind of component, then each component adds its own. Compose with
// intersection types + spreading the matching `defaultXConfig`.
// =============================================================================

// Type-only, same as `icon-map.ts` beside this file: nothing here runs in the
// DOM, so a runtime import would be dead weight, and no worker compiles this
// file (a grep across `workers/` turns up no import of it) so the question of
// whether a worker's tsconfig carries React types never arises.
import type * as React from "react"

/* ----------------------------- visibility rules ---------------------------- */

/** Where a rule reads its value from. */
export type RuleSource = "row" | "user" | "app"

export type RuleOperator =
  | "is"
  | "isNot"
  | "contains"
  | "gt"
  | "lt"
  /** Inclusive numeric bounds — what a `control:"range"` facet compiles to. */
  | "gte"
  | "lte"
  | "isEmpty"
  | "isNotEmpty"

/** A single condition, e.g. { source:"row", field:"status", op:"is", value:"active" }. */
export interface Rule {
  source: RuleSource
  field: string
  op: RuleOperator
  value: string
}

/** The data a rule is evaluated against (current row, signed-in user, app state). */
export interface VisibilityContext {
  row: Record<string, unknown>
  user: Record<string, unknown>
  app: Record<string, unknown>
}

export const emptyContext: VisibilityContext = { row: {}, user: {}, app: {} }

function evalRule(rule: Rule, ctx: VisibilityContext): boolean {
  const raw = ctx[rule.source]?.[rule.field]
  const s = String(raw ?? "")
  switch (rule.op) {
    case "is":
      return s === rule.value
    case "isNot":
      return s !== rule.value
    case "contains":
      return s.toLowerCase().includes(rule.value.toLowerCase())
    case "gt":
    case "lt":
    case "gte":
    case "lte": {
      // A numeric comparison needs a real number on BOTH sides, and a blank or
      // non-numeric field never matches. Without the `s === ""` guard, Number("")
      // is 0 — so a product with no price would sneak into a "price ≤ 5" filter,
      // while a MISSING price (NaN) correctly wouldn't. This also mirrors SQL,
      // where comparing NULL is never true, so the in-memory result agrees with
      // what the D1/SQL layer returns for the same rule.
      const a = Number(s)
      const b = Number(rule.value)
      if (s === "" || !Number.isFinite(a) || !Number.isFinite(b)) return false
      if (rule.op === "gt") return a > b
      if (rule.op === "lt") return a < b
      if (rule.op === "gte") return a >= b
      return a <= b
    }
    case "isEmpty":
      return raw == null || s === ""
    case "isNotEmpty":
      return raw != null && s !== ""
    default:
      return true
  }
}

/** True if the rules pass. No rules → always true. `matchAny` switches AND→OR. */
export function evaluateRules(
  rules: Rule[],
  ctx: VisibilityContext,
  matchAny = false
): boolean {
  if (!rules || rules.length === 0) return true
  return matchAny
    ? rules.some((r) => evalRule(r, ctx))
    : rules.every((r) => evalRule(r, ctx))
}

/* ------------------------------- base config ------------------------------- */

/** On EVERY component. The minimum shared config. */
export interface BaseConfig {
  /** Hard show/hide switch. */
  visible: boolean
  /** Conditional visibility — all must pass (see evaluateRules). */
  visibilityRules: Rule[]
}

export const defaultBaseConfig: BaseConfig = {
  visible: true,
  visibilityRules: [],
}

/* ----------------------------- category configs ---------------------------- */

/** Validation for input fields (null = no limit). */
export interface FieldValidation {
  min: number | null
  max: number | null
  minLength: number | null
  maxLength: number | null
  pattern: string
}

const defaultFieldValidation: FieldValidation = {
  min: null,
  max: null,
  minLength: null,
  maxLength: null,
  pattern: "",
}

/** Input components (text, number, choice, notes…). */
export interface FieldConfig extends BaseConfig {
  label: string
  helpText: string
  required: boolean
  disabled: boolean
  validation: FieldValidation
}

export const defaultFieldConfig: FieldConfig = {
  ...defaultBaseConfig,
  label: "",
  helpText: "",
  required: false,
  disabled: false,
  validation: { ...defaultFieldValidation },
}

/** Check a string value against a FieldConfig. Returns an error message to show
 * the user, or null when the value is valid. Numeric min/max only apply when the
 * value parses as a number; length/pattern apply to the raw string. */
export function validateField(
  value: string,
  config: FieldConfig
): string | null {
  const v = config.validation
  const name = config.label || "This field"
  if (value.trim() === "") {
    return config.required ? `${name} is required.` : null
  }
  if (v.minLength != null && value.length < v.minLength)
    return `Must be at least ${v.minLength} characters.`
  if (v.maxLength != null && value.length > v.maxLength)
    return `Must be at most ${v.maxLength} characters.`
  // Numeric min/max only apply to a plain decimal value — the regex stops
  // Number() from coercing "0x10" / "1e3" / "Infinity" into a passing number.
  // (A blank value already returned above, so "" never reaches here.)
  if (/^-?\d*\.?\d+$/.test(value.trim())) {
    const num = Number(value)
    if (v.min != null && num < v.min) return `Must be ${v.min} or more.`
    if (v.max != null && num > v.max) return `Must be ${v.max} or less.`
  }
  if (v.pattern && !new RegExp(v.pattern).test(value))
    return `${name} is not in the expected format.`
  return null
}

export interface FacetOption {
  value: string
  label: string
  count?: number
  /** THE RECORD'S OWN MARK, PRE-DRAWN BY THE CALLER — optional, and it stays
   * that way on purpose. Most facets (Client, Module, Status, every closed
   * vocabulary in `collection-filters.ts`) are words and nothing else, and a
   * mark that appeared on the type merely by existing on this interface would
   * be exactly the "grows one by accident" risk this field was asked not to
   * create: `useFilterBar` (filter-bar.tsx) is one function rendering every
   * facet on both front doors, so a change here reaches all of them at once.
   *
   * A `ReactNode` rather than a colour string or an icon name, for the same
   * reason `ticket-chips.tsx` takes `typeDot`/`AppLink` as props instead of
   * importing `ticketTypeColour`/`AppMark` itself: this file sits under
   * `shared/web/`, read by BOTH front doors, and neither the ticket type's
   * colour map (`web/lib/type-colours.ts`) nor an app's own mark
   * (`web/components/apps/app-tiles.tsx`'s `AppMark`) lives somewhere this layer
   * may import from (`@/...` resolves to a different folder per door). The
   * CALLER that builds a `FilterFacet`'s options already has both concerns
   * addressed — the ticket screens draw a `<Swatch>` for a type and an
   * `<AppMark>` for an app everywhere else a ticket appears — so it hands the
   * finished element in, and this layer only ever composes it beside the
   * word, never decides what it looks like.
   *
   * NEVER THE ONLY THING AN OPTION SAYS — the house rule a mark answers to
   * everywhere else in this app (`type-colours.ts`'s own "the dot is never
   * alone" section, R32's "a mark comes from the chart series"): `useFilterBar`
   * renders this beside `label`, `aria-hidden`, never instead of it. */
  mark?: React.ReactNode
  /** WHOSE THIS IS — the id of the record that OWNS the one this option names,
   * on a facet that declares a `dependsOn` (below). An app's `accountId`, a
   * sprint's `appId`: the record's own owning column, passed straight through
   * rather than restated, so the relationship a filter narrows by and the
   * relationship the database stores are one fact.
   *
   * `null` MEANS OWNED BY NOBODY, AND SUCH AN OPTION IS OFFERED UNDER EVERY
   * PARENT. `AppRow.accountId` is null on the agency's OWN systems, and the
   * ticket door has no opinion about which client an app belongs to
   * (`appForTicket` checks only that the app is a live row — see
   * `help-form-dialog.tsx`'s own note, which asks in as many words that nobody
   * "fix" the ticket form by narrowing its app list to the client's own apps).
   * A client's ticket about one of our own systems is therefore an ordinary,
   * intended row; dropping our apps from a narrowed menu would make every one
   * of those tickets unreachable from the App filter, which is a subtraction
   * nobody asked for and nobody would see until they went looking. So the
   * narrowing is by OWNERSHIP and the un-owned are always offered.
   *
   * WHAT THIS DELIBERATELY DOES NOT REACH: a row pairing one client with a
   * DIFFERENT client's app. The door allows it and no screen offers it, so it
   * is a mis-filed row rather than an intended combination — findable by
   * search and by the Client filter alone, and not worth keeping every other
   * client's apps in the menu for. Said out loud because it is the one thing
   * the narrowing costs.
   *
   * `undefined` on a facet with no `dependsOn` is the ordinary case and means
   * nothing at all — most facets are words with no owner. */
  within?: string | null
}

/** One field the user may sort by. `value` is the row field. */
export interface SortOption {
  value: string
  label: string
  /** The direction applied when this option is PICKED. Dates want `"desc"`
   * (newest first), names want `"asc"` — landing on oldest-first reads as
   * broken. Defaults to `"asc"`. The user can still flip it afterwards. */
  defaultDir?: "asc" | "desc"
  /** This option has no meaningful direction (e.g. best-match relevance). The
   * asc/desc toggle is DISABLED while it's active rather than silently ignored.
   * Don't make a directionless option the default `sortBy` — the user then
   * lands on a greyed-out toggle, which answers "am I A→Z or Z→A?" with
   * nothing. */
  directionless?: boolean
}

/** A user-facing filter control. A chosen value becomes an `is` Rule on `field`,
 * run through the SAME `evaluateRules` engine as the builder `filter` (no new
 * matching engine). `control` is just presentation. When `options` is omitted,
 * the distinct values are derived from the data at render (see `facetOptions`
 * in lib/collection.ts). */
export interface FilterFacet {
  field: string
  label: string
  /** `select` = pick one of a list · `range` = numeric min/max. A `range` facet
   * reports `"min..max"` (either side may be empty, e.g. `"10.."`) and compiles
   * to inclusive `gte`/`lte` rules — see `selectRows`.
   *
   * `"chips"` WAS A THIRD VALUE AND IS GONE (2026-08-27). No recipe and no
   * screen ever set it, and in the design kit's vocabulary — which the filter
   * row now draws through — a CHIP is an active filter, not an option waiting
   * to be picked. Two meanings of one word in one row is the drift the kit
   * adoption exists to end, so the unused one went rather than being ported. */
  control: "select" | "range"
  options?: FacetOption[]
  /** THE FACET THIS ONE HANGS OFF — client ruling, 2026-09-09, on a screenshot
   * of her own tickets toolbar reading Client "Any client", App "Kwapso Portal"
   * and, underneath, "Nothing matched. Try fewer words, or clear the filters."
   * Verbatim: *"very wrong! filter the apps by selected client! Until clint is
   * not selected, show nothing."* / *"filter by selected client only!"* /
   * *"whe using fulters this is how they shoudl work: is client has sth (f.e.
   * Kwapos) the filter apps should only show apps of this client. and so on"*.
   *
   * THE FAULT HER SCREENSHOT PROVES is not that a filter returned nothing. It
   * is that the row OFFERED a combination that cannot match: the App control
   * listed every app of every client, so picking one whose tickets belong to a
   * client she had not selected produced an empty list that reads exactly like
   * a broken screen. A control whose only possible outcome is disappointment
   * is the shape this app removes on sight (the ticket form's own module
   * picker says the same sentence about the same problem).
   *
   * "and so on" IS THE WHOLE POINT — she is stating a rule for the filter row,
   * not asking for a patch to one control. So the narrowing lives HERE, on the
   * one type every facet in both front doors is declared as, and is applied
   * once, in `useFilterBar` (filter-bar.tsx). The next pair is one field on a
   * declaration, never a second implementation.
   *
   * WHICH PAIRS THESE ARE IS DERIVED, NOT HAND-LISTED. A facet hangs off
   * another exactly where the record it names is OWNED by the record the other
   * names — `apps.account_id`, `sprints.app_id`, `modules.app_id`: real
   * columns, and the same ones the doors already narrow by (`listApps`'s own
   * `?accountId=` filter, `workers/tenancy/src/lib/processes.ts`). Nothing is
   * pinned in a registry that could go stale, because the relationship is not
   * an opinion: the option carries its owner (`FacetOption.within`) or, for a
   * facet whose options are DERIVED from the rows, the rows carry it
   * themselves, and `useFilterBar` reads whichever is there.
   *
   * TWO THINGS FOLLOW FROM DECLARING ONE, and both are `useFilterBar`'s:
   *
   *  1. WITH A PARENT CHOSEN the option list is narrowed to what that parent
   *     owns (plus what nobody owns — see `FacetOption.within`).
   *  2. WITH NO PARENT CHOSEN the control offers nothing and SAYS WHAT TO DO
   *     FIRST, in `emptyText`. It is drawn disabled, in place, exactly as the
   *     ticket form draws the same state ("Choose a client first." — the same
   *     sentence, reused rather than re-authored): a field that vanishes moves
   *     every control after it as somebody fills the row in, and a filter row
   *     whose shape changes under the reader is the variation the client has
   *     twice told us to stop.
   *
   * AND A STRANDED SELECTION RESOLVES ITSELF. Picking a different parent while
   * a child value is set leaves a combination that cannot match — the very
   * fault — so `useFilterBar` clears the child and SAYS SO. Never silently:
   * a filter somebody deliberately set may not disappear without a word. The
   * argument for clearing rather than keeping is in `useFilterBar`'s own note.
   *
   * A COUNT ON A NARROWED OPTION MUST DESCRIBE THE NARROWED SET (R16). No
   * facet in either front door carries `FacetOption.count` today — every
   * count in this app is a tab badge or a heading, drawn by `formatCount`
   * from an exact server `COUNT(*)` — so nothing here is currently at risk;
   * the day one does, it is counted over the rows this narrowing leaves, not
   * over the collection. */
  dependsOn?: {
    /** The FIELD of the facet that owns this one — `accountId` under an App
     * facet, `appId` under a Sprint facet. It must be a facet declared beside
     * this one in the same row, or this control can never be unlocked. */
    field: string
    /** WHAT THE CONTROL SAYS WHILE THAT PARENT IS UNSET — a whole sentence
     * naming the next act, already translated by whoever built the facet.
     * "Choose a client first." exists in the catalogue and is what the ticket
     * form already says about exactly this question; reuse it rather than
     * writing a second sentence for one idea (R34). */
    emptyText: string
  }
  /** `control:"range"` bounds, passed to both number fields. `step` defaults
   * to 1. */
  min?: number
  max?: number
  step?: number
}

/** Collection components — data-bound views. `filter`/`sort`/`limit` are
 * DECLARED here and EXECUTED by the data layer (D1/SQL) — the component itself
 * just receives the resulting rows. */
export interface CollectionConfig extends BaseConfig {
  dataSource: string
  /** Header shown above the collection (empty = no header). */
  title: string
  /** Builder-side conditions (always applied). User-facing facets live in
   * `filterFacets` and are ANDed with these. */
  filter: Rule[]
  /** The INITIAL sort. When `sortable` is on this seeds the header control and
   * the user's live choice takes over from there (state, not config — the same
   * split as `filter` vs `filterFacets`). Read the live value off
   * CollectionFrame's `onQueryChange`. */
  sortBy: string
  sortDir: "asc" | "desc"
  /** Show a USER-facing sort control in the header (the `sortOptions` below),
   * on the same row as search and the filters. Separate from `sortBy`/`sortDir`,
   * which only declare where it starts. */
  sortable: boolean
  /** The fields offered when `sortable` is on. Empty = no control even if
   * `sortable` is true. (A `SEARCHABLE_THRESHOLD` constant used to live beside
   * this, deciding when a pick-a-value control grew a search box of its own.
   * Both controls that read it are the kit's now and each answers that for
   * itself — the filter row's facets always search, the sort picker decides
   * inside `sort-control` — so a constant nobody consulted went with them.) */
  sortOptions: SortOption[]
  /** Cap the TOTAL rows shown (null = no cap). Separate from itemsPerPage. */
  limit: number | null
  /** Rows per page (null = no pagination, show everything). */
  itemsPerPage: number | null
  /** On page change, scroll the collection's top back into view. */
  scrollToTop: boolean
  searchable: boolean
  /** Placeholder shown inside the search box. */
  searchPlaceholder: string
  /** Show a runtime, USER-facing filter bar (the `filterFacets` below). Separate
   * from `searchable` and from the builder `filter` — Glide calls this out. */
  userFilter: boolean
  /** The facets rendered when `userFilter` is on (a dropdown or chips each). */
  filterFacets: FilterFacet[]
  /** Show a live "Showing X of Y" count in the header. */
  showCount: boolean
  emptyText: string
  /** THE SENTENCE UNDER `emptyText`, when this collection has one of its own.
   *
   * `CollectionEmptyState` (collection-frame.tsx) carries composition 27.21's
   * own default — "Add the first one, or import a list you already have" — and
   * that sentence is true of every collection somebody can add to. It is not
   * true of all of them: Contacts has no create act at all (a person is added
   * from the company they work at), Tickets fills from the client portal as
   * well as from here, and Members fills from an invite. On those the default
   * would point at a door the reader cannot open, which is worse than saying
   * nothing.
   *
   * Optional, and undefined means "the default is right here" — so a recipe
   * that sets nothing renders exactly what it rendered before. Declared in
   * English beside the collection it belongs to and translated on the way to
   * the screen (`t(config.emptyDescription)` below, the same seam
   * `emptyText` already uses — R33's field-config ruling, applied to the
   * config the engine inherited). */
  emptyDescription?: string
  /** An OPTIONAL concept glyph above the empty sentence — a lucide name, the same
   * shape `TabItem.icon` takes as a name. Defaults to none, so a caller that sets
   * nothing renders exactly what it rendered before.
   *
   * WHY IT IS HERE. A lone line of grey text in the middle of a dashed box reads
   * as a screen that FAILED, not one with nothing on it yet — and that is
   * precisely the screen every brand-new team sees on every page. Hosts that
   * compose their own empty states already lead with a glyph for this reason; a
   * recipe-driven collection had no way to say it, and writing the glyph into
   * `emptyText` would put a pictograph inside a sentence, which is the one shape
   * a host style guide is most likely to forbid. */
  emptyIcon?: string | null
  /** Header arrangement. Filters never orphan into a row of their own (client
   * ruling, 2026-09-01) — they always ride beside search. "stacked" (default) =
   * a title+search+filters row with SORT on its own line below; "inline" =
   * title, search, filters AND sort together on one wrapping row. */
  headerLayout: "stacked" | "inline"
}

export const defaultCollectionConfig: CollectionConfig = {
  ...defaultBaseConfig,
  dataSource: "",
  title: "",
  filter: [],
  sortBy: "",
  sortDir: "asc",
  sortable: false,
  sortOptions: [],
  limit: null,
  itemsPerPage: null,
  scrollToTop: true,
  searchable: true,
  searchPlaceholder: "Search…",
  userFilter: false,
  filterFacets: [],
  showCount: true,
  emptyText: "Nothing here yet.",
  emptyIcon: null,
  headerLayout: "stacked",
}

/* ----------------------------- text overflow ----------------------------- */
