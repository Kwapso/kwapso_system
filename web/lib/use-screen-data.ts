"use client"

// useScreenData — the deep-link host's READ layer, lifted out of the component so
// the host reads as "fetch, then render" instead of a 70-line wall of queries.
//
// Every read is cache-first + null-keyed (a query whose key is null never fires),
// so a screen only fetches the modules it actually shows. The keys double as the
// live-sync + tab-count cache keys the rest of the app patches, so they must match
// the prefixes in pages.ts (LAW R8) and app-shell's realtime registry — don't
// rename one without the others. Roles / invites / dropdown values load across the
// whole team area (they back list + breadcrumb + a tab-count badge); members /
// tickets / accounts / team-meta load only on their own module.

import { content, tenancy } from "@/lib/api"
import type { TaskView } from "@/lib/live-resources"
import {
  accountsKey,
  appsKey,
  brandAssetsKey,
  companiesKey,
  cursorKey,
  helpKey,
  knowledgeKey,
  knowledgeShapeKey,
  listFetch,
  meetingsKey,
  purposesKey,
  sprintsKey,
  storiesKey,
  tasksKey,
  totalKey,
  workLogsKey,
} from "@/lib/live-resources"
import { SELECTABLE_GROUPS } from "@shared/selectable-groups"
import { ticketTypeKeptForMigration } from "@shared/types"
import { useRecordActivity } from "@/lib/use-record-activity"
import { primeCache, useCached, useCachedValue } from "@shared/web/store"
import { useAfterPaint } from "@shared/web/after-paint"

/** What the host needs to drive the reads: the resolved team, whether reads are
 * enabled (on-team + signed-in), the active module and the record id in view. */
export type ScreenDataInput = {
  teamId: string | null
  enabled: boolean
  module: string | null
  recordId: string | null
  /** THE MODULES THIS RECORD WAS OPENED INSIDE — the trail's ancestors, deepest
   * last, without the level being rendered.
   *
   * A list is loaded when its module is the one on screen, which was the whole
   * truth until an address could nest. On `/accounts/CONFIA/sprints/S1` the
   * module is `sprints`, so accounts never loaded, so the breadcrumb had no name
   * to show and said the word "Account" — with the client's name sitting on the
   * screen underneath it (the owner, 24 Aug 2026). An ancestor needs its list
   * for exactly the same reason the current module does: something on screen
   * says its name. */
  ancestorModules?: string[]
  /** which pile of our own admin the Tasks screen is showing — a SERVER view,
   * for the same reason (R14/R16). */
  taskView?: TaskView
  /** WHICH BODY THE KNOWLEDGE COLLECTION IS SHOWING — its list, or the picture
   * of the whole base. Declared up here for `taskView`'s own reason: the shape
   * is a DOOR, not a sieve over rows already loaded, so which body is on screen
   * decides which read happens. */
  knowledgeView?: string
}

/** Which TABLE a record under each agency-internal URL segment lives in — the
 * one place that translation is written down, so the record feed, the live
 * registry's `deps` and the activity gate map all name the same string. */
const INTERNAL_ACTIVITY_TABLE: Record<string, string> = {
  brand: "brand_assets",
  delivery: "programs",
  purposes: "meeting_purposes",
  // A task's segment and its table are one word, so this line looks redundant —
  // it is not. This map is what the record feed READS to decide it should fetch
  // anything at all, so a segment missing from it has an Activity tab with no
  // feed under it, silently.
  tasks: "tasks",
}

export function useScreenData({
  teamId,
  enabled,
  module,
  recordId,
  taskView = "open",
  knowledgeView = "list",
  ancestorModules = [],
}: ScreenDataInput) {
  /** Is this module ON SCREEN — as the level being rendered, or as one of the
   * records above it in the trail? The one question every `module === "x"` read
   * below was really asking, back when a URL could only hold one level. */
  const onScreen = (name: string) => module === name || ancestorModules.includes(name)
  // Per-team screen-recipe overrides (config store) — load across the team area.
  const overridesQ = useCached(enabled ? `screens:${teamId}` : null, () =>
    tenancy.screenOverrides().then((r) => r.screens)
  )
  const membersQ = useCached(
    enabled && onScreen("members") ? `members:${teamId}` : null,
    () => tenancy.members().then((r) => r.members)
  )
  // ── THE THREE TEAM-WIDE READS, AND WHY THEY NOW WAIT ────────────────────────
  //
  // Roles, invites and the dropdown values are read across the WHOLE team area
  // rather than on their own screens, because they back count badges on the
  // section tabs as well as their own lists. That is right, and it had one
  // cost: they left in the same commit as the read of whatever record a person
  // had actually opened, so a cold deep link from an email (R30) waited on three
  // requests about the team before it could show one row. A count badge is
  // secondary content by definition — it is a number beside a word, on a tab
  // nobody has pressed.
  //
  // `teamWide` is false on the commit that paints and true from the browser's
  // next idle moment (shared/web/after-paint.ts), so the badges arrive a beat
  // after the record instead of in front of it. Their own SCREENS are unaffected
  // in any way a person can see: those read the same cache keys and the same
  // beat is spent inside a skeleton they were already drawing.
  //
  // The listFetch fetchers ALSO prime each collection's exact `total:` sidecar (R16).
  // Called unconditionally — `enabled` flips from false to true on this very
  // path, and a hook behind a short-circuit is a hook that changes order.
  const painted = useAfterPaint()
  const teamWide = enabled && painted
  const rolesQ = useCached(teamWide ? `member_roles:${teamId}` : null, () =>
    listFetch.roles(teamId as string)
  )
  const invitesQ = useCached(teamWide ? `invites:${teamId}` : null, () =>
    listFetch.invites(teamId as string)
  )
  const metaQ = useCached(enabled && module === "team" ? `team-meta:${teamId}` : null, () =>
    tenancy.teamMeta()
  )
  // Tickets backs its list, the breadcrumb label and the ticket thread. R14: the
  // list is a PAGE, so My/All is a SERVER scope with its own cache — filtering a
  // loaded page client-side would disagree with the exact badge above it (R16).
  // The All cache is still the one the live registry patches row-by-row.
  const helpQ = useCached(enabled && module === "tickets" ? helpKey(teamId as string, "all") : null, () =>
    listFetch.help(teamId as string)
  )
  // Accounts back their list, the breadcrumb label and the record screen. R14:
  // the list is a PAGE — page one lands here, its next cursor in the sidecar
  // <LoadMore> reads. Row-level live: a change patches the one account in place.
  //
  // CONTACTS READS THE SAME CACHE. A contact is a row of this SAME table
  // (`accountType: "individual"`), so its own sidebar page (module "contacts")
  // narrows this exact list rather than asking a second door — see
  // `contactsListRecipe` in lib/screens.ts and the "contacts" branch in
  // collection-content.tsx.
  const accountsQ = useCached(
    enabled && (onScreen("accounts") || onScreen("contacts")) ? accountsKey(teamId as string) : null,
    () => listFetch.accounts(teamId as string)
  )
  // The knowledge base backs its list, the breadcrumb label and one source's
  // screen. R14: PAGED, like accounts and tickets — page one lands here and its
  // next cursor in the sidecar. Row-level live: a change patches one source.
  const knowledgeQ = useCached(
    enabled && onScreen("knowledge") ? knowledgeKey(teamId as string) : null,
    () => listFetch.knowledge(teamId as string)
  )
  // THE SAME COLLECTION AS A PICTURE — the Shape view of the knowledge base.
  //
  // ASKED ONLY WHEN SOMEBODY IS LOOKING AT IT, which is what the null key means
  // here: the List view is the default, so a reader who never touches the switch
  // never pays for this door. It is a whole-corpus read (bounded, but the widest
  // one the knowledge section has), so making it lazy is the difference between
  // one extra request per person who wants the picture and one per visit to the
  // section.
  //
  // NOT NARROWED FROM HERE. The door takes a `compartment`, but the toolbar's
  // facets live inside `PagedFind` and this hook runs above it; the whole-base
  // picture is the one this screen asks for, and narrowing is what the reader
  // does by opening an account. Said out loud so the missing argument reads as a
  // decision rather than an omission.
  const knowledgeShapeQ = useCached(
    enabled && onScreen("knowledge") && knowledgeView === "shape"
      ? knowledgeShapeKey(teamId as string, null)
      : null,
    () => content.knowledgeShape()
  )
  // EVERY COMPANY, as a safety net for the list's "filed under" names —
  // 2026-08-31: `accountsQ` above is gated to the accounts/contacts screens, so
  // it was `undefined` while browsing Knowledge and every source's account
  // name fell to "An account" whether or not it was in page one. `companiesKey`
  // (waves-screen.tsx's own fix for the same paged-list problem) asks the
  // door the narrow question directly rather than depending on another
  // screen's cache having warmed it first.
  const companiesQ = useCached(
    enabled && onScreen("knowledge") ? companiesKey(teamId as string) : null,
    () => tenancy.accounts({ type: "entity" }).then((r) => r.accounts)
  )
  // ── THE WORK ENGINE'S FOUR ───────────────────────────────────────────────
  // Each loaded only on its own section (cache-first + row-level live), so
  // opening Tasks costs one call rather than four. The RECORD screens read
  // through these same keys — an app's detail comes out of the bounded set the
  // list already holds — which is why they are keyed by team here rather than by
  // record, and why a slice narrowed to one record gets a key of its own instead
  // (see sliceKey in components/work/work-panels.tsx).
  const storiesQ = useCached(enabled && onScreen("stories") ? storiesKey(teamId as string) : null, () =>
    listFetch.stories(teamId as string)
  )
  const sprintsQ = useCached(enabled && onScreen("sprints") ? sprintsKey(teamId as string) : null, () =>
    listFetch.sprints(teamId as string)
  )
  const appsQ = useCached(enabled && onScreen("apps") ? appsKey(teamId as string) : null, () =>
    listFetch.apps(teamId as string)
  )
  // OUR OWN ADMIN, in SIX SERVER views — overdue, the everyday list, the
  // calendar, the completed, the upcoming, and everything. Two of them shipped
  // with the door and the screen sent neither, so the app could show one pile of
  // a six-pile collection.
  //
  // WHICHEVER TAB IS OPEN is fetched by the SCREEN, on its own view's key, and
  // every other view's count comes back with it (R16) — six fetches to badge six
  // tabs would be six answers to one question. What is read here is the everyday
  // list the live registry patches row-by-row, plus the whole pile behind it.
  //
  // The ALL list is what the RECORD screen reads, and that is not an
  // optimisation: ticking a task off the open list removes it from the open
  // list, so a detail screen sourced from that collection would answer "that
  // record no longer exists" the moment you used the button on it.
  const tasksOpenQ = useCached(
    enabled && onScreen("tasks") ? tasksKey(teamId as string, "open") : null,
    () => listFetch.tasks(teamId as string, "open")
  )
  const tasksAllQ = useCached(
    enabled && module === "tasks" && (taskView === "all" || !!recordId)
      ? tasksKey(teamId as string, "all")
      : null,
    () => listFetch.tasks(teamId as string, "all")
  )
  // TIME. Loaded only on its own section, like the four above it. R14: PAGED —
  // 2,940 rows arrived from two years of the previous system and every piece of
  // work produces several more, so page one lands here and its next cursor in
  // the sidecar <LoadMore> reads.
  const workLogsQ = useCached(
    enabled && module === "time" ? workLogsKey(teamId as string) : null,
    () => listFetch.workLogs(teamId as string)
  )
  // THE MEETINGS LIST. Loaded only on its own section, cache-first + row-level live. R14:
  // PAGED like tickets and sources — page one lands here and its next cursor in
  // the sidecar <LoadMore> reads. The RECORD screen reads through this same key
  // and falls back to a by-id read when the loaded prefix doesn't reach it.
  const meetingsQ = useCached(enabled && onScreen("meetings") ? meetingsKey(teamId as string) : null, () =>
    listFetch.meetings(teamId as string)
  )
  // ── THE AGENCY'S OWN HOUSEKEEPING ────────────────────────────────────────
  // Two capped collections, each loaded only on its own module (cache-first +
  // row-level live). Meeting purposes also load on the Meetings section, because
  // the screen that offers the "meeting purposes" button has to know how many
  // there are before you press it.
  const brandQ = useCached(enabled && module === "brand" ? brandAssetsKey(teamId as string) : null, () =>
    listFetch.brandAssets(teamId as string)
  )
  const onPurposes = module === "purposes" || module === "meetings"
  const purposesQ = useCached(enabled && onPurposes ? purposesKey(teamId as string) : null, () =>
    listFetch.purposes(teamId as string)
  )
  // Staff profiles + certificates are NOT read here. They are read by the panel
  // on the member's own page (staff-panel.tsx), cache-first on the same keys the
  // live registry patches — the same shape every bespoke record screen uses, and
  // the right one for a collection that only ever appears on one screen.
  // The team's dropdown values — feed the ticket and sprint forms' Type pickers
  // AND the Dropdown-values tab's count badge, so load them across the team area
  // (cache-first + live, like roles/invites, so the count stays honest).
  const formSelectableQ = useCached(
    teamWide ? `selectable:${teamId}` : null,
    () => listFetch.selectable(teamId as string)
  )
  // R16: the exact server totals the badges show (primed by the fetchers above;
  // bumped ±1 by add/remove pings; re-primed on reconnect). NEVER rows.length.
  const totals = {
    member_roles: useCachedValue<number>(enabled ? totalKey("member_roles", teamId as string) : null),
    invites: useCachedValue<number>(enabled ? totalKey("invites", teamId as string) : null),
    selectable: useCachedValue<number>(enabled ? totalKey("selectable", teamId as string) : null),
    help: useCachedValue<number>(enabled ? totalKey("help", teamId as string) : null),
    accounts: useCachedValue<number>(enabled ? totalKey("accounts", teamId as string) : null),
    // The Companies / Contacts / All strip's other two badges — exact, from the
    // same read as the rows, and both zero-safe: without the contacts right the
    // contacts count comes back 0 beside a list with no contacts in it.
    accountsEntity: useCachedValue<number>(enabled ? totalKey("accounts-entity", teamId as string) : null),
    accountsIndividual: useCachedValue<number>(
      enabled ? totalKey("accounts-individual", teamId as string) : null
    ),
    knowledge: useCachedValue<number>(enabled ? totalKey("knowledge", teamId as string) : null),
    // R16: the exact server total the process-maps heading badges. Primed by the
    // same fetcher that loads page one, so the number and the rows agree.
    processes: useCachedValue<number>(enabled ? totalKey("processes", teamId as string) : null),
    // R16: the exact server totals of the work engine's four collections, each
    // primed by the fetcher that loaded its own rows so the number and the rows
    // can never disagree. The story total's prefix is `stories` — the same word
    // the worker publishes as a resource — so the shell's ±1 bump on an add
    // lands on the sidecar the heading actually reads.
    stories: useCachedValue<number>(enabled ? totalKey("stories", teamId as string) : null),
    sprints: useCachedValue<number>(enabled ? totalKey("sprints", teamId as string) : null),
    apps: useCachedValue<number>(enabled ? totalKey("apps", teamId as string) : null),
    // OUR OWN ADMIN, six views and one progress pair — every number exact, every
    // one primed by whichever view's fetch landed, so the badge on a tab nobody
    // has opened is still the server's answer rather than a guess.
    tasks: useCachedValue<number>(enabled ? totalKey("tasks", teamId as string) : null),
    tasksAll: useCachedValue<number>(enabled ? totalKey("tasks-all", teamId as string) : null),
    tasksOverdue: useCachedValue<number>(enabled ? totalKey("tasks-overdue", teamId as string) : null),
    tasksUpcoming: useCachedValue<number>(enabled ? totalKey("tasks-upcoming", teamId as string) : null),
    tasksCompleted: useCachedValue<number>(enabled ? totalKey("tasks-completed", teamId as string) : null),
    tasksCalendar: useCachedValue<number>(enabled ? totalKey("tasks-calendar", teamId as string) : null),
    tasksDueToday: useCachedValue<number>(enabled ? totalKey("tasks-due-today", teamId as string) : null),
    tasksDueTodayDone: useCachedValue<number>(
      enabled ? totalKey("tasks-due-today-done", teamId as string) : null
    ),
    // The exact ROW count of the time list, which is what the sidebar badges and
    // what the Time page's heading says. The HOURS are a different number and
    // live in their own sidecar (`work-seconds`), read by the panel itself.
    workLogs: useCachedValue<number>(enabled ? totalKey("work-logs", teamId as string) : null),
    meetings: useCachedValue<number>(enabled ? totalKey("meetings", teamId as string) : null),
    // The agency's own housekeeping — the exact server totals the sidebar badges
    // and the collection headings show, primed by the fetchers above.
    brand_assets: useCachedValue<number>(enabled ? totalKey("brand_assets", teamId as string) : null),
    purposes: useCachedValue<number>(enabled ? totalKey("purposes", teamId as string) : null),
    staff_certificates: useCachedValue<number>(enabled ? totalKey("staff_certificates", teamId as string) : null),
    // Our own cost card. Like the staff certificates above, its rows are read by
    // the screen that shows them (internal-rate-card.tsx) rather than here — one
    // small settled list nothing else needs — so this is a cache READ that badges
    // the team tab once that screen has primed it.
    internal_rates: useCachedValue<number>(enabled ? totalKey("internal_rates", teamId as string) : null),
  }
  const selectableValues = formSelectableQ.data ?? []
  // The list now includes DEACTIVATED values (so the manager can reactivate them),
  // so every form PICKER filters to `active` — a retired value never appears as a
  // pickable option (but old rows that referenced it still read truthfully).
  const activeSelectable = selectableValues.filter((v) => v.active)
  // The pickers on the agency-internal forms. Every one is a PICK-OR-CREATE
  // field, so these options are a convenience and never a constraint: typing a
  // department nobody has used adds it to the vocabulary rather than being
  // refused.
  const brandCategoryOptions = activeSelectable
    .filter((v) => v.type === SELECTABLE_GROUPS.brandCategory)
    .map((v) => v.value)
  const departmentOptions = activeSelectable
    .filter((v) => v.type === SELECTABLE_GROUPS.department)
    .map((v) => v.value)
  // …MINUS THE KIND THAT IS KEPT BUT NEVER SHOWN. This one list is the whole
  // tickets screen's idea of what kinds exist: the create form's picker, the
  // toolbar's Kind facet, the sub-tab strip (CHECKLIST 5.1 derives it from these
  // words) and the dashboard's legend and pipeline order all read it. The DOOR
  // already refuses to answer about a requirements ticket and refuses to create
  // one (`TICKET_TYPE_KEPT_FOR_MIGRATION`, shared/types.ts, carries the client's
  // ruling in full) — subtracting it here is what stops the word itself
  // appearing: an option nobody may pick, and a sub-tab that would badge nothing
  // for ever because the door it counts through has already excluded its rows.
  //
  // It is a filter on the TEAM'S OWN vocabulary and never an edit to it: every
  // team already running still has the row, still sees it on the Dropdown values
  // screen, and every ticket that carries the word still carries it.
  const helpTypeOptions = activeSelectable
    .filter((v) => v.type === "Ticket type" && !ticketTypeKeptForMigration(v.value))
    .map((v) => v.value)

  // Activity is one read path over three scopes (team / a member / an invite) — the
  // scope is derived from what's in view, and its cache key mirrors the scope so a
  // live ping refreshes the right feed.
  // (An account's own history is read by its record screen through the generic
  // record path — it isn't one of the three scopes this feed covers.)
  const activityScope: "team" | "user" | "invite" | null =
    module === "team"
      ? "team"
      : module === "members" && recordId
        ? "user"
        : module === "invites" && recordId
          ? "invite"
          : null
  const activityKey =
    !enabled || !activityScope
      ? null
      : activityScope === "team"
        ? `activity:team:${teamId}`
        : `activity:${activityScope}:${recordId}`
  // R14: the feed is PAGED — page one lands here and parks its next cursor in the
  // sidecar <LoadMore> reads; R16: its exact (permission-filtered) total rides along.
  const activityQ = useCached(activityKey, () =>
    tenancy
      .activity(activityScope ?? "team", activityScope === "team" ? undefined : (recordId ?? undefined))
      .then((r) => {
        primeCache(cursorKey(activityKey as string), r.nextCursor)
        primeCache(`total:${activityKey}`, r.total)
        return r.activity
      })
  )
  // R16: the number the DETAIL's activity door prints — the same exact, already-
  // permission-filtered total the fetch above primed, read as a sidecar so the
  // door and the feed can never disagree. Undefined until page one lands, which
  // formatCount renders as nothing. It badged an Activity TAB until the client
  // killed those (2026-09-06); the number and its argument are unchanged by the
  // move, only the place it is printed.
  const activityTotal = useCachedValue<number>(activityKey ? `total:${activityKey}` : null)
  // R14 — PAGE TWO OF WHICHEVER SCOPE FEED IS IN VIEW, spending the cursor the
  // fetch above parked. It lives here rather than at the host because the door
  // it is asked through (`<ActivityRail>`, off the record footer's Latest
  // activity column) must page THE SAME feed under THE SAME key: a fetcher
  // built beside the control could quietly ask a different scope, and the
  // reader would get somebody else's history appended to their own. Same three
  // arguments as page one, plus the cursor, from the one call.
  const activityFetchPage = (cursor: string) =>
    tenancy
      .activity(
        activityScope ?? "team",
        activityScope === "team" ? undefined : (recordId ?? undefined),
        cursor
      )
      .then((r) => ({ rows: r.activity, nextCursor: r.nextCursor }))
  // THE GENERIC (table, id) RECORD FEED — Law R5, for the four agency-internal
  // details. The three scopes above (team / user / invite) are the base's older
  // fixed ones, named at the door; a module written today reads its history the
  // generic way, and this map is the only thing that has to know which table a
  // URL segment's records live in.
  const internalTable = recordId ? (INTERNAL_ACTIVITY_TABLE[module ?? ""] ?? null) : null
  const internalActivity = useRecordActivity(enabled ? internalTable : null, recordId)
  // The invite-detail audit (inviter snapshot + acceptance) — only when viewing
  // one invite. Cache-first + live (a revoke/accept ping refreshes its invite row).
  const inviteAuditQ = useCached(
    enabled && module === "invites" && recordId ? `invite-audit:${recordId}` : null,
    () => tenancy.inviteAudit(recordId as string)
  )

  return {
    overridesQ,
    accountsQ,
    knowledgeQ,
    knowledgeShapeQ,
    companiesQ,
    storiesQ,
    sprintsQ,
    appsQ,
    tasksOpenQ,
    tasksAllQ,
    workLogsQ,
    meetingsQ,
    membersQ,
    rolesQ,
    invitesQ,
    metaQ,
    helpQ,
    totals,
    formSelectableQ,
    selectableValues,
    helpTypeOptions,
    brandQ,
    purposesQ,
    brandCategoryOptions,
    departmentOptions,
    activityScope,
    activityKey,
    activityQ,
    activityTotal,
    activityFetchPage,
    internalActivity,
    inviteAuditQ,
  }
}
