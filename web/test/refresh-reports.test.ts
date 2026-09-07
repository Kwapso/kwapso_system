// THE ONE CONSOLE-ONLY FAILURE A PERSON WOULD WANT TO KNOW ABOUT.
//
// The active-team refresh (member counts, role, team list — re-read on every
// live ping) failed into `console.error` and nowhere else, under
// ERROR-HANDLING.md's best-effort clause. Reviewed on 6 Sep 2026 as the one
// silent path on the agency front door that was NOT correctly silent: a refresh
// that keeps failing is a person whose screen is quietly stale, with no row to
// say so. The catch now reports through the one client seam, which already
// keeps a dropped connection out of the store.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const WEB = join(__dirname, "..")

describe("the active-team refresh reports its failure", () => {
  it("through reportError, and no longer through console.error alone", () => {
    const src = readFileSync(join(WEB, "lib", "use-active-team.ts"), "utf8")
    const at = src.indexOf("const refresh = ")
    expect(at, "the refresh callback must exist").toBeGreaterThan(-1)
    const body = src.slice(at, src.indexOf("}, [sendToOnboardingIfTeamless])", at))
    expect(body).toMatch(/reportError\("active-team refresh", e\)/)
    expect(body, "the console-only line must be gone").not.toMatch(/console\.error\("active-team refresh/)
    expect(src).toMatch(/import \{ reportError \} from "@shared\/web\/log"/)
  })
})
