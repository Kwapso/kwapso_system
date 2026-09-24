#!/usr/bin/env node
// The rescued Glide files a TICKET or a BACKLOG item points at, carried onto OUR
// storage — and the map from the old Glide URL to the new path that another
// lane reads to re-point each ticket message at its own image.
//
//   export TEST_LOGIN_KEY="$(security find-generic-password -s test-login-key-kwapso -w)"
//   node scripts/glide-media-upload.mjs --dry-run
//   node scripts/glide-media-upload.mjs --confirm
//
// STAGING ONLY. There is no production switch on this script — the base URL is
// read off the same declared config every deploy script uses
// (scripts/lib/front-doors.mjs), narrowed to `staging` in one place below.
//
// ── WHAT IT MOVES ────────────────────────────────────────────────────────────
//
// `scripts/glide-files.mjs` already rescued 4,869 files off Glide's storage onto
// this machine (glide/files/, manifest.json). Most of them are already handled
// by other scripts — glide-visuals.mjs (app/company/contact pictures),
// glide-documents.mjs (brand assets). What is left, and what this script is for,
// is the pictures a ticket or a backlog item carries: `agency.tickets` columns
// `DQtbC` and `wBFxa`, and `agency.backlog` column `Nql7c` — 4,770 files, 740 MB,
// as measured against the manifest on 24 Sep 2026. Every other `refs[].source`
// in the manifest (customers, contacts, choices, apps, tasks, comments,
// modules — and the `portal.*` mirror of tickets/backlog, the same rows seen
// from the other front door) is somebody else's lane and is left alone.
//
// ── THE DOOR, AND WHY NOT THE ONE THE TASK NAMED FIRST ──────────────────────
//
// The obvious door is the presigned upload (`POST /api/content/uploads/presign`,
// `workers/content/src/routes/uploads.ts`) — sign a URL, PUT straight to R2, skip
// the worker entirely. Read before writing a line here, and it is NOT usable
// for this run, for two independent reasons, either one enough on its own:
//
//   1. `UPLOAD_TARGETS` (workers/content/src/lib/upload-targets.ts) has no entry
//      for tickets or backlog — only `knowledge`, `deliverables`, `staff`,
//      `brand`. A presigned PUT needs a target's own module segment to mint the
//      key from, and there is no target to mint one from. Adding one is a
//      one-line table edit in a file this run does not own (the brief is one
//      script; that table is a shared security boundary, not this lane's to
//      widen).
//   2. Even where a target exists, presign is OFF on staging: `presign.ts`'s own
//      header says the scoped R2 credential it needs was removed on 7 Sep 2026
//      ("staging is back to the streaming door until a scoped token exists"),
//      and a live probe against staging confirms it — `POST .../uploads/presign`
//      with `{"module":"deliverables", ...}` answers `{"direct":false}`.
//
// So this follows the brief's own fallback and does what `glide-documents.mjs`
// does for brand assets: the ordinary gated STREAMING door, bytes as the request
// body, no row written. The door is `POST /api/content/deliverables/upload-stream`
// (`workers/content/src/routes/deliverables.ts`) rather than the brand-assets one
// glide-documents.mjs uses, for one reason — brand-assets/upload-stream only
// accepts `INLINE_SAFE_UPLOAD` (raster + mp4/webm/ogg + pdf), which refuses this
// corpus's one SVG, one TIFF and one HEIC; deliverables/upload-stream accepts
// `ANY_FILE_TYPE` and stores the bytes under `storedContentType` (kept as
// declared when it is inline-safe, neutralised to `application/octet-stream`
// otherwise) — the same XSS boundary, applied to a wider door. It is
// `kind: "housekeeping"` exactly like the brand-assets door: no row, no ping,
// nothing to attach — that is the next lane's job, over the map this writes.
// `deliverables:create` is a right this run's admin sign-in already holds
// (verified live), and every file in scope is well under the 90 MB streaming
// ceiling (largest is 71 MB).
//
// ── RESUMABLE, BOUNDED, HONEST ───────────────────────────────────────────────
//
// glide/media-map.json is read back in before anything is sent — a key already
// there with a `url` is a file this run has already carried, and it is skipped.
// A `failures` entry is retried every run, the same as a file this run has never
// seen: the ONLY state that survives a re-run is a success. Concurrency is
// bounded (CONCURRENCY below) and every request carries its own timeout+retry
// (scripts/lib/api.mjs's `timedFetch`, which already retries a no-answer
// transient failure); an HTTP answer that is not 2xx is retried by this script a
// further ATTEMPTS times with a growing pause, because "the worker was slow"
// and "the worker said no" are different failures. The map is written to disk
// every CHECKPOINT files, not only at the end, so a killed run loses at most a
// few dozen already-uploaded files worth of bookkeeping, never the uploads
// themselves.

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { makeApi, timedFetch } from "./lib/api.mjs"
import { FRONT_DOORS } from "./lib/front-doors.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const MANIFEST = resolve(ROOT, "glide/files/manifest.json")
const FILES_DIR = resolve(ROOT, "glide/files")
const OUT = resolve(ROOT, "glide/media-map.json")

const BASE = FRONT_DOORS.staging.agency
const OWNER_EMAIL = "aurora@kwapso.com"

const CONCURRENCY = 5
const ATTEMPTS = 3 // per file, over and above timedFetch's own no-answer retries
const RETRY_PAUSE_MS = 600
const CHECKPOINT = 100 // write the map, and print progress, every N files processed

const dryRun = !process.argv.includes("--confirm")

// ── the scope: which manifest entries are ours to carry ──────────────────────
//
// "agency.tickets" columns DQtbC/wBFxa, "agency.backlog" column Nql7c. The
// `portal.*` refs on the same rows are the same underlying file seen from the
// other front door — matched here by the `agency.*` half only, so a file is
// never counted twice.
function inScope(entry) {
  return (entry.refs ?? []).some(
    (r) =>
      (r.source === "agency.tickets" && (r.column === "DQtbC" || r.column === "wBFxa")) ||
      (r.source === "agency.backlog" && r.column === "Nql7c")
  )
}

if (!existsSync(MANIFEST)) {
  console.error(`Stopped: no ${MANIFEST}.\nRun node scripts/glide-files.mjs first — it rescues the files and writes the manifest.`)
  process.exit(1)
}
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"))
const scoped = (manifest.files ?? []).filter(inScope)

console.log(`\nGlide media → our storage, on staging (${BASE})`)
console.log(`  ${manifest.files.length} files in the manifest, ${scoped.length} of them a ticket or backlog item (740 MB, as last measured)`)
if (dryRun) console.log("  DRY RUN — nothing will be uploaded. Pass --confirm to do the work.")

// ── resumable state ───────────────────────────────────────────────────────────

/** { "<glide url>": { url, bytes, contentType } , ..., failures: [{url, reason}] }
 * `failures` is not itself a Glide URL — every real Glide URL is an
 * https://storage.googleapis.com/... string — so the two can never collide in
 * one flat object, which is what lets the consuming lane look a URL up directly
 * without filtering the key space first. */
let out = { failures: [] }
if (existsSync(OUT)) {
  try {
    out = JSON.parse(readFileSync(OUT, "utf8"))
    if (!Array.isArray(out.failures)) out.failures = []
  } catch (e) {
    console.error(`Stopped: ${OUT} exists and isn't valid JSON (${e instanceof Error ? e.message : e}). Move it aside and re-run.`)
    process.exit(1)
  }
}
const already = new Set(Object.keys(out).filter((k) => k !== "failures" && out[k]?.url))
console.log(`  ${already.size} already carried, from a previous run of this script — skipped.`)

const todo = scoped.filter((f) => !already.has(f.url))

function save() {
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n")
}

// ── sign in (skipped for a dry run with an empty queue and no key — same
// allowance glide-documents.mjs makes: a dry run that only wants to say what it
// WOULD do can read the manifest and the local files with no session at all) ──

const TEST_LOGIN_KEY = process.env.TEST_LOGIN_KEY ?? ""
if (!TEST_LOGIN_KEY && !dryRun) {
  console.error("Stopped: no TEST_LOGIN_KEY in the environment — this script can't sign in.")
  process.exit(1)
}

const api = makeApi(BASE)

function must(result, what) {
  if (!result.ok) {
    console.error(`\nStopped: ${what} — ${result.status} ${result.body?.message ?? ""}`)
    process.exit(1)
  }
  return result.body
}

async function signIn(email) {
  const start = await api("/api/auth/admin/test-login", {
    method: "POST",
    headers: { "x-admin-key": TEST_LOGIN_KEY },
    body: JSON.stringify({ email }),
  })
  if (!start.ok) {
    console.error(`\nStopped: couldn't mint a login code for ${email} — ${start.status} ${start.body?.message ?? ""}`)
    process.exit(1)
  }
  const verify = await timedFetch(`${BASE}/api/auth/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: start.body.code }),
  })
  const cookie = (verify.headers.get("set-cookie") ?? "").split(";")[0]
  if (!verify.ok || !/^(__Host-)?kwapso_session=/.test(cookie)) {
    console.error(`\nStopped: ${email} couldn't sign in (${verify.status}).`)
    process.exit(1)
  }
  return cookie
}

let cookie = null
if (TEST_LOGIN_KEY && (todo.length > 0 || !dryRun)) {
  cookie = await signIn(OWNER_EMAIL)
  const teams = must(await api("/api/tenancy/teams", {}, cookie), "reading your teams").teams ?? []
  const team = teams[0]
  if (!team) {
    console.error(`\nStopped: ${OWNER_EMAIL} is not in a team.`)
    process.exit(1)
  }
  must(await api("/api/tenancy/switch-team", { method: "POST", body: JSON.stringify({ teamId: team.id }) }, cookie), "switching to the team")
  console.log(`  standing in ${team.name} as ${OWNER_EMAIL}`)
}

// ── the one file, carried ─────────────────────────────────────────────────────

async function uploadOne(entry) {
  const local = resolve(FILES_DIR, entry.path)
  if (!existsSync(local)) return { error: "the local rescue copy is missing — run scripts/glide-files.mjs again" }
  const bytes = readFileSync(local)
  if (bytes.byteLength !== entry.bytes) {
    // Not a truncated write — a RESCUE-TIME COLLISION: glide-files.mjs derived
    // this local path from the filename alone for a handful of pasted-Outlook
    // images ("image001.png" and siblings, all under one Glide row folder), so
    // several different Glide URLs share one path on disk and only the last one
    // written survived. Not this script's file to fix (glide-files.mjs is
    // explicitly another lane's), so it is named honestly and left a failure
    // rather than guessed at — uploading whatever bytes happen to be on disk
    // under somebody else's URL would be worse than skipping it.
    return {
      error: `on-disk size (${bytes.byteLength}) doesn't match the manifest (${entry.bytes}) — this local path collides with another manifest entry (a glide-files.mjs rescue bug, see the script header)`,
    }
  }

  if (dryRun) return { bytes: bytes.byteLength }

  let lastError = null
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const res = await timedFetch(`${BASE}/api/content/deliverables/upload-stream`, {
        method: "POST",
        headers: { "Content-Type": entry.contentType, "Content-Length": String(bytes.byteLength), Cookie: cookie },
        body: bytes,
        duplex: "half",
      })
      const body = await res.json().catch(() => ({ message: "(no body)" }))
      if (res.ok && typeof body.url === "string") {
        return { url: body.url, bytes: bytes.byteLength, contentType: body.contentType ?? entry.contentType }
      }
      lastError = `${res.status} ${body?.message ?? ""}`.trim()
      // A 4xx is the door refusing this file specifically (bad type, too big,
      // gate) — retrying it won't change the answer, so it fails fast. A 5xx or
      // a 429 is the worker/host having a bad moment, which IS worth another try.
      if (res.status >= 400 && res.status < 500) break
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
    }
    if (attempt < ATTEMPTS - 1) await new Promise((r) => setTimeout(r, RETRY_PAUSE_MS * 2 ** attempt))
  }
  return { error: lastError ?? "unknown failure" }
}

// ── bounded-concurrency run over the queue ────────────────────────────────────

let processed = 0
let uploaded = 0
let failed = 0
let totalBytes = 0
const startedAt = Date.now()

async function worker(queue) {
  while (queue.length) {
    const entry = queue.pop()
    const result = await uploadOne(entry)
    processed++
    if (result.error) {
      failed++
      out.failures = out.failures.filter((f) => f.url !== entry.url)
      out.failures.push({ url: entry.url, reason: result.error })
    } else if (dryRun) {
      uploaded++
      totalBytes += result.bytes
    } else {
      uploaded++
      totalBytes += result.bytes
      out[entry.url] = { url: result.url, bytes: result.bytes, contentType: result.contentType }
      out.failures = out.failures.filter((f) => f.url !== entry.url)
    }
    if (processed % CHECKPOINT === 0 || processed === queue.__total) {
      if (!dryRun) save()
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0)
      console.log(`  ${processed}/${queue.__total} processed (${uploaded} ok, ${failed} failed) — ${elapsed}s in`)
    }
  }
}

if (todo.length === 0) {
  console.log("  Nothing left to do — every in-scope file is already carried.")
} else {
  console.log(`  ${todo.length} files to ${dryRun ? "check" : "upload"}, concurrency ${CONCURRENCY}${dryRun ? "" : `, door /api/content/deliverables/upload-stream`}`)
  const queue = [...todo]
  queue.__total = todo.length
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, () => worker(queue)))
  if (!dryRun) save()
}

// ── the report ─────────────────────────────────────────────────────────────

const carriedNow = uploaded
const carriedTotal = Object.keys(out).filter((k) => k !== "failures" && out[k]?.url).length
console.log(`\n${dryRun ? "Would carry" : "Done"}`)
console.log(`  ${carriedNow} files ${dryRun ? "would be" : "were"} uploaded this run, ${(totalBytes / 1_048_576).toFixed(1)} MB`)
console.log(`  ${already.size} were already carried from an earlier run`)
console.log(`  ${carriedTotal} total now recorded in ${OUT}${dryRun ? " (dry run — the file on disk is unchanged)" : ""}`)
if (out.failures.length) {
  console.log(`\nFailed — ${out.failures.length}:`)
  for (const f of out.failures.slice(0, 25)) console.log(`  ${f.url} — ${f.reason}`)
  if (out.failures.length > 25) console.log(`  … and ${out.failures.length - 25} more, all recorded in ${OUT}`)
}

if (!dryRun) save()

console.log(
  `\n${
    out.failures.length
      ? `${out.failures.length} could not be carried. Run it again — what's already up stays up, and only the failures are retried.`
      : dryRun
        ? "Nothing stood in the way — run it again with --confirm to actually upload."
        : "Every in-scope file is now on our own storage."
  }`
)
process.exit(out.failures.length ? 1 : 0)
