"use client"

// THE MEMBER PANEL — one member's overview, in a slide-in, with the two acts
// that can be taken on them at the top of it.
//
// ── WHY THIS EXISTS: A SHIPPED REGRESSION, 2026-09-09 → 2026-09-10 ──────────
//
// The Team tab's redesign turned the members ladder into a gallery that
// deliberately does not navigate ("not taken anywhere else"), and the three
// administrative acts on a person — CHANGE THEIR ROLE, REMOVE THEM, and (its
// sibling one list along) REVOKE A PENDING INVITE — stayed on the team area's
// own `/t/<teamId>/members` screens. A census of every `softNavigate(...)` and
// `href=` under `web/` found exactly ONE link into that area anywhere in the
// app (`apps/stakeholders-panel.tsx`, and it points at one member's RECORD, not
// at the collection). The only other way in was the "This team" list on this
// same tab, which now renders a single row — Internal rates, gated on
// `commercials:read`.
//
// So an owner WITHOUT `commercials:read` had no in-app path to member
// management at all: they could see the wall of people and change nothing about
// any of them. With it, the path was to open a RATE CARD and then hop sideways
// on the team area's tab strip, which is not a door anybody designed.
//
// ── THE SHAPE IS THE ONE THE CLIENT ALREADY APPROVED, ONE ROW ALONG ─────────
//
//   "when iclick in role, overview in slide in. there on top, titple and on the
//    righ edit and on/off button. rmeove this buttons from th elist view."
//    (client, 2026-09-09 — `role-panel.tsx`)
//
// A role opens its overview from the side, with its acts in the head. A member
// is the other record on this tab and gets the same gesture, for the same
// reason and in the same component vocabulary: press the card, the person
// arrives from the side, their two acts sit in the head. Anything else would be
// two ways to open the two kinds of record that share one screen.
//
// AND IT DOES NOT CONTRADICT "not taken anywhere else", which is the ruling the
// gallery was built on. `role-panel.tsx` carries that argument in full and it is
// the same argument here: a slide-in is not a page. Nothing is fetched, no URL
// changes, the shell does not unmount, and the wall is still there behind it.
// What she took away was the REDIRECT — a row press that threw you onto another
// screen — and this panel navigates nowhere.
//
// ── R59, AND WHICH HALF OF IT EACH SURFACE IS ──────────────────────────────
//
//   "This should be a slide-in, like all the other screens. The only ones that
//    are overlays are the warnings, such as archive or delete, and so on."
//
// Three surfaces, and the law sorts them by what they DO. This panel SHOWS a
// person and offers two acts: a `Sheet`. Change role COLLECTS a choice: the
// app's existing `RolePickerDialog`, itself a `Sheet` (its own header carries
// the ruling that a picker is a form). Remove asks a yes/no question about
// somebody who already exists: a centred `AlertDialog`, which is `ConfirmAction`
// — the same warning the team area has always drawn, now reachable from here.
//
// BOTH HANDOVERS CLOSE THIS PANEL FIRST, exactly as `RolePanel`'s do and for the
// same two reasons: `Sheet` and `Sheet` paint on one z layer, and a warning
// about the very record a drawer is showing is two surfaces asking one question.
//
// ── WHAT THE PANEL DOES NOT DRAW ───────────────────────────────────────────
//
// No door of its own (R56): the member row it shows is the one the gallery
// already read, handed down, and the roles it hands the picker are the tab's own
// roles read. It also carries no permission summary — that is the role's
// business and the roles matrix two containers down is the place to read it.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { PencilSimple, UserMinus } from "@shared/ui/foundations/icons"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/ui/components/sheet/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"

import { RecordMark } from "@shared/web/record-mark"
import { formatDate } from "@shared/web/format"
import { staffFullName } from "@shared/staff-name"
import { useLanguage } from "@shared/web/language"
import type { TeamMember } from "@shared/types"

import { personInitials } from "@/lib/identity"

export function MemberPanel({
  member,
  canChangeRole,
  canRemove,
  onChangeRole,
  onRemove,
  open,
  onOpenChange,
}: {
  /** The member whose card was pressed — already in hand from the gallery's own
   * read, so this panel opens no door (R56). */
  member: TeamMember | null
  /** `team_members:edit`. */
  canChangeRole: boolean
  /** `team_members:delete`. */
  canRemove: boolean
  onChangeRole: (member: TeamMember) => void
  onRemove: (member: TeamMember) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, lang } = useLanguage()
  if (!member) return null

  // NEITHER ACT IS DRAWN ON YOURSELF, and that is the door's own rule rather
  // than a nicety invented here: `changeMemberRole` and `removeMember`
  // (workers/tenancy/src/lib/members.ts) both open with a 409 `self` guard. The
  // team area's own member screen already subtracts both actions on your own row
  // (`module-content.tsx`, `member.isYou`); drawing a control here that the
  // server refuses would be the "door on a wall" R61 names one layer up.
  //
  // The LAST-ADMIN floor is deliberately NOT second-guessed here. It is enforced
  // inside the UPDATE itself, so it holds against two simultaneous demotions,
  // and the honest failure is the door's own sentence ("A team must keep at
  // least one admin.") surfaced as a toast — a count read on the client could
  // be stale by the time the button is pressed, and a control hidden on a stale
  // count is a capability that silently disappears.
  const acts = !member.isYou && (canChangeRole || canRemove)
  const name = staffFullName(member)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" closeLabel={t("Close")}>
        {/* TITLE LEFT, THE ACTS RIGHT — the same head `RolePanel` draws, and
            the same reason it sits INSIDE `SheetHeader`: the header already
            reserves the top-inline-end corner for the drawer's own close chip,
            so these never collide with it. Two records on one tab, one head. */}
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="min-w-0 truncate">{name}</SheetTitle>
            {acts && (
              <span className="flex shrink-0 items-center gap-1">
                {canChangeRole && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${t("Change role")} — ${name}`}
                        onClick={() => onChangeRole(member)}
                      >
                        <PencilSimple className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("Change role")}</TooltipContent>
                  </Tooltip>
                )}
                {canRemove && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${t("Remove from team")} — ${name}`}
                        onClick={() => onRemove(member)}
                      >
                        {/* `UserMinus` is the app's one glyph for remove
                            (CLAUDE.md's action-icon mapping), and the button
                            carries the destructive ink because the act is. */}
                        <UserMinus className="text-destructive size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("Remove from team")}</TooltipContent>
                  </Tooltip>
                )}
              </span>
            )}
          </div>
          <SheetDescription className="truncate">{member.email}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col items-center gap-3 px-[var(--space-5)]">
          {/* THE SAME FACE THE CARD DREW (R35), through the same two seams —
              `RecordMark` for the mark and `personInitials` for the letters, so
              the panel and the card it came from cannot draw a person two ways. */}
          <RecordMark
            picture={member.imageUrl}
            mark={personInitials(member.firstName, member.lastName)}
            name={name}
            shape="round"
            size="tile"
          />
          <Badge>{member.roleTitle}</Badge>
          {member.isYou && <span className="text-muted-foreground text-xs">{t("You")}</span>}
        </div>

        <dl className="flex flex-col gap-3 px-[var(--space-5)] text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{t("Role")}</dt>
            <dd className="min-w-0 truncate text-end">{member.roleTitle}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{t("Email")}</dt>
            <dd className="min-w-0 truncate text-end">{member.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{t("Joined")}</dt>
            <dd className="min-w-0 truncate text-end">{formatDate(member.joinedAt, lang)}</dd>
          </div>
        </dl>
      </SheetContent>
    </Sheet>
  )
}
