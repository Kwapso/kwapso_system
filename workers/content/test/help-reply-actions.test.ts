// A REPLY CAN BE EDITED OR TAKEN BACK OUT — Aurora's 20 Sep 2026 chat-edit-
// pencil ruling (team migration 0108: `help_threads` gains `updated_at`,
// `editor_id`, `editor_name`, `deactivated_at`), against a real SQLite
// database running the real team migrations, the real route handlers
// (`postHelpReplyUpdate`/`postHelpReplyDelete`) and the real `lib/help.ts`
// seam (`updateReply`/`deleteReply`/`assertMayChangeReply`). Four things:
//
//   1. THE FENCE. The author always may change their own reply. Past that,
//      `help:update` — the same "ticket edit right" `resolve_help_ticket`/
//      `archive_help_ticket` already require — reaches every OTHER staff
//      member's reply. A CLIENT LOGIN never gets that second half, whatever
//      its own role happens to hold — `help-fence.test.ts`'s own burglar role
//      is deliberately granted every right, so this suite proves the portal
//      branch is checked BEFORE any right lookup, not merely that this
//      harness's client role lacks one.
//   2. THE LIMITS. An empty or over-long body is refused the same way a new
//      reply already is (`TEXT_LIMITS.long`, shared with `postHelpReply`).
//   3. THE SOFT DELETE. A removed reply stops appearing in the thread AND its
//      own count, but the row survives — an edit or a second delete on an
//      already-removed reply 404s, the same "not there" answer a foreign id
//      gets.
//   4. NOTHING ON A TICKET IS EVER REMOVED. The activity feed records both
//      acts in plain words ("edited a reply" / "removed a reply").
//
// `help-fence.test.ts` already proves the ACCOUNT fence around a ticket and
// its thread; this file is about the PER-REPLY fence these two new doors add
// and does not re-run that proof.

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
import { TEXT_LIMITS } from "@shared/workers/validate"

const db = () => holder.db as DatabaseSync

function env(userId: string) {
  return {
    ...(makeEnv(() => db(), userId) as unknown as Record<string, unknown>),
    PUBLIC_APP_URL: "https://kwapso.example",
  } as never
}

const call = (userId: string, route: string, body?: unknown, query = "") => {
  const [method, path] = route.split(" ")
  return worker.fetch(
    new Request(`https://content${path}${query}`, {
      method,
      headers: { Cookie: "session=x", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    }),
    env(userId) as never,
    { waitUntil: () => {}, passThroughOnException: () => {} } as never
  )
}

/** A SECOND staff member, deliberately NOT on the harness's own `adminRole` —
 * that role is granted every right on purpose, for the burglar suites' own
 * worst-case reasoning (`spine-harness.ts`'s `grantAll`), which makes it
 * useless for proving the "needs the ticket edit right" half of THIS ruling.
 * `LIMITED_ROLE` holds `help:read` and NOT `help:update` — the ordinary "can
 * see tickets, cannot edit someone else's words" shape. */
const LIMITED_ROLE = "R_LIMITED"
const LIMITED_STAFF = "U_LIMITED"

async function reply(userId: string, body: string): Promise<string> {
  const res = await call(userId, "POST /api/content/help/reply", { helpId: IDS.victimTicket, body })
  expect(res.status, await res.clone().text()).toBe(200)
  const data = (await res.json()) as { replies: { id: string; body: string }[] }
  const row = data.replies.find((r) => r.body === body)
  if (!row) throw new Error(`reply: "${body}" did not come back in the refreshed list`)
  return row.id
}

async function activityTypes(relatedRowId: string): Promise<string[]> {
  const rows = db()
    .prepare(`SELECT type FROM activity WHERE related_table = 'help_threads' AND related_row_id = ? ORDER BY created_at ASC`)
    .all(relatedRowId) as { type: string }[]
  return rows.map((r) => r.type)
}

beforeEach(() => {
  holder.db = buildSpineDb()
  db().exec(`
    INSERT INTO member_roles (id, title, is_default, created_at) VALUES ('${LIMITED_ROLE}', 'Limited', 0, '2026-01-01');
    INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete)
      VALUES ('${LIMITED_ROLE}_help', '${LIMITED_ROLE}', 'help', 1, 1, 0, 1);
    INSERT INTO users (id, email, first_name, current_team_id) VALUES ('${LIMITED_STAFF}', 'limited@kwapso.app', 'Limited', '${IDS.team}');
    INSERT INTO team_members (id, team_id, user_id, role_id, created_at) VALUES ('m_limited', '${IDS.team}', '${LIMITED_STAFF}', '${LIMITED_ROLE}', '2026-01-01');
  `)
})

describe("update_help_reply / delete_help_reply — the author always may", () => {
  it("the author edits their own reply", async () => {
    const id = await reply(LIMITED_STAFF, "first draft")
    const res = await call(LIMITED_STAFF, "POST /api/content/help/reply/update", { id, body: "fixed draft" })
    expect(res.status, await res.clone().text()).toBe(200)
    const data = (await res.json()) as { replies: { id: string; body: string }[] }
    expect(data.replies.find((r) => r.id === id)?.body).toBe("fixed draft")
    expect(await activityTypes(id)).toEqual(["Reply edited"])
  })

  it("the author deletes their own reply — it stops showing, the row survives", async () => {
    const id = await reply(LIMITED_STAFF, "oops")
    const res = await call(LIMITED_STAFF, "POST /api/content/help/reply/delete", { id })
    expect(res.status, await res.clone().text()).toBe(200)
    const data = (await res.json()) as { replies: { id: string }[]; total: number }
    expect(data.replies.some((r) => r.id === id)).toBe(false)

    const row = db().prepare(`SELECT deactivated_at, message_body FROM help_threads WHERE id = ?`).get(id) as {
      deactivated_at: string | null
      message_body: string
    }
    expect(row.deactivated_at).not.toBeNull()
    expect(row.message_body).toBe("oops") // NOTHING ON A TICKET IS EVER REMOVED
    expect(await activityTypes(id)).toEqual(["Reply removed"])
  })
})

describe("update_help_reply / delete_help_reply — the ticket edit right reaches every OTHER staff reply", () => {
  it("a staff member with NO help:update right may not edit a colleague's reply", async () => {
    const id = await reply(IDS.staffUser, "the admin's own words")
    const res = await call(LIMITED_STAFF, "POST /api/content/help/reply/update", { id, body: "rewritten" })
    expect(res.status).toBe(403)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBe("forbidden")
  })

  it("a staff member with NO help:update right may not delete a colleague's reply", async () => {
    const id = await reply(IDS.staffUser, "the admin's own words, again")
    const res = await call(LIMITED_STAFF, "POST /api/content/help/reply/delete", { id })
    expect(res.status).toBe(403)
  })

  it("a staff member WITH the ticket edit right may edit a colleague's reply", async () => {
    const id = await reply(LIMITED_STAFF, "needs a staff correction")
    const res = await call(IDS.staffUser, "POST /api/content/help/reply/update", { id, body: "corrected by an editor" })
    expect(res.status, await res.clone().text()).toBe(200)
    const data = (await res.json()) as { replies: { id: string; body: string }[] }
    expect(data.replies.find((r) => r.id === id)?.body).toBe("corrected by an editor")
  })

  it("a staff member WITH the ticket edit right may delete a colleague's reply", async () => {
    const id = await reply(LIMITED_STAFF, "needs to go")
    const res = await call(IDS.staffUser, "POST /api/content/help/reply/delete", { id })
    expect(res.status, await res.clone().text()).toBe(200)
  })
})

describe("update_help_reply / delete_help_reply — a client login never reaches the second half", () => {
  it("a client login cannot edit a staff reply on their own ticket, even though this harness's client role otherwise holds help:update", async () => {
    const id = await reply(IDS.staffUser, "staff's own reply on the victim's ticket")
    const res = await call(IDS.victimUser, "POST /api/content/help/reply/update", { id, body: "a client rewriting staff" })
    expect(res.status).toBe(403)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBe("not_yours")
  })

  it("a client login cannot delete a staff reply on their own ticket", async () => {
    const id = await reply(IDS.staffUser, "staff's own reply, again")
    const res = await call(IDS.victimUser, "POST /api/content/help/reply/delete", { id })
    expect(res.status).toBe(403)
  })

  it("a client login MAY edit and delete their own reply on their own ticket", async () => {
    const id = await reply(IDS.victimUser, "the client's own question")
    const editRes = await call(IDS.victimUser, "POST /api/content/help/reply/update", { id, body: "the client's own, corrected" })
    expect(editRes.status, await editRes.clone().text()).toBe(200)

    const deleteRes = await call(IDS.victimUser, "POST /api/content/help/reply/delete", { id })
    expect(deleteRes.status, await deleteRes.clone().text()).toBe(200)
  })
})

describe("update_help_reply — the same limits a new reply already carries", () => {
  it("refuses an empty body", async () => {
    const id = await reply(IDS.staffUser, "something to edit")
    const res = await call(IDS.staffUser, "POST /api/content/help/reply/update", { id, body: "   " })
    expect(res.status).toBe(400)
  })

  it("refuses a body over TEXT_LIMITS.long", async () => {
    const id = await reply(IDS.staffUser, "something to edit")
    const res = await call(IDS.staffUser, "POST /api/content/help/reply/update", {
      id,
      body: "x".repeat(TEXT_LIMITS.long + 1),
    })
    expect(res.status).toBe(400)
  })

  it("refuses a made-up reply id — the same 404 a foreign one gets", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/help/reply/update", { id: "NO_SUCH_REPLY", body: "anything" })
    expect(res.status).toBe(404)
  })
})

describe("delete_help_reply — a removed reply is gone from the thread, not from the table", () => {
  it("drops the deleted reply's count too — countReplies matches listReplies", async () => {
    await reply(IDS.staffUser, "reply one")
    const twoId = await reply(IDS.staffUser, "reply two")
    await call(IDS.staffUser, "POST /api/content/help/reply/delete", { id: twoId })

    const threadRes = await call(IDS.staffUser, "GET /api/content/help/thread", undefined, `?id=${IDS.victimTicket}`)
    const thread = (await threadRes.json()) as { replies: { id: string }[]; total: number }
    expect(thread.replies.some((r) => r.id === twoId)).toBe(false)
    expect(thread.total).toBe(thread.replies.length)
  })

  it("an edit on an already-removed reply 404s — deactivated is treated as gone", async () => {
    const id = await reply(IDS.staffUser, "will be removed")
    const del = await call(IDS.staffUser, "POST /api/content/help/reply/delete", { id })
    expect(del.status).toBe(200)

    const editAfter = await call(IDS.staffUser, "POST /api/content/help/reply/update", { id, body: "too late" })
    expect(editAfter.status).toBe(404)

    const deleteAgain = await call(IDS.staffUser, "POST /api/content/help/reply/delete", { id })
    expect(deleteAgain.status).toBe(404)
  })
})
