// THE CLIENT'S RULING, 17 Sep 2026, verbatim: "I go to the nav bar, on my
// name, and to my profile. This page should not exist. It should lead me to
// the same page that I arrive at when I go to Settings, Members, and I click
// on one member." (UI-RULEBOOK.md L26.)
//
// So the standalone `/profile` route and `ProfileScreen` are gone, and the
// nav bar's own name opens the signed-in person's own member record — the
// SAME address a card on Settings › Members opens for anybody else
// (`/t/<teamId>/members/<userId>`, by id, R38) — never a second, bespoke "my
// profile" body kept alive beside it. This suite locks both halves: the
// retirement (the page and every reference to its module are actually gone)
// and the redirect (the rail link actually resolves to the member address,
// by the SIGNED-IN person's own id).

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { ACCOUNT_MODULES, TOP_LEVEL_MODULES } from "@/components/deep-link/route"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const read = (p: string) => readFileSync(join(WEB, p), "utf8")

describe("the profile page is retired, not just unlinked", () => {
  it("the standalone /profile route no longer exists on disk", () => {
    expect(existsSync(join(WEB, "app/profile/page.tsx"))).toBe(false)
  })

  it("ProfileScreen no longer exists on disk", () => {
    expect(existsSync(join(WEB, "components/screens/profile-screen.tsx"))).toBe(false)
  })

  it("\"profile\" is not a module the shell resolves any more", () => {
    expect(ACCOUNT_MODULES).not.toContain("profile")
    expect(TOP_LEVEL_MODULES).not.toContain("profile")
  })

  it("the deep-link shell no longer imports or renders ProfileScreen", () => {
    const src = read("components/deep-link/deep-link-screen.tsx")
    expect(src).not.toContain("ProfileScreen")
    expect(src).not.toContain('module === "profile"')
  })
})

describe("the nav bar's own name opens the signed-in member's own record (L26)", () => {
  // R38 — a screen showing ONE record reads it BY ID, never by finding it in
  // a loaded page. The rail link must carry the SIGNED-IN person's own id
  // (`user.id`, the session ProfileMenu already holds) into the SAME address
  // `members-gallery.tsx` builds for every other member's card
  // (`/t/<teamId>/members/<userId>`) — never a fixed or guessed path.
  it("\"Your profile\" navigates to /t/<teamId>/members/<the signed-in user's own id>", () => {
    const src = read("components/shell/profile-menu.tsx")
    const item = src.indexOf('{t("Your profile")}')
    expect(item, 'profile-menu.tsx must still offer "Your profile"').toBeGreaterThan(-1)
    // Read backwards from the label to the onSelect that opens it — the
    // DropdownMenuItem wrapping this label.
    const windowStart = Math.max(0, item - 400)
    const around = src.slice(windowStart, item)
    expect(
      around,
      "the item must resolve the current team id from the session, not a hand-typed one"
    ).toMatch(/active\.ctx\?\.team\?\.id/)
    expect(
      around,
      "the item must resolve the SIGNED-IN person's own id, not another member's"
    ).toMatch(/user\.id/)
    expect(
      around,
      "the item must build the same /t/<teamId>/members/<id> address every member card opens"
    ).toMatch(/\/t\/\$\{[^}]*\}\/members\/\$\{[^}]*user\.id\}/)
    // And it must go soft (R37) like every other rail destination, never a
    // hard <a href> or a router.push.
    expect(around).toMatch(/softNavigate\(/)
  })

  it("never falls back to the retired /profile address", () => {
    const src = read("components/shell/profile-menu.tsx")
    expect(src).not.toMatch(/softNavigate\(["'`]\/profile["'`]\)/)
  })
})

describe("what the retired page carried is rehomed, not dropped (member-screen.tsx)", () => {
  const src = () => read("components/team/member-screen.tsx")

  it("owns the account edit doors the profile page used to, self-only", () => {
    const s = src()
    expect(s, "must reuse the exact ProfileDialog the profile page used").toContain(
      'import { ProfileDialog } from "@/components/team/profile-dialog"'
    )
    expect(s, "must reuse the exact EmailChangeDialog the profile page used").toContain(
      'import { EmailChangeDialog } from "@/components/team/email-change-dialog"'
    )
    // Both doors are gated on member.isYou — nobody edits another member's
    // own name/photo or signs in as them to change their email.
    expect(s).toMatch(/member\.isYou[\s\S]{0,80}<ProfileDialog/)
    expect(s).toMatch(/member\.isYou[\s\S]{0,80}<EmailChangeDialog/)
  })

  it("carries the retired page's own account-activity trail, self-only", () => {
    // Kept in its own component (account-activity-panel.tsx) rather than
    // inlined — R2's own census flags a record detail that hand-rolls its
    // own <ActivityFeed> as a duplicate of the generic (table, id) pairing,
    // and this is a genuinely different door (see that file's own header) —
    // so member-screen.tsx only has to mount it, self-only.
    const s = src()
    expect(s, "must mount the retired page's activity section").toContain("<AccountActivityPanel")
    expect(s).toMatch(/member\.isYou[\s\S]{0,40}<AccountActivityPanel/)
    const panel = read("components/team/account-activity-panel.tsx")
    // The SAME cache key the old page read, so a warm cache still answers.
    expect(panel).toContain('"account-activity"')
  })
})
