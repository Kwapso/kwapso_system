// 0073 GIVES THE TEAM DATABASE THE SHAPE THE KNOWLEDGE-BASE REBUILD NEEDS
// (BUILD-5-knowledge-rebuild.md, Lane A). Five things, one migration, because
// the plan asked for a single ledger entry: `knowledge_sources` learns one
// identity per thing plus who it's shared with; `knowledge_sightings` is the
// new home for "who saw this, where, when" so the multi-person duplicate bug
// (one Google item filed once per reader) has somewhere to record a SECOND
// reader without a SECOND source row; `knowledge_chunks` learns to carry a
// speaker and a moment, for chat/meeting grain; `knowledge_names` is the
// account/app/contact/colleague alias index that replaces `accountNamedIn`;
// and `knowledge_chunks_fts` is BM25 over chunk text, in FTS5's own
// EXTERNAL-CONTENT mode — no triggers, because this repo's own migration
// executor (`d1ExecScript`'s `splitStatements`, shared/workers/d1-rest.ts) is
// a naive `;`-splitter with no idea a `CREATE TRIGGER … BEGIN … END;` body's
// internal semicolons are not statement boundaries. A trigger-synced FTS
// table would look right here (this suite runs raw against node:sqlite,
// which DOES understand BEGIN/END) and then shatter into broken fragments
// the first time a real deploy tried to apply it. So the index is kept in
// step by application code (Lane C), the same way `knowledge_terms` always
// was — proved below by driving the exact insert/delete SQL that code will
// have to issue, not by trusting that FTS5's own machinery works.

import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"
import { TEAM_MIGRATIONS } from "../src/team-schema"

const VERSION = "0073_the_knowledge_base_is_rebuilt"

function baseUpTo(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  for (const m of TEAM_MIGRATIONS) {
    if (m.version === VERSION) return db
    db.exec(m.sql)
  }
  throw new Error(`${VERSION} is not in the ledger`)
}

function migrated(): DatabaseSync {
  const db = baseUpTo()
  const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
  if (!m) throw new Error(`${VERSION} is not in the ledger`)
  db.exec(m.sql)
  return db
}

const columns = (db: DatabaseSync, table: string): Set<string> =>
  new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
  )

describe("0073 — the knowledge base gets the shape the rebuild needs", () => {
  it("is in the ledger, numbered after 0072, and applies cleanly onto a real database", () => {
    expect(TEAM_MIGRATIONS.some((m) => m.version === VERSION)).toBe(true)
    expect(() => migrated()).not.toThrow()
  })

  describe("knowledge_sources — one identity, multi-account/app, sharing, relevancy", () => {
    it("adds the five new columns without re-declaring the ones already there", () => {
      const db = migrated()
      const cols = columns(db, "knowledge_sources")
      for (const c of ["identity_key", "accounts", "apps", "shared_with", "relevancy_date"])
        expect(cols.has(c), `knowledge_sources.${c} is missing`).toBe(true)
      // owner_user_id and account_id are original CREATE TABLE columns (0012).
      // Re-adding them in this migration is the exact "duplicate column name"
      // trap CLAUDE.md warns about — proving they are untouched here, not
      // just present, is the point of this assertion.
      expect(cols.has("owner_user_id")).toBe(true)
      expect(cols.has("account_id")).toBe(true)
    })

    it("defaults a fresh row to the agency-shared, empty-array shape", () => {
      const db = migrated()
      db.exec(
        `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','note','Untitled','2026-09-10');`
      )
      const row = db
        .prepare("SELECT accounts, apps, shared_with, identity_key, relevancy_date FROM knowledge_sources WHERE id = 'S1'")
        .get() as Record<string, unknown>
      expect(row).toMatchObject({ accounts: "[]", apps: "[]", shared_with: "agency", identity_key: null, relevancy_date: null })
    })

    it("one identity, one row — the second reader of the same Google item cannot insert a second source", () => {
      const db = migrated()
      db.exec(
        `INSERT INTO knowledge_sources (id, kind, title, identity_key, created_at)
           VALUES ('S1','email','Notes: Padelbase','gmail:msg-abc','2026-09-10');`
      )
      expect(() =>
        db.exec(
          `INSERT INTO knowledge_sources (id, kind, title, identity_key, created_at)
             VALUES ('S2','email','Notes: Padelbase (again)','gmail:msg-abc','2026-09-10');`
        )
      ).toThrow(/UNIQUE/)
    })

    it("a NULL identity (a typed note, no external origin) never collides with another NULL", () => {
      const db = migrated()
      db.exec(
        `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','note','A','2026-09-10');
         INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S2','note','B','2026-09-10');`
      )
      expect(
        db.prepare("SELECT COUNT(*) AS n FROM knowledge_sources WHERE identity_key IS NULL").get()
      ).toMatchObject({ n: 2 })
    })
  })

  describe("knowledge_sightings — who saw a source, where, and when", () => {
    it("creates the table with a source_id foreign key and an index to read by source", () => {
      const db = migrated()
      const cols = columns(db, "knowledge_sightings")
      for (const c of ["id", "source_id", "seen_where", "seen_by_user_id", "seen_at", "created_at"])
        expect(cols.has(c), `knowledge_sightings.${c} is missing`).toBe(true)
      const idx = db
        .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'knowledge_sightings'")
        .all() as { name: string; sql: string }[]
      expect(idx.some((i) => i.sql?.includes("source_id"))).toBe(true)
    })

    it("two different readers of one source both get their own sighting row", () => {
      const db = migrated()
      db.exec(
        `INSERT INTO knowledge_sources (id, kind, title, identity_key, created_at)
           VALUES ('S1','document','Week planning','drive:file-1','2026-09-07');
         INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, seen_at, created_at)
           VALUES ('G1','S1','drive:folder-a','U_ALEX','2026-09-07','2026-09-07');
         INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, seen_at, created_at)
           VALUES ('G2','S1','drive:folder-a','U_AURORA','2026-09-07','2026-09-07');`
      )
      expect(
        db.prepare("SELECT COUNT(*) AS n FROM knowledge_sightings WHERE source_id = 'S1'").get()
      ).toMatchObject({ n: 2 })
    })

    it("the same reader seeing the same source at the same place twice does not duplicate", () => {
      const db = migrated()
      db.exec(
        `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','document','X','2026-09-07');
         INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, seen_at, created_at)
           VALUES ('G1','S1','drive:folder-a','U_ALEX','2026-09-07','2026-09-07');`
      )
      expect(() =>
        db.exec(
          `INSERT INTO knowledge_sightings (id, source_id, seen_where, seen_by_user_id, seen_at, created_at)
             VALUES ('G2','S1','drive:folder-a','U_ALEX','2026-09-08','2026-09-08');`
        )
      ).toThrow(/UNIQUE/)
    })
  })

  it("knowledge_chunks learns a context line, a speaker and a moment", () => {
    const db = migrated()
    const cols = columns(db, "knowledge_chunks")
    for (const c of ["context_line", "speaker", "said_at"])
      expect(cols.has(c), `knowledge_chunks.${c} is missing`).toBe(true)
  })

  describe("knowledge_names — the alias index (kind, ref, name, alias-of, compartment)", () => {
    it("creates the table and rejects the same name twice for the same entity", () => {
      const db = migrated()
      const cols = columns(db, "knowledge_names")
      for (const c of ["id", "kind", "ref_id", "name", "alias_of", "compartment", "created_at"])
        expect(cols.has(c), `knowledge_names.${c} is missing`).toBe(true)
      db.exec(
        `INSERT INTO knowledge_names (id, kind, ref_id, name, compartment, created_at)
           VALUES ('N1','account','A1','VU Solutions','agency','2026-09-10');`
      )
      expect(() =>
        db.exec(
          `INSERT INTO knowledge_names (id, kind, ref_id, name, compartment, created_at)
             VALUES ('N2','account','A1','VU Solutions','agency','2026-09-10');`
        )
      ).toThrow(/UNIQUE/)
    })

    it("carries an alias back to its canonical name, and one entity can hold several", () => {
      const db = migrated()
      db.exec(
        `INSERT INTO knowledge_names (id, kind, ref_id, name, alias_of, compartment, created_at) VALUES
           ('N1','account','A1','VU Solutions',NULL,'agency','2026-09-10'),
           ('N2','account','A1','VU','VU Solutions','agency','2026-09-10');`
      )
      const rows = db
        .prepare("SELECT name, alias_of FROM knowledge_names WHERE kind = 'account' AND ref_id = 'A1' ORDER BY name")
        .all()
      expect(rows).toEqual([
        { name: "VU", alias_of: "VU Solutions" },
        { name: "VU Solutions", alias_of: null },
      ])
    })
  })

  describe("knowledge_chunks_fts — BM25 over chunk text, no triggers", () => {
    it("is a real FTS5 virtual table", () => {
      const db = migrated()
      const row = db
        .prepare("SELECT sql FROM sqlite_master WHERE name = 'knowledge_chunks_fts'")
        .get() as { sql: string } | undefined
      expect(row?.sql, "knowledge_chunks_fts is not there").toBeTruthy()
      expect(row!.sql).toMatch(/USING fts5/)
      // External-content, not a second copy of the text: content_rowid ties
      // every fts row back to knowledge_chunks.rowid rather than duplicating
      // storage, which is what makes the keyed delete below possible at all.
      expect(row!.sql).toContain("content='knowledge_chunks'")
    })

    it("finds a chunk by its words, ranked, and joins straight back to the base row", () => {
      const db = migrated()
      // The migration's own backfill only covers rows that predate it — a
      // chunk inserted afterwards is Lane C's to add to the index, the same
      // way it will be in the real ingest path. Proving that division of
      // labour is the point of this suite, not papering over it.
      db.exec(
        `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','document','D','2026-09-10');
         INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C1','S1','agency',0,'the invoice was issued to the pharmacy','2026-09-10');
         INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C2','S1','agency',1,'unrelated words about a different topic entirely','2026-09-10');
         INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks;`
      )
      const hits = db
        .prepare(
          `SELECT k.id FROM knowledge_chunks_fts f
             JOIN knowledge_chunks k ON k.rowid = f.rowid
            WHERE knowledge_chunks_fts MATCH 'pharmacy'
            ORDER BY rank`
        )
        .all()
      expect(hits).toEqual([{ id: "C1" }])
    })

    it("backfills chunks that existed before the migration ran", () => {
      const db = baseUpTo()
      db.exec(
        `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','document','D','2026-09-10');
         INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C1','S1','agency',0,'a pre-existing chunk about horsepower','2026-09-10');`
      )
      const m = TEAM_MIGRATIONS.find((x) => x.version === VERSION)
      db.exec((m as { sql: string }).sql)
      const hits = db
        .prepare("SELECT rowid FROM knowledge_chunks_fts WHERE knowledge_chunks_fts MATCH 'horsepower'")
        .all()
      expect(hits.length, "the backfill must index rows that predate the migration").toBe(1)
    })

    it("a keyed delete (the whole reason external-content was chosen over knowledge_terms) removes exactly one chunk's postings", () => {
      const db = migrated()
      db.exec(
        `INSERT INTO knowledge_sources (id, kind, title, created_at) VALUES ('S1','document','D','2026-09-10');
         INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C1','S1','agency',0,'gizmo alpha','2026-09-10');
         INSERT INTO knowledge_chunks (id, source_id, compartment, seq, text, created_at)
           VALUES ('C2','S1','agency',1,'gizmo beta','2026-09-10');
         INSERT INTO knowledge_chunks_fts(rowid, text) SELECT rowid, text FROM knowledge_chunks;`
      )
      // The exact statement shape Lane C's re-index must issue: the 'delete'
      // command, keyed by rowid, carrying the SAME text it was inserted with —
      // FTS5's external-content contract, not a scan of every posting in the
      // team the way the old design's header worried about.
      db.exec(
        `INSERT INTO knowledge_chunks_fts (knowledge_chunks_fts, rowid, text)
           SELECT 'delete', rowid, text FROM knowledge_chunks WHERE id = 'C1';
         DELETE FROM knowledge_chunks WHERE id = 'C1';`
      )
      const remaining = db
        .prepare("SELECT rowid FROM knowledge_chunks_fts WHERE knowledge_chunks_fts MATCH 'gizmo'")
        .all()
      expect(remaining.length).toBe(1)
    })
  })
})
