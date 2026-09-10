// WHAT EACH COLLECTION MAY BE ORDERED BY, in the words a person reads.
//
// The other half of `shared/workers/sorting.ts`. That file holds the SQL and the
// cursor key — the door's half. This one holds the NAMES and the LABELS — the
// screen's half — and they are separate files because they are separated by the
// wire: the screen sends a name, the door looks it up.
//
// Which is exactly why they live in ONE place each and are checked against each
// other. A screen offering "Deadline" for a door whose menu has no `deadline` is
// a control that produces a clean 400 the moment somebody presses it: a sort
// option that looks like every other one and simply breaks. So
// `web/test/paged-sort.test.ts` reads each door's own `SortMenu` off disk and
// asserts its keys are exactly the values below — the same shape R19 uses to keep
// a tool's filters honest against its door.
//
// The LABELS are what a 45–55-year-old manager reads on a dropdown, so they say
// what the order IS rather than naming a column: "Newest first", not
// "created_at desc". `defaultDir` is where an option LANDS when it is picked —
// dates newest-first, names A→Z — because landing on oldest-first reads as
// broken (the library's own SortControl header says the same).

import type { SortOption } from "@shared/web/screen-engine/config"

/** One collection's sort control: what it offers, and which of those the DOOR
 * falls back to when the screen asks for nothing. The default is never sent —
 * a screen sitting on it reads the collection's own cache key and looks exactly
 * as it did before sorting existed (web/components/records/paged-find.tsx). */
export type CollectionSort = { defaultSort: string; options: SortOption[] }

/** THE PAGED COLLECTIONS' sort menus, keyed by the collection's name in
 * `GROWING_COLLECTIONS` (shared/rules/registry.ts) so the check can find the
 * door that owns each one without anything being hand-paired. */
export const COLLECTION_SORTS: Record<string, CollectionSort> = {
  accounts: {
    defaultSort: "created",
    options: [
      { value: "created", label: "Newest first", defaultDir: "desc" },
      { value: "name", label: "Name", defaultDir: "asc" },
      { value: "code", label: "Reference", defaultDir: "asc" },
      { value: "updated", label: "Recently changed", defaultDir: "desc" },
    ],
  },
  // The drag-rank first, because it is the order somebody arranged by hand and
  // the one this list has always opened in (SCOPE ch.07).
  help: {
    defaultSort: "rank",
    options: [
      { value: "rank", label: "Priority order", defaultDir: "desc" },
      { value: "created", label: "Newest first", defaultDir: "desc" },
      // WHEN IT WAS CLOSED — client, 2026-09-09. THE WHOLE MENU IS DECLARED
      // HERE, AND ONE TAB SHOWS LESS OF IT. This file is the collection's
      // vocabulary and `paged-sort.test.ts` holds it to exactly the names
      // `TICKET_SORTS` knows, so an option withheld by a tab still has to exist
      // here or the two halves of the seam stop matching. WHICH tab may offer
      // which of these is `helpTabSorts` (web/lib/live-resources.ts), the same
      // shape `helpTabFacets` already uses for the toolbar's filters — and it
      // is the reason this one is not simply deleted from the list: a sort a
      // reader can reach on the Closed tab is a sort the door has to know
      // everywhere, because the door has no idea which tab asked.
      { value: "closed", label: "Recently closed", defaultDir: "desc" },
      { value: "updated", label: "Recently changed", defaultDir: "desc" },
      { value: "status", label: "Stage", defaultDir: "asc" },
      { value: "kind", label: "Type", defaultDir: "asc" },
      { value: "title", label: "What was asked", defaultDir: "asc" },
    ],
  },
  knowledge: {
    defaultSort: "touched",
    options: [
      { value: "touched", label: "Recently changed", defaultDir: "desc" },
      { value: "added", label: "Newest first", defaultDir: "desc" },
      { value: "title", label: "Title", defaultDir: "asc" },
      { value: "kind", label: "Type", defaultDir: "asc" },
      // NOT the same as "added": a contract signed in March and filed in August
      // is March's, and "what do we have from last spring?" is a question only
      // this one answers.
      { value: "dated", label: "Date of the material", defaultDir: "desc" },
    ],
  },
  processes: {
    defaultSort: "created",
    options: [
      { value: "created", label: "Newest first", defaultDir: "desc" },
      { value: "name", label: "Name", defaultDir: "asc" },
      { value: "app", label: "App", defaultDir: "asc" },
      { value: "steps", label: "Most steps", defaultDir: "desc" },
    ],
  },
  stories: {
    defaultSort: "rank",
    options: [
      { value: "rank", label: "Priority order", defaultDir: "desc" },
      { value: "deadline", label: "Deadline", defaultDir: "asc" },
      { value: "created", label: "Newest first", defaultDir: "desc" },
      { value: "status", label: "Stage", defaultDir: "asc" },
      { value: "assignee", label: "Who has it", defaultDir: "asc" },
      { value: "title", label: "Name", defaultDir: "asc" },
    ],
  },
  meetings: {
    defaultSort: "when",
    // A "Status" option sat here and went with the status: sorting by when a
    // meeting IS is already sorting by whether it has happened.
    options: [
      { value: "when", label: "Most recent first", defaultDir: "desc" },
      { value: "title", label: "Name", defaultDir: "asc" },
      // THE LABEL IS ACCOUNT SINCE 2026-09-09 (her ruling: "the filter client
      // is the company, so it's the account"); the VALUE stays "client"
      // because it is the sort key the meetings door answers to, not a word
      // anybody reads. Same ruling as CLAUDE.md's `help`/Tickets: the
      // human-facing word moves, the identifier stays.
      { value: "client", label: "Account", defaultDir: "asc" },
      { value: "added", label: "Recently added", defaultDir: "desc" },
    ],
  },
  // WORK_LOG_SORTS (workers/content/src/lib/work-logs.ts) is this door's own
  // menu — three names, one per real question a timesheet gets asked.
  workLogs: {
    defaultSort: "started",
    options: [
      { value: "started", label: "Date", defaultDir: "desc" },
      { value: "duration", label: "Length", defaultDir: "desc" },
      { value: "person", label: "Who logged it", defaultDir: "asc" },
    ],
  },
}

/** One collection's options with their labels put through the reader's own
 * language (R28). The recipes do this for the frame's own sort options
 * (`translateCollection` in web/lib/screens.ts); a `<PagedFind>` is the same
 * control on a paged screen and needs the same treatment, so it is one function
 * rather than the same `.map` written six times. */
export function translatedSorts(key: string, t: (english: string) => string): SortOption[] {
  return (COLLECTION_SORTS[key]?.options ?? []).map((o) => ({ ...o, label: t(o.label) }))
}

/** THE ORDER A COLLECTION IS IN, AND THE ONE HANDLE THAT CHANGES IT.
 *
 * Two controls can put a list in order — the picker beside the search box and a
 * column header on a table — and on the meetings list they sit on the same screen. They
 * are one QUESTION, so they get one handle rather than a state each: whichever
 * is used, the same `set` runs, and neither can be showing an order the other
 * one moved away from.
 *
 * It lives here beside the names because it is the same half of the seam: this
 * file is what the SCREEN knows about ordering (`shared/workers/sorting.ts` is
 * the door's half). `by` is a name from the menu above when the door owns the
 * order, and a column key when the browser does — the difference is which side
 * of the wire the handle was built on, and nothing that renders it cares.
 *
 * `by: ""` means "the order it arrived in", which a header returns to on its
 * third click and is the reason `set` takes a null: the door's own default is
 * one press away and is never a thing the screen has to remember. */
export type CollectionOrder = {
  by: string
  dir: "asc" | "desc"
  set: (by: string | null, dir: "asc" | "desc") => void
}
