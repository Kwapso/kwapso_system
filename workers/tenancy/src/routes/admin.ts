// Maintenance routes (x-admin-key only): the team-schema migration robot, the
// on-demand DB size check, and the module mover. The sharding machinery lives
// in lib/sharding; these just guard + drive it.

import { fail, json } from "@shared/workers/http"
import { d1Query } from "@shared/workers/d1-rest"
import {
  ACCOUNT_STORAGE_NAME,
  checkDatabaseSizes,
  D1_MAX_ACCOUNT_BYTES,
  daysUntilFull,
  moveModuleToOwnDatabase,
  SPLIT_READS_WIRED,
} from "../lib/sharding"
import { applyMigration, createTeam, d1Config } from "../lib/teams"
import { CRON_GROWTH_CAP, LIST_HARD_CAP, MIGRATE_TEAMS_PER_RUN } from "@shared/workers/limits"
import { requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { adminGuard } from "../context"
import { TEAM_MIGRATIONS } from "../team-schema"
import type { Env } from "../env"

/**
 * The migration robot (locked: per-team databases need a once-built rollout
 * machine). Applies any not-yet-applied team-schema migration to every ready
 * team database. Protected by the ADMIN_KEY secret.
 */
/** Every team a migration could apply to — ready, alive, and nothing else. Its
 * own constant because the deploy gate reads this exact clause off disk; see the
 * note at its use below. */
const READY_TEAMS_FENCE =
  "SELECT id, database_id, schema_version FROM teams WHERE db_status = 'ready' AND deactivated_at IS NULL"

export async function migrateTeams(request: Request, env: Env): Promise<Response> {
  const denied = adminGuard(request, env)
  if (denied) return denied

  // OPS, not a person: the migration runner is the app acting on its own.
  const cfg = d1Config(env, "automation")

  // ── A CHUNK, A RESUME POINT, AND A FAILURE THAT DOES NOT TAKE THE REST ──────
  //
  // This walked EVERY ready team with no LIMIT, applied every missing migration
  // with no bound, and let the first throw out of `applyMigration` end the whole
  // route — so a single unreachable database meant every team after it in the
  // listing was never visited, and the operator got a 500 rather than a list.
  // It was the only bulk path in the product with no ceiling of any kind
  // (speed_review crit 3, 7 Sep 2026).
  //
  // THE CHUNK is MIGRATE_TEAMS_PER_RUN, said here and reasoned in limits.ts.
  // THE RESUME POINT is each team's OWN `_migrations` table, which is why no
  // cursor is stored: a team already at the latest version costs one read and is
  // skipped, so the next run continues where this one stopped whatever happened
  // in between — including a worker that was killed. `remaining` tells the
  // operator to run it again, and `failed` names the databases that need looking
  // at rather than hiding them behind the first one.
  //
  // ORDERED, so "the next run continues" is a true sentence rather than a
  // hopeful one: without an order the page is whatever the database felt like,
  // and a run could revisit the same head for ever.
  // THE FENCE STAYS ONE LITERAL, AND IT IS READ BY SOMETHING ELSE.
  // `scripts/check-team-migrations.mjs` lifts this WHERE clause out of this
  // file's own source so the deploy gate asks about exactly the population the
  // remedy visits (test/migration-gate.test.ts, property 3 — "a gate over teams
  // the remedy skips is a gate nobody can satisfy"). Keep it a single string
  // ending at the clause; the paging below is concatenated on, so the parser
  // still reads the fence and nothing else.
  const teams = await env.DB.prepare(
    `${READY_TEAMS_FENCE}
       AND (schema_version IS NULL OR schema_version <> ?)
     ORDER BY id
     LIMIT ?`
  )
    .bind(TEAM_MIGRATIONS[TEAM_MIGRATIONS.length - 1].version, MIGRATE_TEAMS_PER_RUN + 1)
    .all<{ id: string; database_id: string; schema_version: string }>()

  const latest = TEAM_MIGRATIONS[TEAM_MIGRATIONS.length - 1].version
  const found = teams.results ?? []
  // One over the cap was read purely to answer "is there more" without a second
  // count — the same trick every paged door here uses.
  const batch = found.slice(0, MIGRATE_TEAMS_PER_RUN)
  const more = found.length > MIGRATE_TEAMS_PER_RUN

  let migrated = 0
  const failed: { teamId: string; reason: string }[] = []
  for (const team of batch) {
    try {
      const applied = await d1Query<{ version: string }>(
        cfg,
        team.database_id,
        // R14: one row per migration ever applied to this one database — bounded
        // by the length of TEAM_MIGRATIONS, which is code rather than data.
        "SELECT version FROM _migrations"
      )
      const done = new Set(applied.map((r) => r.version))
      const missing = TEAM_MIGRATIONS.filter((m) => !done.has(m.version))
      if (missing.length === 0) {
        // Already there: stamp the pointer so the next run's WHERE skips it
        // without opening the database at all.
        if (team.schema_version !== latest)
          await env.DB.prepare("UPDATE teams SET schema_version = ?, updated_at = ? WHERE id = ?")
            .bind(latest, new Date().toISOString(), team.id)
            .run()
        continue
      }

      for (const m of missing) await applyMigration(cfg, team.database_id, m)
      await env.DB.prepare(
        "UPDATE teams SET schema_version = ?, updated_at = ? WHERE id = ?"
      )
        .bind(latest, new Date().toISOString(), team.id)
        .run()
      migrated++
    } catch (e) {
      // SKIP WITH A REASON, PER TEAM. A migration that half-applied leaves that
      // ONE database mid-way and its `_migrations` table says exactly how far —
      // the next run picks it up from there. What must not happen is the other
      // twenty-four never being looked at because of it.
      failed.push({ teamId: team.id, reason: e instanceof Error ? e.message : String(e) })
    }
  }
  return json({
    ok: failed.length === 0,
    teamsChecked: batch.length,
    teamsMigrated: migrated,
    failed,
    // The resume signal: run it again. Nothing is stored, because each team's own
    // `_migrations` table already says where it got to.
    remaining: more,
  })
}

/** On-demand version of the nightly size check — the alarms, AND the trend.
 *
 * The alarm list answers "which databases are nearly full". `filling` answers the
 * question that follows it and used to have no answer anywhere: how long have I
 * got. 80% of a cap is a position, not a warning — see `recordGrowth`. */
export async function dbSizes(request: Request, env: Env): Promise<Response> {
  const denied = adminGuard(request, env)
  if (denied) return denied

  const result = await checkDatabaseSizes(env, d1Config(env, "automation"))
  // Bounded (R14) — one alert per database, but the cap is stated rather than
  // assumed. (This read used to sit uncapped under the next query's "Bounded"
  // comment, which is worse than plainly uncapped: it READ as checked.)
  const open = await env.DB.prepare(
    `SELECT database_name, size_bytes, created_at FROM db_alerts WHERE resolved_at IS NULL LIMIT ${LIST_HARD_CAP}`
  ).all()
  // Bounded (R14), and by the thing that makes a row worth reading: the fastest
  // fillers first, so the answer is a shortlist rather than the whole estate.
  // CRON_GROWTH_CAP is what the nightly tick writes, so the read can never ask for
  // more rows than exist.
  const growth = await env.DB.prepare(
    `SELECT database_name, size_bytes, at, prev_size_bytes, prev_at FROM db_growth
      ORDER BY size_bytes DESC LIMIT ${CRON_GROWTH_CAP}`
  ).all<{
    database_name: string
    size_bytes: number
    at: string
    prev_size_bytes: number | null
    prev_at: string | null
  }>()
  const filling = (growth.results ?? [])
    .map((r) => ({
      name: r.database_name,
      sizeBytes: r.size_bytes,
      // null = not answerable yet (one reading, or it is not growing). Reported as
      // null rather than as a very large number, which would read as a measurement.
      //
      // THE ACCOUNT ROW SHARES THIS TABLE AND NOT ITS CEILING. `db_growth` now
      // carries one row for every D1 byte on the Cloudflare account, and reading
      // it against the 10 GB per-database cap would report a total already 100×
      // past "full" — the most alarming possible way to be wrong about the one
      // reading that matters most.
      daysUntilFull: daysUntilFull(
        r,
        r.database_name === ACCOUNT_STORAGE_NAME ? D1_MAX_ACCOUNT_BYTES : undefined
      ),
    }))
    // The soonest first — the shortlist's whole purpose. Un-answerable rows go last
    // rather than being dropped: "we have no trend for this one yet" is information.
    .sort((a, b) => (a.daysUntilFull ?? Infinity) - (b.daysUntilFull ?? Infinity))
  return json({ ...result, openAlerts: open.results ?? [], filling })
}

/** The mover: POST { teamId, module, tables: [...] } with x-admin-key. */
export async function moveModule(request: Request, env: Env): Promise<Response> {
  const denied = adminGuard(request, env)
  if (denied) return denied

  const body = (await request.json().catch(() => ({}))) as {
    teamId?: string
    module?: string
    tables?: string[]
  }
  // THE RELIEF VALVE IS LOCKED, AND IT SAYS SO BEFORE IT TOUCHES ANYTHING.
  //
  // Ahead of the validation on purpose, because a 400 about a table name would be
  // a smaller lie than the 200 this door used to answer. The mover copies a
  // module's tables into a new database, flips the routing row and DRAINS the old
  // home — on the understanding that reads then merge across both. Nothing in the
  // app consults `team_module_databases`: `requireMember` resolves one
  // `guard.databaseId` from `teams.database_id` and every module lib reads it. So
  // the drain empties the database the app is still querying and the door reports
  // `done`, and the module goes to zero rows on both front doors while the data
  // sits safe in a database nothing asks.
  //
  // `SPLIT_READS_WIRED` is DERIVED, not asserted: merged-read-guard.test.ts
  // censuses the read path's production callers and fails if the flag disagrees.
  if (!SPLIT_READS_WIRED)
    return fail(
      503,
      "module_move_unavailable",
      "The module mover is not available: a module's reads still go to the team's one database, so moving it would empty it out of the app. See SPLIT_READS_WIRED in workers/tenancy/src/lib/sharding.ts."
    )
  const teamId = requireText(body.teamId, "Team", TEXT_LIMITS.short)
  const module = requireText(body.module, "Module", TEXT_LIMITS.short)
  if (!Array.isArray(body.tables) || !body.tables.length)
    return fail(400, "invalid_input", "teamId, module and tables are required.")
  const tables = body.tables
  // Table/module names are interpolated into DDL/DML downstream (the script API
  // has no identifier params) — so they must be STRICT SQL identifiers here at
  // the boundary. Kills injection even for an admin-key holder (defense-in-depth).
  const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/
  if (!IDENT.test(module) || tables.some((t) => typeof t !== "string" || !IDENT.test(t)))
    return fail(400, "invalid_input", "module and tables must be plain SQL identifiers (letters, digits, underscores).")

  // BOUNDED PER CALL, RESUMABLE ACROSS CALLS (lib/sharding.ts). `done: false` is
  // not a failure and not a partial success — it means the call spent its budget
  // and the move's progress is recorded, so POST the same body again to continue.
  // A big move is several calls; each one is safe to repeat.
  const result = await moveModuleToOwnDatabase(env, d1Config(env, "automation"), teamId, module, tables)
  return json({
    ok: true,
    ...result,
    next: result.done
      ? null
      : "Not finished. Call this door again with the same body to continue. Nothing is wrong.",
  })
}

/**
 * Seed a team on an environment where nobody can create one (shared/product.ts).
 *
 * This is NOT the user-facing door reopened under another name: it takes the
 * deployment's ADMIN_KEY, which no user, agent or access token ever holds, and
 * it names the owner explicitly rather than inferring them from a session — you
 * cannot reach it by being signed in. It exists for two jobs: standing up a
 * fresh environment, and giving the smoke suite the SECOND team it needs before
 * "a token is pinned to one team" can be proved at all.
 */
export async function adminCreateTeam(request: Request, env: Env): Promise<Response> {
  const denied = adminGuard(request, env)
  if (denied) return denied

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; email?: unknown }
  const name = requireText(body.name, "Team name", TEXT_LIMITS.short)
  const email = requireText(body.email, "Owner email", TEXT_LIMITS.short)

  const owner = await env.DB.prepare(
    "SELECT id, email, first_name, last_name FROM users WHERE email = ? AND deactivated_at IS NULL"
  )
    .bind(email.toLowerCase())
    .first<{ id: string; email: string; first_name: string | null; last_name: string | null }>()
  if (!owner) return fail(404, "no_user", "No account with that email has signed in here yet.")

  const team = await createTeam(
    env,
    {
      id: owner.id,
      email: owner.email,
      name: [owner.first_name, owner.last_name].filter(Boolean).join(" ") || owner.email,
    },
    name,
    null,
    // OPS: the owner seeding a team through the admin door, not a person on a
    // front door. The rows this writes are the app acting on its own behalf.
    "automation"
  )
  return json({ ok: true, team })
}
