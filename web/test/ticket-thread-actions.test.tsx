// THE CHAT EDIT PENCIL — Aurora's 20 Sep 2026 ruling, verbatim: "for chat edit
// pencil: i like from p1 that its besides and appears when hover, but make it
// like p4 wth the 3 options menu (edit, copy/delete)." Kit v1.2.139 shipped the
// affordance (`TicketThread`'s `actions` prop); this file proves the app's own
// half of it, wired in `help-detail.tsx`'s `replies.map` at the `TicketThread`
// call site:
//
//   · the reply's own AUTHOR sees all three rows, Edit / Copy / Delete;
//   · ANOTHER member, with no ticket edit right (`help:update`), sees Copy
//     only — the menu still draws (Copy needs no permission), Edit and
//     Delete simply do not;
//   · ANOTHER member WITH the ticket edit right sees Copy and Delete, but
//     still never Edit. Aurora's 21 Sep 2026 ruling narrowed Edit to the
//     author alone, and left Delete reaching every reply the right already
//     governs (`assertMayEditReply`/`assertMayDeleteReply`,
//     workers/content/src/lib/help.ts);
//   · pressing Edit opens the app's own slide-in sheet (`reply-edit-sheet.tsx`,
//     Aurora's SAME-DAY follow-up ruling: "open the edit as slide in. can
//     edit text and date and attachments"), never the kit's own inline
//     textarea, and Save calls the update door (`content.updateHelpReply`)
//     with the reply's own id and only the field that changed;
//   · pressing Delete asks first (`useConfirm`'s own dialog — this app's
//     house pattern, not the kit's `overlays/delete-confirmation`) and only
//     calls the delete door (`content.deleteHelpReply`) once that is
//     confirmed.
//
// `ticket-thread-byline.test.tsx` already proves the RUN computation (which
// bubble gets a byline) over this same component; this file is about the
// action menu on those bubbles and does not re-prove the byline.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpMessage, HelpTicket } from "@shared/types"

const TICKET = {
  id: "help-1",
  ref: "BERG-T0412",
  titleEn: "The dispatch board will not load",
  titleDe: null,
  description: "<p>None of my drivers can see today's routes.</p>",
  helpType: "Bug",
  status: "triaged",
  archivedAt: null,
  accountId: "acct-bergman",
  accountName: "Bergman S.A.",
  appId: "app-1",
  appName: "Dispatch",
  raisedByContactId: null,
  raisedByContactName: null,
  raiserName: "Marta Bergman",
  sourceScreen: null,
  resolvedAt: null,
  draftResolution: null,
  createdAt: "2026-08-18T09:00:00.000Z",
  updatedAt: null,
  editorName: null,
} as unknown as HelpTicket

// TWO replies, two different authors — "u-1" is the signed-in viewer
// (`myUserId`, passed to `HelpDetailScreen` below), "u-2" is a colleague.
// Different created_at so the run computation never merges them (irrelevant
// to this file, but keeping them apart avoids relying on that logic at all).
const REPLIES: HelpMessage[] = [
  {
    id: "reply-own",
    ticketId: "help-1",
    body: "My own words",
    taggedUserIds: [],
    isAgent: false,
    authorId: "u-1",
    authorName: "Aurora",
    authorIsClient: false,
    createdAt: "2026-08-19T09:00:00.000Z",
  },
  {
    id: "reply-other",
    ticketId: "help-1",
    body: "A colleague's words",
    taggedUserIds: [],
    isAgent: false,
    authorId: "u-2",
    authorName: "Priya",
    authorIsClient: false,
    createdAt: "2026-08-20T09:00:00.000Z",
  },
]

const perms = vi.hoisted(() => ({ can: vi.fn((_module: string, _right: string) => true) }))
vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const updateHelpReply = vi.hoisted(() => vi.fn())
const deleteHelpReply = vi.hoisted(() => vi.fn())

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      help: async () => ({ tickets: [TICKET], total: 1, nextCursor: null, hasMore: false }),
      helpOne: async () => TICKET,
      helpThread: async () => ({ replies: REPLIES, total: REPLIES.length }),
      helpStakeholders: async () => ({ stakeholders: [] }),
      stories: async () => ({ stories: [], total: 0, nextCursor: null, hasMore: false }),
      sprints: async () => ({ sprints: [], total: 0 }),
      workLogs: async () => ({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false }),
      workLogSummary: async () => ({ total: 0, totalSeconds: 0, people: [], kinds: [], weeks: [] }),
      helpAttachments: async () => ({ attachments: [], total: 0 }),
      runningTimers: async () => ({ timers: [] }),
      // THE TWO DOORS THIS FILE PROVES ARE WIRED — never the real client
      // (which would `fetch`), always these spies. Both answer the same
      // shape `content.helpThread` already does, matching the real doors'
      // own `{ replies, total }` response.
      updateHelpReply: (...args: unknown[]) => {
        updateHelpReply(...args)
        return Promise.resolve({ replies: REPLIES, total: REPLIES.length })
      },
      deleteHelpReply: (...args: unknown[]) => {
        deleteHelpReply(...args)
        return Promise.resolve({ replies: [REPLIES[1]], total: 1 })
      },
    },
    tenancy: {
      ...actual.tenancy,
      members: async () => ({ members: [] }),
      selectable: async () => ({ values: [] }),
      apps: async () => ({ apps: [], total: 0 }),
      processes: async () => ({ processes: [], total: 0, nextCursor: null, hasMore: false }),
      activity: async () => ({ activity: [], total: 0, nextCursor: null, hasMore: false }),
    },
  }
})

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

// Same override `ticket-thread-byline.test.tsx`/`ticket-thread-composer-gap
// .test.tsx` carry — the below-lg vs desktop tree picks a real `matchMedia`
// breakpoint, and the setup file's honest `matches: false` default would
// silently render the wrong one here.
window.matchMedia = ((query: string) => ({
  matches: query === "(min-width: 64rem)",
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

// Radix's dropdown-menu AND alert-dialog primitives both read these during
// open/close; jsdom has none of them. The same polyfill block
// `head-actions-fold.test.tsx` carries for the identical reason.
beforeAll(() => {
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
  })
})

import { HelpDetailScreen } from "@/components/tickets/help-detail"

afterEach(cleanup)
beforeEach(() => {
  updateHelpReply.mockReset()
  deleteHelpReply.mockReset()
  // The default fixture: no special ticket edit right (`help:update` false),
  // every other module read true — isolates "the author always may" from "a
  // held right also may (delete only)", which the fence itself keeps as two
  // separate functions now (`assertMayEditReply`/`assertMayDeleteReply`,
  // workers/content/src/lib/help.ts).
  perms.can.mockReset().mockImplementation((module: string, right: string) => !(module === "help" && right === "update"))
})

/** Opens the message actions menu inside one bubble. Radix's
 * `DropdownMenuTrigger` opens off a pointer-down/up pair, not a bare click —
 * the same recipe `ticket-detail-no-tabs.test.tsx`'s own "…" trigger and
 * `head-actions-fold.test.tsx` already use. */
async function openMessageActions(bubble: HTMLElement) {
  const trigger = within(bubble).getByRole("button", { name: "Message actions" })
  fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
  fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 })
  fireEvent.click(trigger)
  await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy())
}

async function renderThread() {
  render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)
  await waitFor(() => expect(document.querySelector('[data-slot="ticket-thread"]')).toBeTruthy())
  const bubbles = (await waitFor(() => {
    const found = Array.from(
      document.querySelectorAll('[data-slot="thread-message"][data-side="mine"]')
    ) as HTMLElement[]
    expect(found).toHaveLength(2)
    return found
  })) as [HTMLElement, HTMLElement]
  return bubbles
}

describe("the reply's own author gets the full menu", () => {
  it("Edit, Copy and Delete all show on the author's own reply", async () => {
    const [own] = await renderThread()
    await openMessageActions(own)
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy()
  })
})

describe("another member, with no ticket edit right, gets Copy only", () => {
  it("draws the menu (Copy needs no permission) but never Edit or Delete on a colleague's reply", async () => {
    const [, other] = await renderThread()
    await openMessageActions(other)
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeTruthy()
    expect(screen.queryByRole("menuitem", { name: "Edit" })).toBeNull()
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull()
  })
})

// AURORA'S 21 SEP 2026 RULING, narrowing Edit off the ticket edit right while
// leaving Delete on it: "who may edit: A author onñy." A colleague holding
// help:update could edit ANY reply before this ruling; now that right still
// lets them take one out, but rewriting somebody else's words is refused
// even with it, proved at the door in
// workers/content/test/help-reply-actions.test.ts, proved at this wiring
// here.
describe("another member WITH the ticket edit right sees Copy and Delete, never Edit", () => {
  it("the ticket edit right reaches Delete but not Edit on a colleague's reply", async () => {
    perms.can.mockReset().mockReturnValue(true) // help:update true, same as every other module
    const [, other] = await renderThread()
    await openMessageActions(other)
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy()
    expect(screen.queryByRole("menuitem", { name: "Edit" })).toBeNull()
  })
})

// EDIT OPENS A SLIDE-IN SHEET, Aurora's SAME-DAY follow-up ruling on the
// chat message menu: "open the edit as slide in. can edit text and date and
// attachments." The kit's own inline textarea (an "Edit message" textbox
// drawn in place of the bubble) can hold only the body, so this screen wires
// `onEditRequest` (kit v1.2.143) instead of `onEdit`, and the kit draws no
// inline editor of its own at all. This file proves the WIRING at the
// `TicketThread` call site: Edit opens the sheet and not the kit's inline
// editor, Save reaches the same `updateHelpReply` door with only the field
// that changed, and Cancel calls nothing.
describe("Edit opens a slide-in sheet, not the kit's own inline editor", () => {
  it("Save calls the update door with only the changed field", async () => {
    const [own] = await renderThread()
    await openMessageActions(own)
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))

    // NO INLINE TEXTAREA: the kit's own editor never opens.
    expect(screen.queryByRole("textbox", { name: "Edit message" })).toBeNull()

    const field = await waitFor(() => screen.getByRole("textbox", { name: "Reply text" }))
    fireEvent.change(field, { target: { value: "My corrected words" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    await waitFor(() => expect(updateHelpReply).toHaveBeenCalledTimes(1))
    // ONLY WHAT CHANGED: the date and the attachments were left untouched,
    // so neither rides the call (reply-edit-sheet.tsx's own `save`).
    expect(updateHelpReply).toHaveBeenCalledWith("reply-own", { body: "My corrected words" })
  })

  it("Cancel closes the sheet and calls nothing", async () => {
    const [own] = await renderThread()
    await openMessageActions(own)
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))

    await waitFor(() => screen.getByRole("textbox", { name: "Reply text" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Reply text" })).toBeNull())
    expect(updateHelpReply).not.toHaveBeenCalled()
  })
})

describe("Delete asks first, then calls the delete door", () => {
  it("choosing Delete opens a confirm dialog and calls nothing until it is confirmed", async () => {
    const [own] = await renderThread()
    await openMessageActions(own)
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))

    const dialog = await waitFor(() => screen.getByRole("alertdialog"))
    // NOTHING CALLED YET — `onDelete` opens the ask, it does not act.
    expect(deleteHelpReply).not.toHaveBeenCalled()
    expect(within(dialog).getByText("Delete this reply?")).toBeTruthy()

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(deleteHelpReply).toHaveBeenCalledTimes(1))
    expect(deleteHelpReply).toHaveBeenCalledWith("reply-own")
  })

  it("Cancel closes the dialog and calls nothing", async () => {
    const [own] = await renderThread()
    await openMessageActions(own)
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))

    const dialog = await waitFor(() => screen.getByRole("alertdialog"))
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(deleteHelpReply).not.toHaveBeenCalled()
  })
})
