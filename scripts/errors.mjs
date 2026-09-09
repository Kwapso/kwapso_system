#!/usr/bin/env node
// THE ERROR STORE, FROM A TERMINAL — read it, group it, close a whole failure.
//
// ── WHY THIS IS A SCRIPT AND NOT A SCREEN ───────────────────────────────────
//
// `GET /api/data-ops/admin/errors` and its two resolve doors are gated by
// `adminGuard`, which compares an `x-admin-key` header against a worker secret.
// That is not a gate a browser screen can pass: putting ADMIN_KEY in front-end
// code would hand the maintenance key to every person who opens the app.
//
// The alternative — gating the screen on a team role instead — is worse, and it
// is worth writing down so nobody reaches for it. `error_logs` is GLOBAL core
// data spanning every tenant: 89.7% of the live rows carry no team_id at all
// (measured on staging, 2026-09-05), and the ones that do carry someone else's.
// A screen an Admin of any team could open would show that Admin every other
// customer's stack traces, team ids and user ids. There is no owner or
// superuser identity in this product — permissions are per-team by design — so
// "who may read the estate's error log" is a question the permission model does
// not currently answer, and inventing an answer is an architecture decision
// rather than a screen.
//
// So: a terminal, where the key already lives, and where the person running it
// is by definition the maintainer. If a screen is wanted later it needs a
// platform-owner identity first, and that is the owner's decision to make.
//
// ── USAGE ───────────────────────────────────────────────────────────────────
//
//   set -a; source keys.env; set +a          # ADMIN_KEY must be EXPORTED
//   node scripts/errors.mjs staging          # open failures, grouped, newest first
//   node scripts/errors.mjs staging --all    # …including the ones already closed
//   node scripts/errors.mjs staging --resolve "content · Error: D1_ERROR: internal error; reference = #" \
//                                   --note "transient D1, no action"
//
// The signature to pass `--resolve` is exactly what this prints, and exactly
// what the nightly digest mails — one seam builds both
// (shared/workers/error-signature.ts), so a line from the mail can be pasted
// straight in.
//
// It READS the app's own configuration for the hostname rather than carrying
// one (scripts/lib/front-doors.mjs says why), and it never writes the key
// anywhere: it is read from the environment at the point of use and put in a
// header.

import { FRONT_DOORS } from "./lib/front-doors.mjs"
import { timedFetch } from "./lib/api.mjs"

const args = process.argv.slice(2)
const environment = args.find((a) => a === "staging" || a === "production")
const flag = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}

if (!environment) {
  console.error("Usage: node scripts/errors.mjs <staging|production> [--all] [--resolve <signature>] [--note <text>]")
  process.exit(2)
}

const ADMIN_KEY = process.env.ADMIN_KEY ?? ""
if (!ADMIN_KEY) {
  console.error(
    "ADMIN_KEY is not set.\n" +
      "  It lives in keys.env, and it has to be EXPORTED, not just sourced —\n" +
      "  a child process cannot see a plain shell variable:\n\n" +
      "      set -a; source keys.env; set +a\n"
  )
  process.exit(2)
}

const base = FRONT_DOORS[environment].agency
const headers = { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" }

/** THIS SCRIPT DOES NOT FOLD ANYTHING, and that is deliberate.
 *
 * The obvious build is to import `foldSignature` and group locally. A plain .mjs
 * cannot import the TypeScript seam without a bundler, so the tempting shortcut
 * is to copy its regex here — which would be a second definition with the same
 * name, the exact failure that moving `foldSignature` into shared/ was meant to
 * end. The first symptom would be a signature this prints that the door cannot
 * match.
 *
 * So the SERVER is the only folder. This prints what the rows say, groups them
 * by the same two columns the server builds a signature from, and hands the line
 * back to the door to decide what it matches. One folder, and it is the one that
 * does the closing. */
/** Sources the door declares as MEASUREMENTS — rows written on purpose with no
 * stack (the slow-door line). Announced by the server so this script never has
 * to know the list; a group from one of them is tagged rather than read as a
 * crash with its stack missing. */
let measurementSources = []

async function listErrors(status) {
  const res = await timedFetch(`${base}/api/data-ops/admin/errors?status=${status}&limit=200`, { headers })
  if (!res.ok) {
    console.error(`The errors door answered ${res.status}: ${(await res.text()).slice(0, 300)}`)
    process.exit(1)
  }
  const body = await res.json()
  measurementSources = body.measurementSources ?? []
  return body.errors ?? []
}


const resolveSig = flag("--resolve")
if (resolveSig) {
  const res = await timedFetch(`${base}/api/data-ops/admin/errors/resolve-signature`, {
    method: "POST",
    headers,
    body: JSON.stringify({ signature: resolveSig, note: flag("--note") ?? "" }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`Refused (${res.status}): ${JSON.stringify(body).slice(0, 300)}`)
    process.exit(1)
  }
  console.log(
    `closed ${body.updated} of ${body.matched} matching row(s), from ${body.scanned} open rows scanned` +
      (body.capped
        ? `\n  …and the scan hit its ceiling, so there may be more behind this signature. Run it again.`
        : "")
  )
  process.exit(0)
}

const rows = await listErrors(args.includes("--all") ? "all" : "open")
if (!rows.length) {
  console.log(`${environment}: nothing open. `)
  process.exit(0)
}

// GROUPED THE WAY THE DIGEST GROUPS, so what you read here is what you can close
// in one act. The grouping key is rebuilt from the row's own two columns, which
// is what `signatureOf` does server-side — printed rather than folded locally,
// see the note above.
const groups = new Map()
for (const r of rows) {
  const key = `${r.source} · ${String(r.message).slice(0, 80)}`
  const g = groups.get(key) ?? { n: 0, newest: r.at, place: r.place, resolved: 0, source: r.source }
  g.n++
  if (r.status === "resolved") g.resolved++
  if (r.at > g.newest) g.newest = r.at
  groups.set(key, g)
}

const sorted = [...groups].sort((a, b) => b[1].n - a[1].n)
console.log(`${environment}: ${rows.length} row(s) in ${sorted.length} signature(s), biggest first\n`)
for (const [sig, g] of sorted) {
  console.log(`${String(g.n).padStart(5)}  ${g.newest.slice(0, 16).replace("T", " ")}  ${sig}`)
  console.log(
    `       ${g.place}${g.resolved ? `  (${g.resolved} already closed)` : ""}` +
      (measurementSources.includes(g.source) ? "  (a measurement, no stack by design)" : "")
  )
}
console.log(
  `\nTo close one whole failure — the signature is the line above, quoted:\n` +
    `  node scripts/errors.mjs ${environment} --resolve "<signature>" --note "why"\n` +
    `The server folds volatile ids out of it, so four "reference = <random>" rows\n` +
    `are one signature and close together.`
)
