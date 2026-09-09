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
//   • THE TEAMS LIST is hidden rather than removed — shared/product.ts explains
//     at length why nothing underneath it was touched.
//
// A FIFTH TAB, "MODULES", 2026-09-09 — and it is an INDEX, not a fifth section.
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
// PLACED FIFTH, IMMEDIATELY BEFORE CHOICES, and nothing above it moved. Two
// reasons and they agree. Modules is the tab Choices is eventually folded INTO
// — *"the choices: yes, this would survive, but not as a general thing, but
// inside each module"* — so the two live next to each other until that move is
// scoped and reviewed, and the move is then a deletion rather than a
// re-ordering. And Appearance stays first because a tab strip with nothing
// remembered opens on the tab to the left (her rule, 2026-09-06), and the tab
// somebody lands on by default should not be the rarest one.
//
// NOT ABSORBING CHOICES YET, deliberately. She wants it eventually; it is a
// larger move (the general Choices editor holds every group in the team, most
// of which belong to no module that has a settings page today), and the pilot
// this tab indexes is still being reviewed. Doing both at once would put a
// reorganisation of the team's whole vocabulary inside the change that adds a
// list of one row.
//
// REBUILT INTO FOUR TABS, 2026-09-01 — the flat one-page-with-headings shape
// above gave way to a real tab strip once the design kit's own Settings
// composition (shared/ui/compositions/screens/settings.tsx, ch26.05) named
// the shape: "a plain page-title header followed by the same underline tab
// strip used on every detail page's sub-tabs". Four tabs, in this order:
//
//   1. Appearance     — unchanged: Mode, Sidebar and Scale, exactly as they
//                        were on the flat page.
//   2. Members & roles — the team area's own Members and Member-roles lists
//                        (web/components/deep-link/collection-content.tsx),
//                        reused rather than rebuilt, stacked as two sections
//                        on one scrolling tab instead of two destinations one
//                        level down. Invites and Internal rates — the rest of
//                        "This team" — stay reachable as plain links here,
//                        since neither earned a tab of its own; the Teams
//                        list (hidden by TEAM_SCREENS_HIDDEN) rides along
//                        beside them, exactly as it always has.
//   3. Integrations   — Access tokens and the Google connection: both are a
//                        PERSON connecting something outside the app to their
//                        own account, which is what the word means here.
//   4. Choices        — formerly "Dropdown values", formerly its own tab on
//                        the team area's strip
//                        (web/components/choices/selectable-screen.tsx
//                        explains the rename and the move). This
//                        is the one door to it now; ManageDropdownsLink and
//                        every other in-app shortcut open straight to it via
//                        `?tab=choices`.
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
import { Headline } from "@shared/ui/components/typography/typography"
import { List } from "@shared/web/list-compat"
import { CaretRight } from "@shared/ui/foundations/icons"

import { AccessTokensSection } from "@/components/team/access-tokens"
import { GoogleConnectionsSection } from "@/components/knowledge/google-connections"
import { InvitationsPanel, useReceivedInvites } from "@/components/team/invitations"
import { letterMark } from "@/lib/identity"
import { softNavigate } from "@/lib/nav"
import { TEAM_SECTIONS } from "@/lib/pages"
import { usePermissions } from "@/lib/perms"
import { auth } from "@/lib/api"
import { TEAM_SCREENS_HIDDEN } from "@shared/product"
import type { ActiveTeam } from "@/lib/use-active-team"
import { ThemeSection } from "@shared/web/theme-section"
import { ScaleSection } from "@shared/web/scale-section"
import { SpineSection } from "@shared/web/spine-section"
import { useLanguage } from "@shared/web/language"
import { useRemembered } from "@shared/web/remembered"

import { RECORD_TABS_CONFIG } from "@/components/records/record-chrome"
import { TabsView } from "@shared/web/screen-engine/tabs-view"
import { NoAccess } from "@/components/deep-link/screen-bits"
import { MembersGallery } from "@/components/team/members-gallery"
import { moduleSettingsIndex } from "@/components/screens/module-settings-screen"
import { RolesMatrix } from "@/components/team/roles-matrix"
import { useScreenData } from "@/lib/use-screen-data"
import { SelectableScreen } from "@/components/choices/selectable-screen"

export function SettingsScreen({
  active,
  initialTab,
}: {
  active: ActiveTeam
  /** From the URL's `?tab=` (deep-link-screen.tsx) — the same mechanism
   * `KwapsoScreen`'s own `initialTab` uses, so a link can open Settings
   * straight onto one tab (`ManageDropdownsLink` → `?tab=choices`). An
   * explicit link always wins over whatever tab a previous visit remembered. */
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
      // the position and why Choices is not folded in yet. The glyph is NOT a
      // choice made here: `modules` is already a key in `TAB_ICONS`
      // (shared/web/screen-engine/tabs-view.tsx, drawn as `cube` for a tool
      // record's own Modules tab), and that table WINS over anything a call
      // site passes. Spelled out anyway so the two agree on the page rather
      // than by accident — the same word draws the same glyph everywhere,
      // which is the whole reason that table exists.
      { value: "modules", label: t("Modules"), icon: "cube", badge: "", badgeVariant: "" as const },
      { value: "choices", label: t("Choices"), icon: "git-commit", badge: "", badgeVariant: "" as const },
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
            // Choices tab gives a reader it refuses, and for the same reason —
            // "no module has settings you may change" and "no module has
            // settings" are not worth telling apart on screen, and telling them
            // apart would disclose which modules this team has configured.
            if (modules.length === 0) return <NoAccess />

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

                {/* THE SAME LIST TREATMENT "This team" TAKES one tab to the
                    left — `surface="none"` on the named panel ground, the kit's
                    one rectangular radius, a caret to say the row goes
                    somewhere. Two indexes on one screen that looked different
                    would be two ideas; they are one.

                    A ROW IS A CLICK AND NOT AN ANCHOR, which the gear IS
                    (`InAppLink`, so it can be middle-clicked and copied). That
                    is a real difference and it is the list component's, not a
                    decision taken here: the kit's `List` exposes `onRowSelect`
                    and has no href for a row. Written down rather than quietly
                    accepted — the fix is an href on the kit's row, upstream, and
                    it would improve every list in the app at once. */}
                <List
                  surface="none"
                  className="rounded-[var(--radius)] bg-surface-panel"
                  onItemClick={(item) => softNavigate(`/settings/${item.id}`)}
                  items={modules.map(({ page, sections }) => ({
                    id: page.segment,
                    // THE PAGE'S OWN NAME, so all three doors say the same
                    // words: this row, the gear's tooltip and accessible name,
                    // and the `<h1>` you land on. A row whose label is the
                    // module and whose destination is titled something else is
                    // the smallest possible way to make one page feel like two.
                    title: t(page.title),
                    // WHAT IS ACTUALLY CONFIGURABLE THERE, in the words the
                    // page's own section headings use — "Ticket types · Ticket
                    // statuses" rather than a repeat of the module's name. Off
                    // the FILTERED sections, so the line never advertises a
                    // block this reader will not be shown. The separator is
                    // punctuation and not a sentence, so it is not a catalogue
                    // string; each name is one, and each is already translated
                    // where MODULE_SETTINGS declares it.
                    subtitle: sections.map((s) => t(s.title)).join(" · "),
                    trailing: <CaretRight className="text-muted-foreground size-4" />,
                  }))}
                />
              </div>
            )
          }

          if (panel.value === "choices") {
            if (!can("selectable_data", "read")) return <NoAccess />
            if (!teamId) return null
            return (
              <SelectableScreen
                teamId={teamId}
                onImport={() => softNavigate(`/t/${teamId}/import/selectable_data`)}
                onOpen={(id) => softNavigate(`/t/${teamId}/dropdowns/${id}`)}
                standalone={false}
              />
            )
          }

          return null
        }}
      />
    </div>
  )
}
