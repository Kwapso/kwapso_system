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
//   3. None of the things she LEFT struck (the town breakdown, portal reach,
//      a missing-field readout) is CODE anywhere in the screen's own
//      component or its door — comments explaining what was struck and why do
//      not count as the section being built, so every check here strips
//      comments before it looks.
//
// ── THE FOURTH STRIKE IS SUPERSEDED, NOT SATISFIED (23 SEP 2026, SAME DAY) ──
//
// "how lon its been" was struck in the morning and asked for in the afternoon,
// by her own word over the built screen: "on accounts oevrview, fix how the
// kpis cards look, and add the median tenure", and, of the picture beside it,
// "make the how long weve had this account a line graphic, and when hover show
// who (like tickets tendency)". This file used to fail the build on the word
// `tenure` and on `julianday(` anywhere in either file — the right check for
// the morning's ruling and the wrong one from the afternoon on.
//
// THE TWO ASSERTIONS ARE RETIRED RATHER THAN INVERTED HERE. "The door computes
// a median tenure" is a statement about a NUMBER, and a word search cannot
// tell a true median from an average that spells itself the same way; it is
// proved where the arithmetic is, against a real database, in
// `workers/tenancy/test/accounts-dashboard.test.ts` (odd, even, one, none).
// What this file gains instead is the two things a word search CAN hold and a
// render cannot: that the tab reaches the KIT's own donut rather than drawing
// a second one, and that its hand-drawn legend's colour sequence is still the
// kit donut's own — read off BOTH files, so a key that drifts from its ring
// turns the build red. The marks themselves are proved by mounting the
// component, in `web/test/accounts-dashboard-marks.test.tsx`.

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

  it("draws none of the sections she left struck", () => {
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

    // HOW LONG THEY'VE BEEN A CLIENT was the fourth strike and she reversed
    // it the same day — see this file's own header. The two assertions that
    // used to stand here (no `julianday(`, no `tenure`) are retired, and the
    // median is proved where the arithmetic is rather than by a word search:
    // `workers/tenancy/test/accounts-dashboard.test.ts`.

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

  // ── HER SECOND PASS: THE RING COMES FROM THE KIT ──────────────────────────

  it("reaches the kit's own Donut rather than drawing a second one", () => {
    // "make the where as a donut graphic". The kit ships one
    // (`shared/ui/components/donut/donut.tsx`, in its own manifest), and R39
    // is the standing rule that the kit supplies the UI: a ring hand-rolled
    // here would be the app growing a second drawing of a shape the design
    // system already owns.
    const code = stripComments(readFileSync(DASHBOARD, "utf8"))
    expect(code, "the accounts dashboard does not import the kit's `Donut`").toMatch(
      /from\s+"@shared\/ui\/components\/donut\/donut"/
    )
    expect(code, "the accounts dashboard imports the kit's `Donut` but never draws it").toMatch(/<Donut\b/)
  })

  it("keys its legend to the kit donut's own colour sequence", () => {
    // THE LEGEND IS THIS FILE'S OWN, and that is a REPORTED KIT GAP rather
    // than a preference: `donut.tsx`'s own state table says "hover — none
    // drawn", it exposes no per-segment callback and the ring is rendered
    // inside the component, so her "(when hover show)" cannot be answered
    // through the kit's legend today. The cost of drawing the rows here is
    // that two files now decide one colour order, so this reads BOTH off disk
    // — a key that drifts from the ring it explains is worse than no key.
    const screen = readFileSync(DASHBOARD, "utf8")
    const kit = readFileSync(join(REPO, "shared/ui/components/donut/donut.tsx"), "utf8")
    const sequence = (src: string, marker: string) => {
      const at = src.indexOf(marker)
      expect(at, `could not find \`${marker}\``).toBeGreaterThan(-1)
      const close = src.indexOf("]", at)
      return [...src.slice(at, close).matchAll(/var\(--chart-\d\)/g)].map((m) => m[0])
    }
    const mine = sequence(screen, "const DONUT_SEGMENT_COLOURS = [")
    const theirs = sequence(kit, "const SEGMENT_COLOURS = [")
    expect(mine.length, "the accounts dashboard's legend names no chart colours").toBeGreaterThan(0)
    expect(
      mine,
      "the accounts dashboard's legend dots no longer follow the kit donut's own segment sequence — " +
        "the key and the ring would show different colours for the same country"
    ).toEqual(theirs)
  })
})
