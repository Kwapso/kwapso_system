#!/usr/bin/env node
// THE SHIP PATH — every deploy builds from a fresh worktree, never the
// primary checkout's working tree.
//
//   cf-exec node scripts/deploy-from-worktree.mjs <staging|production>
//   (or: cf-exec npm run ship:staging / cf-exec npm run ship:production)
//
// ── THE FAULT, 16 SEP 2026 ──────────────────────────────────────────────────
//
// `npm run deploy:staging` / `deploy:production` (still the chain this script
// drives — account gate, lang gate, build, per-worker deploy, migration gate,
// smokes) ran `npm run build` and `wrangler deploy` straight out of the
// PRIMARY checkout's working tree. Three lanes merged into main in that same
// checkout and each ran the ship path from it. A merge rewrote files under a
// running esbuild and production deployed two of eight workers on a tree that
// was neither the pre-merge nor the post-merge commit — a state that never
// existed at any commit.
//
// This script closes that: it resolves `origin/main` ONCE, checks out that
// exact commit into an isolated worktree (`.worktrees/deploy`, detached, never
// the branch the primary checkout has open), and runs the whole existing
// deploy chain from there. A merge landing on main mid-deploy cannot touch a
// worktree that is already checked out at a fixed SHA — there is nothing left
// to race.
//
// ── THE LOCK ─────────────────────────────────────────────────────────────
//
// One deployer at a time, machine-wide-per-project: `.worktrees/deploy.lock`
// is created with the exclusive `wx` flag, which is atomic at the OS level —
// two processes racing to create it can never both succeed. A second deploy
// that finds the file refuses immediately, with a clear sentence, and does
// NOT retry or wait; running the whole chain in a loop hoping the lock frees
// is how a bug in one run becomes a bug in two runs racing each other. A lock
// older than 30 minutes is almost certainly a crashed run, but this script
// never removes one on its own — it reports the age and the session that held
// it, and a person decides. Silent self-cleanup is exactly the kind of "safe
// default" that hides a stuck process instead of surfacing it.
//
// ── THE DRY-RUN BUNDLE ───────────────────────────────────────────────────
//
// `npm run check` runs no wrangler at all (CHECK-DOES-NOT-TEST-WRANGLER). So
// before any of the eight workers is actually deployed, every one of them is
// bundled with `wrangler deploy --dry-run` from the worktree; a resolve error
// in any of them aborts the whole run before a single worker has been
// touched, rather than leaving the estate half-upgraded the way the fault did.

import { execFileSync, spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeSync, closeSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const WORKTREES_DIR = join(ROOT, ".worktrees")
const DEPLOY_WORKTREE = join(WORKTREES_DIR, "deploy")
const LOCK_PATH = join(WORKTREES_DIR, "deploy.lock")
const STALE_MS = 30 * 60 * 1000

const WORKERS = ["realtime", "auth", "tenancy", "content", "data-ops", "mcp", "gateway", "portal-gateway"]

function git(args, cwd = ROOT) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}

function run(label, cmd, args, cwd) {
  process.stdout.write(`\n── ${label} ${"─".repeat(Math.max(0, 60 - label.length))}\n`)
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", env: process.env })
  if (r.status !== 0) {
    throw new Error(`${label} exited ${r.status}`)
  }
}

/** Atomic acquire: `wx` fails with EEXIST if the file already exists, so two
 * processes racing to create it can never both believe they hold it. */
function acquireLock(sha, target) {
  const payload = JSON.stringify(
    { sha, target, session: process.env.CCD_SESSION_ID || `pid:${process.pid}`, startedAt: new Date().toISOString() },
    null,
    2
  )
  mkdirSync(WORKTREES_DIR, { recursive: true })
  let fd
  try {
    fd = openSync(LOCK_PATH, "wx")
  } catch (err) {
    if (err.code !== "EEXIST") throw err
    const held = JSON.parse(readFileSync(LOCK_PATH, "utf8"))
    const ageMs = Date.now() - Date.parse(held.startedAt)
    const ageMin = Math.round(ageMs / 60000)
    if (ageMs < STALE_MS) {
      console.error(
        `REFUSED — a deploy is already running.\n` +
          `  held by session ${held.session}, target ${held.target}, sha ${held.sha}\n` +
          `  started ${ageMin} minute(s) ago\n\n` +
          `Not retrying. Wait for it to finish, or investigate that session.`
      )
    } else {
      console.error(
        `REFUSED — the lock is ${ageMin} minute(s) old (stale threshold is 30).\n` +
          `  held by session ${held.session}, target ${held.target}, sha ${held.sha}\n` +
          `  started ${held.startedAt}\n\n` +
          `This is very likely a crashed or killed run, but this script never removes\n` +
          `a lock on its own. If you have confirmed no deploy is actually in flight,\n` +
          `remove it by hand: rm ${LOCK_PATH}`
      )
    }
    process.exit(1)
  }
  writeSync(fd, payload)
  closeSync(fd)
}

function releaseLock() {
  try {
    rmSync(LOCK_PATH, { force: true })
  } catch {
    // best effort
  }
}

function removeWorktree() {
  spawnSync("git", ["worktree", "remove", "--force", DEPLOY_WORKTREE], { cwd: ROOT, stdio: "ignore" })
  rmSync(DEPLOY_WORKTREE, { recursive: true, force: true })
}

/** Bundle every worker with `wrangler deploy --dry-run` before touching the
 * real deploy chain. A resolve error here aborts before anything is uploaded. */
function dryRunBundleAll(worktree, target) {
  const scratch = mkdtempSync(join(tmpdir(), "kwapso-dry-run-"))
  const envArgs = target === "staging" ? ["--env", "staging"] : []
  for (const worker of WORKERS) {
    const cwd = join(worktree, "workers", worker)
    process.stdout.write(`\n── dry-run bundle: ${worker} ${"─".repeat(Math.max(0, 40 - worker.length))}\n`)
    const r = spawnSync("npx", ["wrangler", "deploy", "--dry-run", "--outdir", join(scratch, worker), ...envArgs], {
      cwd,
      stdio: "inherit",
      env: process.env,
    })
    if (r.status !== 0) {
      throw new Error(`dry-run bundle failed for workers/${worker} (exit ${r.status}) — nothing was deployed`)
    }
  }
  rmSync(scratch, { recursive: true, force: true })
}

function main() {
  const target = process.argv[2]
  if (target !== "staging" && target !== "production") {
    console.error("usage: node scripts/deploy-from-worktree.mjs <staging|production>")
    process.exit(2)
  }

  console.log(`Fetching origin/main...`)
  git(["fetch", "origin", "main"])
  const sha = git(["rev-parse", "origin/main"])
  console.log(`Deploying SHA ${sha} to ${target}.`)

  acquireLock(sha, target)

  try {
    removeWorktree() // in case a previous run left one behind
    git(["worktree", "add", DEPLOY_WORKTREE, sha, "--detach"])

    run("npm ci", "npm", ["ci", "--silent"], DEPLOY_WORKTREE)
    // gateway + portal-gateway serve web/out + web-portal/out; wrangler's own
    // dry-run refuses to bundle an asset worker whose export doesn't exist yet.
    run("npm run build (for the dry-run bundle)", "npm", ["run", "build"], DEPLOY_WORKTREE)
    dryRunBundleAll(DEPLOY_WORKTREE, target)
    run(`npm run deploy:${target}`, "npm", ["run", `deploy:${target}`], DEPLOY_WORKTREE)

    console.log(`\nDeployed SHA ${sha} to ${target}.`)
  } finally {
    releaseLock()
    removeWorktree()
  }
}

main()
