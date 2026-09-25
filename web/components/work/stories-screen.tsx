"use client"

// STORIES — the backlog, and the page the team actually lives in. A ticket is
// what a client asks for; a story is what somebody does today.
//
// This was the Work page, which carried the backlog, the sprints, the to-dos,
// our own admin and the time — five collections on one screen because none of
// them had anywhere else to be. Four of the five now have a section of their own
// (the owner's ruling), so what is left here is the backlog and the TIME logged
// against it, which belongs under the work rather than beside it: "where did my
// week go" is a question about these rows.
//
// The screen owns its own dialog rather than routing through the host's ?panel
// machinery, the way the maps screen does: a story needs the sprints, the apps,
// the open tickets and the team's members to be written at all, and that is this
// screen's data.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Badge } from "@shared/ui/components/badge/badge"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { toast } from "@shared/ui/components/sonner/sonner"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { Kanban, type KanbanColumn, type KanbanMove } from "@shared/ui/components/kanban/kanban"
import { ListBullets, Kanban as KanbanGlyph, CalendarDots, Stack as StackGlyph } from "@shared/ui/foundations/icons"
import type { ScreenActionContext, ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import type { RecipeField, ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import {
  CollectionEmptyState,
  CollectionCreateActionProvider,
} from "@shared/web/screen-engine/collection-frame"
import { defaultFieldConfig, type CollectionConfig, type FilterFacet, type SortOption } from "@shared/web/screen-engine/config"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"

import { CollectionHeading } from "@/components/records/collection-heading"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { CountedAbove } from "@/components/records/counted-tabs"
import type { CalendarEntry } from "@/components/records/record-calendar"
import { RecordWeek } from "@/components/records/record-week"
import { RecordTable, visibleActions, type TableColumn, type TableRowData } from "@/components/records/record-table"
import {
  SectionWithCreate,
  AddButton,
  ToolbarRow,
  type ToolbarViewSlot,
} from "@/components/deep-link/screen-bits"
import { LoadMore } from "@/components/records/load-more"
import { StoryFormDialog, type StoryFormValues } from "@/components/work/story-form-dialog"
import { StartTimerStrip } from "@/components/work/time-panel"
import { ApiFailure, content as contentApi, tenancy } from "@/lib/api"
import { useSessionUserId } from "@/lib/use-active-team"
import { usePermissions } from "@/lib/perms"
import {
  appsKey,
  helpKey,
  listFetch,
  processesKey,
  sprintsKey,
  storiesKey,
  type StoryView,
} from "@/lib/live-resources"
import { field, translateFields, withDataDrivenCollection } from "@/lib/screens"
import type { Language } from "@shared/i18n"
import { formatCount } from "@shared/web/format-count"
import { formatDate } from "@shared/web/format"
import { storyStatusDotTone } from "@shared/status-tones"
import { storyInActivePhase, storyStatusWord } from "@shared/story-status-word"
import {
  type AppRow,
  type HelpTicket,
  type ProcessSummary,
  type SelectableValue,
  type Sprint,
  type Story,
  type StoryStatus,
  type TeamMember,
} from "@shared/types"
import { useAfterPaint } from "@shared/web/after-paint"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { invalidate, useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import { useRemembered } from "@shared/web/remembered"
import { assignableMembers } from "@/lib/members"
import { storyTypeIconName, type StoryTypeIconName } from "@shared/story-types"
import { iconComponent } from "@shared/web/screen-engine/icon"
import { richTextPlain } from "@shared/web/rich-text"
import { RecordMark } from "@shared/web/record-mark"
import { RecordRef } from "@shared/web/record-ref"
import { orderChips } from "@shared/web/chip-order"

/** WHAT A STORY NEEDS TO BE WRITTEN AT ALL — the sprints it could sit in, the
 * apps it could be on, the open requests it could answer, and the people it
 * could be given to. Lifted out because three screens open this same form (this
 * one, a sprint's, an app's) and each of them needs the same four lists. */
export function useStoryFormOptions(teamId: string) {
  // SIX LISTS FOR A DIALOG NOBODY HAS OPENED, and until 7 Sep 2026 all six left
  // in front of the record. A ticket's own screen calls this so that "New story"
  // works when it is pressed, and the census (web/test/cold-screen-hops.test.tsx)
  // found sprints, apps and processes among the twelve requests a person waits
  // through to read one ticket.
  //
  // So they wait for the paint, the same gate the team-wide prewarm sits behind
  // (use-screen-data.ts). Nothing a person can perceive moves: the form is
  // behind a button, `useAfterPaint` is true within a beat of the screen going
  // quiet and unconditionally within three seconds, and each of these is a
  // cache another screen may already have warmed — a cache HIT does not wait for
  // anything, so a team that has been to Tickets or Apps pays nothing either way.
  const painted = useAfterPaint()
  const on = <T,>(key: T): T | null => (painted ? key : null)
  const sprintsQ = useCached<Sprint[]>(on(sprintsKey(teamId)), () => listFetch.sprints(teamId))
  const appsQ = useCached<AppRow[]>(on(appsKey(teamId)), () => listFetch.apps(teamId))
  const ticketsQ = useCached<HelpTicket[]>(on(helpKey(teamId, "all")), () => listFetch.help(teamId))
  const membersQ = useCached<TeamMember[]>(on(`members:${teamId}`), () =>
    tenancy.members().then((r) => r.members)
  )
  // The maps a story can say it changes (CHECKLIST 6.5). Same cache key the
  // Processes screen reads, so a person who has been there pays nothing.
  const processesQ = useCached<ProcessSummary[]>(on(processesKey(teamId)), () =>
    listFetch.processes(teamId)
  )
  // The team's own word for the kind of work (CHECKLIST 6.2) — one cache, shared
  // with every other dropdown in the app.
  const selectableQ = useCached<SelectableValue[]>(on(`selectable:${teamId}`), () =>
    tenancy.selectable().then((r) => r.values)
  )
  return {
    // CHECKLIST 6.3: current or future only, each carrying its mark. Computed
    // from the two facts the row already holds rather than stored, so a mark can
    // never disagree with the dates it came from — and the FORM narrows further,
    // to the app being chosen, which is a fact only the form knows.
    sprints: (sprintsQ.data ?? [])
      .filter((s) => !s.completedAt && s.active && (!s.endsOn || s.endsOn >= todayISO()))
      .map((s) => ({
        id: s.id,
        name: s.name,
        appId: s.appId,
        mark: sprintMark(s),
        // THE STORIES TAB STRIP'S SPRINT COLUMN reads this for its own quiet
        // second line (the wave a sprint was sold inside) — no new read, the
        // sprints list this screen already loads for the create dialog
        // already carries it.
        waveName: s.waveName,
      })),
    // `logoUrl` RIDES ALONG NOW (client ruling, 16 Sep 2026: "I want to see
    // the icons of the app … on the choice component"), off the same
    // `PickableRecord` shape every other app/account picker in the app reads
    // (web/lib/pickable.ts) — an extra optional field, so every existing
    // reader of `apps` (this hook has five callers) keeps working unchanged.
    // `accountId` rides along too (16 Sep 2026, ruling 2): `sprint-detail.tsx`
    // reads this same `apps` list for `SprintFormDialog`'s own account-narrowed
    // App row, and without it every app here would look account-less.
    apps: (appsQ.data ?? [])
      .filter((a) => a.active)
      .map((a) => ({ id: a.id, name: a.name, logoUrl: a.logoUrl, accountId: a.accountId })),
    appNames: new Map((appsQ.data ?? []).map((a) => [a.id, a.name])),
    // CHECKLIST 6.4: OPEN tickets only, each tagged with the app it is about so
    // the form can narrow to the one being chosen.
    //
    // `helpType` RIDES ALONG TOO (Aurora's ruling, 21 Sep 2026: "on every
    // choice component where I can choose a ticket, show me the type as the
    // icon everywhere") — the one field `ticketFace` (shared/web/ticket-
    // face.tsx) needs to draw the pre-typed list's own face, the same map
    // `web/lib/picker-sources.ts`'s `searchTickets` already reads for the
    // SEARCHED half of this same picker.
    tickets: (ticketsQ.data ?? [])
      .filter((t) => t.status !== "resolved" && !t.archivedAt)
      .map((t) => ({
        id: t.id,
        label: t.ref ? `${t.ref} · ${richTextPlain(t.description)}` : richTextPlain(t.description),
        appId: t.appId,
        helpType: t.helpType,
      })),
    processes: (processesQ.data ?? [])
      .filter((p) => p.active)
      .map((p) => ({ id: p.id, name: p.name, appId: p.appId })),
    processNames: new Map((processesQ.data ?? []).map((p) => [p.id, p.name])),
    storyTypes: (selectableQ.data ?? [])
      .filter((v) => v.type === "Story type" && v.active)
      .map((v) => v.value),
    // WHERE THIS WORK CAME FROM (client ruling, 15 Sep 2026) — the team's own
    // `Story category` dropdown values, the same "read from the live
    // vocabulary, never hardcode the word" shape `storyTypes` above already
    // takes.
    categories: (selectableQ.data ?? [])
      .filter((v) => v.type === "Story category" && v.active)
      .map((v) => v.value),
    // The dropdown rows themselves, so a screen can read a type's MARK as well
    // as its word (UI-RULEBOOK G2). The words above stay because a picker wants
    // words; a header band wants the glyph beside them.
    selectableValues: selectableQ.data,
    // Our people only — a story is internal work (lib/members).
    members: assignableMembers(membersQ.data),
    // WHO IS ON EACH APP (CHECKLIST 6.6). The staff set rides the app row, so
    // the picker narrows without a second read — and the DOOR enforces the same
    // rule, so a narrowed list is a courtesy rather than the control.
    appStaff: new Map((appsQ.data ?? []).map((a) => [a.id, a.staff.map((p) => p.userId)])),
  }
}

/** Today, as the ISO date the sprint columns are stored in. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** WHICH OF THE THREE MARKS A SPRINT CARRIES (CHECKLIST 6.3). Derived, never
 * stored: a completed sprint is completed whatever its dates say, one that has
 * not begun is upcoming, and everything else is running. */
function sprintMark(s: Sprint): "Active" | "Upcoming" | "Completed" {
  if (s.completedAt) return "Completed"
  if (s.startsOn && s.startsOn > todayISO()) return "Upcoming"
  return "Active"
}

/** Write a story through the door and re-read what changed. Shared by every
 * screen that can add one, so "adding work also moves a sprint's counts" is
 * stated once rather than remembered three times. */
export async function createStoryFrom(
  teamId: string,
  values: StoryFormValues,
  /** The caller's language — see `createAppFrom`. */
  t: (english: string) => string
): Promise<string | undefined> {
  try {
    const made = await contentApi.createStory({
      title: values.title,
      storyType: values.storyType,
      category: values.category,
      detail: values.detail || undefined,
      sprintId: values.sprintId || undefined,
      appId: values.appId || undefined,
      ticketId: values.ticketId || undefined,
      assigneeId: values.assigneeId || undefined,
      processIds: values.processIds,
      changesNoStep: values.changesNoStep,
      acceptanceCriteria: values.acceptanceCriteria || undefined,
      moscow: values.moscow || undefined,
    })
    invalidate(storiesKey(teamId))
    invalidate(sprintsKey(teamId))
    toast.success(t("Story added."))
    // THE NEW STORY'S ID, so the form can hang the screenshots somebody picked
    // before it existed. Undefined on an older worker, which the caller reads as
    // "nothing to attach to" rather than as an error.
    return made.createdId
  } catch (err) {
    throw err instanceof ApiFailure ? err : new Error("Couldn't add that story.")
  }
}

/* ── THE STORIES TAB STRIP, ADDED 2026-09-15 ─────────────────────────────────
 *
 * Ported from Tasks (`web/components/work/tasks-screen.tsx`, redesigned the
 * same day) — the client's ruling: "for stories, we need to recreate a bit of
 * tasks. Stories are inside sprints, so I would need different tabs where you
 * can see: overdue or the ones you have to do now, the ones that are active,
 * and for you only / the planned ones that are not in any active sprint and
 * are somewhere in the future / all / the completed ones / everyone's. Think
 * about this and make me a proposal." — then, on the design proposal that
 * produced, one change: "I agree with all you suggested — except use Backlog
 * instead of All." documents/UI-RULEBOOK.md carries the K entry with the date.
 *
 * REORDERED, AND EVERYONE'S RENAMED TO ALL, 21 SEP 2026. Aurora's ruling,
 * verbatim: "Reorganize backlog tabs: Now, Planned, Review, Completed,
 * Backlog, Everyone's. Rename everyone to All." (documents/UI-RULEBOOK.md
 * B45). The strip reads Now, Planned, Reviews, Completed, Backlog, All now —
 * same six tabs, same gate on the last one, only the order and that one word
 * changed.
 *
 * FIVE TABS, FOUR OF THEM "MINE" UNCONDITIONALLY. `now`/`planned`/`backlog`/
 * `completed` narrow to the caller's own name AT THE DOOR
 * (`workers/content/src/routes/stories.ts`'s own `MINE_VIEWS`), the identical
 * shape Tasks' three MINE tabs take — including a story with no assignee at
 * all riding along (`includeUnassigned`), because this backlog is old enough
 * to carry plenty of unclaimed history. `all` is All (Everyone's until 21 Sep
 * 2026), gated on `all_stories:read` (a new module, seeded exactly like
 * `all_tasks`).
 *
 * EACH TAB OFFERS ITS OWN VIEWS (R53): Now is Board by status (default) + List;
 * Planned is List (default) + Board by sprint + Week by due date; Backlog is
 * List (default) + Board by status; Completed is List only; All is
 * List (default) + Board by status.
 *
 * THE SPRINT COLUMN, on every List view, carries the sprint's own name and the
 * wave it was sold inside as a quiet second line — `Story.sprintName` and the
 * wave name resolved off the sprints this screen's own form options already
 * load, no new field on `Story` itself. A story with no sprint reads "No
 * sprint", never a blank cell.
 */

/** THE TYPE CHIP — icon + word, on the same neutral pill `categoryChip` beside
 * it already draws (client ruling, 16 Sep 2026: "assign an icon to each
 * type"). REPLACES the two-letter `RecordMark` tile (DA/TC/BG…) this row used
 * to lead with — there is no DOT to remove here: a colour dot for a type is a
 * TICKET-ONLY pattern (`web/lib/type-colours.ts`'s own header says so, and
 * `web/lib/type-marks.ts`'s `MARK_GROUP` deliberately carries no `ticket` key
 * any more for that exact reason); a story's type has always drawn a TEXT
 * glyph in a square, never a dot, and the icon replaces THAT.
 *
 * `storyTypeIconName` (shared/story-types.ts) is a closed, five-entry code
 * map — the vocabulary itself is still read live off `selectable_data`
 * (`Story type`), only the glyph is code. The map holds the kit's kebab-case
 * NAME, not a component (shared/story-types.ts's own header says why — a
 * worker reads that file too, and no worker tsconfig allows JSX), so the
 * name is resolved to a component here through the same seam `Icon`/
 * `RecordPicker` already use, `iconComponent()`. A team that has renamed a
 * type past recognition (or a story with none at all) draws the word alone,
 * same as `type-marks.ts`'s own text mark always has.
 *
 * EXPORTED so `story-detail.tsx`'s Overview "Type" row draws the identical
 * chip rather than a second idea of what a story's type looks like. */
export function storyTypeChip(value: string | null | undefined): React.ReactNode {
  if (!value) return null
  const iconName = storyTypeIconName(value)
  const Icon = iconName ? iconComponent(iconName) : null
  // THE GLYPH RIDES BADGE'S OWN `icon` SLOT, NOT A PLAIN CHILD — client
  // ruling, 18 Sep 2026 ("all chips / pills" need the leading-mark gap
  // "wether its a dot or an icno"). The old shape also fought the kit's own
  // gap with a local `className="gap-1"` override (badgeVariants' base
  // LEADING_MARK_GAP is `gap-2`) — dropped along with the plain child, so
  // this chip now spends the same rung every other icon-led Badge does.
  return (
    <Badge variant="secondary" icon={Icon ? <Icon className="size-3.5" /> : undefined}>
      {value}
    </Badge>
  )
}

// THE GENERATOR'S CENSUS BAIT, the same shape `MEETING_TYPE_ICON_CENSUS`
// (web/components/deep-link/shape.tsx) plants for the meeting-type vocabulary
// — `scripts/icon-map.mjs`'s census can only see a literal `icon: "…"` in
// SOURCE, and the two call above never write one: they resolve a NAME through
// `iconComponent()` and hand the result to `<Icon .../>`, so the string never
// appears as an `icon:` field anywhere a source scan can read it. Without
// this, `icon-map.ts` would never import `ArrowsClockwise`/`BugBeetle`/
// `Database`/`Sparkle`/`Wrench`/`MagnifyingGlass` for THIS reason (some of the
// six may still be pulled in by an unrelated call elsewhere), and a story
// type's chip would draw a HOLE
// the day it stopped being. Kept beside `STORY_TYPE_ICONS`
// (@shared/story-types) so the two can never drift the way the meeting
// census and its vocabulary cannot.
const STORY_TYPE_ICON_CENSUS: { icon: StoryTypeIconName }[] = [
  { icon: "database" },
  { icon: "wrench" },
  { icon: "bug-beetle" },
  { icon: "sparkle" },
  { icon: "arrows-clockwise" },
  { icon: "magnifying-glass" },
]
void STORY_TYPE_ICON_CENSUS

/** ONE STORY'S OWN TWO-COLOUR SHAPE — mark, ref chip, title — shared by every
 * view that shows a story as a single node (the List's Story column, and the
 * Board's card title row). */
function storyLead(s: Story): React.ReactNode {
  return (
    <span className="flex items-center gap-2 min-w-0">
      <RecordRef value={s.ref} />
      <span className="truncate">{s.title}</span>
    </span>
  )
}

/** THE CATEGORY CHIP (client ruling, 15 Sep 2026) — a small, quiet badge
 * beside the type chip, on every row and every card. Client-requested /
 * Internal, whatever the team has renamed either to. */
function categoryChip(s: Story): React.ReactNode {
  return (
    <Badge variant="secondary">{s.category}</Badge>
  )
}

/* THE MOSCOW TAG (`MoscowChip`) STOOD HERE, AND IS PARKED, 21 Sep 2026.
 * Aurora's ruling, verbatim: "pause everything to do with moscow, but remind
 * me at later stages." Moved whole to `moscow-chip.tsx`
 * (`PARKED["work/moscow-chip"]`, shared/rules/registry.ts), see that file's
 * own header for how to bring it back. */

/** THE KANBAN BOARD'S OWN THREE COLUMNS AND WORDS (Aurora's ruling, 20 Sep
 * 2026, verbatim): "In stories kanban, the columns are: In Progress, To Do,
 * In Review" — that exact order, and "On stories/new, remove the 'done'
 * column and expand the other three to full width — only 3 instead of 4."
 *
 * "TO DO" IS NARROWED, 21 SEP 2026. Aurora's correction: "Backlog, To Do:
 * nono, to do means its scheduled in an active phase." The column still
 * reads "To Do", it draws nothing else now, because `statusBoardColumns`
 * (below) only ever puts an OPEN story in this column when
 * `storyInActivePhase` says its own phase is active today
 * (`shared/story-status-word.ts`). An open story OUTSIDE an active phase
 * (no phase, a future one, or one that has ended) is a Backlog story, and
 * this board has no Backlog column to put it in (the decision this ruling's
 * brief asked for named out loud): it is simply left off the board, the
 * same way a done story already is; it is still on the List and Backlog
 * tabs, where `storyStatusWord` draws it as "Backlog". */
const KANBAN_STATUSES = ["in_progress", "open", "in_review"] as const satisfies readonly StoryStatus[]
const KANBAN_STATUS_LABEL: Record<(typeof KANBAN_STATUSES)[number], string> = {
  in_progress: "In Progress",
  open: "To Do",
  in_review: "In Review",
}

/** WHETHER A STORY BELONGS IN ONE OF THE BOARD'S THREE COLUMNS: every
 * `in_progress`/`in_review` story does; an `open` one only when its own
 * phase is active today. EXPORTED so `web/test/story-status-board.test.ts`
 * can pin the 21 Sep 2026 ruling without rendering the whole board. */
export function storyBelongsOnKanbanColumn(s: Story, status: (typeof KANBAN_STATUSES)[number]): boolean {
  if (s.status !== status) return false
  if (status !== "open") return true
  return storyInActivePhase({ startsOn: s.sprintStartsOn, endsOn: s.sprintEndsOn })
}

/** THE SPRINT COLUMN'S TWO LINES — the sprint's own name, and the wave it was
 * sold inside underneath it, muted. `waveNames` resolves the second line off
 * the sprints this screen's own form options already load
 * (`useStoryFormOptions`'s `sprintsQ`) — no new read, no new field on `Story`.
 * "No sprint" reads as a plain, quiet line, never a blank cell. */
function sprintCell(s: Story, waveNames: Map<string, string | null>): React.ReactNode {
  if (!s.sprintId || !s.sprintName)
    return null
  const wave = waveNames.get(s.sprintId)
  return (
    <span className="flex flex-col">
      <span className="text-sm font-medium">{s.sprintName}</span>
      {wave && <span className="text-muted-foreground text-xs">{wave}</span>}
    </span>
  )
}

/** ONE STORY, SHAPED FOR EVERY VIEW AT ONCE — the List's own row (every column
 * any tab needs is here; each tab's own `TableColumn[]` just picks a subset),
 * and the raw fields the Board and Week read straight off `Story` instead
 * (status, sprint dates, assignee) because neither of those needs the
 * formatted, translated cell. TAKES ROWS ALREADY IN ORDER — this shapes, it
 * does not sort (R53: one order, decided at the toolbar).
 *
 * EXPORTED so `web/test/story-status-board.test.ts` can pin the List's own
 * status word (Aurora's ruling, 21 Sep 2026) without rendering the whole
 * screen, the same reason `waves-screen.tsx`'s own row shapers are
 * exported for `waves-timeline.test.ts`. */
export function shapeStories(
  stories: Story[],
  waveNames: Map<string, string | null>,
  lang: Language,
  /** DROPS THE LEADING REF BADGE OUT OF THE STORY CELL — Planned and Backlog
   * carry their own standalone ID column now (Aurora's ruling, 20 Sep 2026:
   * "add id as the first column"), so the reference is not shown twice on
   * the same row. Every other tab keeps the ref inside `name`, unchanged. */
  leadingRef: boolean = true
) {
  return {
    rows: stories.map((s) => ({
      id: s.id,
      // THE STANDALONE ID COLUMN (Planned/Backlog only, see `leadingRef`
      // above) — the same reference `storyLead`'s own badge already draws.
      ref: s.ref || "",
      name: leadingRef ? storyLead(s) : <span className="truncate">{s.title}</span>,
      // THE PLAIN TITLE, FOR A TAB — `name` above is a rendered node (chip +
      // title), which cannot label the tab a cmd/ctrl/middle-click opens
      // beside (`rowLabel`, record-table.tsx); the same `nameText`-beside-
      // `name` pair the Accounts shaper keeps for the identical reason.
      nameText: s.title,
      // ITS OWN COLUMN NOW, NOT SQUEEZED INTO THE STORY CELL — an icon+word
      // chip is wider than the two-letter tile it replaces, and Category
      // (beside it) already gets its own column for the identical reason.
      type: storyTypeChip(s.storyType),
      category: categoryChip(s),
      // MOSCOW STOOD HERE, RENDERED AS A TAG. PARKED, 21 Sep 2026
      // (`moscow-chip.tsx`). No `TableColumn` here has ever read this `moscow`
      // key (R82's own note above named the card tag and the toolbar as
      // where it lives, never a seventh column), so removing it drops dead
      // data rather than a live cell.
      status: storyStatusWord(s.status, { startsOn: s.sprintStartsOn, endsOn: s.sprintEndsOn }),
      sprint: sprintCell(s, waveNames),
      assignee: staffNameFromSnapshot(s.assigneeName) || "Nobody yet",
      app: s.appName ?? "",
      closedOn: s.closedAt ? formatDate(s.closedAt, lang) : "",
    })),
  }
}

/** THE FOUR COLUMN SETS — one per tab shape, `tasks.ts`'s own reasoning
 * (`TASK_COLUMNS`/`COMPLETED_COLUMNS`/`EVERYONE_COLUMNS`): a column that reads
 * the same fact down every row of the tab it sits on is furniture. Now,
 * Planned and Backlog are all "mine" and status-mixed, so Status stays; it is
 * dropped on Completed (every row already `done`) and Assignee only appears
 * on All, the one tab that is not already narrowed to the caller.
 *
 * THE NAME COLUMN IS "Title", NOT "Story" — 22 Sep 2026. It read "Story"
 * until the standalone id column beside it (below) was renamed from "ID" to
 * "Story" too (her ruling: "if it's ID for story, call it story"), which
 * would have put two columns reading "Story" on the same row, on the exact
 * tabs (Planned, Backlog, Reviews) that carry both. Renamed here, on every
 * tab, for the same reason `TicketRowsTable`'s own two columns are "Ticket"
 * (id) and "Title" (name) rather than "Ticket" twice. */
const MINE_COLUMNS = [
  field("name", "Title"),
  field("type", "Type"),
  field("category", "Category"),
  field("status", "Status"),
  field("sprint", "Phase"),
]
const COMPLETED_COLUMNS = [
  field("name", "Title"),
  field("type", "Type"),
  field("category", "Category"),
  field("sprint", "Phase"),
]
const EVERYONE_COLUMNS = [
  field("name", "Title"),
  field("type", "Type"),
  field("assignee", "Who has it"),
  field("category", "Category"),
  field("status", "Status"),
  field("sprint", "Phase"),
]
/** THE STANDALONE ID COLUMN, FIRST — Aurora's ruling, 20 Sep 2026: "On
 * stories 'Planned,' add id as the first column. Same on the 'Backlog'
 * tab." Prepended to `MINE_COLUMNS`'s own five, six in all — R82's own
 * ceiling, exactly met rather than exceeded, which is why MoSCoW (below)
 * is drawn as a CARD tag and a toolbar filter/sort rather than a seventh
 * table column here. */
const PLANNED_BACKLOG_COLUMNS = [field("ref", "Story"), ...MINE_COLUMNS]
/** THE REVIEWS TAB'S OWN LIST — Aurora's ruling, 20 Sep 2026, verbatim:
 * "add a tab for reviews, views Queue and List. Columns: id, name, type,
 * app, who did it, date marked as done." */
const REVIEWS_LIST_COLUMNS = [
  field("ref", "Story"),
  field("name", "Title"),
  field("type", "Type"),
  field("app", "App"),
  field("assignee", "Who did it"),
  // THE CLOSED ON COLUMN — a formatted date that sorts by the raw date
  // field the row carries alongside (R82, sorted-columns census).
  { column: "closedOn", type: "text" as const, field: { ...defaultFieldConfig, label: "Done on" }, sortType: "date" as const, sortKey: (row: TableRowData) => row.closedAt } as unknown as RecipeField,
]

/** THE TOOLBAR'S OWN SORT VOCABULARY (R53) — the drag order every story
 * already carries (`Story.rank`, the same field the door's own default
 * ordering reads) and Deadline, the sprint's own end date where there is a
 * sprint and the story's legacy date where there is not
 * (`Story.sprintEndsOn`). MOSCOW STOOD HERE TOO. PARKED, 21 Sep 2026
 * (`moscow-filters.tsx`'s own `moscowSortOption`). */
function storySortOptions(t: (s: string) => string): SortOption[] {
  return [
    { value: "rank", label: t("Order"), defaultDir: "asc" },
    { value: "deadline", label: t("Deadline"), defaultDir: "asc" },
  ]
}

const NO_DEADLINE_SENTINEL = "9999-99-99"

function compareStories(a: Story, b: Story, sortField: "rank" | "deadline", dir: "asc" | "desc"): number {
  const key = (s: Story) =>
    sortField === "rank" ? (s.rank ?? s.id) : (s.sprintEndsOn ?? s.dueOn ?? NO_DEADLINE_SENTINEL)
  const av = key(a)
  const bv = key(b)
  const primary = av < bv ? -1 : av > bv ? 1 : 0
  return dir === "asc" ? primary : -primary
}

/** THE FIVE "MINE"-OR-REVIEW TABS, reordered 21 Sep 2026 — Aurora's ruling,
 * verbatim: "Reorganize backlog tabs: Now, Planned, Review, Completed,
 * Backlog, Everyone's. Rename everyone to All." (documents/UI-RULEBOOK.md
 * B45). Written as data so the strip, the fetch key and the badge cannot
 * fall out of step. */
const STORY_TABS: { value: StoryView; label: string; icon: string }[] = [
  { value: "now", label: "Now", icon: "warning" },
  { value: "planned", label: "Planned", icon: "clipboard-text" },
  // THE REVIEWS TAB (Aurora's ruling, 20 Sep 2026: "add a tab for reviews,
  // views Queue and List"). Always offered, unlike the All tab below — a
  // review of finished work is not gated on `all_stories:read` the way
  // seeing everyone's ACTIVE backlog is; the door itself narrows to the
  // caller's own name for a reader who lacks that right, the identical
  // `all`/All fallback (`STORY_VIEWS`, shared/types.ts).
  { value: "reviews", label: "Review", icon: "check-circle" },
  // B0382 — "Completed" -> "Done" (the internal view key stays `completed`).
  { value: "completed", label: "Done", icon: "check" },
  // "Backlog", NOT "All" — the client's own correction over the design
  // proposal's recommendation, 15 Sep 2026 (documents/UI-RULEBOOK.md K entry).
  { value: "backlog", label: "Backlog", icon: "stack" },
]
/** THE SIXTH TAB — the door's team-wide `all` view, shown only to a reader who
 * holds `all_stories:read` (`seesEveryones`, below). Kept out of `STORY_TABS`
 * itself for `tasks.ts`'s own reason: whether it appears is a permission
 * question this component answers once, not a flag every consumer of
 * `STORY_TABS` would have to filter for itself.
 *
 * LABELLED "ALL", NOT "EVERYONE'S" — Aurora's ruling, 21 Sep 2026 (see
 * `STORY_TABS` above): same gate, same behaviour, only the word changed. */
const EVERYONE_TAB: { value: StoryView; label: string; icon: string } = {
  value: "all",
  label: "All",
  icon: "asterisk",
}

type NowSubView = "board" | "table"
type PlannedSubView = "table" | "board" | "week"
type BacklogSubView = "table" | "board"
type EveryoneSubView = "table" | "board"
/** Queue first — the ruling names it first ("views Queue and List"), and it
 * is the "read one, then the next" shape a review naturally takes. */
type ReviewsSubView = "queue" | "list"

/** THE REVIEWS TAB'S QUEUE VIEW — Aurora's ruling, 20 Sep 2026, verbatim:
 * "For Queue, same chips as the story detail page except sprint (don't show
 * sprint) — title, description, completed by, completed on." The detail
 * page's own chip order (a separate ruling, same day) is id, status, type,
 * app, sprint; this draws the first four and stops. One card per finished
 * story, the whole card clickable — no nested link on the app chip, the
 * identical reasoning `boardCard` above gives for its own app badge: a
 * second click target competing with "open this story" is worse than a
 * plain word. */
function ReviewsQueue({
  stories,
  lang,
  t,
  onSelect,
}: {
  stories: Story[]
  lang: Language
  t: (s: string) => string
  onSelect: (id: string) => void
}) {
  return (
    <ul className="flex flex-col gap-3">
      {stories.map((s) => (
        <li
          key={s.id}
          role="button"
          tabIndex={0}
          className="rounded-[var(--radius)] bg-surface-panel p-4 cursor-pointer flex flex-col gap-2"
          onClick={() => onSelect(s.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect(s.id)
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* R94 (chip-order, shared/web/chip-order.ts): id, status, type,
                main parent, secondary parent, routed through the shared seam
                rather than this hand-written JSX order. */}
            {orderChips([
              { kind: "id", node: <RecordRef key="id" value={s.ref} /> },
              {
                kind: "status",
                node: (
                  <Badge key="status" variant="status" dot={storyStatusDotTone(s.status)}>
                    {storyStatusWord(s.status, { startsOn: s.sprintStartsOn, endsOn: s.sprintEndsOn })}
                  </Badge>
                ),
              },
              {
                kind: "type",
                // `storyTypeChip` is typed `React.ReactNode` (its own declared
                // return type, shared by every other caller); the other three
                // entries here narrow to `Element`, so this one is narrowed to
                // match rather than widening every sibling back to
                // `ReactNode` — the same cast `story-detail.tsx`'s own
                // `orderChips` call already carries for the identical reason.
                node: storyTypeChip(s.storyType) as React.ReactElement | null,
              },
              {
                kind: "mainParent",
                node: (
                  <Badge key="app" variant="secondary" className={s.appName ? "underline" : "italic opacity-55"}>
                    {s.appName ?? t("No app")}
                  </Badge>
                ),
              },
            ])}
          </div>
          <span className="font-medium">{s.title}</span>
          <span className="text-muted-foreground text-sm">{richTextPlain(s.detail)}</span>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              {/* B0382 — "Completed" -> "Done" */}
              {t("Done by")}: {staffNameFromSnapshot(s.assigneeName) || t("Nobody yet")}
            </span>
            {s.closedAt && (
              <span>
                {t("Done on")}: {formatDate(s.closedAt, lang)}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function StoriesScreen({
  teamId,
  recipe,
  rights,
  total,
  counts,
  view,
  onViewChange,
  canCreate,
  onImport,
  onAction,
  onIntent,
}: {
  teamId: string
  recipe: ScreenRecipe
  rights: ScreenRights
  /** the exact server total of the everyday backlog (R16) — never the loaded
   * page's length. Unaffected by which of the five tabs is showing. */
  total: number | undefined
  /** the other four tabs' exact totals (R16), out of the SAME read that
   * fetched whichever tab is showing (`tasks.ts`'s own note on this shape). */
  counts: {
    now: number | undefined
    planned: number | undefined
    backlog: number | undefined
    completed: number | undefined
    all: number | undefined
    reviews: number | undefined
  }
  /** which tab is showing — a SERVER view, owned by the host so the reads can
   * key off it (see useScreenData). */
  view: StoryView
  onViewChange: (v: StoryView) => void
  canCreate: boolean
  /** THE CONTEXTUAL "IMPORT CSV" JUMP, the same shape the brand library and
   * meeting purposes already take (internal-screens.tsx's own `onImport`). */
  onImport?: () => void
  onAction: (actionId: string, ctx: ScreenActionContext) => void
  onIntent: (intent: ScreenIntent) => void
}) {
  const { t, lang } = useLanguage()
  // THE SIGNED-IN USER, preselected as the assignee on a new story (client
  // ruling, 15 Sep 2026 — see `StoryFormDialog`'s own `defaultAssigneeId`).
  const myUserId = useSessionUserId()
  // WHOSE LIST THIS IS. The DOOR decides — a caller without `all_stories:read`
  // is narrowed to their own name on every "mine" tab, and every count above
  // comes back narrowed with it (`tasks.ts`'s own `seesEveryones`, identical
  // shape).
  const seesEveryones = usePermissions(teamId).can("all_stories", "read")
  const storyTabs = seesEveryones ? [...STORY_TABS, EVERYONE_TAB] : STORY_TABS
  // WHO MAY DRAG A CARD TO A NEW STATUS — the board's own write is
  // `setStoryStatus`, the same door the review/close flow uses, so the same
  // right gates both.
  const canEditStories = usePermissions(teamId).can("work", "update")

  // THE STORIES SCREEN'S OWN FACETS. Category (client's 15 Sep 2026 ruling)
  // and, on Backlog only, Status (Aurora's ruling, 21 Sep 2026). Declared
  // here, ABOVE `storiesQ` below, because the Status facet's value has to
  // reach that fetch rather than sieve its rows afterwards (R14/R16), moved
  // up from its old spot beside `query`/`sortField` for exactly that reason,
  // no behaviour change for Category, which still narrows in the browser.
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({})
  // THE BACKLOG TAB'S STATUS FACET, READ BACK BEFORE THE FETCH. Narrowed
  // THROUGH THE DOOR, never client side: a picked value changes `storiesQ`'s
  // own cache key below, so it is a real page-one request for
  // `OpenStoryFacetStatus`'s own words (workers/content/src/lib/stories.ts),
  // never a filter over rows already on screen. Read only on the Backlog tab,
  // the facet renders nowhere else (see `facets`, below), so a value left
  // over from a visit to Backlog is inert on every other tab.
  const statusFacet =
    view === "backlog" ? (facetValues.status as StoryStatus | "to_do" | "backlog" | undefined) : undefined
  const storiesKeyForView = statusFacet ? `${storiesKey(teamId, view)}:status:${statusFacet}` : storiesKey(teamId, view)
  const storiesQ = useCached<Story[]>(storiesKeyForView, () =>
    statusFacet
      ? contentApi.stories({ view, status: statusFacet }).then((r) => r.stories)
      : listFetch.stories(teamId, view)
  )
  const options = useStoryFormOptions(teamId)
  // THE STORY TYPE'S GLYPH used to be read here (`markMap`, the team's own
  // two-letter code) — RETIRED 2026-09-16 with the row's own text mark: the
  // type chip now draws a Phosphor icon (`storyTypeChip`, `shared/story-
  // types.ts`), keyed off the word itself rather than a per-team glyph.
  // THE SPRINT COLUMN'S SECOND LINE — the wave each sprint was sold inside,
  // read off the sprints this screen already loads for the create dialog
  // (`useStoryFormOptions`'s own `sprintsQ`, which carries `waveName`). No new
  // field on `Story`, no new read.
  const waveNames = React.useMemo(
    () => new Map(options.sprints.map((sp) => [sp.id, sp.waveName ?? null])),
    [options.sprints]
  )
  const [storyOpen, setStoryOpen] = React.useState(false)

  // EACH MULTI-VIEW TAB REMEMBERS ITS OWN SUB-VIEW (`useRemembered`, the same
  // seam `tasks-screen.tsx` reads for its own three). Now opens on Board —
  // the artifact's own recommendation, the "what is on fire" read.
  const [nowView, setNowView] = useRemembered<NowSubView>(
    "story-now-view",
    "board",
    (r) => (r === "board" || r === "table" ? r : undefined)
  )
  const [plannedView, setPlannedView] = useRemembered<PlannedSubView>(
    "story-planned-view",
    "table",
    (r) => (r === "table" || r === "board" || r === "week" ? r : undefined)
  )
  const [backlogView, setBacklogView] = useRemembered<BacklogSubView>(
    "story-backlog-view",
    "table",
    (r) => (r === "table" || r === "board" ? r : undefined)
  )
  const [everyoneView, setEveryoneView] = useRemembered<EveryoneSubView>(
    "story-everyone-view",
    "table",
    (r) => (r === "table" || r === "board" ? r : undefined)
  )
  // REVIEWS' OWN TWO VIEWS (Aurora's ruling, 20 Sep 2026) — Queue first, the
  // ruling's own order.
  const [reviewsView, setReviewsView] = useRemembered<ReviewsSubView>(
    "story-reviews-view",
    "queue",
    (r) => (r === "queue" || r === "list" ? r : undefined)
  )
  const subView: NowSubView | PlannedSubView | ReviewsSubView | "table" =
    view === "now"
      ? nowView
      : view === "planned"
        ? plannedView
        : view === "backlog"
          ? backlogView
          : view === "all"
            ? everyoneView
            : view === "reviews"
              ? reviewsView
              : "table"

  // THE TOOLBAR'S OWN SEARCH AND SORT — bounded, in the browser, over
  // whichever tab's page is loaded (`tasks-screen.tsx`'s own shape: the door
  // pages a huge collection down to one tab's worth of rows, and this narrows
  // that page once for every view underneath it).
  const [query, setQuery] = React.useState("")
  const [sortField, setSortField] = React.useState<"rank" | "deadline">("rank")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")

  // A new story belongs in several piles and only one of them is on screen.
  function invalidateEveryStoryView() {
    for (const v of ["now", "planned", "backlog", "completed", "all", "reviews"] as const) invalidate(storiesKey(teamId, v))
  }

  // THE BOARD'S OWN WRITE — dropping a card on a new status column moves the
  // story along its lifecycle through the same door the review/close flow
  // uses. Gated on `work:update`; refused silently (no drag) otherwise via
  // `onMove={canEditStories ? moveStatus : undefined}` below.
  async function moveStatus(move: KanbanMove) {
    const toStatus = move.toColumnId as StoryStatus
    const current = (storiesQ.data ?? []).find((r) => r.id === move.cardId)
    if (!current || current.status === toStatus) return
    try {
      await contentApi.setStoryStatus(current.id, toStatus)
      for (const v of ["now", "planned", "backlog", "completed", "all", "reviews"] as const) invalidate(storiesKey(teamId, v))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't update that value."))
    }
  }

  // LOAD MORE, NARROWED THE SAME WAY THE FIRST PAGE WAS. A named function
  // rather than an inline arrow on `<LoadMore>` itself, so the tag stays
  // short enough for R14's own census (`storiesKey(` has to sit inside the
  // SAME `<LoadMore>` tag its own 400-character window reads) while the
  // status facet still rides every page, not just the first.
  function loadMoreStories(cursor: string) {
    return contentApi
      .stories({ view, status: statusFacet, cursor })
      .then((r) => ({ rows: r.stories, nextCursor: r.nextCursor }))
  }

  const storiesLoading = storiesQ.data === undefined
  const rawRows = storiesQ.data ?? []

  const needle = query.trim().toLowerCase()
  let filteredRows = needle
    ? rawRows.filter((r) => r.title.toLowerCase().includes(needle) || (r.ref ?? "").toLowerCase().includes(needle))
    : rawRows
  if (facetValues.category) filteredRows = filteredRows.filter((r) => r.category === facetValues.category)
  if (facetValues.appId) filteredRows = filteredRows.filter((r) => (r.appId ?? "") === facetValues.appId)
  if (facetValues.storyType) filteredRows = filteredRows.filter((r) => (r.storyType ?? "") === facetValues.storyType)
  if (facetValues.assigneeId) filteredRows = filteredRows.filter((r) => (r.assigneeId ?? "") === facetValues.assigneeId)
  if (facetValues.sprintId) filteredRows = filteredRows.filter((r) => (r.sprintId ?? "") === facetValues.sprintId)
  // THE MOSCOW FACET STOOD HERE. PARKED, 21 Sep 2026 (`moscow-filters.tsx`'s
  // own `moscowFacet`).

  // T3851 — "a filter option inside backlog would be good, where I can filter
  // my backlogs." Category (and, on Backlog, Status) were already here; App,
  // Story type, Assignee and Phase — what a person actually narrows a backlog
  // by — were not. Derived from the loaded page (client-side, same seam
  // Category already uses) rather than a door param, so R14/R16 are
  // untouched. The App and Assignee marks join against `options.apps`/
  // `options.members` (already loaded for the create dialog, both carrying a
  // picture `Story` rows themselves do not) — the same join the ticket
  // triage queue's own App/Account facets make against a separately loaded
  // list (`tickets-collection.tsx`).
  const appsById = new Map(options.apps.map((a) => [a.id, a]))
  const appsSeen = new Map<string, { name: string; logo: string | null }>()
  for (const r of rawRows)
    if (r.appId) appsSeen.set(r.appId, { name: r.appName ?? t("An app"), logo: appsById.get(r.appId)?.logoUrl ?? null })
  const membersById = new Map(options.members.map((m) => [m.id, m]))
  const assigneesSeen = new Map<string, { name: string; photo: string | null }>()
  for (const r of rawRows)
    if (r.assigneeId)
      assigneesSeen.set(r.assigneeId, {
        name: r.assigneeName ?? t("Someone who has left"),
        photo: membersById.get(r.assigneeId)?.photo ?? null,
      })
  const phasesSeen = new Map<string, string>()
  for (const r of rawRows) if (r.sprintId) phasesSeen.set(r.sprintId, r.sprintName ?? t("A phase"))

  // CALLED UNCONDITIONALLY, ABOVE EVERY EARLY RETURN — `apps-screen.tsx`/
  // `collection-frame.tsx`'s own discipline for `useFilterBar`. Options come
  // off the team's OWN live `Story category` vocabulary (`options.categories`,
  // the same source the form's two pills read), never the rows on screen —
  // a category with no CURRENT story still offers to filter by it, no
  // different from any other closed-vocabulary facet in the app.
  // THE MOSCOW FACET STOOD HERE TOO. PARKED, 21 Sep 2026
  // (`moscow-filters.tsx`'s own `moscowFacet`).
  const facets: FilterFacet[] = [
    {
      field: "category",
      label: t("Category"),
      control: "select",
      options: options.categories.map((c) => ({ value: c, label: c })),
    },
    {
      field: "appId",
      label: t("App"),
      control: "select",
      options: [...appsSeen].map(([value, { name, logo }]) => ({
        value,
        label: name,
        mark: <RecordMark picture={logo} name={name} size="choice" />,
      })),
    },
    {
      field: "storyType",
      label: t("Story type"),
      control: "select",
      // Words, not copy — a story type is the team's own live vocabulary
      // (`options.storyTypes`), the same reason Category's own labels above
      // are not wrapped in `t()` either.
      options: options.storyTypes.map((v) => {
        const iconName = storyTypeIconName(v)
        const TypeIcon = iconName ? iconComponent(iconName) : null
        return {
          value: v,
          label: v,
          mark: TypeIcon ? <TypeIcon className="text-muted-foreground size-3.5 shrink-0" /> : undefined,
        }
      }),
    },
    {
      field: "assigneeId",
      label: t("Assigned to"),
      control: "select",
      options: [...assigneesSeen].map(([value, { name, photo }]) => ({
        value,
        label: name,
        mark: <RecordMark picture={photo} name={name} size="choice" />,
      })),
    },
    {
      field: "sprintId",
      label: t("Phase"),
      control: "select",
      options: [...phasesSeen].map(([value, name]) => ({ value, label: name })),
    },
    // THE BACKLOG TAB'S OWN STATUS FACET (Aurora's ruling, 21 Sep 2026,
    // verbatim: "To Do means its scheduled in an active phase, Backlog
    // otherwise", and the filter offers them as two choices). Narrowed
    // through the DOOR (`statusFacet`, above), never client side: picking one
    // of these four asks `contentApi.stories` again with the door's own word
    // (`OpenStoryFacetStatus`, workers/content/src/lib/stories.ts). Four
    // choices, not `work-panels.tsx`'s own StoriesPanel facet's five, this
    // tab is the everyday backlog, never the board, so In Progress is left
    // off exactly as Aurora's brief named it.
    //
    // `ordered: true` — a LIFECYCLE PIPELINE (R75's own named class, "a
    // status pipeline"), not a naming vocabulary, so it is declared in the
    // order a person reads a story's own progress rather than left to
    // `useFilterBar`'s default A→Z (R75's first-half seam would otherwise
    // read Backlog, Done, In Review, To Do). The flag needs the matching
    // `FACET_ORDER_OK` line (shared/rules/registry.ts) beside it, the same
    // pairing `apps-screen.tsx#stage` and `wave-finder.tsx#sprintType`
    // already carry for their own pipelines.
    //
    // "In Review", CAPITAL R — the story's own status CHIP's word
    // (`story-detail.tsx`, `stories-screen.tsx`'s `storyLead`, both drawn
    // through `storyStatusWord`) is sentence case ("In review"), the List's
    // own convention; this facet is a short, Title Case LABEL beside three
    // others that already read that way (Backlog, To Do, Done), the same
    // Title Case the board's own `KANBAN_STATUS_LABEL.in_review` spells for
    // the identical reason (`storyStatusWord`'s own header: "a caller that
    // wants the Board's Title Case columns … spells those two directly").
    ...(view === "backlog"
      ? [
          {
            field: "status", ordered: true,
            label: t("Status"),
            control: "select" as const,
            options: [
              { value: "backlog", label: t("Backlog") },
              { value: "to_do", label: t("To Do") },
              { value: "in_review", label: t("In Review") },
              { value: "done", label: t(storyStatusWord("done", null)) },
            ],
          },
        ]
      : []),
  ]
  const filterPill = useFilterBar({
    facets,
    values: facetValues,
    data: rawRows,
    onChange: (fld, value) =>
      setFacetValues((prev) => {
        const next = { ...prev }
        if (value === "") delete next[fld]
        else next[fld] = value
        return next
      }),
    onClearFacets: () => setFacetValues({}),
    resultCount: filteredRows.length,
  })

  if (storiesQ.error)
    return (
      <ShapeStateBody
        shape="collectionScreen"
        state="error"
        copy={{ errorTitle: t("Couldn't load the work.") }}
        action={
          <Button variant="secondary" onClick={() => storiesQ.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )

  const badges: Record<StoryView, string> = {
    open: "",
    now: formatCount(counts.now),
    planned: formatCount(counts.planned),
    backlog: formatCount(counts.backlog),
    completed: formatCount(counts.completed),
    all: formatCount(counts.all),
    reviews: formatCount(counts.reviews),
  }

  const sortedRows = [...filteredRows].sort((a, b) => compareStories(a, b, sortField, sortDir))
  // PLANNED/BACKLOG DROP THE LEADING REF BADGE from the Story cell — their
  // own standalone ID column (below) already carries it, and showing the
  // same reference twice on one row is the fault this split avoids.
  const data = shapeStories(sortedRows, waveNames, lang, view !== "planned" && view !== "backlog")
  const columns =
    view === "completed"
      ? COMPLETED_COLUMNS
      : view === "all"
        ? EVERYONE_COLUMNS
        : view === "reviews"
          ? REVIEWS_LIST_COLUMNS
          : view === "planned" || view === "backlog"
            ? PLANNED_BACKLOG_COLUMNS
            : MINE_COLUMNS
  const tableRecipeBase = withDataDrivenCollection(
    { ...recipe, display: "table" as const, fields: translateFields(columns, t) },
    data.rows
  )
  const tableRecipe: ScreenRecipe = tableRecipeBase.collection
    ? {
        ...tableRecipeBase,
        collection: { ...tableRecipeBase.collection, searchable: false, userFilter: false, sortable: false, showCount: false },
      }
    : tableRecipeBase
  const tableColumns: TableColumn[] = tableRecipe.fields.map((f) => {
    // Map recipe fields to table columns, preserving any sortType/sortKey from the field definition
    const col: TableColumn = { key: f.column, label: f.field.label }
    if ((f as any).sortType) col.sortType = (f as any).sortType
    if ((f as any).sortKey) col.sortKey = (f as any).sortKey
    // R96: THE STANDALONE ID COLUMN (Planned/Backlog's and Reviews' own
    // `field("ref", "Story")`) draws through the same black chip register
    // every other reference in this app does — `TableColumn`'s own `render`
    // slot (record-table.tsx), the seam this table already offers rather
    // than a second row shape. The row itself still hands over the RAW
    // string (`shapeStories()`'s `ref: s.ref || ""`, unchanged), so search
    // and sort over the shaped rows keep comparing the value, never a
    // rendered node. `width: "w-px"`, 22 Sep 2026 — her ruling, "reduce the
    // space for the ID column everywhere" — shrinks the column to the
    // chip's own content width under the table's auto layout, same as
    // `TicketRowsTable`'s own id column (tickets-collection.tsx).
    if (f.column === "ref") {
      col.render = (value) => <RecordRef value={value as string | null | undefined} />
      col.width = "w-px"
    }
    return col
  })

  // THE BOARD — BY STATUS (Now, Backlog, All). `KANBAN_STATUSES` is
  // the client's own three-column ruling (below), never the full fixed
  // lifecycle and never the team-editable "Story status" labels.
  //
  // THE CARD ITSELF — Aurora's ruling, 20 Sep 2026, verbatim: "show as chips
  // 1) type (as it is) and 2) the app name (underlined, because link). Under
  // the title, then sprint and who's doing it (with avatar)." The app name
  // is drawn as a plain, underlined badge rather than a real `RecordChipLink`
  // — a nested anchor inside a DRAGGABLE card fights the card's own pointer
  // handling, the same reason the sprint badge it replaces was always a
  // plain `Badge` and not a link either; the underline alone carries "this
  // names a real record" without adding a second click target. The MoSCoW
  // tag used to ride the same badge row, last. PARKED, 21 Sep 2026
  // (`moscow-chip.tsx`).
  const boardCard = (s: Story) => ({
    id: s.id,
    title: s.title,
    badges: (
      <>
        {storyTypeChip(s.storyType)}
        <Badge variant="secondary" size="pill" className={s.appName ? "underline" : "italic opacity-55"}>
          {s.appName ?? t("No app")}
        </Badge>
        {/* THE MOSCOW TAG STOOD HERE. PARKED, 21 Sep 2026 (`moscow-chip.tsx`). */}
      </>
    ),
    // SPRINT, THEN WHO'S DOING IT WITH AN AVATAR — the ruling's own order,
    // "under the title." Kanban's `description` slot takes any node, so both
    // lines share it rather than needing a slot the kit does not offer.
    description: (
      // M8, below `sm`: the phase line and the assignee line stacked as two
      // rows, one of the taller shapes in the board's own card (mobile
      // audit, cause 5 — no shared compact-row floor across modules). At `sm`
      // and above this is untouched (`flex-col gap-1`, unconditional before);
      // below it the same two lines wrap onto one row instead.
      <span className="flex flex-col gap-1 max-sm:flex-row max-sm:flex-wrap max-sm:items-center max-sm:gap-x-2 max-sm:gap-y-0">
        <span className={s.sprintName ? "text-sm" : "text-sm italic opacity-55"}>
          {s.sprintName ?? t("No phase")}
        </span>
        {/* THEIR PHOTOGRAPH, NOT THEIR INITIALS — Aurora, 23 Sep 2026: "where
            there's avatar show it- only initials when avatar is empty." The
            card drew the initials tile for EVERY assignee, including the ones
            with a photograph on file, which also quietly under-delivered the
            20 Sep 2026 ruling this card was built from — "then sprint and
            who's doing it (with avatar)". `membersById` is already in scope,
            built a few hundred lines up off `options.members` for the
            Assignee FACET, whose own comment already says that list carries
            "a picture `Story` rows themselves do not"; the card simply never
            asked it. Matched by `assigneeId`, never by the name: two
            colleagues can share one (`assignableMembers`' own duplicate-name
            note), and a name match would hand one of them the other's face.
            An unassigned story, and an assignee who has since left the team,
            both miss the map and keep the initials tile. */}
        <span className="flex items-center gap-1.5">
          <RecordMark
            picture={s.assigneeId ? (membersById.get(s.assigneeId)?.photo ?? null) : null}
            name={staffNameFromSnapshot(s.assigneeName) || t("Nobody yet")}
            shape="round"
            size="choice"
          />
          <span className="text-sm">{staffNameFromSnapshot(s.assigneeName) || t("Nobody yet")}</span>
        </span>
      </span>
    ),
  })
  const statusBoardColumns: KanbanColumn[] = KANBAN_STATUSES.map((status) => ({
    id: status,
    title: KANBAN_STATUS_LABEL[status],
    dot: storyStatusDotTone(status),
    // "TO DO" HOLDS ONLY AN OPEN STORY WHOSE OWN PHASE IS ACTIVE TODAY (see
    // this section's own header): every other open story is a Backlog
    // story and this board has no column for it.
    cards: filteredRows.filter((s) => storyBelongsOnKanbanColumn(s, status)).map(boardCard),
  }))

  // THE BOARD — BY SPRINT (Planned only). Columns are the sprints actually
  // present on this page, plus "No sprint" last — dynamic, unlike the fixed
  // status board, so a column only ever appears when a real story is in it.
  // READ-ONLY: dragging a card here would mean reassigning the story's sprint,
  // a different write than the status move above, and out of this pass.
  const sprintGroups = new Map<string, { name: string; cards: Story[] }>()
  for (const s of filteredRows) {
    const key = s.sprintId ?? "__none__"
    const group = sprintGroups.get(key) ?? { name: s.sprintName ?? t("No phase"), cards: [] }
    group.cards.push(s)
    sprintGroups.set(key, group)
  }
  const sprintBoardColumns: KanbanColumn[] = [...sprintGroups.entries()].map(([id, g]) => ({
    id,
    title: g.name,
    cards: g.cards.map(boardCard),
  }))

  // THE WEEK (Planned only) — the dated slice, due date the sprint's own end
  // date where there is one, the story's legacy date otherwise.
  const weekEntries: CalendarEntry[] = filteredRows
    .filter((s) => s.sprintEndsOn || s.dueOn)
    .map((s) => ({
      id: s.id,
      day: ((s.sprintEndsOn ?? s.dueOn) as string).slice(0, 10),
      title: s.title,
      dotTone: storyStatusDotTone(s.status),
      detail: s.sprintName ?? undefined,
      // WHOSE IT IS — Aurora, 23 Sep 2026, week-view variation One ("Open
      // column"): the week card carries the app and the account as chips
      // above its title, drawn by `EntryCard` through R94's own ordering
      // seam. Handed over as NAMES, never ids: the card draws a chip, not a
      // link (see that component's own note on why it is not an anchor), and
      // a row with neither name simply draws one chip fewer.
      //
      // ONE CHIP HERE, NOT TWO: `Story` carries `accountId` and no
      // `accountName` (shared/types.ts), so there is no account NAME on the
      // row to draw. Left absent rather than resolved by a second lookup this
      // ruling did not ask for.
      appName: s.appName ?? undefined,
    }))
  const hasDueDated = rawRows.some((s) => s.sprintEndsOn || s.dueOn)

  const tableViewOption = { value: "table", label: t("List"), icon: <ListBullets className="size-4" /> }
  const boardViewOption = { value: "board", label: t("Board"), icon: <KanbanGlyph className="size-4" /> }
  const weekViewOption = { value: "week", label: t("Week"), icon: <CalendarDots className="size-4" /> }
  const queueViewOption = { value: "queue", label: t("Queue"), icon: <StackGlyph className="size-4" /> }
  const viewSlot: ToolbarViewSlot =
    view === "now"
      ? {
          views: [boardViewOption, tableViewOption],
          value: nowView,
          onValueChange: (v) => setNowView(v === "table" ? "table" : "board"),
        }
      : view === "planned"
        ? {
            views: [tableViewOption, boardViewOption, weekViewOption],
            value: plannedView,
            onValueChange: (v) => setPlannedView(v === "board" ? "board" : v === "week" ? "week" : "table"),
          }
        : view === "backlog"
          ? {
              views: [tableViewOption, boardViewOption],
              value: backlogView,
              onValueChange: (v) => setBacklogView(v === "board" ? "board" : "table"),
            }
          : view === "all"
            ? {
                views: [tableViewOption, boardViewOption],
                value: everyoneView,
                onValueChange: (v) => setEveryoneView(v === "board" ? "board" : "table"),
              }
            : view === "reviews"
              ? {
                  views: [queueViewOption, tableViewOption],
                  value: reviewsView === "list" ? "table" : "queue",
                  onValueChange: (v) => setReviewsView(v === "table" ? "list" : "queue"),
                }
              : { views: [tableViewOption], value: "table", onValueChange: () => {} }

  const rawEmpty = subView === "week" ? !hasDueDated : rawRows.length === 0
  const toolbarEmpty = !storiesLoading && rawEmpty

  const toolbar = (
    <ToolbarRow
      empty={toolbarEmpty}
      search={
        (storiesLoading || !rawEmpty) && (
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder={t("Search work…")}
            className="w-full"
          />
        )
      }
      filters={(storiesLoading || !rawEmpty) && filterPill}
      sort={
        (storiesLoading || !rawEmpty) && {
          options: storySortOptions(t),
          value: sortField,
          onValueChange: (v) => {
            const next = v === "deadline" ? "deadline" : "rank"
            setSortField(next)
            setSortDir("asc")
          },
          direction: sortDir,
          onDirectionChange: setSortDir,
        }
      }
      view={(storiesLoading || !rawEmpty) && viewSlot}
      actions={canCreate && <AddButton label={t("New story")} onClick={() => setStoryOpen(true)} />}
    />
  )

  const body = storiesLoading ? (
    <Skeleton variant="list" lines={4} />
  ) : rawEmpty ? (
    <CollectionEmptyState
      title={subView === "week" ? t("No stories with a due date yet.") : t("Nothing on this list yet.")}
      onCreate={canCreate ? () => setStoryOpen(true) : undefined}
    />
  ) : filteredRows.length === 0 ? (
    <CollectionEmptyState filtered title={t("Nothing on this list yet.")} />
  ) : subView === "board" ? (
    <Kanban
      // THREE COLUMNS, FULL WIDTH (Aurora's ruling, 20 Sep 2026: "remove the
      // 'done' column and expand the other three to full width — only 3
      // instead of 4") — the STATUS board only; the sprint board (Planned)
      // keeps the old, column-count-agnostic formula because its own column
      // count varies with how many sprints are actually on the page.
      columnWidth={
        view === "planned"
          ? "max(18rem, calc((100% - 3 * var(--space-2h)) / 4))"
          : "max(18rem, calc((100% - 2 * var(--space-2h)) / 3))"
      }
      columns={view === "planned" ? sprintBoardColumns : statusBoardColumns}
      onMove={view !== "planned" && canEditStories ? moveStatus : undefined}
      onCardSelect={(card) => onIntent({ kind: "open", module: "stories", id: card.id })}
      label={t("Stories by status")}
      emptyColumns="bare"
    />
  ) : subView === "week" ? (
    <RecordWeek
      entries={weekEntries}
      onSelect={(entry) => onIntent({ kind: "open", module: "stories", id: entry.id })}
    />
  ) : subView === "queue" ? (
    <ReviewsQueue
      stories={filteredRows}
      lang={lang}
      t={t}
      onSelect={(id) => onIntent({ kind: "open", module: "stories", id })}
    />
  ) : (
    <CollectionCreateActionProvider action={null}>
      <RecordTable
        columns={tableColumns}
        rows={data.rows}
        config={tableRecipe.collection as CollectionConfig}
        actions={visibleActions(tableRecipe, rights, onAction)}
        onRowClick={(row) => onIntent({ kind: "open", module: "stories", id: String(row.id) })}
        rowPath={(row) => `/t/${teamId}/stories/${String(row.id)}`}
        rowLabel={(row) => row.nameText}
        useKitPanel
      />
    </CollectionCreateActionProvider>
  )

  return (
    <CountedAbove active={(total ?? 0) > 0 || Object.values(counts).some((n) => (n ?? 0) > 0)}>
      {/* --heading-strip-gap (web/app/globals.css) - Aurora, 22 Sep 2026:
          "reduce the spacing above the folder tabs, there's too much." */}
      <div className="flex flex-col gap-[var(--heading-strip-gap)]">
        {/* THE MODULE'S OWN DOOR INTO ITS SETTINGS (R61) — the story types and
            categories, both stored on `stories` and so belong here. */}
        <CollectionHeading sectionKey="stories" total={total} action={<ModuleSettingsGear teamId={teamId} segment="stories" />} />

        <SectionWithCreate
          show={canCreate}
          label={t("New story")}
          icon="plus"
          onCreate={() => setStoryOpen(true)}
          secondary={onImport ? { show: canCreate, label: t("Import CSV"), onClick: onImport } : undefined}
          folderTabs={{
            config: {
              ...defaultTabsConfig,
              tabs: storyTabs.map((tab) => ({
                value: tab.value,
                label: t(tab.label),
                icon: tab.icon,
                badge: badges[tab.value],
                badgeVariant: "" as const,
              })),
            },
            value: view,
            onValueChange: (v) => onViewChange(v as StoryView),
          }}
          useKitPanel={false}
        >
          <div className="flex flex-col">
            {toolbar}
            {body}
            {!storiesLoading && !rawEmpty && filteredRows.length > 0 && (
              <LoadMore
                listKey={statusFacet ? `${storiesKey(teamId, view)}:status:${statusFacet}` : storiesKey(teamId, view)}
                label={t("Load more work")}
                fetchPage={loadMoreStories}
              />
            )}
          </div>
        </SectionWithCreate>

        {/* THE ONE CLICK, beside the work it is against (BUILD-1 §5). */}
        <StartTimerStrip teamId={teamId} canCreate={canCreate} />

        <StoryFormDialog
          teamId={teamId}
          open={storyOpen}
          onOpenChange={setStoryOpen}
          sprints={options.sprints}
          apps={options.apps}
          tickets={options.tickets}
          members={options.members}
          appStaff={options.appStaff}
          processes={options.processes}
          storyTypes={options.storyTypes}
          categories={options.categories}
          draftKey={`story:add:${teamId}`}
          defaultAssigneeId={myUserId ?? ""}
          onSubmit={async (v) => {
            // R41: the concise-arrow census reads this exact shape — a NAMED
            // return value, awaited straight from the maker, handed back so
            // the dialog can hang a picked-but-unattached file on it.
            const createdId = await createStoryFrom(teamId, v, t)
            invalidateEveryStoryView()
            return createdId
          }}
        />
      </div>
    </CountedAbove>
  )
}
