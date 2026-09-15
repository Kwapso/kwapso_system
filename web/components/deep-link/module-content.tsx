"use client"

// The module-render switch for the deep-link host — "given the fully-resolved
// route, rights and per-module data, render the right screen". Extracted from
// deep-link-screen.tsx (which stays the routing + state + effects + dialogs
// host) so each half reads on its own. Pure: it takes ONE context bundle the
// host builds and returns the screen node; it holds no state of its own.
//
// This file is the DISPATCHER plus the RECORD-DETAIL half: the guards every
// module passes through, the two modules with no permission key of their own
// (import, dropdowns), the team overview, and each `/<module>/<id>` detail. The
// COLLECTION half lives in collection-content.tsx beside it — one switch of
// fifteen branches was two questions wearing one function, and it grew by a
// branch every time a module shipped. Both halves take the same
// ModuleContentCtx, so the split re-threaded nothing.

import * as React from "react"
import { WaveDetailScreen } from "@/components/work/wave-detail"

import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import {
  ScreenRenderer,
  type ScreenActionContext,
  type ScreenIntent,
} from "@shared/web/screen-engine/screen-renderer"
import { type ScreenQuery, type ScreenRecipe, type ScreenRights } from "@shared/web/screen-engine/recipe"

import { AccountDetailScreen } from "@/components/accounts/account-detail"
import { KnowledgeDetailScreen } from "@/components/knowledge/knowledge-detail"
import { HelpDetailScreen } from "@/components/tickets/help-detail"
import { ProcessDetailScreen } from "@/components/process/process-detail"
import { AppDetailScreen } from "@/components/apps/app-detail"
import { SprintDetailScreen } from "@/components/work/sprint-detail"
import { StoryDetailScreen } from "@/components/work/story-detail"
import { TaskDetailScreen } from "@/components/work/task-detail"
import { MeetingDetailScreen } from "@/components/meetings/meeting-detail"
import { ImportScreen } from "@/components/screens/import-screen"
import { MemberScreen } from "@/components/team/member-screen"
import { NoAccess, NotFound, LoadError } from "@/components/deep-link/screen-bits"
import { Button } from "@shared/ui/components/button/button"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { invalidate } from "@shared/web/store"
import { softNavigate } from "@/lib/nav"
import type { TaskView } from "@/lib/live-resources"
import {
  shapeBrandDetail,
  shapePurposeDetail,
} from "@/components/deep-link/shape"
import { ActivityRail } from "@/components/records/activity-rail"
import type { ActivityItem } from "@shared/types"
import type { Language } from "@shared/i18n"
import type { useScreenData } from "@/lib/use-screen-data"
import type { usePermissions } from "@/lib/perms"
import type { useActiveTeam } from "@/lib/use-active-team"
import {
  MODULE_PERMISSION,
  resolveRecipe,
  withoutActions,
  withTabCounts,
} from "@/lib/screens"
import type { TeamRole } from "@shared/types"
import { renderCollection } from "@/components/deep-link/collection-content"

type ScreenData = ReturnType<typeof useScreenData>

/** Everything the module-render switch needs from the host: the resolved route,
 * the caller's rights, the per-module queries, and the intent/action bridges.
 * The host owns all of it; this bundle is how it hands the render half a snapshot. */
export type ModuleContentCtx = Pick<
  ScreenData,
  | "overridesQ" | "metaQ" | "membersQ" | "rolesQ" | "invitesQ" | "helpQ" | "accountsQ" | "knowledgeQ" | "knowledgeShapeQ" | "companiesQ" | "totals" | "inviteAuditQ"
  | "brandQ" | "purposesQ" | "internalActivity"
  | "storiesQ" | "sprintsQ" | "appsQ" | "tasksOpenQ" | "tasksAllQ" | "workLogsQ" | "meetingsQ"
  // The team's live `Ticket type` values. The tickets screen's sub-tab strip is
  // DERIVED from them (CHECKLIST 5.1), so it has to travel with the bundle —
  // the host already reads them for the ticket form's own picker.
  | "helpTypeOptions"
> & {
  noAccess: boolean
  enabled: boolean
  perms: ReturnType<typeof usePermissions>["perms"]
  /** WHY THE ERROR TRAVELS WITH THE RIGHTS. The line below used to ask only
   * whether `perms` was still `undefined` — which is true while the answer is
   * coming AND for ever after it failed. One unlucky rights fetch therefore
   * froze navigation into EVERY record type in the app behind a loading
   * skeleton until a hard reload, because this is the first gate every detail
   * screen passes through. */
  permsError: unknown
  can: ReturnType<typeof usePermissions>["can"]
  module: string | null
  recordId: string | null
  teamId: string | null
  canImport: boolean
  go: (path: string, q?: ScreenQuery) => void
  roles: TeamRole[]
  teamName: string
  active: ReturnType<typeof useActiveTeam>
  rights: ScreenRights
  onAction: (actionId: string, ctx: ScreenActionContext) => void
  onIntent: (intent: ScreenIntent) => void
  sectionPath: string
  myUserId: string | null
  query: ScreenQuery
  taskView: TaskView
  /** Which body the knowledge collection is showing — its list, or the picture
   * of the whole base. The `view` slot on that screen's toolbar (R53). */
  knowledgeView: string
  setKnowledgeView: (v: string) => void
  setTaskView: (v: TaskView) => void
  /** The reader's language, as `t`. It rides the ctx rather than a hook because
   * these two render halves are plain functions, not components — the host
   * calls `useT()` once and hands the result down with everything else. Every
   * recipe on screen is translated by passing it to `resolveRecipe`. */
  t: (english: string) => string
  /** The reader's language, as the raw code — `formatDate` and its siblings need
   * this rather than `t`, for the reason `shared/web/format.ts` gives at its own
   * required `lang` parameter. Rides beside `t` for the same reason `t` does:
   * the host resolves it once (`useLanguage()`) and hands it down. */
  lang: Language
}

/** The row is whichever record kind a segment holds; each shaper takes its own
 * type, so the three call sites erase it through this one alias rather than
 * three inline casts. */
type InternalShaper = (
  row: { id: string },
  activity: ActivityItem[],
  lang: Language
) => ReturnType<typeof shapeBrandDetail>

/** The BODY of an agency-internal record detail, once: find the row in its
 * loaded collection and render it through the engine. The branches above each
 * own the two things a law reads off them — which recipe, and that it went
 * through withTabCounts — and share everything that is genuinely identical.
 *
 * IT USED TO HANG THE PAGED HISTORY UNDER IT TOO, through the engine's
 * `renderActivity` prop, because these recipes carried an Activity tab. They do
 * not any more: the client killed the Activity tab across the app on 2026-09-06
 * ("I don't want to have activity as a tab anywhere but on the footer … this
 * would open a slide-in with all the activity"), restated 2026-09-07 as "kill
 * all old activity tabs".
 *
 * THE HISTORY IS REACHED FROM THE FOOTER NOW, and this function is where these
 * screens get their door. `ctx.internalActivity` is the same `useRecordActivity`
 * every bespoke detail calls, over the generic (table, id) path (R5), resolved
 * once in use-screen-data because a render switch full of early returns cannot
 * call a hook. Its rows already ride into `sets.activity` below, which is what
 * the engine draws as the footer's SUMMARY; the same bundle goes to
 * `<ActivityRail>` as `activityAction`, which is what makes the rest of it
 * reachable (R14) under the exact server total the door prints (R16).
 *
 * ONE CALL FOR EVERY AGENCY-INTERNAL KIND. Both branches that reach this
 * function (brand, purposes) get the door from this line rather than each
 * wiring one, which is the same reason the body itself is shared.
 *
 * NO NOTE COMPOSER HERE, and that is not an oversight. The bespoke details pass
 * `onAddNote` because their footers already draw the field, gated on that
 * module's own create right; this path has never drawn one, and offering to
 * write into a brand asset's history is a decision the client has not made.
 * The rail shows what the screen already had a right to show. */
function internalDetail(
  ctx: ModuleContentCtx,
  recipe: ScreenRecipe,
  spec: {
    what: string
    query: { data: { id: string }[] | undefined; error: unknown }
    shape: InternalShaper
    /** Last word on the recipe, once the record is known — for the one thing a
     * recipe cannot say on its own: an action whose label depends on the state
     * of the record it acts on. A `RecipeAction.label` is a static string in the
     * library (which is lego, and not edited from here), so a control that has
     * to read "put it back" once it has been ticked is the host's job.
     *
     * It is handed the SHAPED record rather than the raw row on purpose: that is
     * the object `onAction` reads to decide which way the toggle goes, and a
     * label deciding from a different spelling of the same field is how a button
     * ends up disagreeing with the write behind it. */
    adapt?: (recipe: ScreenRecipe, record: Record<string, unknown>) => ScreenRecipe
  }
): React.ReactNode {
  if (spec.query.error) return <LoadError what={spec.what} />
  if (spec.query.data === undefined) return <Skeleton variant="list" lines={4} />
  const row = spec.query.data.find((r) => r.id === ctx.recordId) ?? null
  if (!row) return <p className="text-muted-foreground text-sm">{ctx.t("That record no longer exists.")}</p>
  const data = spec.shape(row, ctx.internalActivity.rows, ctx.lang)
  return (
    <div className="flex flex-col gap-6">
      <ScreenRenderer
        recipe={spec.adapt ? spec.adapt(recipe, data.record ?? {}) : recipe}
        data={data}
        rights={ctx.rights}
        onAction={ctx.onAction}
        onIntent={ctx.onIntent}
        activityAction={<ActivityRail activity={ctx.internalActivity} />}
      />
    </div>
  )
}

export function renderModuleContent(ctx: ModuleContentCtx): React.ReactNode {
  const {
    t,
    noAccess,
    enabled,
    perms,
    permsError,
    module,
    recordId,
    teamId,
    canImport,
    can,
    query,
    overridesQ,

    membersQ,
    // THE TEAM'S ROLES — the member profile's role picker. Read across the
    // whole team area anyway, so this costs nothing.
    roles,
    rights,
    onIntent,
    sectionPath,
    myUserId,
  } = ctx

    if (noAccess) return <NoAccess />
    if (!enabled) return <Skeleton variant="list" lines={4} />
    // "It went wrong" and "it has not arrived" are different sentences, and only
    // one of them is worth waiting through.
    if (permsError)
      return (
        <ShapeStateBody
          shape="collectionScreen"
          state="error"
          copy={{
            errorTitle: t(
              "We couldn't check what you're allowed to see. Refresh the page, and tell us if it keeps happening."
            ),
          }}
          action={
            <Button variant="secondary" onClick={() => invalidate(`my-perms:${teamId}`)}>
              {t("Try again")}
            </Button>
          }
        />
      )
    if (perms === undefined) return <Skeleton variant="list" lines={4} />

    // THE DOOR TO A MEMBER'S OWN HISTORY used to be built here, from the fixed
    // `scope=user` feed (`activityScope`/`activityKey`/`activityQ`/
    // `activityTotal`/`activityFetchPage`, use-screen-data.ts). It moved onto
    // `member-screen.tsx` itself, reading through `useRecordActivity("users",
    // userId)` — the ONE generic (table, id) path (R5) every other bespoke
    // record detail already reads its footer through, and the only shape that
    // also hands the screen a working `addNote` (see that file's own header
    // for the bug this closed: a member with no logged history drew no ink
    // footer at all, audit and note composer both absent). `team.detail` and
    // the standalone `invites` detail were already retired by the time this
    // moved, so nothing else needed the old three-scope bundle.

    // Import — no permission KEY of its own (gated per-target). Handle it before
    // the MODULE_PERMISSION lookup, which would otherwise NotFound it.
    if (module === "import") {
      if (!canImport) return <NoAccess />
      // `?groups=` — WHICH DROPDOWN GROUPS A SCOPED IMPORT IS ABOUT, when the
      // reader arrived from a module's own settings page (client, 11 Sep 2026:
      // *"each module's settings page gets its own import and export for its
      // own groups"*). It rides in the address because the path cannot carry
      // it: `/t/<teamId>/import/selectable_data` is the same address whichever
      // module sent you. The screen only forwards it; the confirm door refuses
      // the out-of-scope rows.
      return (
        <ImportScreen
          teamId={teamId as string}
          initialTarget={recordId || undefined}
          groups={query.groups}
        />
      )
    }

    // THE `dropdowns` MODULE STOOD HERE and was retired on 11 Sep 2026 with the
    // client's ruling that ended Settings › Choices: *"implement this module
    // settings across app … end goal kill the big tab 'choice options'."* It
    // resolved two addresses — `/t/<teamId>/dropdowns`, the team's WHOLE
    // vocabulary on one screen, and `/t/<teamId>/dropdowns/<id>`, one value's
    // own record — and by then nothing in the app linked to either: the screen
    // had had no in-app door since `ManageDropdownsLink` was repointed on
    // 2026-09-01, and the record's only door was a row link on the screen
    // above it.
    //
    // WHERE THE MATERIAL IS NOW. Every vocabulary group a record actually
    // stores is edited on its own module's settings page (`MODULE_SETTINGS`,
    // web/components/screens/module-settings-screen.tsx), which is where the
    // import and the export live too. What did NOT survive is a value's own
    // RECORD screen, and its history with it — that is written up in the
    // report on this change, and the history itself is still in the team's
    // activity feed, which reads `selectable_data` like any other table
    // (`ACTIVITY_GATE_MAP`).

    const permKey = module ? MODULE_PERMISSION[module] : undefined
    if (!permKey) return <NotFound />
    if (!can(permKey, "read")) return <NoAccess />

    // "internal-rates" WAS ROUTED HERE — a team-wide card with no record level.
    // Retired 10 Sep 2026. What an ACCOUNT is charged is a tab on the account's
    // own record and has always been a different file.

    // THE TEAM OVERVIEW, WHICH NO LONGER EXISTS -----------------------------
    //
    // CLIENT RULING, 2026-09-09: "This overview about the team should not even
    // exist. Only in the settings, under the tab, it should not move from
    // there." The screen it used to draw — `team.detail`, one description block
    // of Created / Created by / Last updated with an Edit action — is deleted,
    // along with its recipe (web/lib/screens.ts) and its shaper
    // (web/components/deep-link/shape.tsx). web/lib/pages.ts carries the whole
    // decision where the section used to be declared.
    //
    // THE ADDRESS SURVIVES THE SCREEN. `/t/<teamId>` is somebody's bookmark, the
    // base every crumb in this shell is built from, and the destination two
    // agent traces still name; deleting the screen without answering for the
    // address would turn all four into a blank panel. So it MOVES, through the
    // one soft-navigation bus (R37) — no document is thrown away, the shell
    // stays mounted, and the reader lands on the tab that now holds the team.
    if (module === "team") return <MovedToTeamTab />

    // MEMBERS' COLLECTION, ROLES (either shape) AND INVITES (either shape) ALL
    // MOVE HERE TOO — CLIENT RULING, 2026-09-14, over a screenshot of exactly
    // this: a standalone Members page still carrying its own tab strip
    // (Members · Member roles · Invites). "what is this? told you to kill it.
    // Now this only lives on settings / team." The 2026-09-09 pass (the
    // paragraph on `roles` below) killed the per-role detail redirect but left
    // `members`/`roles`/`invites` as `placement: "tab"` rows in TEAM_SECTIONS,
    // so their COLLECTION screens kept drawing that strip — reachable by
    // anyone who still had the address, which is exactly what a bookmark or
    // the two legacy shims (web/app/members/page.tsx, web/app/roles/page.tsx)
    // hand out. web/lib/pages.ts moved all three to `placement: "contextual"`
    // the same day; this is the other half of that decision.
    //
    // `roles` and `invites` move regardless of whether the URL names a record
    // — neither one has EVER had a real detail address anything links to
    // (a role's own page went 2026-09-09; nothing has linked to
    // /t/<teamId>/invites/<id> since revoke moved onto the members gallery's
    // toolbar). `members` only redirects when the URL names NO record: the
    // member's own record page is the one survivor, because it is the screen
    // Settings › Team's gallery actually links to
    // (`/t/${teamId}/members/${userId}`) and where change-role/remove really
    // happen — SECTION_HOSTED_ELSEWHERE (shared/rules/registry.ts) says so and
    // R64's own check proves it by reading the door calls off this file.
    if (module === "roles") return <MovedToTeamTab />
    if (module === "invites") return <MovedToTeamTab />
    if (module === "members" && !recordId) return <MovedToTeamTab />

    // Lists — the collection half, next door. Same ctx bundle, so the seam
    // costs nothing to cross; what it buys is two files you can hold in your
    // head instead of one switch with fifteen branches in it.
    if (!recordId) return renderCollection(ctx)

    // Details ----------------------------------------------------------------
    // NO ACTIVITY TAB ON ANY OF THEM. A member's and an invite's history is the
    // same ever-growing team feed, sliced, and it used to be a tab on each of
    // these recipes with `ActivityPanel` (and its R14 pager) handed to the
    // engine through `renderActivity`. The client killed the Activity tab across
    // the app on 2026-09-06 — a record's history is read from the footer's
    // Latest activity column and opens in a slide-in off it — so the engine's
    // `renderActivity` prop, whose only purpose was to put the app's own panel
    // inside that tab, is gone with the tabs it served
    // (shared/web/screen-engine/screen-renderer.tsx). `MemberScreen` below
    // still reads the data, now through the generic (table, id) path (R5)
    // rather than a bundle this host builds for it: the tab was a PLACE, not
    // the data.
    if (module === "members") {
      if (membersQ.error) return <LoadError what="members" />
      if (membersQ.data === undefined) return <Skeleton variant="list" lines={4} />
      const member = membersQ.data.find((m) => m.userId === recordId) ?? null
      if (!member) return <p className="text-muted-foreground text-sm">{t("That member isn't on this team.")}</p>
      const base = resolveRecipe("members.detail", overridesQ.data, t)
      if (!base) return <NotFound />
      // THE SEAM EVERY RENDERED DETAIL RECIPE GOES THROUGH — `withTabCounts`
      // is a genuine no-op here (`memberDetailRecipe` declares no `tabs` any
      // more, and the function returns the recipe untouched when it finds
      // none), kept rather than dropped so this recipe passes through the
      // SAME seam `brand.detail`/`purposes.detail` do (`internalDetail`,
      // below) and stays wired for free the day it ever grows a real
      // collection tab again.
      let recipe = withTabCounts(base, {})
      // You can't change your own role or remove yourself here.
      if (member.isYou) recipe = withoutActions(recipe, ["members.changeRole", "members.remove"])
      // THE ONE SCREEN A CARD ON SETTINGS › TEAM OPENS — client, 2026-09-10:
      // "when clickingon card in team, open full screen the profile (we wil ad
      // more to this)", refined 2026-09-14 (chip above title, the picture, no
      // tabs, the footer at the true bottom — member-screen.tsx's own header
      // carries the whole account). `MemberScreen` draws the head, the first
      // panel, the person's own profile and the footer itself now, through
      // `RecordScreen`; it reads its own activity feed (R5's generic (table,
      // id) path — see that file's own header for why) rather than being
      // handed one, so this host only supplies the member row and the
      // resolved recipe (for its `actions` only). R64 (`sections-have-a-door`)
      // is why the two acts are taken in that file rather than in the host's
      // generic dispatcher — its header carries the whole argument, and
      // `SECTION_HOSTED_ELSEWHERE` names it.
      return (
        <MemberScreen
          teamId={teamId as string}
          member={member}
          roles={roles}
          recipe={recipe}
          rights={rights}
          onRemoved={() => onIntent({ kind: "close" })}
        />
      )
    }
    // INVITES HAD A DETAIL SCREEN HERE (invites.detail — who/what/when, plus
    // Revoke), deleted 2026-09-14 with the rest of the team-area strip: it was
    // already reachable from nothing, anywhere, before this change — revoke
    // moved onto the members gallery's toolbar on 2026-09-09 and called
    // `tenancy.revokeInvite` from there instead (SECTION_HOSTED_ELSEWHERE,
    // shared/rules/registry.ts). `module === "invites"` is caught above this
    // switch now, list or detail alike, so this branch never ran either way —
    // it is deleted rather than left as an unreachable twin.
    if (module === "accounts") {
      return (
        <AccountDetailScreen
          teamId={teamId as string}
          accountId={recordId}
          basePath={sectionPath}
        />
      )
    }
    // A ROLE NO LONGER OPENS ITS OWN PAGE — CLIENT RULING, 2026-09-09: "I want
    // to see the roles much differently… a matrix in which we see all the roles
    // as rows and the properties as columns. All the roles together, I want to
    // have an overview." The per-role screen (`role-detail.tsx`, one role's
    // permission grid on a record screen with two tabs) is deleted; every role's
    // sheet is one grid on Settings › Team now
    // (web/components/team/roles-matrix.tsx), and a cell there is where a right
    // is changed. `module === "roles"` is caught above this switch now (see the
    // 2026-09-14 comment beside `MovedToTeamTab` there) — list or detail land
    // on that grid alike, for the same reason `/t/<teamId>` does.
    if (module === "knowledge") {
      return <KnowledgeDetailScreen teamId={teamId as string} sourceId={recordId} />
    }
    if (module === "tickets") {
      return (
        <HelpDetailScreen
          teamId={teamId as string}
          helpId={recordId}
          myUserId={myUserId}
          basePath={sectionPath}
        />
      )
    }
    if (module === "processes") {
      return <ProcessDetailScreen teamId={teamId as string} processId={recordId} />
    }

    // ── THE WORK ENGINE'S RECORDS ────────────────────────────────────────────
    // Three bespoke, one recipe. The app, the sprint and the story each carry a
    // collection tab with its own create action (or, on the story, a status
    // stepper and the time logged against it) — controls no engine block draws.
    // The TASK carries none of that: it is a title, a date and a tick, so its
    // detail is the recipe below with the housekeeping ones.
    if (module === "apps") {
      return <AppDetailScreen teamId={teamId as string} appId={recordId} basePath={sectionPath} />
    }
    if (module === "waves") {
      return <WaveDetailScreen teamId={teamId as string} waveId={recordId} basePath={sectionPath} />
    }
    if (module === "sprints") {
      return (
        <SprintDetailScreen teamId={teamId as string} sprintId={recordId} basePath={sectionPath} />
      )
    }
    if (module === "stories") {
      return (
        <StoryDetailScreen teamId={teamId as string} storyId={recordId} basePath={sectionPath} />
      )
    }
    // ONE MEETING — a component rather than a recipe, because two of its three
    // tabs are prose somebody wrote and its header carries the button that
    // reaches outside this app.
    if (module === "meetings") {
      return (
        <MeetingDetailScreen
          teamId={teamId as string}
          meetingId={recordId}
          basePath={sectionPath}
        />
      )
    }
    // ONE TASK. A component since 18 Aug 2026, when it grew a Work logs tab —
    // see task-detail.tsx for why the engine handed it over. The tick still runs
    // through the SAME `onAction` seam the recipe used, and the host still reads
    // the CURRENT status off the record to decide which way it goes, so there is
    // one place that owns the direction and it did not move.
    if (module === "tasks") {
      const task = ctx.tasksAllQ.data?.find((r) => r.id === recordId) ?? null
      return (
        <TaskDetailScreen
          teamId={teamId as string}
          taskId={recordId}
          task={task}
          loading={ctx.tasksAllQ.data === undefined}
          onToggleDone={() =>
            ctx.onAction("tasks.done", {
              id: recordId,
              record: { id: recordId, status: task?.status === "done" ? "Done" : "Open" },
            })
          }
        />
      )
    }

    // ── THE AGENCY'S OWN HOUSEKEEPING ────────────────────────────────────────
    // The only RECORD details in the app that are pure recipes: each one is the
    // record's own fields, which is exactly the block the engine draws. The
    // bespoke details beside them exist because no engine block draws a ticket's
    // conversation or a map's arithmetic; none of these has that problem, so
    // none of them is a component.
    //
    // They used to be "the record's own fields PLUS its history", a pair of
    // blocks. The history is not a tab any more (client, 2026-09-06), so the
    // pair is a single description block — but the history is still READ, through
    // the GENERIC (table, id) path (R5): the same hook every bespoke detail uses,
    // resolved once in use-screen-data because a render switch full of early
    // returns cannot call a hook, and still shaped into each detail's data.
    //
    // SEPARATE BRANCHES, NOT A TABLE, and that is the law's doing rather than a
    // preference. R8's check counts `resolveRecipe("<x>.detail"` literals and
    // demands one `withTabCounts` per rendered detail — a table that resolved
    // its recipe from a variable was invisible to the count, which means the law
    // could no longer see whether these tabs carried their badge. Code a
    // law cannot read is a law quietly switched off, so the shape it measures is
    // the shape they are written in.
    if (module === "brand") {
      const base = resolveRecipe("brand.detail", overridesQ.data, t)
      if (!base) return <NotFound />
      return internalDetail(ctx, withTabCounts(base, { activity: ctx.internalActivity.total }), {
        what: "the brand library",
        query: ctx.brandQ,
        shape: shapeBrandDetail as InternalShaper,
      })
    }
    if (module === "purposes") {
      const base = resolveRecipe("purposes.detail", overridesQ.data, t)
      if (!base) return <NotFound />
      return internalDetail(ctx, withTabCounts(base, { activity: ctx.internalActivity.total }), {
        what: "the meeting types",
        query: ctx.purposesQ,
        shape: shapePurposeDetail as InternalShaper,
      })
    }
    return <NotFound />
}

/** WHERE `/t/<teamId>` AND `/t/<teamId>/roles/<id>` GO NOW — see the two
 * branches above for the rulings behind each.
 *
 * A soft navigation and not a `<Redirect>` or a `router.replace`: this whole
 * post-auth app is ONE shell that mounts once, and the one bus every in-app move
 * goes through is `softNavigate` (R37). Done in an effect rather than during
 * render, because navigating while rendering is a state update inside another
 * component's render pass, and React is right to shout about it.
 *
 * It draws the ordinary loading skeleton for the frame or two it lives: a
 * sentence saying "this moved" would be a screen, and the whole point is that
 * there is no screen here any more. */
function MovedToTeamTab() {
  React.useEffect(() => {
    softNavigate("/settings?tab=team")
  }, [])
  return <Skeleton variant="list" lines={3} />
}
