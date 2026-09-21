// B0302/T3661 — "Ticket and story titles … are actually displaying the
// description instead of the title." The detail head was building
// `RecordScreen`'s title from `richTextPlain(translation.of(ticket.description))`
// while the collection row already named the same ticket through the one seam,
// `ticketTitle` (shared/web/ticket-chips.tsx, fixed there 6 Sep 2026):
// titleEn, then titleDe, and the description only as the last resort. Two
// answers for one ticket's name, on two screens one click apart.
//
// DRIVEN, NOT SCANNED — the same reasoning web/test/story-born-on-a-ticket.test.tsx
// gives for driving the real screen rather than reading its source: a comment
// can say the right thing beside a prop that does the wrong one, and only a
// render that reads the h1 back catches that.
//
// THE SECOND HALF OF THIS FILE IS A CENSUS, off the file's own text, of every
// site in help-detail.tsx that still reads `ticket.description` directly —
// keyed by what each site DOES (the expression it sits in), never by a line
// number, because a line number rots on the next edit above it (CLAUDE.md,
// "never key an exemption by line"). Two sites are legitimate: the
// conversation's own first bubble (the request, shown in full, which is the
// whole point of a thread) and the edit form's initial value (never rendered,
// only carried into the dialog that lets somebody rewrite it). Nothing else
// may read it raw — the title goes through `ticketTitle` now and reads
// nothing here at all, which this file also asserts directly.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { HelpTicket } from "@shared/types"
import { ticketTitle } from "@shared/web/ticket-chips"

const BASE_TICKET = {
  id: "help-1",
  ref: "BERG-T0412",
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

const perms = vi.hoisted(() => ({ can: vi.fn(() => true) }))
vi.mock("@/lib/perms", () => ({ usePermissions: () => ({ can: perms.can }) }))

const api = vi.hoisted(() => ({ ticket: null as unknown as HelpTicket }))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    content: {
      ...actual.content,
      help: async () => ({ tickets: [api.ticket], total: 1, nextCursor: null, hasMore: false }),
      helpOne: async () => api.ticket,
      helpThread: async () => ({ replies: [], total: 0 }),
      helpStakeholders: async () => ({ stakeholders: [] }),
      stories: async () => ({ stories: [], total: 0, nextCursor: null, hasMore: false }),
      sprints: async () => ({ sprints: [], total: 0 }),
      workLogs: async () => ({ logs: [], total: 0, totalSeconds: 0, nextCursor: null, hasMore: false }),
      workLogSummary: async () => ({ total: 0, totalSeconds: 0, people: [], kinds: [], weeks: [] }),
      helpAttachments: async () => ({ attachments: [], total: 0 }),
      runningTimers: async () => ({ timers: [] }),
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

// V1 (17 Sep 2026) DRAWS EVERY PANEL AT ONCE — see ticket-close-moved-to-top.test.tsx's
// own comment beside this same mock for the full account.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@shared/ui/components/sonner/sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
  Toaster: () => null,
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { HelpDetailScreen } from "@/components/tickets/help-detail"

afterEach(cleanup)
beforeEach(() => {
  perms.can.mockReset().mockReturnValue(true)
})

const openTicket = () =>
  render(<HelpDetailScreen teamId="team-1" helpId="help-1" myUserId="u-1" basePath="/tickets" />)

describe("the ticket detail head names the ticket the same way the collection row does", () => {
  // D14 draws the identity row (the ID/type/app/date chips) as the FIRST
  // CHILD INSIDE the title's own `<h1>` node, so the heading's `textContent`
  // is the chips' text followed by the title's — asserted with `endsWith`,
  // never `toBe`, so this file is not coupled to how many chips a fixture
  // happens to draw.
  it("shows titleEn over the description when both exist", async () => {
    api.ticket = {
      ...BASE_TICKET,
      titleEn: "The dispatch board will not load",
      titleDe: null,
      description: "<p>Ugh, none of my drivers can see today's routes on their phones.</p>",
    } as HelpTicket
    openTicket()
    const heading = await screen.findByRole("heading", { level: 1 })
    expect(heading.textContent?.endsWith("The dispatch board will not load")).toBe(true)
    expect(heading.textContent).not.toContain("drivers")
  })

  it("falls back to titleDe when there is no English title", async () => {
    api.ticket = {
      ...BASE_TICKET,
      titleEn: null,
      titleDe: "Dispatch-Board lädt nicht",
      description: "<p>None of my drivers can see today's routes.</p>",
    } as HelpTicket
    openTicket()
    const heading = await screen.findByRole("heading", { level: 1 })
    expect(heading.textContent?.endsWith("Dispatch-Board lädt nicht")).toBe(true)
    expect(heading.textContent).not.toContain("drivers")
  })

  it("reads the description only when the ticket has no title at all — the 788 imported rows' case", async () => {
    api.ticket = {
      ...BASE_TICKET,
      titleEn: null,
      titleDe: null,
      description: "<p>None of my drivers can see today's routes on their phones.</p>",
    } as HelpTicket
    openTicket()
    const heading = await screen.findByRole("heading", { level: 1 })
    // Flattened (no markup) and, this being the ONLY case the fallback fires,
    // the actual words of the request.
    expect(
      heading.textContent?.endsWith("None of my drivers can see today's routes on their phones.")
    ).toBe(true)
  })
})

describe("ticketTitle itself — the seam both screens now share", () => {
  it("never reaches the description branch while either title exists", () => {
    const readDescriptionAs = vi.fn((text: string) => text)
    const named = ticketTitle(
      { titleEn: "Real title", titleDe: null, description: "<p>body</p>" },
      readDescriptionAs
    )
    expect(named).toBe("Real title")
    // THE REGRESSION ITSELF: T3661 was the description winning even though a
    // title existed. If the reader function were called unconditionally the
    // fallback branch would still be "computed" even when discarded — this
    // asserts it is never even asked for.
    expect(readDescriptionAs).not.toHaveBeenCalled()
  })

  it("runs the description through the given reader only on the fallback branch", () => {
    const readAsGerman = (text: string) => text.replace("Hello", "Hallo")
    const named = ticketTitle(
      { titleEn: null, titleDe: null, description: "<p>Hello there</p>" },
      readAsGerman
    )
    expect(named).toBe("Hallo there")
  })

  it("defaults to identity, so every caller that predates this seam is unchanged", () => {
    const named = ticketTitle({ titleEn: null, titleDe: null, description: "<p>Plain</p>" })
    expect(named).toBe("Plain")
  })
})

// ── THE CENSUS ───────────────────────────────────────────────────────────
//
// Off the file's own source text, not off any parsed AST — the same
// discipline `web/test/rules.test.ts`'s censuses use, and enough here: the
// point is that nobody can reintroduce a THIRD reader of the raw description
// without this test naming the new site.
describe("help-detail.tsx reads ticket.description in exactly two places", () => {
  const source = readFileSync(
    join(__dirname, "..", "components", "tickets", "help-detail.tsx"),
    "utf8"
  )

  // Every expression of the shape `ticket.description`, with the few
  // characters around it that say what it sits inside — enough to classify
  // the site without ever naming a line number.
  const CONTEXT = 40
  const sites = [...source.matchAll(/ticket\.description/g)].map((m) => {
    const start = Math.max(0, (m.index ?? 0) - CONTEXT)
    return source.slice(start, (m.index ?? 0) + CONTEXT)
  })

  // THE ALLOWED SITES, NAMED BY WHAT THEY DO — never by where they are on
  // disk. Every one is read straight off today's source so this test breaks
  // the moment any of their wording changes shape, rather than silently
  // widening. The record HEAD's title is deliberately not among them any
  // more: it reads no `ticket.description` in this file at all now, because
  // it goes through `ticketTitle` (shared/web/ticket-chips.tsx) instead —
  // see the next `it` below.
  const ALLOWED = [
    // The conversation's own first message — the request, shown in full,
    // which is the entire point of a thread.
    "body: <RichText html={translation.of(ticket.description)} />",
    // The edit dialog's initial value — never rendered as a title or a
    // label, only carried into the form that lets somebody rewrite it.
    "description: ticket.description,",
    // ONE SHORT CAPTION LEFT, NOT THE RECORD'S NAME — StoryFormDialog's
    // `fixedTicket.label`, `[ticket.ref, richTextPlain(ticket.description)]`
    // joined by " · ", a caption drawn BESIDE the ticket's own reference
    // chip on the "New work on this request" dialog, never alone and never
    // as this screen's title — B0302/T3661 was about the h1, and this is
    // not it. Out of this fix's scope on purpose (the planner's brief named
    // only the RecordScreen title); flagged here so a reviewer knows it was
    // seen, not missed.
    //
    // WorkLogsPanel's OWN `recordLabel` caption sat here too until the
    // Effort card round (B43/B44, round thirty-three): help-detail.tsx no
    // longer mounts `<WorkLogsPanel>` at all, replaced by the shared
    // `<EffortCard>` (web/components/work/effort-card.tsx), which carries no
    // `recordLabel` prop and no "Log time" dialog of its own — the head's
    // own Start/Stop timer button is the one way a new row is written now
    // (that file's own header says so). The caption's only job was
    // prefilling that dialog's "what you worked on" field (`fixedTarget:
    // {…, label: recordLabel}`), so it did not lose its source, its whole
    // reason for reading the description left with the door it labelled.
    "richTextPlain(ticket.description)].filter(Boolean)",
  ]

  it("names every site, so a new one cannot slip in silently", () => {
    for (const site of sites) {
      const known = ALLOWED.some((allowed) => site.includes(allowed))
      expect(known, `unrecognised ticket.description read near: …${site}…`).toBe(true)
    }
  })

  it("never builds the record head's title from the raw description any more", () => {
    // The old fault, word for word — if this string is back in the file, the
    // seam was bypassed again.
    expect(source).not.toContain("richTextPlain(translation.of(ticket.description))")
    // The new seam IS present, and it is what draws the title.
    expect(source).toContain("title={ticketTitle(ticket, translation.of)}")
  })

  it("keeps the working title (story label) out of scope, on record — it still flattens the body directly rather than through ticketTitle, which is correct: it is not the record's name, it is a short caption beside the ticket's own ref", () => {
    // Documents the one remaining `richTextPlain(ticket.description)` call
    // site (StoryFormDialog's fixedTicket label) so a future reader does not
    // mistake the census above for silence about it. WorkLogsPanel's own
    // `recordLabel` read was here too until the Effort card round (B43/B44,
    // round thirty-three) retired `<WorkLogsPanel>` from this screen
    // entirely — `<EffortCard>` carries no "Log time" dialog and no
    // `recordLabel` prop to feed, so there is nothing left on this page for
    // that read to label. One caption's whole reason for reading the
    // description left with the door it prefilled; the other is untouched.
    const flattenedLabelSites = [...source.matchAll(/richTextPlain\(ticket\.description\)/g)]
    expect(flattenedLabelSites.length).toBe(1)
  })
})
