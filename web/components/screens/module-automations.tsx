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

import { Headline, Text } from "@shared/ui/components/typography/typography"
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
  description,
}: {
  teamId: string
  /** The settings segment this section belongs to — the rows are the registry's
   * own, filtered to it, in the order the registry declares them. */
  segment: string
  /** English, already translated by the host (the same treatment every other
   * section title gets). */
  title: string
  description: string
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
    <section className="flex flex-col gap-4 rounded-[var(--radius)] bg-surface-panel p-6 lg:p-[var(--space-7)]">
      {/* THE TITLE BLOCK — heading and sentence, the shape every settings
          section in this app already uses, and the shape R67 reads as a title
          block rather than as content standing on nothing. */}
      <div className="flex flex-col gap-1">
        <Headline as="h2" size="h4">{title}</Headline>
        <Text className="text-muted-foreground">{description}</Text>
      </div>

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
                {/* THE REASON, WHICH IS THE HALF THE CLIENT'S RULING TURNS ON.
                    R70 requires it on every row that cannot be switched and
                    forbids it on every row that can, so this branch can never
                    be a row that quietly says nothing. */}
                {!a.switchable && a.helpText ? (
                  <Text className="text-muted-foreground">{t(a.helpText)}</Text>
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
    </section>
  )
}
