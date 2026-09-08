"use client"

// The deep-link resolver — ONE static shell backs the whole /t/* tree. It reads
// /t/<teamId>/<module>/<id>?panel|confirm from the URL (client-side — static
// export can't prerender ids), switches to that team if the link came from
// elsewhere, fetches each module's data + the caller's rights through the
// permission-checked endpoints, shapes it for the recipe, and renders the
// library ScreenRenderer. The engine emits open/close intents and named actions;
// the host maps intents to URL changes and dispatches actions to the API.
//
// This file is the SPINE — where are we, whose team is it, what did we load, and
// what does the screen look like. The parts each live next door, so you can open
// the one you need:
//   deep-link/use-host-nav      the URL: read it, and change it without a reload
//   deep-link/use-route-team    which team the screen runs against, and may you
//   deep-link/use-trace-ring    the assistant's "here's what I changed" glance
//   deep-link/crumbs            the breadcrumb trail
//   deep-link/module-content    the render half — which screen for which module
//   deep-link/write-panels      the write half — the ?panel / ?confirm dialogs
//
// Write UI is URL-driven (?panel / ?confirm) so Back closes it and links are
// shareable; it reuses the existing tested dialogs. The role permission grid has
// no engine block, so its detail is host-composed (role-detail.tsx).

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  type ScreenActionContext,
  type ScreenIntent,
} from "@shared/web/screen-engine/screen-renderer"
import { type ScreenQuery, type ScreenRights } from "@shared/web/screen-engine/recipe"

import { AppShell, ShellLoading } from "@/components/shell/app-shell"
import { useMarkHold } from "@shared/web/mark-loader"
import { TeamSectionNav } from "@/components/shell/team-section-nav"
import { CountedTabs } from "@/components/records/counted-tabs"
import { buildCrumbs, namedByList } from "@/components/deep-link/crumbs"
import { useTrailNames } from "@/components/deep-link/trail-names"
import { renderModuleContent } from "@/components/deep-link/module-content"
import { ACCOUNT_MODULES, sectionFor, trailPath, type SectionKey } from "@/components/deep-link/route"
import { useHostNav, useUrlRoute } from "@/components/deep-link/use-host-nav"
import { useScrollMemory } from "@/components/deep-link/use-scroll-memory"
import { useRouteTeam } from "@/components/deep-link/use-route-team"
import { useTraceRing } from "@/components/deep-link/use-trace-ring"
import { WritePanels } from "@/components/deep-link/write-panels"
import { HomeScreen } from "@/components/screens/home-screen"
import { ProfileScreen } from "@/components/screens/profile-screen"
import { KwapsoScreen } from "@/components/screens/kwapso-screen"
import { SettingsScreen } from "@/components/screens/settings-screen"
import { InvitationsScreen } from "@/components/screens/invitations-screen"
import { toast } from "@shared/ui/components/sonner/sonner"

import { ApiFailure } from "@/lib/api"
import type { TaskView } from "@/lib/live-resources"
import { registerHostGo } from "@/lib/nav"
import { readSlot, rememberPath, writeSlot } from "@/lib/nav-memory"
import {
  closeTab,
  setWorkspaceScope,
  useOpenTabs,
  tabStripState,
  visitTrail,
  type OpenTab,
} from "@/lib/workspace-tabs"
import { RememberedScreen } from "@shared/web/remembered"
import { usePermissions } from "@/lib/perms"
import { useScreenData } from "@/lib/use-screen-data"
import { useScreenActions } from "@/lib/use-screen-actions"
import { useActiveTeam } from "@/lib/use-active-team"
import { TEAM_SECTIONS, type Crumb } from "@/lib/pages"
import { useLanguage } from "@shared/web/language"
import { useAfterPaint } from "@shared/web/after-paint"

/** THE ACCOUNT SCREENS' OWN NAMES, so they can be tabs like everything else.
 *
 * `buildCrumbs` (deep-link/crumbs.ts) reads `TEAM_SECTIONS` and knows nothing
 * about /settings or /profile — those five screens render straight in the shell
 * and have always built their one crumb by hand, in the branch below. The words
 * are lifted from that branch unchanged, so nothing new is said to anybody:
 * every one of them is already in the catalogue, and `t(…)` is applied at the
 * READ (below) exactly as it is for `sectionTitle`'s own words.
 *
 * WELCOME IS DELIBERATELY ABSENT. It has never carried a crumb — it is the
 * app's front door, the thing the brand mark goes to — so it has no tab either,
 * and standing on it leaves the tab set untouched rather than adding a rung
 * saying "you are at the beginning". */
const ACCOUNT_TAB_TITLE: Record<string, string> = {
  settings: "Settings",
  kwapso: "Kwapso",
  invitations: "Invites",
  profile: "Your profile",
}

/** IS THERE ROOM FOR A TAB STRIP — the whole of the workspace tabs' mobile
 * ruling, as one boolean.
 *
 * There is no room on a phone, and the kit has already said so about this exact
 * strip: below `md`, `BreadcrumbFolders` stops drawing tabs entirely and draws
 * the plain text trail instead (client, 2026-09-04, "in monile, lets use normal
 * breadcrumbs… jhust teh text"). A set of OPEN TABS rendered as a run of words
 * separated by dots is not a smaller tab strip, it is a lie about what those
 * words are — they would read as a path and be a workspace.
 *
 * So the model is OFF below `md`, and off means off: the shell draws the
 * ordinary trail, and nothing calls `visitTrail`, so a phone session
 * accumulates no set at all rather than filling one up invisibly behind a strip
 * that never shows it. A tablet or a rotated phone crossing the breakpoint
 * picks the model up from that moment, with whatever this device had stored.
 *
 * `48rem` IS THE KIT'S OWN `md` AND NOT A SECOND NUMBER — the width where
 * `ScreenShell` puts the rail away and where the strip swaps for the text
 * trail. A media query resolves font-relative units against the INITIAL font
 * size (16px), never the app's own root, so this and the CSS gate flip at the
 * same 768 CSS px and cannot drift.
 *
 * IT STARTS FALSE AND IS ANSWERED IN AN EFFECT, which is the safe direction of
 * that guess: the server renders no tabs, the first client render matches it,
 * and the shell falls back to the ordinary trail — the same thing a phone gets
 * and the same thing this product drew before tabs existed. A wide screen then
 * has one extra render. The opposite default would flash a tab strip onto a
 * phone. */
function useRoomForTabs(): boolean {
  const [wide, setWide] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 48rem)")
    const read = () => setWide(query.matches)
    read()
    query.addEventListener("change", read)
    return () => query.removeEventListener("change", read)
  }, [])
  return wide
}

export function DeepLinkScreen() {
  const active = useActiveTeam()
  const { t, lang } = useLanguage()
  const router = useRouter()

  /* -------------------------------- where am I ------------------------------- */

  const { route, setRoute } = useUrlRoute()
  const urlTeamId = route?.teamId || null
  const module = route?.module ?? null
  const recordId = route?.recordId ?? null
  const query = route?.query ?? {}
  const topLevel = route?.topLevel ?? false

  // Top-level pages (/tickets, /accounts) run against the ACTIVE team (like /home);
  // /t/<id> URLs name their team explicitly, so only those switch teams.
  const { teamId, onTeam, enabled, isMemberOfUrlTeam, teamCount, noAccess } = useRouteTeam({
    active,
    urlTeamId,
    router,
  })
  const { perms, error: permsError, can } = usePermissions(enabled ? teamId : null)

  /* --------------------------------- the data -------------------------------- */

  // Which pile of our own admin the Tasks screen shows. A SERVER view for the
  // same reason (the list is capped, so "the done ones" is a question for the
  // door, not a sieve over the rows already loaded), so it is declared here too.
  const [taskView, setTaskView] = React.useState<TaskView>("open")

  // Per-module data — cache-first + null-keyed (a screen fetches only the modules
  // it shows). Lifted into one hook so the host reads as "fetch, then render".
  const {
    overridesQ,
    accountsQ,
    knowledgeQ,
    companiesQ,
    membersQ,
    rolesQ,
    invitesQ,
    metaQ,
    helpQ,
    brandQ,
    purposesQ,
    storiesQ,
    sprintsQ,
    appsQ,
    tasksOpenQ,
    tasksAllQ,
    workLogsQ,
    meetingsQ,
    brandCategoryOptions,
    departmentOptions,
    internalActivity,
    totals,
    helpTypeOptions,
    activityScope,
    activityKey,
    activityQ,
    activityTotal,
    activityFetchPage,
    inviteAuditQ,
  } = useScreenData({
    teamId,
    enabled,
    module,
    recordId,
    taskView,
    // The records this one was opened INSIDE. Their lists back the breadcrumb's
    // labels, so a nested address that does not ask for them shows the word
    // "Account" above a screen already displaying the client's name.
    ancestorModules: (route?.levels ?? []).slice(0, -1).map((l) => l.module),
  })

  const roles = rolesQ.data ?? []
  const activeRoles = roles.filter((r) => r.active)
  const rights: ScreenRights = perms ?? {}

  /* ------------------------------- navigation ------------------------------- */

  // The base URL for the current screen — a clean top-level path (/tickets) or the
  // team-scoped form (/t/<teamId>/<module>). go() / breadcrumbs / closePanel build
  // off these, so intra-screen nav stays in whichever form you arrived through.
  const teamPath = teamId ? `/t/${teamId}` : "/"
  const moduleBase = topLevel
    ? `/${module}`
    : module && module !== "team"
      ? `/t/${teamId}/${module}`
      : teamPath
  // ── THE ADDRESS OF THIS SCREEN, WITH EVERYTHING IT WAS OPENED INSIDE ────────
  //
  // THE OWNER, 24 Aug 2026, after going Accounts → Confia → Apps → CONFIA →
  // Sprints → a sprint and landing on `/apps/…/sprints/…`: "that middle screen
  // that I went to has just been erased. I spoke about nesting, not replacing."
  //
  // `moduleBase` above is built from the CURRENT MODULE alone, which is correct
  // for a flat address and wrong for every nested one: at
  // `/accounts/CONFIA/apps/A1` the module is `apps`, so the base came out
  // `/apps` and the client was gone before a single link was built. The detail
  // screen then handed its panels that truncated base, so the NEXT hop appended
  // to a path that had already lost a level — one hop in, and the trail was one
  // level long again. That is why nesting appeared to work and then quietly
  // stopped: nothing was capping the depth, each screen was resetting it.
  //
  // Both are derived from the TRAIL now, through the same `trailPath` the
  // breadcrumbs use, so the shell and the crumbs cannot disagree about where a
  // nested record lives. `sectionPath` is the deepest level's COLLECTION IN
  // CONTEXT (`/accounts/CONFIA/apps`) — a detail screen appends its own id to it
  // and passes that down, so the level after it appends rather than restarts,
  // for as many levels as somebody goes.
  //
  // A flat address is untouched: one level in, `trailPath` returns exactly what
  // `moduleBase` did, which is why nothing else on this screen had to change.
  const trail = route?.levels ?? []
  const sectionPath = trail.length
    ? trailPath(trail, teamPath, topLevel, { withRecord: false })
    : moduleBase
  const currentPath = trail.length ? trailPath(trail, teamPath, topLevel) : moduleBase

  // ── THE NAMES THE TRAIL SAYS OUT LOUD ──────────────────────────────────────
  //
  // The lists a crumb can read a record's name out of, and then the levels NONE
  // of them holds, read by id. Both live up here rather than beside buildCrumbs
  // because the resolver is a hook and there are early returns below — and a
  // crumb is one of the few things this screen still owes a person while it is
  // deciding what else to render.
  //
  // A list is the FAST path, never the only one: every one of these is paged, so
  // a client far enough down the collection is simply not in it, and the crumb
  // used to fall back to the word "Account" above a screen already displaying
  // the client's name. trail-names.ts carries the day that was caught.
  const crumbRecords = {
    accounts: accountsQ.data,
    members: membersQ.data,
    roles,
    invites: invitesQ.data,
    knowledge: knowledgeQ.data,
    apps: appsQ.data,
    sprints: sprintsQ.data,
    stories: storiesQ.data,
    // The ALL list, so a FINISHED task's breadcrumb still says its name rather
    // than falling back to an id — it loads whenever a record is open.
    tasks: tasksAllQ.data ?? tasksOpenQ.data,
    meetings: meetingsQ.data,
  }
  // AFTER THE PAINT. A crumb whose name is not in any loaded list is read one
  // record at a time, and on a cold deep link that read leaves BESIDE the read
  // of the record the person came for — the same URL twice, under two cache
  // keys, so the store cannot join them. The crumb already draws its fallback
  // word while the name is unknown (trail-names.ts says so), so waiting costs a
  // word for a moment and saves a request from in front of the record.
  const named = useAfterPaint()
  const resolvedNames = useTrailNames(trail, (m, id) => !!namedByList(m, id, crumbRecords), enabled && named)

  const { go: routeTo, replace: routeToInPlace, closePanel } = useHostNav({
    router,
    setRoute,
    currentPath,
  })

  // ── WHERE SHE WAS ──────────────────────────────────────────────────────────
  //
  // THE DESIGNER, 27 Aug 2026, on going four records deep into Apps, stepping
  // into To-dos to jot something down, and coming back to the top of a list with
  // her search, her filters and her place in it all gone: she multitasks
  // constantly, so she pays that price a dozen times a day.
  //
  // Three lines here, because the architecture had already done the hard part.
  // This shell mounts ONCE (R37), so there is somewhere for a memory to live;
  // nesting already lives in the URL (`trailPath` above), so the whole trail is
  // one string; and the per-screen state — the open tab, the search box, the
  // filters — reaches its own screen through a context rather than being
  // threaded down. `web/lib/nav-memory.ts` holds the store, its ceilings and the
  // reasoning about both.
  //
  // NOTHING HERE REDIRECTS. This records the address it is given and hands the
  // screen its own memory back; it never rewrites where somebody asked to go.
  // That is what keeps a deep link pasted from outside sacred (a pasted link
  // arrives in a NEW document, where this store is empty anyway) and it is why
  // the recall lives on the rail, where a person clicks a SECTION rather than a
  // destination — see `app-shell.tsx`.
  //
  // THE ADDRESS THE MEMORY IS KEYED BY is the path plus the ONE query parameter
  // that is a screen state rather than a dialog. `?tab=` genuinely names a
  // different collection on the accounts screen (companies · contacts · all);
  // `?panel` / `?confirm` / `?id` are a dialog opened OVER this screen and
  // closed by Back, and remembering one would mean re-opening somebody's
  // half-finished edit form for them.
  const memoryPath = currentPath + (query.tab ? `?tab=${encodeURIComponent(query.tab)}` : "")
  const captureScroll = useScrollMemory(teamId, memoryPath)
  // The scroll positions of the screen we are LEAVING have to be read while it
  // is still on the page, so both movers capture first and then move. Every
  // deliberate move in the app is one of these two (R37 sees to that), so there
  // is no third place to remember.
  const go = React.useCallback(
    (path: string, q?: ScreenQuery) => {
      captureScroll()
      routeTo(path, q)
    },
    [captureScroll, routeTo]
  )
  const replace = React.useCallback(
    (path: string) => {
      captureScroll()
      routeToInPlace(path)
    },
    [captureScroll, routeToInPlace]
  )
  React.useEffect(() => {
    rememberPath(teamId, memoryPath)
  }, [teamId, memoryPath])
  const screenMemory = React.useMemo(
    () => ({
      read: (slot: string) => readSlot(teamId, memoryPath, slot),
      write: (slot: string, value: unknown) => writeSlot(teamId, memoryPath, slot, value),
    }),
    [teamId, memoryPath]
  )

  // Register THIS host's soft go() so deep components (the profile menu, team switcher,
  // invite inbox) navigate through the History API instead of router.push — no reload.
  React.useEffect(() => registerHostGo(go), [go])

  // ── WHAT SHE HAS OPEN ──────────────────────────────────────────────────────
  //
  // THE CLIENT, 2026-09-06: "i am in a detail app, but i click the first tab
  // 'apps' see all the apps but the detail where i was stays open… all tabs i
  // open stay open unless i close them."
  //
  // The whole model lives in `web/lib/workspace-tabs.ts` — the six decisions
  // (the URL, persistence, the ceiling, what a background tab costs, the phone,
  // and where closing lands) are argued there rather than here. This block is
  // the WIRING, and it is deliberately three facts and two effects:
  //
  //   · the trail, as tabs — one entry per crumb, so a cold deep link seeds a
  //     set identical to the trail this product already drew and the screen a
  //     person lands on looks exactly as it did yesterday;
  //   · the set, read back out of the store;
  //   · whether the strip is drawing the SET or the TRAIL.
  //
  // IT IS COMPUTED UP HERE, ABOVE THE EARLY RETURNS, because these are hooks
  // and the account screens return their own shell further down — the tab set
  // has to be the same one on both sides of that branch or /settings would
  // silently keep a second workspace.
  const roomForTabs = useRoomForTabs()
  // The crumbs, for BOTH branches. The account screens' one hand-built crumb
  // used to be computed inside their own branch; it is lifted here so the trail
  // and the tab set are built from one array rather than two.
  const teamName = active.ctx?.team?.name ?? "Team"
  const accountModule = ACCOUNT_MODULES.includes(module ?? "")
  const accountTitle = ACCOUNT_TAB_TITLE[module ?? ""]
  // THE GATE IS STILL GONE (Aurora, 2026-09-03 — the long note further down
  // this file, and web/test/nested-routes.test.ts, which reads these two lines
  // off the disk). Every module screen asks `buildCrumbs` for its trail, with
  // nothing in front of the ask; what moved on 2026-09-06 is only WHERE the ask
  // happens — up here with the hooks, because the workspace tab set is built
  // from the same array and the account screens return before the old position.
  const showCrumbs = true
  const crumbs = showCrumbs
    ? buildCrumbs({
        levels: trail,
        t,
        topLevel,
        module,
        recordId,
        teamName,
        teamPath,
        sectionPath,
        records: crumbRecords,
        resolved: resolvedNames,
      })
    : []
  // …and the five account screens' own single crumb, which `buildCrumbs` has
  // never known about (it reads `TEAM_SECTIONS`, and /settings is not one).
  // Lifted out of their branch below so the trail and the tab set are built
  // from ONE array on both sides of that early return.
  const screenCrumbs: Crumb[] = accountModule
    ? accountTitle
      ? [{ label: t(accountTitle) }]
      : []
    : crumbs
  // EVERY CRUMB IS A PLACE, AND ITS `href` IS THAT PLACE'S ADDRESS — except the
  // last, which is the page you are on and carries none by design (a crumb for
  // where you already are is not a link). So the current address fills that one
  // in, and the result is the trail expressed as tabs, outermost first.
  const tabEntries: OpenTab[] = screenCrumbs.map((crumb) => ({
    path: crumb.href ?? currentPath,
    label: crumb.label,
  }))
  // WHOSE TABS, IN WHICH TEAM. Both halves are in the key — see the store.
  const workspaceScope =
    active.user?.id && teamId ? `${active.user.id}:${teamId}` : null
  React.useEffect(() => {
    setWorkspaceScope(workspaceScope)
  }, [workspaceScope])
  // THE ENTRIES RIDE A REF AND THE EFFECT WATCHES A STRING. `tabEntries` is a
  // fresh array on every render, so naming it as a dependency would re-run this
  // on every render (and re-order the strip under somebody's pointer). What
  // actually changed is the ADDRESS and the NAMES along it — the names matter
  // because a crumb's label arrives late, after the by-id read in
  // `useTrailNames` lands, and that second pass is exactly when a tab's
  // remembered name gets corrected from "Account" to the client's own name.
  const entriesRef = React.useRef(tabEntries)
  entriesRef.current = tabEntries
  // THE SEPARATORS ARE WRITTEN AS ESCAPES, NOT AS RAW BYTES, and that is the
  // whole of why this line looks like this. They used to be typed literally:
  // one NUL and one SOH sitting in the source, which is legal TypeScript, is
  // the same string at runtime, and made THIS ENTIRE FILE — the deep-link
  // spine — read as `data` to `file(1)`, so plain `grep` skipped it in silence
  // rather than reporting a match. On 8 Sep 2026 that cost a whole review
  // cycle: a session grepping for the workspace-tab call sites found ZERO,
  // concluded the tab strip had been deleted by the merge, and filed it as a
  // shipped regression. The wiring was here the entire time, forty lines below.
  // Node reads the file fine, so every seam test stayed green and no law could
  // have caught it: the blindness is in the READER, not in the build.
  //
  // The escapes are the identical two characters at runtime and keep the file
  // ASCII, so a person and an agent can both still find what is in it. They are
  // still NUL and SOH on purpose: this key exists to be compared, and a
  // separator has to be a character a tab label cannot contain.
  const tabsKey = tabEntries.map((entry) => `${entry.path}\u0000${entry.label}`).join("\u0001")
  // NOT WHILE THE URL IS STILL UNREAD. `route` is null until the client has
  // read `window.location` (a static export cannot prerender an id), and until
  // then `buildCrumbs` answers the only question an empty trail allows — the
  // team overview. Opening a tab for that would put a place nobody asked for at
  // the front of the strip on every cold boot.
  const routeReady = !!route
  React.useEffect(() => {
    if (!roomForTabs || !workspaceScope || !routeReady) return
    visitTrail(entriesRef.current)
  }, [roomForTabs, workspaceScope, routeReady, tabsKey])
  const openTabs = useOpenTabs()
  // THE STRIP DRAWS THE SET ONLY WHEN THE SET CONTAINS THE ADDRESS.
  //
  // THIS USED TO ASK WHETHER THE LAST TAB WAS THE CURRENT ONE, and that was
  // right for exactly as long as the store re-ordered: while activating a tab
  // moved it to the end, "last" and "active" were one fact, and the kit's own
  // rule — the LAST tab is painted live, because that is the folder joint, the
  // tab that IS the card — held for free.
  //
  // Both halves of that changed on the same day, in opposite directions. The
  // store stopped re-ordering, so a tab holds the position it was opened in
  // (Chrome's behaviour, which is what was asked for); and the kit gained
  // `activeIndex`, so liveness no longer has to mean last. Between the two this
  // line became a trapdoor: step BACK to an earlier tab and the last entry is no
  // longer the address, so the whole set vanished and the strip silently became
  // an ordinary trail — the feature disappearing exactly when it was doing its
  // job. Nothing caught it, because each half was correct alone and no test
  // crossed the seam.
  //
  // So the question is now the one always meant: is the address IN the set. The
  // three ordinary moments where it is not are unchanged and still fall back to
  // the trail — the first paint (the store is empty until the effect above
  // runs), a phone (nothing is ever recorded), and Welcome, which has no crumb
  // and therefore no tab. That fallback is not a degraded state; it is what this
  // product drew before tabs existed.
  const { showTabSet, activeIndex: activeTabIndex } = tabStripState(
    openTabs,
    currentPath,
    roomForTabs
  )
  const stripCrumbs: Crumb[] = showTabSet
    ? openTabs.map((tab, index) => ({
        label: tab.label,
        // The live tab is the page you are on and carries no href, exactly as
        // the last crumb of a trail does; every other tab is a real link, so
        // middle-click and copy-address keep working on a workspace tab the way
        // they already do on a crumb (R37 — the shell intercepts the plain left
        // click and nothing else).
        //
        // BY ACTIVE, NOT BY POSITION — corrected 8 Sep 2026, and it is the last
        // line in this file that had not caught up with the paragraph above
        // `tabStripState`. That paragraph says it exactly: while activating a
        // tab moved it to the end, "last" and "active" were ONE fact, so asking
        // `index === openTabs.length - 1` was asking the right question in the
        // cheaper words. The store stopped re-ordering on the same day the kit
        // gained `activeIndex`, and this expression kept asking the old one — so
        // on any tab but the last, the LAST tab lost its href and could not be
        // clicked, while the tab you were already on kept a link to itself. The
        // owner reported it as "I cannot click the last tab", which is precisely
        // what it does. `activeTabIndex` is `tabStripState`'s own answer and is
        // already in scope three lines up; `showTabSet` is only true when it is
        // >= 0, so inside this branch it always names a real tab.
        href: index === activeTabIndex ? undefined : tab.path,
        closeKey: tab.path,
      }))
    : screenCrumbs
  // CLOSING ONE. The store decides where the survivors leave you; this only
  // MOVES when the tab that closed was the one being looked at — closing a
  // background tab must not navigate, which is the entire point of a background
  // tab.
  const closeWorkspaceTab = React.useCallback(
    (path: string) => {
      const landing = closeTab(path)
      if (path !== currentPath) return
      go(landing ?? sectionPath)
    },
    [currentPath, go, sectionPath]
  )

  // A CSS selector the agent asked us to ring briefly (the traced control).
  const traceHighlight = useTraceRing({ teamId, onTeam, go })

  /* -------------------------------- mutations ------------------------------- */

  // The write layer (named-action dispatcher + the rich-payload creators), lifted
  // into one hook. Each action calls the permission-checked endpoint, primes the
  // actor's cache and invalidates any changed sibling count; runAction throws on
  // failure so the calling dialog / confirm surfaces it.
  const {
    runAction,
    createHelp,
    createAccount,
    createKnowledge,
    uploadKnowledgeFile,
    saveInternalRecord,
    setInternalActive,
  } = useScreenActions(teamId)

  /* -------------------------- engine intent + action ------------------------- */

  function onIntent(intent: ScreenIntent) {
    if (intent.kind === "open") {
      // A CONTACT OPENS AT ITS ACCOUNT ADDRESS. A contact is one row of the SAME
      // `accounts` table a company is (SCOPE ch.03), read through the SAME door
      // and drawn by the SAME screen (account-detail.tsx hands an individual
      // straight to contact-detail.tsx) — so the Contacts list's own recipe
      // binds to "contacts" for ITS identity (its cache, its scroll memory), and
      // this is the one place that identity is translated back to the record's
      // real address. Never a second `/contacts/<id>` URL for a record that
      // already has one.
      const openModule = intent.module === "contacts" ? "accounts" : intent.module
      // Open a record in the SAME URL form we're in (clean top-level or /t-scoped).
      go(topLevel ? `/${openModule}/${intent.id}` : `/t/${teamId}/${openModule}/${intent.id}`)
    } else if (intent.kind === "close") {
      if (query.panel || query.confirm) closePanel()
      else router.back()
    }
    // tab intent: TabsView keeps its own state; URL-tab sync is a later milestone.
  }

  // An engine action → host. Confirming / input-gathering actions route to the
  // URL (?panel / ?confirm); the dialog or confirm there does the mutation.
  function onAction(actionId: string, ctx: ScreenActionContext) {
    const id = ctx.id ?? ""
    switch (actionId) {
      case "members.changeRole":
        go(currentPath, { panel: "edit", module: "members", id })
        break
      case "members.remove":
        go(currentPath, { confirm: "members.remove", id })
        break
      case "invites.revoke":
        go(currentPath, { confirm: "invites.revoke", id })
        break
      case "team.edit":
        go(currentPath, { panel: "edit", module: "team" })
        break
      // The agency's own housekeeping. Two modules, two actions each, and the
      // same routing every other write in this host uses: the action opens a
      // URL (?panel / ?confirm) and the dialog behind it does the mutation, so
      // Back closes it and the link is shareable.
      case "brand.edit":
      case "purpose.edit":
        go(currentPath, { panel: "edit", module: module as string, id })
        break
      // OUR OWN ADMIN, ticked off. The one action in this host that does NOT go
      // through the ?panel / ?confirm route, and deliberately: those exist for
      // writes that need input or a decision, and a tick needs neither. It is
      // also reversible, which is what makes a confirm on it pure ceremony.
      case "tasks.done": {
        const done = ctx.record?.status !== "Done"
        void runAction("tasks.done", { id, done: String(done) }).catch((err: unknown) => {
          toast.error(err instanceof ApiFailure ? err.message : t("Couldn't change that task."))
        })
        break
      }
      case "brand.archive":
      case "purpose.archive":
        go(currentPath, { confirm: `${module}.archive`, id })
        break
    }
  }

  /* --------------------------------- render -------------------------------- */

  // THE BOOT WAIT, HELD OPEN UNTIL THE MARK REACHES ITS ENDING. This is the one
  // place in the agency app where a person actually watches the loader, so it is
  // the one place that owes the composition a last beat: `useMarkHold` keeps the
  // frame up while `markExit` compresses whatever is left of the pass into at
  // most 700ms. It adds nothing when the loader never showed — a warm boot has
  // `active.loading` false on the first render and this returns false with it.
  // The two ShellLoading returns below are REDIRECT flickers, not waits, and are
  // deliberately not held: the ending is owed to a boot, not to a hop.
  const booting = active.loading || !active.ctx || !route
  if (useMarkHold(booting)) return <ShellLoading />
  // Said again, unchanged, because the line above is a BOOLEAN and this one is
  // the type narrowing: `active.ctx` and `route` are non-null from here down,
  // and only the original shape tells TypeScript so.
  if (active.loading || !active.ctx || !route) return <ShellLoading />

  // Account screens (/home, /settings, /invitations, /profile) render DIRECTLY in the shell — they
  // aren't team-scoped module content, so they skip the team tabs / queries / membership
  // gate below. Because they live inside this one never-unmounting shell, moving in and
  // out of them (and into /t) is soft History-API nav — no reload anywhere.
  if (accountModule) {
    // The one crumb these screens carry is built with everything else, above
    // (`ACCOUNT_TAB_TITLE` → `crumbs`), so an account screen is an ordinary tab
    // rather than a hole in the strip: standing on Settings with three records
    // open keeps all three, and Settings joins them.
    return (
      <AppShell
        active={active}
        breadcrumbs={stripCrumbs}
        onCloseCrumb={showTabSet ? closeWorkspaceTab : undefined}
        activeCrumbIndex={showTabSet ? activeTabIndex : undefined}
        onNavigate={go}
        activePath={currentPath}
      >
        {/* The account screens get a memory too — the Kwapso page is a record
            with tabs, and it is a rail destination like any other. */}
        <RememberedScreen memory={screenMemory}>
        {module === "home" && <HomeScreen active={active} />}
        {/* `?tab=` is the rail's own link into the record's OTHER two tabs
            (the new Kwapso section, client feedback 31 Aug 2026 — see NAV in
            lib/pages.ts) — KwapsoScreen reads it as the tab's INITIAL value,
            so an explicit link always wins over whatever was remembered from
            a previous visit. */}
        {module === "kwapso" && <KwapsoScreen active={active} initialTab={query.tab} />}
        {/* `?tab=` is the same rail-link mechanism the Kwapso screen's own
            `initialTab` already uses (see above) — e.g. `ManageDropdownsLink`
            opens `/settings?tab=choices` straight onto the Choices tab. */}
        {module === "settings" && <SettingsScreen active={active} initialTab={query.tab} />}
        {module === "profile" && <ProfileScreen active={active} />}
        {module === "invitations" && <InvitationsScreen active={active} />}
        </RememberedScreen>
      </AppShell>
    )
  }

  // About to be redirected: the membership guard sends us to /home when the URL
  // points at a team we're no longer in (we still have others). Show the loading
  // frame — NOT the shell bound to the auto-fallback team — so we never flash the
  // wrong team's name/logo in the header/breadcrumb during the hop.
  if (teamId && !isMemberOfUrlTeam && teamCount > 0) return <ShellLoading />

  const myUserId = active.user?.id ?? null
  // Import has no read-right of its own — it's gated per-target. You can reach it
  // if you can CREATE into any supported target (member roles, dropdown values,
  // accounts).
  const canImport =
    can("member_roles", "create") || can("selectable_data", "create") || can("accounts", "create")

  // The team tab strip. The NUMBER on each badge is an exact server total (LAW
  // R16): members from the active context's COUNT(*), everything else from the
  // `total:` sidecar each list door returns — NEVER a loaded list's length (a
  // capped list's length is a ceiling, not a total).
  const { section, showTabs, sectionCounts } = teamTabStrip(module, {
    members: active.ctx.memberCount ?? undefined,
    member_roles: totals.member_roles,
    invites: totals.invites,
    selectable: totals.selectable,
    internal_rates: totals.internal_rates,
    help: totals.help,
    accounts: totals.accounts,
    // Contacts' own sidebar badge — the SAME exact total the old
    // Companies/Contacts/All strip badged, primed by the one `listFetch.accounts`
    // read either page already makes (see the `contacts` entry in lib/pages.ts).
    "accounts-individual": totals.accountsIndividual,
    knowledge: totals.knowledge,
    stories: totals.stories,
    sprints: totals.sprints,
    apps: totals.apps,
    tasks: totals.tasks,
    meetings: totals.meetings,
    brand_assets: totals.brand_assets,
    purposes: totals.purposes,
  })

  // OVERRIDE 73 (2026-08-26), REVISITED 2026-08-31, REVISITED AGAIN THE SAME
  // DAY. The first revisit (below) was right that a record's own detail
  // screen needs its trail back — override 73 struck the OLD bar for
  // repeating the identity chips, not for existing at all. But the fix that
  // restored it dropped the condition rather than correcting it, so the SAME
  // trail now drew on a screen with no record open too: the client's next
  // screenshot was the Sprints COLLECTION with a bar reading nothing but
  // "Sprints" — above a screen whose own title already says "Sprints" and a
  // sidebar that already shows the section. His words: "kill breadcrumbs in
  // main screens!" — the SHELL.md line this whole override answers to is "a
  // main screen is in the navbar; a detail screen has breadcrumbs."
  //
  // OVERTURNED 2026-09-03, AND THE OBJECT IT REFUSED NO LONGER EXISTS.
  // The ruling above killed a TEXT BREADCRUMB BAR that sat above the content
  // and repeated the sidebar in words. That bar is gone. What sits there now
  // is the card's own folder tab: the trail is drawn as a strip of folder
  // tabs whose LAST tab is filled with the card's own paper and joined to it,
  // so the tab is not a sign pointing at the card — it is the card's edge,
  // the way a tab on a paper folder is part of the folder.
  //
  // Aurora, shown that exact case drawn (a top-level collection with one tab
  // reading "Apps" over a card titled "Apps"): "On a top-level collection, we
  // would only have one tab, and that's correct. There would be nothing on
  // the left. That's correct." Said twice, of a mockup, after being told in
  // as many words that every top-level screen would gain a tab it does not
  // have today.
  //
  // SO EVERY SCREEN CARRIES ITS TRAIL, and a top-level one carries a trail of
  // one. The old ruling's own test in `web/test/nested-routes.test.ts` moves
  // with it. Its author's objection — that a crumb repeated what the sidebar
  // already said — is recorded rather than deleted, because it still applies
  // to any future attempt to put a second, textual trail back on a screen.
  //
  // AND SINCE 2026-09-06 THE STRIP CAN BE DRAWING A SECOND THING — the set of
  // places she has OPEN rather than the one she is at. `crumbs` (built with the
  // hooks, far above, because the account screens return before this point) is
  // still exactly the trail this paragraph describes, and it is still what the
  // strip draws on a phone and on the first paint; `stripCrumbs` is the tab set
  // when there is one. See the "what she has open" block above.
  //
  // THIS RULING IS ADDITIVE, NOT A REVERSAL: a trail whose only job is the
  // path BACK to the parent collection ("Tickets" → this record) names no
  // ID and no collection chip's own text — `buildCrumbs` puts the record's
  // own name/reference on the last crumb (a fact the identity chips don't
  // carry in that form) and the section name on the link before it, both
  // read off this app's own routing data (`sectionTitle` → `TEAM_SECTIONS`
  // in web/lib/pages.ts), never invented here. So a record screen — flat or
  // nested — gets the one crumb trail, at the top, above the title; a
  // collection screen gets one only when it is nested inside a record
  // (`/accounts/CONFIA/stories`, "Confia › Stories"), never at its own
  // top-level address (`/stories`, `/sprints`, `/accounts`…).

  return (
    <AppShell
      active={active}
      breadcrumbs={stripCrumbs}
      onCloseCrumb={showTabSet ? closeWorkspaceTab : undefined}
      activeCrumbIndex={showTabSet ? activeTabIndex : undefined}
      onNavigate={go}
      activePath={currentPath}
    >
      {/* data-trace marks the screen the agent just drove; the ring is a short-lived
       * glance cue (auto-cleared) so the user sees WHERE a traced change landed. It
       * rings the content region — a just-opened dialog draws the eye on its own. */}
      {/* THE WIDTH CAP MOVED TO THE SHELL (R29, app-shell.tsx). This line used to
       * carry `mx-auto` + `max-w-[1600px]` itself, which capped every MODULE
       * screen but not the five account screens (home, kwapso, settings,
       * profile, invitations) that return earlier in this component and never
       * reach this div at all — they ran uncapped, invisibly, until a wide
       * monitor showed Kwapso wider than Meetings. The cap now lives once on
       * `AppShell`'s own content div, which every screen this component renders
       * passes through either way, so this div keeps only the layout it still
       * owns: a flex column with a gap between the section nav and the content
       * below it.
       *
       * `flex-1 min-h-0` — THE FOOTER-TO-THE-BOTTOM CHAIN, LINK 2 (see
       * `app-shell.tsx`'s own note on its content div for link 1 and the
       * client ruling it answers). This div is already `flex flex-col`, so
       * these two classes are the whole of it: `flex-1` claims the height
       * `AppShell`'s div just floored to the body pane's own height, and
       * `min-h-0` clears the default `min-height: auto` a flex column item
       * gets from its own content, which is what would otherwise refuse the
       * growth on a short record. A list/collection screen through this same
       * div just ends up a little taller than its own content — nothing
       * downstream of one reads that height, so nothing changes for it. */}
      <div
        data-trace={traceHighlight ?? undefined}
        className={`flex w-full flex-1 min-h-0 flex-col gap-6 ${
          traceHighlight ? "ring-primary/60 rounded-[var(--radius)] ring-2 ring-offset-2 ring-offset-background" : ""
        }`}
      >
        {showTabs && (
          <TeamSectionNav
            teamId={teamId as string}
            current={section}
            perms={perms}
            counts={sectionCounts}
            onNavigate={(href) => go(href)}
          />
        )}
        {/* ARBITRATION (R16 iii): when the team tab strip above carries this
            section's count badge, mark the panel — any CollectionHeading inside
            stands down, so a screen can never show the same number twice. The
            badged flag is per-permission (the strip may hide for this viewer). */}
        <CountedTabs badged={showTabs && sectionCounts[section] !== undefined}>
          {/* THE ROUTE TRANSITION (motion.css §2). The 8px rise and fade, on the
              route's OWN content and on nothing else — the sidebar, the header
              band and the section strip above must not restage themselves when
              the route under them changes, or every navigation reads as a full
              page load. That is why this wrapper is inside the strip rather
              than around it.

              The key is the SCREEN's identity, not the URL: a `?tab=` inside one
              screen swaps a panel, and `motion-panel-in` (the tight 4px rise) is
              what a panel takes. Remounting on a query change would also throw
              away the panel's own state to play an animation, which is the wrong
              trade in both directions.

              `flex-1 min-h-0` — LINK 3 of the same chain, for the same
              reason as the div above it (this one wraps the routed screen
              itself, one level closer to `RecordScreen`). */}
          <div key={`${module}:${recordId ?? ""}`} className="motion-page-in flex flex-1 min-h-0 flex-col gap-6">
          {/* THE SCREEN'S OWN MEMORY, scoped to this address. Everything the
              routed content holds that a person would expect to find where they
              left it — the open tab, a collection's search and filters, the
              sub-tab on a ticket list — asks for it through `useRemembered` and
              gets its own default when nothing is remembered. It wraps the
              CONTENT rather than the whole shell on purpose: the write panels
              below are opened by a URL and closed by Back, so they already
              remember themselves, and the shell chrome has nothing to park. */}
          <RememberedScreen memory={screenMemory}>
          {renderModuleContent({
            noAccess, enabled, perms, permsError, can, module, recordId, teamId, canImport, go,
            overridesQ, metaQ, membersQ, rolesQ, roles, invitesQ, helpQ, accountsQ, knowledgeQ, companiesQ, totals,
            brandQ, purposesQ, internalActivity,
            storiesQ, sprintsQ, appsQ, tasksOpenQ, tasksAllQ, workLogsQ, meetingsQ,
            activityQ, activityTotal, activityKey, activityScope, activityFetchPage, inviteAuditQ, teamName, active,
            rights, onAction, onIntent,
            sectionPath, myUserId, query,
            // The tickets screen's sub-tab strip is built from the team's own
            // ticket types (CHECKLIST 5.1) — the same list the ticket form's
            // picker reads, so the words agree wherever they appear.
            helpTypeOptions,
            taskView, setTaskView, t, lang,
          })}
          </RememberedScreen>
          </div>
        </CountedTabs>
      </div>

      <WritePanels
        query={query}
        can={can}
        teamId={teamId}
        activeRoles={activeRoles}
        active={active}
        membersQ={membersQ}
        accountsQ={accountsQ}
        brandCategoryOptions={brandCategoryOptions}
        departmentOptions={departmentOptions}
        brandQ={brandQ}
        purposesQ={purposesQ}
        helpTypeOptions={helpTypeOptions}
        runAction={runAction}
        createHelp={createHelp}
        createAccount={createAccount}
        createKnowledge={createKnowledge}
        uploadKnowledgeFile={uploadKnowledgeFile}
        saveInternalRecord={saveInternalRecord}
        setInternalActive={setInternalActive}
        closePanel={closePanel}
        /* THE RECORD IS GONE, AND SO IS ITS TAB. Archiving or removing the
           record you are looking at used to just replace the address with its
           collection; with a tab set that would have left a tab pointing at a
           record nobody can open — the one thing a persistent strip must never
           accumulate, because unlike a trail it does not rebuild itself.
           `closeTab` returns the survivor to land on, which is the neighbour
           tab rather than the collection whenever there is one: closing a dead
           record should leave you where you were before you opened it, not at
           the top of a list. `replace`, not `go`, is unchanged — the dead
           address must not stay in the history for Back to return to. */
        onRecordGone={() => {
          const landing = showTabSet ? closeTab(currentPath) : null
          replace(landing ?? sectionPath)
        }}
      />
    </AppShell>
  )
}

/** The team tab strip for a module: which section is current, whether the strip
 * shows at all, and the badge on each tab. Learning/Tickets are sidebar PAGES and
 * Import is contextual, so the strip shows only on the "tab" sections (Overview /
 * Members / Roles / Invites). The badges are DERIVED from each section's own
 * countCacheKey (LAW R8) — never hand-listed — and a total that hasn't loaded
 * yet is simply left out, so the badge renders nothing. */
function teamTabStrip(
  module: string | null,
  totalByCacheKey: Record<string, number | undefined>
): { section: SectionKey; showTabs: boolean; sectionCounts: Partial<Record<SectionKey, number>> } {
  // DERIVED, not listed. The list this replaces named eighteen of the nineteen
  // segments and had never had `time` added to it, so Work logs fell through to
  // `overview` — a "tab" section — and a sidebar page drew the Settings tab strip
  // above itself. See `sectionFor` for the whole of it.
  const section: SectionKey = sectionFor(module ?? "")
  const showTabs = (TEAM_SECTIONS.find((s) => s.key === section)?.placement ?? "tab") === "tab"
  const sectionCounts: Partial<Record<SectionKey, number>> = {}
  for (const s of TEAM_SECTIONS) {
    if (!s.countCacheKey) continue
    const total = totalByCacheKey[s.countCacheKey]
    if (total !== undefined) sectionCounts[s.key] = total
  }
  return { section, showTabs, sectionCounts }
}
