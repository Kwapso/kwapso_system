"use client"

// INPUTS — what we are waiting on a client for, on its own sidebar page
// (Task C, 15 Sep 2026 — documents/UI-RULEBOOK.md K entry). Pulled off the
// Tasks screen it never belonged on: "The whole 'waiting on clients': remove
// it from tasks. This is a completely different module, and we will put this
// somewhere else" (tasks-screen.tsx's own header carries the ruling in full).
// The client's follow-up, the same day: "Do you remember that we already
// decided on the naming for the 'tasks' that we assigned to customers? I
// would like to see this in the third section of the accounts section on the
// sidebar." The word was already the glossary's own — `todo: { term: "Input"
// }` (shared/glossary.ts) — and this is the screen that word was waiting for.
//
// ── I1: JUST A LIST — THE CLIENT'S OWN CHOICE ───────────────────────────────
//
// Shown a side-by-side of three directions (grouped-by-account, a board), she
// picked the first: "the view that I want is the first one you suggested,
// I1: just a list… I like the column that flags how long we are waiting.
// Also, show the account and add a filter for account."
//
// THREE TABS, A SERVER VIEW EACH (R14/R16) — Waiting (open, not yet due or no
// due date at all), Overdue (open, past its due date) and Received (done,
// under the word this screen's tab reads it by). The door's own
// `todoViewClause` (workers/content/src/lib/todos.ts) is where the split
// lives; `TODO_VIEWS` (shared/types.ts) carries the three new names beside
// the panel's original `open`/`done`, untouched.
//
// NO "MINE" TAB. An input is owed BY a client TO us — nobody on staff owns
// one the way they own a task, so there is no caller-name column to narrow
// by. What decides whether a reader sees every account's or only the ones
// they manage is a PERMISSION (`all_inputs:read`, mirroring `all_tasks:read`
// one module along) applied at the DOOR (`getTodos`,
// workers/content/src/routes/todos.ts) — this screen only says so, the same
// shape 8.11/4.9 already take everywhere else in the app.
//
// TABLE, TICKETS' SHAPE (R80) — through `<PagedFind>` + `<RecordTable>`, the
// identical pairing Contacts draws (contacts-screen.tsx is this file's own
// closest template): the door owns search/facets/sort (R14 — a GROWING
// collection, the Received pile keeps every completed input for ever, for
// the same reason the panel beside it always has), so there is one search
// box and it is the honest one.
//
// ── WHAT'S ON THE ROW, AND WHAT ISN'T ────────────────────────────────────
//
// Input (the title) · Account (a real face, R35 — logo mark + name) ·
// Contact (who completed it, R54 — blank until it has been; a to-do carries
// no "who this is addressed to" field before that) · Due · Waiting (days
// since raised, blank on Received — `waitingBadge` below) · Received on
// (Received tab only).
//
// TWO THINGS THE DESIGN PASS DREW THAT THE DOOR CANNOT ANSWER TODAY, LEFT
// OUT RATHER THAN FAKED — both the coordinator's own I1 mock names as a real
// gap, not an oversight of this pass: "Nudge itself — resend the portal
// reminder — has no door anywhere in the app yet." So:
//   · NO "Last nudge" column. `Todo` (shared/types.ts) carries no
//     reminder/nudge timestamp at all.
//   · NO "Nudge" row action. `grep`ping workers/content/src/routes/todos.ts
//     and web-portal/lib/todos.ts turns up no resend-reminder door on either
//     surface.
// "Mark received" IS wired — it is the existing `completeTodo` door, the
// same act the account/contact panel's own row already offers, called with
// no file (a client attaches their own from the portal; staff completing on
// the phone send nothing, exactly as `completeTodo`'s own header allows).
//
// THE ACCOUNT MANAGER FACET IS THE ONE PIECE OF THE MOCK LEFT OUT TOO, and
// for a reason worth being honest about rather than silently dropping: a
// cheap facet reads its OPTIONS off rows this screen has already loaded (the
// same idiom apps-screen.tsx's own Account facet takes, below) — but a
// `Todo` row carries no account-manager id or name at all, only its
// `accountId`. Building real options would mean fetching every account on
// this screen just to populate a dropdown, which is not "cheap" by the same
// measure the Account facet passes. The DOOR already supports narrowing by
// it (`accountManagerId`, `TodoFilter`, lib/todos.ts) — it is what
// `all_inputs:read`'s own narrowing is built out of — so the day this
// screen also loads a company list (or the row carries a manager name), the
// facet is one entry in the array below and nothing else moves.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { toast } from "@shared/ui/components/sonner/sonner"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { defaultTabsConfig } from "@shared/web/screen-engine/tabs-view"
import type { ScreenRecipe } from "@shared/web/screen-engine/recipe"
import type { CollectionConfig, FilterFacet, SortOption } from "@shared/web/screen-engine/config"

import { CollectionHeading } from "@/components/records/collection-heading"
import { LoadMore } from "@/components/records/load-more"
import { PagedFind } from "@/components/records/paged-find"
import { RecordTable, type TableAction, type TableColumn } from "@/components/records/record-table"
import { CollectionCard, AddButton } from "@/components/deep-link/screen-bits"
import { TodoFormDialog, type TodoFormValues } from "@/components/work/todo-form-dialog"
import { content as contentApi, ApiFailure } from "@/lib/api"
import { appsKey, inputsKey, listFetch, todosKey, type InputView } from "@/lib/live-resources"
import { field, translateFields, withDataDrivenCollection } from "@/lib/screens"
import { formatCount } from "@shared/web/format-count"
import { formatDate } from "@shared/web/format"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { RecordMark } from "@shared/web/record-mark"
import { invalidate, useCached } from "@shared/web/store"
import type { Todo } from "@shared/types"
import type { Language } from "@shared/i18n"

/** THE THREE TABS, IN THE CLIENT'S OWN ORDER — the coordinator's I1 mock,
 * adopted whole. */
const INPUT_TABS: { value: InputView; label: string; icon: string }[] = [
  { value: "waiting", label: "Waiting", icon: "clipboard-text" },
  { value: "overdue", label: "Overdue", icon: "warning" },
  { value: "received", label: "Received", icon: "check-circle" },
]

/** THE TOOLBAR'S OWN SORT — "Due" (the panel's own default ordering) and
 * "Waiting longest" (`TODO_SORTS.waiting`, lib/todos.ts — oldest raised
 * first), the client's own words: "I like the column that flags how long we
 * are waiting." */
function inputSortOptions(t: (s: string) => string): SortOption[] {
  return [
    { value: "due", label: t("Due"), defaultDir: "asc" },
    { value: "waiting", label: t("Waiting longest"), defaultDir: "asc" },
  ]
}

/** THE WAITING BADGE — days since the input was RAISED (`createdAt`), never
 * since its due date: an input with no due date at all still waits, and the
 * client's own word is "waiting", not "late". Blank on Received (the row has
 * finished waiting, and `receivedOn` carries that column's own fact instead —
 * there is no third tone to draw here since nothing green-coded renders on
 * this tab at all) — through the kit's own Badge tones, never a bespoke
 * colour.
 *
 * ONE TONE PER STATE, NOT A DAY THRESHOLD — client ruling, 16 Sep 2026
 * evening, verbatim: "For inputs waiting, let's use orange." This used to
 * grade the Waiting tab itself, quiet (`secondary`) under a week and only
 * `warning` past it — a second, undocumented tier her sentence does not
 * make room for. The STATE is what carries the colour now, same as Overdue's
 * `destructive` already did and still does (the door has already decided the
 * row is overdue; this reads that fact rather than re-deriving it from a
 * date in the browser) — every Waiting row is `warning` (kit `--warning`,
 * the orange token), regardless of how many days it has been waiting; the
 * day count itself still prints, inside the same orange pill. */
function waitingBadge(todo: Todo, view: InputView, t: (s: string, vars?: Record<string, unknown>) => string) {
  if (todo.completedAt) return null
  const days = Math.max(0, Math.floor((Date.now() - new Date(todo.createdAt).getTime()) / 86400000))
  const tone = view === "overdue" ? "destructive" : "warning"
  return (
    <Badge variant={tone} size="pill">
      {t("{count} days", { count: days })}
    </Badge>
  )
}

/** One to-do, shaped for the table — a single pass, the same discipline
 * `shapeTasks` (tasks-screen.tsx) and `shapeContactsTable` (deep-link/
 * shape.tsx) both keep, so every view reads the identical row. */
function shapeInputs(todos: Todo[], view: InputView, lang: Language, t: (s: string, vars?: Record<string, unknown>) => string) {
  return {
    rows: todos.map((todo) => ({
      id: todo.id,
      mark: <RecordMark name={todo.title} />,
      name: todo.title,
      // THE ACCOUNT'S OWN FACE (R35) — the same `<RecordMark picture={…}
      // name={…}/>` beside the word pairing every other list in the app
      // draws for its own Account cell. `account` rides alongside as plain
      // text for the column's `searchKey` (record-table.tsx's own doc on
      // why a node column still needs one, even inert on a paged table).
      accountCell: (
        <span className="flex items-center gap-2">
          <RecordMark picture={todo.accountLogoUrl} name={todo.accountName} size="choice" />
          <span>{todo.accountName ?? "—"}</span>
        </span>
      ),
      account: todo.accountName ?? "",
      // R54: who completed it is a name always willing to print (one of the
      // client's own people, or a staff member on the phone with them) —
      // but it is the ONE fact this row has no honest answer for before
      // completion, because a to-do carries no "addressed to" field. Blank
      // on Waiting/Overdue rather than a guess.
      contact: todo.completedAt
        ? todo.completedByIsClient
          ? (todo.completedByName ?? "—")
          : staffNameFromSnapshot(todo.completedByName) || "—"
        : "—",
      due: todo.dueOn ? formatDate(todo.dueOn, lang) : "—",
      waiting: waitingBadge(todo, view, t),
      receivedOn: todo.completedAt ? formatDate(todo.completedAt, lang) : "—",
    })),
  }
}

const INPUT_COLUMNS = [
  field("name", "Input"),
  field("accountCell", "Account"),
  field("contact", "Contact"),
  field("due", "Due"),
  field("waiting", "Waiting"),
  field("receivedOn", "Received on"),
]

export function InputsScreen({
  teamId,
  t,
  lang,
  recipe,
  inputsQ,
  total,
  counts,
  view,
  onViewChange,
  canCreate,
  canUpdate,
}: {
  teamId: string
  t: (english: string, vars?: Record<string, unknown>) => string
  lang: Language
  recipe: ScreenRecipe
  /** the RESTING read (R14/R16) — this tab's own cold-start page, the one
   * `<PagedFind>` falls back to before its own find-key warms up, and the
   * one `restingEmpty`/`restingLoading` below answer honestly from. */
  inputsQ: { data: Todo[] | undefined; error: unknown }
  /** the exact server total of the tab showing (R16) — never a loaded
   * list's length. */
  total: number | undefined
  counts: { waiting: number | undefined; overdue: number | undefined; received: number | undefined }
  view: InputView
  onViewChange: (v: InputView) => void
  canCreate: boolean
  /** `inputs:update` — the same right `completeTodo` gates on. */
  canUpdate: boolean
}) {
  const [addOpen, setAddOpen] = React.useState(false)

  const loading = inputsQ.data === undefined
  const resting = inputsQ.data ?? []

  // THE TEAM'S OWN APPS, bounded (R14) and cached under the one key every
  // other App field in the app already shares (R15/R56) — the same read
  // `sprints-screen.tsx` makes for its own `AccountAppPicker` (F15). Fed to
  // the form dialog rather than fetched inside it, the same shape
  // `SprintFormDialog`/`WaveFormDialog`/`MeetingFormDialog` all take.
  const appsQ = useCached(appsKey(teamId), () => listFetch.apps(teamId))

  async function addInput(values: TodoFormValues) {
    await contentApi.raiseTodo({
      accountId: values.accountId,
      title: values.title,
      detail: values.detail || undefined,
      dueOn: values.dueOn ? new Date(values.dueOn).toISOString() : undefined,
      appId: values.appId || undefined,
      assignedContactId: values.assignedContactId || undefined,
    })
    // A NEW INPUT LANDS ON WAITING (or, rarely, already Overdue if raised with
    // a past due date) — never Received. All three keys drop rather than one
    // guessed at, the same shape `addTask` (tasks-screen.tsx) takes with
    // `TASK_VIEWS`.
    invalidate(todosKey(teamId))
    for (const v of ["waiting", "overdue", "received"] as const) invalidate(inputsKey(teamId, v))
    toast.success(t("Asked, and emailed to them."))
  }

  async function markReceived(id: string) {
    try {
      await contentApi.completeTodo(id)
      invalidate(todosKey(teamId))
      for (const v of ["waiting", "overdue", "received"] as const) invalidate(inputsKey(teamId, v))
      toast.success(t("Marked received."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't mark that received."))
    }
  }

  const badges: Record<InputView, string> = {
    waiting: formatCount(counts.waiting),
    overdue: formatCount(counts.overdue),
    received: formatCount(counts.received),
  }

  // THE ACCOUNT FACET (client ruling: "add a filter for account") — options
  // read off the rows THIS screen has already loaded, the same cheap idiom
  // `apps-screen.tsx`'s own Account facet takes, never a second fetch of the
  // whole book. An account this tab has never shown still keeps its place
  // once picked from a warm cache elsewhere — the door answers the question
  // either way, this only offers what a reader can recognise by name.
  const accountOptions = Array.from(new Map(resting.map((r) => [r.accountId, r])).values())
    .map((r) => ({
      value: r.accountId,
      label: r.accountName ?? t("An account"),
      mark: <RecordMark picture={r.accountLogoUrl} name={r.accountName} size="choice" />,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const facets: FilterFacet[] = [{ field: "accountId", label: t("Account"), control: "select", options: accountOptions }]

  return (
    <div className="flex flex-col gap-4">
      <CollectionHeading sectionKey="inputs" total={total} />
      <PagedFind<Todo>
        listKey={inputsKey(teamId, view)}
        placeholder={t("Search inputs…")}
        matches={{
          none: t("No inputs match"),
          one: t("1 input matches"),
          many: t("{count} inputs match"),
        }}
        sorts={inputSortOptions(t)}
        defaultSort="due"
        restingEmpty={resting.length === 0}
        restingLoading={loading}
        // THE TAB IS ALWAYS ASKED, so `found.active` is always true — the
        // same shape ContactsScreen's own `fixed` takes, and the same
        // reason: the DOOR narrows to whichever tab is open, and `resting`
        // is only this component's own fallback before that answer lands.
        fixed={{ view }}
        facets={facets}
        fetchPage={(query, cursor) =>
          contentApi.todos({ ...query, cursor: cursor ?? undefined }).then((r) => ({
            rows: r.todos,
            nextCursor: r.nextCursor,
            total: r.total,
          }))
        }
        tabs={{
          config: {
            ...defaultTabsConfig,
            tabs: INPUT_TABS.map((tab) => ({
              value: tab.value,
              label: t(tab.label),
              icon: tab.icon,
              badge: badges[tab.value],
              badgeVariant: "" as const,
            })),
          },
          value: view,
          onValueChange: (v) => onViewChange(v as InputView),
        }}
        wrap={(inner) => <CollectionCard>{inner}</CollectionCard>}
        actions={() => canCreate && <AddButton label={t("Ask for something")} onClick={() => setAddOpen(true)} />}
      >
        {(found) => {
          const rows = found.active ? found.rows : loading ? null : resting
          if (rows === null) return <Skeleton variant="list" lines={4} />
          if (rows.length === 0)
            return (
              <CollectionEmptyState
                // `found.emptyText` is set only when something BEYOND the tab
                // itself is being asked (a search word, a facet, a
                // non-default sort) — `fixed`'s own `view` never counts,
                // which is exactly "is this tab genuinely empty, or narrowed
                // to nothing" (R62).
                filtered={found.emptyText !== undefined}
                title={
                  view === "received"
                    ? t("Nothing has come back from a client yet.")
                    : t("Nothing outstanding with a client.")
                }
                onCreate={
                  canCreate && view !== "received" && found.emptyText === undefined
                    ? () => setAddOpen(true)
                    : undefined
                }
              />
            )
          const data = shapeInputs(rows, view, lang, t)
          const tableRecipe = withDataDrivenCollection(
            { ...recipe, display: "table" as const, fields: translateFields(INPUT_COLUMNS, t) },
            data.rows
          )
          const columns: TableColumn[] = tableRecipe.fields.map((f) => ({ key: f.column, label: f.field.label }))
          // "MARK RECEIVED" — the panel's own act (`completeTodo`), one
          // door, offered wherever it would move the row: never on a tab
          // that is already Received (R17's own reasoning at the screen —
          // completing a completed input moves nothing and the door would
          // silently no-op).
          const actions: TableAction<(typeof data.rows)[number]>[] =
            canUpdate && view !== "received"
              ? [{ label: t("Mark received"), onSelect: (row) => void markReceived(String(row.id)) }]
              : []
          return (
            <>
              <RecordTable
                columns={columns}
                rows={data.rows}
                config={tableRecipe.collection as CollectionConfig}
                order={found.order}
                actions={actions}
                narrowedOutside={found.active}
              />
              <LoadMore
                listKey={found.listKey ?? inputsKey(teamId, view)}
                label={t("Load more inputs")}
                fetchPage={found.fetchPage}
              />
            </>
          )
        }}
      </PagedFind>

      <TodoFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        draftKey={`todo:add:inputs:${teamId}`}
        apps={(appsQ.data ?? []).filter((a) => a.active)}
        onSubmit={addInput}
      />
    </div>
  )
}
