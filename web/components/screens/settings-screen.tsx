"use client"

// SETTINGS — the APP's own housekeeping, and nothing about a person.
//
// The owner's ruling folded the old system's separate Admin / System / Kwapso
// sections in here rather than giving each a rail entry: they are all the same
// kind of thing (opened rarely and on purpose) and a nav rail that lists three
// of them reads as three destinations.
//
// TWO THINGS LEFT IT ON 17 AUG 2026, and the reason is the same for both.
//   • YOUR PROFILE AND YOUR EMAIL moved to a page of their own
//     (screens/profile-screen.tsx, reached from the profile menu). Everything
//     here is about the APP; those are about a PERSON, and a tester looking for
//     "change my name" should not have to guess which of three tabs holds it.
//     That still holds for your name, your email address and your history, and
//     that page is still where they live.
//   • THE TEAMS LIST is hidden rather than removed — shared/product.ts explains
//     at length why nothing underneath it was touched.
//
// AND ONE OF THE TWO CAME BACK ON 2026-09-10. The client, in her own words:
// *"language shoudl be in settings somewhere, not in my porfile"*. The language
// you read kwapso in went out with the profile in August on the reading that it
// is "about a PERSON" — but so are the app's size, its light or dark, and the
// sidebar's colour, and all three of those have been sitting in Appearance the
// whole time. The line that holds is not person-vs-app, it is IDENTITY (your
// name, your email address, what you have done) against DISPLAY (how the app
// looks to you and which words it says), and language was on the wrong side of
// it. It is the fourth card in the Appearance tab now; nothing else moved.
//
// THE FOURTH TAB, "MODULES", 2026-09-09 — and it is an INDEX, not a section.
// (It was the FIFTH of five until 11 Sep 2026, when Choices was retired in front
// of it; the paragraphs below record that move where it happened.)
// The client, the same day she asked for the gear on each module's own screen:
// *"somewhere in the settings, we have a tab that says 'Module' or 'Business
// Logic' (or whatever you define as a good word) to find the module once"*, and
// the reason, in the sentence that governs this whole screen: *"everything
// around settings should be under settings screen concentrated (and 'quick
// access' through the gear in each module) but not in random places across the
// app."* So a module's settings have exactly two doors and they are the same
// door: the gear is the shortcut from where you are standing, this tab is the
// place you go when you do not know where that is. Both open
// `/settings/<segment>`, and the rows below are DERIVED from the same
// `visibleModuleSettings` the gear asks (through `moduleSettingsIndex`), so the
// two cannot drift into disagreeing about which modules have settings or who
// may see them. R61 (`module-settings-two-doors`) turns that into a law.
//
// THE WORD IS "MODULES" because this screen already uses it: the roles matrix
// one tab to the left has one COLUMN per module, off `TEAM_MODULES`. Two tabs
// apart, the same noun, the same set of things. "Business Logic" — her other
// suggestion — would have been a second name for that same set, on the same
// screen, which is the kind of drift the rest of this file's header is a record
// of undoing.
//
// IT WAS PLACED IMMEDIATELY BEFORE CHOICES, AND IT OUTLIVED IT — 11 SEP 2026.
// The note here used to say the two lived next to each other "until that move
// is scoped and reviewed, and the move is then a deletion rather than a
// re-ordering", and that is exactly what happened: the client asked for the
// rest of it in one sentence — *"implement this module settings across app:
// the goal right now is that you identify the choice components where they
// belong to a module and create the settings there in the module and in
// settings the module. End goal: kill the big tab 'choice options'."*
//
// SO THE CHOICES TAB IS GONE, and so is the whole-vocabulary screen behind it
// (`/t/<teamId>/dropdowns`, which by then nothing in the app linked to). Every
// group whose words a record actually stores has a module home, and the import
// and the export went with it: each module settings page carries its own,
// narrowed to its own groups at the DOOR (`?groups=` on the export,
// `groups` on the import confirm). Her words for that half: *"each module's
// settings page gets its own import and export for its own groups… nothing
// sits outside Settings."*
//
// WHAT THE MOVE COST, recorded here because the next reader will look for it:
// a team can no longer INVENT a group. The retired screen's create dialog
// offered a free group name; a module settings page can only add values to the
// groups it declares. A team-invented group is unused by construction — nothing
// reads a word no module stores — so what is lost is the ability to make rows
// nothing consults. The three `"labels"` groups (Ticket status, Story status,
// Sprint status) have no page for the same reason and by the client's own
// ruling: *"labels are not in settings, you cannot adjust them from the app."*
//
// And Appearance stays first because a tab strip with nothing remembered opens
// on the tab to the left (her rule, 2026-09-06), and the tab somebody lands on
// by default should not be the rarest one.
//
// REBUILT INTO A REAL TAB STRIP, 2026-09-01 — the flat one-page-with-headings
// shape above gave way to one once the design kit's own Settings composition
// (shared/ui/compositions/screens/settings.tsx, ch26.05) named the shape: "a
// plain page-title header followed by the same underline tab strip used on
// every detail page's sub-tabs".
//
// FIVE TABS, in the order `tabsConfig` below declares them — which is the ONLY
// place that order lives. This list is the description, never the definition:
//
//   1. Appearance     — Mode, Sidebar and Scale, exactly as they were on the
//                        flat page, plus Language since 2026-09-10 (see the
//                        ruling above): four choices about how the app looks
//                        and reads to one person.
//   2. Team           — the team's PEOPLE and their RIGHTS, in two containers
//                        on one page: the members gallery
//                        (web/components/team/members-gallery.tsx) and the
//                        roles matrix (web/components/team/roles-matrix.tsx).
//                        It was called "Members & roles" and drew the team
//                        area's own two recipe LISTS a second time; both are
//                        gone — "This whole tab under settings, just call it
//                        Team" and "Everything should be in different
//                        containers… not taken anywhere else" (client,
//                        2026-09-09).
//                        THIS TAB IS THE ONLY DOOR to member management. It
//                        carries every act on a person — change role and remove
//                        on the member's own full-screen profile, which a card
//                        on the gallery links to
//                        (web/components/team/member-screen.tsx), and revoke a
//                        pending invite on the toolbar's Invites list — because
//                        the team area's own Members/Invites screens are linked
//                        to by nothing else
//                        (R64 · `sections-have-a-door`; that file has the
//                        account of the regression that earned the law).
//                        "This team"
//                        below the two containers is what is LEFT of the team
//                        area after that: `adminSections`, derived, and today
//                        exactly one row — Internal rates. It is not a door to
//                        anything else, and nothing on this tab depends on it
//                        continuing to exist.
//                        INVITES left "This team" on 2026-09-09 — "the invites,
//                        make it secondary button on the toolbar" — and is a
//                        button in the members toolbar now.
//   3. Integrations   — Access tokens and the Google connection: both are a
//                        PERSON connecting something outside the app to their
//                        own account, which is what the word means here.
//   4. Modules        — the index; see the paragraph above for the word, the
//                        position and the ruling.
//                        A FIFTH TAB, "Choices", stood after this one and was
//                        retired on 11 Sep 2026 — see the paragraph above.
//                        `ManageDropdownsLink` used to open it via
//                        `?tab=choices` and now points at the module settings
//                        page that owns the group the form is asking about.
//
// NOTIFICATIONS IS GONE, on purpose (client ruling, 2026-09-01) — it was never
// live content in this app, only a tab named in the design kit's own reference
// composition, and dropping it was confirmed rather than an oversight.
//
// LINE TABS, A DELIBERATE EXCEPTION FOR THIS SCREEN. Every OTHER main/
// collection screen in the app takes the FOLDER variant (tabs-view.tsx's own
// default) because its strip switches between records or between
// collections; Settings' four tabs switch between SETTINGS SECTIONS instead,
// which is the exact carve-out that file's own doc already states for the
// line variant. Rather than naming that variant literally a second time (the
// thing web/test/rules.test.ts's "tab shape is decided in one place" census
// exists to catch), this spreads `RECORD_TABS_CONFIG` — the one constant
// record-chrome.tsx already declares for exactly this override — so the
// line strip's visual spec (underline weight, rounded ends, label colour,
// all fixed the same night as this rebuild) can only ever be tuned in the
// one place it already lives.
//
// A content component rendered inside the one deep-link shell (the shell
// provides the AppShell chrome).

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import { CardGrid } from "@shared/ui/components/card-grid/card-grid"
import { Headline } from "@shared/ui/components/typography/typography"
import { Icon } from "@shared/web/screen-engine/icon"
import { InAppLink } from "@/components/shell/in-app-link"
import { List } from "@shared/web/list-compat"
import { CaretRight } from "@shared/ui/foundations/icons"

import { AccessTokensSection } from "@/components/team/access-tokens"
import { GoogleConnectionsSection } from "@/components/knowledge/google-connections"
import { InvitationsPanel, useReceivedInvites } from "@/components/team/invitations"
import { letterMark } from "@/lib/identity"
import { softNavigate } from "@/lib/nav"
import { CONCEPT_ICON, TEAM_SECTIONS } from "@/lib/pages"
import { usePermissions } from "@/lib/perms"
import { auth } from "@/lib/api"
import { TEAM_SCREENS_HIDDEN } from "@shared/product"
import type { ActiveTeam } from "@/lib/use-active-team"
import { ThemeSection } from "@shared/web/theme-section"
import { ScaleSection } from "@shared/web/scale-section"
import { SpineSection } from "@shared/web/spine-section"
import { LanguageSection } from "@shared/web/language-section"
import { useLanguage } from "@shared/web/language"
import { useRemembered } from "@shared/web/remembered"

import { RECORD_TABS_CONFIG } from "@/components/records/record-chrome"
import { TabsView } from "@shared/web/screen-engine/tabs-view"
import { NoAccess } from "@/components/deep-link/screen-bits"
import { MembersGallery } from "@/components/team/members-gallery"
import { moduleSettingsIndex } from "@/components/screens/module-settings-screen"
import { RolesMatrix } from "@/components/team/roles-matrix"
import { useScreenData } from "@/lib/use-screen-data"

/** THE NARROWEST A MODULE CARD MAY BE before the Modules wall drops a column.
 *
 * The members gallery next door measures its own (`MIN_CARD`) against a round
 * mark and two centred lines; this cell is a glyph, a name, and a line that
 * LISTS the page's sections, which is a phrase rather than a name. 16rem is the
 * kit's smaller figure (210px, the one that survives a phone) with room for
 * that line to sit on one row at the common case rather than truncating on the
 * first card. Its own constant rather than the gallery's, because the two are
 * measuring different cells and a shared number would tie them together by
 * accident. */
const MIN_MODULE_CARD = "16rem"

export function SettingsScreen({
  active,
  initialTab,
}: {
  active: ActiveTeam
  /** From the URL's `?tab=` (deep-link-screen.tsx) — the same mechanism
   * `KwapsoScreen`'s own `initialTab` uses, so a link can open Settings
   * straight onto one tab. An explicit link always wins over whatever tab a
   * previous visit remembered. (`ManageDropdownsLink` was this prop's one
   * caller, via `?tab=choices`; since 11 Sep 2026 it opens `/settings/<segment>`
   * instead, which is a screen rather than a tab. The mechanism stays — it is
   * the same one `KwapsoScreen`'s own `initialTab` uses, and a saved
   * `?tab=team` link is still somebody's bookmark.) */
  initialTab?: string
}) {
  const { t } = useLanguage()
  const { ctx } = active
  const pendingInvites = useReceivedInvites().data ?? []
  const teamId = ctx?.team?.id ?? null
  const { can } = usePermissions(teamId)

  // Remembered with the screen (web/lib/nav-memory.ts) — reopening Settings
  // lands back on whichever tab was open, unless the URL names one.
  const [tab, setTab] = useRemembered("tab", initialTab ?? "appearance", (remembered) =>
    initialTab ? initialTab : typeof remembered === "string" ? remembered : undefined
  )

  // MEMBERS + ROLES — ONE READ, TWO CONTAINERS. `useScreenData` loads members
  // only "on its own module" (its own doc), which `module: "members"` turns on;
  // roles load across the whole team area regardless, so this one call feeds
  // both containers below and neither of them opens a door of its own for
  // something the tab has already fetched (R56).
  //
  // IT USED TO FEED TWO `ScreenRenderer`s — the same recipes the team area's own
  // /t/<teamId>/members and /roles routes draw through, mounted a second time
  // here. Both are gone. A recipe list draws ROWS that OPEN A RECORD, and
  // opening a record is exactly what the client told us to stop doing on this
  // tab: "Everything should be in different containers… not taken anywhere
  // else" (2026-09-09). The two containers below are what she approved instead.
  const { membersQ, rolesQ } = useScreenData({
    teamId,
    enabled: !!teamId,
    module: "members",
    recordId: null,
    ancestorModules: [],
  })
  const roles = rolesQ.data ?? []
  const members = membersQ.data ?? []

  // THE TEAM'S OWN ADMIN NOT GIVEN A CONTAINER OF ITS OWN — Internal rates, and
  // whatever the registry gains next. DERIVED rather than hand-listed for the
  // reason this list always was: a section added to the registry appears here
  // the day it is added.
  //
  // THREE KEYS ARE SUBTRACTED AND EACH ONE FOR ITS OWN REASON. `members` and
  // `roles` are the two containers on this tab. `invites` LEFT THIS LIST on
  // 2026-09-09 — "the invites, make it secondary button on the toolbar" — so it
  // is a button in the members toolbar now rather than a row that navigates.
  // `overview` is not subtracted here any more because it no longer exists at
  // all: the team-overview screen was deleted the same day ("This overview
  // about the team should not even exist"), and web/lib/pages.ts carries the
  // whole of that decision.
  const adminSections = TEAM_SECTIONS.filter(
    (s) =>
      s.placement === "tab" &&
      !["members", "roles", "invites"].includes(s.key) &&
      can(s.module, "read")
  )

  // SWITCH TO A TEAM AND LAND ON ITS OWN PAGE. It used to land on `/t/<teamId>`
  // — the team overview, deleted on 2026-09-09 — so it lands on the agency's own
  // Details page instead, which titles itself with the team you just switched
  // to and is therefore the one screen that PROVES the switch happened.
  async function openTeam(teamId: string) {
    if (teamId !== ctx?.team?.id) await active.switchTeam(teamId)
    softNavigate("/kwapso")
  }

  if (!ctx) return null

  const tabsConfig = {
    ...RECORD_TABS_CONFIG,
    tabs: [
      { value: "appearance", label: t("Appearance"), icon: "palette", badge: "", badgeVariant: "" as const },
      // "This whole tab under settings, just call it Team." (client,
      // 2026-09-09). The VALUE moved with the word — a tab whose id says
      // `members` and whose label says Team is the next reader's wrong guess,
      // and `?tab=` links to it are ours (settings-screen is the only writer),
      // so there is nothing outside this file to keep in step.
      { value: "team", label: t("Team"), icon: "users-three", badge: "", badgeVariant: "" as const },
      { value: "integrations", label: t("Integrations"), icon: "key", badge: "", badgeVariant: "" as const },
      // THE INDEX (client, 2026-09-09) — see this file's header for the word,
      // the position, and for the Choices tab that stood after it until
      // 11 Sep 2026 and has now been folded INTO it. The glyph is NOT a
      // choice made here: `modules` is already a key in `TAB_ICONS`
      // (shared/web/screen-engine/tabs-view.tsx, drawn as `cube` for a tool
      // record's own Modules tab), and that table WINS over anything a call
      // site passes. Spelled out anyway so the two agree on the page rather
      // than by accident — the same word draws the same glyph everywhere,
      // which is the whole reason that table exists.
      { value: "modules", label: t("Modules"), icon: "cube", badge: "", badgeVariant: "" as const },
      // THE "CHOICES" TAB STOOD HERE AND WAS RETIRED ON 11 SEP 2026, at the
      // client's ruling: *"implement this module settings across app … end goal
      // kill the big tab 'choice options'."* It held the team's WHOLE
      // vocabulary — eighteen groups, most of which belong to no module a
      // reader was thinking about — and that is the thing she was ending.
      // Every group whose words a record actually stores is edited on that
      // module's own settings page, reached from the Modules tab beside this
      // line or from the gear on the module's own screen (R61's two doors).
    ],
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* MAIN-SCREEN TITLE — the kit's own named "Page title" step (56/500,
          collection-heading.tsx's own note has the full ruling), no eyebrow,
          no chips/pills, no black activity footer: Settings is a MAIN screen
          (it's in the navbar, it has no breadcrumb record, no identity chip),
          never a detail screen, so it takes exactly the title treatment every
          other main screen does. */}
      <Headline as="h1" size="display-m">{t("Settings")}</Headline>

      {/* Invitations sit above the tabs, not inside one: something waiting
          for YOU is not a settings section to click into, it's the reason
          you might be here at all. Disappears when there is none, which is
          nearly always. */}
      {pendingInvites.length > 0 && (
        <section className="motion-panel-in flex flex-col gap-4">
          <h2 className="text-muted-foreground text-micro uppercase">{t("Invites waiting for you")}</h2>
          <InvitationsPanel refresh={active.refresh} />
        </section>
      )}

      <TabsView
        config={tabsConfig}
        value={tab}
        onValueChange={setTab}
        renderPanel={(panel) => {
          if (panel.value === "appearance") {
            return (
              <div className="flex flex-col gap-8">
                {/* HOW BIG THE APP IS (CHECKLIST 10.3). One root font size moves
                    text and spacing together, and because the viewport is
                    locked against pinch to zoom this is the only way anybody
                    can make this app bigger. */}
                <ScaleSection value={active.user?.scale ?? null} save={(scale) => auth.setScale(scale)} />

                {/* LIGHT / DARK / SYSTEM. The owner's own instruction: a
                    preference about how the app looks, in the one place a
                    person goes to change how the app looks. `ThemeSection`
                    draws the same visual option cards Sidebar and Size do
                    here; the profile menu keeps the plain `<ModeToggle />`
                    segmented control, which is the right shape for a menu
                    reached mid-task rather than a settings page. */}
                <ThemeSection />

                {/* THE SIDEBAR'S COLOUR — mango or quiet (client ruling
                    D3, cut from three to two at v1.2.28). Persisted the same way Scale is, on the person's own
                    row, so it follows them between devices. `app-shell.tsx`
                    reads this same field to paint the real rail. */}
                <SpineSection
                  value={active.user?.spine ?? null}
                  save={async (spine) => {
                    // Unlike Scale, applying the choice has no document-level
                    // side effect to fire optimistically (app-shell.tsx reads
                    // the rail's spine off `active.user`, not off a DOM
                    // attribute this component could set itself) — so the
                    // live update this tab sees comes from `active.refresh()`
                    // rather than from realtime, which local dev doesn't even
                    // proxy. Awaited: the section's own `saving` state should
                    // cover the whole round trip, card press to rail repaint.
                    await auth.setSpine(spine)
                    await active.refresh()
                  }}
                />

                {/* THE LANGUAGE YOU READ KWAPSO IN — the fourth choice a person
                    makes about how this app looks to them, and the client's own
                    ruling on 2026-09-10: *"language shoudl be in settings
                    somewhere, not in my porfile"*. Size, light or dark, the
                    sidebar's colour and the words themselves are one kind of
                    thing — each is per-person, each follows you between devices
                    off your own row, and none of them changes what anybody else
                    sees — so they belong on one panel rather than one here and
                    one on a page you reach from the profile menu.

                    LAST, because it is the choice made once and then forgotten,
                    while the three above it are the ones somebody comes back to.
                    It brings its own container (`bg-surface-panel`) where the
                    three above draw option cards, which is the shape a Select
                    needs; the portal keeps its own compact twin in the header
                    (`shared/web/language-menu.tsx`), because the portal has no
                    settings screen at all. */}
                <LanguageSection save={(lang) => auth.setLanguage(lang)} />
              </div>
            )
          }

          if (panel.value === "team") {
            return (
              <div className="flex flex-col gap-8">
                {/* TWO CONTAINERS ON ONE TAB, AND NOTHING NAVIGATES — the
                    client's own instruction, 2026-09-09: "Everything should be
                    in different containers, like the different sections and
                    member roles on this single page, not taken anywhere else."

                    MEMBERS FIRST, because inviting somebody is what this tab is
                    for and the tab's one mango lives in that container's
                    toolbar. ROLES SECOND, as a matrix of every role at once —
                    "All the roles together, I want to have an overview" — with
                    a QUIET New role button, because the kit rules one mango per
                    view and she ruled on the exception herself: "No exceptions
                    to the rules. It was my mistake."

                    Each container owns its own reads past the two this screen
                    already made, its own toolbar and its own dialogs; this
                    panel is the arrangement and nothing else. */}
                {!can("team_members", "read") ? (
                  <NoAccess />
                ) : (
                  <MembersGallery
                    teamId={teamId ?? ""}
                    members={members}
                    membersLoading={membersQ.data === undefined && !membersQ.error}
                    membersError={membersQ.error}
                    onRetryMembers={() => membersQ.refresh()}
                    roles={roles}
                    canInvite={can("team_members", "create")}
                    // REVOKING A PENDING INVITE, which is the one act still on
                    // this container (2026-09-10). It is the person's own
                    // `team_members` right and NOT `commercials:read`, which is
                    // what the only remaining door into the team area happened
                    // to be gated on — web/components/team/member-screen.tsx
                    // has the whole account of that regression, and carries the
                    // other two acts on the member's own profile now.
                    canRemoveMembers={can("team_members", "delete")}
                  />
                )}

                {!can("member_roles", "read") ? (
                  <NoAccess />
                ) : teamId ? (
                  <RolesMatrix
                    teamId={teamId}
                    roles={roles}
                    rolesLoading={rolesQ.data === undefined && !rolesQ.error}
                    canCreate={can("member_roles", "create")}
                  />
                ) : null}

                {/* WHAT ELSE IS ON THIS TEAM'S OWN ADMIN — see the note on
                    `adminSections` above for which keys are subtracted and why
                    each one is. */}
                {teamId && adminSections.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <Headline as="h2" size="h4">{t("This team")}</Headline>
                    <List
                      surface="none"
                      className="rounded-[var(--radius)] bg-surface-panel"
                      onItemClick={(item) => softNavigate(`/t/${teamId}/${item.id}`)}
                      items={adminSections.map((s) => ({
                        id: s.segment,
                        title: t(s.title),
                        trailing: <CaretRight className="text-muted-foreground size-4" />,
                      }))}
                    />
                  </section>
                )}

                {/* THE TEAMS YOU ARE IN. Hidden, not deleted: the constant is
                    the whole of the switch, the list below is exactly what it
                    was, and flipping TEAM_SCREENS_HIDDEN to false in
                    shared/product.ts brings it back whole.
                    web/test/one-team.test.ts holds both halves of that
                    decision. */}
                {!TEAM_SCREENS_HIDDEN && (
                  <section className="flex flex-col gap-3">
                    <Headline as="h2" size="h4">{t("Teams")}</Headline>
                    <List
                      surface="none"
                      className="rounded-[var(--radius)] bg-surface-panel"
                      onItemClick={(item) => void openTeam(item.id)}
                      items={ctx.teams.map((team) => ({
                        id: team.id,
                        image: team.logoUrl,
                        imageAlt: team.name,
                        initials: letterMark(team.name),
                        title: (
                          <span className="flex items-center gap-2">
                            <span className="truncate">{team.name}</span>
                            {team.id === ctx.team?.id && (
                              <Badge variant="secondary" className="text-badge">
                                {t("Active")}
                              </Badge>
                            )}
                          </span>
                        ),
                        trailing: <CaretRight className="text-muted-foreground size-4" />,
                      }))}
                    />
                  </section>
                )}
              </div>
            )
          }

          if (panel.value === "integrations") {
            return (
              <div className="flex flex-col gap-8">
                <AccessTokensSection teamName={ctx.team?.name ?? null} />
                {/* Beside Access tokens on purpose: both are things a PERSON
                 * connects to their own account, and both hand something the
                 * power to act as them. */}
                <GoogleConnectionsSection teamId={ctx.team?.id ?? null} />
              </div>
            )
          }

          if (panel.value === "modules") {
            // THE INDEX. One row per module that has something to set FOR THIS
            // READER, derived — never listed. `moduleSettingsIndex` is
            // `MODULE_SETTINGS` put through the same `visibleModuleSettings`
            // the gear on each module's own screen asks, so the row and the
            // gear appear and disappear together, including on permissions:
            // somebody who may see tickets but not the team's vocabulary gets
            // neither. Nothing about `selectable_data` is spelled out here on
            // purpose — a second copy of the gate is how two doors start
            // disagreeing (R61 holds this to one expression).
            const modules = moduleSettingsIndex(can)

            // NOTHING TO SHOW AND NOTHING TO EXPLAIN. The same answer the
            // module settings PAGE gives a reader it refuses (`NoAccess` on
            // `/settings/<segment>`), and for the same reason —
            // "no module has settings you may change" and "no module has
            // settings" are not worth telling apart on screen, and telling them
            // apart would disclose which modules this team has configured.
            // ON PAPER, LIKE THE WALL IT STANDS IN PLACE OF (R67). The refusal
            // is this tab's other branch, and the branch with nothing in it is
            // the one the law was earned by: `access-tokens.tsx` drew its rows
            // on soft paper and its zero on the page, so "is there a panel on
            // this tab" answered yes and described the screen nobody was
            // looking at. Same inset as the wall, so a reader who is refused
            // and a reader who is not are standing on the same sheet.
            if (modules.length === 0)
              return (
                <div className="rounded-[var(--radius)] bg-surface-panel p-6 lg:p-[var(--space-7)]">
                  <NoAccess />
                </div>
              )

            return (
              <div className="flex flex-col gap-4">
                {/* THE SENTENCE THAT MAKES ONE ROW READ AS FINISHED. Today
                    Tickets is the only module with anything to set, so this list
                    has exactly one row — correct, and it would look like a bug
                    without a line saying what the list is FOR. It says three
                    things and each is load-bearing: the list holds the modules
                    with something to set (so a short list is the answer, not a
                    truncation), a row is the same page as that module's gear (so
                    a reader who found it the other way is not looking at a
                    second copy), and a module with nothing to set is absent (her
                    own ruling, *"Only the ones with something to set"*, said out
                    loud rather than left to be inferred from a gap). */}
                <p className="text-muted-foreground text-sm">
                  {t(
                    "The modules with something to set. Each row opens the same page as the gear on that module's own screen, and a module with nothing to set is not listed."
                  )}
                </p>

                {/* A WALL OF CARDS, EACH WITH ITS MODULE'S ICON — client,
                    2026-09-10: *"the settings / modules i want in the same
                    component kinda grid like team members, each with its
                    icon."* It was the same `<List>` "This team" draws one tab
                    to the left, and she has now named a different shape for
                    this one.

                    THE SAME COMPONENT, LITERALLY. `CardGrid` is the kit part
                    the members gallery is built on
                    (`web/components/team/members-gallery.tsx`), reached the
                    same way — `fluid`, so the wall chooses its own column
                    count from the cell width rather than stranding a lone card
                    on the fixed three-column ladder. That file's own note
                    carries the argument; this is the second caller, not a
                    second grid.

                    `MIN_MODULE_CARD` IS WIDER THAN A MEMBER'S. A member's cell
                    is a round mark and two centred lines; this one carries a
                    subtitle that lists the page's sections ("Ticket types"),
                    which is a phrase rather than a name. 16rem is the kit's
                    smaller figure (210px) plus room for that line to sit on
                    one row at the common case.

                    A REAL ANCHOR, WHICH THE ROW WAS NOT. This used to be a
                    `List` with `onItemClick`, and the comment here said so at
                    length: the kit's row has no href, so the index could not be
                    middle-clicked or copied while the gear pointing at the same
                    page could. Owning the cell means owning that too —
                    `InAppLink` (R37) is what the gear already uses, so both
                    doors onto one page are now the same kind of door.

                    THE ICON IS DERIVED AND NOT DECLARED. `CONCEPT_ICON` is the
                    app's one icon vocabulary, keyed by concept, and a settings
                    segment IS a module key — so the card wears the glyph the
                    nav rail and every tab already use for that module, without
                    this panel or `MODULE_SETTINGS` naming one. A segment the
                    vocabulary has never heard of falls back to the gear, which
                    is what a settings page is; R61 (ii) is untouched because
                    nothing here spells a segment. */}
                {/* THE GROUND THE WALL STANDS ON — client, 2026-09-10:
                    *"remember in settings modules card, needs container
                    background."* Her third saying of one sentence (the Team
                    tab, then Settings › Integrations, which became R67), and
                    the first one R67 could not see: the law's subject is a
                    `<section>` carrying a heading, and a TAB PANEL has no
                    heading of its own — it is titled by the strip above it.
                    Every settings tab was invisible to the law by
                    construction. R67 is widened to the panel body in the same
                    change as this fix; the comment in
                    `web/test/sections-stand-on-paper.test.ts` carries the
                    argument.

                    `tone="panel"` IS THE KIT'S OWN ANSWER, NOT A WRAPPER WE
                    BUILT. `CardGrid` already has the variant, and its source
                    describes this exact failure: "`panel` is for a wall
                    standing on the PAGE, where a `--card` cell measures 1.000
                    against the page tone and would be held up by its shadow
                    alone." That is not a risk here, it is what was shipping:
                    the cells are `Card variant="raised"` (`bg-card`), and in
                    LIGHT `--card`, `--surface-raised` and `--background` are
                    all #FFFEF9 — the identical 1.000 the Team tab measured
                    before `team-panel.tsx` was written, one tab over.

                    THE TWO TONES STAY TWO. §2.6 gives the app two paper tones
                    and no third, so the container takes the PANEL tone
                    (`--surface-panel`) and the cards keep `raised` — soft
                    paper under off-beige, which is the same pairing
                    `CollectionFrame` and `TeamPanel` draw. A third tone here,
                    or panelling the cards instead of the ground, would
                    collapse the pair and the cards would stop reading as
                    cards. Measured on the running page, both palettes:
                    light  panel #F7F2EB on page #FFFEF9 1.103, raised card
                    #FFFEF9 on panel 1.103; dark  panel #1C1B18 on page
                    #141310 1.079, raised card #26241F on panel 1.111.

                    THE SENTENCE ABOVE STAYS OUTSIDE THE BOX. It is the
                    panel's caption, the same position the heading takes on
                    the Team tab's "This team" section and the same shape
                    `CollectionFrame` draws everywhere — title out, content on
                    paper. R67 excludes prose from containment for exactly
                    this reason. */}
                <CardGrid
                  fluid
                  tone="panel"
                  minItemWidth={MIN_MODULE_CARD}
                  label={t("Modules")}
                >
                  {modules.map(({ page, sections }) => (
                    <Card key={page.segment} variant="raised">
                      <InAppLink href={`/settings/${page.segment}`} className="block">
                        <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                          <Icon
                            name={
                              CONCEPT_ICON[page.segment as keyof typeof CONCEPT_ICON] ??
                              CONCEPT_ICON.settings
                            }
                            className="text-muted-foreground size-6"
                          />
                          {/* THE PAGE'S OWN NAME, so all three doors say the
                              same words: this card, the gear's tooltip and
                              accessible name, and the `<h1>` you land on. A
                              card whose label is the module and whose
                              destination is titled something else is the
                              smallest possible way to make one page feel like
                              two.

                              THE KIT'S OWN TITLE PART, not a `<span>` — R65
                              (`chip-above-title`). The law is about where a
                              chip sits relative to the title, and a title
                              hand-rolled into a span has no position a census
                              can read, so every card that stands for a record
                              names itself through `CardTitle`. `text-sm`
                              because the kit's step is chapter 13's 18/500 for
                              a full card and this is a cell on a wall — the
                              class carries the wall's own step, exactly as it
                              did when this was a span, and nothing about the
                              drawing changes. */}
                          <CardTitle className="text-sm">{t(page.title)}</CardTitle>
                          {/* WHAT IS ACTUALLY CONFIGURABLE THERE, in the words
                              the page's own section headings use — "Ticket
                              types" rather than a repeat of the module's name.
                              Off the FILTERED sections, so the line never
                              advertises a block this reader will not be shown.
                              The separator is punctuation and not a sentence,
                              so it is not a catalogue string; each name is one,
                              and each is already translated where
                              MODULE_SETTINGS declares it. */}
                          <span className="text-muted-foreground w-full truncate text-xs">
                            {sections.map((s) => t(s.title)).join(" · ")}
                          </span>
                        </CardContent>
                      </InAppLink>
                    </Card>
                  ))}
                </CardGrid>
              </div>
            )
          }

          return null
        }}
      />
    </div>
  )
}
