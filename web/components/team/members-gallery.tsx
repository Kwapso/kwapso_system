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
// ── NOTHING NAVIGATES ───────────────────────────────────────────────────────
//
// "Everything should be in different containers… not taken anywhere else"
// (client, 2026-09-09). A card is a card and not a link: the list this replaces
// opened /t/<teamId>/members/<id> on a row press, which is the redirect she was
// complaining about. Changing somebody's role or removing them still lives on
// the member's own record, reached from the team area's Members section — what
// this screen stopped doing is taking you there when you only wanted to look at
// who is on the team.

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
import { useCached, invalidate } from "@shared/web/store"
import { useT } from "@shared/web/language"

import type { Invite, TeamMember, TeamRole } from "@shared/types"
import { AddButton, ToolbarRow } from "@/components/deep-link/screen-bits"
import { InviteDialog } from "@/components/team/invite-dialog"
import { TeamPanel } from "@/components/team/team-panel"
import { List } from "@shared/web/list-compat"
import { personInitials } from "@/lib/identity"
import { staffFullName } from "@shared/staff-name"
import { formatCount } from "@shared/web/format-count"
import { listFetch } from "@/lib/live-resources"
import { tenancy } from "@/lib/api"

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
}) {
  const t = useT()
  const [query, setQuery] = React.useState("")
  const [facetValues, setFacetValues] = React.useState<Record<string, string>>({})
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [invitesOpen, setInvitesOpen] = React.useState(false)

  // THE INVITES COUNT THE BUTTON CARRIES. Only the PENDING ones — an accepted
  // invite is a member now (they are in the wall behind this button) and a
  // revoked or expired one is a decision already taken. A button whose number
  // counts settled rows is a number nobody can act on.
  const invitesQ = useCached<Invite[]>(
    teamId && canInvite ? `invites:${teamId}` : null,
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
              canInvite && (
                <>
                  {/* SECONDARY, AND IT CARRIES ITS OWN NUMBER — "the invites,
                      make it secondary button on the toolbar" (client,
                      2026-09-09). The count is `formatCount`'s (R16), which
                      renders NOTHING at zero, so a team with no invites out
                      gets a plain button rather than a "0" nobody needs. */}
                  <Button variant="secondary" size="sm" onClick={() => setInvitesOpen(true)}>
                    {t("Invites")}
                    {invitesBadge !== "" && <Badge>{invitesBadge}</Badge>}
                  </Button>
                  <AddButton label={t("Invite someone")} onClick={() => setInviteOpen(true)} />
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
              Read-only — revoking one is still the Invites section's own job,
              and adding a destructive action to a disclosure she has not seen
              would be inventing a decision rather than building one. */}
          {invitesOpen && canInvite && (
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
    </TeamPanel>
  )
}
