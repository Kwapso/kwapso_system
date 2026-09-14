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
// it. It was the fourth card in the Appearance tab; see the note below (the
// 2026-09-14 preview-led ruling) for where it stands now.
//
// PREVIEW-LED, 2026-09-14, IN TWO PASSES THE SAME DAY. Four Settings ·
// Appearance layouts, one client ruling: "for the settings design use
// preview led — put language first … Represent in the preview better the
// background … Create a new component in ui-ux if needed." SIZE, APPEARANCE
// (light/dark/system) AND BACKGROUND collapsed from three boxes of option
// cards into ONE shared live preview (`AppearancePreview`, kit v1.2.77,
// reworked in v1.2.78 after she saw it live and called it "shit" beside a
// reference she liked better). "Put language first" shipped as its own
// SECOND container above that one, and she corrected it once she saw it:
// "What I meant by language first was inside the container, just to make it
// the top section: Language · Size · Appearance · Background." ONE
// container, four sections — `AppearancePanel` (`shared/web/appearance-panel.tsx`)
// now owns all four, Language included; see that file's own header for the
// full account, including the kit round trip and why Language sits in the
// control column rather than above the preview row.
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
//   1. Appearance     — Language first, then one shared live preview beside
//                        compact Size / Appearance / Background controls
//                        since the 2026-09-14 preview-led ruling above: four
//                        choices about how the app looks and reads to one
//                        person, still, just no longer four separate boxes.
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
//                        THE "THIS TEAM" LIST BELOW THE TWO CONTAINERS IS GONE,
//                        2026-09-14. It used to link into the team area's own
//                        Members/Member roles/Invites screens, subtracted down
//                        to nothing once Internal rates left with the account
//                        rate card on 10 Sep 2026 — but the collection SCREENS
//                        those three would have opened were still reachable by
//                        address, still drawing their own top tab strip, and a
//                        client screenshot of exactly that page is the ruling
//                        that closes this out: "what is this? told you to kill
//                        it. Now this only lives on settings / team." Both
//                        halves went together — web/lib/pages.ts carries the
//                        TEAM_SECTIONS change and what each of the three now
//                        resolves to instead.
//                        INVITES left "This team" on 2026-09-09 — "the invites,
//                        make it secondary button on the toolbar" — and is a
//                        button in the members toolbar now.
//   3. Integrations   — Access tokens and the Google connection: both are a
//                        PERSON connecting something outside the app to their
//                        own account, which is what the word means here.
//   4. Modules        — the index; see the paragraph above for the word, the
//                        position and the ruling.
//                        A TAB CALLED "CHOICES" STOOD AFTER THIS ONE AND WAS
//                        RETIRED ON 11 SEP 2026 — see the paragraph above.
//                        `ManageDropdownsLink` used to open it via
//                        `?tab=choices` and now points at the module settings
//                        page that owns the group the form is asking about.
//   5. Automations    — client ruling, 2026-09-14: "On Settings, add a tab
//                        for Automations and show all the automations in the
//                        system, filtered by module and by status." ONE
//                        COMPONENT, TWO MOUNTINGS — `ModuleAutomations`
//                        (module-automations.tsx) already drew this exact
//                        list scoped to a single module's own settings page;
//                        this tab is the SAME component, unscoped, so a
//                        toolbar built for one mounting (search, sort, the
//                        status filter with its later-arriving Protected
//                        state — "in automations filters everywhere, add
//                        filter to protected", the same day) is never built
//                        twice. `scope: { kind: "all", modules }` is the only
//                        difference from the per-module call, and `modules`
//                        is `moduleSettingsIndex(can)` narrowed to the pages
//                        that carry an automations section — the gear, the
//                        Modules tab's index and this tab all read the same
//                        `visibleModuleSettings` answer, so a reader who may
//                        see Tickets but not Meetings sees Tickets' ten rows
//                        here and none of the other module's, without this
//                        file asking `can(` a second time (R61's own
//                        argument, held here rather than restated).
//                        THE ESTATE'S OWN JOBS APPEAR TOO. `team` (titled
//                        "Housekeeping" on its own page) is an ordinary
//                        `MODULE_SETTINGS` entry with an automations section
//                        gated on `teams:update`, so `moduleSettingsIndex`
//                        already includes it for any reader who holds that
//                        right — the nightly sweep, the growth alarm and the
//                        fault report are AS visible here as any module's own
//                        automations, on the same terms as everywhere else in
//                        this table, rather than a special case carved out
//                        for this one tab.
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
import { CONCEPT_ICON } from "@/lib/pages"
import { usePermissions } from "@/lib/perms"
import { auth } from "@/lib/api"
import { TEAM_SCREENS_HIDDEN } from "@shared/product"
import type { ActiveTeam } from "@/lib/use-active-team"
import { AppearancePanel } from "@shared/web/appearance-panel"
import { useLanguage } from "@shared/web/language"
import { useRemembered } from "@shared/web/remembered"

import { RECORD_TABS_CONFIG } from "@/components/records/record-chrome"
import { TabsView } from "@shared/web/screen-engine/tabs-view"
import { NoAccess, ToolbarRow } from "@/components/deep-link/screen-bits"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { MembersGallery } from "@/components/team/members-gallery"
import { moduleSettingsIndex } from "@/components/screens/module-settings-screen"
import { SettingsChoicesPanel } from "@/components/screens/settings-choices-panel"
import { ModuleAutomations } from "@/components/screens/module-automations"
import { RolesMatrix } from "@/components/team/roles-matrix"
import { useScreenData } from "@/lib/use-screen-data"
import { AUTOMATIONS } from "@shared/automations"
import { formatCount } from "@shared/web/format-count"

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

  // THE MODULES WALL'S OWN TOOLBAR STATE — client, 11 Sep 2026: *"to modules in
  // settings, also add toolbar / no add buton / sort by - name"*. R48 is the law
  // that already said this ("the toolbar, including the search, should be
  // absolutely everywhere we have a data view or a collection view"), and it
  // could not see this wall: both of its censuses ask about a TAG — a
  // `BASE_RECIPES` entry carrying a `CollectionConfig`, or a `<ToolbarRow>` call
  // site — and a hand-built `CardGrid` of `<Card>`s is neither. There is now a
  // `<ToolbarRow>` on this panel, so the second census sees it from here on.
  //
  // DECLARED HERE RATHER THAN IN THE PANEL, because the panel is a BRANCH of
  // `renderPanel` — a render prop, called inside `TabsView`'s own render — and
  // a `useState` in one arm of a five-way dispatch is a hook whose position
  // moves with the open tab. The two containers this tab draws beside it
  // (`MembersGallery`, `RolesMatrix`) are components and hold their own; this
  // wall is drawn inline because R67's panel census reads what a branch
  // RETURNS, and a body it cannot see through is a body it reports as standing
  // on the bare page.
  const [moduleQuery, setModuleQuery] = React.useState("")
  // NAME, BOTH WAYS. The field is fixed and the DIRECTION is the live question —
  // see the `sort` slot below for the argument and for the two call sites in
  // `web/components/accounts/` that already ship a single-option control.
  const [moduleSortDir, setModuleSortDir] = React.useState<"asc" | "desc">("asc")

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

  // THE "THIS TEAM" LIST — AND THE TAB STRIP IT WAS FOR — ARE GONE, 2026-09-14.
  // This section used to derive `adminSections` from `TEAM_SECTIONS.filter(s
  // => s.placement === "tab" && …)`, but `members`/`roles`/`invites` were the
  // only rows that had ever carried `placement: "tab"` and all three were
  // already subtracted (Internal rates, the one row this list ever rendered,
  // went with the account rate card on 10 Sep 2026) — so the list had computed
  // to `[]` and drawn nothing for days before anyone noticed. The client's
  // ruling that killed the underlying strip too ("what is this? told you to
  // kill it. Now this only lives on settings / team", 2026-09-14 — see
  // web/lib/pages.ts) moved those three rows to `placement: "contextual"`,
  // which makes this filter permanently empty rather than merely empty today.
  // Removed instead of kept as inert scaffolding: TEAM_SECTIONS can carry a
  // `placement: "tab"` row again if a future section needs one, and this list
  // is one `.filter` away from coming back the day it does.

  // SWITCH TO A TEAM AND LAND ON ITS OWN PAGE. It used to land on `/t/<teamId>`
  // — the team overview, deleted on 2026-09-09 — so it lands on the agency's own
  // Details page instead, which titles itself with the team you just switched
  // to and is therefore the one screen that PROVES the switch happened.
  async function openTeam(teamId: string) {
    if (teamId !== ctx?.team?.id) await active.switchTeam(teamId)
    softNavigate("/kwapso")
  }

  // ── THE AUTOMATIONS TAB'S OWN MODULES — computed once, shared by the tab's
  // R16 count and the panel's own rows ─────────────────────────────────────
  //
  // Client, 2026-09-14: "On Settings, add a tab for Automations and show all
  // the automations in the system, filtered by module and by status."
  //
  // NEVER A SECOND GATE. `moduleSettingsIndex(can)` is `visibleModuleSettings`'s
  // own answer — R61 holds THAT to the one `can(` call in
  // module-settings-screen.tsx — narrowed here to the pages that carry an
  // "automations" kind section, the same test `ModuleSettingsScreen` itself
  // runs to decide whether to draw the Automations tab on a single module's
  // own page. A reader who may not see a module is never asked twice: they
  // simply get no row for it, from the one function that already knows.
  const automationModules = moduleSettingsIndex(can)
    .filter(({ sections }) => sections.some((s) => s.kind === "automations"))
    .map(({ page }) => ({ segment: page.segment, title: t(page.title) }))

  // R16 — THE TAB'S COUNT, drawn once, through the one seam. `AUTOMATIONS`
  // (shared/automations.ts) is the same registry `ModuleAutomations` itself
  // filters — a code constant, so the exactness R16 asks for is free, the
  // same argument module-settings-screen.tsx's own automations tab already
  // makes for a single module. THIS IS A DIFFERENT NUMBER FROM THAT ONE, not
  // a second copy of it: that tab counts one module's own rows, this counts
  // every row across every module this reader may see — two honest answers
  // to two different questions, never the same fact drawn twice.
  const automationsCount = AUTOMATIONS.filter((a) =>
    automationModules.some((m) => m.segment === a.segment)
  ).length

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
      //
      // THE FIFTH TAB, 2026-09-14 — see this file's header, bullet 5, for the
      // ruling and the one-component argument. `icon: "lightning"` is spelled
      // out even though `TAB_ICONS["automations"]` (tabs-view.tsx) already
      // resolves it — the same "spelled out anyway so the two agree on the
      // page rather than by accident" the Modules tab's own `cube` keeps, and
      // the identical bolt module-settings-screen.tsx already draws on a
      // single module's own Automations tab, so the glyph means the same
      // thing wherever this word appears.
      {
        value: "automations",
        label: t("Automations"),
        icon: "lightning",
        badge: formatCount(automationsCount),
        badgeVariant: "" as const,
      },
      // THE SIXTH TAB, 2026-09-14 — the client, pointing at the Contacts
      // table: "create a tab in settings with choices where we see all the
      // choices together… the value itself · module with the icon · status:
      // active, inactive, and are protected." `icon: ""` on purpose —
      // `TAB_ICONS["choices"]` (tabs-view.tsx) already resolves this word to
      // `git-commit`, the same glyph module-settings-screen.tsx's own
      // per-module Choices tab draws, and that table wins over anything a
      // call site passes. No badge: `settings-choices-panel.tsx` counts its
      // own rows once, through the kit panel's live "Showing X of Y" (R16),
      // the same register every other bounded, non-recipe collection in this
      // app uses (web/components/work/work-panels.tsx's Sprints/Apps
      // panels) — a second count here would be the same fact twice.
      { value: "choices", label: t("Choices"), icon: "", badge: "", badgeVariant: "" as const },
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
            // ONE CONTAINER, FOUR SECTIONS — client ruling, 2026-09-14, the
            // correction to the preview-led layout that shipped first: "What
            // I meant by language first was inside the container, just to
            // make it the top section: Language · Size · Appearance ·
            // Background." `AppearancePanel` (`shared/web/appearance-panel.tsx`)
            // now owns all four, Language included, in one `SettingsSection`
            // box beside the one shared live preview — see that file's own
            // header for the full account, including why Language sits in the
            // control column rather than above the preview row. Persisted the
            // same way the other three are, on the person's own row, so it
            // follows them between devices; the portal keeps its own compact
            // twin in the header (`shared/web/language-menu.tsx`), because the
            // portal has no settings screen at all.
            //
            // NO INNER TITLE — the same ruling `module-automations.tsx`'s own
            // call site answers a few lines below, about a different tab:
            // "please remove the title inside the collection. We will use the
            // title only at the top." The tab strip already names this panel
            // "Appearance"; `AppearancePanel` passes `hideTitle` to its own
            // `SettingsSection` now, so the box still labels itself for
            // assistive tech (`aria-label`) without drawing a second,
            // redundant "Appearance" heading one screen-height below the
            // first. See `settings-section.tsx`'s own header for the prop.
            //
            // SIZE, APPEARANCE AND BACKGROUND NOW STAGE BEHIND A SAVE BUTTON
            // — a second ruling the same day: "we need … some kind of save
            // button so that I can first preview it and, once I'm happy with
            // what I see, implement it across the app." `scaleValue`/
            // `saveScale` and `spineValue`/`saveSpine` below are unchanged —
            // still the same two doors, still read off `active.user` — but
            // `AppearancePanel` now calls them once, from its own Save,
            // rather than on every press. Language (`saveLanguage` below) is
            // the one exception: it keeps applying and persisting the moment
            // it is picked, her own explicit "keep language instant" —
            // `appearance-panel.tsx`'s header has the full account.
            return (
              <AppearancePanel
                saveLanguage={(lang) => auth.setLanguage(lang)}
                scaleValue={active.user?.scale ?? null}
                saveScale={(scale) => auth.setScale(scale)}
                spineValue={active.user?.spine ?? null}
                saveSpine={async (spine) => {
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

            // SEARCHED FIRST, THEN ORDERED — the same order every collection in
            // the app applies, and the same seam: a `SearchInput`, a piece of
            // component state, and one `.filter()` over the rows already in the
            // browser (`members-gallery.tsx`, the wall this one was built to
            // match, and all nine of `contact-panels.tsx`/`client-org-panel.tsx`'s
            // bespoke rows). Nothing new is written here.
            //
            // BY THE MODULE'S OWN NAME, and only that. The card used to carry a
            // second line — the page's section titles, "Ticket types ·
            // Automations" — which R72 was earned by (client, 2026-09-14: "In
            // settings, modules: delete this. Generally, I don't like
            // subtitles, so stop putting them unless I ask"); with it gone
            // there is nothing left to weigh a search box against.
            // `t(page.title)` rather than the raw key, so the search matches the
            // words actually on the card in the language actually on screen.
            const moduleQ = moduleQuery.trim().toLowerCase()
            const shownModules = modules
              .filter(({ page }) => !moduleQ || t(page.title).toLowerCase().includes(moduleQ))
              // `.filter()` above already returns a fresh array, so this sorts
              // our own copy and never `MODULE_SETTINGS`' own order.
              .sort(
                (a, b) =>
                  t(a.page.title).localeCompare(t(b.page.title)) *
                  (moduleSortDir === "asc" ? 1 : -1)
              )

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
              /* THE CONTAINER MOVED OUT OF THE WALL AND ROUND THE WHOLE PANEL,
                 AND THE TOOLBAR IS THE REASON — client, 11 Sep 2026: *"to
                 modules in settings, also add toolbar / no add buton / sort by
                 - name"*.

                 IT WAS `CardGrid tone="panel"`, WHICH CONTAINED THE WALL AND
                 NOTHING ELSE. That was the right answer to her previous ruling
                 ("remember in settings modules card, needs container
                 background") and it is the wrong shape to hang a toolbar off:
                 a `<ToolbarRow>` above that grid would have stood on the
                 SETTINGS PAGE GROUND, and the row's own pill is
                 `bg-surface-raised`. Measured on staging, light, 2026-09-11:
                 the shell's body pane is `--surface-raised` #FFFEF9 and
                 `--background` is #FFFEF9 — so the toolbar would have painted
                 itself at CONTRAST 1.000 against what it was standing on,
                 which is the exact pairing R67 was earned by, one control
                 along and invisible in the palette where it lives.

                 SO THE PANEL IS THE BOX AND THE WALL IS BARE — the shape the
                 members gallery next door already draws, and the shape she
                 named for this wall in the first place ("the settings /
                 modules i want in the same component kinda grid like team
                 members"). The box is the kit's own `Card` at its DEFAULT
                 variant, which is `bg-surface-panel` and the box radius, with
                 `CardContent`'s own untouched inset — `p-6 lg:p-[var(--space-7)]`,
                 the identical ladder `CardGrid`'s `tone="panel"` was spending
                 here and `TeamPanel` spends one tab over — so the box a reader
                 sees does not move by a pixel and not one number is typed at
                 this call site. The two tones stay two (§2.6): panel ground,
                 `raised` cells, and now a `raised` toolbar pill — 1.103 light,
                 1.111 dark, the numbers team-panel.tsx measured for the same
                 pairing.

                 KIT PARTS AND NOT `TeamPanel`, AND NOT `CollectionCard`, AND
                 BOTH REFUSALS ARE A CENSUS'S LIMIT RATHER THAN A PREFERENCE.
                 R67 resolves what a component paints by NAME off its own
                 declaration text: `TeamPanel` is a name TWO components in this
                 repo answer to (this law's own note says so) and the walk picks
                 the OTHER one, which paints nothing — measured, red, 11 Sep
                 2026; and `CollectionCard` paints through a `Card` it renders,
                 which that walk deliberately does not follow. A `<Card>` here
                 is read through its `cva` instead, which is exact. The cost is
                 written down rather than hidden: `CollectionCard` is the box
                 that PUBLISHES `--pinned-lead`/`--pinned-inset-x`, so this
                 panel's toolbar pins square and flush instead of carrying the
                 container's top band and rounded corners with it (R63 v/vi) —
                 exactly as the members gallery's own row does, for the same
                 reason. Only two files may name either property, so closing it
                 is a change to R63 and R67 together, not to this panel.

                 R67 IS UNTOUCHED AND STRICTER. This branch's body still stands
                 on paper.

                 THE CAPTION IS GONE — client, 2026-09-14, over this exact
                 sentence: *"In settings, modules: delete this. Generally, I
                 don't like subtitles, so stop putting them unless I ask."*
                 What it said is now R71's own job: *"The modules with
                 something to set. Each row opens the same page as the gear
                 on that module's own screen, and a module with nothing to
                 set is not listed"* is R61, verbatim, restated in prose
                 under a wall it was never asked to explain — the same
                 paraphrase shape settings-section.tsx's header found in all
                 fourteen module-settings descriptions ("every one of them
                 is a paraphrase of its own title"). A rule proven by a
                 machine does not also need to be narrated on the page. */
              <Card>
                <CardContent className="flex min-w-0 flex-col gap-4">
                  {/* THE ROW AND THE WALL IN ONE UNGAPPED COLUMN — R49. The gap
                      between a toolbar and what it sits above is ONE number and
                      the row pays it itself (`mb-[var(--toolbar-content-gap)]` on
                      its own root); this panel's `CardContent` is a `flex flex-col gap-4`, so a
                      row that were its direct child would be handed a second,
                      competing number for the same distance. That is the exact
                      double-spend R49 was written about, and it is invisible to
                      R49's own census here, which reads the nearest open
                      `<div>`/`<section>` and stops at a COMPONENT wrapper — see
                      this lane's report. So the pair still gets its own inner
                      column, unspent by `gap-4`, which the caption this file
                      used to hold below `<Card>`'s open tag was the last thing
                      that number reached (R71 removed it, 2026-09-14) — the
                      panel's own `gap-4` is now unclaimed rather than wrong,
                      and left rather than pulled, because a single-child flex
                      `gap` spends nothing and the wrapper still keeps this
                      pair's own layout independent of whatever `CardContent`
                      grows next to it. */}
                  <div className="flex min-w-0 flex-col">
                    {/* THE TOOLBAR — client, 11 Sep 2026: *"to modules in
                        settings, also add toolbar / no add buton / sort by -
                        name"*, and R48 before her: "the toolbar, including the
                        search, should be absolutely everywhere we have a data
                        view or a collection view."

                        NO `actions`, AND IT IS NOT A SLOT LEFT EMPTY. She said no
                        add button, and there is nothing here to create: these
                        rows are `MODULE_SETTINGS` put through `visibleModuleSettings`
                        (R61), a table in the source, so a `+` would be a control
                        with nothing behind it. R50 needs no entry for a slot a
                        collection genuinely has no act for.

                        AND IT PINS (R63), flush at the pane's top edge, because
                        nothing pins above it: this screen's tab strip is not a
                        collection strip and wears no `PINNED_STRIP_MARK`, so
                        `--pinned-chrome-h` resolves to the `0px` both front doors'
                        `globals.css` declare — measured on staging, 2026-09-11.
                        What does NOT ride along is R63 (v)/(vi)'s container band
                        and its rounded top corners: `--pinned-lead` and
                        `--pinned-inset-x` are published by `CollectionCard` and by
                        the kit panel and by nothing else (the law allows exactly
                        two files to name either property), so a toolbar inside a
                        this `<Card>` pins square and flush — identically to the
                        members gallery's own row one tab to the left, which has
                        done so since R63 shipped. Written down rather than fixed
                        here: closing it means either publishing the pair from a
                        third box (which the law forbids) or moving both walls into
                        `CollectionCard` (which R67's paint census cannot see
                        through, so it would report both panels as standing on the
                        bare page). That is a change to two laws, not to this
                        panel. */}
                    <ToolbarRow
                      // R50 — the collection's RAW count, before the search
                      // narrows it. It is guaranteed false here, because the
                      // `modules.length === 0` return above is the refusal branch
                      // and this row is only reached past it. Written as the
                      // DERIVED expression rather than the `empty={false}` literal
                      // its three cousins in `EMPTY_TOOLBAR_EXEMPT` carry: the
                      // literal needs a registry line to explain it and a reviewer
                      // to re-read that line the day the early return moves, and
                      // this says the same thing off the collection itself and
                      // keeps being true if it does.
                      empty={modules.length === 0}
                      search={
                        <SearchInput
                          value={moduleQuery}
                          onChange={(e) => setModuleQuery(e.target.value)}
                          onClear={() => setModuleQuery("")}
                          placeholder={t("Search modules…")}
                          className="w-full"
                        />
                      }
                      // ONE FIELD, AND THE CONTROL STILL DECIDES SOMETHING —
                      // *"sort by - name"*. A picker offering one option and
                      // nothing else would be R36's "a box that decides nothing"
                      // in a different costume; this is not that, because
                      // `SortControl` draws a DIRECTION button beside the field
                      // unless a caller passes `showDirection: false`, and
                      // `ToolbarRow` never does. So the chip is A→Z / Z→A on a
                      // wall of twelve, which is a real choice and is what a sort
                      // control with one field normally offers. Two call sites
                      // already ship exactly this and say so —
                      // `account-detail-panels.tsx` ("one order worth offering, so
                      // the FIELD is fixed and the DIRECTION is the live
                      // question") and `contact-panels.tsx`' meetings list — which
                      // is why `onValueChange` has nothing to do.
                      //
                      // AND NOT A SECOND FIELD SHE DID NOT ASK FOR. The card's
                      // subtitle lists the page's sections and would order the
                      // wall by a phrase most readers have never read; "sort by -
                      // name" is one field, and offering two would be this lane
                      // deciding something on her behalf.
                      sort={{
                        options: [{ value: "name", label: t("Name") }],
                        value: "name",
                        onValueChange: () => undefined,
                        direction: moduleSortDir,
                        onDirectionChange: setModuleSortDir,
                      }}
                    />
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

                      THE GROUND MOVED UP A LEVEL ON 11 SEP 2026, AND THE TONES
                      DID NOT MOVE AT ALL. It was `CardGrid tone="panel"`, the
                      kit's own answer, and that contained the WALL. The toolbar
                      she asked for the next day has to stand on the same paper
                      or it paints itself at 1.000 against the page (see this
                      branch's own head), so the box is now a kit `<Card>` round the
                      whole panel and the wall keeps `CardGrid`'s default
                      `tone="bare"` — "the ground is already paid for one level
                      up", which is the sentence `members-gallery.tsx` writes
                      about the identical wall one tab to the left. A second
                      `bg-surface-panel` inside this one would be the 1.000 all
                      over again, pointing the other way.

                      THE TWO TONES STAY TWO. §2.6 gives the app two paper tones
                      and no third, so the container takes the PANEL tone
                      (`--surface-panel`) and the cards keep `raised` — soft
                      paper under off-beige, which is the same pairing
                      `CollectionFrame` and `TeamPanel` draw. Measured on the
                      running page, both palettes: light panel #F7F2EB on page
                      #FFFEF9 1.103, raised card #FFFEF9 on panel 1.103; dark
                      panel #1C1B18 on page #141310 1.079, raised card #26241F on
                      panel 1.111. The toolbar's own pill is `--surface-raised`
                      and now reads against the same 1.103/1.111. */}
                    <CardGrid
                      fluid
                      minItemWidth={MIN_MODULE_CARD}
                      label={t("Modules")}
                      // THE FILTERED ZERO, AND ONLY THE FILTERED ONE. A team with
                      // no module settings at all never reaches here — the
                      // `modules.length === 0` branch above returns the refusal
                      // instead — so the only zero this wall can show is "your
                      // search matched nothing", which is R62's `filtered`
                      // register read through the kit's own `empty`/`emptyLabel`,
                      // the same pair the members gallery passes.
                      empty={shownModules.length === 0}
                      emptyLabel={t("No modules match what you're looking for.")}
                    >
                      {shownModules.map(({ page }) => (
                        <Card
                          key={page.segment}
                          variant="raised"
                          // A CARD THAT IS A LINK ACKNOWLEDGES THE POINTER —
                          // client, 2026-09-14, over this exact wall: "we are
                          // missing a hover state for the cards. For example,
                          // in settings modules, I would need to see a hover
                          // when I hover over a card."
                          //
                          // NOT `interactive` — see `members-gallery.tsx`'s
                          // identical note beside its own wall: that prop also
                          // grants `motion-hover-lift` (motion.css §13), and
                          // this is a WALL, the shape `app-tiles.tsx` already
                          // argued down to a fill-only wash for the same
                          // reason ("a grid of them lifting is the page of
                          // reacting boxes UI-RULEBOOK C2 exists to prevent").
                          // `--accent` is the same token `interactive` would
                          // have reached for; `motion-hover` is the kit's own
                          // transition class for it. Nothing here is invented.
                          className="hover:bg-accent motion-hover"
                        >
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
                              {/* NAME ONLY — R72 (`no-default-subtitles`). This used to
                                  carry a second line, the page's own section titles
                                  joined by " · " ("Ticket types · Automations"), read
                                  off the FILTERED `sections` this row already carries
                                  (so it never advertised a block this reader would not
                                  be shown). The client killed it outright, 2026-09-14,
                                  over this exact wall: "In settings, modules: delete
                                  this. Generally, I don't like subtitles, so stop
                                  putting them unless I ask." `sections` stays on the
                                  row's own type ABOVE — `moduleSettingsIndex` still
                                  filters a module out when it has none (R61 clause ii,
                                  "the index is derived") — it is simply no longer
                                  destructured here, because nothing in this JSX reads
                                  it any more. */}
                            </CardContent>
                          </InAppLink>
                        </Card>
                      ))}
                    </CardGrid>
                  </div>
                </CardContent>
              </Card>
            )
          }

          if (panel.value === "automations") {
            // ONE COMPONENT, TWO MOUNTINGS — see this file's header, bullet
            // 5. `ModuleAutomations` already draws this exact list, scoped to
            // one module's own settings page; here it is the same component
            // with `scope: { kind: "all", modules: automationModules }`,
            // which is the ONLY difference from that call
            // (module-settings-screen.tsx's own `{ kind: "module", segment }`).
            // The toolbar — search, sort by name, the status filter with its
            // three states including Protected — lives inside that one file
            // and is never redrawn here.
            //
            // NOTHING TO SHOW AND NOTHING TO EXPLAIN, the same refusal the
            // Modules panel gives above and for the same reason: a reader
            // with no automations-bearing module is not told whether that is
            // because the team has none or because they may see none of
            // them, which is `automationModules.length === 0` either way.
            if (automationModules.length === 0 || !teamId)
              return (
                <div className="rounded-[var(--radius)] bg-surface-panel p-6 lg:p-[var(--space-7)]">
                  <NoAccess />
                </div>
              )

            // NO `title` — client ruling, 2026-09-14, naming this exact tab:
            // "the title inside the collection" repeats the tab strip's own
            // "Automations" word, and "we will use the title only at the
            // top" is the whole of what she wants. `ModuleAutomations`'
            // `title` is optional for exactly this call (see its own doc);
            // omitting it leaves `<ToolbarRow title>`'s `heading` unbuilt, so
            // the row draws no h2 here. Nothing else changes: this tab is
            // the ONLY collection in its panel, and the panel is already
            // named "Automations" for assistive tech through Radix's own
            // tabpanel→tab `aria-labelledby` wiring, so there is no second
            // name for an `sr-only` heading to add — unlike Team's stacked
            // Members/Roles pair one tab over, which keeps one each because
            // nothing else on that panel tells the two collections apart.
            return (
              <ModuleAutomations
                teamId={teamId}
                scope={{ kind: "all", modules: automationModules }}
              />
            )
          }

          if (panel.value === "choices") {
            // ONE SEAM, ONE GATE — see settings-choices-panel.tsx's own
            // header for the full account. `can` is passed straight through
            // rather than asked again: R61 (iii)'s "the settings host holds
            // exactly one `can(` call" is written about
            // module-settings-screen.tsx, and the same discipline applies
            // here by the same argument — a reader who may see tickets but
            // not the vocabulary is refused by `moduleSettingsIndex(can)`
            // alone, never by a second permission spelled at this call site.
            return teamId ? <SettingsChoicesPanel teamId={teamId} can={can} /> : null
          }

          return null
        }}
      />
    </div>
  )
}
