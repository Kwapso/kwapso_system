// 0070's BACKFILL, RUN — not read.
//
// The migration's own suite in workers/content asserts what its SQL SAYS (an id
// join, never a title one). This one executes it against real SQLite and asks
// what it PLACED, because the two backfills are substring and sub-select work on
// live shapes and "it parses" is not the property anybody needs from them.
//
// THE ROWS BELOW ARE THE OWNER'S OWN 8 Sep 2026 COMPLAINT, in miniature: one
// Padelbase call that produced a calendar entry, a meeting, a Gemini notes
// document, a "Notes:" mail and an RSVP mail. Two of those state which event
// they came from and three do not, and the three keeping a NULL is the assertion
// that matters most — a wrong parent is worse than none.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const VERSION = "0070_a_source_says_which_call_it_is_from"
/** Google's own id for `Padelbase: Review`, 8 Sep 2026, off staging. */
const EVENT = "2a72n02b5g9d1h716n6rr8bqar"
/** The reader whose sight of the material this is — `<userId>:<externalId>`. */
const READER = "01KZTWXJA3DZW6WDXK4JH2ETNA"

function baseUpTo(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of TEAM_MIGRATIONS) {
    if (m.version === VERSION) return db
    db.exec(m.sql)
  }
  throw new Error(`${VERSION} is not in the ledger`)
}

const migrationSql = (): string => {
  const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
  return (m as { sql: string }).sql
}

function run(db: DatabaseSync): void {
  db.exec(migrationSql())
}

/** JUST THE BACKFILL. The whole migration cannot run twice — `ALTER TABLE` is
 * once-only and the ledger never replays a recorded version — so the property
 * worth proving is the one that CAN happen again: the same two statements meet
 * the same rows, from a rerun of scripts/backfill-source-events.mjs or from a
 * team restored mid-roll. */
function backfillOnly(db: DatabaseSync): void {
  for (const statement of migrationSql().match(/UPDATE knowledge_sources[\s\S]*?;/g) ?? [])
    db.exec(statement)
}

const source = (id: string, kind: string, table: string, rowId: string, title: string) =>
  `INSERT INTO knowledge_sources (id, kind, origin_table, origin_row_id, compartment, title, created_at)
     VALUES ('${id}','${kind}','${table}','${rowId}','agency','${title}','2026-09-08');`

describe("0070 gives a source the call it came from, and only where Google said so", () => {
  it("places the two routes it can prove, and nothing else", () => {
    const db = baseUpTo()
    db.exec(`
      INSERT INTO meetings (id, title, starts_at, google_event_id, created_at)
        VALUES ('M1','Padelbase: Review','2026-09-08T11:30:00.000Z','${EVENT}','2026-09-08');
      -- M2 SHARES M1'S TITLE AND HAS NO GOOGLE EVENT, and that is the whole
      -- discriminator: a recurring series is one entry per occurrence, all of
      -- them called the same thing ("Week planning" ninety-one times on
      -- staging). Under an ID join M2's source keeps a NULL. Under a title join
      -- it silently inherits M1's event and the base starts answering about the
      -- wrong half-hour, which is the failure this column was built to end.
      INSERT INTO meetings (id, title, starts_at, created_at)
        VALUES ('M2','Padelbase: Review','2026-09-01T11:30:00.000Z','2026-09-01');
      ${source("S1", "event", "google_calendar", `${READER}:${EVENT}`, "Padelbase: Review")}
      ${source("S2", "meeting", "meetings", "M1", "Padelbase: Review")}
      ${source("S3", "meeting", "meetings", "M2", "Padelbase: Review")}
      ${source("S4", "document", "google_drive", `${READER}:1oSCNXv8kQpBWG8`, "Padelbase: Review - Notes by Gemini")}
      ${source("S5", "email", "google_gmail", `${READER}:1a080fd9`, "Notes: Padelbase: Review Sep 8, 2026")}
      ${source("S6", "note", "google_chat", `${READER}:spaces/AAAA`, "Padelbase: Review")}
    `)
    run(db)

    const got = new Map(
      (
        db
          .prepare("SELECT id, event_id, event_id_from FROM knowledge_sources ORDER BY id")
          .all() as { id: string; event_id: string | null; event_id_from: string | null }[]
      ).map((r) => [r.id, r])
    )

    // THE CALENDAR ENTRY IS THE EVENT — the tail of its own origin id.
    expect(got.get("S1")).toMatchObject({ event_id: EVENT, event_id_from: "origin" })
    // THE MEETING CARRIES ONE — an id join to a column stored since 0012.
    expect(got.get("S2")).toMatchObject({ event_id: EVENT, event_id_from: "meeting" })
    // M2 carries no Google event and shares M1's title. Inventing one for it
    // would be the fabrication this whole column exists to refuse.
    expect(got.get("S3")).toMatchObject({ event_id: null, event_id_from: null })

    // THE THREE THAT SHARE A TITLE WITH THE EVENT AND STATE NOTHING. Each one
    // would be caught by a title match, which is exactly why they are here: the
    // Gemini notes document that holds the answer, the "Notes:" mail that holds
    // the minutes, and a chat message. All three keep a NULL.
    for (const id of ["S4", "S5", "S6"])
      expect(got.get(id), `${id} was given a parent Google never stated`).toMatchObject({
        event_id: null,
        event_id_from: null,
      })
  })

  it("is idempotent — a second run moves nothing (R17)", () => {
    const db = baseUpTo()
    db.exec(`
      INSERT INTO meetings (id, title, starts_at, google_event_id, created_at)
        VALUES ('M1','Padelbase: Review','2026-09-08T11:30:00.000Z','${EVENT}','2026-09-08');
      ${source("S2", "meeting", "meetings", "M1", "Padelbase: Review")}
    `)
    run(db)
    // A later, better route got here first for S2 — a rerun must leave it alone
    // rather than re-decide a parent somebody else proved.
    db.exec("UPDATE knowledge_sources SET event_id = 'set-by-hand', event_id_from = 'mail' WHERE id = 'S2';")
    backfillOnly(db)
    expect(
      db.prepare("SELECT event_id, event_id_from FROM knowledge_sources WHERE id = 'S2'").get()
    ).toMatchObject({ event_id: "set-by-hand", event_id_from: "mail" })
  })

  it("the index it adds skips the nulls it deliberately leaves", () => {
    const db = baseUpTo()
    run(db)
    const sqlText = (
      db
        .prepare("SELECT sql FROM sqlite_master WHERE name = 'idx_knowledge_sources_event'")
        .get() as { sql: string } | undefined
    )?.sql
    expect(sqlText, "the event index is not there").toBeTruthy()
    expect(sqlText).toContain("WHERE event_id IS NOT NULL")
  })
})
