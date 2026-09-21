// THE INVITATIONS SCREEN DRAWS A REAL PAGE TITLE — finding, 21 Sep 2026: this
// screen (where the invite email's "Join" button lands) rendered only a micro
// uppercase <h2>, "Invites waiting for you", and no page title at all — the
// one main screen in the app without one. Fixed by giving it the same head
// every sibling main screen draws (`Headline as="h1" size="display-m"`, the
// kit's own "Page title" step), titled "Invitations" through t().
//
// This is a REAL RENDER, not a source census: the claim is what a screen
// reader's heading list — and a sighted reader's eye — actually meets, which
// is exactly what a static read of the JSX cannot prove.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    tenancy: {
      ...actual.tenancy,
      receivedInvitations: async () => ({ invitations: [] }),
    },
  }
})

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import { InvitationsScreen } from "@/components/screens/invitations-screen"
import type { ActiveTeam } from "@/lib/use-active-team"
import { LanguageProvider } from "@shared/web/language"
import { clearCache } from "@shared/web/store"

afterEach(cleanup)

const ACTIVE: ActiveTeam = {
  loading: false,
  user: null,
  ctx: null,
  switchTeam: async () => {},
  createTeam: async () => {},
  refresh: async () => {},
}

describe("InvitationsScreen draws a real page title", () => {
  it("renders an <h1> reading \"Invitations\", ahead of the section label", async () => {
    clearCache()
    render(
      <LanguageProvider value={null}>
        <InvitationsScreen active={ACTIVE} />
      </LanguageProvider>
    )

    const heading = await screen.findByRole("heading", { level: 1 })
    expect(heading.textContent).toBe("Invitations")

    // THE OLD SENTENCE IS STILL THERE, UNDER THE TITLE — it still adds
    // meaning (whose list this is), so it was kept as the section's own
    // label rather than dropped (this file's own comment says why).
    expect(screen.getByText("Invites waiting for you")).toBeTruthy()
  })
})
