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
//     kit `capabilities` ← the four rights, R · C · U · D
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
//
// ── THE TOOLBAR, WHICH KILLS IMPORT + EXPORT CSV, 2026-09-15 ───────────────
//
// The client's ruling, 2026-09-15: "Kill import and export for permissions
// settings." The toolbar now draws search (which narrows the matrix rows by
// module name), the "Deactivated" disclosure (moved in from the foot of the
// grid the same day), and the black "+" button to create a new role. Nothing
// else. Import and Export, which moved in on 2026-09-14 when the roles list
// screen was retired, are deleted this same day along with that ruling.
//
// ── THE PINNED BAR, AND ROLES FINALLY GETS A DISCARD, 2026-09-14 ───────────
//
// This grid has staged every switch behind Save since the matrix shipped
// (2026-09-09) with no way to back out short of un-toggling each cell by
// hand — the design lane's own artifact named it outright: "there is no
// Discard control on Roles today." The client, the same session as the
// toolbar ruling below: "We need some kind of hint or flag, very visible,
// probably not at the bottom, that allows me to save or to restart… to not
// save the changes." Her own comparison artifact settled the shape (Option
// A, a band pinned directly under the tab strip) and it shipped as the kit's
// `UnsavedChangesBar` (v1.2.82) — see that file's own header for the
// component itself.
//
// THE BOTTOM SAVE BUTTON IS GONE. It lived under the grid, past the legend,
// invisible on any viewport shorter than the whole matrix — the same
// "probably not at the bottom" complaint the bar exists to answer. `save()`
// is unchanged; only what calls it moved.
//
// DISCARD IS NEW, AND IT IS THE DRAFT'S OWN RESET, NOT A DOOR CALL.
// `discardDraft` rebuilds the same `server` object the reconciliation effect
// already computes from `sheets` — the last-saved value of every active
// role's sheet — and writes it straight back over `draft`, the identical
// shape a fresh load or a server ping already produces. Nothing is sent
// anywhere: discarding a draft that was never saved has no door to call.
//
// THE BAR SITS ABOVE THE TOOLBAR, INSIDE THE SAME COLUMN. `TeamPanel` is the
// container this file already owns end to end (unlike `AppearancePanel`,
// which sits inside the kit's own `SettingsSection` and deliberately stays
// outside its padded box — see that file's header), so the pin rides inside
// `TeamPanel`'s own flow rather than beside it. `ground` is left at
// `UnsavedChangesBar`'s own default (`"bare"`): the `PINNED_TOOLBAR` wrapper
// already paints `--pinned-ground`, resolved off `TeamPanel`'s own paper the
// same way every other pinned row in this app leaves its own fill to the
// wrapper.
//
// ── THE HEADER BECAME A REAL `<ToolbarRow>`, 2026-09-14 ─────────────────────
//
// The bespoke `<div className="flex flex-wrap items-center justify-end gap-2">`
// this section used to draw — Import / Export / the black `+`, no search box —
// is gone. Client, the same day: *"In Team Rules [Roles] at the toolbar with
// search and the add button"*. The row's own five slots (R53) are now genuinely
// the row's:
//
//   search   filters the MATRIX ROWS by module name. The rows are the team's
//            module catalogue (this file's own header above explains why
//            modules are rows and roles are columns since 2026-09-10) — so
//            "search" here narrows WHICH MODULES are on screen, never which
//            roles, because the roles are the columns and a matrix does not
//            hide its own axis.
//   sort     omitted, named in `TOOLBAR_SORT_EXEMPT` (`shared/rules/
//            registry.ts`): the rows are `TEAM_MODULES`'s own fixed order,
//            the order a permission matrix is read in top to bottom, and
//            there is no second, equally valid order for a control to offer.
//   actions  "Deactivated" (moved in from the bottom of this file on
//            2026-09-14 — see below) and the black `+` to create a new role.
//            Import CSV and Export CSV were deleted 2026-09-15 by client
//            ruling: "Kill import and export for permissions settings."
//   empty    `false`, always — see the prop's own comment for why that is
//            the honest answer and not a dodge.
//
// ── "DEACTIVATED" MOVED FROM THE FOOT OF THE GRID INTO THE TOOLBAR ──────────
//
// Client, 2026-09-14: *"In Roles Permission, remove the whole 'Deactivated'
// from the bottom and make it a button in the toolbar, same as we have
// Invites for Members."* So it is now built the same way Invites is built in
// `members-gallery.tsx`: a secondary button, carrying a `formatCount` badge
// (R16) of how many roles are switched off, opening an IN-PLACE disclosure —
// never a new surface — that lists them through the app's one `<List>` seam
// (`shared/web/list-compat.tsx`), the same component Invites' own disclosure
// already uses. Each row carries the reactivate act directly, the way an
// Invites row carries revoke: no second stop through `RolePanel` first. A
// deactivated role's sheet is still frozen and still 404s (unchanged), so
// this list reads straight off `roles`, never off `sheets` — it needs no
// permissions read to draw and is not gated behind the matrix's own load.
//
// ── AMENDED 17 SEP 2026 — "DEACTIVATED" MOVES AGAIN, INTO A REAL FACET ──────
//
// The client's screenshot of exactly this row, verbatim: "The toolbar in
// roles is kind of broken. Go and fix it." Read against the row's own R53
// contract, the fault was structural rather than cosmetic: `sort` was
// omitted (named in `TOOLBAR_SORT_EXEMPT`, deleted this same change — see
// the ruling beside `sortDir` above) and "Deactivated" was an `actions`
// button carrying a facet's own job — narrowing WHICH ROLES' STATUS this
// panel is showing — in the one slot `ToolbarRow` never treats as a facet.
// It is `useFilterBar`'s own `statusPill`/`statusPanel` now (`roleStatusFacets`,
// above), sitting in `filters`/`toolbarPanel` exactly where R53 puts them.
// Nothing below THIS list changed: the disclosure is still the same `<List>`
// of `inactiveRoles`, each row still carries its own one-step reactivate,
// and it is still gated on nothing but `deactivatedOpen` — only WHAT SETS
// that boolean moved, from a button's own `onClick` to the facet's `value`.
// The "3" the old button's `Badge` carried is not lost: it rides
// `FacetOption.count` on the "Deactivated" option itself
// (`shared/web/screen-engine/config.ts`), the same documented field the
// kit's own filter panel already knows how to draw a number beside.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Headline } from "@shared/ui/components/typography/typography"
import { Plus, Power } from "@shared/ui/foundations/icons"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"
import { ToolbarRow } from "@/components/deep-link/screen-bits"
import { UnsavedChangesBar } from "@shared/ui/components/unsaved-changes-bar/unsaved-changes-bar"
import { PINNED_TOOLBAR } from "@shared/web/pinned-chrome"
import { cn } from "@shared/ui/lib/utils"
import { List } from "@shared/web/list-compat"
import { Icon, type IconName } from "@shared/web/screen-engine/icon"
import { CONCEPT_ICON } from "@/lib/pages"
import { useFilterBar } from "@shared/web/screen-engine/filter-bar"
import type { FilterFacet } from "@shared/web/screen-engine/config"
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
import { useLanguage } from "@shared/web/language"
import { sortedOptions } from "@shared/web/sorted-options"

/** SERVER ⇄ KIT rights vocabulary — lifted unchanged from the per-role screen
 * this replaces. The app's sheet says read/create/update/delete; the kit says
 * see/create/edit/delete (its own id is vendored and unchanged — R39). Three of
 * the four agree (the kit took `create` at v1.2.24, the word every enforcing
 * surface here already uses); `see`/`read` is the one that still differs and
 * deliberately so — the kit's id is the word in front of a reader, `read` is
 * the word the gate is written in. `update`/`edit` differs for the same reason,
 * since the client's 10 Sep 2026 ruling standardized the app's own fourth verb
 * to `update`. One mapping, both directions, so neither side ever learns the
 * other's words. */
const RIGHT_TO_KIT = { read: "see", create: "create", update: "edit", delete: "delete" } as const
const KIT_TO_RIGHT: Record<PermissionRight, keyof RightSet> = {
  see: "read",
  create: "create",
  edit: "update",
  delete: "delete",
}

/** EVERY MODULE'S ROW WEARS THE SAME GLYPH THE RAIL DRAWS FOR IT — the
 * client's ruling, 17 Sep 2026: "in Module Name, add the icon of the
 * module." `CONCEPT_ICON` (`web/lib/pages.ts`) is the app's one icon
 * vocabulary, keyed by CONCEPT rather than by permission module — "roles"
 * for the Roles tab, "accounts" for the customer spine — so this is the one
 * mapping from a `TEAM_MODULES` key (`shared/team-modules.ts`) to the concept
 * that already wears a glyph everywhere else the module surfaces (the rail,
 * `settings-screen.tsx`'s own Modules wall, a tab strip). It is not derived
 * off `TEAM_SECTIONS`'s own `module` field, on purpose: several sections share
 * one permission module (Stories/Sprints/Waves/Tasks/Time are all `work`) and
 * several modules never reached the rail at all (`agent`, `commercials`,
 * `google`, `google_mail`, every "everyone else's…" sight-switch) — a derived
 * lookup would answer some rows and guess at the rest, and a guess is exactly
 * what R36 exists to stop for a box on this same grid. Fixed here instead,
 * reasoned per row, so a new module is a line added rather than a silent
 * fallback nobody reviewed.
 *
 * A module absent from this map falls back to `CONCEPT_ICON.settings` (the
 * gear) — the same fallback `settings-screen.tsx`'s own Modules wall reaches
 * for when a segment the vocabulary has never heard of shows up, and it is
 * the honest answer for the handful of rows with no glyph of their own: the
 * AI agent's switch, the money door (`commercials` — its own rate-card icon
 * was retired with the rate cards, 10 Sep 2026), and the two Google rows,
 * none of which is a sidebar destination a reader has already learned a mark
 * for. */
const MODULE_ICON_CONCEPT: Partial<Record<string, keyof typeof CONCEPT_ICON>> = {
  teams: "team",
  team_members: "members",
  member_roles: "roles",
  accounts: "accounts",
  contacts: "contacts",
  portal_users: "portal",
  help: "tickets",
  knowledge: "knowledge",
  selectable_data: "entries",
  processes: "processes",
  deliverables: "deliverables",
  // THE WORK ENGINE'S OWN SWITCH — one module behind Stories, Sprints, Waves,
  // Tasks and Work logs (`shared/team-modules.ts`'s own header: "one module
  // covers stories, the sprints they sit in and the time logged against
  // them, because they are one record from a reader's point of view: a piece
  // of work"). Stories is that record's own noun, so its glyph stands for
  // the module here too.
  work: "stories",
  all_tasks: "tasks",
  all_stories: "stories",
  inputs: "inputs",
  all_inputs: "inputs",
  meetings: "meetings",
  brand_assets: "brand",
  // "WHY WE MEET" — `delivery`'s own label is "Meeting types" and its rail
  // row (`TEAM_SECTIONS`, `web/lib/pages.ts`) already wears `CONCEPT_ICON.
  // purposes`, so the switch that governs it does too.
  delivery: "purposes",
  staff_profiles: "staff",
}

/** `MODULE_ICON_CONCEPT`, resolved all the way to the kit's own glyph name —
 * `<Icon name>` wants the Phosphor spelling (`"briefcase"`), never the
 * concept key (`"accounts"`) that names it in `CONCEPT_ICON`; the fallback
 * lives in exactly one place. */
function moduleIconName(moduleKey: string): IconName {
  return CONCEPT_ICON[MODULE_ICON_CONCEPT[moduleKey] ?? "settings"]
}

/** THE FOUR MARKS ARE FIXED — R · C · U · D — AND THE WORDS ARE TRANSLATED.
 *
 * The kit derives a slot's letter from the first character of its label unless a
 * capability names its own `initial`, and its doc says exactly why the prop
 * exists: "a language whose four words share an initial needs to choose its own
 * four marks". THE PAIR THAT COLLIDES MOVED, IT DID NOT DISAPPEAR. Spanish is
 * Ver · Crear · Editar · Eliminar and Catalan is Veure · Crear · Editar ·
 * Eliminar — Editar and Eliminar collided on E in both, before the 14 Sep 2026
 * ruling that renamed the app's fourth verb, identifier and all, to `update`
 * (Actualizar/Actualitzar). That closed the Spanish/Catalan collision and
 * opened a German one: Lesen · Erstellen · Aktualisieren · Löschen puts Lesen
 * and Löschen on the same L. Whichever language it is this build, a fixed mark
 * still means the four letters are never derived from whatever word a reader's
 * own language happens to put there.
 *
 * So the marks are fixed rather than derived, and they do not move between
 * languages; the LEGEND under the grid is what carries the translated word for
 * each. A fixed mark plus a translated key is the shape the kit's own `initial`
 * prop is there to allow. */
function capabilities(t: (s: string) => string): PermissionCapability[] {
  return [
    // READ, NOT "SEE" — the client's ruling, 11 Sep 2026, and the glossary was
    // already on her side: `permission` is defined as "A single thing a role can
    // do: READ, create, update, or delete." Three of the four columns already
    // said the glossary's word and this one did not, so the screen that TEACHES
    // people what a right is was the one screen using a synonym for it. The
    // kit's own capability id stays `see` (it is vendored and hash-pinned, and
    // the app maps `RIGHT_TO_KIT` either way); only the WORD a person reads
    // moves. Owed upstream: the kit's default label for this capability says
    // "See" too.
    { id: "see", label: t("Read"), initial: "R" },
    { id: "create", label: t("Create"), initial: "C" },
    // UPDATE, NOT "EDIT" — the client's ruling, 14 Sep 2026: "for permissions,
    // rename edit to update (this way we have the full CRUD concept)". Asked
    // directly whether the rename should reach the identifier or stop at the
    // label, the owner chose the full rename: `RightSet.edit` became
    // `RightSet.update` (shared/types.ts), every `requireRight`/`TOOL_GATES`
    // pair that named it, and the `can_edit` column in every team's own
    // database (migration 0086). Only `id` here STAYS THE KIT'S OWN `edit`
    // (vendored, hash-pinned, R39 — `RIGHT_TO_KIT` maps it either way); every
    // other spelling in this app now says `update`. Owed upstream: the kit's
    // default label for this capability still says "Edit" too (same debt as
    // "See" above, same fix — a kit release, not a local patch).
    //
    // "EDIT" DOES NOT JOIN THE R34 DENY-LIST. It competes with nothing here:
    // the word is ordinary, correctly-used English on dozens of unrelated
    // sentences — the pencil-icon action on every record screen ("Edit"),
    // "Edit name and logo", "Edit this role" two files over in
    // `role-panel.tsx` — none of which mean this permission column, all of
    // which mean "open this one record and change it". R34 is deliberately
    // narrow: a word earns a line only when, in this app, it can mean nothing
    // else — the way "teammate" could only ever mean Member. "Edit" fails that
    // test on its face, and banning it would need a GLOSSARY_SYNONYM_OK line
    // for nearly every one of those sentences, which is the shape the
    // deny-list exists to avoid, not the shape it exists to hold.
    { id: "edit", label: t("Update"), initial: "U" },
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
  onDirtyChange,
}: {
  teamId: string
  /** The team's roles, already loaded by the tab (one read, two containers). */
  roles: TeamRole[]
  /** True while that read is still in flight — never `roles.length === 0`
   * alone, which reads exactly like a genuinely empty collection. */
  rolesLoading: boolean
  /** `member_roles:create` — whether the quiet "New role" button is drawn. */
  canCreate: boolean
  /** Told every time this grid's own `dirty` changes, and `false` once more on
   * unmount — the Settings tab strip has no `forceMount`, so switching to
   * another tab unmounts this component outright and a staged draft would
   * vanish with no Save, no Discard, no warning. `settings-screen.tsx` is the
   * one caller: it keeps a `dirtyTabs` map from this and the matching prop on
   * `AppearancePanel`, and its own tab-change handler asks that map before it
   * ever lets a switch through. Optional because nothing else mounts this
   * grid today. */
  onDirtyChange?: (dirty: boolean) => void
}) {
  const { t, lang } = useLanguage()
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
  /** The role whose panel is open — set by pressing a row head. */
  const [openRole, setOpenRole] = React.useState<TeamRole | null>(null)
  const [confirmOff, setConfirmOff] = React.useState<TeamRole | null>(null)
  const [busyActive, setBusyActive] = React.useState(false)
  // THE TOOLBAR'S SEARCH BOX — narrows the matrix's ROWS, which are modules
  // (this file's own header explains why modules are rows since 2026-09-10).
  const [query, setQuery] = React.useState("")
  // A→Z OR Z→A ON MODULE NAME — the client's ruling, 17 Sep 2026: "in the
  // toolbar, I want to be able to sort by Module Name." The rows already read
  // top to bottom in `TEAM_MODULES`'s own fixed order (`TOOLBAR_SORT_EXEMPT`'s
  // entry for this file argued there was no second order worth offering); her
  // ask is that second order, so the exemption is deleted rather than kept
  // beside a control that answers it. One field, the same shape
  // `members-gallery.tsx`'s own name sort is (`SortControl` draws the
  // direction button beside it unless a caller opts out, and `ToolbarRow`
  // never does), because a module's NAME is the one axis this row can order.
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")
  // ROLES' STATUS, AS A REAL FILTER FACET — the client's diagnosis of the
  // "kind of broken" toolbar, 17 Sep 2026: the "Deactivated 3" pill was an
  // `actions`-slot button wired to a disclosure, standing in for a facet R53
  // has its own dedicated slot for. `useFilterBar` below is the app's one
  // seam for a facet (search → FILTERS → sort → view → actions); its `value`
  // is this file's own `statusFilter.status`, empty string reading "Active"
  // (the grid itself — deactivated roles have no column, per this file's own
  // header) and `"deactivated"` reading the disclosure list below, the exact
  // list this toggle already drew, now opened by the facet instead of a bare
  // button.
  const [statusFilter, setStatusFilter] = React.useState<Record<string, string>>({})
  const deactivatedOpen = statusFilter.status === "deactivated"

  // ACTIVE ROLES ONLY. A deactivated role's permissions are frozen and the door
  // 404s them (the same rule the per-role screen kept) — and a row of dashes for
  // a role nobody can hold would be a column of noise across twenty-two modules.
  const activeRoles = React.useMemo(() => roles.filter((r) => r.active), [roles])
  const roleIds = activeRoles.map((r) => r.id).join(",")
  const inactiveRoles = React.useMemo(() => roles.filter((r) => !r.active), [roles])

  // THE STATUS FACET'S OWN OPTIONS — "Active"/"Deactivated", the roles'
  // status. The count rides `FacetOption.count` (`shared/web/screen-engine/
  // config.ts`) — a real, documented field the kit already draws a number
  // beside (`filter-bar.tsx`), so the "3" the old button carried is not lost,
  // only moved to the option it now describes rather than to a whole pill
  // that used to name only one of the two states.
  const roleStatusFacets: FilterFacet[] = [
    {
      field: "status",
      label: t("Status"),
      control: "select",
      options: [
        { value: "active", label: t("Active") },
        { value: "deactivated", label: t("Deactivated"), count: inactiveRoles.length },
      ],
    },
  ]
  const { pill: statusPill, panel: statusPanel } = useFilterBar({
    facets: roleStatusFacets,
    values: statusFilter,
    // No facet here declares its own `options`-free derivation, so `data` is
    // never actually read for the distinct-values path — handed over anyway
    // because the hook is generic over it, the same way every other call
    // site in the app hands over its own collection.
    data: roles,
    onChange: (field, value) =>
      setStatusFilter((prev) => {
        const next = { ...prev }
        if (value === "") delete next[field]
        else next[field] = value
        return next
      }),
    onClearFacets: () => setStatusFilter({}),
  })

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

  // REPORT UPWARD, AND `false` ON THE WAY OUT — see the prop's own doc. The
  // cleanup fires both on every re-run (harmless: the caller's next line is
  // `onDirtyChange(dirty)` again) and on unmount, which is the one that
  // matters — the moment the Settings tab strip throws this grid away, its
  // caller's `dirtyTabs` entry is corrected to match rather than lingering
  // stale.
  React.useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  // THE ROLES THAT CANNOT BE CHANGED, as the kit wants them: `locked` is a fact
  // about a COLLECTION — "which roles' cells are fixed here" — and it is the
  // same answer on all twenty-two, because what is locked is the Admin ROLE
  // itself. One list, computed once, handed to every module row.
  const lockedRoleIds = (sheets ?? []).filter((s) => s.perms.isDefault).map((s) => s.role.id)

  // ONE VIEWER, ONE ANSWER. Every sheet carries the same `canUpdate` (it is a
  // fact about the viewer, not about the role), so the grid is editable when the
  // viewer may edit roles at all; the Admin row is locked row-by-row above.
  const canSave = sheets != null && sheets.length > 0 && sheets[0].perms.canUpdate

  // THE TOOLBAR'S SEARCH, APPLIED HERE — narrows the ROW list before it ever
  // reaches the kit, the same "search first" order every collection screen in
  // the app applies. Matched on the module's own translated label, which is
  // the one word a reader is typing against.
  const q = query.trim().toLowerCase()

  // THE MODULES, WHICH ARE THE KIT'S `modules` AND ARE THE ROWS since
  // 2026-09-10. They come off the first sheet: every role's sheet carries the same
  // module list in the same order, because the server builds it from the one
  // shared TEAM_MODULES (shared/team-modules.ts). Taking it from a sheet rather
  // than importing the catalogue keeps the labels the door's own, which is where
  // the translated word lives — and now keeps `rights` the door's own too.
  //
  // A→Z BY DEFAULT, Z→A ON `sortDir` — the toolbar's own sort control, below.
  // `sortedOptions` is always ascending (locale-aware — see its own header),
  // so descending is that same order read backwards rather than a second
  // comparator: stable, and the search filter still narrows the SAME list
  // either way, applied after the order the same way every collection in the
  // app searches first and orders the result (see the comment on `q` above).
  const orderedModules = (() => {
    const ascending = sortedOptions(sheets?.[0]?.perms.modules ?? [], lang, (m) => m.label)
    return sortDir === "desc" ? [...ascending].reverse() : ascending
  })()
  const moduleColumns =
    sheets && draft
      ? orderedModules
          .filter((m) => !q || m.label.toLowerCase().includes(q))
          .map((m) => ({
            id: m.key,
            // THE MODULE'S OWN ICON, BEFORE THE NAME — client, 17 Sep 2026:
            // "in Module Name, add the icon of the module." `moduleIconName`
            // (this file's header) resolves the module key through the same
            // `CONCEPT_ICON` vocabulary the rail draws its own glyphs from,
            // so a module wears the identical mark wherever it appears.
            //
            // A NODE COSTS THIS CELL ITS PLAIN-STRING NAME — the kit reads a
            // label with `plain(label, id)` (a string is used as-is, anything
            // else falls back to the id), which is exactly the trade the ROLE
            // column already made turning itself into a button node
            // (2026-09-10, this file's own header). `formatCellLabel` and
            // `formatSlotLabel` below resolve the real word back out of the
            // door's own module catalogue by the id this node now falls back
            // to, the identical repair the role column's own lookup already
            // makes for `roleId`.
            label: (
              <span className="inline-flex min-w-0 items-center gap-2">
                <Icon name={moduleIconName(m.key)} className="size-4 shrink-0 text-ink-tertiary" />
                <span className="truncate">{m.label}</span>
              </span>
            ),
            // R36's fix, and the whole point of this release. `m.rights` is
            // MODULE_OFFERED_RIGHTS as the door sends it, in the app's own
            // vocabulary; the kit speaks in capability ids, so it goes through
            // the one mapping this file already owns.
            rights: m.rights.map((r) => RIGHT_TO_KIT[r]),
            // WHAT EACH ROLE HOLDS HERE, keyed by role id. It is read straight
            // off the draft with NO offered-filter over it: the kit does not
            // count an unoffered capability as held whatever `held` names, so
            // filtering here would be a second opinion about a question the
            // component now answers. See this file's header.
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
          // this possible without forking anything.
          //
          // THE META LINE UNDER THE NAME — "Locked" / "{count} people" — IS
          // GONE, 2026-09-14: *"In Roles Permissions, remove the locked 5
          // people under the role name. We don't want that."* R16 still holds:
          // the member count was never said only here — `RolePanel`'s own
          // overview already carries "{count} people" (see `role-panel.tsx`),
          // which is exactly what this press opens, so the fact is one press
          // away rather than lost. The LOCK state for Admin still has to be
          // conveyed, and it still is — never as a word up here: every cell in
          // a locked role's column is already drawn `cursor-not-allowed` and
          // non-interactive by the kit's own `PermissionRun` (locked cells are
          // a live-looking run nobody can press, with the reason on a hover
          // tooltip), which does not depend on anything this column head says.
          //
          // THE TWO ICON BUTTONS THAT STOOD HERE ARE GONE — "rmeove this buttons
          // from th elist view" (client, 2026-09-09). They are in `RolePanel`'s
          // head, which this press opens. What is left is one control where
          // there were three, and it does the thing she named: it opens the
          // overview.
          //
          // A BARE `<button>`, not a kit `Button`. Every `size` a kit button has
          // fixes a HEIGHT and `whitespace-nowrap`, and the kit's own focus rule
          // is global (tokens.css §8 rings every `:focus-visible` at the
          // control's own radius), so a bare button is rung for free and defines
          // nothing — which is the same reason the app's other forty row-shaped
          // targets are bare buttons too. `text-start` because a button centres
          // its text by default and a row head is prose.
          //
          // THE EYEBROW STYLE, UNIFIED WITH "MODULE" — client, 2026-09-14: "if
          // the column 1 header module is all cap, unify this for the role
          // names." The first column's head is a plain `<th>`, styled
          // `text-micro font-[var(--font-weight-medium)] text-ink-tertiary`
          // by the kit's own `TableHead` (table.tsx) — every OTHER column's
          // head is this button node instead, and a `<button>` is where that
          // styling breaks: browsers ship their own UA default of
          // `text-transform: none` directly on the element, which beats
          // whatever the ancestor `<th>` sets. So the classes are restated
          // here, explicitly, rather than trusted to inherit through a
          // control that will not carry them. UNIFIED AGAIN, 2026-09-17: the
          // client's ruling on the Choices table's Details header ("why all
          // caps? 'Details' pls", generalised from her Roles/Contacts
          // screenshots the same day) dropped `TableHead`'s own uppercase
          // upstream in the kit — this restatement drops it too, for the
          // same "unify with Module" reason it was added.
          label: (
            <button
              type="button"
              onClick={() => setOpenRole(role)}
              aria-label={`${role.title}: ${t("Overview")}`}
              className="cursor-pointer text-start text-micro font-[var(--font-weight-medium)] text-ink-tertiary"
            >
              {/* THE HOVER IS THE KIT'S LINK HOVER AND NOTHING ELSE — `.kw-link`
                  "inherits its ink, underlines on hover, occupies no box"
                  (`button.tsx`, `variant="link"`), at that variant's own
                  offset. No lift and no wash: a row head is a line of text in a
                  table cell, and `motion-hover-lift` is the card's rule. This
                  file writes no duration and no curve (kit RULES §6.1). */}
              <span className="underline-offset-[0.1875rem] hover:underline">{role.title}</span>
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

  /** DISCARD — the bar's own act, new 2026-09-14. Rebuilds the same `server`
   * object the reconciliation effect above already derives from `sheets` (the
   * last-saved value of every active role's sheet) and writes it straight
   * back over `draft`. No door call: there is nothing to send back, only a
   * local value to forget. `serverRef` is updated to match, the same pair the
   * effect keeps in sync, so a realtime ping right after a discard does not
   * read as a second, external change. */
  function discardDraft() {
    if (!sheets) return
    const server: Record<string, PermissionValue> = {}
    for (const s of sheets) server[s.role.id] = s.perms.value
    setDraft(server)
    serverRef.current = { key: roleIds, value: server }
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
  /** The legend's own two words, said a second time in `formatSlotLabel`'s
   * own accessible sentence — one translation, read in both places rather
   * than typed twice. */
  const heldWord = t("Granted")
  const notHeldWord = t("Not granted")

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
      {/* THE HEADING IS `sr-only`, NOT DELETED — client ruling, 2026-09-14:
          "remove members and roles titles too", the same call that took the
          visible "Members" heading next door. Both sections stand inside
          ONE tab panel already named "Team", so that shared name cannot
          tell a reader which stacked collection they are in — see
          `members-gallery.tsx`'s identical note for the fuller argument
          (Automations and Integrations, by contrast, are the only
          collection on their own tab and go fully headless). Keeping a real
          `<Headline as="h2">`, only visually hidden, is the kit's `sr-only`
          route: a screen reader's heading list still reads "Members" then
          "Roles", nothing extra shows on screen, and R67 (containment only,
          no heading required since its 2026-09-11 amendment) is untouched. */}
      <Headline as="h2" size="h4" className="sr-only">
        {t("Roles")}
      </Headline>

      {/* THE PINNED BAR — see this file's header, "THE PINNED BAR, AND ROLES
          FINALLY GETS A DISCARD". `pb-4 -mb-4` is `TeamPanel`'s own `gap-4`
          between this and the toolbar column below, paid INSIDE the pinned
          box and given back — the identical pair every other `PINNED_TOOLBAR`
          call site in this app spends, so the gap is still painted rather
          than a hole the rows scroll through once this bar is stuck (R63,
          the exact bug `STICKY_FOLDER_TABS` was fixed out of). Gated on
          `canSave` too: a viewer who cannot save can never make `dirty` true
          in the first place (every cell is `disabled`), so this is belt and
          braces, not a second gate doing real work. */}
      {canSave && dirty && (
        <div data-slot="toolbar-row-pin" className={cn(PINNED_TOOLBAR, "pb-4 -mb-4")}>
          <UnsavedChangesBar
            dirty={dirty}
            saving={saving}
            message={t("You have unsaved changes")}
            saveLabel={t("Save")}
            savingLabel={t("Saving…")}
            discardLabel={t("Discard")}
            onSave={() => void save()}
            onDiscard={discardDraft}
          />
        </div>
      )}

      {/* R49 — GAPLESS, ON PURPOSE, the same shape members-gallery.tsx wraps
          its own <ToolbarRow> in and for the identical reason: `TeamPanel`
          (team-panel.tsx) is `flex flex-col gap-4`, and the row already pays
          its own trailing margin (`mb-[var(--toolbar-content-gap)]`,
          screen-bits.tsx). Making the row a direct child of `TeamPanel` would
          double-spend that gap on whatever renders after it — exactly what
          `toolbar-content-gap` (R49, web/test/rules.test.ts) caught here.
          The Deactivated disclosure and the grid below keep their OWN
          `gap-4` rhythm between EACH OTHER, in the nested column below,
          which is a second, deeper decision from this one. */}
      <div className="flex min-w-0 flex-col">
      {/* A REAL `<ToolbarRow>`, 2026-09-14 — client: "In Team Rules [Roles]
          at the toolbar with search and the add button." This file's header
          carries the full account of every slot; the short version is in
          each prop's own comment below.

          RESHAPED 17 SEP 2026 — the client's own screenshot of this exact
          row, verbatim: "The toolbar in roles is kind of broken. Go and fix
          it." Two real faults sat behind that one sentence, both diagnosed
          off this file rather than guessed at: `sort` was OMITTED, named in
          `TOOLBAR_SORT_EXEMPT` on the argument that a fixed module catalogue
          has no second order worth offering — an argument her own next
          sentence answers directly ("in the toolbar, I want to be able to
          sort by Module Name"), so the exemption is deleted below rather
          than kept beside a control that now answers it; and "Deactivated"
          sat in `actions`, a secondary BUTTON standing in for what R53's own
          slot set already has a dedicated place for — a FACET. Both are
          fixed at the row's own slots (search → filters → sort → actions),
          never a second wrapper: this is still the one `<ToolbarRow>` this
          panel has ever drawn. */}
      <ToolbarRow
        // R50 — a REAL VALUE, and the honest one, not a dodge. What this row
        // narrows is the team's own MODULE CATALOGUE (`TEAM_MODULES`, read
        // off the first sheet below) — fixed furniture for a live team, never
        // a collection a team empties out. `empty` asks one question, "does
        // the RAW row list, before search, hold zero rows", and for a grid
        // whose rows are the app's own module list the answer is always no.
        empty={false}
        search={
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder={t("Search modules…")}
            className="w-full"
          />
        }
        // THE ROLES' STATUS, AS A FACET — the pill `useFilterBar` builds
        // (`statusPill`, above), between `search` and `sort` exactly where
        // R53 puts it. This is the whole diagnosis of "kind of broken": the
        // old "Deactivated 3" was an `actions`-slot button doing a facet's
        // job in the wrong slot, invisible to this row's own contract the
        // way R53's header describes eight other screens' sort controls
        // sitting inside `search` for the identical reason — a slot a call
        // site can put the wrong thing in is not a rule.
        filters={statusPill}
        toolbarPanel={statusPanel}
        // A→Z / Z→A ON MODULE NAME — client, 17 Sep 2026: "in the toolbar, I
        // want to be able to sort by Module Name." One field, `SortControl`'s
        // own direction button doing the A↔Z half (`ToolbarRow` never passes
        // `showDirection: false`), the identical shape
        // `members-gallery.tsx`'s Name sort already is. The
        // `TOOLBAR_SORT_EXEMPT` entry this file used to carry is deleted in
        // the same change (`shared/rules/registry.ts`) — the reasoned
        // argument it made ("no second, equally valid order over a fixed
        // catalogue") is answered by this control rather than still true
        // beside it.
        sort={{
          options: [{ value: "module", label: t("Module name") }],
          value: "module",
          onValueChange: () => undefined,
          direction: sortDir,
          onDirectionChange: setSortDir,
        }}
        actions={
          <>
            {/* THE BLACK `+`. Not mango, not labelled, and not `AddButton`;
                this file's header has all three reasons and the client's two
                messages that settle them. */}
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
          </>
        }
      />

      {/* THE PANEL'S OWN RHYTHM, KEPT BETWEEN THESE TWO AND NOWHERE ELSE —
          `gap-4`, the same number `TeamPanel` spends on its own children,
          read one level down so it never touches the row above (see the
          R49 comment on the outer wrapper). */}
      <div className="flex min-w-0 flex-col gap-4">

      {/* THE DEACTIVATED ROLES, IN PLACE — the button above reveals them
          beside the grid, the identical shape `invitesOpen` reveals Members'
          pending invites in. It reads off `roles` directly rather than
          `sheets`, so it needs no permissions read and is not gated behind
          the matrix's own load: a deactivated role's sheet is 404'd by
          design (unchanged), and this list never asks for one. */}
      {deactivatedOpen && (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-micro uppercase">
            {t("Deactivated roles")}
          </h3>
          {/* R67/C12 — THE BOX IS THE LIST'S, IN EVERY BRANCH, NOT JUST THE
              POPULATED ONE. This used to fork: a bare `<p>` on the page ground
              when `inactiveRoles` was empty, and only the populated branch
              wrapped in `bg-card`. A team with no deactivated roles is the
              ordinary state (Smoke team included), so that was the branch a
              QA walk actually saw on staging — "the DEACTIVATED ROLES
              disclosure text sits on bare page ground between two cards."
              The kit's own `List` already draws its zero state INSIDE the
              same shell as its rows (`emptyTitle` renders through
              `ScreenRegister` inside the identical `className`/`shell` div,
              shared/ui/components/list/list.tsx), so handing it `empty`
              instead of hand-rolling the branch means there is only ONE
              `bg-card` box, and it covers both states by construction —
              nothing left for a future branch to fall outside of. */}
          <List
            surface="none"
            // OFF-BEIGE, NOT SOFT PAPER — the same reasoning
            // `members-gallery.tsx`'s Invites list carries: this panel is
            // `narrowGround={false}` soft paper below 45rem and a bare kit
            // `<Table>` above it, so a `bg-card` row is the OTHER paper
            // tone either way, never the 1.000 pairing RULES.md §2.6 warns
            // against.
            className="rounded-[var(--radius)] bg-card"
            empty={t("No deactivated roles.")}
            items={inactiveRoles.map((role) => ({
              id: role.id,
              initials: role.title.slice(0, 1).toUpperCase(),
              title: role.title,
              subtitle: role.description?.trim() ? role.description : undefined,
              // REACTIVATE, ON THE ROW ITSELF — the same one-step act
              // `RolePanel`'s own `onToggleActive` already takes for
              // switching a role back ON (no confirm: turning access back
              // on gives nothing away, unlike switching it off). Icon-only,
              // Phosphor's `Power`, the app's one deactivate/reactivate
              // glyph either direction. Drawn only for `member_roles:update`
              // — a control that always fails is worse than no control.
              trailing: canSave ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t("Activate")}: ${role.title}`}
                      disabled={busyActive}
                      onClick={() => void setActive(role, true)}
                    >
                      <Power className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("Activate")}</TooltipContent>
                </Tooltip>
              ) : undefined,
            }))}
          />
        </div>
      )}

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
            // "— LOCKED BY POLICY: <ROLE>" IS GONE FROM THE MODULE NAME —
            // client, 17 Sep 2026, verbatim: "I want you to delete the
            // 'Locked by Policy' in Module Name." UPSTREAM SINCE (kit
            // v1.2.108, same day): the row-level mark this app used to hide
            // with a `[&_[data-slot=…]]:hidden` rule is now RETIRED FROM THE
            // KIT ITSELF — `permission-matrix.tsx`'s own CHANGELOG entry says
            // so in as many words ("the consuming application was already
            // hiding it"), and a locked cell now carries a solid quiet-grey
            // fill of its own instead, with the "Locked by policy: <role>"
            // sentence moved onto that ONE segment's `title`/`Tooltip`
            // (`formatCellLabel`/`formatSlotLabel` below), never restated
            // beside the module name. Nothing left here to hide — a rule
            // targeting a `data-slot` the kit no longer renders would be a
            // no-op wearing the shape of a fix.
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
            // TWO DIFFERENT ZEROS, ONE `emptyTitle`/`emptyDescription` PAIR —
            // the kit itself switches to its own empty register whenever
            // EITHER axis is empty (`shownModules.length === 0 ||
            // shownRoles.length === 0`), which now also fires when the
            // toolbar's search narrows the module list to nothing. A team
            // with no active roles and a search with no matches are not the
            // same fact, so the words said are not the same either.
            emptyTitle={
              activeRoles.length === 0
                ? t("No roles yet.")
                : t("No modules match your search.")
            }
            emptyDescription={
              activeRoles.length === 0
                ? t("A role is a set of rights you can give somebody. Create one to start.")
                : undefined
            }
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
            // label is used as-is and anything else falls back to the id.
            // BOTH AXES ARE NODES NOW: the ROLE's has been a button since
            // 2026-09-10 (this file's own header), and the MODULE's is the
            // icon-plus-name span added 17 Sep 2026 (see `moduleColumns`
            // above) — so `moduleLabel` below arrives as the module's KEY,
            // not its translated word, the identical fallback `roleId`
            // already stood in for. `moduleTitle` resolves it the same way
            // `title` resolves the role: a lookup on the door's own sheet,
            // never a second opinion about what the word is.
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
              const moduleTitle =
                sheets?.[0]?.perms.modules.find((m) => m.key === moduleLabel)?.label ?? moduleLabel
              return `${title} · ${moduleTitle}: ${
                held.length === 0 ? t("nothing") : held.join(", ")
              }${locked ? `, ${t("Locked by policy")}` : ""}${
                notOffered.length === 0 ? "" : ` · ${notOffered.join(", ")}: ${notOfferedWord}`
              }`
            }}
            // ONE SLOT'S OWN ACCESSIBLE NAME — the kit's default builds this
            // from the same two node labels `formatCellLabel` above corrects,
            // so left alone every R/C/U/D checkbox would announce a role's
            // ULID and a module's key instead of the words on screen. Same
            // two lookups, and the same `heldLabel`/`notHeldLabel` words the
            // legend already carries, read here rather than re-typed.
            formatSlotLabel={(moduleLabel, roleId, capabilityLabel, held) => {
              const title = sheets?.find((sheet) => sheet.role.id === roleId)?.role.title ?? roleId
              const moduleTitle =
                sheets?.[0]?.perms.modules.find((m) => m.key === moduleLabel)?.label ?? moduleLabel
              return `${title} · ${moduleTitle} · ${capabilityLabel}: ${
                held ? heldWord : notHeldWord
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
            heldLabel={heldWord}
            notHeldLabel={notHeldWord}
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
                  update: false,
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
              draws exactly that: the four marks R · C · U · D against Read ·
              Create · Update · Delete, then a filled run labelled Granted and a
              hollow one labelled Not granted.

              A SECOND LINE STOOD HERE FOR ONE PASS and was deleted after looking
              at it: "R Read · C Create · U Update · D Delete" in plain text, three
              millimetres under the kit's own legend saying the same four things
              with the real marks beside them. Two legends for one grid is one
              more than the grid has meanings.

              THE SAVE BUTTON THAT USED TO STAND HERE IS GONE, 14 Sep 2026 — it
              is the pinned bar's now; see this file's header, "THE PINNED
              BAR, AND ROLES FINALLY GETS A DISCARD". `save()` is unchanged. */}
        </div>
      )}
      </div>
      </div>

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
          Opened by a column head above — an ACTIVE role only, since a
          deactivated role has no column at this orientation. Reactivating one
          is the toolbar's "Deactivated" disclosure's own row act now
          (2026-09-14), not a press that opens this panel first. It opens NO
          DOOR: the sheet it summarises is the one this grid already read
          (R56 — one read per unit), handed down.

          BOTH HANDOVERS CLOSE THIS PANEL FIRST. `FormShellDialog` is itself a
          `Sheet` and paints on the same z 55 layer, so two open drawers would
          be the paint-order ambiguity `overDialog` exists for; and the confirm
          is an `AlertDialog`, which is a stop — leaving a drawer open behind a
          warning about the very record it is showing is two surfaces asking one
          question. One at a time, both directions. */}
      <RolePanel
        role={openRole}
        perms={openRole ? (sheets?.find((s) => s.role.id === openRole.id)?.perms ?? null) : null}
        canUpdate={canSave}
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
