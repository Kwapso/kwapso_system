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
// 2 · THE PICTURE. Held in `member-head.tsx`'s own first panel from
//     2026-09-14 until 2026-09-15, because both detail paths held the SAME
//     2026-09-01 ruling shut — "under no case - images on title" — and this
//     screen did not fight it. THAT RULING WAS NARROWLY REVERSED THE NEXT
//     DAY: "For cover and logo, I choose B1. Apply this on apps, accounts,
//     and team members." (record-chrome.tsx's own `mark` prop doc has the
//     artifact and the ruling in full.) B1 draws the avatar INLINE LEFT of
//     the title, on the title's own line, boxed to the title's own
//     line-height — `mark={<RecordMark … shape="round" />}`, below, on the
//     SAME `RecordScreen` this screen already draws through, not a new prop.
//     `member-head.tsx`'s own tile is gone (see that file's own note) — the
//     face is drawn once, in the title, never twice on one screen.
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
import { PencilSimple, UserMinus, UserSwitch } from "@shared/ui/foundations/icons"
import { gateState } from "@shared/web/screen-engine/recipe"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"
import { invalidate, primeCache } from "@shared/web/store"
import { RecordMark } from "@shared/web/record-mark"
import { staffFullName } from "@shared/staff-name"
import { useT } from "@shared/web/language"
import type { TeamMember, TeamRole } from "@shared/types"

import { ConfirmAction } from "@/components/deep-link/confirm-action"
import { RecordActionsMenu, RecordScreen, type RecordAction } from "@/components/records/record-chrome"
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
  // THE HEAD'S OWN EDIT PENCIL — client ruling, 2026-09-15: "make the pencil
  // button visible." Lifted here rather than left as `StaffPanel`'s own local
  // state so the SAME `StaffProfileDialog` opens whether a reader presses the
  // pencil in the actions row (the visible affordance she asked for, in the
  // same row every other record's edit pencil sits in — record-chrome.tsx,
  // account-detail.tsx, contact-detail.tsx) or the one still beside "Profile"
  // below: one dialog, two doors onto it, never two competing edit surfaces.
  // "Change role" no longer sits beside it on the row (see below) — the
  // pencil's own neighbour is now only the ⋯ menu.
  const [editProfile, setEditProfile] = React.useState(false)
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
  // INVITE writes a "Member joined" row) used to draw no ink footer at all:
  // no `audit` (this screen passed none until the 2026-09-15 ruling below —
  // see the "THE RECORD COLUMN" note on `RecordScreen`'s own `audit` prop),
  // zero activity rows, and no note composer to fall back on is the one
  // combination `RecordDetail` itself (`showActivityColumn`,
  // record-detail.tsx) draws NOTHING for.
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

  // THE HEAD'S ACTIONS ROW — client ruling, 2026-09-15, verbatim: "Inside the
  // team detail, put the change role and remove the 'For Team' button and make
  // the pencil button visible." Nothing in this app's catalogue, this recipe or
  // this screen's own history ever carried a button literally labelled "For
  // Team" (checked: `shared/i18n-strings.json`, `shared/i18n-catalogue.ts`, the
  // recipe's own two action labels, and `git log -S` across every branch — R28
  // makes the catalogue exactly the set of strings the app can ever render, so
  // a label that isn't in it was never on screen). Read against what WAS here
  // — two plain buttons, "Change role" and "Remove from team", side by side —
  // and against what she asks to KEEP (Remove, "wherever it lives today: menu
  // or button"), the button she means is "Remove from team": the one she is
  // naming by what it does ("for [removing someone from] team"), not by its
  // exact copy. So it comes OFF the row and moves into the SAME
  // `RecordActionsMenu` those screens already reach for, its destructive
  // styling and its confirm both untouched. The recipe itself
  // (`members.remove`, gate and all) is unchanged; only which component
  // reads it moved.
  //
  // "CHANGE ROLE" JOINS IT THERE TOO — client ruling, 2026-09-16, verbatim,
  // over a screenshot of the row still carrying its own "Change role" button
  // NEXT TO the ⋯ menu that already held it a second way: "why is it then two
  // times? Keep only the button on the three buttons, not behind the edit. It
  // should only be on the three buttons." The 2026-09-16 SESSION BEFORE THIS
  // ONE had added "Change role" to the ⋯ menu ALONGSIDE the row's own button
  // — read at the time as "also," which is exactly the "two times" this
  // ruling corrects. `buttonActions` below now excludes BOTH recipe actions:
  // neither ever renders as a row button again, and B15 (UI-RULEBOOK)
  // records the settled shape — Change role lives ONLY inside the three-dot
  // menu, beside Remove, sharing the identical handler
  // (`onAction("members.changeRole")` still opens the same `RolePickerDialog`
  // — never a second door).
  const buttonActions = recipe.actions.filter(
    (a) => a.id !== "members.remove" && a.id !== "members.changeRole"
  )
  const changeRoleRecipeAction = recipe.actions.find((a) => a.id === "members.changeRole")
  const changeRoleGate = changeRoleRecipeAction ? gateState(rights, changeRoleRecipeAction.gate) : "hidden"
  const changeRoleMenuActions: RecordAction[] =
    changeRoleRecipeAction && changeRoleGate !== "hidden"
      ? [
          {
            key: changeRoleRecipeAction.id,
            label: changeRoleRecipeAction.label,
            icon: <UserSwitch className="size-3.5" />,
            onSelect: () => onAction(changeRoleRecipeAction.action),
            disabled: changeRoleGate === "disabled",
          },
        ]
      : []
  const removeRecipeAction = recipe.actions.find((a) => a.id === "members.remove")
  const removeGate = removeRecipeAction ? gateState(rights, removeRecipeAction.gate) : "hidden"
  const removeMenuActions: RecordAction[] =
    removeRecipeAction && removeGate !== "hidden"
      ? [
          {
            key: removeRecipeAction.id,
            label: removeRecipeAction.label,
            icon: <UserMinus className="size-3.5" />,
            onSelect: () => onAction(removeRecipeAction.action),
            disabled: removeGate === "disabled",
            destructive: true,
          },
        ]
      : []
  // THE PENCIL ITSELF — same gate `StaffPanel`'s own edit button already reads
  // (`staff_profiles:update`), and `:read` too: `StaffPanel` renders nothing
  // without read (mounts no dialog to open), so the head's own pencil must not
  // promise a door that isn't there.
  const canEditProfile = Boolean(rights.staff_profiles?.read && rights.staff_profiles?.update)

  return (
    <>
      <RecordScreen
        // NO COVER BAND — C1 shipped 16 Sep 2026 ("For the cover, let's try
        // C1. I want this for accounts and members.") and was reversed the
        // same session: "I changed my mind. Let's remove this completely."
        // `RecordScreen` no longer takes a `cover` prop at all
        // (record-chrome.tsx's own removal note), so this screen no longer
        // opens the `staff_profiles` read it used only to feed that band —
        // `StaffPanel` (rendered inside this screen's own `children`, below)
        // still reads that table for its own reasons, untouched.
        // THE AVATAR, INLINE LEFT OF THE TITLE — B1, client ruling 2026-09-15:
        // "For cover and logo, I choose B1. Apply this on apps, accounts, and
        // team members." record-chrome.tsx's own `mark` prop doc has the
        // artifact and the full ruling; `shape="round"` is a PERSON's own
        // shape (record-mark.tsx: "a person in their own right is a circle"),
        // matching the picture `member-head.tsx` used to carry inside the
        // body — REMOVED from there now that the head itself draws it (see
        // that file's own note).
        mark={<RecordMark picture={member.imageUrl} name={name} shape="round" size="tile" />}
        // THE CHIP, ABOVE THE TITLE (R65, unchanged by the mark above — R65
        // put the pills row above the title and this only adds something
        // BESIDE it) — the SAME content the gallery card wears
        // (`members-gallery.tsx`'s own `<Badge>{m.roleTitle}</Badge>`),
        // through the host every bespoke record detail uses for its own
        // identity row.
        chips={<Badge>{member.roleTitle}</Badge>}
        title={name}
        actions={
          <>
            {buttonActions.map((a) => {
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
            {/* ICON-ONLY (matching account-detail.tsx / contact-detail.tsx:
                "edit, only the pencil icon", client ruling 2026-08-31) — the
                head's own edit pencil, made VISIBLE per the 2026-09-15 ruling
                quoted above, never behind a hover state or the overflow. */}
            {canEditProfile && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setEditProfile(true)}
                aria-label={t("Edit")}
              >
                <PencilSimple className="size-3.5" />
              </Button>
            )}
            <RecordActionsMenu actions={[...changeRoleMenuActions, ...removeMenuActions]} />
          </>
        }
        // THE RECORD COLUMN — client ruling, 2026-09-15: "the footer … is
        // missing the two sections' design." A MEMBERSHIP has no editor the
        // way an account or a ticket does (`team_members` carries
        // `creator_id`/`creator_email`/`creator_name` — who added this person
        // — and `updated_at`, but no `editor_*` columns at all: a role change
        // touches `updated_at` and nothing else, workers/tenancy/src/lib/
        // members.ts `changeMemberRole`), so `editedByName` is left unset
        // rather than invented — `recordAuditEntries` (record-chrome.tsx)
        // already renders a bare "Last edited {when}" row when only the date
        // is known, which is the honest reading of what this row actually
        // says. `createdByName`/`createdAt` are real: who added them, and
        // when — the same two facts every other record's Record column
        // opens with.
        audit={{
          createdByName: member.createdByName,
          createdAt: member.joinedAt,
          updatedAt: member.updatedAt,
        }}
        //
        // `onAddNote` IS WHAT MAKES THE FOOTER RELIABLE EVEN WHEN THE MEMBER
        // HAS NO LOGGED HISTORY YET — the same pairing every other bespoke
        // detail passes (Contact, Account, a knowledge source…):
        // `RecordDetail`'s own `showActivityColumn` draws the column when it
        // has rows, a composer, OR the rail's door, so a member with zero
        // activity rows still gets a footer with somewhere to write a first
        // entry, exactly the same guarantee CH27.8 makes for every other
        // record — now alongside a Record column that is never empty (every
        // membership has a `createdAt`).
        activity={activity}
        onAddNote={rights.team_members?.create ? activity.addNote : undefined}
        notePlaceholder={t("Add a note")}
      >
        {/* THE FIRST PANEL, THEN THE PERSON'S OWN PROFILE — BOTH inside this
            ONE `children`, which is what puts the footer after both rather
            than between them (see this file's header, point 4). */}
        <div className="flex flex-col gap-8">
          <MemberHead teamId={teamId} member={member} />
          <StaffPanel
            teamId={teamId}
            userId={member.userId}
            memberName={name}
            editOpen={editProfile}
            onEditOpenChange={setEditProfile}
          />
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
