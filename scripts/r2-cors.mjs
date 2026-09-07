// R2 CORS — the one rule a browser needs to PUT a file straight to a bucket.
//
// ── WHY THERE IS A RULE AT ALL ──────────────────────────────────────────────
//
// The direct upload (workers/content/src/routes/uploads.ts) hands the browser a
// signed URL on `<account>.r2.cloudflarestorage.com`, and the browser PUTs the
// file there itself. That is a cross-origin request from the app's page, so the
// bucket has to say the app's origin may make it — otherwise the preflight is
// refused inside the browser, the PUT never leaves the tab, and the client
// falls back to the streaming door (which is correct, and which is also the
// whole benefit not being realised, silently). This is the rule that lets the
// fast path run.
//
// ── AND WHY IT IS THIS NARROW ───────────────────────────────────────────────
//
// CORS opens NOTHING on its own: R2 still refuses any request without a valid
// signature, and a signature here covers one key, one method, one label, one
// length and a five-minute deadline. What the rule decides is which ORIGINS may
// ask at all, and for which methods. So:
//
//   · ORIGINS — the agency app's public origin for this environment, read off
//     the content worker's own `PUBLIC_APP_URL`. Not the portal: a client login
//     never reaches the presign door (it refuses portal callers), so the
//     portal's origin has no PUT to make. Not `*`.
//   · METHODS — `PUT` only. Not GET (objects are read through `/media/*` on the
//     gateway, never from the bucket), not DELETE, not POST.
//   · HEADERS — `Content-Type` only, because it is the one header the browser
//     sets by hand and the signature covers (`Content-Length` the browser sets
//     itself and needs no allowance).
//   · MAX AGE — an hour. A preflight is cheap; a stale allow-list is not.
//
// ── HOW THE BUCKET LIST IS DECIDED ──────────────────────────────────────────
//
// From the `UPLOAD_TARGETS` table itself, not from a list typed here: the
// buckets that need a rule are exactly the ones the presign door can sign
// against, which is the set of `bucketVar` values that table carries, resolved
// through the content worker's own vars for that environment. Today every
// target writes to `INTERNAL_MEDIA_BUCKET`, so exactly ONE bucket gets a rule
// and the shared `MEDIA_BUCKET` gets none — a rule on a bucket nothing signs
// against is an origin allowance nobody asked for. Add a target on the other
// bucket and this widens by itself; `workers/gateway/test/r2-cors.test.ts`
// re-derives both halves off disk (its oracle is the imported table, this
// script's is the file's text) so the two cannot drift.
//
// Usage (every Cloudflare command on this machine takes the cf-exec prefix — a
// bare wrangler resolves to the wrong company's account):
//
//   cf-exec node scripts/r2-cors.mjs staging --dry-run   # see it first
//   cf-exec node scripts/r2-cors.mjs staging
//   cf-exec node scripts/r2-cors.mjs production
//
// Idempotent: `r2 bucket cors set` replaces the rule set. Nothing here reads or
// writes an object.
//
// APPLIED TO STAGING on 7 Sep 2026 (`kwapso-internal-media-staging`, the staging
// agency origin), and verified with `r2 bucket cors list`. Production has NO
// rule until somebody runs this against it, and until then production's direct
// path falls back to the streaming door on every upload — by design, and the
// client reports it (`upload/direct-put-failed`).

import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

/** How long a browser may remember the answer to a preflight. */
export const CORS_MAX_AGE_SECONDS = 3600

/** THE BUCKET VARS THE UPLOAD TABLE ACTUALLY NAMES, read off its own source.
 *
 * A `.mjs` script cannot import the table (it is TypeScript behind the
 * `@shared` alias), so this reads the one line per entry that decides it. Text
 * rather than a list: a target added on another bucket widens the rule set here
 * without anybody remembering to. */
export function bucketVars(root = ROOT) {
  const src = readFileSync(join(root, "workers", "content", "src", "lib", "upload-targets.ts"), "utf8")
  const table = src.slice(src.indexOf("export const UPLOAD_TARGETS"))
  const found = [...new Set([...table.matchAll(/bucketVar:\s*"([A-Z_]+)"/g)].map((m) => m[1]))]
  if (!found.length) throw new Error("no bucketVar in UPLOAD_TARGETS — the upload table moved or changed shape")
  return found.sort()
}

/** The content worker's `vars` block for one environment, as `{ name: value }`.
 * A tolerant read: the file is JSONC (comments), so it is scanned for the
 * `"NAME": "value"` pairs inside the top-level `vars` (production) or the
 * staging env's `vars` — the same trick `r2-lifecycle.mjs` uses for bucket
 * names. */
export function contentVars(environment, root = ROOT) {
  const src = readFileSync(join(root, "workers", "content", "wrangler.jsonc"), "utf8")
  // The staging block starts at `"staging": {`; production vars are everything
  // before it. Both hold a `"vars": {` block with the same keys.
  const split = src.indexOf('"staging"')
  const region = environment === "staging" ? src.slice(split) : src.slice(0, split)
  const varsAt = region.indexOf('"vars"')
  const block = region.slice(varsAt, region.indexOf("}", varsAt))
  const out = {}
  for (const [, name, value] of block.matchAll(/"([A-Z_]+)"\s*:\s*"([^"]*)"/g)) out[name] = value
  return out
}

/** The buckets that need the rule, and the origin they need it for. */
export function corsTargets(environment, root = ROOT) {
  const vars = contentVars(environment, root)
  const origin = vars.PUBLIC_APP_URL
  if (!origin) throw new Error(`no PUBLIC_APP_URL in the content worker's ${environment} vars`)
  const wanted = bucketVars(root)
  const buckets = wanted.map((v) => vars[v]).filter(Boolean)
  if (buckets.length !== wanted.length)
    throw new Error(`the content worker's ${environment} vars do not name every upload bucket (${wanted.join(", ")})`)
  return { origin, buckets: [...new Set(buckets)].sort() }
}

/** The rule set, as wrangler's `cors set` wants it. ONE origin, ONE method. */
export function corsRules(origin) {
  return [
    {
      allowed: { origins: [origin], methods: ["PUT"], headers: ["Content-Type"] },
      maxAgeSeconds: CORS_MAX_AGE_SECONDS,
    },
  ]
}

function main() {
  const [environment, ...flags] = process.argv.slice(2)
  if (environment !== "staging" && environment !== "production") {
    console.error("usage: cf-exec node scripts/r2-cors.mjs <staging|production> [--dry-run]")
    process.exit(2)
  }
  const dryRun = flags.includes("--dry-run")
  const { origin, buckets } = corsTargets(environment)
  const rules = corsRules(origin)
  console.log(`R2 CORS · ${environment} · ${buckets.length} bucket(s) · origin ${origin} · PUT only${dryRun ? " · DRY RUN" : ""}`)
  for (const bucket of buckets) {
    const file = join(mkdtempSync(join(tmpdir(), "r2-cors-")), `${bucket}.json`)
    writeFileSync(file, JSON.stringify({ rules }, null, 2))
    console.log(`  ${bucket}: ${JSON.stringify(rules[0].allowed)}`)
    if (dryRun) continue
    // `execFileSync` rather than a shell string: a bucket name goes into an
    // argument, and this repo does not build commands by concatenation.
    execFileSync("npx", ["wrangler", "r2", "bucket", "cors", "set", bucket, "--file", file, "--force"], {
      cwd: ROOT,
      stdio: "inherit",
    })
  }
}

// Only when run as a script, so the test can import the derivations.
if (process.argv[1] && process.argv[1].endsWith("r2-cors.mjs")) main()
