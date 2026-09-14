"use client"

// ONE MEMBER'S PROFILE, ON A FULL SCREEN OF ITS OWN.
//
// ── THE CLIENT'S RULING, 2026-09-10 ─────────────────────────────────────────
//
//   "when clickingon card in team, open full screen the profile (we wil ad more
//    to this)"
//
// IT SUPERSEDES WHAT SHIPPED THE DAY BEFORE. A card on Settings › Team opened
// `member-panel.tsx`, a `Sheet` carrying the person's four facts and their two
// acts; that file is deleted with this change. Her sentence is the same one she
// gave for module settings a day earlier — *"I would rather it be full
// screen"* — and "we will add more to this" says the rest out loud: this is a
// PLACE that grows, not a panel that gets wider.
//
// ── THE SECOND RULING, ON THIS SAME SCREEN, 2026-09-14 ──────────────────────
//
//   "I want the role as a chip on top of the title. I want them to have an
//    image, like the profile picture. I want to be able to see it. Remove the
//    tabs. Make sure that you put the footer where it belongs. More fields
//    that I want on the first component inside where we currently have role,
//    joined, and email: Full name · Birthday · Position · A button to send
//    email · A button to call · The field for the phone number. Just put all
//    of this in there."
//
// FOUR THINGS FOLLOWED, and all four are why this file no longer renders the
// generic recipe engine (`ScreenRenderer`) at all.
//
// 1 · THE CHIP ABOVE THE TITLE (R65 — "the law she made for exactly this",
//     about the member CARD on Settings › Team). The generic engine's own
//     header (`shared/web/screen-engine/screen-renderer.tsx`'s `renderDetail`)
//     has no chip slot at all — recipes on that path (`team.detail`,
//     `invites.detail`…) never carried one. `RecordScreen`
//     (`web/components/records/record-chrome.tsx`) — the SAME host every
//     bespoke record detail in the app draws through (a Contact, a Ticket) —
//     does: its `chips` prop rides INSIDE the title node, above the heading,
//     by construction (that file's own "THE EYEBROW LEAVES AGAIN…" note). So
//     this screen moved onto the bespoke path rather than growing the shared
//     engine a feature nothing else needs, matching Contact and Ticket rather
//     than inventing a fourth shape.
//
// 2 · THE PICTURE. Both detail paths hold the SAME 2026-09-01 ruling shut —
//     "under no case - images on title" — and this screen does not fight it:
//     `RecordScreen`'s own `leading`/`mark` are still inert. The picture lives
//     in the FIRST PANEL instead (`member-head.tsx`), which is where her own
//     sentence puts every other new fact too ("on the first component…").
//
// 3 · REMOVE THE TABS (R2). Moving to `RecordScreen` without ever building a
//     `<TabsView>` — `children` (below) is one body, not a set of panels — is
//     the HONEST route R2 itself names: "TabsView draws nothing below two
//     views… make the member record a SINGLE-BODY screen". `member-screen` is
//     listed in `RECORD_TABS_SINGLE_PANEL` (shared/rules/registry.ts) with
//     this same reasoning, because moving onto `<RecordScreen>` makes this
//     file visible to R2's census for the first time.
//
// 4 · THE FOOTER, WHERE IT BELONGS. The bug: the generic engine drew the ink
//     footer as part of the SAME small card as the three-field Overview block
//     — Header → Role/Joined/Email → FOOTER → (StaffPanel's profile and
//     certificates, appended AFTER as an unrelated sibling `<div>`). The
//     footer sat in the MIDDLE of the page. `RecordScreen`'s `panel={children}`
//     wraps everything handed to it in ONE card and draws its `audit`/
//     `activity` footer AFTER that — so putting BOTH the first panel
//     (`MemberHead`) and `StaffPanel` inside `children` (below) puts the
//     footer after both, at the true bottom of the page, exactly where
//     Contact's and Ticket's already sit.
//
// ── WHY THE ADDRESS IS `/t/<teamId>/members/<userId>` ───────────────────────
//
// Unchanged from the first ruling above — see BASE-MANUAL.md's URL grammar,
// and `web/lib/pages.ts` (`TEAM_SECTIONS`) for why `/settings/team/<userId>`
// and a query param were both worse.
//
// ── R64, AND WHY THE TWO ACTS ARE STILL TAKEN HERE ──────────────────────────
//
// `onAction` still calls `tenancy.setMemberRole` / `tenancy.removeMember`
// directly, unchanged — `SECTION_HOSTED_ELSEWHERE` (shared/rules/registry.ts)
// names this file as the host that carries `members.changeRole` /
// `members.remove`'s real door calls, and R64's own check reads those calls
// off THIS file's source; nothing about that changed when the head moved off
// the recipe engine. The buttons are now built by hand from `recipe.actions`
// (gate + label + variant) rather than by `ScreenRenderer`'s `ActionButton`,
// because `RecordScreen`'s `actions` slot takes a rendered node, not a recipe —
// the data is the SAME recipe (`web/lib/screens.ts`'s `memberDetailRecipe`),
// only who reads it moved.
//
// NOTHING IS SWALLOWED, and this is the half that matters most on this screen.
// Both doors refuse for real reasons a person needs to read — "A team must keep
// at least one admin." and "You can't remove yourself." — so a refusal is
// surfaced as the DOOR'S OWN SENTENCE in a toast rather than a generic one.
//
// THE LAST-ADMIN FLOOR IS DELIBERATELY NOT SECOND-GUESSED HERE. It is enforced
// inside the UPDATE itself (`workers/tenancy/src/lib/members.ts`).

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { toast } from "@shared/ui/components/sonner/sonner"
import { gateState } from "@shared/web/screen-engine/recipe"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import { invalidate, primeCache } from "@shared/web/store"
import { staffFullName } from "@shared/staff-name"
import { useT } from "@shared/web/language"
import type { TeamMember, TeamRole } from "@shared/types"

import { ConfirmAction } from "@/components/deep-link/confirm-action"
import { RecordScreen } from "@/components/records/record-chrome"
import { MemberHead } from "@/components/team/member-head"
import { RolePickerDialog } from "@/components/team/role-picker-dialog"
import { StaffPanel } from "@/components/team/staff-panel"
import { ApiFailure, tenancy } from "@/lib/api"
import { recordActivityKey, useRecordActivity } from "@/lib/use-record-activity"
import { reportError } from "@shared/web/log"

export function MemberScreen({
  teamId,
  member,
  roles,
  recipe,
  rights,
  onRemoved,
}: {
  teamId: string
  /** The row the host already has in hand from the members read (R56 — this
   * screen opens no door of its own to show a person). */
  member: TeamMember
  /** The team's roles, for the picker. The host reads them across the whole
   * team area anyway, so this costs nothing. */
  roles: TeamRole[]
  /** `members.detail` (web/lib/screens.ts), resolved and translated by the
   * host — read here for its `actions` (label, gate, variant) ONLY. Its
   * `header`/`tabs`/`fields` are unread: the head, the chip and the panel are
   * this file's and `member-head.tsx`'s, not the recipe engine's (see this
   * file's header). */
  recipe: ScreenRecipe
  rights: ScreenRights
  /** The person is gone — the host takes the reader off a record that no longer
   * exists, exactly as the deep-link confirm has always done. */
  onRemoved: () => void
}) {
  const t = useT()
  const [pickRole, setPickRole] = React.useState(false)
  const [confirmRemove, setConfirmRemove] = React.useState(false)
  const name = staffFullName(member)

  // THE MEMBER'S OWN HISTORY, THROUGH THE ONE GENERIC (table, id) PATH (R5) —
  // not the ad-hoc `scope=user` feed the host used to build (module-content.tsx
  // used to hand this screen a hand-assembled `RailActivity`, read through
  // `GET /api/tenancy/activity?scope=user&id=<userId>`). Both read the exact
  // same rows: `scope=user` IS the generic (table, id) read with `table` fixed
  // to `"users"` (`FIXED_SCOPE_TABLES`, workers/tenancy/src/lib/activity-read.ts
  // — "user / role / invite ARE the generic (table, id) read with the table
  // supplied by the scope name … so they resolve to a table here and share the
  // ONE branch below"), and `members.ts` writes every membership event
  // (`Member role changed`, `Member removed`, `Member joined`) against
  // `relatedTable: "users"`, `relatedRowId: <that member's own userId>`.
  //
  // WHY THE SWITCH: the hand-assembled bundle carried no `addNote`, because
  // `RailActivity` (activity-rail.tsx) is structurally typed to the six fields
  // the rail itself needs and the host never built a seventh. Every OTHER
  // bespoke record detail (Contact, Account, a ticket…) reads through this
  // same `useRecordActivity` hook and always hands its `addNote` straight to
  // `RecordScreen`'s `onAddNote` — this screen was the one exception, and it
  // is why a member with no logged history (never role-changed, never
  // removed — which is every seeded/founding admin, since only an ACCEPTED
  // INVITE writes a "Member joined" row) drew no ink footer at all: no audit
  // (a membership genuinely has no creator/editor), zero activity rows, and no
  // note composer to fall back on is the one combination `RecordDetail` itself
  // (`showActivityColumn`, record-detail.tsx) draws NOTHING for.
  const activity = useRecordActivity("users", member.userId)

  // ── THE TWO DOORS ───────────────────────────────────────────────────────
  // Cache-first (CACHING.md): each door answers with the WHOLE list, so the
  // members cache is primed with what the write returned rather than dropped
  // and re-read. `member_roles` is invalidated beside it because a role's member
  // count moved, and the person's own activity feed gained a row — under the
  // SAME generic key `activity` above reads (`recordActivityKey("users", id)`),
  // now that this screen reads through that seam instead of the old
  // `activity:user:<id>` scope key.
  async function changeRole(roleId: string) {
    const { members: next } = await tenancy.setMemberRole(member.userId, roleId)
    primeCache(`members:${teamId}`, next)
    invalidate(`member_roles:${teamId}`)
    invalidate(recordActivityKey("users", member.userId))
    toast.success(t("Role updated."))
  }

  async function removeMember() {
    const { members: next } = await tenancy.removeMember(member.userId)
    primeCache(`members:${teamId}`, next)
    invalidate(`member_roles:${teamId}`)
    invalidate(recordActivityKey("users", member.userId))
    toast.success(t("Member removed."))
  }

  /** The recipe's named acts, taken here. Anything the recipe grows later that
   * this switch does not know about is reported rather than silently ignored —
   * a button that does nothing is the shape of bug this whole screen exists
   * because of (ERROR-HANDLING.md: never swallow). */
  function onAction(actionId: string) {
    if (actionId === "members.changeRole") setPickRole(true)
    else if (actionId === "members.remove") setConfirmRemove(true)
    else reportError("member-screen:unknown-action", new Error(actionId))
  }

  return (
    <>
      <RecordScreen
        // THE CHIP, ABOVE THE TITLE (R65) — the SAME content the gallery card
        // wears (`members-gallery.tsx`'s own `<Badge>{m.roleTitle}</Badge>`),
        // through the host every bespoke record detail uses for its own
        // identity row.
        chips={<Badge>{member.roleTitle}</Badge>}
        title={name}
        actions={
          recipe.actions.length > 0 ? (
            <>
              {recipe.actions.map((a) => {
                const gs = gateState(rights, a.gate)
                if (gs === "hidden") return null
                return (
                  <Button
                    key={a.id}
                    variant={a.variant}
                    disabled={gs === "disabled"}
                    onClick={() => onAction(a.action)}
                  >
                    {a.label}
                  </Button>
                )
              })}
            </>
          ) : undefined
        }
        // NO `audit` — a MEMBERSHIP has no creator/editor the way an account or
        // a ticket does (`TeamMember` carries none); the footer's Record column
        // is simply absent, which is the kit's own honest answer to a fact the
        // record doesn't know (record-chrome.tsx: "Renders no row for a fact
        // the record doesn't know").
        //
        // `onAddNote` IS WHAT MAKES THE FOOTER RELIABLE WITH NO AUDIT AND NO
        // HISTORY YET — the same pairing every other bespoke detail passes
        // (Contact, Account, a knowledge source…): `RecordDetail`'s own
        // `showActivityColumn` draws the column when it has rows, a composer,
        // OR the rail's door, so a member with zero logged events still gets a
        // footer with somewhere to write a first entry, exactly the same
        // guarantee CH27.8 makes for every other record.
        activity={activity}
        onAddNote={rights.team_members?.create ? activity.addNote : undefined}
        notePlaceholder={t("Add a note")}
      >
        {/* THE FIRST PANEL, THEN THE PERSON'S OWN PROFILE — BOTH inside this
            ONE `children`, which is what puts the footer after both rather
            than between them (see this file's header, point 4). */}
        <div className="flex flex-col gap-8">
          <MemberHead teamId={teamId} member={member} />
          <StaffPanel teamId={teamId} userId={member.userId} memberName={name} />
        </div>
      </RecordScreen>

      {/* CHANGE ROLE — the app's existing picker, unchanged and unforked. It is
          a `Sheet` (R59: a picker collects, so it slides in), it hides the role
          the person already holds, and it toasts the door's own refusal, which
          is how "A team must keep at least one admin." reaches the person who
          tried to demote the last one. */}
      <RolePickerDialog
        open={pickRole}
        onOpenChange={setPickRole}
        roles={roles.filter((r) => r.active)}
        currentRoleId={member.roleId}
        subjectName={name}
        onPick={changeRole}
      />

      {/* REMOVE — the app's existing warning (R59: a yes/no question about
          somebody who already exists is a centred `AlertDialog`), taking the ACT
          as a prop rather than reading it off the URL. */}
      <ConfirmAction
        kind={confirmRemove ? "members.remove" : undefined}
        canRun={rights.team_members?.delete === true}
        memberName={member}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={async () => {
          try {
            await removeMember()
            setConfirmRemove(false)
            onRemoved()
          } catch (err) {
            // THE DOOR'S OWN SENTENCE, NEVER A GENERIC ONE, and the warning
            // stays OPEN so the person it is about is still in front of them.
            if (!(err instanceof ApiFailure)) reportError("member-screen:remove", err)
            toast.error(
              err instanceof ApiFailure ? err.message : t("Something went wrong. Try again.")
            )
          }
        }}
      />
    </>
  )
}
