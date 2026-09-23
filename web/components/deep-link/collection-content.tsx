"use client"

// THE COLLECTION HALF of the deep-link host's module-render switch — a module's
// LIST screen, for a route that names no record. Its sibling half (the record
// details) stays in module-content.tsx beside it.
//
// The switch was one 486-line function with fifteen `module === "…"` branches in
// two groups, and it grows by a branch every time a module ships. A collection
// and a record detail are two questions; they are now two files. Nothing had to
// be re-threaded to do it: both halves take the SAME ModuleContentCtx the host
// already builds, so the seam is where the switch always was.
//
// Pure, like the whole switch: it takes the bundle and returns a node. No state,
// no effects — those stay in deep-link-screen.tsx, which owns them.

import * as React from "react"

import { Skeleton } from "@shared/ui/components/skeleton/skeleton"

import { WavesScreen } from "@/components/work/waves-screen"
import { ProcessesScreen } from "@/components/process/processes-screen"
import { AppsScreen } from "@/components/apps/apps-screen"
import { StoriesScreen } from "@/components/work/stories-screen"
import { TasksScreen } from "@/components/work/tasks-screen"
import { TimeScreen } from "@/components/work/time-screen"
import { MeetingsScreen } from "@/components/meetings/meetings-screen"
import { TicketsCollection } from "@/components/tickets/tickets-collection"
import {
  BrandLibraryScreen,
  PurposesScreen,
} from "@/components/team/internal-screens"
import { NotFound, LoadError } from "@/components/deep-link/screen-bits"
import { KnowledgeScreen } from "@/components/knowledge/knowledge-screen"
import { AccountsScreen } from "@/components/accounts/accounts-screen"
import { ContactsScreen } from "@/components/accounts/contacts-screen"
import { InputsScreen } from "@/components/accounts/inputs-screen"
import { openInNewTab } from "@/lib/nav"
import { IMPORT_TARGET_LABEL } from "@/components/deep-link/crumbs"
import { resolveRecipe } from "@/lib/screens"
import type { ModuleContentCtx } from "./module-content"

/** The list screen for `module`, or the honest refusal/empty state. */
export function renderCollection(ctx: ModuleContentCtx): React.ReactNode {
  const {
    t,
    module,
    teamId,
    can,
    go,
    overridesQ,
    accountsQ,
    membersQ,
    knowledgeQ,
    knowledgeShapeQ,
    companiesQ,
    brandQ,
    purposesQ,
    totals,
    rights,
    onAction,
    onIntent,
    sectionPath,
    inputsQ,
    inputView,
    setInputView,
    lang,
  } = ctx

  // TIME — the one collection with NO recipe, so it is answered before the
  // recipe guard below rather than after it.
  //
  // Its rows are a list whose only controls are a correction dialog and a
  // three-answer prompt, which is a screen the engine has no block for — the
  // same reason the story detail is host-composed. Everything under this line
  // has a `<module>.list` recipe and dies without one, so a host-only collection
  // placed among them resolves to NotFound: the section is in every registry,
  // the rail links to it, and the page 404s. (It did, for one commit.)
  if (module === "time") {
    if (ctx.workLogsQ.error) return <LoadError what="the time" />
    return (
      <TimeScreen
        teamId={teamId as string}
        total={totals.workLogs}
        canCreate={can("work", "create")}
        canEdit={can("work", "update")}
        tab={ctx.query.tab}
        go={go}
        sectionPath={sectionPath}
        lang={lang}
      />
    )
  }

  // WAVES — the second host-only collection, and it is answered up here for the
  // reason the paragraph above gives, not for a new one. It shipped BELOW the
  // guard: the rail linked to it, the section was in every registry, and
  // /waves rendered "That screen doesn't exist." The prose warning was already
  // written and it was not enough, so `web/test/rules.test.ts` now derives the
  // answer instead — every sidebar section either resolves a `<module>.list`
  // recipe or is handled above this line.
  //
  // Host-composed because a row pairs a DERIVED date range with a sprint count
  // and an inline switch-off, and no engine block draws that. It reads its own
  // list and its own total.
  if (module === "waves") {
    return <WavesScreen teamId={teamId as string} basePath={sectionPath} />
  }

  const recipe = resolveRecipe(`${module}.list`, overridesQ.data, t)
  if (!recipe) return <NotFound />
  // MEMBERS/ROLES/INVITES' COLLECTION SCREENS STOOD HERE and are deleted,
  // 2026-09-14, with the rest of the team-area strip (see the comment beside
  // `MovedToTeamTab` in module-content.tsx, which now catches all three
  // modules before this function is ever called). The "New role"/"Import
  // CSV"/"Export CSV"/"Invite" affordances the roles and invites blocks drew
  // through `SectionWithCreate` did not simply go with them: "New role" and
  // "Invite" already had real homes on Settings › Team
  // (web/components/team/roles-matrix.tsx's own `+`,
  // web/components/team/members-gallery.tsx's "Invite someone"), member CSV
  // import is already reachable team-wide from the generic wizard at
  // /t/<teamId>/import (web/components/screens/home-screen.tsx's "Import"
  // card, gated per-target rather than per-screen), and roles' "Export CSV"
  // — the one act that had no other door — moved onto roles-matrix.tsx's own
  // header beside "New role", same href, same label.
  if (module === "processes") {
    // The whole screen is host-composed: the VALUE drill-down sits above the
    // list, and a map cannot be created without the apps it might belong to. Its
    // own file, so this switch stays a switch.
    return (
      <ProcessesScreen
        teamId={teamId as string}
        recipe={recipe}
        rights={rights}
        total={totals.processes}
        canCreate={can("processes", "create")}
        onAction={onAction}
        onIntent={onIntent}
      />
    )
  }
  // ── THE WORK ENGINE'S FOUR ───────────────────────────────────────────────
  // Each one host-composed for the same reason the maps screen is: it needs
  // data the recipe has no way to ask for — a story needs the sprints, the
  // apps, the open requests and the team's people to be written at all. Their
  // own files, so this switch stays a switch.
  if (module === "stories") {
    return (
      <StoriesScreen
        teamId={teamId as string}
        recipe={recipe}
        rights={rights}
        total={totals.stories}
        counts={{
          now: totals.storiesNow,
          planned: totals.storiesPlanned,
          backlog: totals.storiesBacklog,
          completed: totals.storiesCompleted,
          all: totals.storiesEveryone,
          reviews: totals.storiesReviews,
        }}
        view={ctx.storyView}
        onViewChange={ctx.setStoryView}
        canCreate={can("work", "create")}
        onImport={() =>
          openInNewTab(`/t/${teamId}/import/stories`, `${t("Import")} · ${IMPORT_TARGET_LABEL.stories}`)
        }
        onAction={onAction}
        onIntent={onIntent}
      />
    )
  }
  // SPRINTS' OWN COLLECTION BRANCH STOOD HERE — client ruling, 2026-09-15:
  // "killing the sprints main page completely… keeping the waves one on top
  // of the build section". A sprint is planned from inside its wave
  // (wave-detail.tsx's own Sprints tab and its "Plan a sprint" button) and
  // opened from there or from wherever else it is already linked; there is no
  // bare sprints collection to render any more, so a typed `/sprints` or
  // `/t/<teamId>/sprints` now falls through to NotFound like any other
  // retired address, rather than quietly still drawing the killed screen.
  // `SprintsScreen` itself is unused here now but stays on disk — its
  // `createSprintFrom` export is still `app-detail.tsx`'s own door for
  // starting a sprint from an app's record, and its header explains what a
  // future lane may still delete outright.
  if (module === "apps") {
    return (
      <AppsScreen
        teamId={teamId as string}
        rights={rights}
        total={totals.apps}
        canCreate={can("processes", "create")}
        onIntent={onIntent}
      />
    )
  }
  if (module === "tasks") {
    return (
      <TasksScreen
        teamId={teamId as string}
        recipe={recipe}
        rights={rights}
        total={totals.tasks}
        counts={{
          all: totals.tasksAll,
          overdue: totals.tasksOverdue,
          planned: totals.tasksPlanned,
          upcoming: totals.tasksUpcoming,
          completed: totals.tasksCompleted,
          calendar: totals.tasksCalendar,
          dueToday: totals.tasksDueToday,
          dueTodayDone: totals.tasksDueTodayDone,
        }}
        view={ctx.taskView}
        onViewChange={ctx.setTaskView}
        myUserId={ctx.myUserId}
        canCreate={can("work", "create")}
        onAction={onAction}
        onIntent={onIntent}
        // THE TASK SLIDE-IN — `ctx.recordId` is the URL's own task id (present
        // whether this render came from the `!recordId` early return above or,
        // now that task-detail.tsx is retired, from module-content.tsx's own
        // `module === "tasks"` branch with a record in the address); `sectionPath`
        // is this collection's own address to close back to (`go`, already
        // destructured above). See task-sheet.tsx's own header.
        openTaskId={ctx.recordId}
        basePath={sectionPath}
        go={go}
      />
    )
  }
  if (module === "meetings") {
    return (
      <MeetingsScreen
        teamId={teamId as string}
        total={totals.meetings}
        canCreate={can("meetings", "create")}
        // NO `purposeCount`/`canReadPurposes`/`onPurposes` ANY MORE — the
        // client's ruling, 16 Sep 2026: "On the main meetings screen at the
        // bottom, there are meeting types, but this should not be there
        // because this is already on the meeting settings, so remove it from
        // there." Until this ruling this call site redirected the screen's
        // own "Meeting types" button to Settings › Meetings › Choices
        // (`module-settings-screen.tsx`'s `meetings` page, `MeetingTypesPanel`
        // — Task C, 15 Sep 2026); that destination is unchanged and remains
        // the section's one door (`SECTION_HOSTED_ELSEWHERE.purposes`,
        // shared/rules/registry.ts) — only the shortcut from this screen, and
        // the three props that carried it, are gone.
        //
        // NO `onImport` ANY MORE — the client's ruling, 2026-09-15 evening:
        // "On meetings, kill the import." MeetingsScreen dropped the prop
        // outright (its own header carries her words); the import DOOR
        // itself is untouched — `/t/${teamId}/import/meetings` still
        // resolves, reachable from Home's own generic "Import" tile.
        onIntent={onIntent}
      />
    )
  }
  // ── THE AGENCY'S OWN HOUSEKEEPING ─────────────────────────────────────────
  // Two collections, one shape, in their own file (internal-screens.tsx) so
  // this switch stays a switch.
  if (module === "brand") {
    if (brandQ.error) return <LoadError what="the brand library" />
    if (brandQ.data === undefined) return <Skeleton variant="list" lines={4} />
    return (
      <BrandLibraryScreen
        rows={brandQ.data}
        teamId={teamId ?? null}
        recipe={recipe}
        rights={rights}
        total={totals.brand_assets}
        canCreate={can("brand_assets", "create")}
        onCreate={() => go(sectionPath, { panel: "add", module: "brand" })}
        onImport={() =>
          openInNewTab(
            `/t/${teamId}/import/brand_assets`,
            `${t("Import")} · ${IMPORT_TARGET_LABEL.brand_assets}`
          )
        }
        exportHref="/api/content/brand-assets/export"
        onAction={onAction}
        onIntent={onIntent}
      />
    )
  }
  if (module === "purposes") {
    if (purposesQ.error) return <LoadError what="the meeting types" />
    if (purposesQ.data === undefined) return <Skeleton variant="list" lines={4} />
    return (
      <PurposesScreen
        rows={purposesQ.data}
        recipe={recipe}
        rights={rights}
        total={totals.purposes}
        canCreate={can("delivery", "create")}
        onCreate={() => go(sectionPath, { panel: "add", module: "purposes" })}
        onImport={() =>
          openInNewTab(
            `/t/${teamId}/import/meeting_purposes`,
            `${t("Import")} · ${IMPORT_TARGET_LABEL.meeting_purposes}`
          )
        }
        exportHref="/api/content/delivery/purposes/export"
        onAction={onAction}
        onIntent={onIntent}
      />
    )
  }
  if (module === "accounts") {
    // ACCOUNTS MAIN — its own file now (`@/components/accounts/accounts-screen`),
    // the same move Contacts made one module before it: the client's 14 Sep
    // 2026 gallery/table ruling needs a piece of state (which body is on
    // screen) this switch cannot hold — it is deliberately pure, no hooks, see
    // this file's own header — so it lives in a real component instead.
    // `AccountsScreen`'s own header carries the whole account: which gallery
    // primitives were reused, why the kit's `Gallery` composition was not, and
    // the one facet (of the three she asked for) that is flagged rather than
    // faked because the door does not parse it.
    if (accountsQ.error) return <LoadError what="accounts" />
    if (accountsQ.data === undefined) return <Skeleton variant="list" lines={4} />
    return (
      <AccountsScreen
        teamId={teamId as string}
        t={t}
        lang={ctx.lang}
        go={go}
        sectionPath={sectionPath}
        tab={ctx.query.tab}
        accountsQ={accountsQ}
        membersQ={membersQ}
        total={totals.accounts}
        entityTotal={totals.accountsEntity}
        recipe={recipe}
        rights={rights}
        can={can}
        onAction={onAction}
        onIntent={onIntent}
      />
    )
  }
  // CONTACTS — its own file (`@/components/accounts/contacts-screen`), not a branch
  // drawn out here — see that file's own header for why: `web/test/
  // rules.test.ts`'s tab-nesting census counts how many times the TabsView
  // element appears PER FILE, and Accounts (above) already carries one in
  // this switch.
  if (module === "contacts") {
    return (
      <ContactsScreen
        teamId={teamId as string}
        t={t}
        lang={lang}
        go={go}
        sectionPath={sectionPath}
        tab={ctx.query.tab}
        accountsQ={accountsQ}
        total={totals.accountsIndividual}
        recipe={recipe}
        rights={rights}
        onAction={onAction}
        onIntent={onIntent}
      />
    )
  }
  if (module === "inputs") {
    // WHAT WE ARE WAITING ON A CLIENT FOR — the Inputs screen (Task C, 15
    // Sep 2026, documents/UI-RULEBOOK.md K entry). Its own file, the same
    // reason Contacts and Accounts are: `use-screen-data.ts` already loads
    // `inputsQ` on this section alone (cache-first + row-level live), and
    // this is only the wiring.
    if (inputsQ.error) return <LoadError what="the inputs" />
    return (
      <InputsScreen
        teamId={teamId as string}
        t={t}
        lang={lang}
        recipe={recipe}
        inputsQ={inputsQ}
        total={
          inputView === "received"
            ? totals.inputsReceived
            : inputView === "overdue"
              ? totals.inputsOverdue
              : totals.inputsWaiting
        }
        counts={{ waiting: totals.inputsWaiting, overdue: totals.inputsOverdue, received: totals.inputsReceived }}
        view={inputView}
        onViewChange={setInputView}
        canCreate={can("inputs", "create")}
        canUpdate={can("inputs", "update")}
      />
    )
  }
  if (module === "knowledge") {
    // SPLIT OUT INTO ITS OWN COMPONENT (knowledge-screen.tsx), the same move
    // this switch's own header documents for accounts/contacts/inputs/tasks/
    // tickets/processes/stories/waves: the switch is deliberately pure (no
    // hooks), and the kind-tab strip (client ruling, 17 Sep 2026, "Knowledge
    // page K2 by kind") needs a live sidecar read for its own R16 badges,
    // which only a real component can hold.
    return (
      <KnowledgeScreen
        scope={{
          kind: "team",
          teamId: teamId as string,
          go,
          sectionPath,
          tab: ctx.query.tab,
          onIntent,
          knowledgeQ,
          knowledgeShapeQ,
          accountsQ,
          companiesQ,
          total: totals.knowledge,
          knowledgeView: ctx.knowledgeView,
          setKnowledgeView: ctx.setKnowledgeView,
        }}
        t={t}
        can={can}
      />
    )
  }
  if (module === "tickets") {
    // A TAB STRIP AND A QUEUE (CHECKLIST 5.1 + 5.11), which is state — and this
    // switch is deliberately pure (no hooks, no effects). So the screen is a
    // component of its own now; the host still owns the recipe, the rights and
    // the two callbacks, and hands them over. The screen owns its own scope
    // (Archived is a toolbar filter now, not lifted host state) — see
    // tickets-collection.tsx's own header comment for 2026-08-31's redesign.
    return (
      // THE RECIPE, THE RIGHTS AND `onAction` NO LONGER GO WITH IT (2026-09-06).
      // The screen drew its rows through `<ScreenRenderer>` until the client
      // ruled every ticket tab draws the triage list's own table; with the
      // renderer gone there is nothing behind those three props, and the
      // recipe's `actions: []` means none of them ever decided anything on this
      // collection. `tickets.list` is untouched and still resolved by this host
      // everywhere else. See tickets-collection.tsx's own note above its props.
      <TicketsCollection
        teamId={teamId as string}
        helpTypeOptions={ctx.helpTypeOptions}
        totals={totals}
        can={can}
        onCreate={() => go(sectionPath, { panel: "add", module: "tickets" })}
        onIntent={onIntent}
      />
    )
  }
  return <NotFound />
}
