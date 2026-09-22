"use client"

// ONE MODULE'S OWN SETTINGS, ON A PAGE OF ITS OWN.
//
// ── THE CLIENT'S RULING, 2026-09-09 ─────────────────────────────────────────
//
// Settings today are grouped by KIND — Appearance, Team, Integrations, Choices.
// She asked for a second grouping, by MODULE, and gave the reason in one
// sentence: *"a lot of them are specific to the module."* Nobody opens settings
// thinking "dropdowns"; they open it thinking "tickets are behaving wrong".
//
// Her four instructions, verbatim, and where each one landed:
//
//   • *"on each module, we have a settings gear… somewhere in the settings, we
//     have a tab that says 'Module' or 'Business Logic' to find the module
//     once."* — TWO ENTRANCES, ONE PAGE. The gear is built here
//     (`ModuleSettingsGear`, at the foot of this file) and placed on the
//     Tickets screen's own title line through
//     `web/components/records/collection-heading.tsx`, whose `action` prop
//     carries the argument for why it is there and not in the toolbar.
//
//     THE SECOND ENTRANCE — a Modules tab on
//     `web/components/screens/settings-screen.tsx` — IS BUILT, later the same
//     day, against the rest of her sentence: *"everything around settings
//     should be under settings screen concentrated (and 'quick access' through
//     the gear in each module) but not in random places across the app."* So
//     the gear is the SHORTCUT and the tab is the PLACE, and neither is a copy
//     of the other: the tab is an INDEX of rows, each row opening the very URL
//     that module's gear points at. One page, two entrances.
//
//     THE TAB IS CALLED "MODULES", and the word was picked rather than
//     defaulted to. She offered two — *"a tab that says 'Module' or 'Business
//     Logic' (or whatever you define as a good word)"* — and the app already
//     treats "module" as a first-class noun: `TEAM_MODULES` is the estate of
//     them, and the roles matrix on the Team tab has one COLUMN per module. So
//     on the settings screen the word now arrives twice, one tab apart, meaning
//     the same thing both times. "Business Logic" would have been a third name
//     for the same set, and a rule this app already lives by is that a thing
//     has one name.
//
//     THE INDEX IS DERIVED, WHICH IS THE WHOLE POINT OF IT. It reads
//     `moduleSettingsIndex` below — `MODULE_SETTINGS` filtered through the SAME
//     `visibleModuleSettings` the gear asks — so a module that gains a settings
//     page gains a row and a gear in one edit, and a hand-kept list of rows can
//     never fall behind the table. R61 (`module-settings-two-doors`,
//     `web/test/rules.test.ts`) holds the two doors to each other off the disk:
//     a module in this table with no gear mounted anywhere, or a gear on a
//     module this table does not list, turns the build red.
//
//   • *"It cannot be a slide-in because things can get quite complex here, and
//     it's different by module. I would rather it be full screen."* — so this
//     is a SCREEN, resolved from the address like every other screen in the
//     app, not a panel over the one you were on. R59 rules that a form is a
//     slide-in; this is not a form, it is a place.
//
//   • *"the choices: yes, this would survive, but not as a general thing, but
//     inside each module."* — so the vocabulary sections below are the EXISTING
//     Choices editor narrowed to this module's groups
//     (`SettingsChoicesPanel`'s `scope` prop,
//     `web/components/screens/settings-choices-panel.tsx`), never a second
//     editor. A value edited in two places is a value that drifts.
//
//     THE EDITOR ITSELF CHANGED ONCE ALREADY, 15 SEP 2026: this page used to
//     narrow `SelectableScreen` (`web/components/choices/selectable-screen.tsx`,
//     the grouped-list/chip-wall design), and the general Choices tab on
//     Settings was rebuilt a day earlier onto `SettingsChoicesPanel` (a
//     `RecordTable`, the client's own Contacts-table reference). Two
//     components drawing one concept was the exact drift the sentence above
//     exists to refuse, so this page now narrows the SAME `RecordTable`
//     editor the general tab draws — see `SettingsChoicesPanel`'s own header
//     for the scope prop's shape.
//
//   • *"Does every module get the gear? Only the ones with something to set."*
//     — so `MODULE_SETTINGS` is a LIST, not a map over every module, and a
//     module with nothing to set is simply absent from it. `visibleModuleSettings`
//     is the one function that answers "is there a page here for this reader",
//     and the gear, this screen and the Modules tab's index all ask it rather
//     than each working it out. Her answer governs the tab exactly as it governs
//     the gear: a module absent from the table has no row, for the same reason
//     it has no gear, and there is nothing to keep in step because there is only
//     one question being asked.
//
// ── WHY THE ADDRESS IS `/settings/<segment>` ────────────────────────────────
//
// The app's URL grammar is pairs of (module, id) — `parseScreenPath` in
// `shared/web/screen-engine/recipe.ts`, and `/accounts/BERG` has meant "the
// accounts screen, showing BERG" since the day it shipped. `/settings/tickets`
// is that same grammar read once more: the settings screen, showing tickets.
// Nothing was invented for it and nothing else could have been shorter.
//
// The two alternatives were both worse, and for reasons worth writing down.
// `/tickets/settings` collides with the record grammar — the second segment of
// `/tickets/…` is a ticket id, so the day somebody's ticket is called
// `settings` the address means two things. A query (`?tab=modules&module=…`)
// would have cost no routing work at all, and that is exactly what is wrong
// with it: a full screen she asked for by name would have had no address of its
// own, no workspace tab of its own, and no way back to it from a link.
//
// The cost of the path is three lines and they are all held together by tests:
// `web/app/settings/[[...rest]]/page.tsx` (so the segment resolves in dev and
// in the static export), `SHELL_MODULES` in `workers/gateway/src/index.ts` and
// `run_worker_first` in `workers/gateway/wrangler.jsonc` (so a pasted link or a
// reload is served this shell instead of the 404 page — the two halves are
// held together by `workers/gateway/test/shell-routing.test.ts`).
//
// ── WHY IT IS A HOST AND NOT A TICKETS SCREEN ───────────────────────────────
//
// She said settings get complex and differ by module, so the next module must
// be a DATA change. It is: a page is an entry in `MODULE_SETTINGS` and a
// section is an entry in its `sections`. What this deliberately is NOT is an
// abstraction for eleven modules built on the evidence of one — `kind` is a
// union with a single member and the renderer below has a single branch, so
// the first section that is not a vocabulary adds one member and one branch,
// in the open, rather than being bent into a shape guessed at today.
//
// ── WHAT IS DELIBERATELY NOT HERE ───────────────────────────────────────────
//
// THE TRIAGE ROTA. Who is on duty this week is not a setting, it is the state
// of the work: it changes every Monday, it is read beside a live count of what
// is waiting ("3 waiting to be read, the oldest 5 days"), and it already has a
// home on the Tickets screen itself (`web/components/tickets/triage-strip.tsx`).
// Moving it here would put an operational act two clicks away from the queue it
// governs; copying it here would be the second door onto one value that the
// Choices ruling above exists to prevent.
//
// THE THREE-DAY LINE. `TRIAGE_AFTER_DAYS` is genuinely a setting in spirit —
// it is a number the agency chose and could change — but it is a code constant
// today with no column, no door and no write path, and inventing a control for
// it is a schema change and a gated route, not a screen. It is named here so
// the next person can see it was looked at rather than missed.
//
// A content component rendered inside the one deep-link shell (the shell
// provides the AppShell chrome), like every other screen in `screens/`.

import * as React from "react"

import { buttonVariants } from "@shared/ui/components/button/button"
import { Gear } from "@shared/ui/foundations/icons"
import { Headline } from "@shared/ui/components/typography/typography"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"
import { renderFolderTabs, defaultTabsConfig, type TabItem } from "@shared/web/screen-engine/tabs-view"

import { InAppLink } from "@/components/shell/in-app-link"
import { openInNewTab } from "@/lib/nav"
import { NoAccess } from "@/components/deep-link/screen-bits"
import { ModuleAutomations } from "@/components/screens/module-automations"
import { SettingsChoicesPanel } from "@/components/screens/settings-choices-panel"
import { MeetingTypesPanel } from "@/components/team/internal-screens"
import { TeamPhaseDayDefaultsPanel } from "@/components/work/wave-phase-days-panel"
import type { Can, Right } from "@/lib/perms"
import { TICKET_TYPE_GROUP } from "@shared/ticket-types"
import { usePermissions } from "@/lib/perms"
import type { ActiveTeam } from "@/lib/use-active-team"
import { useT } from "@shared/web/language"
import { useRemembered } from "@shared/web/remembered"
import { formatCount } from "@shared/web/format-count"
import { AUTOMATIONS } from "@shared/automations"
import { TEAM_SECTIONS } from "@/lib/pages"
import { useCached } from "@shared/web/store"
import { purposesKey } from "@/lib/live-resources"
import { content as contentApi, tenancy } from "@/lib/api"
import type { MeetingPurpose, SelectableValue } from "@shared/types"
import { LIST_HARD_CAP } from "@shared/workers/limits"

/** What every block on a module's settings page has, whatever it draws. */
type ModuleSettingsSectionBase = {
  /** Stable within its page — React's key, and the thing a future `?section=`
   * would name. Never shown to anybody, so it is not a sentence. */
  key: string
  /** WHO MAY SEE THIS BLOCK AT ALL. The same right the same content is gated on
   * wherever else it appears — the Choices tab on Settings gates its editor on
   * `selectable_data:read` and so does this, because a reader who is refused
   * there must be refused here rather than finding a second way in. */
  gate: { module: string; right: Right }
  /** English; translated at the read, below. */
  title: string
  /* ── AND THERE IS NO `description`. IT WAS DELETED, 2026-09-11 ────────────
   *
   * Client, over a screenshot of Ticket settings: *"ticket types should be on
   * top of the searchbar inside the container without subtitle, make this.
   * always"* — her second saying of it (2026-09-10: *"in ticket settings (or
   * any other module) no subtilte"*).
   *
   * SHE RULED THE OTHER WAY ONCE, BETWEEN THE TWO, and it is recorded here
   * rather than quietly dropped so the next reader knows it was weighed:
   * *"The section description: no, I want to keep it."* (2026-09-10). It is
   * OVERRULED — two clearer statements either side of it, the later one made
   * over a picture of the screen it is about. The `page` doc below already
   * lost its own subtitle to the first of those rulings and told the next
   * reader that "the SECTION descriptions below are a different thing and they
   * stay". They were not a different thing; they were the same sentence one
   * level down, and she has now said so.
   *
   * THE FIELD WENT WITH THE SENTENCES, WHICH IS THE HALF THAT LASTS. A section
   * that has nowhere to declare a subtitle cannot grow one back — the same
   * argument the page's own deletion makes one screen up, and the reason
   * `standalone` was removed rather than left as a prop nobody passes. The
   * seventeenth section is not stopped by a census; it is stopped by there
   * being no column.
   *
   * NOT ONE OF THE FOURTEEN CARRIED A FACT WORTH MOVING. Seven were a
   * paraphrase of their own title ("The shelves the brand library is sorted
   * into", under "Asset categories"); the other seven were the identical
   * fourteen-word sentence about automations, repeated verbatim on seven
   * pages. Where a description HAD carried something a person needs at that
   * moment, the move was onto the control it is about — never a subtitle under
   * another name. */
}

/** One block on a module's settings page.
 *
 * `kind` WAS A UNION OF ONE UNTIL 2026-09-11, and the second member arrived
 * exactly the way this file's header said it should: *"the first section that
 * is not a vocabulary adds one member and one branch, in the open, rather than
 * being bent into a shape guessed at today."* This is that. The client's
 * ruling of 2026-09-11 — *"include absolutely all of those in settings by
 * module. I want no automation without visibility"* — is the fact that made it
 * real rather than a guess, and it is a DISCRIMINATED UNION rather than a bag
 * of optional fields, because `types` and `create` are facts about a vocabulary
 * and mean nothing at all beside a list of automations. Optional fields would
 * have let a vocabulary ship with no groups and compiled.
 *
 * THE SECOND MEMBER CARRIES NO DATA OF ITS OWN, which is the interesting part:
 * WHICH automations a page shows is not written here, it is derived from
 * `AUTOMATIONS` (`shared/automations.ts`) filtered to this page's own segment.
 * A section that listed its automations would be a second list to keep in step
 * with the registry, and R70's whole subject is registries that rot. */
export type ModuleSettingsSection =
  | (ModuleSettingsSectionBase & {
      kind: "vocabulary"
      /** The `selectable_data.type` groups this block edits. */
      types: string[]
      /** Whether this vocabulary can grow — read by `SettingsChoicesPanel`'s
       * `moduleOptions` derivation (`settings-choices-panel.tsx`) exactly as
       * it always was, and it is a fact about the words rather than the reader. */
      create: boolean
      /** THE COLOUR EACH WORD IS KNOWN BY, when this group has one — read into
       * `ChoiceGroupHome.colour` (`deep-link/shape.tsx`'s `shapeChoicesTable`)
       * so the Value column draws a `Swatch` beside the word, on both scopes
       * of `SettingsChoicesPanel` alike.
       *
       * UNWIRED SINCE 17 SEP 2026. The client, 2026-09-10: *"on ticket type,
       * show it like chips with their color, not a list."* — Ticket type was
       * the one group that ever set this, and her later ruling retired it:
       * *"the one that gets the chip with the color is always the status …
       * for tickets, we need to find icons for the ticket type."* Ticket
       * type's own glyph now draws in the Details column instead
       * (`choiceDetailsCell`, `ticketTypeIconName`), the same seat Story
       * type's icon already sits in — see this section's `types` field, no
       * `colour` below it any more.
       *
       * A FUNCTION AND NOT A COLUMN, because a value's colour is not stored:
       * `selectable_data` has four meaningful columns and none of them is a colour
       * (`web/lib/type-colours.ts` argues that out at length, narrowed now to the
       * tickets dashboard's own chart series — never a chip — see that file's
       * own header). Passing the resolver down is what keeps that true — the
       * table draws whatever colour it is handed and knows nothing about
       * ticket types, and a group that gains a palette some day hands its own.
       *
       * ABSENT MEANS A PLAIN WORD, which is every vocabulary today: Sprint
       * types, Story types and Ticket types alike carry no palette and their
       * rows read as plain text (Ticket type's icon sits in Details, not
       * here — see that field's own header). */
      colour?: (value: string) => string
    })
  | (ModuleSettingsSectionBase & {
      /** EVERY AUTOMATION ON THIS MODULE, each with a switch or the reason it
       * has none (R70, client 2026-09-11). No fields: the rows are
       * `AUTOMATIONS` filtered to this page's own segment, so a module that
       * gains an automation gains a row without anybody editing this table. */
      kind: "automations"
    })
  | (ModuleSettingsSectionBase & {
      /** A THIRD KIND, 15 SEP 2026 — a choice that does NOT back onto
       * `selectable_data`. The client's ruling: *"purpose is a choice
       * component, so make sure you move it inside meetings, settings,
       * choices."* Meeting types (`meeting_purposes`, `shared/types.ts`'s
       * own `MeetingPurpose`) carry a department per row and are their own
       * table — `shared/selectable-homes.ts` never claimed them, because
       * they cannot become a dropdown value. `kind: "vocabulary"` is a
       * discriminated union member for a REASON (this file's own header,
       * `types`/`create`/`colour` are facts about a `selectable_data` group
       * and mean nothing beside a table that is not one), so this needed a
       * sibling rather than a `types: []` that would have shipped a
       * `SettingsChoicesPanel` scope with nothing to narrow. STILL DRAWS ON
       * THE "Choices" TAB, same as a vocabulary section does — the union
       * member is about the DATA source, not the tab it appears on. No
       * fields of its own: today there is exactly one meeting-types section
       * and it is `MeetingTypesPanel`'s own concern
       * (`web/components/team/internal-screens.tsx`) to fetch and shape. */
      kind: "meetingTypes"
    })
  | (ModuleSettingsSectionBase & {
      /** A FOURTH KIND, 21 SEP 2026 — a team-wide DEFAULT, never a
       * `selectable_data` group and never a switch. Aurora's ruling, closing
       * the loop her 20 Sep 2026 one opened (the per-wave Settings sheet,
       * B46, documents/UI-RULEBOOK.md): "Make sure we can adjust this on the
       * settings in Waves." No fields of its own: today there is exactly one
       * page with a `phaseDays` section (Waves) and it is
       * `TeamPhaseDayDefaultsPanel`'s own concern
       * (`web/components/work/wave-phase-days-panel.tsx`) to fetch, draw and
       * save the seven rows. Its OWN tab, not "Choices" — the union member
       * beside it is about a vocabulary a person adds rows to; this is seven
       * fixed numbers, and stacking it under "Choices" would answer the
       * tab's own question wrong. */
      kind: "phaseDays"
    })

export type ModuleSettingsPage = {
  /** The module's URL segment, which is also this page's own second segment:
   * `tickets` → `/settings/tickets`. The SAME word the module's own screen
   * answers to (`web/lib/screens.ts`'s `MODULE_PERMISSION` keys), never the
   * permission module behind it — the segment is `tickets` and the module is
   * `help`, and this is an address. */
  segment: string
  /** English; translated at the read. Not `"{module} settings"` with a hole in
   * it: German and Catalan both want a different shape for that phrase, and one
   * short sentence per module is cheaper to translate and impossible to get
   * grammatically wrong. */
  title: string
  /** NO SUBTITLE, AND THE FIELD IS GONE RATHER THAN UNREAD. The client,
   * 2026-09-10: *"in ticket settings (or any other module) no subtitle."* It
   * used to carry one sentence per page ("The words and rules this team's
   * tickets run on.") drawn straight under the `<h1>`.
   *
   * IT IS A DELETION AND NOT A HIDDEN FIELD, because a column nothing renders
   * is a sentence that gets translated into three languages on every build and
   * read by nobody — R28 would have called the string an ORPHAN the moment the
   * `<p>` went, which is the catalogue saying the same thing this comment does.
   *
   * AND IT PUTS THIS PAGE BACK IN STEP WITH EVERY OTHER MAIN SCREEN. Settings
   * itself is a bare `<Headline as="h1">` with nothing under it
   * (`settings-screen.tsx`), and so is every collection heading; a subtitle
   * here was the one page in the app that explained itself twice, once in its
   * title and once underneath.
   *
   * THIS PARAGRAPH USED TO END "The SECTION descriptions below are a different
   * thing and they stay: they say what a particular vocabulary DOES, which is
   * not recoverable from its name." The client overruled that on 2026-09-11
   * ("without subtitle, make this. always") and the reading was wrong anyway:
   * thirteen of the fourteen said nothing their own title did not. The section
   * `description` column is gone with them — see `ModuleSettingsSectionBase`.
   *
   * `sections` follows `title` directly. */
  sections: ModuleSettingsSection[]
}

/** THE MODULES THAT HAVE SOMETHING TO SET — *"Only the ones with something to
 * set"* (client, 2026-09-09), which is why this is a list of the modules that
 * do rather than a table over all of them with most entries empty.
 *
 * IT WAS TICKETS ALONE UNTIL 2026-09-11 — the pilot that proved the shape. The
 * client then asked for the rest of it in one sentence: *"implement this module
 * settings across app: the goal right now is that you identify the choice
 * components where they belong to a module and create the settings there in the
 * module and in settings the module. End goal: kill the big tab 'choice
 * options'."*
 *
 * WHICH MODULE OWNS WHICH WORDS IS NOT A JUDGEMENT, IT IS A LOOKUP.
 * `shared/selectable-homes.ts` already records, for every vocabulary group, the
 * TABLE its words are stored on; the table's module is the module. So
 * `Story type` is on `stories.story_type` and lands on the Stories page,
 * `App stage` is on `apps.stage` and `Deliverable kind` is on
 * `deliverables.kind` (a deliverable is read on an app's own record) so both
 * land on the Apps page, and so on down the map. Nothing here was placed by
 * taste, and a group whose home changes moves page by changing one line there.
 *
 * A GROUP WITH NO HOME GETS NO PAGE, and that is the other half of the same
 * lookup. The three `"labels"` groups (Ticket status, Story status, Sprint
 * status) store nothing — the code owns those states — so there is no module
 * whose records carry the word, and the client has already ruled the one that
 * had a section off it (*"remove ticket status, this cannot be adjusted from
 * the app"*, 2026-09-10). The six `"unused"` groups back nothing at all; a
 * settings page for them would be a control that changes nothing, which is the
 * same fault as a gear on a module with nothing to set.
 *
 * ONE SECTION PER PAGE, EVEN WHERE A MODULE OWNS TWO GROUPS — Accounts owns
 * Industry and Country, Apps owns App stage and Deliverable kind. A section is
 * a whole `SettingsChoicesPanel` (scoped), and that panel is a `RecordTable`
 * (R63 pins its toolbar to the top of the scroll) plus an `AddButton` — black
 * now, not mango, since R84 (16 Sep 2026) confined the brand fill to the
 * title component and a toolbar's own create button is never that. Two of
 * them stacked would still pin two bars to one edge, which is reason enough
 * on its own to keep it to one. Since 15 Sep 2026 the two groups share ONE
 * flat table rather than two named blocks — the scoped Module column is
 * dropped (settings-choices-panel.tsx's own header: redundant once the page's
 * own tab already says which module), so "Industry" and "Country" rows sit
 * side by side, told apart only by their own word and the create dialog's
 * Group field (a pick-or-create datalist over the page's own `types` —
 * `SelectableFormDialog`'s `types` shape, unchanged since before this table
 * existed) — they share a search, a filter and one
 * "New value" that asks which group, which is what the whole-vocabulary screen
 * has always done and is the narrowing this prop exists for. */

/** THE PAGE'S OWN TITLE, TAKEN FROM THE NAV RATHER THAN RETYPED — client
 * ruling, 2026-09-14: *"on the page settings accounts, put only the name of
 * the module. You don't need to put settings. For example, instead of
 * account settings, just accounts. Make sure you use the name exactly as in
 * the navigation bar. Most of the time, it's a plural."*
 *
 * `TEAM_SECTIONS` (`web/lib/pages.ts`) is the one place a destination's nav
 * word is already decided — the sidebar, the team area's own tab strip and
 * the breadcrumb all read it. A `MODULE_SETTINGS` entry names the SAME
 * segment `TEAM_SECTIONS` does (R61's own `module-settings-two-doors` census
 * proves every segment resolves to a real `MODULE_PERMISSION` key, which is
 * how a section reaches the nav in the first place), so its title is a
 * LOOKUP rather than a second spelling — "Ticket settings" and "Account
 * settings" are gone with this change, and what is left is "Tickets" and
 * "Accounts", her own worked example, word for word.
 *
 * THROWS RATHER THAN GUESSING on a segment `TEAM_SECTIONS` does not carry —
 * a title typed by hand here is exactly the drift this function exists to
 * refuse, so a genuinely nav-less page (there is exactly one, `"team"`
 * below) states its title as a literal with a comment saying why, rather
 * than teaching this lookup a silent fallback nothing would ever notice
 * going stale. */
function navPageTitle(segment: string): string {
  const section = TEAM_SECTIONS.find((s) => s.segment === segment)
  if (!section)
    throw new Error(
      `MODULE_SETTINGS: "${segment}" names no TEAM_SECTIONS destination: give it a nav entry, or spell its ` +
        `title by hand with a comment saying why (the way the "team" segment below does)`
    )
  return section.title
}

const MODULE_SETTINGS: ModuleSettingsPage[] = [
  {
    segment: "tickets",
    title: navPageTitle("tickets"),
    sections: [
      {
        key: "ticket-type",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        // The group name is the literal `selectable_data.type` string, and it is
        // the join key: `shared/selectable-homes.ts` records that this group's
        // words are STORED on `help.help_type` and `help.raised_as_type`, which
        // is why renaming one is a rewrite and not a relabel.
        types: [TICKET_TYPE_GROUP],
        title: "Ticket types",
        // THE ONE VOCABULARY THAT CANNOT GROW, 15 Sep 2026. The owner's ruling —
        // a ticket is an Issue, a Question, an Extra or a piece of Feedback, and
        // "Remove all other options" — is enforced at the door
        // (`createSelectable` refuses a fifth with a `locked_group` 400), and
        // this is the screen standing down in front of it. A control that can
        // only ever be refused should not be a control; `create: false` is the
        // flag this screen already had for exactly that case, and the comment
        // beside `moduleOptions` (settings-choices-panel.tsx) was written
        // anticipating it.
        //
        // RENAMING IS UNTOUCHED. Every one of the four is still editable in
        // place, which is the whole distinction `shared/ticket-types.ts` draws:
        // the lock is about a fifth ROW, never about the wording.
        create: false,
        // NO `colour` HERE ANY MORE (17 Sep 2026) — see `ModuleSettingsSection
        // .colour`'s own header. Ticket type's glyph draws in the Choices
        // table's Details column instead, read directly off
        // `ticketTypeIconName` in `choiceDetailsCell` (deep-link/shape.tsx),
        // so this section needs no icon resolver either.
      },
      // TICKET STATUSES USED TO BE THE SECOND SECTION, AND THE CLIENT TOOK IT
      // OFF ON 2026-09-10: *"remove ticket status, this cannot be adjusted from
      // the app."* She is describing the shape exactly. The stages are
      // `HELP_STATUSES` in `shared/types.ts` — six words the server validates
      // every transition against — and the `Ticket status` rows carried only a
      // display WORD for each, which is why the section had `create: false` and
      // a description that spent two sentences explaining what could not be
      // done on it.
      //
      // WHAT DECIDES THE WORD ON SCREEN NOW, which is the question removing an
      // editor has to answer: the app's own copy, translated. `t("Triaged")`,
      // `t("In progress")` and the rest are written at the screens that draw
      // them (`tickets-collection.tsx`'s `COLUMN` table, `collection-filters.ts`'
      // status facet), and they go through the catalogue like every other
      // sentence. NOTHING has ever read a `Ticket status` row — the group is
      // `"labels"` in `shared/selectable-homes.ts` and there is not one call
      // site anywhere in `web/`, `web-portal/` or `workers/` that looks a
      // stage's word up in it. So the rows were an editor over a vocabulary the
      // app does not consult: rename "Resolved" to "Closed" and every screen
      // still said Resolved. The section is gone because it was a control that
      // did nothing, which is the same fault as a gear on a module with no
      // settings.
      //
      // THE ROWS ARE NOT DELETED and this change does not touch data. They are
      // still on Settings › Choices, which is the editor for the team's WHOLE
      // vocabulary, and they are still seeded. Taking them out of the world is a
      // migration and a decision about the other two `"labels"` groups beside
      // them, which is hers to make and is written up in the report rather than
      // taken here.
      //
      // STORY STATUS AND SPRINT STATUS INHERIT THIS RULING, and as of 2026-09-11
      // both modules DO have a page, so the inheritance is the reason each of
      // them carries one section rather than two. Story status is the exact
      // shape of the paragraph above: nothing in `web/`, `web-portal/` or
      // `workers/` reads a row of it, so an editor over it changes nothing.
      // Sprint status is WORSE than nothing and the difference is worth saying
      // here, because it reads like the same case and is not: its MARK is live
      // (`markMap(…, MARK_GROUP.sprintStatus)` in `work/sprints-screen.tsx`), and
      // it is looked up BY THE ROW'S WORD against the code's own `STATE_HEADING`
      // ("Running now" / "Coming up" / "Wrapped"). So renaming one of those rows
      // silently drops the glyph from the sprint wall while changing no word on
      // screen — the heading is `t(STATE_HEADING[st])`, written in code. An
      // editor offering rename beside mark would be one control that works and
      // one that quietly breaks the other, so the group gets no section at all.
      // The report on this change carries what that costs and what to do about
      // it; it is not a decision to take inside a table.
      //
      // ── AND THE SECOND KIND OF SECTION, 2026-09-11 ────────────────────────
      // *"include absolutely all of those in settings by module. I want no
      // automation without visibility."* Ten of the base's thirty-three
      // automatic behaviours are this module's, which is more than any other
      // module has, and the reason is worth one line: a ticket is the one
      // record here that a CLIENT and the agency both write to, so almost
      // everything that keeps the two in step happens without either asking.
      // GATED ON `help:read` AND NOT ON `selectable_data:read`: a person who
      // may see tickets may see what tickets does by itself. Changing one is a
      // second and different question (`teams:update`, asked at the door and in
      // `module-automations.tsx`), which is why the two are not one gate.
      {
        key: "automations",
        gate: { module: "help", right: "read" },
        kind: "automations",
        title: "Automations",
      },
    ],
  },
  // THE WORK ENGINE. Three segments, three modules' worth of settings, and every
  // one of them a group `shared/selectable-homes.ts` puts on that module's own
  // table — `tasks.department`, `stories.story_type`, `sprints.sprint_type`.
  {
    segment: "tasks",
    title: navPageTitle("tasks"),
    sections: [
      {
        key: "department",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        // THE ONE GROUP TWO MODULES STORE, and the only placement on this page
        // that is a DECISION rather than a lookup. `VOCABULARY_HOMES` gives
        // `Department` two homes — `tasks.department` and
        // `meeting_purposes.department` — so the table cannot pick for us.
        //
        // TASKS, FOR THREE REASONS AND NOT FOR BEING THE BIGGER LIST. The
        // vocabulary is named after tasks in the code that owns it
        // (`TASK_DEPARTMENTS`, `shared/departments.ts`); everything a dropdown
        // row cannot carry — the mark, the colour, the second question each
        // department asks of a form — lives in that same file and is read by the
        // task form; and Meeting purposes is itself a small contextual taxonomy
        // screen reached from Meetings, so a settings page there would exist to
        // hold one borrowed group.
        //
        // THE DESCRIPTION SAYS BOTH OUT LOUD, which is what stops this being a
        // quiet annexation: somebody editing departments here is told, on the
        // page, that meeting purposes are filed by the same words. The client
        // has the final say and the report puts the alternative in front of her.
        types: ["Department"],
        title: "Departments",
        create: true,
      },
    ],
  },
  {
    segment: "stories",
    title: navPageTitle("stories"),
    sections: [
      {
        key: "story-type",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        types: ["Story type"],
        title: "Story types",
        create: true,
      },
    ],
  },
  {
    segment: "sprints",
    title: navPageTitle("sprints"),
    sections: [
      {
        key: "sprint-type",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        // "Sprint type" -> "Phase type", Aurora's ruling, 20 Sep 2026 (team
        // migration 0107). The settings section's own `key` stays as it is —
        // an internal identifier, never displayed.
        types: ["Phase type"],
        title: "Phase types",
        create: true,
      },
    ],
  },
  {
    // WAVES — the team's own DEFAULT days per phase type, never a
    // `selectable_data` group. Aurora's ruling, 21 Sep 2026, verbatim,
    // closing the loop her 20 Sep 2026 one opened (the per-wave Settings
    // sheet a wave's own gear already opens, B46, documents/UI-RULEBOOK.md):
    // "Make sure we can adjust this on the settings in Waves." Gated on
    // `work:read`, the same right the per-wave Settings sheet's own view is
    // gated on one screen over — writing (the Save button inside
    // `TeamPhaseDayDefaultsPanel`) asks `work:update` itself, the same split
    // every other module-settings page's `automations` section already
    // takes between "may see this page" and "may change what's on it".
    segment: "waves",
    title: navPageTitle("waves"),
    sections: [
      {
        key: "phase-days",
        gate: { module: "work", right: "read" },
        kind: "phaseDays",
        title: "Phase days",
      },
    ],
  },
  // THE BUILD SIDE. Apps owns TWO groups and gets ONE section for the reason
  // this table's own header gives: a second section is a second pinned toolbar
  // and a second mango. Both groups share the one scoped table
  // (`SettingsChoicesPanel`), told apart by their own word rather than a
  // second block, the same shape Accounts' two groups now take (see that
  // page's own comment above).
  {
    segment: "apps",
    title: navPageTitle("apps"),
    sections: [
      {
        key: "app-vocabulary",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        // `apps.stage` and `deliverables.kind`. A deliverable has no screen of
        // its own — it is a tab on the app's own record
        // (`web/components/apps/deliverables-panel.tsx`) — so the app is the
        // module a person would say it is part of, exactly as
        // `web/components/README.md` already files the component.
        types: ["App stage", "Deliverable kind"],
        title: "Stages and deliverable kinds",
        create: true,
      },
    ],
  },
  {
    segment: "accounts",
    // CLIENT'S OWN EXAMPLE, VERBATIM, 2026-09-14: "instead of account
    // settings, just accounts." `navPageTitle` resolves this exactly there —
    // `TEAM_SECTIONS`'s "accounts" entry reads "Accounts".
    title: navPageTitle("accounts"),
    sections: [
      {
        key: "account-vocabulary",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        // Both on `accounts` — `accounts.industry` and `accounts.country`. One
        // section for the same reason Apps has one.
        types: ["Industry", "Country"],
        title: "Industries and countries",
        create: true,
      },
      // THE TWO MESSAGES A CLIENT CONTACT EVER RECEIVES FROM US, and the second
      // of them is why this page hosts them at all. The "we need your input"
      // mail belongs to a TO-DO, and `todos` is a permission module with no
      // segment of its own — there is no `/settings/todos` and R61 would refuse
      // to invent one. Accounts is the right host rather than the nearest one:
      // the recipients are read off `portal_users`, which is the ACCOUNT's own
      // contacts, so the mail is addressed BY ACCOUNT and not by to-do; and the
      // portal welcome beside it is already an accounts act. The alternative,
      // Tasks, is where a to-do is created — but a to-do is not a task (SCOPE
      // ch.02 keeps them apart on purpose) and that page's subject is the
      // departments a task is filed under.
      {
        key: "automations",
        gate: { module: "accounts", right: "read" },
        kind: "automations",
        title: "Automations",
      },
    ],
  },
  /* ── FIVE PAGES THAT EXIST ONLY FOR THEIR AUTOMATIONS, 2026-09-11 ─────────
   * The client: *"include absolutely all of those in settings by module. I want
   * no automation without visibility."* Every page above was born of a
   * VOCABULARY; these five have no words to set and exist because something
   * happens on them without anybody asking. *"Only the ones with something to
   * set"* still governs — an automation IS something to set, and a module with
   * neither words nor automations is still absent from this table.
   *
   * EVERY SEGMENT HERE IS A REAL `MODULE_PERMISSION` KEY, which R61 requires and
   * which is what settles four of the five without a judgement: `time`,
   * `meetings`, `knowledge` and `members` are all keys already, so the address
   * and the gate come for free. */
  {
    /* Three automations and not one of them switchable, which is why this page
     * is worth reading: the one stored switch in the whole product lives here
     * (`work_prefs.auto_stop`) and it is PER PERSON, so it is not the team's to
     * set — and the other two are a warning and a nag rather than acts. */
    segment: "time",
    // THE NAV CALLS THIS SEGMENT "WORK LOGS", NOT "TIME" — `navPageTitle`
    // resolves what the sidebar already says rather than the URL segment,
    // which is why this page reads "Work logs" and not "Time".
    title: navPageTitle("time"),
    sections: [
      {
        key: "automations",
        gate: { module: "work", right: "read" },
        kind: "automations",
        title: "Automations",
      },
    ],
  },
  {
    /* What is said in a room, written down by itself — and, since 15 Sep
     * 2026, what a meeting is ABOUT lives here too.
     *
     * THE TAXONOMY MOVED, RULED BY THE CLIENT: *"For meetings, purpose is a
     * choice component, so make sure you move it inside meetings, settings,
     * choices. And maybe you find another word for 'purposes.' … Maybe just
     * 'type.'"* "Meeting type" is the word (`shared/glossary.ts`'s own
     * `meetingType` entry). It used to be a standalone screen reached
     * CONTEXTUALLY from a button on the Meetings screen itself — this
     * comment used to say so, and the second sentence ("this page is only
     * about the capture") is what that ruling deletes: the module now owns
     * both halves, on two tabs of the same settings page, the same shape
     * Tickets and Accounts already take (this file's own header,
     * `visibleModuleSettings`). The old screen's plumbing is left in place
     * (`web/components/team/internal-screens.tsx`'s `PurposesScreen`) —
     * nothing structurally fenced points at it any more, and it is a
     * separate, smaller change to retire the rest of it; see the Task C
     * lane report for the full account. */
    segment: "meetings",
    title: navPageTitle("meetings"),
    sections: [
      {
        key: "automations",
        gate: { module: "meetings", right: "read" },
        kind: "automations",
        title: "Automations",
      },
      // MEETING TYPES — gated on `delivery:read`, the permission the taxonomy
      // has always lived under (`shared/team-modules.ts`'s own `delivery` row,
      // now titled "Meeting types" for the same reason). NOT `meetings:read`:
      // a reader who may see meetings but not the agency's own housekeeping
      // module should not be shown a door into it, the same refusal
      // `visibleModuleSettings` already applies everywhere else on this page.
      {
        key: "meeting-types",
        gate: { module: "delivery", right: "read" },
        kind: "meetingTypes",
        title: "Meeting types",
      },
    ],
  },
  {
    /* THE BUSIEST PAGE IN THE BASE and the one a person is most likely to want.
     * Everything the assistant knows arrived here without being asked: a
     * fifteen-minute sweep of the team's own records, a pass over every
     * colleague's connected Google account, and a retirement pass that takes
     * material away again. Three of the five are switchable. */
    segment: "knowledge",
    title: navPageTitle("knowledge"),
    sections: [
      {
        key: "automations",
        gate: { module: "knowledge", right: "read" },
        kind: "automations",
        title: "Automations",
      },
    ],
  },
  {
    /* SEVEN EMAILS, AND THREE OF THEM BELONG TO NO MODULE AT ALL — the sign-in
     * code, the email-change code and the address-changed notice. There is no
     * `auth` module and inventing one would put a column on every role's
     * permission sheet for a thing no door gates, which is exactly the fault
     * R36 was written for (`screens` had four boxes and no door). They land
     * here because this is the module about the PEOPLE in this team and the
     * mail their accounts send them, and because the four membership notices
     * are already here — so all seven person-directed messages read as one
     * list, which is how somebody looking for "why did they get an email"
     * actually searches. None of the three is switchable and each says why. */
    segment: "members",
    title: navPageTitle("members"),
    sections: [
      {
        key: "automations",
        gate: { module: "team_members", right: "read" },
        kind: "automations",
        title: "Automations",
      },
    ],
  },
  {
    /* THE ESTATE — the installation's own nightly work, which belongs to no
     * module either and is the harder of the two homeless classes.
     *
     * `team` IS THE SEGMENT because `teams` is the permission this base already
     * treats as "this team's own settings" — the recipe store gates on
     * `teams:update` for the same reason, and R36 records that `screens` was
     * given four rights of its own and needed none. It is also the ONLY right
     * `teams` offers (`MODULE_OFFERED_RIGHTS`), so gating the section on `read`
     * would be a door refusing everybody, Admin included.
     *
     * THE TITLE IS "HOUSEKEEPING" AND NOT "TEAM SETTINGS", deliberately. The
     * segment is an ADDRESS and the title is WORDS (see `ModuleSettingsPage`),
     * and "Team settings" would be a second name for the Team TAB one screen
     * up, which is about people and roles. What is on this page is the nightly
     * clear-out, the growth alarm, the fault report and the watchdog that
     * notices when the other three have stopped.
     *
     * NOT ONE OF THEM IS SWITCHABLE, and that is the page rather than a
     * shortfall: these watch the whole INSTALLATION, so one team cannot switch
     * off the work that keeps every team's database alive. Until today nobody
     * outside this repository could know they ran at all, which is the half of
     * her ruling that is about seeing rather than about choosing.
     *
     * THE OWNER MAY WANT IT ELSEWHERE. The honest alternatives are the Kwapso
     * screen (the app's own record, which is where this page's GEAR is mounted)
     * and a home nobody has built. Written up in the report rather than decided
     * inside a table.
     *
     * THE ONE LITERAL TITLE LEFT IN THIS TABLE, 2026-09-14. Every other page's
     * title is `navPageTitle(segment)` — the client's own ruling that a
     * settings page reads exactly the nav's word for it — and this is the one
     * segment with no nav word to read: "team" names no `TEAM_SECTIONS` row
     * (it never navigated anywhere; the paragraph above is the whole account
     * of why it exists at all), so `navPageTitle("team")` would throw rather
     * than silently drift. "Housekeeping" stays hand-spelled, on purpose, for
     * the same reason the paragraph above already gives it a name that is
     * NOT "Team settings". */
    segment: "team",
    title: "Housekeeping",
    sections: [
      {
        key: "automations",
        gate: { module: "teams", right: "update" },
        kind: "automations",
        title: "Automations",
      },
    ],
  },
  {
    segment: "brand",
    title: navPageTitle("brand"),
    sections: [
      {
        key: "brand-category",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        types: ["Brand asset category"],
        title: "Asset categories",
        create: true,
      },
    ],
  },
]

/** THE ONE ANSWER TO "IS THERE A PAGE HERE, FOR THIS READER" — the sections of
 * `segment`'s page that `can` may see, or an empty array.
 *
 * THREE CALLERS AND ONE RULE, all three in this file: `ModuleSettingsGear` asks
 * it to decide whether to draw at all, `ModuleSettingsScreen` asks it to decide
 * what to render, and `moduleSettingsIndex` — the Modules tab's rows — asks it
 * once per module to decide which rows exist. The instruction that made it a
 * function was exact — *a reader who may see tickets but not edit the team's
 * vocabulary should not get a gear that leads to a refusal* — and a gear whose
 * condition is written out separately from the page's own gate is a gear that
 * will eventually disagree with it. The tab inherits that for nothing: it never
 * spells a right, it asks this.
 *
 * THE ONE `can(...)` IN THIS FILE IS THE ONE ON THE LINE BELOW, and R61 holds
 * it there. Three surfaces gating on one expression is the property; three
 * surfaces each holding their own copy of `selectable_data:read` is how a
 * reader ends up with a row they cannot open.
 *
 * STILL NOT EXPORTED, and that is a rule of this repo rather than a preference:
 * `web/test/dead-exports.test.ts` counts an `export` nothing in ANOTHER file
 * names as dead, because that is precisely the case where the keyword buys
 * nothing. All three of its callers are in this file — the Modules tab reaches
 * it through `moduleSettingsIndex` rather than importing it directly, which is
 * also what keeps the tab from being able to ask a slightly different question.
 *
 * EMPTY MEANS BOTH "no such page" and "nothing on it you may see", and the two
 * do not need telling apart: neither one should be offered a door. */
function visibleModuleSettings(segment: string, can: Can): ModuleSettingsSection[] {
  const page = MODULE_SETTINGS.find((p) => p.segment === segment)
  if (!page) return []
  return page.sections.filter((s) => can(s.gate.module, s.gate.right))
}

/** The page's own words, for whoever is about to link to it. Separate from
 * `visibleModuleSettings` because a caller wants the title (the gear's tooltip,
 * the Modules row's label) whether or not it is about to render the sections. */
export function moduleSettingsPage(segment: string): ModuleSettingsPage | undefined {
  return MODULE_SETTINGS.find((p) => p.segment === segment)
}

/** THE MODULES TAB'S ROWS — every module with something THIS reader may set,
 * each with the sections that will actually be on the page when they arrive.
 *
 * *"somewhere in the settings, we have a tab that says 'Module' or 'Business
 * Logic' … to find the module once"* (client, 2026-09-09). This is the index
 * behind that sentence, and it is a DERIVATION rather than a list, which is the
 * only interesting thing about it. Three properties fall out of that and none of
 * them has to be maintained:
 *
 *   • A ROW EXISTS EXACTLY WHEN A GEAR DOES. Both are `visibleModuleSettings`
 *     returning something, so the answer is computed once and rendered twice.
 *     Adding the second module's settings is still one entry in `MODULE_SETTINGS`
 *     — it grows a page, a gear and a row together, and nobody has to remember
 *     the third. R61 (`module-settings-two-doors`) proves the pair off the disk
 *     rather than trusting this sentence.
 *
 *   • THE GATE IS INHERITED, NOT RESTATED. A reader who may not read
 *     `selectable_data` gets an empty `sections` for Tickets, so the row is
 *     filtered out here for the same reason the gear returns `null` there. Her
 *     rule about not offering a door that refuses applies to a ROW as much as to
 *     an icon — arguably more, because a row is labelled and looks like content.
 *
 *   • THE ROW CARRIES THE VISIBLE SECTIONS, not just the page — which is what
 *     lets bullet two filter an empty module out by length rather than by a
 *     second gate call. It used to be read for display too, a joined line of
 *     section titles under the module's name; the client killed that outright,
 *     2026-09-14, over this exact wall ("In settings, modules: delete this.
 *     Generally, I don't like subtitles, so stop putting them unless I ask"),
 *     R72's own founding ruling. `settings-screen.tsx` no longer destructures
 *     `sections` out of this row for that reason — the shape stays because the
 *     filter still needs it, not because anything still prints it.
 *
 * SORTED BY NOTHING — `MODULE_SETTINGS`'s own order is the order, the same way
 * `TEAM_SECTIONS` is on the Team tab. When it holds one entry that is not a
 * decision; when it holds eight it is the one place to reorder them. */
export function moduleSettingsIndex(
  can: Can
): { page: ModuleSettingsPage; sections: ModuleSettingsSection[] }[] {
  return MODULE_SETTINGS.map((page) => ({
    page,
    sections: visibleModuleSettings(page.segment, can),
  })).filter((row) => row.sections.length > 0)
}

export function ModuleSettingsScreen({
  active,
  segment,
}: {
  active: ActiveTeam
  /** From the URL's second segment — `/settings/tickets` → `"tickets"`. */
  segment: string
}) {
  const t = useT()
  const { ctx } = active
  const teamId = ctx?.team?.id ?? null
  const { can } = usePermissions(teamId)

  const page = moduleSettingsPage(segment)
  const sections = visibleModuleSettings(segment, can)

  // ── TWO TABS, NEVER A HAND-LISTED SHAPE — client ruling, 2026-09-11/14:
  // "on every module settings page, add two tabs: 1. Automations 2. Choice
  // components". `kind` is still the two-member union the header above
  // argues for, and each tab is drawn only where THIS reader's own
  // `visibleModuleSettings` result actually holds that kind — the same
  // refusal `sections.length === 0` already answers for the page as a whole,
  // asked once more per tab rather than a second `can(` call (R61 holds this
  // file to exactly one). A page whose sections are ALL one kind (nine of
  // the eleven today: five vocabulary-only, four automations-only) draws a
  // single tab rather than a second, empty one with nothing behind it — this
  // repo's standing rule against a control that decides nothing (R36, R70),
  // read onto a tab instead of a switch. Tickets and Accounts, where a
  // module genuinely owns both, are where two tabs show side by side.
  const automationsSection = sections.find(
    (s): s is Extract<ModuleSettingsSection, { kind: "automations" }> => s.kind === "automations"
  )
  const vocabularySections = sections.filter(
    (s): s is Extract<ModuleSettingsSection, { kind: "vocabulary" }> => s.kind === "vocabulary"
  )
  // THE THIRD KIND, 15 SEP 2026 — a choice that is not a `selectable_data`
  // group (this file's own `ModuleSettingsSection` header). It shares the
  // "Choices" TAB with `vocabularySections` — the tab is about what the
  // reader is looking for, not about which table backs it — but draws
  // through its own component (`MeetingTypesPanel`), never
  // `SettingsChoicesPanel`.
  const meetingTypesSection = sections.find(
    (s): s is Extract<ModuleSettingsSection, { kind: "meetingTypes" }> => s.kind === "meetingTypes"
  )
  // THE FOURTH KIND, 21 SEP 2026 — a team-wide default (Waves' own "Phase
  // days"), never a vocabulary and never a switch. Its own tab, drawn only
  // where `visibleModuleSettings` actually returns it, the identical refusal
  // every other tab here already stands on.
  const phaseDaysSection = sections.find(
    (s): s is Extract<ModuleSettingsSection, { kind: "phaseDays" }> => s.kind === "phaseDays"
  )

  // R16 — THE NUMBER ON EACH TAB, exactly once, through the one `formatCount`
  // seam.
  //
  //   · AUTOMATIONS — how many automations this module has: `AUTOMATIONS`
  //     (shared/automations.ts) is the one registry every automation ships
  //     in, filtered to this page's own segment, the same list
  //     `ModuleAutomations` itself reads. A code constant rather than a
  //     server total (there is no table of automations to COUNT(*) over —
  //     see that file's own header), so the exactness R16 asks for is free:
  //     the number IS the registry.
  //
  //   · CHOICES — RULED TWICE, ONE DAY APART, AND THE SECOND RULING WINS.
  //     Client, 2026-09-14: "show the total count for Automations and for
  //     Choice Components categories, not for the amount of choices." Client,
  //     2026-09-15, on the Tickets page specifically, the badge reading 1
  //     while the panel below it listed 15 values: "Even though I can see a
  //     lot of active ticket choices, it still shows me the choices count as
  //     1... Maybe we need to recheck how these tab counts are working
  //     everywhere in the app and fix it." A census of every tab badge in
  //     both front doors (~25 of them — threads, stories, time, attachments,
  //     apps, waves, sprints, todos, members, modules, tickets, meetings,
  //     portal users, the five on the tickets collection) found this one the
  //     LONE exception to "the badge counts the rows the panel below it
  //     lists". The inconsistency was the defect, not either day's
  //     arithmetic — so this counts VALUES now, the same rule every other
  //     tab in the app already follows, and the 14 Sep comment above stays
  //     only as the record of what changed and why, not as a rule.
  //
  //     NOT A SECOND DOOR. `selectable:${teamId}` is the SAME cache key
  //     `SettingsChoicesPanel` and `MeetingTypesPanel` already prime (R56 —
  //     one door ask), read again here rather than fetched again. Both
  //     `listSelectable` and `listMeetingPurposes` (workers/.../lib/
  //     selectable.ts, delivery.ts) carry a real `LIMIT LIST_HARD_CAP` —
  //     "R14 hard cap — never unbounded; move to real paging before this
  //     bites" — so a loaded list's length is a CEILING, never a total, the
  //     moment it comes back AT that cap. `settings-screen.tsx`'s own
  //     general (unscoped) Choices tab already rules on this exact tradeoff
  //     for the same data — `badge: ""`, because "a second count here would
  //     be the same fact twice" through the kit panel's own live register —
  //     so a module-scoped count reusing that same register is the
  //     established pattern, not a new one. The one case that register
  //     cannot cover is what THIS badge is for: a number BEFORE the panel
  //     below it has mounted at all. `choiceValueCount` below is `undefined`
  //     — `formatCount(undefined)` renders "", the same silence the general
  //     tab ships — whenever the source it would count from is still
  //     loading OR came back at the cap: a wrong number is worse than no
  //     number (the same refusal R23 makes for an uncited answer and R42
  //     makes for an unreadable file), and the day that cap is actually
  //     reachable this badge goes quiet rather than lying about it.
  const automationsCount = AUTOMATIONS.filter((a) => a.segment === segment).length
  const selectableQ = useCached<SelectableValue[]>(
    vocabularySections.length > 0 && teamId ? `selectable:${teamId}` : null,
    () => tenancy.selectable().then((r) => r.values)
  )
  const purposesQ = useCached<MeetingPurpose[]>(
    meetingTypesSection && teamId ? purposesKey(teamId) : null,
    () => contentApi.meetingPurposes().then((r) => r.purposes)
  )
  const choiceGroups = new Set(vocabularySections.flatMap((s) => s.types))
  const selectableValueCount =
    vocabularySections.length === 0
      ? 0
      : selectableQ.data === undefined || selectableQ.data.length >= LIST_HARD_CAP
        ? undefined
        : selectableQ.data.filter((v) => choiceGroups.has(v.type)).length
  const meetingTypeValueCount = !meetingTypesSection
    ? 0
    : purposesQ.data === undefined || purposesQ.data.length >= LIST_HARD_CAP
      ? undefined
      : purposesQ.data.length
  const choiceValueCount =
    selectableValueCount === undefined || meetingTypeValueCount === undefined
      ? undefined
      : selectableValueCount + meetingTypeValueCount

  const tabs: TabItem[] = []
  if (automationsSection)
    tabs.push({
      value: "automations",
      label: t("Automations"),
      icon: "",
      badge: formatCount(automationsCount),
      badgeVariant: "" as const,
    })
  if (vocabularySections.length > 0 || meetingTypesSection)
    tabs.push({
      // THE GLOSSARY'S OWN WORD (`shared/glossary.ts`, `dropdownValues.term`),
      // never "Choice components" — the client asked for "whatever the
      // standard term in the industry is", and CLAUDE.md's voice rule
      // (warm, plain, no jargon, the glossary's own words) already answers
      // that question in the other direction: "picklist" / "option set" /
      // "reference data" are exactly the jargon that rule refuses, and this
      // app already has a plain word for the same concept, used nowhere else.
      value: "choices",
      label: t("Choices"),
      icon: "",
      badge: formatCount(choiceValueCount),
      badgeVariant: "" as const,
    })
  // PHASE DAYS — its own tab, seven fixed numbers rather than a vocabulary a
  // person adds rows to, so it carries no count badge (R97 — a number that
  // does not COUNT anything wears none).
  if (phaseDaysSection)
    tabs.push({
      value: "phaseDays",
      label: t("Phase days"),
      icon: "",
      badge: "",
      badgeVariant: "" as const,
    })

  // Remembered per address (`/settings/<segment>`), like every other tab
  // strip in the app — a visit to Ticket settings and a visit to Account
  // settings do not share one memory slot.
  const [tab, setTab] = useRemembered<string>(
    "tab",
    automationsSection ? "automations" : phaseDaysSection ? "phaseDays" : "choices"
  )

  // AN ADDRESS NOBODY HAS A PAGE FOR, and one a reader may not see, land in the
  // same place — and it is `NoAccess` rather than `NotFound` for both, because
  // its own sentence ("You don't have access to this, or it doesn't exist") is
  // the only honest thing to say when telling them apart would itself disclose
  // which modules this team has settings for.
  if (!page || !teamId || sections.length === 0) return <NoAccess />

  return (
    // --heading-strip-gap (web/app/globals.css) - Aurora, 22 Sep 2026: "reduce
    // the spacing above the folder tabs, there's too much."
    <div className="flex w-full flex-col gap-[var(--heading-strip-gap)]">
      {/* THE SAME TITLE TREATMENT SETTINGS ITSELF TAKES — a plain page title,
          no eyebrow, no chip, no glyph (the kit's own "Page title" step,
          display-m/56/500; `web/components/records/collection-heading.tsx`
          carries the client rulings behind that). This is a main screen: it is
          an address, it has a workspace tab, and it is not a record. */}
      {/* NO SUBTITLE UNDER IT — client, 2026-09-10: *"in ticket settings (or
          any other module) no subtitle."* See `ModuleSettingsPage.title`'s own
          note for why the FIELD went with the `<p>` rather than being left
          unread. A bare `<h1>` is what Settings itself draws one screen up. */}
      <Headline as="h1" size="display-m">{t(page.title)}</Headline>

      {/* THE TWO TABS — drawn through the library `TabsView` (R2/R3/R8: no
          hand-rolled tab strip), the same config-driven engine every record
          detail and the Settings/Kwapso screens already use. Each panel keeps
          its own reads, its own toolbar and its own dialogs exactly as the
          stacked layout did; only the arrangement (tabbed, not `gap-8`
          stacked) and the section's own name (now on the tab, not inside the
          Choices panel's toolbar — see settings-choices-panel.tsx) changed.

          THE STRIP AND ITS PANEL ARE SIBLINGS, DRAWN THROUGH THE SAME SEAM
          EVERY OTHER MAIN SCREEN USES (R63/R77, 15 Sep 2026) — this is a main
          screen (an address, a workspace tab, not a record), so its strip
          pins on scroll exactly like Accounts', Apps', Tickets' and
          Settings' own do: through `renderFolderTabs`, the one place
          `STICKY_FOLDER_TABS` is applied, never a second class hand-rolled
          here. `TabsView`'s own `renderPanel` prop wraps each panel in a
          Radix `TabsContent` inside the SAME `<Tabs>` root as the tablist —
          fine for a record's inner strip (`STICKY_TABS` scopes its sticky
          rule to `[role=tablist]` alone), wrong here, because
          `STICKY_FOLDER_TABS` pins the whole `<Tabs>` root and a root that
          also wraps the panel content would pin the CONTENT along with the
          strip. So the panel is rendered as a plain sibling instead, keyed
          on `tab` directly rather than on Radix's own `value` — the exact
          split `settings-screen.tsx` already reads this pattern off of. */}
      <div className="flex w-full flex-col">
        {renderFolderTabs({ config: { ...defaultTabsConfig, tabs }, value: tab, onValueChange: setTab })}
        {(function renderPanel(panel: { value: string }): React.ReactNode {
          if (panel.value === "automations")
            return automationsSection ? (
              <ModuleAutomations
                key={automationsSection.key}
                teamId={teamId}
                // NO `title` PROP ANY MORE — see module-automations.tsx's own
                // header. `title: t(page.title)` here is the module's own
                // display name ("Tickets", "Time", …), read by the table's
                // Module column on every row, the same fact the unscoped
                // Settings › Automations mounting already carries per module.
                scope={{ kind: "module", segment, title: t(page.title) }}
              />
            ) : null
          if (panel.value === "choices")
            // ── ONE EDITOR, TWO SCOPES — 15 SEP 2026 ─────────────────────
            // This used to mount `SelectableScreen` (this file's own header,
            // "never a second editor") — true the day it was written, and
            // it stopped being true the day `SettingsChoicesPanel` shipped
            // as the general Choices tab's OWN editor, one day before this
            // change: two components drawing one concept is the exact drift
            // that sentence exists to refuse. `SettingsChoicesPanel`'s
            // `scope` prop (settings-choices-panel.tsx's own header, "the
            // one module-settings allowed edit here") is what makes this
            // file's editor and that one the SAME editor again — narrowed to
            // THIS page's segment, which already covers every vocabulary
            // section it owns (there is at most one per page today; see
            // `MODULE_SETTINGS`'s own header), so this is one mounting
            // rather than a `.map` over sections the way `SelectableScreen`
            // needed.
            //
            // AND A SECOND, DIFFERENT COMPONENT BESIDE IT ON THE SAME TAB —
            // `meetingTypesSection`, this file's own third `kind`. The tab
            // is "Choices" because that is what the reader is looking for,
            // not because one table backs everything under it; the Meetings
            // page is the one place today that draws both halves at once
            // (though it in fact only ever has one, `meetingTypesSection`),
            // stacked the same way two vocabulary sections used to stack
            // before Task B narrowed that to one `SettingsChoicesPanel` call.
            return (
              <div className="flex flex-col gap-8">
                {vocabularySections.length > 0 && (
                  <SettingsChoicesPanel
                    teamId={teamId}
                    can={can}
                    scope={{
                      segment,
                      // ── THE IMPORT DOOR, THIS PAGE'S OWN — 11 SEP 2026 ──
                      // Unchanged in substance from the `SelectableScreen`
                      // mounting this replaces: *"each module's settings
                      // page gets its own import and export for its own
                      // groups… nothing sits outside Settings"* (client
                      // ruling). The groups are every vocabulary section's
                      // own `types` (usually one section, occasionally two —
                      // Accounts owns Industry and Country in ONE section
                      // already, so this is the same union `section.types`
                      // alone used to be).
                      onImport: () =>
                        openInNewTab(
                          `/t/${teamId}/import/selectable_data?groups=${encodeURIComponent(
                            vocabularySections.flatMap((s) => s.types).join(",")
                          )}`,
                          // NO PER-GROUP WORD TO GIVE IT — see
                          // `IMPORT_TARGET_LABEL`'s own note: the scope here
                          // lives in `?groups=`, which the tab store never
                          // sees (its identity is the bare pathname), so a
                          // richer label here would only be clobbered back
                          // to "Import" the moment `deep-link-screen.tsx`'s
                          // own crumb effect runs. Passing the same word it
                          // will settle on keeps this a single paint rather
                          // than a flash.
                          t("Import")
                        ),
                    }}
                  />
                )}
                {/* MEETING TYPES — its own adapter, not `selectable_data`
                    (this file's `kind: "meetingTypes"` header). `?groups=`
                    is `selectable_data`'s own import door's argument and
                    means nothing to `meeting_purposes`'s import target
                    (`workers/data-ops/src/lib/targets.ts`, keyed by table),
                    so this passes the bare wizard address rather than
                    reusing the vocabulary sections' URL. */}
                {meetingTypesSection && (
                  <MeetingTypesPanel
                    teamId={teamId}
                    can={can}
                    onImport={() => openInNewTab(`/t/${teamId}/import/meeting_purposes`, t("Import"))}
                  />
                )}
              </div>
            )
          // PHASE DAYS — the team's own defaults, the same seven-row panel a
          // wave's own Settings sheet draws (wave-phase-days-panel.tsx),
          // never a second editor for one fact. `TeamPhaseDayDefaultsPanel`
          // asks `work:update` itself (its own `usePermissions` call, the
          // same split `ModuleAutomations` already takes) — R61 holds THIS
          // file to exactly one `can(` call, the one `visibleModuleSettings`
          // already made above to decide whether this section is offered.
          if (panel.value === "phaseDays")
            return phaseDaysSection ? (
              <TeamPhaseDayDefaultsPanel key={phaseDaysSection.key} teamId={teamId} />
            ) : null
          return null
        })({ value: tab })}
      </div>
    </div>
  )
}

/** THE GEAR — the door out of a module's own screen and into its settings.
 *
 * HER WORDS, 2026-09-09: *"on each module, we have a settings gear"*, and the
 * placement she named with it — the top right of the screen, an icon and no
 * label. It is placed through `CollectionHeading`'s `action` slot, whose own
 * doc carries the argument for why a door OUT of a screen cannot live in the
 * toolbar: `<ToolbarRow>` returns nothing at all on an empty collection (R50),
 * so a gear in `actions` would vanish from a team with no tickets yet — which
 * is the exact moment somebody goes looking for the ticket types.
 *
 * THE CLIENT'S RULING, 2026-09-15: *"The settings gear should never be mango.
 * Make it with a beige background."* Over a screenshot of Tasks' heading where
 * the gear was drawn with the default mango fill, she asked for the beige
 * filled circle (`variant: "secondary"`), the same background the member page's
 * pencil uses. Every gear mount (module headings, Team toolbar) draws through
 * this one function. Changed from `buttonVariants({ size: "icon" })` (default =
 * mango) to `buttonVariants({ variant: "secondary", size: "icon" })` (beige).
 *
 * A REAL ANCHOR (R37) — `InAppLink`, so middle-click opens the settings page in
 * a tab and the address can be copied, while a plain left click stays inside
 * the one shell. The kit's button SHAPE comes from `buttonVariants` rather than
 * from a hand-written class list, so this control is the same 40px square with
 * the same focus ring as every other icon button in the app; `Button` itself
 * cannot be used because its `asChild` slot would hand its props to a component
 * that takes none.
 *
 * THE NAME IS SAID TWICE ON PURPOSE: `sr-only` for the accessible name (the
 * words a label would have carried, which is where `AddButton` puts them too)
 * and the tooltip for everybody else. The tooltip's trigger is a wrapping
 * `<span>` for the same reason as above — `InAppLink` accepts no injected props
 * and would silently drop the trigger's.
 *
 * IT ASKS THE PAGE'S OWN GATE. Not `selectable_data:read` written out a second
 * time — `visibleModuleSettings` is the one answer to "is there a page here for
 * this reader", so a gear can never lead somewhere that refuses the person who
 * pressed it. */
export function ModuleSettingsGear({
  teamId,
  segment,
}: {
  teamId: string | null
  /** The module's URL segment — `tickets`, which is also `/settings/tickets`. */
  segment: string
}) {
  const t = useT()
  const { can } = usePermissions(teamId)
  const page = moduleSettingsPage(segment)
  if (!page || !teamId || visibleModuleSettings(segment, can).length === 0) return null
  const label = t(page.title)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <InAppLink
            href={`/settings/${segment}`}
            className={buttonVariants({ variant: "secondary", size: "icon" })}
          >
            <Gear className="size-4" />
            <span className="sr-only">{label}</span>
          </InAppLink>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
