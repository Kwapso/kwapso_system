// EVERY STATE A TOKEN CAN BE IN HAS SOMETHING ON THE SCREEN.
//
// An access token has three lives — working, past its deadline, revoked — and
// only the first one is ever reached in ordinary use. The other two are states
// the CODE enters on its own: a token expires by the calendar, with nobody
// pressing anything, and `expiresAt` in the past is the same as no token at all.
// So the two states a person meets on their worst day (why has my script
// stopped?) are exactly the two nothing proved were drawn.
//
// The screen already draws them (access-tokens.tsx). Nothing said so: a suite
// full of source censuses can tell you a door is called and never that a badge
// renders, and a `hasExpired` that flipped its comparison, or a branch that
// ordered revoked AFTER expired, would keep every other check in this workspace
// green while telling somebody their revoked token was merely expired.
//
// Rendered, not grepped. The assertion is the words on the screen.

import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { McpTokenSummary } from "@shared/types"

const YEAR = 365 * 24 * 60 * 60 * 1000
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()

const TOKENS: McpTokenSummary[] = [
  {
    id: "t-live",
    label: "Automation runner",
    teamId: "team1",
    createdAt: iso(-YEAR / 12),
    expiresAt: iso(YEAR),
    lastUsedAt: iso(-1000),
    revokedAt: null,
  },
  {
    // Nobody did anything to this one. The calendar did.
    id: "t-expired",
    label: "Old laptop",
    teamId: "team1",
    createdAt: iso(-2 * YEAR),
    expiresAt: iso(-YEAR),
    lastUsedAt: null,
    revokedAt: null,
  },
  {
    // Revoked AND long past its deadline: two true things, and the screen must
    // say the one that was a decision. Somebody who revoked a leaked token needs
    // to see that it was revoked, not that it timed out on its own.
    id: "t-revoked",
    label: "Leaked in a gist",
    teamId: "team1",
    createdAt: iso(-2 * YEAR),
    expiresAt: iso(-YEAR),
    lastUsedAt: iso(-YEAR),
    revokedAt: iso(-YEAR - 1000),
  },
]

vi.mock("@/lib/api", () => ({
  ApiFailure: class ApiFailure extends Error {},
  mcp: {
    tokens: async () => ({ tokens: TOKENS }),
    createToken: async () => ({ token: null, tokens: TOKENS }),
    revokeToken: async () => ({ tokens: TOKENS }),
  },
}))

describe("an access token's three states each reach the screen", () => {
  it("draws Active, Expired and Revoked, one per token", async () => {
    const { AccessTokensSection } = await import("@/components/team/access-tokens")
    render(<AccessTokensSection teamName="Kwapso" />)

    // The list arrives from the door through the cache, so wait for the rows.
    await waitFor(() => expect(screen.getByText("Automation runner")).toBeTruthy())
    for (const label of ["Old laptop", "Leaked in a gist"])
      expect(screen.getByText(label), `${label} must be on the screen at all`).toBeTruthy()

    // One badge each, and exactly one — a second "Expired" would mean the
    // revoked token is being described by the wrong state.
    expect(screen.getAllByText("Active")).toHaveLength(1)
    expect(screen.getAllByText("Expired")).toHaveLength(1)
    expect(screen.getAllByText("Revoked")).toHaveLength(1)

    // …AND EACH ONE SAYS WHEN. A state with no date is a state a person cannot
    // act on: "Expired" alone does not tell you whether it went yesterday or a
    // year ago. One render, one set of assertions — the cache behind this screen
    // is a module singleton, so a second mount of the same list in the same file
    // puts two copies of every row in the document.
    const said = document.body.textContent ?? ""
    // A live token says how long it has; an expired one says when it ran out.
    // Both are needed: "Expired" with no date is a state with no way to act on it.
    expect(said, "a live token must say how long it has left").toMatch(/works until/)
    expect(said, "an expired token must say when it ran out").toMatch(/expired /)
    // A revoked token says neither — the deadline stopped mattering the moment
    // somebody took it away.
    expect(said, "a token nobody has used must say so rather than showing nothing").toMatch(
      /never used/
    )
  })
})
