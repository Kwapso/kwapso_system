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
import { NoAccess } from "@/components/deep-link/screen-bits"
import { SelectableScreen } from "@/components/choices/selectable-screen"
import type { Can, Right } from "@/lib/perms"
import { usePermissions } from "@/lib/perms"
import type { ActiveTeam } from "@/lib/use-active-team"
import { useT } from "@shared/web/language"

/** One block on a module's settings page.
 *
 * `kind` IS A UNION OF ONE, ON PURPOSE — see this file's header. Both sections
 * the pilot needs are vocabularies, so a second member would be a guess about
 * what the second module wants rather than a fact about what this one has. */
export type ModuleSettingsSection = {
  /** Stable within its page — React's key, and the thing a future `?section=`
   * would name. Never shown to anybody, so it is not a sentence. */
  key: string
  /** WHO MAY SEE THIS BLOCK AT ALL. The same right the same content is gated on
   * wherever else it appears — the Choices tab on Settings gates its editor on
   * `selectable_data:read` and so does this, because a reader who is refused
   * there must be refused here rather than finding a second way in. */
  gate: { module: string; right: Right }
  kind: "vocabulary"
  /** The `selectable_data.type` groups this block edits. */
  types: string[]
  /** English; translated at the read, below. */
  title: string
  description: string
  /** Whether this vocabulary can grow — `SelectableScope.create` carries the
   * whole argument, and it is a fact about the words rather than the reader. */
  create: boolean
}

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
  description: string
  sections: ModuleSettingsSection[]
}

/** THE MODULES THAT HAVE SOMETHING TO SET — *"Only the ones with something to
 * set"* (client, 2026-09-09), which is why this is a list of the modules that
 * do rather than a table over all of them with most entries empty.
 *
 * TICKETS ALONE, deliberately: this is the pilot that proves the shape, and the
 * other modules follow once she has seen it. */
const MODULE_SETTINGS: ModuleSettingsPage[] = [
  {
    segment: "tickets",
    title: "Ticket settings",
    description: "The words and rules this team's tickets run on.",
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
      },
      {
        key: "ticket-status",
        gate: { module: "selectable_data", right: "read" },
        kind: "vocabulary",
        types: ["Ticket status"],
        title: "Ticket statuses",
        // Says what can be changed AND what cannot, because the difference is
        // invisible on screen: these rows look exactly like the ones above and
        // behave differently. `VOCABULARY_HOMES["Ticket status"]` is `"labels"`
        // — the code owns the stages, these rows own the words for them.
        description: "The words for the stages a ticket moves through. The stages themselves are fixed; what you set here is what each one is called.",
        create: false,
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
 *     just the page, so the tab can print "Ticket types · Ticket statuses"
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
      <div>
        <Headline as="h1" size="display-m">{t(page.title)}</Headline>
        <p className="text-muted-foreground mt-1 text-sm">{t(page.description)}</p>
      </div>

      {/* THE SECTIONS, STACKED — the same arrangement Settings' own Appearance
          and Team panels use (`gap-8`), because this is the same kind of page
          and a second rhythm for one idea is how spacing drifts. The host does
          the arranging and nothing else; each section owns its own reads, its
          own toolbar and its own dialogs. */}
      <div className="flex flex-col gap-8">
        {sections.map((section) =>
          /* THE HOST'S ONE BRANCH. `kind` is read rather than assumed, so the
             day a section arrives that is not a vocabulary the answer is a new
             member here and a new arm below — visible, in this file, instead of
             a second screen written somewhere else because this one only ever
             knew how to draw one thing. */
          section.kind !== "vocabulary" ? null : (
          <SelectableScreen
            key={section.key}
            teamId={teamId}
            // NO `onImport`, AND NO RECORD TO OPEN. The CSV doors are the whole
            // vocabulary's (see `SelectableScope`), and a value's own record
            // page lives under the team area — hopping out of a settings page
            // into a record detail is the move the client stopped on Settings ›
            // Team ("Everything should be in different containers… not taken
            // anywhere else", 2026-09-09), and it applies here for the same
            // reason. Renaming, the emoji, the default mark and deactivating
            // are all inline on the row already.
            standalone={false}
            scope={{
              types: section.types,
              title: t(section.title),
              description: t(section.description),
              create: section.create,
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
