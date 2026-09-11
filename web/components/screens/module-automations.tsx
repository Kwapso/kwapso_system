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
// switches can be MOVED is a second and different question — `teams:edit`, the
// same right the door gates on — and it is asked here, in this file, for the
// same reason `SelectableScreen` asks its own three: a section owns its writes.
// Reading is open to any member the module's own gate lets through, because her
// ruling is visibility and "what does this software do without me asking" must
// not be behind the right to change it.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Text } from "@shared/ui/components/typography/typography"
import { SettingsSection } from "@shared/web/settings-section"
import { Switch } from "@shared/ui/components/switch/switch"
import { toast } from "@shared/ui/components/sonner/sonner"
import { primeCache, useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"

import { ApiFailure, tenancy } from "@/lib/api"
import { usePermissions } from "@/lib/perms"
import { AUTOMATIONS, isAutomationOff, type Automation } from "@shared/automations"

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

export function ModuleAutomations({
  teamId,
  segment,
  title,
}: {
  teamId: string
  /** The settings segment this section belongs to — the rows are the registry's
   * own, filtered to it, in the order the registry declares them. */
  segment: string
  /** English, already translated by the host (the same treatment every other
   * section title gets). Handed straight to `<SettingsSection>`, which is what
   * DRAWS it — inside the paper, above everything else in the box. This
   * component no longer writes a heading of its own, and that is the point:
   * client, 2026-09-11, "ticket types should be on top of the searchbar inside
   * the container without subtitle, make this. always". */
  title: string
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
  const mayChange = can("teams", "edit")

  const settingsQ = useCached<Record<string, string>>(`automations:${teamId}`, () =>
    tenancy.automationSettings().then((r) => r.automations)
  )
  // WHICH ROW IS IN FLIGHT, so one switch can be busy without freezing the rest.
  const [busyKey, setBusyKey] = React.useState<string | null>(null)

  const rows = AUTOMATIONS.filter((a) => a.segment === segment)

  // THE STORED BLOB FOR THIS SEGMENT, PARSED ONCE. A blob this app's own door
  // cannot have written is read as the DEFAULT rather than as a guess — the
  // same answer `readAutomationSettings` gives in the worker, because a screen
  // and a worker disagreeing about whether something is off is worse than
  // either answer on its own.
  const stored = React.useMemo<Record<string, unknown>>(() => {
    const raw = settingsQ.data?.[segment]
    if (!raw) return {}
    try {
      const parsed: unknown = JSON.parse(raw)
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }, [settingsQ.data, segment])

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

  return (
    /* THE BOX AND THE TITLE INSIDE IT ARE `SettingsSection`'s NOW. This file
       drew its own `<section className="… bg-surface-panel …">` with a
       `<Headline>` and a `<Text>` in it — the right shape, written out at one
       of the four places that needed it, which is how the OTHER three (the
       Appearance sections) came to draw a hand-rolled `<h2 className="text-lg
       font-medium">` above their paper instead of inside it. One component
       owns the box and the heading now; this one owns the rows. */
    <SettingsSection title={title}>
      <ul className="flex flex-col gap-3">
        {rows.map((a) => {
          const off = isAutomationOff(stored, a.key)
          return (
            <li
              key={a.key}
              className="flex items-start justify-between gap-4 rounded-[var(--radius)] bg-card p-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <Text className="font-medium">{t(a.title)}</Text>
                <Text className="text-muted-foreground">{t(a.description)}</Text>
                {/* THE MARK AND THE REASON, AND THEY ARE ONE BRANCH ON PURPOSE.
                    R70 requires the reason on every row that cannot be switched
                    and forbids it on every row that can, so this branch can
                    never be a row that quietly says nothing.

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
                    sentence beside the badge is what says which one this is.
                    R70 reads all of it off this file. */}
                {!a.switchable && a.helpText ? (
                  <div className="flex flex-wrap items-start gap-2">
                    <Badge variant="secondary" className="shrink-0">
                      {t("Protected")}
                    </Badge>
                    <Text className="text-muted-foreground">{t(a.helpText)}</Text>
                  </div>
                ) : null}
              </div>
              {a.switchable ? (
                <Switch
                  checked={!off}
                  aria-label={t(a.title)}
                  disabled={!mayChange || busyKey === a.key || settingsQ.loading}
                  onCheckedChange={(v: boolean) => void flip(a, v)}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </SettingsSection>
  )
}
