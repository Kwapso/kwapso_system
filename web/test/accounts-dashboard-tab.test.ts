// THE ACCOUNTS DASHBOARD TAB — her ruling, 23 Sep 2026, verbatim: "ok,
// implement dashbaprd for clients, make it te 1st tab (dhasbaprd always first
// card). do not sdd the sections what you do not know yet, nor the cities,
// nor how lon its been, nor can reach the portal."
//
// THREE THINGS THAT RULING SAYS, AND THREE CHECKS BELOW, EACH KEYED BY
// EXPRESSION RATHER THAN BY LINE — a file:line key rots on every edit above
// it (this repo's own standing rule); these look for the TEXT that has to be
// there, wherever it ends up sitting.
//
//   1. Dashboard leads the Accounts strip, and — the same rule Tickets' own
//      Dashboard tab stands on (`web/test/default-tab-is-first.test.ts`) — a
//      page with nothing remembered opens on it.
//   2. The tab's own door counts ACTIVE COMPANIES ONLY: never inactive,
//      never archived, never a person linked under one.
//   3. None of the four things she struck (the town breakdown, "how long",
//      portal reach, a missing-field readout) is CODE anywhere in the
//      screen's own component or its door — comments explaining what was
//      struck and why do not count as the section being built, so every
//      check here strips comments before it looks.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const REPO = join(WEB, "..")

const SCREEN = join(WEB, "components/accounts/accounts-screen.tsx")
const DASHBOARD = join(WEB, "components/accounts/accounts-dashboard.tsx")
const DOOR = join(REPO, "workers/tenancy/src/lib/accounts.ts")

// COMMENTS EXPLAIN INTENT; THEY ARE NOT THE SECTION BEING DRAWN. Every
// struck-section check below runs against CODE ONLY, so a header paragraph
// that names "the town breakdown" or "portal reach" while explaining why
// neither is here can never be mistaken for the thing existing.
// `stripComments` — THE ONE TOKENISER, not a hand-rolled pair of regexes:
// `shared/rules/strip-comments.mjs`'s own header is the whole argument, and
// `web/test/source-scan.test.ts` enforces there is only ever one.

describe("the Accounts screen's Dashboard tab", () => {
  it("is the first entry on the strip, and the strip's own default", () => {
    const src = readFileSync(SCREEN, "utf8")

    // The first `{ value: "…", label: …` inside the strip's own array.
    const arrayAt = src.indexOf("const accountTabs = [")
    expect(arrayAt, "could not find the accounts strip's `accountTabs = [` array").toBeGreaterThan(-1)
    const firstTab = src.slice(arrayAt).match(/value:\s*"([a-z]+)"/)
    expect(firstTab, "the tabs array's first entry does not name a plain string value").not.toBeNull()
    expect(
      firstTab?.[1],
      "the Accounts strip's first tab is not \"dashboard\" — her ruling was " +
        '"dhasbaprd always first card"'
    ).toBe("dashboard")

    // A PAGE WITH NOTHING REMEMBERED OPENS THE TAB ON THE LEFT — the same
    // rule `default-tab-is-first.test.ts` proves for Tickets. Accounts has
    // no `useRemembered` of its own; its default is the LAST branch of the
    // `accountTab` ternary chain, which fires when `tab` matches none of the
    // named values (including when it is absent — the "nothing remembered"
    // case itself).
    const derivedAt = src.indexOf("const accountTab =")
    expect(derivedAt, "could not find the `accountTab` derivation").toBeGreaterThan(-1)
    const derivation = src.slice(derivedAt, derivedAt + 600)
    const fallback = derivation.match(/:\s*"([a-z]+)"\s*$/m)
    expect(fallback, "the `accountTab` ternary's final fallback is not a plain string literal").not.toBeNull()
    expect(
      fallback?.[1],
      `the strip opens on "dashboard" but a page with nothing remembered defaults to "${fallback?.[1]}"`
    ).toBe("dashboard")
  })

  it("counts active companies only, at the door", () => {
    const src = readFileSync(DOOR, "utf8")
    const fnAt = src.indexOf("export async function readAccountsDashboard(")
    expect(fnAt, "could not find `readAccountsDashboard` in workers/tenancy/src/lib/accounts.ts").toBeGreaterThan(
      -1
    )
    // Up to the next top-level export, or the end of the file.
    const nextExportAt = src.indexOf("\nexport ", fnAt + 1)
    const body = src.slice(fnAt, nextExportAt === -1 ? undefined : nextExportAt)

    // NEVER INACTIVE, NEVER ARCHIVED, NEVER A PERSON — her own emphasis
    // ("active only, everywhere on this tab") plus the "companies" scope her
    // real-data example names (fourteen active COMPANIES).
    expect(body, "the dashboard's fence does not exclude inactive accounts").toMatch(
      /deactivated_at IS NULL/
    )
    expect(body, "the dashboard's fence does not exclude archived accounts").toMatch(/archived_at IS NULL/)
    expect(body, "the dashboard's fence does not narrow to companies").toMatch(/account_type = 'entity'/)
  })

  it("draws none of the four sections she struck", () => {
    const screenCode = stripComments(readFileSync(DASHBOARD, "utf8"))
    const doorSrc = readFileSync(DOOR, "utf8")
    const typeAt = doorSrc.indexOf("export type AccountsDashboard = {")
    expect(typeAt, "could not find the `AccountsDashboard` type in workers/tenancy/src/lib/accounts.ts").toBeGreaterThan(
      -1
    )
    // From the type through to the end of `readAccountsDashboard` itself —
    // the next top-level export after the function starts.
    const fnStartAt = doorSrc.indexOf("export async function readAccountsDashboard(", typeAt)
    const nextExportAt = doorSrc.indexOf("\nexport ", fnStartAt + 1)
    const doorCode = stripComments(
      doorSrc.slice(typeAt, nextExportAt === -1 ? undefined : nextExportAt)
    )
    const code = `${screenCode}\n${doorCode}`

    // THE TOWN BREAKDOWN — she struck "the cities". The door reads `country`
    // and never `city`; the screen draws no per-city grouping either.
    expect(code, "the accounts dashboard reads or draws a `city` breakdown, which she struck").not.toMatch(
      /\bcity\b/i
    )

    // HOW LONG THEY'VE BEEN A CLIENT — she struck "how lon its been", i.e. a
    // tenure figure computed off `created_at` against today. The door has no
    // date arithmetic at all (`julianday`, the seam every duration figure in
    // this codebase goes through) and no field or word naming tenure.
    expect(code, "the accounts dashboard computes a duration, which she struck").not.toMatch(/julianday\(/i)
    expect(code, "the accounts dashboard names a tenure figure, which she struck").not.toMatch(/tenure/i)

    // PORTAL REACH — she struck "can reach the portal". Nothing here reads
    // `portal_users` or draws a portal-access column.
    expect(code, "the accounts dashboard reads or draws portal access, which she struck").not.toMatch(
      /portal_users|portalUsers|portal.?access/i
    )

    // A MISSING/EMPTY-FIELD READOUT — she struck "the sections what you do
    // not know yet". No sentence or field counts what an account left blank.
    expect(
      code,
      "the accounts dashboard reads or draws a missing/empty-field readout, which she struck"
    ).not.toMatch(/\bmissing\b|empty.?field/i)
  })
})
