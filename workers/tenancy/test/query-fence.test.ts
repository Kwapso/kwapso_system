// THE QUERY DOOR'S FENCE — what a generic reader may name, and what it may not.
//
// A GENERIC QUERY DOOR is the one shape that can undo a fence without importing
// anything at all: hand a model a table name and it will eventually name the
// interesting one. So this suite exists to prove the sentence the design rests
// on —
//
//   THE MODULE MAP IS AN ALLOW-LIST. THE SECRETS ARE NOT IN IT.
//
// and to prove it the only way worth proving anything: BEHAVIOURALLY, against
// the real schema, through the real route table, as a caller who holds EVERY
// right in the team. Permission is not what stops them here — nothing about
// their role stops them — so if a row comes back, the allow-list has failed, and
// that is the only thing being measured.
//
// ── WHAT THE SECRET USED TO BE, AND WHY IT MOVED ─────────────────────────────
//
// Until 10 Sep 2026 the fixture here was an INTERNAL RATE — what an hour of our
// own work cost us — because Law R24 said that figure could never reach a
// client's side and this was the door that could most plausibly have leaked it.
// The client retired the whole feature ("kill the whole internal rates thing …
// for now i iwanna wipe it clean"), the tables were dropped by team migration
// 0073, and R24's structural half was retired with them.
//
// THE PROPERTY BEING MEASURED IS THE MECHANISM, NOT THE NUMBER, so this suite
// did not go with the law. It moved to the sharpest secret this base still
// holds: a GOOGLE REFRESH TOKEN. `google_connections.refresh_token` is a
// standing grant to one person's mailbox and Drive, minted only by that person
// standing at Google's own consent screen — and MCP.md §3 already says the
// sentence this suite now enforces, about a different surface: "the blast radius
// of a leaked one must not include a mailbox". A rate that leaks is a number
// somebody should not have seen; a token that leaks is an account somebody else
// can now read. The fixture got stronger when the law it was written for died.
//
// ── WHAT MAKES THIS A CHECK RATHER THAN A CLAIM ──────────────────────────────
//
// Three things, and the first two matter more than the assertions:
//
//   1. THE SECRET IS REALLY THERE. Every refusal below is paired with a read
//      straight off the database proving the connection row EXISTS and carries
//      the token being hunted for. "No rows came back" is worthless if there
//      were no rows; that is how a fence test reports all-clear on an empty
//      table for a year.
//   2. THE POSITIVE CONTROL. The same caller, the same door, asks for money and
//      gets it. A door that refuses everybody is not a fence, it is a broken
//      door, and it would pass a refusal-only suite perfectly. It is
//      deliberately still MONEY: the generic door must go on answering about
//      prices, so a reader can tell "fenced" from "money is scary".
//
//      WHICH MONEY MOVED ON 10 SEP 2026, AND THE PROPERTY DID NOT. It was the
//      ACCOUNT RATE CARD — what a client is CHARGED — until the client retired
//      it that afternoon ("the whole account rates also killed it"), which took
//      the table, the module and the `commercials` alias with it. It is now a
//      SPRINT'S SOLD PRICE (`sprints.soldPriceCents`), what a block of work was
//      sold to a client for: still money, still a figure whose visibility is a
//      per-account switch on the client's own side, and still answered here to a
//      staff caller who holds the right. The control did not weaken — it moved
//      to the money that is left.
//   3. MUTATION-TESTED BY HAND, twice, and recorded here so the next reader does
//      not have to take it on trust. On 29 Aug 2026 `internal_rates` was added
//      to QUERY_MODULES as a temporary edit; the suite went red on the first
//      four assertions, naming the leaked label and the leaked number, and went
//      green again when the entry came out. The same mutation was run against
//      the new fixture on 10 Sep 2026 — `google_connections` added to
//      QUERY_MODULES with `refresh_token` among its declared fields — with the
//      same result. A check that passes with its subject deleted is not a check.
//
// ── AND THE FORBIDDEN SET IS DERIVED ─────────────────────────────────────────
//
// Not hand-typed, and the ORACLE GOT STRONGER in the move. It used to be one
// lib file's SQL, read for the tables it touched. It is now the TEAM SCHEMA
// ITSELF: every secret-bearing column in `TEAM_MIGRATIONS`, found by the shape
// of its name, and the tables that declare them. A column added to the schema
// tomorrow is judged here today, and the oracle is the database's own shape
// rather than any one reader of it.

import { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("./d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { TEAM_MODULES } from "@shared/team-modules"
import { canonicalModule, MODULE_ALIASES, QUERY_MODULES } from "@shared/workers/query-grammar"
import { DOORS, handlerBody } from "../../mcp/test/door-census"
import { TEAM_MIGRATIONS } from "../src/team-schema"
import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "./spine-harness"

/** A STANDING GRANT TO SOMEBODY'S MAILBOX, in this team's database. The address
 * and the token are the two things that must never come out of the query door.
 * A token is not a number a person could have guessed: if this string appears in
 * a response, it came from the row. */
const SECRET_EMAIL = "alex.morales@kwapso.app"
const SECRET_TOKEN = "1//0gREFRESH-do-not-leak-4207"

/** What a block of work was SOLD for — a different table, still money, and the
 * positive control that proves the door is not simply broken. */
const SOLD_SPRINT = "Discovery sprint (sold)"
const SOLD_CENTS = 1_350_000

const db = () => holder.db as DatabaseSync

beforeEach(() => {
  holder.db = buildSpineDb()
  // `commercials` AND `google` ON TOP OF the harness's everything-on-the-spine
  // role. `google` is the right that decides whether a person may touch
  // connections at all, and the whole point of this suite is that holding it is
  // not enough: the connection table is unreachable because it was never
  // declared queryable, not because the caller lacks a permission. Granting both
  // is what makes the refusals below mean something — without them they would be
  // ordinary 403s proving nothing.
  db().exec(`
    INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete)
      VALUES ('${IDS.adminRole}_commercials', '${IDS.adminRole}', 'commercials', 1, 1, 1, 1),
             ('${IDS.adminRole}_google', '${IDS.adminRole}', 'google', 1, 1, 1, 1);
  `)
  // Somebody's Google grant, and the money beside it.
  db().exec(`
    INSERT INTO google_connections (id, user_id, service, google_email, scopes, refresh_token, created_at)
      VALUES ('GC1', '${IDS.staffUser}', 'gmail', '${SECRET_EMAIL}', 'gmail.readonly', '${SECRET_TOKEN}', '2026-01-01');
    INSERT INTO sprints (id, account_id, name, sold_price_cents, currency, created_at)
      VALUES ('SP1', '${IDS.victimAccount}', '${SOLD_SPRINT}', ${SOLD_CENTS}, 'EUR', '2026-01-01');
  `)
})

/** A query, as the staff ADMIN — every right in the team. The one thing that can
 * refuse them is the allow-list. */
async function query(qs: string): Promise<{ status: number; text: string }> {
  const request = new Request(`https://tenancy/api/tenancy/query${qs}`, {
    headers: { Cookie: "session=x" },
  })
  const res = await worker.fetch(request, makeEnv(() => holder.db as DatabaseSync, IDS.staffUser))
  return { status: res.status, text: await res.text() }
}

describe("the secret is really in the database (or every assertion below is empty)", () => {
  it("the connection row holds the address and the token being hunted for", () => {
    const row = db()
      .prepare("SELECT google_email, refresh_token FROM google_connections WHERE id = 'GC1'")
      .get() as { google_email: string; refresh_token: string }
    expect(row.google_email).toBe(SECRET_EMAIL)
    expect(row.refresh_token).toBe(SECRET_TOKEN)
  })
})

describe("no query names somebody's Google grant, by any handle", () => {
  /** Every way a caller could try to reach it: the table itself, the module that
   * gates it, the obvious near-misses, the prototype trick that has bitten this
   * codebase four times, and a name assembled to look like SQL. */
  const HANDLES = [
    "google_connections",
    "google",
    "google-connections",
    "googleConnections",
    "connections",
    "__proto__",
    "constructor",
    "accounts; SELECT * FROM google_connections",
    "google_connections--",
  ]

  for (const handle of HANDLES)
    it(`refuses module "${handle}" and returns nothing`, async () => {
      const { status, text } = await query(`?module=${encodeURIComponent(handle)}`)
      // THE LEAK FIRST, then the status. Asserted in this order deliberately: a
      // status check that fires first hides the only failure anybody cares
      // about, and when this suite was mutation-tested the message that had to
      // name the leaked token was the one that never ran.
      expect(text, "the refresh token came back out of the query door").not.toContain(SECRET_TOKEN)
      expect(text, "the connected mailbox came back out of the query door").not.toContain(SECRET_EMAIL)
      expect(status, "a module that is not in the allow-list is a clean 400").toBe(400)
      // …and the refusal names what COULD have been asked for, so the next
      // attempt is an allowed one rather than another guess.
      expect(text).toContain("tickets")
    })

  it("an alias reaches its module and says which one it gave you", async () => {
    // WHERE THE LINE IS, stated as a test rather than left to reading. An alias
    // is a second map a request value is looked up in, so the property worth
    // holding is that it lands on a module the allow-list ALREADY declared and
    // says so out loud — answering silently is what would let a caller use the
    // wrong name for the rest of a conversation.
    //
    // IT USED TO BE `commercials` → `account_rates`, the RIGHT that gates money
    // resolving to what a client is CHARGED. The client retired that card on
    // 10 Sep 2026, the module left the grammar, and — because MODULE_ALIASES is
    // DERIVED from the grammar rather than typed — the alias vanished with it,
    // which is the mechanism working. So the case moved to `help` → `tickets`,
    // the alias the whole feature was built for on 29 Aug 2026: the permission
    // module, the table, the API path and every MCP tool name say `help`, and
    // this map alone calls it `tickets`.
    const { status, text } = await query("?module=help")
    expect(status).toBe(200)
    const body = JSON.parse(text) as Record<string, unknown>
    expect(body.module, "the caller is told WHICH module they were given").toBe("tickets")
    expect(body.askedAs).toBe("help")
    expect(text, "and not one word about anybody's mailbox").not.toContain(SECRET_TOKEN)
    // …and the retired one resolves to nothing at all, by any spelling.
    for (const gone of ["account_rates", "commercials", "accountRates"])
      expect(canonicalModule(gone), `"${gone}" was retired on 10 Sep 2026`).toBeUndefined()
  })

  it("a FIELD name cannot reach another table either", async () => {
    // The second surface a grammar offers: the module is allowed, the field is
    // the smuggling attempt. Every column comes from the module's declared
    // fields, so this is a 400 with no statement built at all.
    for (const field of ["refresh_token", "google_connections.refresh_token", "id FROM google_connections --"]) {
      const where = encodeURIComponent(JSON.stringify([{ field, op: "eq", value: "x" }]))
      const { status, text } = await query(`?module=sprints&where=${where}`)
      expect(status, `"${field}" is not a field on sprints`).toBe(400)
      expect(text).not.toContain(SECRET_TOKEN)
    }
  })

  it("neither can a sort, a group, a projection or a cursor", async () => {
    const attempts = [
      "?module=sprints&sort=refresh_token%20FROM%20google_connections",
      `?module=sprints&groupBy=${encodeURIComponent(JSON.stringify(["google_connections"]))}`,
      `?module=sprints&fields=${encodeURIComponent(JSON.stringify(["google_connections.refresh_token"]))}`,
      "?module=sprints&cursor=' UNION SELECT refresh_token FROM google_connections --",
    ]
    for (const qs of attempts) {
      const { status, text } = await query(qs)
      expect(status, `${qs} must be refused`).toBe(400)
      expect(text).not.toContain(SECRET_TOKEN)
      expect(text).not.toContain(SECRET_EMAIL)
    }
  })

  it("THE POSITIVE CONTROL: the same caller reads what a client was SOLD", async () => {
    // Different table, on the machine surface on purpose — this law is about a
    // table nobody declared, not about all money. If this ever fails, the suite
    // above is proving nothing: a door that refuses everything is not a fence.
    //
    // THE FIGURE IS ASSERTED BY ITS OWN FIELD NAME, not merely found in the
    // body. Mutation-tested on 10 Sep 2026 and this is what the mutation taught:
    // renaming the money field in the grammar left the NUMBER in the response
    // under a different key, so a `toContain(String(cents))` check stayed green
    // over a door that had stopped projecting `soldPriceCents` at all. A control
    // that can be satisfied by a coincidence in a string is not a control.
    const { status, text } = await query("?module=sprints")
    expect(status).toBe(200)
    expect(text).toContain(SOLD_SPRINT)
    const body = JSON.parse(text) as { total: number; records: Record<string, unknown>[] }
    expect(body.total).toBe(1)
    expect(
      body.records[0]?.soldPriceCents,
      "the positive control must return the PRICE, under its own name — the generic door has to go on answering about money, or 'fenced' stops being distinguishable from 'money is scary'"
    ).toBe(SOLD_CENTS)
    expect(text).not.toContain(SECRET_TOKEN)
  })

  it("describe_module will not describe it either", async () => {
    const request = new Request("https://tenancy/api/tenancy/query/describe?module=google_connections", {
      headers: { Cookie: "session=x" },
    })
    const res = await worker.fetch(request, makeEnv(() => holder.db as DatabaseSync, IDS.staffUser))
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).not.toContain("refresh_token")
    // The catalogue a caller CAN see must not name it either.
    const list = await worker.fetch(
      new Request("https://tenancy/api/tenancy/query/describe", { headers: { Cookie: "session=x" } }),
      makeEnv(() => holder.db as DatabaseSync, IDS.staffUser)
    )
    expect(await list.text()).not.toContain("google_connections")
  })
})

describe("an alias widens what a caller may SAY, never what they may READ", () => {
  // Aliases arrived on 29 Aug 2026 so `help` would reach `tickets`. They are the
  // one thing added since that could quietly re-open this door: a second map a
  // request value is looked up in. Two properties keep them harmless — every
  // alias resolves to a module that was ALREADY in the allow-list, and no alias
  // may name a table the allow-list does not already expose.
  it("every alias lands on a module the allow-list already declared", () => {
    for (const [alias, key] of Object.entries(MODULE_ALIASES))
      expect(Object.keys(QUERY_MODULES), `${alias} resolves to "${key}"`).toContain(key)
  })

  it("no alias names a table that is not already queryable", () => {
    const queryable = new Set(Object.values(QUERY_MODULES).map((m) => m.table))
    for (const alias of Object.keys(MODULE_ALIASES))
      if (alias.includes("_") || queryable.has(alias))
        expect(
          !alias.startsWith("google"),
          `"${alias}" is an alias naming somebody's Google grant`
        ).toBe(true)
    // …said the other way round, which is the assertion that actually bites:
    // the secret table resolves to nothing, by every route into the lookup.
    for (const name of ["google_connections", "googleConnections", "google-connections", "google"])
      expect(canonicalModule(name), `"${name}" must resolve to no module at all`).toBeUndefined()
  })

  it("and the door still refuses them, through the alias path", async () => {
    // The behavioural half, because the two above are about the map and this is
    // about the door: a caller holding every right still gets nothing.
    for (const handle of ["google_connections", "GOOGLE_CONNECTIONS", "google-connections", "google"]) {
      const { status, text } = await query(`?module=${encodeURIComponent(handle)}`)
      expect(text, "the refresh token came back through an alias").not.toContain(SECRET_TOKEN)
      expect(text).not.toContain(SECRET_EMAIL)
      expect(status).toBe(400)
    }
  })
})

describe("the allow-list is derived-clean against the team schema itself", () => {
  /** EVERY SECRET-BEARING COLUMN THE SCHEMA DECLARES, read off `TEAM_MIGRATIONS`
   * — the database's own shape, which is a stronger oracle than any one file
   * that reads it. A secret here is a stored credential: something that grants
   * ACCESS rather than merely discloses a fact, so the shape of the name is the
   * test (`*_token`, `*_secret`), and both `CREATE TABLE` bodies and later
   * `ALTER TABLE … ADD COLUMN` are read, because either can introduce one.
   *
   * Deliberately narrower than "anything sensitive": this is the set where a
   * leak is not an embarrassment but a foothold, and a rule with a fuzzy edge is
   * a rule somebody argues their way past. */
  const schema = TEAM_MIGRATIONS.map((m) => m.sql).join("\n")
  const secretColumns = [
    ...new Set([...schema.matchAll(/\b([a-z_]*(?:_token|_secret))\b\s+TEXT/g)].map((m) => m[1])),
  ]

  /** Which TABLE each of those columns is declared on, read off the CREATE
   * statements they sit inside. */
  const tablesWithASecret = new Set<string>()
  for (const m of schema.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)\s*\(([\s\S]*?)\n\);/g))
    if (secretColumns.some((c) => new RegExp(`\\b${c}\\b`).test(m[2]))) tablesWithASecret.add(m[1])

  it("the derivation found real columns and real tables (a blind scan reports all-clear like a passing one)", () => {
    expect(
      secretColumns,
      "refresh_token is the column this suite is about — did the schema scan stop matching?"
    ).toContain("refresh_token")
    expect(secretColumns.length, "the secret-column scan went blind").toBeGreaterThan(1)
    expect(
      [...tablesWithASecret],
      "google_connections is the table this suite is about — did the CREATE scan stop matching?"
    ).toContain("google_connections")
  })

  it("no table holding a stored credential is queryable", () => {
    const queryable = new Set(Object.values(QUERY_MODULES).map((m) => m.table))
    const leaked = [...tablesWithASecret].filter((t) => queryable.has(t))
    expect(
      leaked,
      `the query door's allow-list names a table holding a stored credential: ${leaked.join(", ")}. It is an ALLOW-list — take the entry out, do not add a guard.`
    ).toEqual([])
  })

  it("and no module's declared fields name a stored credential under any table", () => {
    // The finer half: the TABLE being absent is not enough if some other module
    // quietly exposes the same column. Every declared column is checked against
    // the schema's own secret set, so a module that gained a `refresh_token`
    // field on a table that IS queryable is caught even though the table is not.
    for (const [name, mod] of Object.entries(QUERY_MODULES))
      for (const f of mod.fields)
        expect(
          secretColumns.includes(f.column),
          `${name}.${f.name} exposes "${f.column}", a stored credential — no module may declare one`
        ).toBe(false)
  })
})

/** THE SECOND SWITCH — a right that narrows the ROWS rather than opening the door.
 *
 * The suite above proves the query door cannot reach a table it was never given.
 * This proves the harder half: it can reach `accounts` and `tasks`, and two
 * modules on this app are governed by TWO rights rather than one — the module's
 * own opens the collection, and a second decides how much of it you see.
 * `shared/team-modules.ts` calls them "a switch over a SIGHT, not over a record".
 *
 * The generic door asked for `module:read` and knew nothing about the second
 * switch, and it is the ONLY accounts read and the ONLY tasks read the assistant
 * has (nine `list_*` tools were retired into it, REPLACED_BY_QUERY). Measured
 * against live staging on 30 Aug 2026 as a real Developer — `accounts:read`
 * without `contacts:read`, `work:read` without `all_tasks:read`:
 *
 *   GET /api/tenancy/accounts   individualTotal 0     query_records  132, 108 people
 *                                                                    by name, email
 *                                                                    and phone
 *   GET /api/content/tasks      82 rows (their own)   query_records  256 — the same
 *                                                                    number the Admin
 *                                                                    gets
 *
 * Both 200s. Both silent. The screen was right and the assistant's only door was
 * not, which is the one direction that matters: the machine surface may never be
 * more permissive than the UI.
 *
 * WHAT MAKES THIS A CHECK. The same three things the suite above insists on:
 * the ROWS ARE REALLY THERE (each refusal is paired with a count off the
 * database proving the people and the other person's tasks exist); a POSITIVE
 * CONTROL (the same caller still gets the companies, and the same caller WITH
 * the right gets everything, so a door that refuses everybody cannot pass); and
 * the FORBIDDEN SET IS DERIVED — the last test reads every module's own list
 * door off disk and fails when a door narrows by a right the grammar does not
 * declare, so the next module of this shape is judged without editing this file.
 */
describe("the second switch: a right that narrows rows narrows them here too", () => {
  /** The same door as `query` above, with the body already parsed — every
   * assertion below is about WHICH ROWS came back, not about a status line. */
  const ask = async (qs: string): Promise<{ status: number; body: Record<string, unknown> }> => {
    const r = await query(qs)
    return { status: r.status, body: JSON.parse(r.text) as Record<string, unknown> }
  }

  /** A caller holding the module's own right and NOT the second one — the
   * Developer role this was measured on. Built by taking one row away from the
   * harness's everything role, so the caller is ordinary in every other way. */
  function withoutRight(module: string) {
    db().exec(`DELETE FROM role_permissions WHERE role_id = '${IDS.adminRole}' AND module = '${module}';`)
  }
  const count = (sql: string) => (db().prepare(sql).get() as { n: number }).n

  describe("contacts:read — the address book inside the customer spine", () => {
    it("the people are really there, and the companies are too", () => {
      expect(count("SELECT COUNT(*) AS n FROM accounts WHERE account_type = 'individual'")).toBeGreaterThan(0)
      expect(count("SELECT COUNT(*) AS n FROM accounts WHERE account_type = 'entity'")).toBeGreaterThan(0)
    })

    it("without contacts:read the query door returns companies only — rows, total and groups alike", async () => {
      withoutRight("contacts")
      const rows = await ask("?module=accounts")
      expect(rows.status).toBe(200)
      const records = rows.body.records as { accountType?: string }[]
      expect(records.length, "the companies must still come back — this is a narrowing, not a refusal").toBeGreaterThan(0)
      expect(
        records.filter((r) => r.accountType !== "entity"),
        "a person came back to a caller who may not enumerate people"
      ).toEqual([])
      expect(rows.body.total, "the TOTAL leaks the size of the address book even when the page does not").toBe(
        count("SELECT COUNT(*) AS n FROM accounts WHERE account_type = 'entity'")
      )
      const grouped = await ask(`?module=accounts&groupBy=${encodeURIComponent(JSON.stringify(["accountType"]))}`)
      expect(
        (grouped.body.groups as { key: Record<string, unknown> }[]).map((g) => g.key.accountType),
        "a grouped count is a read of the same rows and must be narrowed by the same clause"
      ).toEqual(["entity"])
    })

    it("naming the people explicitly does not get past it", async () => {
      withoutRight("contacts")
      const r = await ask(
        `?module=accounts&where=${encodeURIComponent(JSON.stringify([{ field: "accountType", op: "eq", value: "individual" }]))}`
      )
      expect(r.status).toBe(200)
      expect(r.body.records, "asking for people by name got past a fence that only filters the default view").toEqual([])
      expect(r.body.total).toBe(0)
    })

    it("`unmatched` does not become an existence oracle for the people", async () => {
      // THE FENCE'S OWN BLIND SPOT, and the reason the door hands the engine a
      // RESOLVER rather than one clause. `findUnmatched` exists to tell "no rows
      // matched" from "no such thing" — it looks the value up in the referenced
      // table. On a fenced module that lookup answers a question the caller may
      // not ask: filter `parentAccountId contains "Marta Ruiz"` and silence means
      // she is here; filter an invented name and `unmatched` comes back. One bit
      // per guess, about exactly the people this right withholds. Measured before
      // the fix, on this fixture, and it returned exactly that pair.
      withoutRight("contacts")
      const person = db().prepare("SELECT name FROM accounts WHERE account_type='individual' LIMIT 1").get() as { name: string }
      const probe = async (v: string) =>
        (await ask(`?module=accounts&countOnly=true&where=${encodeURIComponent(JSON.stringify([{ field: "parentAccountId", op: "contains", value: v }]))}`))
          .body.unmatched
      expect(person.name, "the fixture must really hold a person to hunt for").toBeTruthy()
      expect(
        await probe(person.name),
        `"${person.name}" is a person this caller may not enumerate — reporting her as MATCHED tells them she is here`
      ).toEqual([{ field: "parentAccountId", values: [person.name] }])
      expect(
        await probe("Zzyzx Nonexistent"),
        "a name that is genuinely absent must read the same way, or the difference is the leak"
      ).toEqual([{ field: "parentAccountId", values: ["Zzyzx Nonexistent"] }])
    })

    it("WITH contacts:read the same caller gets the people (the positive control)", async () => {
      const r = await ask("?module=accounts")
      expect(r.status).toBe(200)
      expect(
        (r.body.records as { accountType?: string }[]).some((x) => x.accountType === "individual"),
        "a door that refuses everybody is not a fence, it is a broken door"
      ).toBe(true)
    })
  })

  describe("all_tasks:read — whose tasks 'the tasks' means", () => {
    beforeEach(() => {
      // One task of the caller's own and one of somebody else's. Without the
      // second right the door must hand back exactly the first.
      db().exec(`
        INSERT INTO tasks (id, ref, title, status, assignee_id, created_at, creator_id)
          VALUES ('TK_MINE',   'TSK-0000001', 'Mine',      'open', '${IDS.staffUser}',   '2026-03-01', '${IDS.staffUser}'),
                 ('TK_THEIRS', 'TSK-0000002', 'Not mine',  'open', '${IDS.burglarUser}', '2026-03-02', '${IDS.staffUser}');
      `)
    })

    it("both tasks are really there", () => {
      expect(count("SELECT COUNT(*) AS n FROM tasks WHERE id IN ('TK_MINE','TK_THEIRS')")).toBe(2)
    })

    it("without all_tasks:read the query door returns only the caller's own", async () => {
      withoutRight("all_tasks")
      const r = await ask("?module=tasks")
      expect(r.status).toBe(200)
      const ids = (r.body.records as { id: string }[]).map((x) => x.id)
      expect(ids).toContain("TK_MINE")
      expect(ids, "somebody else's task reached a caller who may only see their own").not.toContain("TK_THEIRS")
      expect(r.body.total, "the count must mean the same rows the page does").toBe(1)
    })

    it("WITH all_tasks:read the same caller sees both (the positive control)", async () => {
      const r = await ask("?module=tasks")
      const ids = (r.body.records as { id: string }[]).map((x) => x.id)
      expect(ids).toContain("TK_MINE")
      expect(ids).toContain("TK_THEIRS")
    })
  })

  /** DERIVED, so the next module of this shape is judged without editing this file.
   *
   * Every module's own list door is read off disk and asked which rights it
   * consults. A door that opens with `requireRight(module, right)` is the gate;
   * a right it also tests with `hasRight` is a NARROWING — the door answers
   * either way and hands back less. Every one of those must be declared on the
   * query module, or the generic door is wider than the screen again. */
  it("every right a module's own list door narrows by is declared on its query module", () => {
    // THE REPO'S ONE DOOR CENSUS, not a second copy of it. `door-census.ts`
    // already reads every worker's own switchboard and every handler's own body
    // — R19, R22 and R27 all derive from it — and its own header says why a
    // second scan would be the thing to avoid: one rule and one thing that looks
    // like it, drifting apart under a green build.
    expect(DOORS.length, "the door census found nothing — a blind check passes like a clean one").toBeGreaterThan(60)

    /** THE DOORS THAT LIST *THIS* MODULE. Sharing a permission is not being the
     * same collection: `stories`, `sprints`, `work_logs` and `waves` all gate on
     * `work:read`, exactly as the TASKS door does, so a census keyed on the right
     * alone reported the tasks door's `all_tasks:read` narrowing against all four
     * — six findings, none of them real. A door belongs to a module when it gates
     * on that module's right AND its path names that module's own collection.
     *
     * SCOPE, said plainly: a list door whose path spells its collection
     * differently from the grammar is not matched, and this check is silent about
     * it. That is a floor, not a census — the behavioural tests above are what
     * prove the two known fences, and this is what stops a THIRD arriving unseen. */
    const doorsOf = (key: string, mod: (typeof QUERY_MODULES)[string]) =>
      DOORS.filter(
        (d) =>
          d.method === "GET" &&
          new RegExp(`"${mod.module}"\\s*,\\s*"read"`).test(handlerBody(d).replace(/\s+/g, " ")) &&
          (d.path.includes(`/${mod.table}`) || d.path.includes(`/${key}`) || d.path.includes(`/${key.replace(/_/g, "-")}`))
      )

    const undeclared: string[] = []
    let modulesWithADoor = 0
    for (const [key, mod] of Object.entries(QUERY_MODULES)) {
      const declared = mod.narrow ? `${mod.narrow.right[0]}:${mod.narrow.right[1]}` : null
      const doors = doorsOf(key, mod)
      if (doors.length) modulesWithADoor++
      for (const d of doors) {
        const body = handlerBody(d).replace(/\s+/g, " ")
        for (const m of body.matchAll(/hasRight\([^)]*?"([a-z_]+)"\s*,\s*"(read|create|edit|delete)"/g)) {
          const narrowed = `${m[1]}:${m[2]}`
          // The module's OWN right, tested rather than required, is a composite
          // dashboard deciding whether to include this module at all.
          if (m[1] === mod.module) continue
          // Only a READ right on a module the matrix offers: a write right
          // tested on a read door is a duty filter, not a fence.
          if (m[2] !== "read" || !TEAM_MODULES.includes(m[1] as (typeof TEAM_MODULES)[number])) continue
          if (narrowed === declared) continue
          if (!NOT_A_ROW_FENCE[`${key}:${narrowed}`])
            undeclared.push(`${key}: ${d.method} ${d.path} narrows by ${narrowed}, undeclared`)
        }
      }
    }
    expect(modulesWithADoor, "no query module matched a door of its own — the linking has gone blind").toBeGreaterThan(6)
    expect(
      [...new Set(undeclared)],
      `A module's own list door hands back fewer rows to a caller missing a second right, and the ` +
        `generic query door does not — so the assistant sees more than the screen. Declare it as ` +
        `\`narrow\` on the query module in shared/workers/query-grammar.ts, or pin it in ` +
        `NOT_A_ROW_FENCE with the reason it narrows something other than rows:\n${undeclared.join("\n")}`
    ).toEqual([])
  })
})

/** Rights a door tests with `hasRight` that do NOT narrow which rows of the
 * queried module come back. Each is a real, different act — pinned with its
 * reason so the list can only shrink, and rot-checked below. */
const NOT_A_ROW_FENCE: Record<string, string> = {
  "accounts:portal_users:read":
    "the account DETAIL door withholds the nested `portalUsers` array, a field of one record — the query grammar declares no portal-user field at all, so there is nothing here to narrow",
  "knowledge_sources:google:read":
    "the knowledge SYNC-STATUS door adds the Google connection's state beside the counts; it withholds an extra, not a row",
}

describe("the second-switch pins are still real", () => {
  it("every NOT_A_ROW_FENCE line names a module the grammar still has, with a reason", () => {
    for (const [pin, why] of Object.entries(NOT_A_ROW_FENCE)) {
      const [moduleKey] = pin.split(":")
      expect(QUERY_MODULES[moduleKey], `${pin} pins a query module that no longer exists`).toBeTruthy()
      expect(why.length, `${pin} needs a reason someone can disagree with`).toBeGreaterThan(40)
    }
  })
})
