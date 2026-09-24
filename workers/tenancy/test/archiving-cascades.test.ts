// ARCHIVING CASCADES, AND THE CASCADE REMEMBERS WHO CAUSED IT (0123, R112).
//
// Aurora's ruling, 23-24 Sep 2026, in two messages, verbatim:
//
//   "wdym by vanish? should stay in the system, but invisible. just in case we
//    need to in the future recover it. if ticket archive - story archived as
//    well"
//   "when archiving a parent item, always archive as well the child items"
//
// The round before this one made a child of an archived parent invisible by
// FILTERING — the child's own row was untouched and a clause on every read hid
// it. That is proved next door (`workers/content/test/archived-hides-its-children.test.ts`,
// still the law's own check and still green). THIS file is about what she asked
// for instead: the child becomes archived ITSELF, carries its own state, is
// findable wherever archived things are found, and comes back.
//
// ── THE FOUR THINGS THAT ARE EASY TO GET WRONG, AND ALL FOUR ARE HERE ───────
//
// 1 · THE MARKER, not merely a timestamp. If a story was archived on its own
//     merits BEFORE its ticket was archived, un-archiving the ticket must not
//     restore it — and nothing in a timestamp can tell those two stories apart.
//     `archived_via_table`/`archived_via_id` is what can.
// 2 · UN-ARCHIVE UNDOES EXACTLY WHAT THE CASCADE DID and nothing else, which is
//     the same sentence read from the other end.
// 3 · IT RECURSES AND IT TERMINATES. An account archives its apps, which archive
//     their tickets, which archive their stories. Proved here over the real
//     chain rather than assumed to a depth.
// 4 · NOTHING VISIBLE HANGS UNDER SOMETHING INVISIBLE — a child cannot be
//     restored while its parent is still archived.
//
// Against a REAL SQLite database running the real team migrations, because
// every one of those four is a property of the statements SQLite actually
// executes: the marker is a column, the recursion is a loop of UPDATE …
// RETURNING, and the termination argument IS the `archived_at IS NULL`
// predicate. No source census can see any of it.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { accountScope } from "@shared/workers/account-scope"
import {
  ARCHIVE_CASCADE,
  ARCHIVE_PARENTS,
  WORK_LOGS_ARE_NEVER_ARCHIVED,
} from "@shared/workers/archive-cascade"
import { setAccountArchived } from "../src/lib/accounts"
import { setAppArchived } from "../src/lib/processes"
import { buildSpineDb, IDS, makeEnv } from "./spine-harness"

const cfg = { accountId: "a", apiToken: "t" } as never
const actor = { id: IDS.staffUser, email: "staff@kwapso.app", name: "Staff" }
const guard = { userId: IDS.staffUser, teamId: IDS.team, roleId: IDS.adminRole, databaseId: "db_team" }
const staff = { kind: "staff" } as const

const db = () => holder.db as DatabaseSync
const NOW = "2026-09-24T09:00:00.000Z"

/** THE CHAIN, four records deep, because "it recurses" is not a claim a
 * two-level fixture can carry: the victim's ACCOUNT owns an APP, the app owns a
 * TICKET (`help.app_id`), and the ticket owns a STORY (`stories.ticket_id`).
 * Archiving the account at the top must reach the story at the bottom, and it
 * can only do that by following three different edges in turn. */
const STORY_ON_TICKET = "S_CHAIN"
/** The control at every level: a story that answers no ticket and belongs to no
 * archived parent. If a clause is ever widened into "no stories at all", every
 * "is gone" assertion below still passes and this is what says so. */
const STORY_FREE = "S_FREE"
/** A story archived ON ITS OWN MERITS before anything else happens — the row the
 * whole marker exists for. */
const STORY_ALREADY = "S_ALREADY"
/** Somebody's logged hours against the chain's own story. Her ruling: they never
 * move, whatever happens above them. */
const LOG_ON_STORY = "W_ON_STORY"

const row = (table: string, id: string) =>
  db()
    .prepare(`SELECT archived_at, archived_via_table, archived_via_id FROM ${table} WHERE id = ?`)
    .get(id) as
    | { archived_at: string | null; archived_via_table: string | null; archived_via_id: string | null }
    | undefined

beforeEach(() => {
  holder.db = buildSpineDb()
  db().exec(
    `UPDATE help SET app_id = '${IDS.victimApp}' WHERE id = '${IDS.victimTicket}';
     INSERT INTO stories (id, ref, account_id, ticket_id, title, status, created_at, creator_id, creator_email, creator_name)
       VALUES ('${STORY_ON_TICKET}', 'S9001', '${IDS.victimAccount}', '${IDS.victimTicket}',
               'Fix the March invoice run', 'open', '${NOW}', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');
     INSERT INTO stories (id, ref, account_id, ticket_id, title, status, created_at, creator_id, creator_email, creator_name)
       VALUES ('${STORY_FREE}', 'S9002', NULL, NULL,
               'Upgrade the build pipeline', 'open', '${NOW}', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');
     INSERT INTO stories (id, ref, account_id, ticket_id, title, status, created_at, creator_id, creator_email, creator_name)
       VALUES ('${STORY_ALREADY}', 'S9003', '${IDS.victimAccount}', '${IDS.victimTicket}',
               'Something we put away ourselves', 'open', '${NOW}', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');
     INSERT INTO work_logs (id, target_table, target_id, user_id, account_id, started_at, seconds, created_at, creator_id, creator_email, creator_name)
       VALUES ('${LOG_ON_STORY}', 'stories', '${STORY_ON_TICKET}', '${IDS.staffUser}', '${IDS.victimAccount}',
               '${NOW}', 1800, '${NOW}', '${IDS.staffUser}', 'staff@kwapso.app', 'Staff');`
  )
})

describe("the owning graph is a decision, not the foreign keys", () => {
  it("names only edges somebody chose, and `work_logs` is on none of them", () => {
    // HER RULING, ASSERTED AS A NEGATIVE, because an absence from a table is
    // indistinguishable from an oversight: "never archive work logs, time is
    // logged and we must always know where it went."
    for (const [parent, edges] of Object.entries(ARCHIVE_CASCADE))
      for (const e of edges)
        expect(
          e.table,
          `${parent} -> ${e.table} would archive a work log; her ruling forbids it at any depth`
        ).not.toBe(WORK_LOGS_ARE_NEVER_ARCHIVED)
    // …and the constant is not decoration: it names the real table.
    expect(WORK_LOGS_ARE_NEVER_ARCHIVED).toBe("work_logs")
  })

  it("a SPRINT does not own its stories, and an APP does", () => {
    // Her two answers of 24 Sep 2026, one line of data each, and they pull in
    // opposite directions — which is exactly why neither can be inferred from
    // the schema: `stories.sprint_id` and `stories.app_id` are the same shape
    // in `pragma_foreign_key_list`.
    //   "no. only archiving app or account would archive stories."
    //   "yes, archiving th eparent archive the child."
    expect(ARCHIVE_CASCADE.sprints).toBeUndefined()
    expect(ARCHIVE_CASCADE.apps?.map((e) => e.table)).toContain("stories")
    expect(ARCHIVE_CASCADE.accounts?.map((e) => e.table)).toContain("stories")
    expect(ARCHIVE_CASCADE.help?.map((e) => e.table)).toContain("stories")
  })

  it("a CONTACT is not an owning parent of what they raised", () => {
    // Her fourth answer: "no". `help.raised_by_contact_id` points at an
    // `accounts` row like `help.account_id` does, and only one of them is
    // ownership.
    const cols = (ARCHIVE_CASCADE.accounts ?? [])
      .filter((e) => e.table === "help")
      .map((e) => e.column)
    expect(cols).toEqual(["account_id"])
  })

  it("every edge names a real column on a real table, and a real parent", () => {
    // Rot-check against the migrated schema: each edge writes `<table>.<column>`
    // blind into an UPDATE, and a name that no longer exists is a statement
    // SQLite refuses at runtime on a door nobody opens every day.
    for (const [parent, edges] of Object.entries(ARCHIVE_CASCADE)) {
      const parentCols = (
        db().prepare(`SELECT name FROM pragma_table_info('${parent}')`).all() as { name: string }[]
      ).map((c) => c.name)
      expect(parentCols, `${parent} must carry archived_at`).toContain("archived_at")
      for (const e of edges) {
        const cols = (
          db().prepare(`SELECT name FROM pragma_table_info('${e.table}')`).all() as { name: string }[]
        ).map((c) => c.name)
        expect(cols, `${e.table} must carry ${e.column}`).toContain(e.column)
        for (const need of ["archived_at", "archived_via_table", "archived_via_id"])
          expect(cols, `${e.table} must carry ${need}`).toContain(need)
      }
    }
  })

  it("the reverse graph is derived from the forward one, never spelled twice", () => {
    for (const [child, parents] of Object.entries(ARCHIVE_PARENTS))
      for (const p of parents)
        expect(
          (ARCHIVE_CASCADE[p.parent] ?? []).some((e) => e.table === child && e.column === p.column),
          `${child} claims a parent ${p.parent}.${p.column} that the forward graph does not have`
        ).toBe(true)
  })
})

describe("a child becomes archived itself, and says who did it", () => {
  it("archiving the ACCOUNT reaches four levels down, following three different edges", async () => {
    expect(await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)).toBe(true)

    // The app (accounts -> apps), the ticket (accounts -> help AND apps -> help,
    // whichever arrives first), and the story at the bottom.
    expect(row("apps", IDS.victimApp)?.archived_at).not.toBeNull()
    expect(row("help", IDS.victimTicket)?.archived_at).not.toBeNull()
    expect(row("stories", STORY_ON_TICKET)?.archived_at).not.toBeNull()

    // EACH ONE NAMES ITS CAUSE, which is the whole difference from the round
    // before: the row is archived, not merely hidden, and it says by whom.
    expect(row("apps", IDS.victimApp)?.archived_via_table).toBe("accounts")
    expect(row("apps", IDS.victimApp)?.archived_via_id).toBe(IDS.victimAccount)

    // THE CONTROL. A story with no account and no ticket is not anybody's child
    // and is untouched — without this, a clause widened into "no stories at all"
    // would satisfy every assertion above.
    expect(row("stories", STORY_FREE)?.archived_at).toBeNull()
  })

  it("archiving the APP reaches its ticket and that ticket's story", async () => {
    // Her ruling 1, against the instinct the question was put with: an app is an
    // owning parent, so this is the middle of the chain acting on its own.
    expect(await setAppArchived(cfg, guard, staff, actor, IDS.victimApp, true)).toBe(true)
    expect(row("help", IDS.victimTicket)?.archived_via_table).toBe("apps")
    expect(row("stories", STORY_ON_TICKET)?.archived_via_table).toBe("help")
    expect(row("stories", STORY_ON_TICKET)?.archived_via_id).toBe(IDS.victimTicket)
    // …and the account above it is untouched. A cascade runs DOWN.
    expect(row("accounts", IDS.victimAccount)?.archived_at).toBeNull()
  })

  it("NEVER a work log, however deep the chain goes", async () => {
    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)
    // The story this log is against is archived; the log is not, and cannot be —
    // it has no column to be archived in. Read as a column census rather than a
    // value, because the strongest form of "never" here is "there is nowhere to
    // write it".
    const cols = (
      db().prepare(`SELECT name FROM pragma_table_info('work_logs')`).all() as { name: string }[]
    ).map((c) => c.name)
    expect(cols).not.toContain("archived_at")
    expect(row("stories", STORY_ON_TICKET)?.archived_at).not.toBeNull()
    const log = db().prepare(`SELECT id FROM work_logs WHERE id = ?`).get(LOG_ON_STORY)
    expect(log, "the hours stay exactly where they were logged").toBeTruthy()
  })
})

describe("un-archiving undoes exactly what the cascade did, and nothing else", () => {
  it("restores the whole chain", async () => {
    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)
    expect(await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, false)).toBe(true)

    for (const [table, id] of [
      ["accounts", IDS.victimAccount],
      ["apps", IDS.victimApp],
      ["help", IDS.victimTicket],
      ["stories", STORY_ON_TICKET],
    ] as const) {
      expect(row(table, id)?.archived_at, `${table}:${id} should be live again`).toBeNull()
      expect(row(table, id)?.archived_via_table, `${table}:${id} should carry no marker`).toBeNull()
    }
  })

  it("WALKS PAST a child archived on its own merits before the cascade ran", async () => {
    // THE CASE THE MARKER EXISTS FOR, and the one a timestamp could never carry.
    // Somebody archives one story deliberately. Then the whole account is
    // archived, which steps over that story (its `archived_at IS NULL` predicate
    // fails) and leaves its NULL marker alone. Restoring the account must bring
    // back everything the cascade took and must NOT bring back this one.
    db().exec(
      `UPDATE stories SET archived_at = '${NOW}', archiver_id = '${IDS.staffUser}',
         archiver_email = 'staff@kwapso.app', archiver_name = 'Staff'
       WHERE id = '${STORY_ALREADY}';`
    )
    expect(row("stories", STORY_ALREADY)?.archived_via_table).toBeNull()

    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)
    // The cascade did not touch it: still no marker, still archived.
    expect(row("stories", STORY_ALREADY)?.archived_via_table).toBeNull()

    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, false)
    expect(row("stories", STORY_ON_TICKET)?.archived_at, "the cascaded one came back").toBeNull()
    expect(
      row("stories", STORY_ALREADY)?.archived_at,
      "the one somebody archived deliberately stays archived"
    ).not.toBeNull()
  })

  it("is IDEMPOTENT both ways — a second call moves nothing (R17)", async () => {
    expect(await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)).toBe(true)
    const marker = row("stories", STORY_ON_TICKET)?.archived_via_id
    // The second archive returns false at the R17 predicate and therefore never
    // reaches the cascade at all — which is what stops a re-archive stamping a
    // new marker over a row whose real cause was something else.
    expect(await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)).toBe(false)
    expect(row("stories", STORY_ON_TICKET)?.archived_via_id).toBe(marker)

    expect(await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, false)).toBe(true)
    expect(await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, false)).toBe(false)
    expect(row("stories", STORY_ON_TICKET)?.archived_at).toBeNull()
  })

  it("a subtree archived on its own merits SURVIVES its parent's restore", async () => {
    // FIRST WRITER WINS, and this is the shape that proves it is not an
    // accident. Somebody archives the app deliberately (no marker, because
    // nothing caused it but them). Then the whole account is archived: the
    // cascade reaches the app, finds `archived_at` already set, and steps over
    // it — so the app keeps its NULL marker AND everything under the app keeps
    // the marker it already had.
    await setAppArchived(cfg, guard, staff, actor, IDS.victimApp, true)
    expect(row("apps", IDS.victimApp)?.archived_via_table, "archived on its own merits").toBeNull()
    expect(row("help", IDS.victimTicket)?.archived_via_table).toBe("apps")

    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)
    expect(row("apps", IDS.victimApp)?.archived_via_table, "the cascade stepped over it").toBeNull()
    expect(row("help", IDS.victimTicket)?.archived_via_table, "and over its ticket too").toBe("apps")

    // …so restoring the ACCOUNT brings back the account and nothing else: the
    // app was not the cascade's to take, and is therefore not its to give back.
    // This is the same rule as the deliberately-archived story, one level up,
    // and it is what stops a restore quietly resurrecting a subtree somebody
    // put away on purpose.
    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, false)
    expect(row("accounts", IDS.victimAccount)?.archived_at).toBeNull()
    expect(row("apps", IDS.victimApp)?.archived_at, "still archived, on its own merits").not.toBeNull()
    expect(row("help", IDS.victimTicket)?.archived_at, "and so is its ticket").not.toBeNull()

    // And NOW the app can be restored, because its own parent is live again.
    expect(await setAppArchived(cfg, guard, staff, actor, IDS.victimApp, false)).toBe(true)
    expect(row("help", IDS.victimTicket)?.archived_at).toBeNull()
    expect(row("stories", STORY_ON_TICKET)?.archived_at).toBeNull()
  })

  it("a crash after the parent row moved is recovered by restore-then-archive, NOT by a re-run", async () => {
    // THE HONEST LIMIT, TESTED RATHER THAN ASSERTED IN PROSE. D1 gives no
    // transaction across statements, so a crash can land the parent's own row
    // and none of its children. That state is simulated exactly, by writing the
    // account's archive by hand and running no cascade.
    db().exec(
      `UPDATE accounts SET archived_at = '${NOW}', archiver_id = '${IDS.staffUser}',
         archiver_email = 'staff@kwapso.app', archiver_name = 'Staff'
       WHERE id = '${IDS.victimAccount}';`
    )
    expect(row("apps", IDS.victimApp)?.archived_at, "the cascade never ran").toBeNull()

    // A RE-RUN DOES NOT FINISH IT, and pretending otherwise would be the
    // comfortable lie: R17's own predicate (`archived_at IS NULL`) is what makes
    // the door idempotent, and it refuses the second archive before the cascade
    // is ever reached. The operator's move is restore, then archive.
    expect(await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)).toBe(false)
    expect(row("apps", IDS.victimApp)?.archived_at, "still half-done").toBeNull()

    // RESTORE THEN ARCHIVE completes it, and the restore is safe to run against
    // a half-done state: it clears the parent and finds no markers to honour.
    expect(await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, false)).toBe(true)
    expect(await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)).toBe(true)
    expect(row("apps", IDS.victimApp)?.archived_via_table).toBe("accounts")
    expect(row("stories", STORY_ON_TICKET)?.archived_at).not.toBeNull()
  })
})


describe("nothing visible ever hangs under something invisible", () => {
  it("refuses to restore an APP while its account is still archived", async () => {
    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)
    await expect(
      setAppArchived(cfg, guard, staff, actor, IDS.victimApp, false)
    ).rejects.toMatchObject({ status: 409, code: "parent_archived" })
    // …and it is still archived afterwards: a refusal is not a silent no-op.
    expect(row("apps", IDS.victimApp)?.archived_at).not.toBeNull()
  })

  it("…and lets it back once the account is restored", async () => {
    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)
    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, false)
    // The account's own restore already brought the app back through its marker,
    // so there is nothing left to restore — R17 says so by moving zero rows.
    expect(row("apps", IDS.victimApp)?.archived_at).toBeNull()
    expect(await setAppArchived(cfg, guard, staff, actor, IDS.victimApp, false)).toBe(false)
  })

  it("refuses to restore a nested BUSINESS while its holding company is archived", async () => {
    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)
    expect(row("accounts", IDS.victimChild)?.archived_via_table).toBe("accounts")
    await expect(
      setAccountArchived(cfg, guard, staff, actor, IDS.victimChild, false)
    ).rejects.toMatchObject({ status: 409, code: "parent_archived" })
  })
})

describe("the portal refusal still holds when the contact is archived by CASCADE", () => {
  it("a contact whose company was archived stands nowhere, however it happened", async () => {
    // R112's own portal half was proved against a DIRECTLY archived account. The
    // cascade is a different route to the same column, and `resolveAccountScope`
    // reads `accounts.archived_at` without asking why it is set — so this ought
    // to hold for free. "Ought to" is not a proof, and this is the proof.
    const before = await accountScope(cfg, {
      userId: IDS.contactUser,
      teamId: IDS.team,
      roleId: IDS.clientRole,
      databaseId: "db_team",
    })
    expect(before.kind).toBe("portal")
    if (before.kind === "portal") expect(before.roots).toContain(IDS.victimAccount)

    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)

    const after = await accountScope(cfg, {
      userId: IDS.contactUser,
      teamId: IDS.team,
      roleId: IDS.clientRole,
      databaseId: "db_team",
    })
    // Still PORTAL, never promoted to staff — the corridor's fail-closed rule.
    expect(after.kind).toBe("portal")
    if (after.kind === "portal") {
      expect(after.roots).toEqual([])
      expect(after.accountIds).toEqual([])
    }
  })
})

describe("the doors say what happened, in the record's own history", () => {
  it("an archive that cascaded says how many went with it", async () => {
    await setAccountArchived(cfg, guard, staff, actor, IDS.victimAccount, true)
    const entry = db()
      .prepare(
        `SELECT description FROM activity WHERE related_table = 'accounts' AND related_row_id = ?
          ORDER BY created_at DESC LIMIT 1`
      )
      .get(IDS.victimAccount) as { description: string } | undefined
    // A person reading the account's history has to be able to tell a plain
    // archive from one that took a client's whole world with it.
    expect(entry?.description).toMatch(/archived/)
    expect(entry?.description).toMatch(/records? under it/)
  })

  it("…and the environment the door publishes on is the real worker's", () => {
    // Tripwire: `makeEnv` is what every other suite here drives the routes with,
    // and a fixture that stopped building one would make the door tests above
    // pass by never reaching a door.
    expect(makeEnv(() => db(), IDS.staffUser)).toBeTruthy()
  })
})
