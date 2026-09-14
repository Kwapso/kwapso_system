"use client"

// ONE MODULE'S AUTOMATIONS, ON ITS OWN SETTINGS PAGE.
//
// ── THE CLIENT'S RULING, 2026-09-11 ─────────────────────────────────────────
//
//   *"include absolutely all of those in settings by module. I want no
//    automation without visibility."*
//   *"so far i want visibility and on+off."*
//
// So this is a LIST OF EVERY AUTOMATION on this module, not a list of the ones
// that happen to be adjustable. A row is a name, a sentence saying what happens,
// and then either a switch or the reason there is not one — and the reason is
// the whole point of the second half. "You may see this and may not change it,
// because the sign-in code is how everybody signs in" is visibility; a row that
// is inert and silent is the control-that-looks-like-it-works this base has
// shipped four times.
//
// ── WHY IT IS A SECTION AND NOT A SCREEN ────────────────────────────────────
//
// `ModuleSettingsSection.kind` was a union of exactly one member — `vocabulary`
// — and its own header said the second one should be added "in the open,
// rather than being bent into a shape guessed at today". This is that second
// member, and nothing about the host changed except one arm: a page is still an
// entry in `MODULE_SETTINGS` and a section is still an entry in its `sections`.
//
// ── WHAT IT READS, AND WHAT IT DOES NOT ─────────────────────────────────────
//
// The REGISTRY (`shared/automations.ts`) ships in the code, like the base
// recipes: what exists, what it does, whether it can be switched, and why not.
// The DOOR (`GET /api/tenancy/config/automations`) answers only with this
// team's overrides of it, which is to say only the ones switched OFF. So an
// absent answer is every automation on, a failed read is every automation on,
// and a team that has never opened this page sees exactly what the code says it
// does. Nothing here has to be seeded, migrated, or kept in step.
//
// ── THE GATE, AND WHY IT IS NOT ASKED HERE TWICE ────────────────────────────
//
// Whether this section is DRAWN AT ALL is `visibleModuleSettings`'s answer, one
// file over, and R61 holds that to exactly one `can(` in the host. Whether the
// switches can be MOVED is a second and different question — `teams:update`, the
// same right the door gates on — and it is asked here, in this file, for the
// same reason `SelectableScreen` asks its own three: a section owns its writes.
// Reading is open to any member the module's own gate lets through, because her
// ruling is visibility and "what does this software do without me asking" must
// not be behind the right to change it.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Text } from "@shared/ui/components/typography/typography"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/components/select/select"
import { Switch } from "@shared/ui/components/switch/switch"
import { toast } from "@shared/ui/components/sonner/sonner"
import { primeCache, useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"

import { ApiFailure, tenancy } from "@/lib/api"
import { usePermissions } from "@/lib/perms"
import { CollectionCard, ToolbarRow } from "@/components/deep-link/screen-bits"
import {
  AUTOMATIONS,
  automationStatus,
  type Automation,
  type AutomationStatus,
} from "@shared/automations"

/* NO "WHEN DOES THIS HAPPEN" LINE, and it is a deletion rather than an
 * omission. The registry's `trigger` is three machine words (`send` / `cron` /
 * `write`) and turning them into a sentence means a copy TABLE keyed by a union
 * member — which is exactly the shape `scripts/lib/i18n-source.mjs` cannot read:
 * a `send:` property is not one of the seven positions it walks, so the three
 * sentences would have been wrapped in `t(...)`, absent from the catalogue, and
 * shipped in English to somebody reading in German, silently, on a screen that
 * looks finished (R28's own failure). Every description below already says when:
 * "every morning", "every quarter of an hour", "the moment somebody starts a
 * timer". One sentence that a translator can see beats two where one cannot. */

/** ONE MODULE, OR EVERY MODULE THIS READER MAY SEE — the same split
 * `SelectableScope` drew for Choices, until the day its unscoped mounting was
 * retired. Read that retirement before trusting this one: `selectable-
 * screen.tsx`'s own header carries the account, and the reason was NOT "two
 * mountings of one list is wrong" — it is that the whole-vocabulary screen let
 * a team INVENT a group nothing consulted (a free-text name on create), which
 * is a capability an unscoped Choices screen had and this one never does. An
 * automation is never created here, only switched, and the registry
 * (`shared/automations.ts`) is the one list either mounting reads — so the
 * risk that sank the Choices tab does not exist on this page, and the split
 * survives on purpose rather than repeating the mistake.
 *
 * `"all"` NEVER RE-ASKS THE GATE. `modules` is the host's own
 * `moduleSettingsIndex(can)` answer, narrowed to the pages that carry an
 * automations section — `visibleModuleSettings`'s answer, computed once, in
 * the one file R61 holds to exactly one `can(` call
 * (`module-settings-screen.tsx`). This component itself never calls `can(`
 * for READ visibility: the scope it is handed already is the answer, so a
 * second gate is never added here. */
export type AutomationsScope =
  | { kind: "module"; segment: string }
  | {
      kind: "all"
      /** Every module (segment + its own, already-translated settings-page
       * title) whose automations this reader may see, in the order
       * `moduleSettingsIndex` returns them. */
      modules: { segment: string; title: string }[]
    }

export function ModuleAutomations({
  teamId,
  scope,
  title,
}: {
  teamId: string
  /** Which module's automations this mounting is about, or all of them — see
   * `AutomationsScope`, above. */
  scope: AutomationsScope
  /** English, already translated by the host (the same treatment every other
   * section title gets). Handed straight to `<ToolbarRow title>` now (14 Sep
   * 2026, the toolbar below) rather than `<SettingsSection>` — the box grew a
   * search box, a status filter and a sort control, and `SettingsSection`'s
   * own header says why a collection with a toolbar does not use it: the
   * title belongs INSIDE the pinned band with the row it titles (R63), which
   * only `<ToolbarRow>` and the plain `<CollectionCard>` beneath it carry the
   * custom properties for. Still a string and never a node, still drawn
   * inside the paper above everything else in the box: client, 2026-09-11,
   * "ticket types should be on top of the searchbar inside the container
   * without subtitle, make this. always".
   *
   * OPTIONAL SINCE 2026-09-14, for the ONE mounting that has no module of
   * its own to name: Settings › Automations (the `scope: "all"` call in
   * settings-screen.tsx) sits directly under a tab already labelled
   * "Automations" — the client's ruling that a container heading repeating
   * its own tab strip says the word twice ("we will use the title only at
   * the top"). `<ToolbarRow title>` already treats an absent title as "draw
   * nothing" (its own `heading` const), so omitting it here needs no change
   * there. The per-module mounting (module-settings-screen.tsx) keeps
   * passing a real title — that page's own section name, not a tab repeat,
   * and the thing that tells its Automations section apart from its
   * Vocabulary one. */
  title?: string
  /* NO `description`. It was the same fourteen-word sentence on all seven of
   * this component's mountings — "What this module does on its own. Some can be
   * switched off; the rest say why not." — and every row below already says
   * both halves for itself, the switch by being a switch and the protected one
   * by carrying R70's badge and its reason. Deleted with the column it came
   * from (`ModuleSettingsSectionBase`), which carries the ruling and the one
   * ruling that went the other way. */
}) {
  const t = useT()
  const { can } = usePermissions(teamId)
  // The same right the door gates the write on. A reader without it sees every
  // row and every state, and cannot move anything — which is the honest shape
  // of "visibility" for somebody who may not change the team's settings.
  const mayChange = can("teams", "update")

  const settingsQ = useCached<Record<string, string>>(`automations:${teamId}`, () =>
    tenancy.automationSettings().then((r) => r.automations)
  )
  // WHICH ROW IS IN FLIGHT, so one switch can be busy without freezing the rest.
  const [busyKey, setBusyKey] = React.useState<string | null>(null)

  // THE SEGMENTS THIS MOUNTING COVERS — one, scoped to a module's own
  // settings page, or every module `scope.modules` names, the Settings ›
  // Automations tab's own answer. Never re-derived from `can(` here — see
  // `AutomationsScope`, above.
  const segments = scope.kind === "module" ? [scope.segment] : scope.modules.map((m) => m.segment)
  const rows = AUTOMATIONS.filter((a) => segments.includes(a.segment))

  // ── THE TOOLBAR, 14 SEP 2026 ─────────────────────────────────────────────
  //
  // "add toolbar in automations: searchbar sort by name and filter by
  // status" — the same shape as every other collection in the app (R48: the
  // toolbar, search included, is a default, never a per-screen choice), so
  // this reaches for `<ToolbarRow>` (R53) rather than a bespoke row.
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<AutomationStatus | "all">("all")
  // ONE FIELD, BOTH DIRECTIONS — the same shape `members-gallery.tsx` draws
  // for its own name sort: a single-option `<SortControl>` is legitimate
  // where the FIELD is fixed and the DIRECTION is the live question (R53's
  // own `ToolbarSortSlot` doc), and an automation has exactly one sortable
  // fact, its name.
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")

  // THE MODULE FILTER — client, 2026-09-14: "add a tab for Automations and
  // show all the automations in the system, filtered by module and by
  // status." Offered only where `scope` actually spans more than one module
  // that has a row ON SCREEN — never a typed list of modules, and a
  // one-option picker decides nothing (R36's own argument, read onto a
  // filter instead of a switch). Absent on a scoped mounting: one segment is
  // not a choice.
  const [moduleFilter, setModuleFilter] = React.useState<string>("all")
  const moduleOptions =
    scope.kind === "all" ? scope.modules.filter((m) => rows.some((a) => a.segment === m.segment)) : []
  const moduleTitle = (rowSegment: string): string =>
    scope.kind === "all"
      ? (scope.modules.find((m) => m.segment === rowSegment)?.title ?? rowSegment)
      : // The module-scoped mounting always passes a real `title` (its own
        // settings page's section name); `title` only goes missing on the
        // `"all"` mounting above, whose branch never reaches here. `?? rowSegment`
        // is defensive, matching the sibling branch's own fallback, not a real path.
        (title ?? rowSegment)

  // THE STORED BLOB, READ PER ROW'S OWN SEGMENT rather than one segment fixed
  // for the whole screen — a scoped mounting has exactly one and the
  // Settings tab's unscoped one may hold ten. `automations:${teamId}`
  // already carries every segment's own overrides in the one door read above
  // (`settingsQ`), so this is a local re-slice of what is already in memory
  // and costs no second door (R56) whichever scope is asking. A blob this
  // app's own door cannot have written is read as the DEFAULT rather than as
  // a guess — the same answer `readAutomationSettings` gives in the worker,
  // because a screen and a worker disagreeing about whether something is off
  // is worse than either answer on its own.
  const storedFor = React.useCallback(
    (rowSegment: string): Record<string, unknown> => {
      const raw = settingsQ.data?.[rowSegment]
      if (!raw) return {}
      try {
        const parsed: unknown = JSON.parse(raw)
        return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {}
      } catch {
        return {}
      }
    },
    [settingsQ.data]
  )

  // WHICH STATUSES ACTUALLY APPEAR ON THIS PAGE — never a typed list of
  // three words. `automationStatus` (shared/automations.ts) is the one
  // reading of `switchable`/`isAutomationOff`, so this section and any future
  // unscoped mounting of the same control (every automation in the base, on
  // one screen — the client, 14 Sep 2026: "in automations filters
  // everywhere, add filter to protected") agree on what a row's state is
  // without either re-deriving it by hand. Offered options are the ones
  // PRESENT, exactly `contact-panels.tsx`'s own ticket-status facet ("THE
  // STATUS OPTIONS ARE DERIVED FROM WHAT'S ON SCREEN, never a hard-coded
  // enum") — a page where every row happens to be Protected offers no dead
  // On/Off that would narrow to nothing, and a page with only one state
  // present draws no control at all (below), the same self-exemption
  // `ViewSwitch` already gets for a single-body collection.
  const STATUS_ORDER: AutomationStatus[] = ["on", "off", "protected"]
  const STATUS_LABEL: Record<AutomationStatus, string> = {
    on: t("On"),
    off: t("Off"),
    protected: t("Protected"),
  }
  const statuses = STATUS_ORDER.filter((s) => rows.some((a) => automationStatus(a, storedFor(a.segment)) === s))

  // SEARCHED, THEN NARROWED BY MODULE AND STATUS, THEN SORTED — the same
  // order every collection in the app applies (`members-gallery.tsx`'s own
  // comment). Search reads what a person actually SEES
  // (`t(a.title)`/`t(a.description)`, not the English key), because a reader
  // in German typing a German word expects it to match.
  const q = query.trim().toLowerCase()
  const visible = rows
    .filter((a) => {
      if (scope.kind === "all" && moduleFilter !== "all" && a.segment !== moduleFilter) return false
      if (status !== "all" && automationStatus(a, storedFor(a.segment)) !== status) return false
      if (!q) return true
      return t(a.title).toLowerCase().includes(q) || t(a.description).toLowerCase().includes(q)
    })
    .sort((a, b) => t(a.title).localeCompare(t(b.title)) * (sortDir === "asc" ? 1 : -1))

  async function flip(a: Automation, on: boolean) {
    setBusyKey(a.key)
    try {
      const next = await tenancy.setAutomation(a.key, on)
      // THE DOOR ANSWERS WITH THE WHOLE NEW STATE, so prime rather than
      // invalidate: re-reading a door that has just told us the answer is a
      // round trip that can only return what we are holding. `justAnswered` is
      // the flag the store takes for exactly this (shared/web/store.ts).
      //
      // R1's other end is separate and still true: the door publishes
      // `automations`, and this screen is a listener for it
      // (`web/lib/live-resources.ts`), so a second admin watching the same page
      // sees the switch move rather than saving over it.
      primeCache(`automations:${teamId}`, next.automations, true)
      toast.success(on ? t("Switched on.") : t("Switched off."))
    } catch (err: unknown) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't change that. Try again."))
    } finally {
      setBusyKey(null)
    }
  }

  // THE ROWS, COMPUTED BEFORE THE RETURN — R70's own census (`web/test/
  // automations.test.ts`) finds a JSX "guarded branch" by scanning the WHOLE
  // file's text for `{cond ? (` / `{cond && (`, brace-balanced, with no idea
  // which branch is a ROW's own and which merely CONTAINS one. R62's empty-
  // result ternary below (`visible.length === 0 ? … : …`) is itself such a
  // pattern, and its own body used to be the `<ul>` holding every row inline
  // — so the census, scanning blind, found the mark twice: once in the row's
  // real `!a.switchable && a.helpText` branch, and once because that branch
  // sits INSIDE the outer ternary's own brace span. Computing the rows here,
  // as a plain array, keeps the two ternaries apart in the file's own text:
  // the JSX below never spells the mark inside `visible.length === 0 ? … : …`
  // at all, it only names `rowList`.
  const rowList = visible.map((a) => {
    const off = automationStatus(a, storedFor(a.segment)) === "off"
    return (
      <li key={a.key} className="flex items-start justify-between gap-4 rounded-[var(--radius)] bg-card p-4">
        {/* THE MARK, ABOVE THE TITLE, AND THE REASON LAST — AND ONE
            BRANCH FOR THE WHOLE ROW ON PURPOSE. Her ruling, 2026-09-14:
            "put the chip on top of the title, the protected chip." A
            first pass moved the reason up beside the badge, because R70's
            check reads the mark and the reason off ONE guarded branch and
            splitting them failed the build — the right instinct, the
            wrong reading order: a three-line explanation ahead of the
            title it explains. The reading order she actually asked for is
            badge, title, description, reason — reason LAST, because a
            reason is only legible once you know what it is a reason FOR.

            So the guard now wraps the WHOLE unswitchable row rather than
            just the badge+reason pair, with a sibling branch carrying the
            switchable row's own title+description+switch. The
            title/description JSX is written twice — that is the cost —
            and what it buys back is the same thing R70 already had: the
            badge is structurally unwriteable without its reason, because
            they are still lines inside one `!a.switchable` branch: no
            edit can leave the badge standing alone in this branch without
            also deleting the reason two lines below it. Guarding only the
            badge+reason pair and leaving title/description outside both
            branches was the alternative — it would have put the reason
            back beside the badge, because a badge-only branch cannot sit
            between an unconditional title and an unconditional
            description without becoming two branches, which is exactly
            the split R70 forbids.

            R65 is the law that already says a chip sits above a record's
            title, but R65's own census is anchored to the kit `<Card
            key=>` — a card drawn one per row of a collection — and this
            row is a hand-rolled `<li>`, not a kit Card, so it never
            entered R65's walk. The SENTENCE reaches this row; the CHECK's
            chosen oracle does not, on purpose — R65 tried and rejected a
            "Card wrapping a Badge" oracle and a hand-list before settling
            on `key=`, precisely because those wider oracles catch panels
            that are not records. An automation row is a config line, not
            a record with its own screen, so it is left out here rather
            than widened into blind guesswork; this move is the ruling
            answered directly, by hand, on the one file it names.

            THE WORD IS THE DICTIONARY'S (client, 2026-09-11, shown this
            list): *"like we have protected choices to have protected
            automations! Still have the visibility, but cannot change
            it"*. It is `protectedChoice` in `shared/glossary.ts` — one
            word for one concept across both halves of a module's
            settings page — and it is the same kit part the Choices half
            draws (`Badge variant="secondary"` in
            `web/components/choices/selectable-screen.tsx`), because two
            different-looking badges for one concept on one page would
            defeat the ruling that asked for the word.

            THE MARK MAY NEVER APPEAR WITHOUT THE REASON BESIDE IT, and
            that is structural rather than a convention: the two render
            from ONE guard, so there is no edit that leaves the badge
            behind on its own. It matters because the word carries a
            DIFFERENT promise on each half — take the protection off a
            choice and it can be switched off; an automation's never
            comes off, at this door as well as on this screen — and the
            sentence at the foot of the row is what says which one this
            is. R70 reads all of it off this file. */}
        {!a.switchable && a.helpText ? (
          <div className="flex min-w-0 flex-col gap-1">
            {/* WHICH MODULE, ONLY WHEN MORE THAN ONE CAN APPEAR HERE —
                the Settings › Automations tab's own rows, unscoped, so
                a reader can tell "Reply and mention emails" (Tickets)
                from "Capture meeting transcripts" (Meetings) without
                opening either module's own page. Outside both of R70's
                guarded branches in spirit — it is duplicated into each
                rather than hoisted above them, the same trade the
                title/description pair already makes, so the mark and
                its reason keep sharing the one guard R70 reads. */}
            {scope.kind === "all" && (
              <Text className="text-muted-foreground text-micro uppercase">{moduleTitle(a.segment)}</Text>
            )}
            <div className="flex flex-wrap items-start gap-2">
              <Badge variant="secondary" className="shrink-0">
                {t("Protected")}
              </Badge>
            </div>
            <Text className="font-medium">{t(a.title)}</Text>
            <Text className="text-muted-foreground">{t(a.description)}</Text>
            <Text className="text-muted-foreground">{t(a.helpText)}</Text>
          </div>
        ) : null}
        {a.switchable ? (
          <>
            <div className="flex min-w-0 flex-col gap-1">
              {scope.kind === "all" && (
                <Text className="text-muted-foreground text-micro uppercase">{moduleTitle(a.segment)}</Text>
              )}
              <Text className="font-medium">{t(a.title)}</Text>
              <Text className="text-muted-foreground">{t(a.description)}</Text>
            </div>
            <Switch
              checked={!off}
              aria-label={t(a.title)}
              disabled={!mayChange || busyKey === a.key || settingsQ.loading}
              onCheckedChange={(v: boolean) => void flip(a, v)}
            />
          </>
        ) : null}
      </li>
    )
  })

  return (
    /* THE BOX IS `<CollectionCard>` NOW, NOT `SettingsSection`. `SettingsSection`
       is the right box for a titled section with nothing else in it — its own
       header says so directly: "A collection with a TOOLBAR does not use this
       component… `<ToolbarRow title>` draws it there for exactly the same
       reason." `CollectionCard` (screen-bits.tsx) is the toolbar-bearing
       twin: the same soft paper, and it also carries `PINNED_INSET_MARK` and
       the `--pinned-lead`/`--pinned-inset-x` custom properties R63 needs to
       pin the row and keep the container's own rounded top corners once its
       real top edge has scrolled away — properties `SettingsSection` never
       had to declare because nothing inside it ever pinned. */
    <CollectionCard>
      <ToolbarRow
        // R50 — the collection's own RAW count, before search or the status
        // filter narrows it, never a hardcoded `false`. Every automation is
        // declared in code (`shared/automations.ts`), so this section's rows
        // never arrive from an async read the way a door-fetched collection's
        // do — there is no loading state to fold in, only the registry.
        // Every segment this component is mounted on today ships at least
        // two automations, so `empty` never actually fires; it stays honest
        // (derived, not assumed) for the day a segment's own list changes.
        empty={rows.length === 0}
        title={title}
        search={
          <>
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              placeholder={t("Search automations…")}
              className="flex-1"
              aria-label={t("Search automations")}
            />
            {/* NO CONTROL AT ALL WHEN ONE STATE COVERS EVERY ROW — the same
                "sensibly, not with a dead option" the client asked for when
                this filter is mounted unscoped, applied here to the scoped
                case it was actually written on. */}
            {statuses.length > 1 && (
              <Select value={status} onValueChange={(v) => setStatus(v as AutomationStatus | "all")}>
                <SelectTrigger className="h-9 w-full sm:w-40" aria-label={t("Filter by status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All")}</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        }
        // THE MODULE FILTER — the Settings › Automations tab's own question,
        // in its own slot rather than folded into `search`: it narrows a
        // different axis than the status Select beside the search box, and
        // `filters` (screen-bits.tsx) is exactly the slot the row already
        // reserves for that. Absent on a scoped mounting (`moduleOptions` is
        // `[]` there) and absent again the moment a filtered wall drops back
        // to one module — same "no dead option" rule the status filter above
        // already keeps.
        filters={
          scope.kind === "all" &&
          moduleOptions.length > 1 && (
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-9 w-full sm:w-48" aria-label={t("Filter by module")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All modules")}</SelectItem>
                {moduleOptions.map((m) => (
                  <SelectItem key={m.segment} value={m.segment}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        sort={{
          options: [{ value: "title", label: t("Name") }],
          value: "title",
          onValueChange: () => undefined,
          direction: sortDir,
          onDirectionChange: setSortDir,
        }}
      />
      {/* R49 — NOTHING BETWEEN THE ROW AND WHAT FOLLOWS. `<ToolbarRow>` pays
          its own trailing margin; `<CollectionCard>`'s content box is a bare
          `p-4`, so there is nothing here to double-spend it. */}
      {visible.length === 0 ? (
        // R62 — the same body as a resting-empty collection, minus the (here,
        // never offered) create button. `filtered` withholds nothing else,
        // because this register never carries one.
        <CollectionEmptyState filtered title={t("No automations.")} />
      ) : (
        <ul className="flex flex-col gap-3">{rowList}</ul>
      )}
    </CollectionCard>
  )
}
