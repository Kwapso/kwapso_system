// EFFECTIVE ASSIGNEE, the resolver both the ticket page and (later) the
// story page read: the record's own assignee, else the app's own answer
// (its lead), with an `inherited` flag the "Inherited from <app>" line reads
// off. See `shared/effective-assignee.ts`'s own header for the ruling and
// why the app side is never a second, disconnected `apps.assignee_id`.

import { describe, expect, it } from "vitest"

import { effectiveAssignee } from "@shared/effective-assignee"

describe("effectiveAssignee", () => {
  it("the record's own assignee wins when it has one", () => {
    const result = effectiveAssignee(
      { assigneeId: "U1", assigneeName: "Alaap Kanchwala" },
      { id: "AP1", name: "Bergman dispatch", assigneeId: "U2", assigneeName: "Petya Bletsova" }
    )
    expect(result).toEqual({ id: "U1", name: "Alaap Kanchwala", inherited: false, appName: null })
  })

  it("falls back to the app's own answer when the record has none", () => {
    const result = effectiveAssignee(
      { assigneeId: null, assigneeName: null },
      { id: "AP1", name: "Bergman dispatch", assigneeId: "U2", assigneeName: "Petya Bletsova" }
    )
    expect(result).toEqual({
      id: "U2",
      name: "Petya Bletsova",
      inherited: true,
      appName: "Bergman dispatch",
    })
  })

  it("a record with no app and no assignee answers nobody", () => {
    expect(effectiveAssignee({ assigneeId: null, assigneeName: null }, null)).toEqual({
      id: null,
      name: null,
      inherited: false,
      appName: null,
    })
  })

  it("an app with no lead staffed to it answers nobody too", () => {
    const result = effectiveAssignee(
      { assigneeId: null, assigneeName: null },
      { id: "AP1", name: "Bergman dispatch", assigneeId: null, assigneeName: null }
    )
    expect(result).toEqual({ id: null, name: null, inherited: false, appName: null })
  })

  it("a record's own assignee still wins even when it names no app at all", () => {
    const result = effectiveAssignee({ assigneeId: "U1", assigneeName: "Alaap Kanchwala" }, null)
    expect(result).toEqual({ id: "U1", name: "Alaap Kanchwala", inherited: false, appName: null })
  })
})
