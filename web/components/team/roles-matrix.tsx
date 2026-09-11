"use client"

// THE ROLES MATRIX — every role in the team, and what each one may do, on ONE
// grid inside the Team tab. It replaces the per-role screen that used to live at
// /t/<teamId>/roles/<id> (web/components/team/role-detail.tsx, deleted with this
// change).
//
// ── WHY IT EXISTS AT ALL, IN THE CLIENT'S OWN WORDS (2026-09-09) ─────────────
//
//   "I want to see the roles much differently… a matrix in which we see all the
//    roles as rows and the properties as columns. All the roles together, I want
//    to have an overview."
//
//   "I don't know why this redirects to another page. Everything should be in
//    different containers, like the different sections and member roles on this
//    single page, not taken anywhere else."
//
// So a role no longer opens a page. The matrix IS the overview, a cell is where
// a right is changed, and nothing on this tab navigates.
//
// ── THE GRID TURNED, AND THEN TURNED BACK — CLIENT, 2026-09-10 ───────────────
//
//   "i am thinking for the rolws, would it not make more sense taht the roles
//    are the cokumns and the permissions the rows? better use of space"
//
// She is right, and the arithmetic is the argument. Roles down the side put the
// 22 team modules ACROSS: 22 columns of four boxes is 88 cells wide, which no
// window holds, so every read of the grid was a horizontal scroll and the whole
// point of a matrix — seeing it at once — was gone. Turned, it is 22 rows of
// four ROLES: 16 boxes across, which fits, with the length going down the page
// where a page already scrolls.
//
// SO THE ORIENTATION PROP IS DELETED RATHER THAN CHANGED. `modules-as-rows` is
// the kit's own default (CH27.12, "collections down the side, roles across the
// top"), so what she asked for is what this component draws when nothing tells
// it otherwise. The line that came out is the whole change of axis.
//
// WHAT THE 2026-09-09 SHAPE WAS FOR, so the next reader knows it was weighed
// and not forgotten: roles-as-rows made a role read as one horizontal BAND you
// could compare against the band above it — "All the roles together, I want to
// have an overview" — and Admin's solid row against a narrow role's near-empty
// one was the sight she asked for. Turned, that comparison is a COLUMN instead
// of a row, which is the same comparison read the other way and now actually
// visible without scrolling to it.
//
// UNTIL v1.2.75 THAT SHAPE WAS BOUGHT BY LYING TO THE PROPS. This file handed
// its ROLES to `modules` and its MODULES to `roles`, because the two props were
// documented as "the rows" and "the columns" and nothing stopped it. The
// drawing came out right and one thing did not: `rights` — "which capabilities
// this collection offers at all" — sits on `PermissionModule`, and after a
// hand-transpose the module was the COLUMN, so the fact could not be stated.
// Fifteen of the eighty-eight boxes in every role's band went on looking like
// switches that decide nothing. That is R36's exact defect, surviving one axis
// rotation.
//
// The kit's `orientation` prop is what retired the transpose outright, and the
// props have carried their own nouns since:
//
//     kit `modules`      ← the 22 team modules (shared/team-modules.ts)
//     kit `roles`        ← this team's roles
//     kit `capabilities` ← the four rights, S · C · E · D
//
// and that is exactly why the 2026-09-10 flip is a one-line deletion rather
// than a rewrite. Nothing about the data moves with the drawing: `held`,
// `rights` and `locked` are facts about the COLLECTION at either orientation,
// which is precisely why the kit refused the other candidate fix (`rights` on
// `PermissionRole`) — that one would have invented a product rule nobody has
// ruled. Its whole argument is in the kit file's header.
//
// ── WHAT THAT CLOSED, AND WHAT WAS DELETED TO CLOSE IT ───────────────────────
//
// `rights` is passed now, per module, off the same `MODULE_OFFERED_RIGHTS` data
// the door already sends down on each sheet — so this grid still never learns
// the module list twice. Eight of the twenty-two modules offer fewer than four
// rights, and 15 of the 88 boxes in every role's band are now DRAWN as what
// they are: the slot keeps its place, loses its control, and shows the kit's
// no-value em dash. No well, no letter, no tab stop, no tooltip.
//
// THREE THINGS WENT WITH IT, and all three are the kit's job now — this is the
// deletion the upstream ask was written to earn:
//
//   1. `offered()`, the local predicate that asked the same question;
//   2. the filter that kept a held tick off an unoffered box — the kit does not
//      count an unoffered capability as held "even if `held` names it";
//   3. the early return that swallowed a press on an unoffered box — an
//      unoffered slot is not a tab stop and does not toggle, so there is no
//      press left to swallow.
//
// Keeping any of them would be keeping a second opinion about a question one
// component now answers, which is how two answers drift apart. Nothing is
// mis-granted either way — the door strips an unoffered right on save
// (`setRolePermissions`) and has all along; this was a legibility defect and it
// is the legibility that is fixed.
//
// ── AND THE NAME COLUMN STAYS PINNED, THOUGH IT PINS A DIFFERENT NAME NOW ────
//
// `stickyNames` and `stickyGround` were added for the old axis, where 22 module
// columns overflowed every window and a reader scrolled to the end saw bands of
// `S C E D` with no idea whose. They are KEPT rather than deleted with the
// orientation, because the property they buy is about scrolling and not about
// which axis is which: the kit's own width floor counts COLUMNS, so four roles
// no longer overflow — and a team with a dozen roles will, and then the module
// each row is about is exactly the thing that must not scroll away.
//
// `stickyGround="panel"` is unchanged and still correct: it is the paper
// `TeamPanel` actually paints at the width this wide grid exists at (the narrow
// render below 45rem is a stack of cards and never scrolls sideways). Guessing
// that ground wrong is visible AT REST as a pale band down the side, which is
// why the kit made it a required companion rather than a default.
//
// ── WHAT ELSE THE FLIP TOUCHED, AND IT IS ONE THING ──────────────────────────
//
// THE LOCK'S MARK NAMES THE OTHER AXIS, and the other axis is now the ROLES.
// `lockMarkFor` in the kit reads `plain(label, id)` — a string label as-is,
// anything else falling back to the id — and this file's role label is a BUTTON
// NODE (the press target that opens the role's panel). Under roles-as-rows the
// mark named MODULES, whose labels are plain strings, so it read correctly by
// accident; turned, it would have printed a ULID on every one of the 22 rows,
// once per locked role. `formatLockedLabel` below rebuilds the title from the
// id, which is the same repair `formatCellLabel` has always made one prop down
// and for exactly the same reason. Nothing else in the call changed.
//
// ── ONE MANGO ON THIS TAB, AND IT IS NOT HERE ────────────────────────────────
//
// "New role" is a BLACK `+`. The client asked for a second mango plus beside
// the members' one, then ruled, verbatim, 2026-09-09: "No exceptions to the
// rules. It was my mistake." — and then, the same day, said what the button
// should be instead: "new ole shoudl be a + buton only (in black, itsthe mainn
// button)".
//
// Those two messages are ONE ruling and they have to be read together. The kit
// rules one mango per view (shared/ui/docs/RULES.md §2.5, BUILD-A-SCREEN.md
// §6.3); this tab has two things somebody creates, a member and a role; the
// tab's one mango belongs to Invite, because inviting a person is what a Team
// tab is FOR. Her answer is not "have two mangoes anyway" and it is not "make
// the second one quiet and let it disappear" — it is the kit's INVERSE
// treatment, `Button variant="inverse"`: charcoal fill, off-beige label, and it
// flips with the palette. Loud enough to be "the main button" of its own
// container, and not a second brand fill. The law survives and so does her
// intent.
//
// THREE THINGS A LATER READER WILL WANT TO "FIX", AND MUST NOT:
//
//   · it is not mango. That is the whole point of the ruling above, and she
//     reversed herself in writing to keep it that way;
//   · it carries no label. "+ buton only" — the words live in the accessible
//     name and the tooltip, which is where `AddButton` puts them for every
//     other create in the app (UI-RULEBOOK B3 / D9);
//   · it is not `AddButton`. That seam is the MANGO `+` — it takes no variant,
//     and every one of its eleven call sites is a view's one brand action. A
//     variant prop on it would make "which plus is the mango one" a per-call
//     decision, which is precisely how a view ends up with two. So the black
//     one is built here, once, beside the argument for it.
//
// Recorded at this length because her FIRST message asked for the opposite, and
// a later reader finding only that message would restore the second mango
// believing they were following her.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Headline } from "@shared/ui/components/typography/typography"
import { Plus, Power } from "@shared/ui/foundations/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/ui/components/alert-dialog/alert-dialog"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { toast } from "@shared/ui/components/sonner/sonner"
import {
  PermissionMatrix,
  type PermissionCapability,
  type PermissionRight,
} from "@shared/ui/components/permission-matrix/permission-matrix"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"

import type { PermissionValue, RightSet, RolePermissions, TeamRole } from "@shared/types"
import { RoleFormDialog } from "@/components/team/role-form-dialog"
import { RolePanel } from "@/components/team/role-panel"
import { TeamPanel } from "@/components/team/team-panel"
import { ApiFailure, tenancy } from "@/lib/api"
import { rolePermsAllKey } from "@/lib/live-resources"
import { invalidate, useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"

/** SERVER ⇄ KIT rights vocabulary — lifted unchanged from the per-role screen
 * this replaces. The app's sheet says read/create/edit/delete; the kit says
 * see/create/edit/delete. Three of the four agree (the kit took `create` at
 * v1.2.24, the word every enforcing surface here already uses); `see`/`read` is
 * the one that still differs and deliberately so — the kit's id is the word in
 * front of a reader, `read` is the word the gate is written in. One mapping,
 * both directions, so neither side ever learns the other's words. */
const RIGHT_TO_KIT = { read: "see", create: "create", edit: "edit", delete: "delete" } as const
const KIT_TO_RIGHT: Record<PermissionRight, keyof RightSet> = {
  see: "read",
  create: "create",
  edit: "edit",
  delete: "delete",
}

/** THE FOUR MARKS ARE FIXED — S · C · E · D — AND THE WORDS ARE TRANSLATED.
 *
 * The kit derives a slot's letter from the first character of its label unless a
 * capability names its own `initial`, and its doc says exactly why the prop
 * exists: "a language whose four words share an initial needs to choose its own
 * four marks". Two of ours do. Spanish is Ver · Crear · Editar · Eliminar and
 * Catalan is Veure · Crear · Editar · Eliminar — Editar and Eliminar collide on
 * E in both, which would put two identical letters in the same run and destroy
 * the one reading this drawing exists for.
 *
 * So the marks are the four the client named ("I really need to see the create
 * letters", 2026-09-09) and they do not move between languages; the LEGEND under
 * the grid is what carries the translated word for each. A fixed mark plus a
 * translated key is the shape the kit's own `initial` prop is there to allow. */
function capabilities(t: (s: string) => string): PermissionCapability[] {
  return [
    // READ, NOT "SEE" — the client's ruling, 11 Sep 2026, and the glossary was
    // already on her side: `permission` is defined as "A single thing a role can
    // do: READ, create, edit, or delete." Three of the four columns already said
    // the glossary's word and this one did not, so the screen that TEACHES people
    // what a right is was the one screen using a synonym for it. The kit's own
    // capability id stays `see` (it is vendored and hash-pinned, and the app maps
    // `RIGHT_TO_KIT` either way); only the WORD a person reads moves. Owed
    // upstream: the kit's default label for this capability says "See" too.
    { id: "see", label: t("Read"), initial: "R" },
    { id: "create", label: t("Create"), initial: "C" },
    { id: "edit", label: t("Edit"), initial: "E" },
    { id: "delete", label: t("Delete"), initial: "D" },
  ]
}

/** One role's sheet, as the door hands it back, plus the role it belongs to. */
type RoleSheet = { role: TeamRole; perms: RolePermissions }

export function RolesMatrix({
  teamId,
  roles,
  rolesLoading,
  canCreate,
}: {
  teamId: string
  /** The team's roles, already loaded by the tab (one read, two containers). */
  roles: TeamRole[]
  /** True while that read is still in flight — never `roles.length === 0`
   * alone, which reads exactly like a genuinely empty collection. */
  rolesLoading: boolean
  /** `member_roles:create` — whether the quiet "New role" button is drawn. */
  canCreate: boolean
}) {
  const t = useT()
  const [addOpen, setAddOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  // A ROLE'S OWN TWO ACTS, WHICH USED TO LIVE ON ITS PAGE AND THEN ON ITS ROW.
  // Renaming a role and switching it off were the per-role screen's own header
  // buttons; deleting that screen without rehoming them would have left two
  // doors (`POST /api/tenancy/roles/update`, `POST /api/tenancy/roles/active`)
  // that nothing a person can click calls — which
  // `web/test/reachable-screens.test.ts` catches, and rightly.
  //
  // THEY LIVED ON THE ROW FOR ONE DAY AND THE CLIENT TOOK THEM OFF IT, 2026-09-09:
  // "when iclick in role, overview in slide in. there on top, titple and on the
  // righ edit and on/off button. rmeove this buttons from th elist view."
  // They are in `RolePanel`'s head now; both doors are still reached from here,
  // through it. The ROW is for reading — a band you compare against the band
  // above it, which is the whole reason this grid replaced four screens.
  const [editing, setEditing] = React.useState<TeamRole | null>(null)
  /** The role whose panel is open — set by pressing a row head, or a
   * deactivated role's chip under the grid. */
  const [openRole, setOpenRole] = React.useState<TeamRole | null>(null)
  const [confirmOff, setConfirmOff] = React.useState<TeamRole | null>(null)
  const [busyActive, setBusyActive] = React.useState(false)

  // ACTIVE ROLES ONLY. A deactivated role's permissions are frozen and the door
  // 404s them (the same rule the per-role screen kept) — and a row of dashes for
  // a role nobody can hold would be a column of noise across twenty-two modules.
  const activeRoles = React.useMemo(() => roles.filter((r) => r.active), [roles])
  const roleIds = activeRoles.map((r) => r.id).join(",")
  const inactiveRoles = React.useMemo(() => roles.filter((r) => !r.active), [roles])

  // ONE READ FOR THE WHOLE GRID. The door answers per role
  // (`tenancy.rolePermissions`), and roles are a BOUNDED collection (R14 — a
  // team has a handful), so the grid asks for all of them together rather than
  // mounting a hook per row, which React would not allow anyway: the row count
  // is data. `member_roles`'s own live deps drop this key whenever a role moves
  // (web/lib/live-resources.ts), which is what keeps the grid the right WIDTH as
  // well as the right content.
  const sheetsQ = useCached<RoleSheet[]>(
    teamId && activeRoles.length > 0 ? rolePermsAllKey(teamId) : null,
    async () => {
      const sheets = await Promise.all(activeRoles.map((r) => tenancy.rolePermissions(r.id)))
      return activeRoles.map((role, i) => ({ role, perms: sheets[i] }))
    }
  )
  const sheets = sheetsQ.data ?? null

  // THE DRAFT, PER ROLE — the same reconciliation the per-role screen used, one
  // level up. A realtime ping (our own save included) returns a structurally
  // identical NEW object, so the effect bails on an unchanged server value
  // rather than churning while somebody is mid-edit.
  const [draft, setDraft] = React.useState<Record<string, PermissionValue> | null>(null)
  const serverRef = React.useRef<{ key: string; value: Record<string, PermissionValue> } | null>(null)
  React.useEffect(() => {
    if (!sheets) return
    const server: Record<string, PermissionValue> = {}
    for (const s of sheets) server[s.role.id] = s.perms.value
    const prev = serverRef.current
    const nextJson = JSON.stringify(server)
    if (prev && prev.key === roleIds && JSON.stringify(prev.value) === nextJson) return
    if (!prev || prev.key !== roleIds) {
      setDraft(server)
    } else {
      setDraft((d) => (d && JSON.stringify(d) === JSON.stringify(prev.value) ? server : d))
    }
    serverRef.current = { key: roleIds, value: server }
  }, [sheets, roleIds])

  const dirty =
    sheets != null &&
    draft != null &&
    sheets.some((s) => JSON.stringify(draft[s.role.id]) !== JSON.stringify(s.perms.value))

  // THE ROLES THAT CANNOT BE CHANGED, as the kit wants them: `locked` is a fact
  // about a COLLECTION — "which roles' cells are fixed here" — and it is the
  // same answer on all twenty-two, because what is locked is the Admin ROLE
  // itself. One list, computed once, handed to every module row.
  const lockedRoleIds = (sheets ?? []).filter((s) => s.perms.isDefault).map((s) => s.role.id)

  // ONE VIEWER, ONE ANSWER. Every sheet carries the same `canEdit` (it is a fact
  // about the viewer, not about the role), so the grid is editable when the
  // viewer may edit roles at all; the Admin row is locked row-by-row above.
  const canSave = sheets != null && sheets.length > 0 && sheets[0].perms.canEdit

  // THE MODULES, WHICH ARE THE KIT'S `modules` AND ARE THE ROWS since
  // 2026-09-10. They come off the first sheet: every role's sheet carries the same
  // module list in the same order, because the server builds it from the one
  // shared TEAM_MODULES (shared/team-modules.ts). Taking it from a sheet rather
  // than importing the catalogue keeps the labels the door's own, which is where
  // the translated word lives — and now keeps `rights` the door's own too.
  const moduleColumns =
    sheets && draft
      ? (sheets[0]?.perms.modules ?? []).map((m) => ({
          id: m.key,
          label: m.label,
          // R36's fix, and the whole point of this release. `m.rights` is
          // MODULE_OFFERED_RIGHTS as the door sends it, in the app's own
          // vocabulary; the kit speaks in capability ids, so it goes through the
          // one mapping this file already owns.
          rights: m.rights.map((r) => RIGHT_TO_KIT[r]),
          // WHAT EACH ROLE HOLDS HERE, keyed by role id. It is read straight off
          // the draft with NO offered-filter over it: the kit does not count an
          // unoffered capability as held whatever `held` names, so filtering
          // here would be a second opinion about a question the component now
          // answers. See this file's header.
          held: Object.fromEntries(
            sheets.map(({ role }) => [
              role.id,
              (Object.keys(RIGHT_TO_KIT) as (keyof RightSet)[])
                .filter((r) => draft[role.id]?.[m.key]?.[r])
                .map((r) => RIGHT_TO_KIT[r]),
            ])
          ),
          locked: lockedRoleIds,
        }))
      : []

  // THE ROLES, WHICH ARE THE COLUMNS since 2026-09-10 (client: "the roles are
  // the cokumns and the permissions the rows"). Nothing but identity and a
  // name: `held`, `rights` and `locked` are the collection's facts and live on
  // the module rows above, at either orientation — which is why turning the
  // grid moved no data at all.
  const roleRows =
    sheets && draft
      ? sheets.map(({ role }) => ({
          id: role.id,
          // THE COLUMN HEAD IS THE ROLE, AND PRESSING IT OPENS THE ROLE'S PANEL. A
          // `PermissionRole.label` is a `React.ReactNode`, which is what makes
          // this possible without forking anything. The client's own preview
          // draws the shape: the role's name with a quiet meta line under it.
          //
          // THE META LINE STAYS INSIDE THE BUTTON rather than moving to the
          // kit's new `PermissionRole.description`, which v1.2.75 added for
          // exactly this slot. The description is drawn OUTSIDE the label, so
          // taking it would shrink the press target to the title alone — and
          // the whole two-line stack being pressable is the shape the client
          // approved when she asked for the overview on a row press. The prop
          // is the better home for prose the row merely SAYS; this line is part
          // of what she presses.
          //
          // THE TWO ICON BUTTONS THAT STOOD HERE ARE GONE — "rmeove this buttons
          // from th elist view" (client, 2026-09-09). They are in `RolePanel`'s
          // head, which this press opens. What is left is one control where
          // there were three, and it does the thing she named: it opens the
          // overview.
          //
          // A BARE `<button>`, not a kit `Button`. Every `size` a kit button has
          // fixes a HEIGHT and `whitespace-nowrap`, and this target is a
          // two-line stack that must wrap in the first column of a grid that
          // already scrolls. The kit's own focus rule is global (tokens.css §8
          // rings every `:focus-visible` at the control's own radius), so a bare
          // button is rung for free and defines nothing — which is the same
          // reason the app's other forty row-shaped targets are bare buttons
          // too. `text-start` because a button centres its text by default and a
          // row head is prose.
          label: (
            <button
              type="button"
              onClick={() => setOpenRole(role)}
              aria-label={`${role.title} — ${t("Overview")}`}
              className="flex cursor-pointer flex-col text-start"
            >
              {/* THE HOVER IS THE KIT'S LINK HOVER AND NOTHING ELSE — `.kw-link`
                  "inherits its ink, underlines on hover, occupies no box"
                  (`button.tsx`, `variant="link"`), at that variant's own
                  offset. No lift and no wash: a row head is a line of text in a
                  table cell, and `motion-hover-lift` is the card's rule. This
                  file writes no duration and no curve (kit RULES §6.1). */}
              <span className="underline-offset-[0.1875rem] hover:underline">{role.title}</span>
              <span className="text-muted-foreground text-micro">
                {/* A WHOLE SENTENCE WITH A HOLE IN IT, never a number glued
                    to a translated noun (R28): `t("people")` on its own is a
                    fragment `isUserVisible` refuses, and it is also the one
                    shape a translator cannot reorder. */}
                {role.isDefault
                  ? t("Locked")
                  : role.memberCount === 1
                    ? t("{count} person", { count: String(role.memberCount) })
                    : t("{count} people", { count: String(role.memberCount) })}
              </span>
            </button>
          ),
        }))
      : []

  async function save() {
    if (!draft || !sheets) return
    setSaving(true)
    try {
      // Only the roles that actually moved, and never the locked one. The door
      // answers with the saved matrix (it auto-enables `read` alongside any
      // write, so the saved value is not always the sent one), so the reply is
      // what the draft is reset to.
      const changed = sheets.filter(
        (s) => !s.perms.isDefault && JSON.stringify(draft[s.role.id]) !== JSON.stringify(s.perms.value)
      )
      const saved = await Promise.all(
        changed.map((s) => tenancy.saveRolePermissions(s.role.id, draft[s.role.id]))
      )
      setDraft((prev) => {
        if (!prev) return prev
        const next = { ...prev }
        changed.forEach((s, i) => (next[s.role.id] = saved[i].value))
        return next
      })
      serverRef.current = null
      invalidate(rolePermsAllKey(teamId))
      toast.success(t("Access rights saved."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save access rights."))
    } finally {
      setSaving(false)
    }
  }

  async function updateDetails(role: TeamRole, title: string, description: string) {
    await tenancy.updateRole(role.id, title, description)
    invalidate(`member_roles:${teamId}`)
    toast.success(t("Role updated."))
  }

  async function setActive(role: TeamRole, activeNext: boolean) {
    setBusyActive(true)
    try {
      await tenancy.setRoleActive(role.id, activeNext)
      invalidate(`member_roles:${teamId}`)
      toast.success(activeNext ? t("Role activated.") : t("Role deactivated."))
      setConfirmOff(null)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't update the role."))
    } finally {
      setBusyActive(false)
    }
  }

  const caps = capabilities(t)
  /** The word for a box that was never on offer, in the reader's language. It is
   * said in TWO places that must agree — the legend's third register and every
   * affected cell's accessible sentence — so it is translated once here. */
  const notOfferedWord = t("Not offered")

  return (
    /* THE CONTAINER — "nothing on top of white background, its a rule!"
       (client, 2026-09-09), the same rule and the same box the members gallery
       above takes, so the two sections on this tab agree. `narrowGround={false}`
       is the one asymmetry and it is the kit's, not ours: below 45rem
       `PermissionMatrix` swaps to a stack of hard-coded `bg-surface-panel`
       module cards, which on a soft-paper panel would measure 1.000 — the very
       fault this container exists to fix. team-panel.tsx carries the whole
       argument, the measured contrast in both palettes, and the upstream ask
       that would delete this prop. */
    <TeamPanel narrowGround={false}>
      {/* THE CONTAINER'S OWN HEAD — the collection's name, and the one action
          beside it: a BLACK `+`, icon only. Not mango, not labelled, and not
          `AddButton`; this file's header has all three reasons and the client's
          two messages that settle them. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Headline as="h2" size="h4">
          {t("Roles")}
        </Headline>
        {canCreate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="inverse"
                size="icon"
                aria-label={t("New role")}
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("New role")}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {sheetsQ.error ? (
        <ShapeStateBody
          shape="recordChrome"
          state="error"
          copy={{ errorTitle: t("Couldn't load the roles.") }}
          action={
            <Button variant="secondary" onClick={() => sheetsQ.refresh()}>
              {t("Try again")}
            </Button>
          }
        />
      ) : rolesLoading || (activeRoles.length > 0 && (!sheets || !draft)) ? (
        <Skeleton className="h-64 w-full rounded-[var(--radius)]" />
      ) : (
        <div className="flex flex-col gap-4">
          <PermissionMatrix
            // EACH PROP ITS OWN NOUN, and the DRAWING turned by `orientation`
            // rather than by the handover. See this file's header.
            modules={moduleColumns}
            roles={roleRows}
            // NO `orientation`, AND THAT IS THE CHANGE OF AXIS — client,
            // 2026-09-10: "would it not make more sense taht the roles are the
            // cokumns and the permissions the rows? better use of space". The
            // kit's default is `modules-as-rows`, which IS collections down the
            // side and roles across the top, so what she asked for is what this
            // component draws when nothing overrides it. A line was deleted
            // rather than a value changed; see this file's header for the
            // arithmetic (88 cells across became 16) and for what the old shape
            // was for.
            capabilities={caps}
            // The two axis headings. `moduleLabel` is the collections' word
            // wherever they are, and at this orientation the collections ARE
            // the first column, so it is the heading a reader sees; `roleLabel`
            // is the word for the top axis, where each role also carries its
            // own name. Both are passed at either orientation because which one
            // gets drawn is the kit's business, not this screen's.
            moduleLabel={t("Module")}
            roleLabel={t("Role")}
            // THE NAME COLUMN STAYS PINNED. Four roles no longer overflow (the
            // kit's width floor counts COLUMNS), but a dozen will — and then
            // the module each row is about is the thing that must not scroll
            // away. `stickyGround` is the paper `TeamPanel` actually paints at
            // the width this wide grid exists at — see this file's header.
            stickyNames
            stickyGround="panel"
            label={t("Roles and what each one may do")}
            state={activeRoles.length === 0 ? "empty" : "ready"}
            emptyTitle={t("No roles yet.")}
            emptyDescription={t("A role is a set of rights you can give somebody. Create one to start.")}
            disabled={!canSave || saving}
            // THE CHANGE IS NOT INSTANT HERE, so the kit's own default footnote
            // ("A change applies at once…") would be false. Twenty-two columns
            // of switches saved on every press would be twenty-two round trips
            // a reader cannot see the end of; this grid drafts and saves.
            footnote={t("Changes are saved when you press Save.")}
            // CAPITALISED, AND NOT THE LOWERCASE `granted` THIS APP ALREADY
            // SAYS. That one is on a staff certificate and is seeded as
            // "ausgestellt" / "expedido" — issued, not permitted — so reusing
            // the key would have put the wrong German under this legend.
            // A NODE LABEL COSTS THE CELL ITS NAME UNLESS THE CALLER GIVES IT
            // BACK. The kit reads a name with `plain(label, id)` — a string
            // label is used as-is and anything else falls back to the id, which
            // here would announce a ULID. The MODULE's label is a plain string
            // and arrives intact; the ROLE's is the button node above, so that
            // half is rebuilt from the role's real title.
            //
            // THE PARAMETERS DO NOT ROTATE WITH THE DRAWING. The kit's own note
            // is explicit: the signature stays `(collection, role, held, locked,
            // notOffered)` at either orientation, so the same cell announces the
            // same way in every app. The SENTENCE still leads with the role,
            // matching the kit's own default and the band a reader is reading.
            //
            // THE FIFTH PARAMETER IS NO LONGER EMPTY. It arrives as capability
            // LABELS — already translated, because `capabilities` carries the
            // translated words — and it is the only way a reader who cannot see
            // the em dashes is told which boxes were never on offer. `nothing`
            // says the role holds none of them, which is a different fact.
            formatCellLabel={(moduleLabel, roleId, held, locked, notOffered) => {
              const title = sheets?.find((sheet) => sheet.role.id === roleId)?.role.title ?? roleId
              return `${title} · ${moduleLabel}: ${
                held.length === 0 ? t("nothing") : held.join(", ")
              }${locked ? `, ${t("Locked by policy")}` : ""}${
                notOffered.length === 0 ? "" : ` · ${notOffered.join(", ")}: ${notOfferedWord}`
              }`
            }}
            // THE LOCK'S MARK NAMES THE OTHER AXIS, AND THE OTHER AXIS IS NOW
            // THE ROLES — so it arrives as ULIDs for exactly the reason
            // `formatCellLabel` above already deals with: a role's label is the
            // button node, and the kit reads a name with `plain(label, id)`.
            // Under the old orientation the mark named MODULES, whose labels
            // are plain strings, so it read correctly by accident. Rebuilt from
            // the same lookup, and the phrase is the kit's own default shape
            // with the punctuation written here because word order differs
            // between languages.
            formatLockedLabel={(lockedLabel, roleIds) =>
              `${lockedLabel}: ${roleIds
                .map(
                  (roleId) =>
                    sheets?.find((sheet) => sheet.role.id === roleId)?.role.title ?? roleId
                )
                .join(", ")}`
            }
            heldLabel={t("Granted")}
            notHeldLabel={t("Not granted")}
            // THE LEGEND'S THIRD REGISTER, which only exists now that `rights`
            // is passed: the kit draws it only when a shown row actually
            // withholds something, and it teaches the em dash. Passed rather
            // than defaulted for the same reason the two above are — the kit's
            // default is English and this screen is read in four languages.
            notOfferedLabel={notOfferedWord}
            onChange={(moduleKey, roleId, capabilityId, next) => {
              // The kit hands back (collection, role, capability) in its own
              // declared order, which the orientation does not rotate either.
              const right = KIT_TO_RIGHT[capabilityId as PermissionRight]
              // NO UNOFFERED GUARD. An unoffered slot is not a tab stop and does
              // not toggle, so there is no press here to refuse — see this
              // file's header for the three deletions this release earned.
              setDraft((prev) => {
                if (!prev) return prev
                const cur = prev[roleId]?.[moduleKey] ?? {
                  read: false,
                  create: false,
                  edit: false,
                  delete: false,
                }
                const val = { ...cur, [right]: next }
                // Granting any write grants read with it — a right to change a
                // thing you cannot open is a sheet nobody means. The door does
                // the same on save; doing it here too keeps the draft honest.
                if (next && right !== "read") val.read = true
                return { ...prev, [roleId]: { ...prev[roleId], [moduleKey]: val } }
              })
            }}
          />

          {/* THE LEGEND SHE ASKED FOR IS THE KIT'S OWN — "for the rule
              metrics, I really need to see the create letters… add a legend at
              the bottom" (client, 2026-09-09). `legend` is on by default and
              draws exactly that: the four marks S · C · E · D against See ·
              Create · Edit · Delete, then a filled run labelled Granted and a
              hollow one labelled Not granted.

              A SECOND LINE STOOD HERE FOR ONE PASS and was deleted after looking
              at it: "S See · C Create · E Edit · D Delete" in plain text, three
              millimetres under the kit's own legend saying the same four things
              with the real marks beside them. Two legends for one grid is one
              more than the grid has meanings. */}

          {/* THE ROLES THAT ARE SWITCHED OFF, AND THE WAY BACK ON. They are
              not rows: a deactivated role's sheet is frozen and the door 404s
              it, so a row for one would be twenty-two columns of nothing. But
              the way to reactivate one lived on the page that is gone, and a
              switch with no way back is a delete wearing a nicer word — so they
              are named here, quietly, under the grid they are not in. */}
          {inactiveRoles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-micro uppercase">
                {t("Deactivated")}
              </span>
              {/* A CHIP OPENS THE ROLE'S PANEL; THE PANEL SWITCHES IT BACK ON.
                  It used to reactivate on the press. That put an on/off control
                  in the list view, which is the exact thing the client took out
                  of the rows above — "rmeove this buttons from th elist view"
                  — so the two would have disagreed within one container. Now
                  every route to a role's on/off runs through `RolePanel`'s head,
                  which is where she put it. */}
              {inactiveRoles.map((role) => (
                <Button
                  key={role.id}
                  variant="secondary"
                  size="sm"
                  disabled={busyActive}
                  onClick={() => setOpenRole(role)}
                >
                  <Power className="size-3.5" />
                  {role.title}
                </Button>
              ))}
            </div>
          )}

          {canSave && (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void save()} disabled={!dirty || saving}>
                {saving ? <Spinner /> : null}
                {saving ? t("Saving…") : t("Save")}
              </Button>
            </div>
          )}
        </div>
      )}

      <RoleFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        draftKey={editing ? `role:edit:${editing.id}` : undefined}
        initial={
          editing ? { title: editing.title, description: editing.description ?? "" } : null
        }
        onSubmit={async (title, description) => {
          if (editing) await updateDetails(editing, title, description)
        }}
      />

      <AlertDialog
        open={confirmOff !== null}
        onOpenChange={(open) => !busyActive && !open && setConfirmOff(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Deactivate")} {confirmOff?.title}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("Members who have it keep their access, but you can't give it to anyone new. You can activate it again later.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyActive}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (confirmOff) void setActive(confirmOff, false)
              }}
              disabled={busyActive}
            >
              {busyActive ? <Spinner /> : null}
              {busyActive ? t("Deactivating…") : t("Deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RoleFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        draftKey={`role:add:${teamId}`}
        onSubmit={async (title, description) => {
          await tenancy.createRole(title, description)
          invalidate(`member_roles:${teamId}`)
          toast.success(t("Role created."))
        }}
      />

      {/* THE ROLE'S OVERVIEW, AND THE ONLY PLACE ITS TWO ACTS NOW LIVE.
          Opened by a row head above, or by a deactivated role's chip under the
          grid. It opens NO DOOR: the sheet it summarises is the one this grid
          already read (R56 — one read per unit), handed down. A deactivated
          role has no sheet at all, by the door's design, so it gets `null` and
          the panel says "Deactivated" rather than a summary of nothing.

          BOTH HANDOVERS CLOSE THIS PANEL FIRST. `FormShellDialog` is itself a
          `Sheet` and paints on the same z 55 layer, so two open drawers would
          be the paint-order ambiguity `overDialog` exists for; and the confirm
          is an `AlertDialog`, which is a stop — leaving a drawer open behind a
          warning about the very record it is showing is two surfaces asking one
          question. One at a time, both directions. */}
      <RolePanel
        role={openRole}
        perms={openRole ? (sheets?.find((s) => s.role.id === openRole.id)?.perms ?? null) : null}
        canEdit={canSave}
        open={openRole !== null}
        onOpenChange={(open) => !open && setOpenRole(null)}
        onEdit={(role) => {
          setOpenRole(null)
          setEditing(role)
        }}
        onToggleActive={(role) => {
          setOpenRole(null)
          // OFF ASKS, ON DOES NOT — unchanged from the row this replaces.
          // Switching a role off takes access away from everybody holding it,
          // which is the shape R59 calls a warning; switching it back on gives
          // nothing away and is undone by the same control.
          if (role.active) setConfirmOff(role)
          else void setActive(role, true)
        }}
      />
    </TeamPanel>
  )
}
