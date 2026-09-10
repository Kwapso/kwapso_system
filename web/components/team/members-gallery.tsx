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
// is the one component that draws all three. `shape="round"` is her "avatar (in
// round)" and is also the seam's own rule for a person in their own right. It is
// already handed `picture={m.imageUrl}`, so the day a member gets a photograph
// the same slot carries the face with no change here.
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
//   actions  Invites (secondary, carrying its count) then the mango `+`
//   empty    the collection's own raw row count being zero (R50)
//
// ── THE ONE MANGO ON THIS TAB IS THE `+`, AND IT IS HERE ────────────────────
//
// The kit rules one mango per view (shared/ui/docs/RULES.md §2.5). This tab has
// two things somebody creates — a member and a role — and the mango goes to the
// member, because inviting a person is what a Team tab is FOR. "New role" beside
// the roles matrix is a quiet button; the argument, and the client's reversal
// that settled it, are written up in web/components/team/roles-matrix.tsx.
//
// ── NOTHING NAVIGATES. THE CARD OPENS A SLIDE-IN ───────────────────────────
//
// "Everything should be in different containers… not taken anywhere else"
// (client, 2026-09-09). A card is not a LINK: the list this replaces opened
// /t/<teamId>/members/<id> on a row press, which is the redirect she was
// complaining about. It is still not a link. It is a press that opens the
// MEMBER PANEL (web/components/team/member-panel.tsx) from the side — the same
// gesture a role already has on the matrix two containers down, and her own
// instruction for it: "when iclick in role, overview in slide in."
//
// THIS PARAGRAPH USED TO SAY SOMETHING FALSE, AND IT COST THE APP THREE ACTS.
// It read: "Changing somebody's role or removing them still lives on the
// member's own record, reached from the team area's Members section." Nothing in
// the app linked to that section. A census of every `softNavigate(...)` and
// `href=` under web/ found ONE link into the team area anywhere — a member's
// RECORD, from apps/stakeholders-panel.tsx — and the only other way in was the
// "This team" list on this very tab, which renders one row (Internal rates,
// gated on `commercials:read`). So a person with `team_members` rights and
// without that one could change nobody's role, remove nobody and revoke
// nothing, and the sentence above told the next reader it was fine.
//
// All three acts are on this tab now: role and remove in the member's panel,
// revoke on the Invites list one slot along. R64 (`sections-have-a-door`) is the
// law that stops the sentence and the app disagreeing again.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Badge } from "@shared/ui/components/badge/badge"
import { Card, CardContent } from "@shared/ui/components/card/card"
import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { Headline } from "@shared/ui/components/typography/typography"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { toast } from "@shared/ui/components/sonner/sonner"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import type { FilterFacet } from "@shared/web/screen-engine/config"
import { RecordMark } from "@shared/web/record-mark"
import { useCached, invalidate, primeCache } from "@shared/web/store"
import { useT } from "@shared/web/language"

import type { Invite, TeamMember, TeamRole } from "@shared/types"
import { AddButton, ToolbarRow } from "@/components/deep-link/screen-bits"
import { ConfirmAction, type ConfirmKind } from "@/components/deep-link/confirm-action"
import { InviteDialog } from "@/components/team/invite-dialog"
import { MemberPanel } from "@/components/team/member-panel"
import { RolePickerDialog } from "@/components/team/role-picker-dialog"
import { TeamPanel } from "@/components/team/team-panel"
import { Prohibit } from "@shared/ui/foundations/icons"
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
  canEditMembers,
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
  /** `team_members:edit` — whether the member panel offers Change role. */
  canEditMembers: boolean
  /** `team_members:delete` — whether the member panel offers Remove, and
   * whether a pending invite can be revoked from the Invites list. */
  canRemoveMembers: boolean
}) {
  const t = useT()
  const [query, setQuery] = React.useState("")
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({})
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [invitesOpen, setInvitesOpen] = React.useState(false)
  // THE THREE ACTS THIS TAB NOW CARRIES, one piece of state each and none of
  // them a URL. `openMember` is the panel; `roleFor` is the picker it hands
  // over to; `confirm` is the warning both destructive acts share.
  const [openMember, setOpenMember] = React.useState<TeamMember | null>(null)
  const [roleFor, setRoleFor] = React.useState<TeamMember | null>(null)
  const [confirm, setConfirm] = React.useState<
    { kind: ConfirmKind; member: TeamMember | null; inviteId: string | null } | null
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

  // SEARCHED FIRST, THEN NARROWED — the same order every collection screen in
  // the app applies, so the facet's own count describes what the search left.
  const q = query.trim().toLowerCase()
  const matching = members.filter((m) => {
    const role = facetValues.role
    if (role && m.roleTitle !== role) return false
    if (!q) return true
    return (
      staffFullName(m).toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.roleTitle.toLowerCase().includes(q)
    )
  })

  const { pill: filterPill, panel: filterPanel } = useFilterBar({
    facets,
    values: facetValues,
    data: members,
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

  // ── THE THREE ACTS ──────────────────────────────────────────────────────
  //
  // EACH DOOR ANSWERS WITH THE WHOLE LIST, so the cache is PRIMED with what the
  // write returned rather than dropped and re-read (CACHING.md's cache-first
  // rule, and the same shape `use-screen-actions.ts` uses for these exact three
  // doors on the team area's screens). `member_roles` is invalidated beside it
  // because a role's member count moved, and the changed member's own activity
  // feed gained a row.
  //
  // NOTHING IS SWALLOWED. The doors refuse for real reasons a person needs to
  // read — "A team must keep at least one admin.", "You can't remove yourself."
  // — so the error is re-thrown to the caller, which is the surface that shows
  // it: `RolePickerDialog` toasts its own, and `ConfirmAction`'s parent below
  // toasts the confirm's.
  async function changeRole(member: TeamMember, roleId: string) {
    const { members: next } = await tenancy.setMemberRole(member.userId, roleId)
    primeCache(`members:${teamId}`, next)
    invalidate(`member_roles:${teamId}`)
    invalidate(`activity:user:${member.userId}`)
    toast.success(t("Role updated."))
  }

  async function removeMember(member: TeamMember) {
    const { members: next } = await tenancy.removeMember(member.userId)
    primeCache(`members:${teamId}`, next)
    invalidate(`member_roles:${teamId}`)
    invalidate(`activity:user:${member.userId}`)
    toast.success(t("Member removed."))
  }

  async function revokeInvite(inviteId: string) {
    const { invites: next } = await tenancy.revokeInvite(inviteId)
    primeCache(`invites:${teamId}`, next)
    toast.success(t("Invite revoked."))
  }

  const invitesBadge = formatCount(pending.length)

  return (
    /* THE CONTAINER — "nothing on top of white background, its a rule!"
       (client, 2026-09-09). The heading, the toolbar and the wall are all
       inside it, the way `CollectionFrame`'s one panel holds the toolbar, the
       rows and the pager rather than banding them separately. The wall itself
       therefore keeps `CardGrid`'s default `tone="bare"`: the ground is already
       paid for one level up and a second `bg-surface-panel` inside this one
       would be the 1.000 all over again. team-panel.tsx carries the argument
       and the measured contrast in both palettes. */
    <TeamPanel>
      <Headline as="h2" size="h4">
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
        <>
          <ToolbarRow
            // R50 — the collection's RAW count, before any search or filter
            // narrows it, folded together with the loading state so an
            // unresolved read does not read as an empty team.
            empty={!membersLoading && members.length === 0}
            search={
              (membersLoading || members.length > 0) && (
                <SearchInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClear={() => setQuery("")}
                  placeholder={t("Search members…")}
                  className="w-full"
                />
              )
            }
            filters={(membersLoading || members.length > 0) && filterPill}
            toolbarPanel={(membersLoading || members.length > 0) && filterPanel}
            actions={
              canSeeInvites && (
                <>
                  {/* SECONDARY, AND IT CARRIES ITS OWN NUMBER — "the invites,
                      make it secondary button on the toolbar" (client,
                      2026-09-09). The count is `formatCount`'s (R16), which
                      renders NOTHING at zero, so a team with no invites out
                      gets a plain button rather than a "0" nobody needs.
                      `canSeeInvites` rather than `canInvite`: see the note on
                      that constant for why revoking needs its own door. */}
                  <Button variant="secondary" size="sm" onClick={() => setInvitesOpen(true)}>
                    {t("Invites")}
                    {invitesBadge !== "" && <Badge>{invitesBadge}</Badge>}
                  </Button>
                  {/* THE MANGO STAYS ON `create` ALONE. It is the one thing on
                      this tab that makes something new, and a person who may
                      only revoke has nothing to add. */}
                  {canInvite && (
                    <AddButton label={t("Invite someone")} onClick={() => setInviteOpen(true)} />
                  )}
                </>
              )
            }
          />

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
                            aria-label={`${t("Revoke invite")} — ${i.email}`}
                            onClick={() =>
                              setConfirm({ kind: "invites.revoke", member: null, inviteId: i.id })
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
                members.length === 0
                  ? t("No members yet.")
                  : t("No members match what you're looking for.")
              }
            >
              {matching.map((m) => (
                <Card key={m.userId} variant="raised">
                  {/* THE WHOLE CELL IS THE PRESS TARGET, and it opens the
                      member's panel — never a route. A BARE `<button>` for the
                      same reason `roles-matrix.tsx`'s row head is one: every
                      kit `Button` size fixes a height and `whitespace-nowrap`,
                      and this target is a four-line stack. The kit's focus rule
                      is global (tokens.css §8 rings every `:focus-visible` at
                      the control's own radius), so a bare button is rung for
                      free and defines nothing. `w-full` because a button is
                      shrink-to-fit and the card's own inset is what should
                      decide the width. */}
                  <button
                    type="button"
                    onClick={() => setOpenMember(m)}
                    aria-label={`${staffFullName(m)} — ${t("Overview")}`}
                    className="w-full cursor-pointer text-start"
                  >
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    {/* TWO LETTERS, THROUGH THE TWO SEAMS THAT ALREADY EXIST.
                        `RecordMark` is the app's one person mark (R35's third
                        rung: a picture, else a type glyph, else an initial) and
                        `personInitials` is the app's one two-letter avatar mark
                        — R54's own note keeps it explicitly out of the
                        first-name rule, "an initial is a MARK, not a name".
                        `RecordMark`'s bare `name` fallback is ONE letter, which
                        is right on a dense list row and wrong on a 48px round
                        mark that is the biggest thing on the card, so the pair
                        is handed over rather than a third helper invented. The
                        picture still wins where a member has one, so the day
                        this data grows a photograph the same slot carries it. */}
                    <RecordMark
                      picture={m.imageUrl}
                      mark={personInitials(m.firstName, m.lastName)}
                      name={staffFullName(m)}
                      shape="round"
                      size="tile"
                    />
                    {/* NAME AND SURNAME — her 2026-09-09 correction to the
                        first-name rule of 2026-09-07. Through the one naming
                        seam (R54), never `first + " " + last` here; the two
                        rulings and why they do not conflict are written up in
                        shared/staff-name.ts on `staffFullName` itself. */}
                    <span className="text-sm font-medium">{staffFullName(m)}</span>
                    <Badge>{m.roleTitle}</Badge>
                    <span className="text-muted-foreground w-full truncate text-xs">
                      {m.email}
                    </span>
                  </CardContent>
                  </button>
                </Card>
              ))}
            </CardGrid>
          )}
        </>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={activeRoles}
        draftKey={`invite:${teamId}`}
        onSubmit={invite}
      />

      {/* THE MEMBER'S OVERVIEW, AND THE ONLY PLACE THEIR TWO ACTS LIVE ON THIS
          TAB. Opened by a card press above. It opens no door: the row it shows
          is the one this gallery was handed (R56).

          BOTH HANDOVERS CLOSE IT FIRST, exactly as `RolePanel`'s do — the picker
          is itself a `Sheet` on the same z layer, and a warning about the very
          person the drawer is showing would be two surfaces asking one
          question. */}
      <MemberPanel
        member={openMember}
        canChangeRole={canEditMembers}
        canRemove={canRemoveMembers}
        open={openMember !== null}
        onOpenChange={(open) => !open && setOpenMember(null)}
        onChangeRole={(m) => {
          setOpenMember(null)
          setRoleFor(m)
        }}
        onRemove={(m) => {
          setOpenMember(null)
          setConfirm({ kind: "members.remove", member: m, inviteId: null })
        }}
      />

      {/* CHANGE ROLE — the app's existing picker, unchanged and unforked. It is
          a `Sheet` (R59: a picker collects, so it slides in), it hides the role
          the person already holds, and it toasts the door's own refusal — which
          is how "A team must keep at least one admin." reaches the person who
          tried to demote the last one. */}
      <RolePickerDialog
        open={roleFor !== null && canEditMembers}
        onOpenChange={(open) => !open && setRoleFor(null)}
        roles={activeRoles}
        currentRoleId={roleFor?.roleId ?? null}
        subjectName={roleFor ? staffFullName(roleFor) : null}
        onPick={async (roleId) => {
          if (roleFor) await changeRole(roleFor, roleId)
        }}
      />

      {/* THE ONE WARNING BOTH DESTRUCTIVE ACTS SHARE (R59), and the app's
          existing one rather than a second copy: `ConfirmAction` has drawn this
          exact `AlertDialog` for remove-member and revoke-invite since the team
          area shipped. All that changed is that it takes the ACT as a prop
          instead of reading it off the URL, so a screen with no URL of its own
          can open it. */}
      <ConfirmAction
        kind={confirm?.kind}
        canRun={canRemoveMembers}
        memberName={confirm?.member ?? null}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return
          try {
            if (confirm.kind === "members.remove" && confirm.member)
              await removeMember(confirm.member)
            else if (confirm.kind === "invites.revoke" && confirm.inviteId)
              await revokeInvite(confirm.inviteId)
            setConfirm(null)
          } catch (err) {
            // THE DOOR'S OWN SENTENCE, NEVER A GENERIC ONE. Its refusals are
            // the things a person most needs to read here — the last admin, and
            // removing yourself — and the warning stays OPEN so the row they
            // were acting on is still in front of them.
            if (!(err instanceof ApiFailure)) reportError("members-gallery:confirm", err)
            toast.error(
              err instanceof ApiFailure ? err.message : t("Something went wrong. Try again.")
            )
          }
        }}
      />
    </TeamPanel>
  )
}
