// FEEDBACK IS THE ONE KIND WITH A CONDITION ON IT, AND THE CONDITION IS AT THE DOOR.
//
// The owner's ruling, 15 Sep 2026: a ticket is one of exactly four kinds, and
// *Feedback may only be raised while a Validation sprint is running for the
// ticket's app*. `shared/ticket-types.ts` carries the whole ruling; this suite
// is the proof that `createTicket` and `updateTicket` obey it.
//
// WHY IT RUNS THE DOORS RATHER THAN READING THEM. The ticket form withholds the
// Feedback chip for the same condition, and a source scan of that form would
// pass on the day a fourth caller appears — the MCP tools `create_ticket` and
// `update_ticket`, the agentic importer and the portal's own raise dialog all
// reach these functions with no picker in front of them. A rule a browser keeps
// is a rule three callers do not, so the assertions below are HTTP round trips
// through the real handler and the real SQL.
//
// AND THE HALF THAT IS EASY TO GET WRONG: refusing the MOVE and never the ROW.
// A feedback ticket opened a fortnight after its sprint wrapped, to fix a typo,
// posts its own unchanged type straight back — and must save. A rule about what
// may be RAISED that quietly becomes a rule about history would make every
// feedback ticket in the estate read-only the week its sprint ended, which is
// the failure with no visible edge: the save just stops working, on a screen
// that looks exactly as it did yesterday.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { TICKET_TYPE_FEEDBACK, VALIDATION_SPRINT_TYPE } from "@shared/ticket-types"
import { SHARED_TOOLS } from "@shared/workers/tool-catalog"

const db = () => holder.db as DatabaseSync

function env(userId: string) {
  return {
    ...(makeEnv(() => db(), userId) as unknown as Record<string, unknown>),
    INTERNAL_KEY: "k",
    PUBLIC_APP_URL: "https://kwapso.example",
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

async function door(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(
    new Request(`https://content${path}`, {
      ...init,
      headers: { Cookie: "session=x", "Content-Type": "application/json", ...init?.headers },
    }),
    env(IDS.staffUser)
  )
}

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

/** One sprint on the victim's app. The four facts `sprintState` reads and
 * nothing else — a name, a kind, a start day, and the two endings. */
function sprint(row: {
  id: string
  kind: string | null
  startsOn?: string | null
  completedAt?: string | null
  cancelled?: boolean
  appId?: string
}) {
  db().exec(
    `INSERT INTO sprints (id, account_id, app_id, name, sprint_type, starts_on, ends_on, completed_at, deactivated_at, created_at, creator_id)
     VALUES ('${row.id}', '${IDS.victimAccount}', '${row.appId ?? IDS.victimApp}', 'A block of work',
             ${row.kind ? `'${row.kind}'` : "NULL"},
             ${row.startsOn === undefined ? `'${day(-3)}'` : row.startsOn ? `'${row.startsOn}'` : "NULL"},
             '${day(11)}',
             ${row.completedAt ? `'${row.completedAt}'` : "NULL"},
             ${row.cancelled ? `'${day(-1)}'` : "NULL"},
             '${day(-30)}', '${IDS.staffUser}');`
  )
}

async function raise(body: Record<string, unknown>): Promise<Response> {
  return door("/api/content/help", {
    method: "POST",
    body: JSON.stringify({ description: "The new screen is confusing", ...body }),
  })
}

async function refusal(res: Response): Promise<string> {
  return ((await res.json()) as { error?: string }).error ?? ""
}

/** A SECOND SYSTEM ON THE SAME CLIENT. The fixture ships one app, and two of the
 * cases below are about the fence being `app_id` rather than "does this team
 * validate anything this month" — which one app cannot express. */
const OTHER_APP = "AP_OTHER"

beforeEach(() => {
  holder.db = buildSpineDb()
  db().exec(`DELETE FROM help`)
  db().exec(`DELETE FROM sprints`)
  db().exec(
    `INSERT INTO apps (id, account_id, name, stage, created_at, creator_id)
     VALUES ('${OTHER_APP}', '${IDS.victimAccount}', 'Bergman invoicing', 'Development', '${day(-60)}', '${IDS.staffUser}');`
  )
})

describe("raising feedback", () => {
  it("is refused when the app has no Validation sprint at all", async () => {
    sprint({ id: "S_IMPL", kind: "Implementation" })
    const res = await raise({ helpType: TICKET_TYPE_FEEDBACK, appId: IDS.victimApp })
    expect(res.status, "a picker cannot be trusted to withhold it — the door must").toBe(400)
    expect(await refusal(res)).toBe("feedback_needs_validation")
  })

  it("is refused when the Validation sprint has been completed", async () => {
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE, startsOn: day(-30), completedAt: day(-2) })
    expect(await refusal(await raise({ helpType: TICKET_TYPE_FEEDBACK, appId: IDS.victimApp }))).toBe(
      "feedback_needs_validation"
    )
  })

  it("is refused when the Validation sprint was cancelled", async () => {
    // WRAPPED IS TWO ENDINGS, and a block somebody switched off is over too —
    // `sprintState`'s own first line. Without this case a cancelled sprint would
    // keep the door open for as long as its dates said, which is the one way a
    // "running" test can be wrong in the permissive direction.
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE, startsOn: day(-30), cancelled: true })
    expect(await refusal(await raise({ helpType: TICKET_TYPE_FEEDBACK, appId: IDS.victimApp }))).toBe(
      "feedback_needs_validation"
    )
  })

  it("is refused when the Validation sprint has not started yet", async () => {
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE, startsOn: day(5) })
    expect(await refusal(await raise({ helpType: TICKET_TYPE_FEEDBACK, appId: IDS.victimApp }))).toBe(
      "feedback_needs_validation"
    )
  })

  it("is refused when the ticket names no app", async () => {
    // There is nothing for a sprint to be running ON. The agency's own
    // housekeeping questions are about no system at all, so this is a real
    // state and not a malformed request — and it is refused rather than waved
    // through, the same answer `moduleForTicket` gives to a module with no app.
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE })
    const res = await raise({ helpType: TICKET_TYPE_FEEDBACK })
    expect(res.status).toBe(400)
    expect(await refusal(res)).toBe("feedback_needs_validation")
  })

  it("is refused when the running Validation sprint is on ANOTHER app", async () => {
    // The fence is `app_id`, not "does this team validate anything this month".
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE, appId: OTHER_APP })
    expect(await refusal(await raise({ helpType: TICKET_TYPE_FEEDBACK, appId: IDS.victimApp }))).toBe(
      "feedback_needs_validation"
    )
  })

  it("is ACCEPTED while a Validation sprint is running", async () => {
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE })
    const res = await raise({ helpType: TICKET_TYPE_FEEDBACK, appId: IDS.victimApp })
    expect(res.status, "the whole rule is worthless if the permitted case fails").toBe(200)
    const row = db().prepare(`SELECT help_type, raised_as_type FROM help LIMIT 1`).get() as {
      help_type: string
      raised_as_type: string
    }
    expect(row.help_type).toBe(TICKET_TYPE_FEEDBACK)
    expect(row.raised_as_type, "and what it arrived as is stamped on the same line").toBe(
      TICKET_TYPE_FEEDBACK
    )
  })

  it("is accepted on a Validation sprint that has OVERRUN its end date", async () => {
    // `sprintState`: an end date in the past does not move a sprint out of
    // "running" — work that overran is still the work in front of the team. The
    // door inherits that reading deliberately, so the fortnight a client is
    // actually looking at the app is the fortnight they can file feedback in.
    db().exec(
      `INSERT INTO sprints (id, account_id, app_id, name, sprint_type, starts_on, ends_on, created_at, creator_id)
       VALUES ('S_LATE', '${IDS.victimAccount}', '${IDS.victimApp}', 'Ran long', '${VALIDATION_SPRINT_TYPE}',
               '${day(-40)}', '${day(-5)}', '${day(-50)}', '${IDS.staffUser}');`
    )
    expect((await raise({ helpType: TICKET_TYPE_FEEDBACK, appId: IDS.victimApp })).status).toBe(200)
  })

  it("matches the sprint kind the way every other vocabulary word is matched", async () => {
    // `sprints.sprint_type` holds the team's OWN editable word, so the test has
    // to survive a stray capital, a trailing space and a dropped or added "s" —
    // `ticketTypeKey` is the product's one identity test and the door uses it.
    for (const spelling of [" validation ", "VALIDATION", "validations"]) {
      // The status events a raised ticket is born with hold a foreign key to
      // it, so the child goes first — the fixture is being rewound, not the
      // product's own delete path being exercised.
      db().exec(`DELETE FROM sprints; DELETE FROM help_status_events; DELETE FROM help;`)
      sprint({ id: "S_VAL", kind: spelling })
      expect(
        (await raise({ helpType: TICKET_TYPE_FEEDBACK, appId: IDS.victimApp })).status,
        `"${spelling}" is the same word`
      ).toBe(200)
    }
  })

  it("and the other three kinds are never asked the question", async () => {
    // No sprint of any kind on the app. An Issue, a Question and an Extra are
    // unconditional — the condition is Feedback's alone, and a check that
    // accidentally reached the rest would close the product's own front door.
    for (const kind of ["Issue", "Question", "Extra"]) {
      const res = await raise({ helpType: kind, appId: IDS.victimApp })
      expect(res.status, `${kind} must not need a sprint`).toBe(200)
    }
  })
})

describe("editing a ticket", () => {
  /** A ticket already on the row, written straight in — the state this suite is
   * about is one that EXISTS, not one being created. */
  function existing(id: string, type: string | null) {
    db().exec(
      `INSERT INTO help (id, description, help_type, raised_as_type, status, resolved, app_id, account_id,
                         created_at, creator_id, creator_email, creator_name)
       VALUES ('${id}', 'Something is wrong', ${type ? `'${type}'` : "NULL"}, ${type ? `'${type}'` : "NULL"},
               'new', 0, '${IDS.victimApp}', '${IDS.victimAccount}',
               '${day(-20)}', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');`
    )
  }

  async function edit(body: Record<string, unknown>): Promise<Response> {
    return door("/api/content/help/update", {
      method: "POST",
      body: JSON.stringify({ description: "Something is wrong", ...body }),
    })
  }

  it("refuses a MOVE into feedback with no sprint running", async () => {
    existing("H_ISSUE", "Issue")
    const res = await edit({ id: "H_ISSUE", helpType: TICKET_TYPE_FEEDBACK })
    expect(res.status).toBe(400)
    const still = db().prepare(`SELECT help_type FROM help WHERE id='H_ISSUE'`).get() as {
      help_type: string
    }
    expect(still.help_type, "and the refusal must not have half-written the row").toBe("Issue")
  })

  it("but a ticket ALREADY feedback keeps its type after the sprint has wrapped", async () => {
    // The clause with the teeth. `was` is the ticket's current word, so an edit
    // that leaves the type where it is passes — which is what stops a rule about
    // raising becoming a rule about history.
    existing("H_FB", TICKET_TYPE_FEEDBACK)
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE, startsOn: day(-40), completedAt: day(-2) })
    const res = await edit({
      id: "H_FB",
      helpType: TICKET_TYPE_FEEDBACK,
      description: "The new screen is confusing, especially the filters",
    })
    expect(res.status, "an existing feedback ticket must stay editable").toBe(200)
    const after = db().prepare(`SELECT help_type, description FROM help WHERE id='H_FB'`).get() as {
      help_type: string
      description: string
    }
    expect(after.help_type).toBe(TICKET_TYPE_FEEDBACK)
    expect(after.description).toContain("filters")
  })

  it("and a MOVE into feedback is allowed while the sprint runs", async () => {
    existing("H_Q", "Question")
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE })
    expect((await edit({ id: "H_Q", helpType: TICKET_TYPE_FEEDBACK })).status).toBe(200)
    const after = db().prepare(`SELECT help_type, raised_as_type FROM help WHERE id='H_Q'`).get() as {
      help_type: string
      raised_as_type: string
    }
    expect(after.help_type).toBe(TICKET_TYPE_FEEDBACK)
    expect(after.raised_as_type, "what it ARRIVED as is never rewritten by an edit").toBe("Question")
  })

  it("asks about the app the ticket WILL have, not the one it had", async () => {
    // Moving a ticket to another app and marking it feedback is ONE legitimate
    // save. Asking about `before.app_id` would refuse it for the one reason that
    // is not true — the same argument `moduleForTicket` makes one line above the
    // check in `updateTicket`.
    existing("H_MOVE", "Question")
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE, appId: OTHER_APP })
    const res = await edit({ id: "H_MOVE", appId: OTHER_APP, helpType: TICKET_TYPE_FEEDBACK })
    expect(res.status, "the new app is the one being asked about").toBe(200)
  })
})

describe("the machine surface reaches the same refusal", () => {
  /** THE MCP TOOL'S OWN BODY, BUILT BY THE TOOL, POSTED AT THE REAL DOOR.
   *
   * R22 proves `create_help_ticket` FORWARDS every body field its door reads,
   * by running `buildBody`. It cannot prove what the door then DOES with them,
   * and that gap is the whole point of this case: the tool has no picker in
   * front of it, so if the Feedback rule lived in the ticket form a machine
   * would walk straight past it. The body below is not hand-written — it is
   * whatever the shipped tool produces, so a change to its shape moves this
   * test with it rather than around it. */
  const tool = SHARED_TOOLS.find((t) => t.mcpName === "create_help_ticket")

  it("create_help_ticket is refused outside a Validation sprint", async () => {
    expect(tool, "the tool must still exist under that external name").toBeDefined()
    expect(tool?.path, "and still point at the door this suite exercises").toBe("/api/content/help")
    const body = tool?.buildBody?.({
      description: "The new screen is confusing",
      helpType: TICKET_TYPE_FEEDBACK,
      appId: IDS.victimApp,
    })
    const res = await door("/api/content/help", { method: "POST", body: JSON.stringify(body) })
    expect(res.status, "no sprint is running, so the machine surface is refused too").toBe(400)
    expect(await refusal(res)).toBe("feedback_needs_validation")
  })

  it("…and accepted while one is", async () => {
    sprint({ id: "S_VAL", kind: VALIDATION_SPRINT_TYPE })
    const body = tool?.buildBody?.({
      description: "The new screen is confusing",
      helpType: TICKET_TYPE_FEEDBACK,
      appId: IDS.victimApp,
    })
    const res = await door("/api/content/help", { method: "POST", body: JSON.stringify(body) })
    expect(res.status, "the permitted case must work through the tool too").toBe(200)
  })
})
