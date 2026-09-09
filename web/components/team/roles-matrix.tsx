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
// ── THE AXES ARE THE TRANSPOSE OF THE KIT'S OWN, AND THAT IS THE DESIGN ──────
//
// The kit's `PermissionMatrix` draws "collections down the side, roles across
// the top" (its own header sentence, CH27.12). The approved design is the other
// way round: ROLES down the side, the 22 team modules across — four rows and
// twenty-two columns rather than twenty-two rows and four columns. That is what
// the client asked for and what she approved, and it is the shape that answers
// her actual question: a role reads as one horizontal band you can compare
// against the band above it, and Admin's solid row against the Client role's
// near-empty one is the sight she asked for.
//
// The kit's props are named for ITS axes, not for a fixed meaning — `modules` is
// "the rows" and `roles` is "the columns" (`PermissionModule`'s own doc says as
// much: "One row. The kit's word for a row is 'collection'; the prop keeps the
// commission's noun"). So the handover below is deliberate and reads backwards
// on purpose:
//
//     kit `modules` (rows)    ← this team's ROLES
//     kit `roles`   (columns) ← the 22 team modules (shared/team-modules.ts)
//     kit `capabilities`      ← the four rights, S · C · E · D
//
// `held` is keyed by COLUMN id, which after the transpose is a module key, so
// each role row carries "what this role holds on each module" — exactly the row
// of the tall sheet the database already stores. `locked` is per row, which
// after the transpose is per ROLE, which is exactly right: the Admin role is the
// locked one.
//
// ── AND HERE IS WHAT THE TRANSPOSE COSTS, SAID OUT LOUD ──────────────────────
//
// Kit v1.2.72 added `PermissionModule.rights` — "an unoffered box stops
// pretending to be a switch". Given it, a slot the collection does not offer
// keeps its place and loses its control: no well, no letter, an em dash, no tab
// stop, no tooltip, and it is never counted as held. That is R36's defect fixed
// inside the kit, and it is exactly what this grid needs: eight of the
// twenty-two modules offer fewer than four rights (MODULE_OFFERED_RIGHTS), so
// fifteen of the eighty-eight boxes in every role's band decide nothing.
//
// IT CANNOT BE USED ON THIS AXIS. `rights` sits on `PermissionModule`, which is
// the ROW. Whether `delete` exists at all is a fact about the MODULE, and after
// the transpose the module is the COLUMN. A row-level prop is constant across
// columns; the fact we need is constant across rows. The two never coincide,
// because the offered set genuinely differs from module to module — `teams`
// offers only `edit`, `all_tasks` only `read`, `google_mail` only `create`.
// Passing `rights` here would be a lie with a prop's authority behind it, so it
// is not passed, and the two guards this screen inherited from role-detail.tsx
// carry the honesty in the meantime:
//
//   1. a held tick is filtered to the offered rights, so an unoffered box is
//      never drawn filled; and
//   2. a press on an unoffered box records nothing — the door would strip it on
//      save anyway (setRolePermissions), and a draft showing a tick the save
//      then removes is a lie with a delay on it.
//
// THE UPSTREAM ASK, so this comment can be deleted rather than reworded: the
// kit needs the same prop on `PermissionRole` (the column) — or an
// `orientation` on the matrix itself, which is the better shape, because then
// `rights` stays on the collection whichever way the grid is drawn and no
// consuming application has to think about this at all. Until then a box that
// decides nothing still LOOKS like a switch on this grid, which is R36's own
// defect surviving one axis rotation. It is written here, in the file that
// suffers it, rather than left for somebody to rediscover.
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
    { id: "see", label: t("See"), initial: "S" },
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

  /** Whether a module offers a right at all (R36 · MODULE_OFFERED_RIGHTS). The
   * DOOR says — `m.rights`, the same data — so this grid never learns the module
   * list twice. */
  const offered = (m: { rights: readonly (keyof RightSet)[] }, r: keyof RightSet) =>
    m.rights.includes(r)

  // THE COLUMNS ARE THE MODULES, and they come off the first sheet: every role's
  // sheet carries the same module list in the same order, because the server
  // builds it from the one shared TEAM_MODULES (shared/team-modules.ts). Taking
  // it from a sheet rather than importing the catalogue keeps the labels the
  // door's own, which is where the translated word lives.
  const moduleColumns = (sheets?.[0]?.perms.modules ?? []).map((m) => ({
    id: m.key,
    label: m.label,
  }))

  // ONE VIEWER, ONE ANSWER. Every sheet carries the same `canEdit` (it is a fact
  // about the viewer, not about the role), so the grid is editable when the
  // viewer may edit roles at all; the Admin row is locked row-by-row above.
  const canSave = sheets != null && sheets.length > 0 && sheets[0].perms.canEdit

  // THE ROWS ARE THE ROLES. `held` is keyed by the COLUMN — a module key after
  // the transpose — and a held tick is filtered to the rights the module
  // actually offers, so an unoffered box is never drawn filled whatever the
  // stored sheet says.
  const roleRows =
    sheets && draft
      ? sheets.map(({ role, perms }) => ({
          id: role.id,
          // THE ROW HEAD IS THE ROLE, AND PRESSING IT OPENS THE ROLE'S PANEL. A
          // `PermissionModule.label` is a `React.ReactNode`, which is what makes
          // this possible without forking anything. The client's own preview
          // draws the shape: the role's name with a quiet meta line under it.
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
          // The locked Admin role, drawn exactly as a live row and marked with
          // the kit's own bare phrase beside its name (D4-B).
          locked: perms.isDefault,
          held: Object.fromEntries(
            perms.modules.map((m) => [
              m.key,
              (Object.keys(RIGHT_TO_KIT) as (keyof RightSet)[])
                .filter((r) => offered(m, r) && draft[role.id]?.[m.key]?.[r])
                .map((r) => RIGHT_TO_KIT[r]),
            ])
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
            // The transpose. See this file's header for why the two props read
            // backwards and what it costs.
            modules={roleRows}
            roles={moduleColumns}
            capabilities={caps}
            moduleLabel={t("Role")}
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
            // BACK. The kit reads a row's accessible name with
            // `plain(label, id)` — a string label is used as-is and anything
            // else falls back to the id, which here would announce a ULID. The
            // row head above is a node, so the sentence is rebuilt here from the
            // role's real title. Five parameters, the fifth being the
            // capabilities the collection does not offer (kit v1.2.72) — it
            // arrives empty on this grid, because `rights` is not passed; see
            // this file's header.
            formatCellLabel={(rowId, moduleLabel, held, locked) => {
              const title = sheets?.find((sheet) => sheet.role.id === rowId)?.role.title ?? rowId
              return `${title} · ${moduleLabel}: ${
                held.length === 0 ? t("nothing") : held.join(", ")
              }${locked ? `, ${t("Locked by policy")}` : ""}`
            }}
            heldLabel={t("Granted")}
            notHeldLabel={t("Not granted")}
            onChange={(rowRoleId, colModuleKey, capabilityId, next) => {
              // The kit hands back (row, column, capability) — after the
              // transpose that is (role, module, right), not (module, role).
              const right = KIT_TO_RIGHT[capabilityId as PermissionRight]
              const sheet = sheets?.find((s) => s.role.id === rowRoleId)
              const row = sheet?.perms.modules.find((m) => m.key === colModuleKey)
              // A box the module does not offer decides nothing, so a press on
              // one records nothing.
              if (row && !offered(row, right)) return
              setDraft((prev) => {
                if (!prev) return prev
                const cur = prev[rowRoleId]?.[colModuleKey] ?? {
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
                return { ...prev, [rowRoleId]: { ...prev[rowRoleId], [colModuleKey]: val } }
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
