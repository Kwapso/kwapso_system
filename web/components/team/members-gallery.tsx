"use client"

// THE MEMBERS GALLERY — the team's people as a wall of cards, on the Team tab.
//
// ── THE CLIENT'S OWN WORDS, 2026-09-09 ──────────────────────────────────────
//
//   "as for the team members, this takes too much space. Let's use a different
//    design. Let's use gallery — i wanna see avatar (in round) role (chip) and
//    email"
//   "show name and surname for the members"
//   "the memebrs should have th + to invite someone"
//   "the invites, make it secondary button on the toolbar"
//   "filters for members: role"
//
// So: a round mark, the full name, the role as a chip, the email. Four facts and
// no fifth — the row this replaces spent a full-width line on "<role> · joined
// <date>", which is the space she is talking about.
//
// ── "GALLERY" IS HER WORD FOR THE SHAPE, NOT THE KIT'S COMPONENT ─────────────
//
// The kit ships a `Gallery` (components/gallery) and it is the wrong part. Its
// own brief rules it out by name: "Offered only where images exist… It is never
// offered for tickets, accounts or sprints — an image-led view of text records is
// a grid of empty boxes pretending to be content", and every tile is a 16:9
// contained image with a two-line caption. A member has no picture in this
// database (see the mark below), so a wall of 16:9 letterboxes is exactly the
// grid of empty boxes that component refuses to be.
//
// What she drew, and approved, is the kit's `CardGrid` — "a wall of record
// cards", auto-filled columns so the tile size stays constant and the COLUMN
// COUNT changes with the window. The cell is `Card variant="raised"`, off-beige,
// because the wall stands on a `--surface-panel` band.
//
// ── THAT LAST SENTENCE WAS FALSE UNTIL 2026-09-09, AND THE CLIENT SAW IT ────
//
//   "more members in each row, too much blank space. needs container!! nothing
//    on top of white background, its a rule!"
//
// This paragraph used to read "this wall sits inside `CollectionCard`, which is
// a `--surface-panel` box". It did not. There was no `CollectionCard` anywhere
// on this tab: the section was a bare `<section>` on `<body
// className="bg-background">`, so every `raised` cell was `#FFFEF9` on `#FFFEF9`
// — contrast 1.000 in light, the shadow doing all the work. The comment
// described the correct design and the code shipped the bad row out of
// RULES.md §2.6's own table. `TeamPanel` (web/components/team/team-panel.tsx)
// is the band the sentence always claimed, with the measured numbers in both
// palettes; the roles section takes the same one so the two agree.
//
// ── AND THE DENSITY, WHICH IS THE OTHER HALF OF THE SAME COMPLAINT ──────────
//
// The wall was on `CardGrid`'s FIXED ladder at its default `columns={3}` — one
// column, two at `sm:`, three at `lg:` and three at 2560 as well. Three cards
// across a 1128-wide panel is 368 a card for a 48px round mark, a name, a role
// chip and an email, which is her "too much blank space" measured.
//
// It is `fluid` now — `repeat(auto-fit, minmax(MIN_CARD, 1fr))`, the kit's own
// chapter-18 shape — so the COLUMN COUNT follows the window and the cell keeps
// its honest width. `MIN_CARD` below is that width, and it is derived from the
// widest thing a card carries rather than picked.
//
// ── THE MARK IS INITIALS, THROUGH THE APP'S EXISTING SEAM ───────────────────
//
// There is no photograph in this data — the invite door takes an email and a
// role, and nothing anywhere asks a member for a picture — so the mark is the
// person's initials. That is not a placeholder: R35 ("a record never appears
// without its face") names the initial as the third and final rung for a record
// with neither picture nor glyph, and `RecordMark` (shared/web/record-mark.tsx)
// is the one component that draws all three. `shape="round"` WAS her "avatar
// (in round)", 2026-09-09, and the seam's own rule for a person in their own
// right — SUPERSEDED 18 Sep 2026: "for stakeholders, i want square tiels (lik
// in members, with text under the image)." That 18 Sep ruling asked for a
// square band instead, and `PersonCard` carried `shape="square"` for it.
//
// AND THE 18 SEP RULING IS ITSELF SUPERSEDED NOW, 20 Sep 2026 — Aurora,
// verbatim: "Avatars are always a round image ('Raised by' must be a round
// image too)." `PersonCard` (shared/web/person-card.tsx) draws `shape="round"`
// again on the one `RecordMark` call both this wall and the stakeholders
// panel share, so the fix is there, once, and this wall changes with it. It
// is already handed `picture={m.imageUrl}`, so the day a member gets a
// photograph the same slot carries the face with no change here.
//
// ── THE TOOLBAR ─────────────────────────────────────────────────────────────
//
// `<ToolbarRow>` (web/components/deep-link/screen-bits.tsx) draws its five slots
// in one fixed order — search → filters → sort → view → actions — and the order
// is the row's, not this call site's (R53). What this screen hands over:
//
//   search   the box, always (R48 — the search box is a default, never a
//            per-screen choice)
//   filters  ONE facet, Role, which is the only one she asked for
//   sort     nothing, and this screen is named in TOOLBAR_SORT_EXEMPT with the
//            reason: a gallery of a team's people has no order to offer that
//            a reader would ask for
//   actions  Invites (secondary, carrying its count) then the `+` (AddButton)
//   empty    the collection's own raw row count being zero (R50)
//
// ── THE `+` WAS THE ONE MANGO ON THIS TAB; NOW IT IS BLACK ──────────────────
//
// Until R84 (16 Sep 2026, "only mango buttons on the title level… the others
// black") the kit's own §2.5 ("one mango per view", shared/ui/docs/RULES.md)
// governed this tab: it has two things somebody creates — a member and a
// role — and the mango went to the member, because inviting a person is what
// a Team tab is FOR; "New role" beside the roles matrix stayed a quiet
// button. R84 retires the colour half of that ruling app-wide — `AddButton`
// (screen-bits.tsx) is `variant="inverse"` everywhere now, this toolbar
// included, because a toolbar is never the title component — but not the
// RANK: the member still owns the one create action this tab offers through
// its own `+`, "New role" is still the quiet one beside it, and the argument
// for that split is written up in web/components/team/roles-matrix.tsx.
//
// ── A CARD IS A DOOR, AND IT OPENS A FULL SCREEN ───────────────────────────
//
//   "when clickingon card in team, open full screen the profile (we wil ad more
//    to this)" (client, 2026-09-10)
//
// THIS SUPERSEDES THE SLIDE-IN THAT SHIPPED THE DAY BEFORE. A card press used to
// open `member-panel.tsx`, a `Sheet` carrying the person's four facts and their
// two acts; that file is deleted. Her sentence names the reason a drawer was
// wrong and it is the same one she gave for module settings — *"It cannot be a
// slide-in because things can get quite complex here… I would rather it be full
// screen"* — with "we will add more to this" saying it out loud: this is a PLACE
// that grows, not a panel that gets wider.
//
// AND IT IS A REAL ANCHOR, NOT A PRESS (R37). `InAppLink` — so the profile can
// be middle-clicked into a tab, its address copied, and read out by a screen
// reader as the link it is, while a plain left click stays inside the one shell.
// The address is `/t/<teamId>/members/<userId>`: the app's own (module, id)
// grammar, the same sentence `/accounts/BERG` has always been, and nothing was
// invented for it. `web/components/team/member-screen.tsx` carries the whole
// argument about the address and what the two alternatives cost.
//
// THIS DOES NOT CONTRADICT "not taken anywhere else" (client, 2026-09-09). What
// she took away then was a ROW that redirected you off the tab in place of
// showing you anything; what she asked for now is a screen, by name, for a
// record that has outgrown four lines in a drawer.
//
// WHERE THE ACTS LIVE NOW. Changing a role and removing somebody are on the
// profile, which is the screen that hosts them; revoking a pending invitation is
// on the Invites list one slot along, which is still here. R64
// (`sections-have-a-door`) is the law that holds the three to a screen a person
// can actually reach — it was earned by a version of this paragraph that named a
// route nothing in the app linked to, and `SECTION_HOSTED_ELSEWHERE` names the
// profile now.
//
// ── AND THE WALL IS OUR OWN STAFF ──────────────────────────────────────────
//
//   "we should not see cliets in team, no? thats for staff" (client, 2026-09-10)
//
// THE FACT IT FILTERS ON IS STRUCTURAL, NEVER A ROLE NAME. A client login is an
// ordinary team member holding an ordinary role — grant → invite → accept is the
// only way to make one that works — so there is nothing on the membership row to
// read. What there IS is a `portal_users` row in the TEAM'S OWN database, and
// that single row is what every gate, fence and audience decision in this
// product already reduces to: `resolveAccountScope`
// (shared/workers/account-scope.ts) is one SELECT on `portal_users.user_id` and
// nothing else, and `refusePortalCaller` is that answer read once. The members
// door resolves the same table into `TeamMember.isClient` (workers/tenancy/src/
// lib/members.ts), by PRESENCE and not liveness — a revoked grant still means
// "this login belongs to a client" — and this wall subtracts on that.
//
// A ROLE TITLE WOULD HAVE BEEN THE WRONG ANSWER AND A QUIET ONE. There is
// exactly one `lower(title) = 'client'` in the whole repository and it is the
// grant door's DEFAULT ROLE PICKER, not a test of anything; a team is free to
// rename that role, to hold two of them, or to give a client login any role at
// all. A name-based filter would go on returning a plausible list on the day
// somebody renamed "Client" to "Kunde", and nobody would see it happen.
//
// THE SENTENCE THAT USED TO SAY WHAT IT DROPPED IS GONE, 2026-09-14 — R72:
//
//   "in settings, team remove '{count} client logins are not shown here.
//    Team is your own staff; a client's portal access is on their contact
//    record.'"
//
// It named how many client logins were not on the wall and pointed at the
// screen that owns them, under the "Members" heading — exactly the shape R72
// forbids by default now, and this file was never on `SUBTITLE_OK`'s
// exemption list to begin with. The FACT it stated is still true and the
// subtraction above still happens; only the sentence explaining it is gone.
// It has nowhere else in THIS screen to live without becoming the same
// subtitle under another name — the honest homes are the contact record
// itself (web/components/accounts/contact-detail.tsx, where portal access is
// actually granted and revoked) or a zero-state a person only sees by
// reaching for it, and nobody has re-added it there. See RULES.md's R72 row.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Badge } from "@shared/ui/components/badge/badge"
import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { Headline } from "@shared/ui/components/typography/typography"

import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { toast } from "@shared/ui/components/sonner/sonner"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import type { FilterFacet } from "@shared/web/screen-engine/config"
import { PersonCard } from "@shared/web/person-card"
import { useCached, invalidate, primeCache } from "@shared/web/store"
import { useT } from "@shared/web/language"

import type { Invite, TeamMember, TeamRole } from "@shared/types"
import { AddButton, CollectionCard, ToolbarRow } from "@/components/deep-link/screen-bits"
import { ConfirmAction, type ConfirmKind } from "@/components/deep-link/confirm-action"
import { InAppLink } from "@/components/shell/in-app-link"
import { InviteDialog } from "@/components/team/invite-dialog"
import { TeamPanel } from "@/components/team/team-panel"
import { Envelope, Prohibit } from "@shared/ui/foundations/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"
import { List } from "@shared/web/list-compat"
import { personInitials } from "@/lib/identity"
import { staffFullName } from "@shared/staff-name"
import { formatCount } from "@shared/web/format-count"
import { listFetch } from "@/lib/live-resources"
import { ApiFailure, tenancy } from "@/lib/api"
import { reportError } from "@shared/web/log"

/** THE NARROWEST A MEMBER CARD MAY BE, AND HOW THE NUMBER WAS ARRIVED AT.
 *
 * A card carries four things — a 48px round mark, the full name, the role chip
 * and the EMAIL — and the email is the widest by a distance. It is also the one
 * that must not be cut: a truncated address is a fact you have to hover to
 * read, on the only line of the card somebody would ever copy.
 *
 * MEASURED, not chosen. `Saans` at `--text-xs` (12px / 0.75rem), in the running
 * app on 2026-09-09, over the longest real member addresses this database and
 * its seeds carry (`alaap+client2@kwapso.com`, `anja.kessler@studio.example`,
 * `delivered+anything@resend.dev` — 24 to 29 characters):
 *
 *     widest measured address   157.3px
 *     the card's own inset      +32px   (`p-4`, both sides)
 *     ------------------------------------
 *     honest minimum            189.3px  → 12rem (192px)
 *
 * 12rem, not the kit's 13.125rem default: that default is chapter 18's 210 for
 * a KPI strip whose cell holds a figure and a caption on one line, and paying
 * 18px a card for a line this one does not draw is exactly the blank space the
 * client is pointing at. It is a rem and never a px, so it scales with the
 * app's own size setting (ScaleSection) like every other length in the kit.
 *
 * The floor is real: below it the address wraps or clips, and a 30-character
 * address at a scale setting above 100% still does. That is why `truncate`
 * stays on the email — the minimum makes truncation the exception rather than
 * the resting state, it does not abolish it. */
const MIN_CARD = "12rem"

export function MembersGallery({
  teamId,
  members,
  membersLoading,
  membersError,
  onRetryMembers,
  roles,
  canInvite,
  canRemoveMembers,
}: {
  teamId: string
  members: TeamMember[]
  /** True while the read is in flight — never `members.length === 0` alone,
   * which reads exactly like a genuinely empty collection (2026-09-03 audit). */
  membersLoading: boolean
  membersError: unknown
  onRetryMembers: () => void
  /** The team's roles — the Role facet's options and the invite dialog's. */
  roles: TeamRole[]
  /** `team_members:create` — whether the mango `+` and Invites are drawn. */
  canInvite: boolean
  /** `team_members:delete` — whether a pending invite can be revoked from the
   * Invites list. Changing a role and removing somebody are the profile's, and
   * are gated there on the same rights this tab used to read here. */
  canRemoveMembers: boolean
}) {
  const t = useT()
  const [query, setQuery] = React.useState("")
  // A→Z OR Z→A ON THE WALL, and it is the client's own later ruling applied to
  // the identical shape rather than a preference of this lane's. This gallery
  // carried a `TOOLBAR_SORT_EXEMPT` line until 2026-09-11 arguing that "a sort
  // picker offering a single option over a bounded, alphabetical wall is a
  // control that answers nothing" — and on 2026-09-10 she asked for exactly
  // that control, on exactly that shape, one tab over: *"sort by - name"* on
  // Settings › Modules, a bounded alphabetical wall of twelve cards. The
  // argument the entry made is answered by `SortControl` itself: it draws a
  // DIRECTION button beside the field unless a caller passes
  // `showDirection: false`, and `ToolbarRow` never does, so one field is still
  // a real choice between two orders. One field and not two for the same
  // reason the Modules wall has one: a person's NAME is the row here, and the
  // other three facts a card carries (the mark, the role chip, the email) are
  // either that name again or the Role FILTER one slot to the left.
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({})
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [invitesOpen, setInvitesOpen] = React.useState(false)
  // THE ONE ACT LEFT ON THIS CONTAINER, and one piece of state for it. Changing
  // a role and removing somebody moved to the member's own full-screen profile
  // on 2026-09-10 (see this file's header); what is still here is revoking a
  // pending invitation, which belongs to the Invites list beside the wall and to
  // no person's record, because an invitation is not a member yet.
  const [confirm, setConfirm] = React.useState<
    { kind: ConfirmKind; inviteId: string } | null
  >(null)

  // WHO IS OFFERED THE INVITES BUTTON. `create` OR `delete`, not `create`
  // alone — the button is the only door to the pending invites now (nothing in
  // the app links to /t/<teamId>/invites), and revoking one is `delete`. Gated
  // on `create` alone, somebody holding exactly the right to revoke an invite
  // could not open the list to do it: the same class of missing door R64 is
  // about, one control in.
  //
  // A PURE READER IS STILL NOT OFFERED IT, deliberately. The door itself is
  // `team_members:read`, so showing the list to everybody who can see this tab
  // would be defensible — but it is a visible change to a screen the client
  // approved last week, and offering a button to somebody who can do nothing
  // with what is behind it is the shape she has ruled against twice. That is a
  // question for her, not a decision to take inside a regression fix.
  const canSeeInvites = canInvite || canRemoveMembers

  // THE INVITES COUNT THE BUTTON CARRIES. Only the PENDING ones — an accepted
  // invite is a member now (they are in the wall behind this button) and a
  // revoked or expired one is a decision already taken. A button whose number
  // counts settled rows is a number nobody can act on.
  const invitesQ = useCached<Invite[]>(
    teamId && canSeeInvites ? `invites:${teamId}` : null,
    () => listFetch.invites(teamId)
  )
  const pending = (invitesQ.data ?? []).filter((i) => i.status === "pending")

  const activeRoles = roles.filter((r) => r.active)

  // ROLE, AND NOTHING ELSE — "filters for members: role" (client, 2026-09-09).
  // The options are the ROLES THE TEAM HAS, not the roles its members happen to
  // hold, so an empty role is still a choice you can narrow to and get an honest
  // "nothing here" rather than a facet that quietly forgets it exists.
  const facets: FilterFacet[] = [
    {
      field: "role",
      label: t("Role"),
      control: "select",
      options: activeRoles.map((r) => ({ value: r.title, label: r.title })),
    },
  ]

  // OUR OWN STAFF, AND NOTHING ELSE — "we should not see cliets in team, no?
  // thats for staff" (client, 2026-09-10). `isClient` is the members door's
  // own resolution of a `portal_users` row in the team's database; this
  // file's header carries why that fact and never a role TITLE is what a
  // filter may stand on, and why the subtraction now happens silently —
  // see the header's R72 note above for the sentence that used to explain it.
  const staff = members.filter((m) => !m.isClient)

  // SEARCHED FIRST, THEN NARROWED — the same order every collection screen in
  // the app applies, so the facet's own count describes what the search left.
  const q = query.trim().toLowerCase()
  const matching = staff
    .filter((m) => {
      const role = facetValues.role
      if (role && m.roleTitle !== role) return false
      if (!q) return true
      return (
        staffFullName(m).toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.roleTitle.toLowerCase().includes(q)
      )
    })
    // ORDERED LAST, over our OWN copy — `.filter()` above already returns a
    // fresh array, so this never reorders `members` under the caller that
    // handed it to us. Same seam and same order of operations as the Modules
    // wall on `web/components/screens/settings-screen.tsx`.
    .sort((a, b) => staffFullName(a).localeCompare(staffFullName(b)) * (sortDir === "asc" ? 1 : -1))

  const { pill: filterPill, panel: filterPanel } = useFilterBar({
    facets,
    values: facetValues,
    data: staff,
    onChange: (field, value) =>
      setFacetValues((prev) => {
        const next = { ...prev }
        if (value === "") delete next[field]
        else next[field] = value
        return next
      }),
    onClearFacets: () => setFacetValues({}),
    resultCount: matching.length,
  })

  async function invite(email: string, roleId: string) {
    await tenancy.createInvite(email, roleId)
    invalidate(`invites:${teamId}`)
    toast.success(t("Invite sent."))
  }

  // ── THE ONE ACT ─────────────────────────────────────────────────────────
  //
  // THE DOOR ANSWERS WITH THE WHOLE LIST, so the cache is PRIMED with what the
  // write returned rather than dropped and re-read (CACHING.md's cache-first
  // rule, and the same shape `use-screen-actions.ts` uses for this exact door).
  //
  // NOTHING IS SWALLOWED. The door refuses for real reasons a person needs to
  // read, so the error is re-thrown to the caller — `ConfirmAction`'s parent
  // below toasts it.
  async function revokeInvite(inviteId: string) {
    const { invites: next } = await tenancy.revokeInvite(inviteId)
    primeCache(`invites:${teamId}`, next)
    toast.success(t("Invite revoked."))
  }

  const invitesBadge = formatCount(pending.length)

  return (
    /* THE CONTAINER — "nothing on top of white background, its a rule!"
       (client, 2026-09-09). AMENDED 21 SEP 2026 — the same finding, and the
       same fix, `roles-matrix.tsx` carries in full: this tab's toolbar sat
       32px under the tab strip and 32px in from the pane edge, because
       `<TeamPanel>` (default `narrowGround`, always soft paper) wrapped the
       heading, the toolbar AND the wall together inside its own
       `p-6 lg:p-[var(--space-7)]` inset — every OTHER toolbar in the app
       sits 10px under its strip and flush with the pane edge (R83). The
       outer box is `<CollectionCard>` now (plain, the app's own R83 seam —
       it publishes `--toolbar-lead-gap` on itself), and `<TeamPanel>` moved
       DOWN, wrapping only the wall of member cards (and the invites
       disclosure above it) — the soft paper those `raised` cards genuinely
       need for contrast, unchanged from what this comment always argued.
       The wall itself still keeps `CardGrid`'s default `tone="bare"`: the
       ground is paid for one level down now instead of one level up, and a
       second `bg-surface-panel` inside THAT panel would still be the 1.000
       team-panel.tsx's own header measures against.

       NO `className="relative"` HERE ANY MORE — that was the positioning
       context for a gear docked to this card's own corner, 2026-09-14 to
       2026-09-14. The gear moved INTO `<ToolbarRow>`'s own `actions` slot the
       same day (see the comment beside `<ModuleSettingsGear>` below), so this
       section has nothing absolutely positioned left inside it and needs no
       positioning context of its own. */
    <CollectionCard>
      {/* THE HEADING IS `sr-only`, NOT DELETED — client ruling, 2026-09-14:
          "remove members and roles titles too". Both this section and Roles
          below sit inside ONE tab panel already named "Team" (Radix's own
          tabpanel→tab `aria-labelledby`), so that single name cannot tell a
          reader which of the two stacked collections they are in — unlike
          Automations or Integrations, which are the only collection on
          their own tab and lose nothing by going fully headless. Keeping
          `<Headline as="h2">` as a real (if visually hidden) heading, rather
          than an `aria-label` on `TeamPanel`'s own `<section>`, is the kit's
          `sr-only` route the brief asks for: a screen reader's heading list
          still reads "Members" then "Roles", a sighted reader reads nothing
          extra, and R67's subject (the `<section>` tag, containment only, no
          heading required since its 2026-09-11 amendment) is unaffected
          either way. */}
      <Headline as="h2" size="h4" className="sr-only">
        {t("Members")}
      </Headline>

      {membersError ? (
        <ShapeStateBody
          shape="recordChrome"
          state="error"
          copy={{ errorTitle: t("Couldn't load members.") }}
          action={
            <Button variant="secondary" onClick={onRetryMembers}>
              {t("Try again")}
            </Button>
          }
        />
      ) : (
        /* R49 — THE ROW'S OWN NUMBER, AND NOBODY ELSE'S HAND ON IT. This column
           is GAPLESS on purpose, and that is the whole reason it is a box at all
           rather than the fragment it replaced. `TeamPanel` (team-panel.tsx) is
           a `flex flex-col gap-4` container, and a fragment paints nothing — so
           the toolbar, the invites disclosure, the subtraction sentence and the
           wall were all DIRECT children of that column, and the row was pushed
           off the first thing under it by 16px ON TOP OF the
           `mb-[var(--toolbar-content-gap)]` it already pays as its own trailing
           margin. Two hands on one number, which is exactly the drift R49 was
           written to end — and invisible to that law until 11 Sep 2026, because
           its call-site census read `<div>` and `<section>` wrappers and this
           one is a COMPONENT.

           The three things BELOW the row still want the panel's rhythm between
           EACH OTHER, so they keep it in a column of their own further down —
           the same nesting `client-org-panel.tsx` uses for its heading/row pair,
           read the other way round.

           AND IT HAS TO HOLD THE WALL, not the row alone. `PINNED_TOOLBAR` is
           `position: sticky`, which is bounded by its own parent box: a wrapper
           around the toolbar by itself would leave it nothing to stick through.
           R63 measured that exact failure on the tickets Dashboard — a 32px
           stuck range, i.e. no pin at all.

           NO TOP PADDING HERE — `pt-[var(--space-8)]` lived here from
           2026-09-14 to 2026-09-14, clearing a docked gear that sat in this
           column's own top-end corner. The gear moved into the row's
           `actions` slot the same day it was ruled into the toolbar, so
           there is nothing left above this column's own content to clear. */
        <div className="flex min-w-0 flex-col">
          <ToolbarRow
            // R50 — the collection's RAW count, before any search or filter
            // narrows it, folded together with the loading state so an
            // unresolved read does not read as an empty team.
            // R50 — and the count is the STAFF count, because the staff wall is
            // the collection this row narrows. A team whose only members are
            // client logins has an empty wall and gets no toolbar, which is the
            // honest reading of both rules together.
            empty={!membersLoading && staff.length === 0}
            search={
              (membersLoading || staff.length > 0) && (
                <SearchInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClear={() => setQuery("")}
                  placeholder={t("Search members…")}
                  className="w-full"
                />
              )
            }
            filters={(membersLoading || staff.length > 0) && filterPill}
            // R53 — the row builds the control; this hands it the answers. See
            // `sortDir` above for the ruling that put it here.
            sort={{
              options: [{ value: "name", label: t("Name") }],
              value: "name",
              onValueChange: () => undefined,
              direction: sortDir,
              onDirectionChange: setSortDir,
            }}
            toolbarPanel={(membersLoading || staff.length > 0) && filterPanel}
            actions={
              <>
                {canSeeInvites && (
                  /* SECONDARY, AND IT CARRIES ITS OWN NUMBER — "the invites,
                      make it secondary button on the toolbar" (client,
                      2026-09-09). The count is `formatCount`'s (R16), which
                      renders NOTHING at zero, so a team with no invites out
                      gets a plain button rather than a "0" nobody needs.
                      `canSeeInvites` rather than `canInvite`: see the note on
                      that constant for why revoking needs its own door.

                      AN ICON, AND THE TOOLBAR'S OWN HEIGHT — "the invites needs
                      an icon and make it the same size as other buttons in the
                      toolabr! currenlty its too small" (client, 2026-09-10). It
                      carried `size="sm"`, which is the kit's `--control-height-
                      dense` (32) — the in-field, in-overlay step — while every
                      other control on this row stands at `--control-height-
                      button` (40): the mango `+` is `size="icon"`, and the
                      search box and the filter pill are input-height. So the
                      fix is a DELETION rather than a number: dropping `size`
                      takes the kit's own standing default, which is the one the
                      row is already built on.

                      THE GLYPH IS THE APP'S OWN WORD FOR AN INVITE. `envelope`
                      is what `CONCEPT_ICON.invites` (web/lib/pages.ts) has
                      always said, and the kit draws Phosphor under Phosphor's
                      own names, so it is `Envelope` — one concept, one icon, at
                      the page, tab and button level (UI-CONVENTIONS §4). Before
                      the label, `size-3.5`, exactly as CLAUDE.md's action-icon
                      mapping puts every other one. */
                  <Button variant="secondary" onClick={() => setInvitesOpen(true)}>
                    <Envelope className="size-3.5" />
                    {t("Invites")}
                    {invitesBadge !== "" && <Badge>{invitesBadge}</Badge>}
                  </Button>
                )}
                {/* THE GEAR (R61), IN THE TOOLBAR, ON THE LEFT OF THE `+` —
                    the client's ruling, 2026-09-14: "In Team, add the gear
                    in the toolbar on the left of the Add button." It was
                    docked to this card's own corner, outside
                    `<ToolbarRow>`, precisely so it would survive an empty
                    team — R50 makes the row draw NOTHING, `actions`
                    included, the moment the collection it narrows is empty
                    — and her instruction puts it back in the row anyway.

                    THE TRADE-OFF, ACCEPTED RATHER THAN ENGINEERED AROUND: on
                    an empty team the gear now disappears with the row too.
                    That is fine, because R61 guarantees a SECOND door to
                    the very same settings page — Settings › Modules — so
                    nobody is locked out; a reader looking at a zero-member
                    team can still reach member settings from there. Do not
                    "fix" this back out into a dock: that solves a problem
                    she has already ruled does not need solving, at the cost
                    of a sibling outside `<ToolbarRow>`'s own five slots. No
                    `EMPTY_TOOLBAR_EXEMPT` entry either — the row still
                    answers R50's question honestly, it just answers it for
                    the gear now too, and R61's "exactly one gear mounting
                    per segment" still holds: this is the one and only
                    `<ModuleSettingsGear segment="members">` in the app,
                    moved, never duplicated. */}
                <ModuleSettingsGear teamId={teamId} segment="members" />
                {/* THE MANGO STAYS ON `create` ALONE. It is the one thing on
                    this tab that makes something new, and a person who may
                    only revoke has nothing to add. */}
                {canInvite && (
                  <AddButton
                    label={t("Invite someone")}
                    onClick={() => setInviteOpen(true)}
                    // R50 — the same answer the row above already carries. It
                    // is stated here as well because this button is wrapped in
                    // its own `{canInvite && …}` guard rather than sitting
                    // bare in the `actions` slot, so the positional read that
                    // recognises a toolbar action cannot see the slot from
                    // here. The two can never disagree: both are the STAFF
                    // count, which is the collection this row narrows.
                    empty={!membersLoading && staff.length === 0}
                  />
                )}
              </>
            }
          />

          {/* THE PAPER MOVES DOWN HERE — `<TeamPanel>` no longer wraps the
              toolbar above (21 Sep 2026, this file's header). It wraps only
              what still needs it: the invites disclosure and the wall of
              `raised` member cards, which measure 1.000 against the plain
              page ground without a soft-paper band under them (team-panel.tsx
              carries the full argument and the measured contrast). */}
          <TeamPanel>
          {/* THE PANEL'S OWN RHYTHM, KEPT BETWEEN THESE THREE AND NOWHERE ELSE
              — `gap-4`, the number `TeamPanel` spends on its children, which
              they were getting from it directly until this column took it over.
              The row above is not in here, so R49's one gap is the only thing
              between it and the invites block. */}
          <div className="flex min-w-0 flex-col gap-4">
            {/* THE INVITES, IN PLACE — the button above reveals them BESIDE the
                wall rather than opening /t/<teamId>/invites, because "not taken
                anywhere else" is the whole instruction this tab was rebuilt on.
                It is an EXPAND, not a new surface: the same shape the client
                ruled for the filter panel one slot along ("more like expand
                behaviour rather than open-a-new-one behaviour", 2026-09-03).

                AND IT IS NO LONGER READ-ONLY, 2026-09-10. This comment used to
                end: "revoking one is still the Invites section's own job, and
                adding a destructive action to a disclosure she has not seen would
                be inventing a decision rather than building one." The first half
                had stopped being true the moment the section it named lost its
                door — nothing in the app links to /t/<teamId>/invites, so the
                "job" belonged to a screen nobody could open. And the second half
                had it backwards: leaving the act out was not restraint, it was
                the capability going missing. A list of pending invites you cannot
                revoke is the shape of the bug, not a smaller surface.

                WHAT IS ACTUALLY NEW HERE IS ONE ROW CONTROL AND NO NEW SURFACE:
                the warning is the app's existing `ConfirmAction` (R59 — a yes/no
                question about something that exists is a centred `AlertDialog`),
                and `Prohibit` is the app's one revoke glyph. */}
            {invitesOpen && canSeeInvites && (
              <div className="flex flex-col gap-2">
                <h3 className="text-muted-foreground text-micro uppercase">
                  {t("Invites waiting to be accepted")}
                </h3>
                {invitesQ.loading && pending.length === 0 ? (
                  <Skeleton variant="list" lines={2} />
                ) : pending.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("No invites are waiting.")}</p>
                ) : (
                  <List
                    surface="none"
                    /* OFF-BEIGE, NOT SOFT PAPER — this line said
                       `bg-surface-panel` while the section had no ground of its
                       own, which was right then and is the 1.000 bug now that the
                       section IS a soft-paper panel. RULES.md §2.6 in one edit: a
                       block takes the OTHER paper tone from the band it stands
                       in. Measured on the panel: 1.103 light, 1.111 dark. */
                    className="rounded-[var(--radius)] bg-card"
                    items={pending.map((i) => ({
                      id: i.id,
                      initials: i.email.slice(0, 1).toUpperCase(),
                      title: i.email,
                      subtitle: i.roleTitle,
                      // REVOKE, ON THE ROW ITSELF. Icon-only with the sentence as
                      // its accessible name and tooltip — the app's own narrow-row
                      // convention (CLAUDE.md's action-icon mapping: revoke =
                      // `Prohibit`), and the same treatment `RolePanel`'s two acts
                      // take. Drawn only for `team_members:delete`; the door
                      // refuses anybody else anyway, and a control that always
                      // fails is worse than no control.
                      trailing: canRemoveMembers ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${t("Revoke invite")}: ${i.email}`}
                              onClick={() =>
                                setConfirm({ kind: "invites.revoke", inviteId: i.id })
                              }
                            >
                              <Prohibit className="text-destructive size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("Revoke invite")}</TooltipContent>
                        </Tooltip>
                      ) : undefined,
                    }))}
                  />
                )}
              </div>
            )}

            {membersLoading && members.length === 0 ? (
              <Skeleton variant="list" lines={4} />
            ) : (
              <CardGrid
                // FLUID, NOT THE THREE-COLUMN LADDER — "more members in each row"
                // (client, 2026-09-09). `fluid` is the kit's own
                // `repeat(auto-fit, minmax(…, 1fr))`, and its doc names this
                // exact case: "Use this where the cell has a natural minimum — a
                // figure, a mark and a line — and the fixed ladder would leave
                // one card stranded on its own row." A member card has one; see
                // MIN_CARD above for how it was measured.
                fluid
                minItemWidth={MIN_CARD}
                label={t("Members")}
                empty={matching.length === 0}
                emptyLabel={
                  staff.length === 0
                    ? t("No members yet.")
                    : t("No members match what you're looking for.")
                }
              >
                {matching.map((m) => (
                  /* SOFT PAPER, NOT OFF-BEIGE — rulebook L43 going app wide, 21 Sep 2026.
                     `raised` is `--card`, which IS the page's own colour in light (#FFFEF9),
                     so on the plain ground this card now stands on it would measure 1.000 and
                     be held up by its shadow alone. `default` is soft paper, 1.103, the tone
                     every other object on this ground reads at. The Minimal Kit page named
                     this sweep: "check that nobody passed `raised` explicitly for a tile row
                     that used to sit on a panel". */
                  <Card
                    key={m.userId}
                    variant="default"
                    // A CARD THAT IS A LINK ACKNOWLEDGES THE POINTER — client,
                    // 2026-09-14: "we are missing a hover state for the cards.
                    // For example, in settings modules, I would need to see a
                    // hover when I hover over a card." This wall is the same
                    // shape (a real anchor filling the whole cell, R37 above).
                    //
                    // NOT `interactive` — that prop also grants
                    // `motion-hover-lift` (motion.css §13), and this is a WALL:
                    // many cards, one glance. `app-tiles.tsx` already argued the
                    // same shape down to a fill-only wash for the identical
                    // reason ("a grid of them lifting is the page of reacting
                    // boxes UI-RULEBOOK C2 exists to prevent"), and it is the
                    // kit's own token either way — `--accent`, the same wash
                    // `interactive` would have reached for (card.tsx: "Hover,
                    // where a card is a target, is `--accent`"), just without
                    // the shadow. `motion-hover` is motion.css's own transition
                    // class for a fill swap; nothing here is hand-rolled.
                    className="hover:bg-accent motion-hover"
                  >
                    {/* THE WHOLE CELL IS THE DOOR, AND IT IS A REAL ANCHOR (R37)
                        — "when clickingon card in team, open full screen the
                        profile" (client, 2026-09-10). It was a bare `<button>`
                        opening a slide-in; a destination with an address is a
                        link, so middle-click, copy-address and a screen reader's
                        link list all work, and only the plain left click is
                        intercepted into the one shell. `block` because an anchor
                        is inline and the card's own inset is what should decide
                        the width. */}
                    <InAppLink
                      href={`/t/${teamId}/members/${m.userId}`}
                      className="block"
                    >
                    <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                      {/* THE CELL'S LAYOUT — `PersonCard` (shared/web/person-card.tsx),
                          extracted 18 Sep 2026 so the ticket's stakeholders panel
                          could draw the identical shape without a second
                          hand-copied `<CardContent>` block. The mark's two
                          seams and `band` over `tile` moved there; the
                          `<CardTitle>` stays written HERE (R65's own census
                          reads it off THIS file's `<Card>` block by text, so
                          building it inside the shared component would be
                          invisible to it — `person-card.tsx`'s own header has
                          the whole argument). */}
                      <PersonCard
                        picture={m.imageUrl}
                        mark={personInitials(m.firstName, m.lastName)}
                        markName={staffFullName(m)}
                        chip={<Badge>{m.roleTitle}</Badge>}
                        title={<CardTitle className="text-sm">{staffFullName(m)}</CardTitle>}
                        secondary={
                          <span className="text-muted-foreground w-full truncate text-xs">
                            {m.email}
                          </span>
                        }
                      />
                    </CardContent>
                    </InAppLink>
                  </Card>
                ))}
              </CardGrid>
            )}
          </div>
          </TeamPanel>
        </div>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={activeRoles}
        draftKey={`invite:${teamId}`}
        onSubmit={invite}
      />

      {/* THE ONE WARNING THIS CONTAINER STILL ASKS (R59) — and the app's
          existing one rather than a second copy: `ConfirmAction` has drawn this
          exact `AlertDialog` for revoke-invite since the team area shipped. It
          takes the ACT as a prop instead of reading it off the URL, so a screen
          with no URL of its own can open it.

          `memberName` IS ALWAYS NULL HERE, and that is not an omission: it is
          the prop `ConfirmAction` uses to name the person a remove-member
          warning is about, and removing somebody moved to their own profile on
          2026-09-10. An invitation names an EMAIL, which the component's own
          revoke copy already says. */}
      <ConfirmAction
        kind={confirm?.kind}
        canRun={canRemoveMembers}
        memberName={null}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return
          try {
            await revokeInvite(confirm.inviteId)
            setConfirm(null)
          } catch (err) {
            // THE DOOR'S OWN SENTENCE, NEVER A GENERIC ONE, and the warning
            // stays OPEN so the row they were acting on is still in front of
            // them.
            if (!(err instanceof ApiFailure)) reportError("members-gallery:confirm", err)
            toast.error(
              err instanceof ApiFailure ? err.message : t("Something went wrong. Try again.")
            )
          }
        }}
      />
    </CollectionCard>
  )
}
