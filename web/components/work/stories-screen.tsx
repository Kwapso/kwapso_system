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
import { ListBullets, Kanban as KanbanGlyph, CalendarDots } from "@shared/ui/foundations/icons"
import type { ScreenActionContext, ScreenIntent } from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import {
  CollectionEmptyState,
  CollectionCreateActionProvider,
} from "@shared/web/screen-engine/collection-frame"
import { type CollectionConfig, type FilterFacet, type SortOption } from "@shared/web/screen-engine/config"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"

import { CollectionHeading } from "@/components/records/collection-heading"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { CountedAbove } from "@/components/records/counted-tabs"
import type { CalendarEntry } from "@/components/records/record-calendar"
import { RecordWeek } from "@/components/records/record-week"
import { RecordTable, visibleActions, type TableColumn } from "@/components/records/record-table"
import {
  SectionWithCreate,
  AddButton,
  ToolbarRow,
  type ToolbarViewSlot,
} from "@/components/deep-link/screen-bits"
import { LoadMore } from "@/components/records/load-more"
import { StoryFormDialog, type StoryFormValues } from "@/components/work/story-form-dialog"
import { StartTimerStrip } from "@/components/work/time-panel"
import { STORY_STATUS_LABEL } from "@/components/work/work-panels"
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
import { formatCount } from "@shared/web/format-count"
import { storyStatusDotTone } from "@shared/status-tones"
import { STORY_STATUSES, type AppRow, type HelpTicket, type ProcessSummary, type SelectableValue, type Sprint, type Story, type StoryStatus, type TeamMember } from "@shared/types"
import { useAfterPaint } from "@shared/web/after-paint"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { invalidate, useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import { useRemembered } from "@shared/web/remembered"
import { assignableMembers } from "@/lib/members"
import { storyTypeIconName, type StoryTypeIconName } from "@shared/story-types"
import { iconComponent } from "@shared/web/screen-engine/icon"
import { richTextPlain } from "@shared/web/rich-text"

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
    apps: (appsQ.data ?? []).filter((a) => a.active).map((a) => ({ id: a.id, name: a.name, logoUrl: a.logoUrl })),
    appNames: new Map((appsQ.data ?? []).map((a) => [a.id, a.name])),
    // CHECKLIST 6.4: OPEN tickets only, each tagged with the app it is about so
    // the form can narrow to the one being chosen.
    tickets: (ticketsQ.data ?? [])
      .filter((t) => t.status !== "resolved" && !t.archivedAt)
      .map((t) => ({
        id: t.id,
        label: t.ref ? `${t.ref} · ${richTextPlain(t.description)}` : richTextPlain(t.description),
        appId: t.appId,
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
 * FIVE TABS, FOUR OF THEM "MINE" UNCONDITIONALLY. `now`/`planned`/`backlog`/
 * `completed` narrow to the caller's own name AT THE DOOR
 * (`workers/content/src/routes/stories.ts`'s own `MINE_VIEWS`), the identical
 * shape Tasks' three MINE tabs take — including a story with no assignee at
 * all riding along (`includeUnassigned`), because this backlog is old enough
 * to carry plenty of unclaimed history. `all` is Everyone's, gated on
 * `all_stories:read` (a new module, seeded exactly like `all_tasks`).
 *
 * EACH TAB OFFERS ITS OWN VIEWS (R53): Now is Board by status (default) + List;
 * Planned is List (default) + Board by sprint + Week by due date; Backlog is
 * List (default) + Board by status; Completed is List only; Everyone's is
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
  if (!value) return <span className="text-muted-foreground text-sm">—</span>
  const iconName = storyTypeIconName(value)
  const Icon = iconName ? iconComponent(iconName) : null
  return (
    <Badge variant="secondary" className="gap-1">
      {Icon && <Icon className="size-3.5" />}
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
// this, `icon-map.ts` would never import `ArrowsClockwise`/`Bug`/`Database`/
// `Sparkle`/`Wrench` for THIS reason (some of the five may still be pulled in
// by an unrelated call elsewhere), and a story type's chip would draw a HOLE
// the day it stopped being. Kept beside `STORY_TYPE_ICONS`
// (@shared/story-types) so the two can never drift the way the meeting
// census and its vocabulary cannot.
const STORY_TYPE_ICON_CENSUS: { icon: StoryTypeIconName }[] = [
  { icon: "database" },
  { icon: "wrench" },
  { icon: "bug" },
  { icon: "sparkle" },
  { icon: "arrows-clockwise" },
]
void STORY_TYPE_ICON_CENSUS

/** ONE STORY'S OWN TWO-COLOUR SHAPE — mark, ref chip, title — shared by every
 * view that shows a story as a single node (the List's Story column, and the
 * Board's card title row). */
function storyLead(s: Story): React.ReactNode {
  return (
    <span className="flex items-center gap-2 min-w-0">
      {s.ref && (
        <Badge variant="secondary" className="font-mono shrink-0">
          {s.ref}
        </Badge>
      )}
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

/** THE SPRINT COLUMN'S TWO LINES — the sprint's own name, and the wave it was
 * sold inside underneath it, muted. `waveNames` resolves the second line off
 * the sprints this screen's own form options already load
 * (`useStoryFormOptions`'s `sprintsQ`) — no new read, no new field on `Story`.
 * "No sprint" reads as a plain, quiet line, never a blank cell. */
function sprintCell(s: Story, waveNames: Map<string, string | null>): React.ReactNode {
  if (!s.sprintId || !s.sprintName)
    return <span className="text-muted-foreground text-sm italic">—</span>
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
 * does not sort (R53: one order, decided at the toolbar). */
function shapeStories(stories: Story[], waveNames: Map<string, string | null>) {
  return {
    rows: stories.map((s) => ({
      id: s.id,
      name: storyLead(s),
      // ITS OWN COLUMN NOW, NOT SQUEEZED INTO THE STORY CELL — an icon+word
      // chip is wider than the two-letter tile it replaces, and Category
      // (beside it) already gets its own column for the identical reason.
      type: storyTypeChip(s.storyType),
      category: categoryChip(s),
      status: STORY_STATUS_LABEL[s.status],
      sprint: sprintCell(s, waveNames),
      assignee: staffNameFromSnapshot(s.assigneeName) || "Nobody yet",
    })),
  }
}

/** THE FOUR COLUMN SETS — one per tab shape, `tasks.ts`'s own reasoning
 * (`TASK_COLUMNS`/`COMPLETED_COLUMNS`/`EVERYONE_COLUMNS`): a column that reads
 * the same fact down every row of the tab it sits on is furniture. Now,
 * Planned and Backlog are all "mine" and status-mixed, so Status stays; it is
 * dropped on Completed (every row already `done`) and Assignee only appears
 * on Everyone's, the one tab that is not already narrowed to the caller. */
const MINE_COLUMNS = [
  field("name", "Story"),
  field("type", "Type"),
  field("category", "Category"),
  field("status", "Status"),
  field("sprint", "Sprint"),
]
const COMPLETED_COLUMNS = [
  field("name", "Story"),
  field("type", "Type"),
  field("category", "Category"),
  field("sprint", "Sprint"),
]
const EVERYONE_COLUMNS = [
  field("name", "Story"),
  field("type", "Type"),
  field("assignee", "Who has it"),
  field("category", "Category"),
  field("status", "Status"),
  field("sprint", "Sprint"),
]

/** THE TOOLBAR'S OWN SORT VOCABULARY (R53) — the drag order every story
 * already carries (`Story.rank`, the same field the door's own default
 * ordering reads) and Deadline, the sprint's own end date where there is a
 * sprint and the story's legacy date where there is not
 * (`Story.sprintEndsOn`). */
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

/** THE FOUR "MINE" TABS, in the client's own order — Now first, the artifact's
 * own recommendation. Written as data so the strip, the fetch key and the
 * badge cannot fall out of step. */
const STORY_TABS: { value: StoryView; label: string; icon: string }[] = [
  { value: "now", label: "Now", icon: "warning" },
  { value: "planned", label: "Planned", icon: "clipboard-text" },
  // "Backlog", NOT "All" — the client's own correction over the design
  // proposal's recommendation, 15 Sep 2026 (documents/UI-RULEBOOK.md K entry).
  { value: "backlog", label: "Backlog", icon: "stack" },
  { value: "completed", label: "Completed", icon: "check" },
]
/** THE FIFTH TAB — the door's team-wide `all` view, shown only to a reader who
 * holds `all_stories:read` (`seesEveryones`, below). Kept out of `STORY_TABS`
 * itself for `tasks.ts`'s own reason: whether it appears is a permission
 * question this component answers once, not a flag every consumer of
 * `STORY_TABS` would have to filter for itself. */
const EVERYONE_TAB: { value: StoryView; label: string; icon: string } = {
  value: "all",
  label: "Everyone's",
  icon: "users-three",
}

type NowSubView = "board" | "table"
type PlannedSubView = "table" | "board" | "week"
type BacklogSubView = "table" | "board"
type EveryoneSubView = "table" | "board"

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
  const { t } = useLanguage()
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

  const storiesQ = useCached<Story[]>(storiesKey(teamId, view), () => listFetch.stories(teamId, view))
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
  const subView: NowSubView | PlannedSubView | "table" =
    view === "now"
      ? nowView
      : view === "planned"
        ? plannedView
        : view === "backlog"
          ? backlogView
          : view === "all"
            ? everyoneView
            : "table"

  // THE TOOLBAR'S OWN SEARCH AND SORT — bounded, in the browser, over
  // whichever tab's page is loaded (`tasks-screen.tsx`'s own shape: the door
  // pages a huge collection down to one tab's worth of rows, and this narrows
  // that page once for every view underneath it).
  const [query, setQuery] = React.useState("")
  const [sortField, setSortField] = React.useState<"rank" | "deadline">("rank")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")
  // THE STORIES SCREEN'S OWN FACET — Category, the client's 15 Sep 2026 ruling.
  // One facet, in the browser, over whichever tab's page is loaded, the same
  // shape `tasks-screen.tsx`'s own Priority/Department pair takes.
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({})

  // A new story belongs in several piles and only one of them is on screen.
  function invalidateEveryStoryView() {
    for (const v of ["now", "planned", "backlog", "completed", "all"] as const) invalidate(storiesKey(teamId, v))
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
      for (const v of ["now", "planned", "backlog", "completed", "all"] as const) invalidate(storiesKey(teamId, v))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't update that value."))
    }
  }

  const storiesLoading = storiesQ.data === undefined
  const rawRows = storiesQ.data ?? []

  const needle = query.trim().toLowerCase()
  let filteredRows = needle
    ? rawRows.filter((r) => r.title.toLowerCase().includes(needle) || (r.ref ?? "").toLowerCase().includes(needle))
    : rawRows
  if (facetValues.category) filteredRows = filteredRows.filter((r) => r.category === facetValues.category)

  // CALLED UNCONDITIONALLY, ABOVE EVERY EARLY RETURN — `apps-screen.tsx`/
  // `collection-frame.tsx`'s own discipline for `useFilterBar`. Options come
  // off the team's OWN live `Story category` vocabulary (`options.categories`,
  // the same source the form's two pills read), never the rows on screen —
  // a category with no CURRENT story still offers to filter by it, no
  // different from any other closed-vocabulary facet in the app.
  const facets: FilterFacet[] = [
    {
      field: "category",
      label: t("Category"),
      control: "select",
      options: options.categories.map((c) => ({ value: c, label: c })),
    },
  ]
  const { pill: filterPill, panel: filterPanel } = useFilterBar({
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
  }

  const sortedRows = [...filteredRows].sort((a, b) => compareStories(a, b, sortField, sortDir))
  const data = shapeStories(sortedRows, waveNames)
  const columns = view === "completed" ? COMPLETED_COLUMNS : view === "all" ? EVERYONE_COLUMNS : MINE_COLUMNS
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
  const tableColumns: TableColumn[] = tableRecipe.fields.map((f) => ({ key: f.column, label: f.field.label }))

  // THE BOARD — BY STATUS (Now, Backlog, Everyone's). `STORY_STATUSES` is the
  // fixed lifecycle the code trusts, never the team-editable "Story status"
  // labels — the same distinction `STORY_STATUS_LABEL` already draws.
  const boardCard = (s: Story) => ({
    id: s.id,
    title: s.title,
    // THE SPRINT, ABOVE THE TITLE (R65/K16) — the artifact's own words for
    // the Now board: "the sprint as a chip above the title instead of owning
    // the grouping". THE TYPE CHIP JOINS IT 2026-09-16 (same ruling as the
    // List's own new Type column) — `badges` is a flex-wrap row
    // (kanban.tsx), so the two sit side by side and wrap on a narrow card
    // rather than fighting for one slot.
    badges: (
      <>
        {storyTypeChip(s.storyType)}
        <Badge variant="secondary" size="pill" className={s.sprintName ? undefined : "opacity-55 italic"}>
          {s.sprintName ?? t("No sprint")}
        </Badge>
      </>
    ),
    // NO REFERENCE HERE — a reference belongs in the one black chip in FRONT
    // of a name (`storyLead`, the List view's own Story cell), never glued
    // into a plain-text description as a joined string (R "one-black-chip").
    // The card's title already carries the story's own words; this line is
    // its one other fact.
    description: s.category || undefined,
  })
  const statusBoardColumns: KanbanColumn[] = STORY_STATUSES.map((status) => ({
    id: status,
    title: STORY_STATUS_LABEL[status],
    dot: storyStatusDotTone(status),
    cards: filteredRows.filter((s) => s.status === status).map(boardCard),
  }))

  // THE BOARD — BY SPRINT (Planned only). Columns are the sprints actually
  // present on this page, plus "No sprint" last — dynamic, unlike the fixed
  // status board, so a column only ever appears when a real story is in it.
  // READ-ONLY: dragging a card here would mean reassigning the story's sprint,
  // a different write than the status move above, and out of this pass.
  const sprintGroups = new Map<string, { name: string; cards: Story[] }>()
  for (const s of filteredRows) {
    const key = s.sprintId ?? "__none__"
    const group = sprintGroups.get(key) ?? { name: s.sprintName ?? t("No sprint"), cards: [] }
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
    }))
  const hasDueDated = rawRows.some((s) => s.sprintEndsOn || s.dueOn)

  const tableViewOption = { value: "table", label: t("List"), icon: <ListBullets className="size-4" /> }
  const boardViewOption = { value: "board", label: t("Board"), icon: <KanbanGlyph className="size-4" /> }
  const weekViewOption = { value: "week", label: t("Week"), icon: <CalendarDots className="size-4" /> }
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
      toolbarPanel={(storiesLoading || !rawEmpty) && filterPanel}
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
      columnWidth="max(18rem, calc((100% - 3 * var(--space-2h)) / 4))"
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
  ) : (
    <CollectionCreateActionProvider action={null}>
      <RecordTable
        columns={tableColumns}
        rows={data.rows}
        config={tableRecipe.collection as CollectionConfig}
        actions={visibleActions(tableRecipe, rights, onAction)}
        onRowClick={(row) => onIntent({ kind: "open", module: "stories", id: String(row.id) })}
        useKitPanel
      />
    </CollectionCreateActionProvider>
  )

  return (
    <CountedAbove active={(total ?? 0) > 0 || Object.values(counts).some((n) => (n ?? 0) > 0)}>
      <div className="flex flex-col gap-6">
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
                listKey={storiesKey(teamId, view)}
                label={t("Load more work")}
                fetchPage={(cursor) =>
                  contentApi.stories({ view, cursor }).then((r) => ({ rows: r.stories, nextCursor: r.nextCursor }))
                }
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
