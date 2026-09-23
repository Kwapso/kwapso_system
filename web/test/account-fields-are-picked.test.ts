// AN ACCOUNT'S COUNTRY AND INDUSTRY ARE PICKED FROM THE TEAM'S OWN LIST, AND
// THE LIST IS EDITABLE IN SETTINGS.
//
// Aurora, 23 Sep 2026, of the industry, verbatim: "make it a drop down,
// adjustable on settings." The country had already been ruled the same way and
// for the same stated reason, in the account form's own header: "a country
// typed free is a country spelled five ways."
//
// WHY THIS IS A SUITE AND NOT A COMMENT. The sentence has FOUR parts, each
// invisible without the others, and the app has at various times had three of
// them without the fourth:
//
//   1. the FORM offers a picker over the group — true for both since they were
//      built, which is exactly why nobody noticed the rest was missing;
//   2. the GROUP is editable where a person would look for it — Settings >
//      Accounts > "Industries and countries", derived from `MODULE_SETTINGS`;
//   3. the group's WORDS are stored on records and a rename rewrites them —
//      `VOCABULARY_HOMES`, which is what makes merging two spellings safe;
//   4. the WRITE DOOR refuses a word that is not on the list — MISSING until
//      23 Sep 2026, on both fields, which is how the live book came to hold
//      "Insurance" beside "Insurance Broker" and "Osterreich" beside
//      "Austria".
//
// The door's own behaviour is proved by CALLING it, against a real database,
// in `workers/tenancy/test/accounts-picked-vocabulary.test.ts` — a source scan
// cannot tell a closed door from an open one. What this file holds is the
// WIRING those four parts share: that one constant names each group, that
// every one of the four reads that constant rather than a typed literal, and
// that none of the four can be removed quietly.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"
import { SELECTABLE_GROUPS } from "@shared/selectable-groups"
import { VOCABULARY_HOMES } from "@shared/selectable-homes"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const REPO = join(WEB, "..")

const FORM = join(WEB, "components/accounts/account-form-dialog.tsx")
const SETTINGS = join(WEB, "components/screens/module-settings-screen.tsx")
const DOOR = join(REPO, "workers/tenancy/src/lib/accounts.ts")
const MIGRATIONS = join(REPO, "workers/tenancy/src/team-schema/migrations.ts")

/** The two fields this law is about, named through the ONE place a group's
 * string may be said. Spelling either one as a literal here would reproduce
 * the very fault the suite exists to prevent. */
const PICKED = [
  { field: "industry", group: SELECTABLE_GROUPS.industry, column: "industry" },
  { field: "country", group: SELECTABLE_GROUPS.country, column: "country" },
] as const

describe("an account's country and industry are picked, not typed", () => {
  it("names each group once, in shared/selectable-groups.ts", () => {
    // The group a screen OFFERS from and the group a door WRITES into have to
    // be the same string. Two typed literals is exactly how they stop being
    // one, which is the whole argument that file's own header makes.
    expect(SELECTABLE_GROUPS.industry).toBe("Industry")
    expect(SELECTABLE_GROUPS.country).toBe("Country")
  })

  it("has the form pick from the group, through the constant", () => {
    const code = stripComments(readFileSync(FORM, "utf8"))
    expect(
      code,
      "the account form does not read the group names from `SELECTABLE_GROUPS`"
    ).toMatch(/SELECTABLE_GROUPS\.industry/)
    expect(code).toMatch(/SELECTABLE_GROUPS\.country/)
    // A LITERAL IS THE FAULT, not a style preference: it is the second place
    // the string is decided.
    expect(
      code,
      'the account form still types a group name as a literal ("Industry"/"Country")'
    ).not.toMatch(/group\(\s*"(Industry|Country)"\s*\)/)
  })

  it("keeps each group editable where a person would look for it", () => {
    // "adjustable on settings" — her own words. The section is real and it is
    // on the ACCOUNTS page, which is where somebody standing on an account
    // would go; R61 makes the gear and the page one decision, so proving the
    // table is enough to prove both doors.
    const code = stripComments(readFileSync(SETTINGS, "utf8"))
    const at = code.indexOf('segment: "accounts"')
    expect(at, "there is no accounts page in MODULE_SETTINGS").toBeGreaterThan(-1)
    const page = code.slice(at, code.indexOf("segment:", at + 1))
    for (const { group } of PICKED)
      expect(
        page,
        `the "${group}" group is not editable under Settings > Accounts, so "adjustable on settings" is not true of it`
      ).toContain(`"${group}"`)
  })

  it("stores each group's word on the account row, so a rename can rewrite it", () => {
    // THIS IS WHAT MAKES A MERGE SAFE, and it is the reason this lane refuses
    // to merge "Insurance" into "Insurance Broker" itself: renaming one on the
    // Choices screen rewrites every account holding it, through
    // `storedWordColumns`. A group with no home would rename the dropdown row
    // and leave the records behind.
    for (const { group, column } of PICKED) {
      const home = VOCABULARY_HOMES[group]
      expect(home, `the "${group}" group declares no home at all`).toBeDefined()
      expect(home, `the "${group}" group is declared as backing nothing`).not.toBe("unused")
      expect(home, `the "${group}" group is declared as a labels-only group`).not.toBe("labels")
      const columns = typeof home === "object" ? home.columns : []
      expect(
        columns.some((c) => c.table === "accounts" && c.column === column),
        `the "${group}" group does not name accounts.${column} as its home`
      ).toBe(true)
    }
  })

  it("refuses an unlisted word at the door, on the way in AND on an edit", () => {
    // The BEHAVIOUR is proved by calling the door
    // (`workers/tenancy/test/accounts-picked-vocabulary.test.ts`). What is
    // pinned here is that both write paths are wired at all — a check that
    // only ever exercised `createAccount` would pass while every EDIT stayed
    // free text, which is the larger surface of the two.
    const src = readFileSync(DOOR, "utf8")
    const code = stripComments(src)
    expect(
      code,
      "the accounts door does not reach the shared refusal (`requireActiveSelectableValue`)"
    ).toMatch(/requireActiveSelectableValue/)
    for (const fn of ["createAccount", "updateAccount"]) {
      const at = code.indexOf(`export async function ${fn}(`)
      expect(at, `${fn} is not in workers/tenancy/src/lib/accounts.ts`).toBeGreaterThan(-1)
      const next = code.indexOf("\nexport ", at + 1)
      const body = code.slice(at, next === -1 ? undefined : next)
      expect(
        body,
        `${fn} writes an account's country/industry without checking them against the team's own list`
      ).toMatch(/requirePickedAccountValues\(/)
    }
    // AND THE TWO FIELDS ARE THE ONES NAMED, through the constants rather than
    // as literals — the same fault one layer down.
    expect(code).toMatch(/SELECTABLE_GROUPS\.industry/)
    expect(code).toMatch(/SELECTABLE_GROUPS\.country/)
  })

  it("seeds each group from what is already stored, so the door strands nothing", () => {
    // THE ORDER IS THE WHOLE POINT. Closing the door without this seed makes
    // every account whose stored word is not yet an option uneditable, because
    // an edit re-sends it. Measured against the 22 Sep 2026 account backup:
    // ten of the eleven live industries and two of the six live countries
    // ("Serbia", "Osterreich") were outside the team seed, so this is not a
    // theoretical clause.
    const code = readFileSync(MIGRATIONS, "utf8")
    const at = code.indexOf('version: "0120_')
    expect(at, "team migration 0120 is not in the ledger").toBeGreaterThan(-1)
    const sql = code.slice(at, code.indexOf("\n  },", at))
    for (const { column } of PICKED)
      expect(
        sql,
        `team migration 0120 does not seed the group from accounts.${column}`
      ).toMatch(new RegExp(`DISTINCT TRIM\\(${column}\\)`))
    // AND IT MERGES NOTHING. Every distinct stored spelling becomes its own
    // row: "Insurance" and "Insurance Broker" may be two real trades, and a
    // migration runs once, per team, with nobody watching.
    expect(
      sql,
      "team migration 0120 rewrites or collapses stored words — merging two spellings is Aurora's call, on the Choices screen"
    ).not.toMatch(/UPDATE accounts/)
  })
})
