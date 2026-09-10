// WHAT EACH PAGED COLLECTION MAY BE NARROWED BY, in the words a person reads.
//
// The exact sibling of `collection-sorts.ts`, and for the exact same reason. A
// collection is asked three things — which rows, which of those, and in what
// order — and on a collection that PAGES all three are questions for the DOOR
// (SEARCH.md layer 2). Sorting got its screen-side half in one file on 18 Aug;
// this is the filtering half, arriving the same day and one control along.
//
// ── THE FAULT THAT EARNED IT ─────────────────────────────────────────────────
//
// The owner filtered the knowledge base by "From a meeting" and was shown TWO
// sources. The door, asked properly, answers 52; the app holds 170 meetings.
// `kind` was a `filterFacets` entry on a paged recipe, so the library's frame
// filtered the fifty rows it was holding — and page one happened to contain
// exactly two meetings, so the screen reported two with a straight face, under a
// badge (R16) correctly counting all 3,000-odd sources.
//
// That is the THIRD instance of one shape in a day. The search box searched page
// one until it was moved to the door; a column header sorted nothing at all; now
// the facets narrow page one. Each looked like an answer and was not, and the
// only thing they have in common is where they were answered.
//
// ── HOW THIS FILE ANSWERS IT ─────────────────────────────────────────────────
//
// `field` is the DOOR's OWN query parameter, never the shaped row's column. That
// is the whole substitution the old arrangement made: `{ field: "kind" }` on a
// recipe meant "the `kind` property of the row objects in the browser", and it
// read identically to "the `kind` parameter the door parses". One of those spans
// the collection and one of them spans whatever happened to be loaded.
//
// A facet's OPTIONS come from one of two places, and which one is a fact about
// the door rather than a style:
//
//   • a CLOSED vocabulary (a kind, a stage, yes/no) is declared here, in full,
//     because the door matches exactly these words and there are not many;
//   • a facet over ROWS (an account, an app, a sprint, a person) declares none —
//     the door matches an id, so the screen supplies them from the list it is
//     already holding, and a facet the screen has no rows for is dropped rather
//     than drawn empty.
//
// `web/test/rules.test.ts` (`facets-ask-the-door`) reads each door's own
// parameter parsing off disk and asserts every `field` below is one of them —
// the same derivation R19 makes of a tool's filters, and the same shape
// `paged-sort.test.ts` makes of a sort menu. A facet naming a parameter its door
// does not parse is a control that quietly answers nothing.

import type { FacetOption as DrawnFacetOption, FilterFacet } from "@shared/web/screen-engine/config"

import { KNOWLEDGE_KIND } from "@/components/deep-link/shape"

/** One option on a facet: the word the DOOR matches, and the word a person
 * reads. They are different on purpose — a door matches `meeting`, a person is
 * looking for "From a meeting" — and conflating them is how a filter comes to
 * send a display label to a database. */
export type FacetOption = { value: string; label: string }

/** One door filter, as a screen offers it. */
export type CollectionFacet = {
  /** THE DOOR'S OWN QUERY PARAMETER. Not the shaped row's column. */
  field: string
  /** what a person reads above the dropdown */
  label: string
  /** the CLOSED vocabulary, where the door has one. A facet over rows leaves
   * this out and the screen fills it in — see `translatedFacets`. */
  options?: FacetOption[]
  /** THE FACET THIS ONE HANGS OFF, where the record it names is OWNED by the
   * record another facet in the same row names (client ruling, 2026-09-09 —
   * `FilterFacet.dependsOn`, shared/web/screen-engine/config.ts, carries her
   * words and the whole argument; `useFilterBar` applies it).
   *
   * `emptyText` is ENGLISH here like every other word in this file and goes
   * through `t()` in `translatedFacets` below, the same as `label`. */
  dependsOn?: { field: string; emptyText: string }
}

/** Yes and no, which four of these facets need and none of them should spell
 * twice. The VALUES are the two words the doors allow-list; the labels are what
 * a person reads. */
const YES_NO: FacetOption[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
]

/** THE PAGED COLLECTIONS' door filters, keyed by the collection's name in
 * `GROWING_COLLECTIONS` (shared/rules/registry.ts), so a check can find the door
 * that owns each one without anything being hand-paired.
 *
 * A collection missing from here offers no filters at all, which is a decision
 * and is written down in `UNFILTERED` beside the check. */
export const COLLECTION_FILTERS: Record<string, CollectionFacet[]> = {
  accounts: [
    { field: "archived", label: "Archived", options: YES_NO },
  ],
  // TICKETS' OWN "Archived" — the exact Accounts/Processes shape, one door
  // parameter later. The client's 2026-08-31 ruling ("there can never be 2 rows
  // of tabs … just never") retired the tickets screen's OUTER strip (All
  // tickets / Archived), which used to be a second folder tab stacked on the
  // kind/stage strip beneath it. Archived was always a VIEW orthogonal to kind
  // and stage — an archived ticket can be any type, at any stage — so it moves
  // here rather than into the remaining tab row, the same way Accounts' own
  // archive toggle sits beside its Companies/All tab rather than inside it. The
  // one difference from Accounts' `archived` is the WORD the door already
  // matches: `workers/content/src/routes/help.ts` calls it `view`
  // (`"live" | "archived"`), never `archived`, so the field says what the door
  // actually reads rather than copying a sibling screen's spelling.
  // CLIENT, APP, TYPE, STATUS — the client's own four, 2026-09-07, verbatim:
  // "On open, I want, instead of the current filters, client, app, type, and
  // status." Her order is her reading order and it is the order she gets: this
  // array is what `translatedFacets` walks, so the panel reads Client, App,
  // Type, Status, top to bottom, on every tab that offers them.
  //
  // WHICH TABS OFFER WHICH is NOT decided here, and deliberately: this file is
  // the collection's declaration of what its DOOR can answer, and the tab is a
  // narrowing of the same door. The rule that subtracts a facet from a tab
  // whose own token already pins that field lives with the tab grammar it is
  // computed from (`helpTabFacets`, web/lib/live-resources.ts) and is applied
  // by the screen, which simply hands an empty option list for a facet a tab
  // may not ask — and an empty list is already dropped four lines from the
  // bottom of this file. One subtraction, one mechanism.
  //
  // MODULE LEFT THIS LIST the same day. It was here for the toolbar mockup
  // Aurora approved on 2026-09-01 ("Client ▾ | Module ▾ | + Filter") and the
  // client has now named the level she actually works at: an APP, not one of
  // its sections. `moduleId` is still parsed by the door and still reached by
  // the machine surface and by an app record's own screens — nothing was
  // removed from the door, one control was removed from this toolbar, because
  // she asked for four filters and a fifth she did not ask for is a fifth thing
  // to reject before reaching the one she wanted.
  //
  // ARCHIVED STAYED, AND THAT IS A JUDGEMENT CALL WRITTEN DOWN RATHER THAN A
  // SILENT ONE. Her sentence says "instead of the current filters", and the
  // current filters were Client, Module and Archived — so a literal reading
  // retires this one too. It is kept because the other four are facets over a
  // ticket's OWN FIELDS and this is not: `view` chooses WHICH COLLECTION is
  // being looked at (the everyday list, or the drawer things are put away in),
  // and it is the entire surviving surface of a tab the 2026-08-31 redesign
  // retired ("there can never be 2 rows of tabs … just never") on the explicit
  // understanding that the capability moved HERE rather than being deleted.
  // Dropping it would make every archived ticket unreachable from this screen,
  // which is a subtraction she was not asked to approve and would not see until
  // she went looking for one. If she meant it to go, it is this one line and
  // the census entry beside it — cheap. Reinstating a lost route to a thousand
  // archived tickets is not.
  help: [
    // THE WORD IS ACCOUNT, AND IT WAS CLIENT UNTIL 2026-09-09. Her correction,
    // on this very row: "Hey, you got it wrong. The filter client is the
    // company, so it's the account. Let's do something: rename client to
    // account everywhere we said client. This was a mistake." She is fixing a
    // VOCABULARY mistake, not asking for a data-model change — the field below
    // is still `accountId`, the door still parses `accountId`, the column is
    // still `help.account_id`. Nothing under the label moved.
    //
    // WHY THIS LINE IS WHERE THE NOTE GOES: this is the control she was looking
    // at. The same word had to move on the facet's own dependant ("Choose an
    // account first." below), on the meetings facet further down, on the
    // meetings SORT (`collection-sorts.ts`), on the sprints and apps facets
    // (`web/lib/screens.ts`) and on every picker and column that named the same
    // record — a facet whose label and whose empty sentence disagree is a row
    // saying two words for one thing, which is the fault she reported.
    //
    // DO NOT RENAME IT BACK, and do not "finish" it either: "client" is still
    // the right word for the RELATIONSHIP and the PERSON in it — the portal
    // login who raises a ticket, the person we email an answer to, the one who
    // may never read the agency's own notes. R34's registry note refuses to
    // ban the word for exactly that reason. See shared/glossary.ts § account.
    { field: "accountId", label: "Account" },
    // ROWS, NOT A CLOSED VOCABULARY: the door matches an app's id, and the
    // tickets screen fills these from the apps list it already holds — which
    // is BOUNDED (a team's own systems), so page one is the collection and the
    // menu is not the truncated one an accounts-shaped read would give.
    //
    // AND IT HANGS OFF THE CLIENT ABOVE IT — client ruling, 2026-09-09, on a
    // screenshot of THIS toolbar: "very wrong! filter the apps by selected
    // client! Until clint is not selected, show nothing." The narrowing itself
    // is `useFilterBar`'s (one seam, every facet in both front doors); what is
    // declared here is only that the relationship EXISTS, which it does as a
    // real column — `apps.account_id`, the same one the apps door narrows by
    // when it is asked `GET /api/tenancy/apps?accountId=` (`appsWhere`,
    // workers/tenancy/src/lib/processes.ts). So this is not a second opinion
    // about which apps are whose; it is the app record's own field, reaching a
    // control that had been ignoring it.
    //
    // "Choose an account first." IS THE TICKET FORM'S OWN SENTENCE for exactly
    // this state, said by its App row when no client is named yet
    // (help-form-dialog.tsx). One idea, one sentence (R34) — and it is already
    // in the catalogue, answered in all three languages, so this control adds
    // nothing to translate.
    {
      field: "appId",
      label: "App",
      dependsOn: { field: "accountId", emptyText: "Choose an account first." },
    },
    // THE TEAM'S OWN `Ticket type` WORDS, so the options cannot be declared
    // here: this is a per-team, editable vocabulary (`selectable_data`), not a
    // constant. It is filled in by the screen from `helpTypeOptions` — the one
    // list the create form, the dashboard's legend and this facet all read —
    // which already subtracts the kind that is kept but never shown
    // (`ticketTypeKeptForMigration`, shared/types.ts).
    { field: "helpType", label: "Type" },
    // A CLOSED VOCABULARY THAT STILL CANNOT BE SPELLED HERE, and it is the one
    // genuine exception to this file's own two-sources rule at the top. The
    // seven stages ARE fixed and server-owned (`HELP_STATUSES`) — but the SLICE
    // of them a tab may offer is the tab's, and a static list here would offer
    // "Resolved" on the Open tab: a stage that tab cannot contain, on a control
    // that would return nothing and look broken. So the screen supplies exactly
    // the words `helpTabFacets` says the open tab spans, taken from
    // `HELP_STATUSES` and never from the rows on the page.
    { field: "status", label: "Status" },
    { field: "view", label: "Archived", options: [
      { value: "live", label: "No" },
      { value: "archived", label: "Yes" },
    ] },
  ],
  knowledge: [
    // WHAT A SOURCE IS. A closed vocabulary — the door allow-lists it against
    // KNOWLEDGE_KINDS — so every kind is offered whether or not one happens to
    // be on the page in front of you. Deriving these from the loaded rows was
    // half of the original fault: the filter could only offer what page one
    // already showed, which is the answer it was supposed to go and find.
    {
      field: "kind",
      label: "Type",
      options: Object.entries(KNOWLEDGE_KIND).map(([value, label]) => ({ value, label })),
    },
    // WHOSE IT IS — the compartment string, `agency` or `account:<id>`. Rows,
    // because the ids are the team's accounts.
    { field: "compartment", label: "Filed under" },
    // TAKEN AWAY, OR STILL READ. A source removed from the assistant's sight is
    // kept, not deleted (deactivate-never-delete), so both are ordinary rows in
    // this list and telling them apart is what this asks.
    {
      field: "active",
      label: "Status",
      options: [
        { value: "yes", label: "In use" },
        { value: "no", label: "Not in use" },
      ],
    },
  ],
  meetings: [
    { field: "accountId", label: "Account" },
    { field: "purposeId", label: "Why we met" },
    // NO STATUS FILTER, and the reason changed under this line while it was
    // being written. It used to offer Scheduled and Held; `held` was retired the
    // same day — a flag somebody had to remember to tick could disagree with the
    // calendar in both directions, so a meeting's own start time answers "has it
    // happened" and cannot go stale. There is nothing left to filter ON: past
    // and upcoming are a date comparison, and this door parses no date filter.
    //
    // The check beside this file caught it the moment the two lanes met, which
    // is exactly what it is for: an offered filter that cannot be honoured must
    // not be shown. A date filter on the meetings door would give this back.
  ],
  processes: [
    { field: "appId", label: "App" },
    { field: "archived", label: "Archived", options: YES_NO },
  ],
  stories: [
    // The four stages a piece of work moves through — the same words
    // STORY_STATUS_LABEL renders on the rows, because a filter and a row saying
    // the same thing differently is two vocabularies for one fact.
    {
      field: "status",
      label: "Status",
      options: [
        { value: "open", label: "Open" },
        { value: "in_progress", label: "In progress" },
        { value: "in_review", label: "In review" },
        { value: "done", label: "Done" },
      ],
    },
    { field: "assigneeId", label: "Who has it" },
    // APP BEFORE SPRINT, which is a change of ORDER as well as of behaviour and
    // is worth saying out loud: this array is what `translatedFacets` walks, so
    // it is the order the panel reads in, and Sprint sat above the App it hangs
    // off until 2026-09-09. A control that cannot be used until the one BELOW it
    // is answered is a panel read bottom-up. The ticket form settled the same
    // question for the same pair of ideas — "it is still the order the data
    // depends in … so answering downward never asks a question that has no
    // answer yet" — and this is that sentence applied to a filter row.
    { field: "appId", label: "App" },
    // A SPRINT BELONGS TO AN APP, so the Sprint control hangs off the App one —
    // the same ruling as the tickets toolbar above, on the OTHER ownership edge
    // this app's filter rows actually contain (`sprints.app_id`, carried on the
    // row as `Sprint.appId`; `stories.ts`' own reads resolve an app's name
    // through it). Before this, picking an app and then a sprint of a different
    // app was an offered pair that returns nothing — the client's exact
    // complaint, one screen along, which is what "and so on" asks us to find.
    //
    // "Choose an app first." is the ticket form's sentence for the same shape
    // one level down (its Module row, which belongs to an app the same way this
    // belongs to one), already catalogued and already answered.
    {
      field: "sprintId",
      label: "Sprint",
      dependsOn: { field: "appId", emptyText: "Choose an app first." },
    },
  ],
  workLogs: [
    // WHO LOGGED IT — a facet over rows, filled in from the team's own staff
    // (useAssignableMembers already excludes a client login: R21 refuses one at
    // this door outright, so a client never belongs in this list).
    { field: "userId", label: "Who logged it" },
    // WHAT KIND OF WORK — the door's own allow-list (WORK_LOG_TARGETS,
    // workers/content/src/lib/work-logs.ts), in the glossary's own words for
    // each (Story, Ticket, Task, Meeting) rather than the table name.
    {
      field: "targetTable",
      label: "Kind of work",
      options: [
        { value: "stories", label: "Story" },
        { value: "help", label: "Ticket" },
        { value: "tasks", label: "Task" },
        { value: "meetings", label: "Meeting" },
      ],
    },
    // WHEN — a closed window rather than a free-form date range: nothing on
    // either front door draws a date-range picker, and three rolling windows are
    // the actual question a timesheet gets asked ("what have I logged lately?").
    {
      field: "period",
      label: "When",
      options: [
        { value: "7d", label: "Last 7 days" },
        { value: "30d", label: "Last 30 days" },
        { value: "90d", label: "Last 90 days" },
      ],
    },
  ],
}

/** ONE COLLECTION'S FACETS, ready for `<PagedFind facets=…>`: the labels through
 * the reader's own language (R28), the closed vocabularies' labels too, and the
 * row-backed ones filled in from what the screen already holds.
 *
 * `rows` is keyed by the same door parameter, so a screen says
 * `{ appId: appOptions }` and never has to know which position that facet sits
 * in. Its labels are DATA — an account's name, an app's name — and are handed
 * through untranslated, for the reason `translateRecipe` leaves `field.column`
 * alone: a company is not a sentence.
 *
 * A facet with nothing to offer is DROPPED rather than drawn, which is the rule
 * `withDataDrivenCollection` already applies to the bounded lists: an empty
 * dropdown is a control that can only disappoint. */
export function translatedFacets(
  key: string,
  t: (english: string) => string,
  /** THE DRAWN OPTION, not this file's plain pair — a screen may hand each one
   * the record's own mark (`FacetOption.mark`, shared/web/screen-engine/
   * config.ts: a pre-drawn node, never a colour or an icon name, because this
   * layer is read by both front doors and neither `ticketTypeColour` nor
   * `AppMark` lives somewhere it may import from). Widened on 2026-09-07 for
   * the tickets toolbar, whose four facets each wear the mark that record wears
   * everywhere else on the screen; a facet that hands a bare `{value,label}`
   * is unchanged and draws no mark, which every other call site does.
   *
   * THE MARK NEVER CARRIES THE MEANING: `useFilterBar` renders it `aria-hidden`
   * beside the word, so the WORD stays the whole accessible name. */
  rows: Record<string, DrawnFacetOption[]> = {}
): FilterFacet[] {
  const out: FilterFacet[] = []
  for (const facet of COLLECTION_FILTERS[key] ?? []) {
    const options = facet.options
      ? facet.options.map((o) => ({ value: o.value, label: t(o.label) }))
      : (rows[facet.field] ?? [])
    if (options.length === 0) continue
    out.push({
      field: facet.field,
      label: t(facet.label),
      control: "select",
      options,
      // THE CASCADE RIDES THROUGH UNNARROWED, and that is deliberate: this
      // function declares what a facet MAY offer over the whole collection,
      // and `useFilterBar` is the one place that narrows it to what the
      // parent leaves. Two narrowings would be two answers. Note also that
      // the "drop a facet with nothing to offer" rule above is asked of the
      // UNNARROWED list, which is the honest question — a team with apps has
      // an App filter whichever client is picked, and a client with none gets
      // the kit's own empty register inside the control rather than a control
      // that comes and goes as they change clients.
      ...(facet.dependsOn
        ? { dependsOn: { field: facet.dependsOn.field, emptyText: t(facet.dependsOn.emptyText) } }
        : {}),
    })
  }
  return out
}
