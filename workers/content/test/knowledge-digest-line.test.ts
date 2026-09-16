// BUILD-5 §D (16 Sep 2026) — the morning digest names a failed knowledge
// source rather than leaving it to a column nobody was watching
// (`index-one-source-skips.test.ts` covers the seam half; this covers the
// mail).
//
// THE GUARD CHANGE IS THE FIRST THING THIS PROVES: before this lane the send
// was skipped entirely unless there was ticket backlog or missing time, so a
// team with a clean triage queue but three sources failing to index got no
// mail AT ALL — the exact silence R12 exists to end for unattended work.

import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({
  sent: [] as { to: string; subject: string; intro: string }[],
}))

vi.mock("@shared/workers/notify", () => ({
  sendBrandedEmail: async (_env: unknown, to: string, subject: string, content: { intro: string }) => {
    holder.sent.push({ to, subject, intro: content.intro })
    return true
  },
  teamName: async () => "Kwapso",
}))

vi.mock("@shared/workers/record-link", () => ({
  audienceOf: () => "agency",
  clientUserIds: async () => new Set<string>(),
  frontDoorOrigin: () => "https://agency-staging.kwapso.app",
  recordLink: () => ({ label: "Open Tickets", url: "https://agency-staging.kwapso.app/tickets" }),
}))

const { sendTriageDigest } = await import("../src/lib/notify")

const env = { DB: {} } as never
const to = [{ email: "on-duty@kwapso.app", name: "On Duty" }]

beforeEach(() => {
  holder.sent.length = 0
})

describe("sendTriageDigest — the knowledge line", () => {
  it("sends nothing when there is truly nothing to say", async () => {
    await sendTriageDigest(env, "team1", to, {
      waiting: 0,
      oldestDays: 0,
      onDutyName: "Alaap",
      missingTime: [],
    })
    expect(holder.sent).toEqual([])
  })

  it("sends on knowledge failures ALONE, with a clean triage queue and nothing missing", async () => {
    await sendTriageDigest(env, "team1", to, {
      waiting: 0,
      oldestDays: 0,
      onDutyName: "Alaap",
      missingTime: [],
      knowledgeUnhealthy: { count: 2, sample: ["Week recap — 14 Aug", "HOGO sync notes"] },
    })
    expect(holder.sent).toHaveLength(1)
    expect(holder.sent[0].intro).toContain("2 knowledge sources failed to index")
    expect(holder.sent[0].intro).toContain("Week recap — 14 Aug")
    expect(holder.sent[0].intro).toContain("HOGO sync notes")
  })

  it("uses the singular for exactly one", async () => {
    await sendTriageDigest(env, "team1", to, {
      waiting: 0,
      oldestDays: 0,
      onDutyName: "Alaap",
      missingTime: [],
      knowledgeUnhealthy: { count: 1, sample: ["Week recap — 14 Aug"] },
    })
    expect(holder.sent[0].intro).toContain("1 knowledge source failed to index")
    expect(holder.sent[0].intro).not.toContain("sources failed")
  })

  it("joins the knowledge line with the ordinary triage lines, all three at once", async () => {
    await sendTriageDigest(env, "team1", to, {
      waiting: 3,
      oldestDays: 5,
      onDutyName: "Alaap",
      missingTime: ["Ishita"],
      knowledgeUnhealthy: { count: 1, sample: ["Week recap — 14 Aug"] },
    })
    const { intro } = holder.sent[0]
    expect(intro).toContain("3 requests have been waiting")
    expect(intro).toContain("No time was logged last week by: Ishita")
    expect(intro).toContain("1 knowledge source failed to index")
  })

  it("says nothing about knowledge when the count is zero, even if the field is present", async () => {
    await sendTriageDigest(env, "team1", to, {
      waiting: 1,
      oldestDays: 2,
      onDutyName: "Alaap",
      missingTime: [],
      knowledgeUnhealthy: { count: 0, sample: [] },
    })
    expect(holder.sent[0].intro).not.toContain("knowledge")
  })
})
