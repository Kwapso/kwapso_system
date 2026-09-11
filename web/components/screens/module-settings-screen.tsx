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
//     Choices editor narrowed to this module's groups (`SelectableScope` in
//     `web/components/choices/selectable-screen.tsx`), never a second editor.
//     A value edited in two places is a value that drifts.
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

import { buttonVariants } from "@shared/ui/components/button/button"
import { Gear } from "@shared/ui/foundations/icons"
import { Headline } from "@shared/ui/components/typography/typography"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"

import { InAppLink } from "@/components/shell/in-app-link"
import { softNavigate } from "@/lib/nav"
import { NoAccess } from "@/components/deep-link/screen-bits"
import { ModuleAutomations } from "@/components/screens/module-automations"
import { SelectableScreen } from "@/components/choices/selectable-screen"
import type { Can, Right } from "@/lib/perms"
import { ticketTypeColour } from "@/lib/type-colours"
import { usePermissions } from "@/lib/perms"
import type { ActiveTeam } from "@/lib/use-active-team"
import { useT } from "@shared/web/language"

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
  description: string
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
      /** Whether this vocabulary can grow — `SelectableScope.create` carries the
       * whole argument, and it is a fact about the words rather than the reader. */
      create: boolean
      /** THE COLOUR EACH WORD IS KNOWN BY, when this group has one — and the whole
       * of what turns the section from a LIST into a WALL OF CHIPS.
       *
       * The client, 2026-09-10: *"on ticket type, show it like chips with their
       * color, not a list."* A ticket type is already a coloured chip everywhere
       * else in the app — the list's Type cell, the triage card, the type picker,
       * every panel on the dashboard — and it was a stack of grey rows only on the
       * one screen where the words are SET. Her ruling of 2026-09-07 is the same
       * sentence read from the other end: *"for type, kill the emojis. this is
       * legacy. in current system we use colors."*
       *
       * A FUNCTION AND NOT A COLUMN, because a value's colour is not stored:
       * `selectable_data` has four meaningful columns and none of them is a colour
       * (`web/lib/type-colours.ts` argues that out at length and is the ONE place a
       * ticket type's colour is decided). Passing the resolver down is what keeps
       * that true — the editor draws whatever colour it is handed and knows nothing
       * about ticket types, and a second group that gains a palette hands its own.
       *
       * ABSENT MEANS A LIST, which is every other vocabulary: Sprint types and
       * Story types have a MARK rather than a colour and their rows read as rows. */
      colour?: (value: string) => string
    })
  | (ModuleSettingsSectionBase & {
      /** EVERY AUTOMATION ON THIS MODULE, each with a switch or the reason it
       * has none (R70, client 2026-09-11). No fields: the rows are
       * `AUTOMATIONS` filtered to this page's own segment, so a module that
       * gains an automation gains a row without anybody editing this table. */
      kind: "automations"
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
   * title and once underneath. The SECTION descriptions below are a different
   * thing and they stay: they say what a particular vocabulary DOES, which is
   * not recoverable from its name.
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
 * a whole `SelectableScreen`, and a `SelectableScreen` is a toolbar (R63 pins
 * it to the top of the scroll) plus a mango `AddButton` (the kit rules one per
 * view). Two of them stacked would pin two bars to one edge and draw two brand
 * fills. `SelectableScope.types` already takes a LIST and heads each group with
 * its own name inside the one card, so the reader still sees "Industry" and
 * "Country" as two named blocks — they share a search, a filter and one
 * "New value" that asks which group, which is what the whole-vocabulary screen
 * has always done and is the narrowing this prop exists for. */
const MODULE_SETTINGS: ModuleSettingsPage[] = [
  {
    segment: "tickets",
    title: "Ticket settings",
    sections: [
      {
        key: "ticket-type",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        // The group name is the literal `selectable_data.type` string, and it is
        // the join key: `shared/selectable-homes.ts` records that this group's
        // words are STORED on `help.help_type` and `help.raised_as_type`, which
        // is why renaming one is a rewrite and not a relabel.
        types: ["Ticket type"],
        title: "Ticket types",
        description: "The kinds a ticket can be raised as. Each one is a tab on the ticket list and a filter beside it.",
        create: true,
        // THE COLOUR, WHICH IS WHAT MAKES THIS SECTION A WALL OF CHIPS — the
        // one map the whole app reads a ticket type's colour from, handed in
        // rather than re-derived (`ModuleSettingsSection.colour` above).
        colour: ticketTypeColour,
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
      // second and different question (`teams:edit`, asked at the door and in
      // `module-automations.tsx`), which is why the two are not one gate.
      {
        key: "automations",
        gate: { module: "help", right: "read" },
        kind: "automations",
        title: "Automations",
        description: "What this module does on its own. Some can be switched off; the rest say why not.",
      },
    ],
  },
  // THE WORK ENGINE. Three segments, three modules' worth of settings, and every
  // one of them a group `shared/selectable-homes.ts` puts on that module's own
  // table — `tasks.department`, `stories.story_type`, `sprints.sprint_type`.
  {
    segment: "tasks",
    title: "Task settings",
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
        description: "The parts of the agency a task is filed under. Meeting purposes use the same words.",
        create: true,
      },
    ],
  },
  {
    segment: "stories",
    title: "Story settings",
    sections: [
      {
        key: "story-type",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        types: ["Story type"],
        title: "Story types",
        description: "The kinds of work a story can be. Each one carries the mark a story is recognised by.",
        create: true,
      },
    ],
  },
  {
    segment: "sprints",
    title: "Sprint settings",
    sections: [
      {
        key: "sprint-type",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        types: ["Sprint type"],
        title: "Sprint types",
        description: "The kinds of block a sprint runs as, with the mark and the length each one usually takes.",
        create: true,
      },
    ],
  },
  // THE BUILD SIDE. Apps owns TWO groups and gets ONE section for the reason
  // this table's own header gives: a second section is a second pinned toolbar
  // and a second mango. `SelectableScope.types` heads each group by name inside
  // the one card, so the page still reads as stages and kinds.
  {
    segment: "apps",
    title: "App settings",
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
        description: "How far an app has got, and what kind of thing we handed over.",
        create: true,
      },
    ],
  },
  {
    segment: "accounts",
    title: "Account settings",
    sections: [
      {
        key: "account-vocabulary",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        // Both on `accounts` — `accounts.industry` and `accounts.country`. One
        // section for the same reason Apps has one.
        types: ["Industry", "Country"],
        title: "Industries and countries",
        description: "The words an account's industry and country are picked from, so neither is spelled two ways.",
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
        description: "What this module does on its own. Some can be switched off; the rest say why not.",
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
    title: "Time settings",
    sections: [
      {
        key: "automations",
        gate: { module: "work", right: "read" },
        kind: "automations",
        title: "Automations",
        description: "What this module does on its own. Some can be switched off; the rest say why not.",
      },
    ],
  },
  {
    /* What is said in a room, written down by itself. The taxonomy of why we
     * meet lives under `delivery` and has its own screen; this page is only
     * about the capture. */
    segment: "meetings",
    title: "Meeting settings",
    sections: [
      {
        key: "automations",
        gate: { module: "meetings", right: "read" },
        kind: "automations",
        title: "Automations",
        description: "What this module does on its own. Some can be switched off; the rest say why not.",
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
    title: "Knowledge base settings",
    sections: [
      {
        key: "automations",
        gate: { module: "knowledge", right: "read" },
        kind: "automations",
        title: "Automations",
        description: "What this module does on its own. Some can be switched off; the rest say why not.",
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
    title: "Member settings",
    sections: [
      {
        key: "automations",
        gate: { module: "team_members", right: "read" },
        kind: "automations",
        title: "Automations",
        description: "What this module does on its own. Some can be switched off; the rest say why not.",
      },
    ],
  },
  {
    /* THE ESTATE — the installation's own nightly work, which belongs to no
     * module either and is the harder of the two homeless classes.
     *
     * `team` IS THE SEGMENT because `teams` is the permission this base already
     * treats as "this team's own settings" — the recipe store gates on
     * `teams:edit` for the same reason, and R36 records that `screens` was
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
     * inside a table. */
    segment: "team",
    title: "Housekeeping",
    sections: [
      {
        key: "automations",
        gate: { module: "teams", right: "edit" },
        kind: "automations",
        title: "Automations",
        description: "What this module does on its own. Some can be switched off; the rest say why not.",
      },
    ],
  },
  {
    segment: "brand",
    title: "Brand library settings",
    sections: [
      {
        key: "brand-category",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        types: ["Brand asset category"],
        title: "Asset categories",
        description: "The shelves the brand library is sorted into.",
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
 *   • THE ROW CAN SAY WHAT IS ON THE PAGE. It carries the visible SECTIONS, not
 *     just the page, so the tab can print "Ticket types"
 *     underneath the name instead of a bare noun. An index whose rows are only
 *     nouns is a menu; one that says what is inside is scannable. And because
 *     the sections are the FILTERED ones, the subtitle never promises a block
 *     this particular reader will not be shown.
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

  // AN ADDRESS NOBODY HAS A PAGE FOR, and one a reader may not see, land in the
  // same place — and it is `NoAccess` rather than `NotFound` for both, because
  // its own sentence ("You don't have access to this, or it doesn't exist") is
  // the only honest thing to say when telling them apart would itself disclose
  // which modules this team has settings for.
  if (!page || !teamId || sections.length === 0) return <NoAccess />

  return (
    <div className="flex w-full flex-col gap-6">
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

      {/* THE SECTIONS, STACKED — the same arrangement Settings' own Appearance
          and Team panels use (`gap-8`), because this is the same kind of page
          and a second rhythm for one idea is how spacing drifts. The host does
          the arranging and nothing else; each section owns its own reads, its
          own toolbar and its own dialogs. */}
      <div className="flex flex-col gap-8">
        {sections.map((section) =>
          /* THE HOST'S TWO BRANCHES, AND THE SECOND ONE ARRIVED THE WAY THE
             FIRST ONE'S COMMENT SAID IT WOULD — *"one member and one branch, in
             the open"*, on 2026-09-11, when the client ruled that every
             automation in the base is visible on its module's settings page.
             Still no abstraction over what a section might one day be: two
             kinds, two arms, and the day there is a third it is written here
             rather than guessed at now. */
          section.kind === "automations" ? (
            <ModuleAutomations
              key={section.key}
              teamId={teamId}
              segment={segment}
              title={t(section.title)}
              description={t(section.description)}
            />
          ) : (
          <SelectableScreen
            key={section.key}
            teamId={teamId}
            // ── THE IMPORT DOOR, THIS PAGE'S OWN — 11 SEP 2026 ──────────────
            // This line used to read "NO `onImport`", because the CSV doors
            // acted on the team's whole vocabulary and a button on a page
            // titled "Ticket settings" would have done more than the page said.
            // The client ruled otherwise when she retired the Choices tab:
            // *"each module's settings page gets its own import and export for
            // its own groups… nothing sits outside Settings."*
            //
            // SO THE DOOR NARROWED, not the button. The wizard is the app's one
            // import screen and the scope travels in its address — the confirm
            // door reads the same list off the body and skips every row in
            // another group with a reason, so this page cannot write a Country
            // even if the file holds one. `section.types` is the same list the
            // section's Export CSV sends to `?groups=`, so the two halves of
            // her sentence are one fact.
            onImport={() =>
              softNavigate(
                `/t/${teamId}/import/selectable_data?groups=${encodeURIComponent(section.types.join(","))}`
              )
            }
            // STILL NO RECORD TO OPEN, and that is a decision rather than an
            // omission — `onOpen` is what draws the row's link to a value's own
            // detail screen, and that screen was retired on 11 Sep 2026 with the
            // whole-vocabulary screen that was its only door. A settings page
            // navigating OUT of Settings is the move the client stopped on
            // Settings › Team ("Everything should be in different containers…
            // not taken anywhere else", 2026-09-09), and the report on this
            // change records what the removed screen carried and where it is
            // read now. Renaming, the mark, the default mark and deactivating
            // are all on the row (or, on a coloured group, on the chip).
            //
            // NO `standalone` EITHER: the prop is gone. It chose between a
            // page-sized heading with the registry's own count (R16 ii) and a
            // section heading, and there is only one mounting left.
            scope={{
              types: section.types,
              title: t(section.title),
              description: t(section.description),
              create: section.create,
              // ABSENT ON A GROUP WITH NO PALETTE, which is what turns the
              // section back into a list — see `ModuleSettingsSection.colour`.
              colour: section.colour,
            }}
          />
          )
        )}
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
 * IT IS NOT MANGO, and it is not `AddButton`. The Tickets screen's one brand
 * fill is "Raise ticket" (kit RULES §2.5, one mango per view), and this is not
 * even a create. `ghost` is also the only honest choice on this ground: the
 * kit's own ch26 note says an icon-only control is `secondary`, and a secondary
 * button resolves `--btn-secondary-fill` to `var(--card)` — which on the bare
 * page ground IS `--background` in light (#FFFEF9 both), the 1.000 that shipped
 * three times this week. Ghost carries no fill at all, so it introduces no
 * ground and there is nothing to measure: tertiary ink on the page, going to
 * full ink on hover.
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
            className={buttonVariants({ variant: "ghost", size: "icon" })}
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
