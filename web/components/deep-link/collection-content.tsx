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
import {
  CollectionEmptyState,
} from "@shared/web/screen-engine/collection-frame"
import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { Graph, ListBullets } from "@shared/ui/foundations/icons"

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
import { NotFound, LoadError, SectionWithCreate } from "@/components/deep-link/screen-bits"
import { CollectionHeading } from "@/components/records/collection-heading"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { KnowledgeShape } from "@/components/knowledge/knowledge-shape"
import { KnowledgeSourceCard } from "@/components/knowledge/knowledge-source-card"
import { AccountsScreen } from "@/components/accounts/accounts-screen"
import { ContactsScreen } from "@/components/accounts/contacts-screen"
import { InputsScreen } from "@/components/accounts/inputs-screen"
import { AskTheAssistant } from "@/components/assistant/ask-the-assistant"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind } from "@/components/records/paged-find"
import { COLLECTION_SORTS, translatedSorts } from "@/lib/collection-sorts"
import { translatedFacets } from "@/lib/collection-filters"
import { openInNewTab } from "@/lib/nav"
import { IMPORT_TARGET_LABEL } from "@/components/deep-link/crumbs"
import { content as contentApi } from "@/lib/api"
import { knowledgeKey } from "@/lib/live-resources"
import { invalidate } from "@shared/web/store"
import { GoogleSyncButton } from "@/components/knowledge/google-sync"
import { resolveRecipe } from "@/lib/screens"
import type { KnowledgeSource } from "@shared/types"
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
    if (knowledgeQ.error) return <LoadError what="the knowledge base" />
    if (knowledgeQ.data === undefined) return <Skeleton variant="list" lines={4} />
    // The account NAMES a source is filed under — the list says "Bergman S.A.",
    // never `account:01J…`. `accountsQ` is gated to the accounts/contacts
    // screens (use-screen-data.ts), so it is empty on THIS one; `companiesQ`
    // asks the door directly (2026-08-31 — the same "An account" bug app-detail
    // had, here because the fallback map was never populated at all rather
    // than paged past). Merged with whatever `accountsQ` happens to already
    // hold (a warm cache from a recent visit to Accounts costs nothing extra).
    const names = new Map([
      ...(accountsQ.data ?? []).map((a) => [a.id, a.name] as const),
      ...(companiesQ.data ?? []).map((a) => [a.id, a.name] as const),
    ])
    const loadedSources = knowledgeQ.data
    // R16: the count lives in the heading (a sidebar page has no tab strip to
    // badge), and it is the door's exact COUNT(*) — never the loaded page's
    // length, which on a paged list is just "50" forever.
    return (
      <div className="flex flex-col gap-6">
        {/* THE HEADING AND THE SYNC AFFORDANCE ARE ONE BAND, not two blocks.
            The owner asked for the sync button "everywhere, wherever we're
            showing data coming from Google sources", and it stays exactly that
            visible — it has simply stopped being a block of its own between the
            heading and the ask box (N2 counts blocks before the primary content,
            and this screen was at five). A heading names the collection and this
            button refreshes the same collection, so they answer one question and
            belong on one band (N4). `CollectionHeading` renders nothing when a
            counted tab strip wins the arbitration, which leaves the button on
            the band by itself and is still correct. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* THE GEAR (R61) — the sweep, the Google pass and the two
              retirement passes are listed on this module's own settings page
              (R70, client 2026-09-11). */}
          <CollectionHeading sectionKey="knowledge" total={totals.knowledge} action={<ModuleSettingsGear teamId={teamId ?? null} segment="knowledge" />} />
          {/* Inline on the heading band, so no caption: a toolbar control that
              explains itself in two lines pushes the heading it sits beside out
              of alignment, and this screen's own title already says what the
              collection is. The Meetings foot is where the sentence belongs. */}
          <GoogleSyncButton
            teamId={teamId as string}
            scope="knowledge"
            describe={false}
            onSynced={() => invalidate(knowledgeKey(teamId as string))}
          />
        </div>
        {/* ASK IT, HERE — AND NOW THE ONLY QUESTION BOX ON THIS SCREEN.
            B0296/T3659 (client review, 16 Sep 2026, verbatim): "Remove KB
            search bar, convert KB view to archive/source-manager, centralize
            search through assistant." The list below used to draw its own
            search box beside this one — two search-shaped controls asking the
            same door two different ways — so this is where "what does it know
            about X?" is asked now; the list under it browses what is filed,
            it does not search. The answer arrives in the assistant, with its
            sources marked at the claims and room to ask the follow-up — see
            ask-the-assistant.tsx. */}
        <AskTheAssistant />
        {/* THE LIST IS AN ARCHIVE, NOT A SECOND SEARCH BOX (B0296/T3659). It
            still pages (R14) and still carries its facets and the List·Shape
            switch — compartment/kind/active narrow what is FILED here, which
            is a different act from asking a question of it — but the field
            itself is off: TOOLBAR_EXEMPT["knowledge.list"] carries the reason,
            and `search={false}` is the mechanism (paged-find.tsx). */}
        <PagedFind<KnowledgeSource>
          sorts={translatedSorts("knowledge", t)}
          defaultSort={COLLECTION_SORTS.knowledge.defaultSort}
          // R50 — the resting read's own row count.
          restingEmpty={loadedSources.length === 0}
          listKey={knowledgeKey(teamId as string)}
          // R53 — the row builds the switch from this config; the call site
          // never draws a `<ViewSwitch>` of its own. TWO bodies over ONE
          // collection: the list answers "what is filed here?", the shape
          // answers "where is what it knows, and where is there none?" — a
          // question a list of rows cannot be read for at all.
          view={{
            views: [
              { value: "list", label: t("List"), icon: <ListBullets className="size-4" /> },
              { value: "shape", label: t("Shape"), icon: <Graph className="size-4" /> },
            ],
            value: ctx.knowledgeView,
            onValueChange: (v: string) => ctx.setKnowledgeView(v === "shape" ? "shape" : "list"),
          }}
          search={false}
          matches={{
            none: t("No sources match"),
            one: t("1 source matches"),
            many: t("{count} sources match"),
          }}
          // THE FILTERS, asked of the DOOR. They were the frame's until 18 Aug
          // 2026, which meant "From a meeting" narrowed the loaded fifty and
          // answered TWO over a base holding 170 — page one happened to have two
          // meetings on it. `kind` and `active` are closed vocabularies the door
          // allow-lists; `compartment` is rows, so it is filled in from the
          // accounts the team area has already loaded.
          facets={translatedFacets("knowledge", t, {
            compartment: [
              { value: "agency", label: t("The agency") },
              ...[...names].map(([id, name]) => ({ value: `account:${id}`, label: name })),
            ],
          })}
          fetchPage={(query, cursor) =>
            contentApi
              // The whole question, spread — `listQuery` forwards every key of
              // it, so a filter cannot be dropped between this control and the
              // door.
              .knowledge({ ...query, cursor })
              .then((r) => ({ rows: r.sources, nextCursor: r.nextCursor, total: r.total }))
          }
        >
          {(found) => {
            // THE PICTURE IS THE WHOLE BASE, so it stands outside the paged
            // rows rather than being drawn from them — `found` narrows the
            // fifty in the browser and the shape is a door of its own. It is
            // still INSIDE this toolbar because the switch that chose it is a
            // slot on this row (R53), and a body reached by a control belongs
            // under that control.
            if (ctx.knowledgeView === "shape") {
              if (!knowledgeShapeQ.data) return <Skeleton variant="list" lines={4} />
              return <KnowledgeShape teamId={teamId as string} {...knowledgeShapeQ.data} />
            }
            const rows = found.active ? found.rows : loadedSources
            if (rows === null) return <Skeleton variant="list" lines={4} />
            // BESPOKE, LIKE THE SHAPE VIEW BESIDE IT — the generic engine's card
            // (screen-renderer.tsx's `display: "cards"`) draws a title and one
            // subtitle line; this row needs six facts, three of them editable
            // inline, which is exactly the "no engine block draws this" test
            // CLAUDE.md's recipe-vs-bespoke rule asks. `KnowledgeSourceCard`
            // carries the fields; `SectionWithCreate` below drops `useKitPanel`
            // (there is no kit collection-frame panel to hand the create button
            // to any more) so its OWN header draws "Add a source"/"Upload a
            // file" again — the exact branch R50's `empty` prop on this
            // component was written for.
            return (
              <>
                <SectionWithCreate
                  show={can("knowledge", "create")}
                  label={t("Add a source")}
                  icon="plus"
                  // The third way in, beside the other two. It sits in the SECONDARY
                  // slot — the same place "Import CSV" sits on the accounts screen —
                  // because it is the same kind of affordance: another road to the same
                  // record, for material that already exists somewhere else.
                  secondary={{
                    show: can("knowledge", "create"),
                    label: t("Upload a file"),
                    onClick: () => go(sectionPath, { panel: "add", module: "knowledge-file" }),
                  }}
                  onCreate={() => go(sectionPath, { panel: "add", module: "knowledge" })}
                  empty={rows.length === 0}
                >
                  {rows.length === 0 ? (
                    <CollectionEmptyState
                      title={t("Nothing in the knowledge base yet.")}
                      description={t(
                        "This is everything the assistant is allowed to read. Add a note or a file, and it can start answering from it."
                      )}
                      filtered={found.active}
                      onCreate={can("knowledge", "create") ? () => go(sectionPath, { panel: "add", module: "knowledge" }) : undefined}
                    />
                  ) : (
                    <CardGrid>
                      {rows.map((source) => (
                        <KnowledgeSourceCard
                          key={source.id}
                          source={source}
                          accountNames={names}
                          canEdit={can("knowledge", "update")}
                          onOpen={() => onIntent?.({ kind: "open", module: "knowledge", id: source.id })}
                          onEditFiling={() =>
                            go(sectionPath, { panel: "edit", module: "knowledge", id: source.id })
                          }
                        />
                      ))}
                    </CardGrid>
                  )}
                </SectionWithCreate>
                {/* R14: one source per ticket, per article, per account, plus every note
                    anybody writes — the list pages. */}
                <LoadMore
                  listKey={found.listKey ?? knowledgeKey(teamId as string)}
                  label={t("Load more sources")}
                  fetchPage={found.fetchPage}
                />
              </>
            )
          }}
        </PagedFind>
      </div>
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
