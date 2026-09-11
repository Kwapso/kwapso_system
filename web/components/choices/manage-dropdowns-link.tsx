"use client"

// "Manage choices" — a small link shown beneath a dropdown that jumps to the
// page where that dropdown's options are set. Shown ONLY to people who can act
// on it; a read-only member can't add an option, so it stays hidden for them.
// Your form draft survives the navigation (CACHING.md §11), so you can add an
// option and return to a still-filled form.
//
// ── WHERE IT POINTS, AND THE THREE TIMES THAT HAS MOVED ─────────────────────
//
// It has always been a signpost to "the place options are set", and that place
// has moved twice under it:
//
//   • until 2026-09-01 — `/t/<teamId>/dropdowns`, the team area's own Choices
//     tab, the screen that held the team's WHOLE vocabulary;
//   • 2026-09-01 — repointed to `/settings?tab=choices` when Choices became a
//     tab on Settings. The old address still resolved, and this link was
//     exactly the kind of "duplicate, orphaned entry point" that move meant to
//     close;
//   • 2026-09-11 — repointed to `/settings/<segment>`, the MODULE's own
//     settings page, when the client retired the Choices tab and the
//     whole-vocabulary screen together: *"implement this module settings across
//     app … end goal kill the big tab 'choice options'."*
//
// SO IT NOW TAKES A SEGMENT, and that is the substantive change rather than the
// href. A signpost under the ticket form's Type row used to lead to a screen
// holding eighteen groups, most of which have nothing to do with a ticket — the
// reader arrived at a wall of words and had to find their own. It leads to
// Settings › Tickets now, which is a page about exactly the dropdown they were
// looking at. A form asking about a different vocabulary passes its own
// segment; there is no default, because a default would be this file guessing
// which module a caller meant.
//
// THE GATE ASKS FOR READ AS WELL AS FOR A WRITE. Create-or-edit is what makes
// the link worth offering (it is an invitation to ADD an option); `read` is what
// makes it honest, because `/settings/<segment>` is gated on
// `selectable_data:read` and a link that lands on "you don't have access to
// this" is worse than no link. That is the same instruction the gear obeys one
// file along — *"a reader who may see tickets but not the vocabulary should not
// be offered a door that refuses them"* (client, 2026-09-09) — said here
// because this control is not the gear and does not live in the settings host
// (R61 keeps that file to ONE `can(`, and this is a different question asked in
// a different place).

import { Sliders } from "@shared/ui/foundations/icons"

import { usePermissions } from "@/lib/perms"
import { InAppLink } from "@/components/shell/in-app-link"
import { moduleSettingsPage } from "@/components/screens/module-settings-screen"
import { useT } from "@shared/web/language"

export function ManageDropdownsLink({
  teamId,
  segment,
}: {
  teamId: string | null
  /** The module whose settings page owns this dropdown's group — `tickets` for
   * a Ticket type, `accounts` for a Country. The SAME word `MODULE_SETTINGS`
   * declares, which is why this component asks that table whether the page
   * exists at all rather than trusting the caller: a segment with no page is a
   * link to `NoAccess`, and it would look exactly like a permission problem. */
  segment: string
}) {
  const t = useT()
  const { can } = usePermissions(teamId)
  const page = moduleSettingsPage(segment)
  const allowed =
    !!teamId &&
    !!page &&
    can("selectable_data", "read") &&
    (can("selectable_data", "create") || can("selectable_data", "edit"))
  if (!allowed) return null
  return (
    <InAppLink
      href={`/settings/${segment}`}
      className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-xs underline-offset-2 hover:underline"
    >
      <Sliders className="size-3" aria-hidden />
      {t("Manage choices")}
    </InAppLink>
  )
}
