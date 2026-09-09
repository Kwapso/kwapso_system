#!/usr/bin/env node
// DOES THE KEY ON THIS LAPTOP STILL OPEN THE DOOR THAT IS DEPLOYED?
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//
// Twice in two days (7 and 8 Sep 2026) a credential in the Keychain turned out
// to have drifted from the secret the deployed worker actually holds:
// `test-login-key-kwapso` first, then `kwapso-admin-key`. Both were found the
// same way — a smoke run failed at the last step, and the first four guesses
// were about the code.
//
// A worker secret CANNOT BE READ BACK. `wrangler secret list` says a secret
// named TEST_LOGIN_KEY exists; it will never say what it is. So there is exactly
// one honest way to know whether the value on this laptop is the value out
// there, and that is to USE it and see whether the door opens. Anything that
// compares two local copies is comparing a file with a file.
//
// ── WHAT DRIFT ACTUALLY COSTS ───────────────────────────────────────────────
//
// Neither of these keys is used by the product. They are used by the CHECKS:
// the staging smoke run signs in with the test-login key, and the migration
// robot is opened with the admin key. So a drifted credential does not break the
// app — it breaks the last step of the deploy, at the moment somebody is deciding
// whether what they just shipped works. The failure arrives dressed as "the
// thing you deployed is broken", which is the wrong sentence and sends the next
// half hour in the wrong direction. That is the whole cost, and it is why this
// runs BEFORE a deploy rather than after one.
//
// ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────
//
// It never prints a key, never writes one to a file, and never repairs one. A
// rotation is two deliberate acts by a person (mint into the Keychain, then
// `wrangler secret put`), and a script that did it unattended would be a script
// that can silently replace the credential a deploy depends on.
//
//   node scripts/credentials-agree.mjs            # staging (the only one with a test-login door)
//   node scripts/credentials-agree.mjs --production
//
// Exits 0 when every key opens its door, 1 when any one of them does not.

import { testLoginKey } from "./lib/test-login-key.mjs"
import { execFileSync } from "node:child_process"

const PRODUCTION = process.argv.includes("--production")
const API = PRODUCTION ? "https://agency.kwapso.app" : "https://agency-staging.kwapso.app"

/** The admin key, from the Keychain, never echoed. Same rule as every other
 * credential reader here: an explicit environment variable wins, because an
 * override is always a deliberate act. */
function adminKey() {
  if (process.env.ADMIN_KEY) return process.env.ADMIN_KEY
  if (process.platform !== "darwin") return ""
  try {
    return execFileSync("security", ["find-generic-password", "-s", "kwapso-admin-key", "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return ""
  }
}

/** One door, asked with the key we hold. The THREE answers are deliberately
 * different sentences, because they lead to three different actions:
 *
 *   • 200/2xx  — the key out there is the key in here. Nothing to do.
 *   • 401/403  — DRIFT. The door is alive and rejected us: rotate.
 *   • anything else — the door is not answering. That is a deploy problem or a
 *     network problem, and calling it drift would send somebody rotating a
 *     credential that was never wrong. */
async function ask(label, url, init, fix) {
  let res
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) })
  } catch (e) {
    console.log(`  ??  ${label}: the door did not answer (${e.message}). Not drift — check the deploy.`)
    return "unknown"
  }
  if (res.status === 401 || res.status === 403) {
    console.log(`  NO  ${label}: the deployed worker REFUSED this key.`)
    console.log(`      ${fix}`)
    return "drift"
  }
  if (!res.ok) {
    console.log(`  ??  ${label}: answered ${res.status}. Not drift — the key was accepted or never reached.`)
    return "unknown"
  }
  console.log(`  OK  ${label}`)
  return "ok"
}

console.log(`credentials-agree — ${PRODUCTION ? "production" : "staging"} (${API})\n`)

const results = []

// 1 · THE TEST SIGN-IN KEY. Staging only, on purpose: the door refuses outright
// when ENVIRONMENT is "production", so asking it there proves nothing about the
// key and would report a false clean.
if (PRODUCTION) {
  console.log("  --  test sign-in key: no such door in production, by design. Skipped.")
} else {
  const key = testLoginKey()
  if (!key) {
    console.log("  NO  test sign-in key: not in the Keychain at all (test-login-key-kwapso).")
    results.push("drift")
  } else {
    results.push(
      await ask(
        "test sign-in key (auth: POST /api/auth/admin/test-login)",
        `${API}/api/auth/admin/test-login`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": key },
          // A mailbox nobody owns: the door answers about the KEY before it
          // answers about the person, so this never signs anybody in.
          body: JSON.stringify({ email: "credentials-agree@kwapso.invalid" }),
        },
        "Rotate: put a new value in the Keychain under `test-login-key-kwapso`, then " +
          "`wrangler secret put TEST_LOGIN_KEY --env staging` from workers/auth with the same value."
      )
    )
  }
}

// 2 · THE ADMIN KEY, asked through a READ door. `db-sizes` is a GET that changes
// nothing — deliberately not `migrate-teams`, which is the door this key exists
// for: a credential check must never be able to start the work it is checking
// the credential for.
const admin = adminKey()
if (!admin) {
  console.log("  NO  admin key: not in the Keychain at all (kwapso-admin-key).")
  results.push("drift")
} else {
  results.push(
    await ask(
      "admin key (tenancy: GET /api/tenancy/admin/db-sizes)",
      `${API}/api/tenancy/admin/db-sizes`,
      { headers: { "x-admin-key": admin } },
      "Rotate: put a new value in the Keychain under `kwapso-admin-key`, then " +
        `\`wrangler secret put ADMIN_KEY${PRODUCTION ? "" : " --env staging"}\` from workers/tenancy with the same value.`
    )
  )
}

const drifted = results.filter((r) => r === "drift").length
const unknown = results.filter((r) => r === "unknown").length
console.log()
if (drifted) {
  console.log(`FAIL ${drifted} credential${drifted === 1 ? "" : "s"} no longer open${drifted === 1 ? "s" : ""} its door.`)
  process.exit(1)
}
console.log(unknown ? `PASS with ${unknown} unanswered — nothing drifted, but not everything was proved.` : "PASS every credential opens its door.")
