"use client"

// THE ROLE PANEL — one role's overview, in a slide-in, with the role's own two
// acts at the top of it.
//
// ── THE CLIENT'S OWN WORDS, 2026-09-09 ──────────────────────────────────────
//
//   "when iclick in role, overview in slide in. there on top, titple and on the
//    righ edit and on/off button. rmeove this buttons from th elist view."
//
// So: press a role on the matrix and its overview arrives from the side. Its
// TITLE on the left of the panel's head, EDIT and ON/OFF on the right of it,
// and those two controls come OFF the matrix row. The row is for reading; this
// panel is for acting.
//
// ── AND THE RULING IT LOOKS LIKE IT CONTRADICTS, WHICH IT DOES NOT ──────────
//
// She ruled the opposite-sounding thing the same day and it is the reason the
// matrix exists at all: "I don't know why this redirects to another page.
// Everything should be in different containers, like the different sections and
// member roles on this single page, not taken anywhere else." A slide-in is not
// a page. Nothing is fetched, no URL changes, the shell does not unmount and
// the matrix is still there behind it — which is exactly the distinction
// `EdgePanel`'s own header draws between a rail and a route. The ruling that
// killed `role-detail.tsx` was about NAVIGATION, and this panel navigates
// nowhere.
//
// THE ONE THING THAT WOULD BREAK IT is the panel becoming a second place to
// read the grid. The matrix IS the overview — "All the roles together, I want
// to have an overview" — so this panel deliberately holds NO per-area rights
// grid, no run of S · C · E · D, nothing you could compare two roles with. It
// holds what the matrix cannot say: the description, how many people hold it,
// whether it is switched on, and TWO DERIVED NUMBERS that summarise the band
// rather than restate it. A reader who wants the detail is one press from the
// row it came from.
//
// ── WHY `Sheet` AND NOT `EdgePanel`, WHICH IS ALSO A SLIDE-IN ───────────────
//
// The app has two, and they are not interchangeable. `EdgePanel` is the
// NON-MODAL docked rail — the record's activity, the assistant's column —
// chosen by the client on 2026-09-07 precisely because "the record stays live
// beside it" and you can keep working with it open. `Sheet` is the kit's one
// DRAWER: modal, scrimmed, focus-trapped, 420 on the inline end, and below
// 45rem it becomes the bottom sheet her 2026-09-04 rule asks for.
//
// A role's overview is a drawer. You open it, you read it or you act on it, and
// you close it — there is no work to carry on with underneath, and the two
// controls in its head are commits. It is also the shape R59 steers toward:
// the law's own words are that a surface which collects "presents as the kit's
// `Sheet`", the exact component the app's ~35 other forms already reach through
// `FormShellDialog`. This panel satisfies R59 by construction — it mounts
// `<SheetContent>` and never `<DialogContent>`, so the centred-overlay census
// in `web/test/rules.test.ts` never sees it and it needs no exemption line. The
// warning that hangs off its on/off control stays an `AlertDialog`, centred,
// which is the other half of the same law.
//
// ── WHAT THE TWO CONTROLS DO, AND WHERE THEY GO ─────────────────────────────
//
// Neither acts here. `onEdit` opens the role form (a `Sheet` of its own, via
// `FormShellDialog`) and `onToggleActive` opens the deactivate warning (an
// `AlertDialog`) — both already existed on the matrix row and both are
// unchanged; only where you reach them moved. The panel CLOSES as it hands
// over, so two drawers are never open at once: `SheetContent` and
// `FormShellDialog`'s own both paint at z 55, and a stack of two identical
// layers is the paint-order bug `overDialog` was minted for. One drawer at a
// time is the cheaper answer than a second layer.
//
// ICON-ONLY, per the client's 2026-08-31 ruling ("edit, only the pencil icon"),
// with the words carried as the accessible name and the tooltip — the same
// shape `AddButton` uses. And NEITHER is drawn for the locked Admin role, which
// cannot be renamed or switched off at all, nor for a viewer without
// `member_roles:edit`.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { PencilSimple, Power } from "@shared/ui/foundations/icons"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/ui/components/sheet/sheet"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/components/tooltip/tooltip"

import type { RolePermissions, RightSet, TeamRole } from "@shared/types"
import { useT } from "@shared/web/language"

/** THE TWO NUMBERS THE PANEL ADDS, AND WHY THEY ARE NOT THE GRID AGAIN.
 *
 * The matrix answers "what may this role do HERE" eighty-eight boxes at a time.
 * Neither it nor anything else on the tab answers "how much of the app does
 * this role touch at all", which is the question somebody opening a role
 * actually has — and it is the one sentence that makes Admin's solid band and
 * the Client role's near-empty one comparable without counting boxes.
 *
 * SEES is any right at all: a role holding `create` on an area necessarily
 * holds `read` there (the door grants read alongside any write, and so does the
 * draft in roles-matrix.tsx), so "sees" is the honest word for the outer set.
 * CHANGES is create, edit or delete — the areas where this role can move
 * something rather than only look at it.
 *
 * Both are filtered to the rights the area OFFERS (R36 · `m.rights`), for the
 * same reason the grid never draws an unoffered box filled: a stored `delete`
 * on an area that has no delete is a value the door strips on save, and
 * counting it here would put a number on screen that no switch can explain. */
function summarise(perms: RolePermissions): { total: number; sees: number; changes: number } {
  const WRITES: (keyof RightSet)[] = ["create", "edit", "delete"]
  let sees = 0
  let changes = 0
  for (const m of perms.modules) {
    const held = perms.value[m.key]
    if (!held) continue
    const offered = (r: keyof RightSet) => m.rights.includes(r) && held[r]
    if (offered("read") || WRITES.some(offered)) sees += 1
    if (WRITES.some(offered)) changes += 1
  }
  return { total: perms.modules.length, sees, changes }
}

export function RolePanel({
  role,
  perms,
  canEdit,
  onEdit,
  onToggleActive,
  open,
  onOpenChange,
}: {
  /** The role the matrix row that was pressed belongs to. */
  role: TeamRole | null
  /** That role's sheet, already loaded by the matrix — this panel opens no door
   * of its own (R56: one read per unit). `null` while the grid is still cold,
   * or for a deactivated role, whose sheet the door 404s on purpose. */
  perms: RolePermissions | null
  /** `member_roles:edit`, and never the locked Admin role — whether the two
   * controls in the head are drawn at all. */
  canEdit: boolean
  onEdit: (role: TeamRole) => void
  onToggleActive: (role: TeamRole) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  if (!role) return null

  const acts = canEdit && !role.isDefault
  const summary = perms ? summarise(perms) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" closeLabel={t("Close")}>
        {/* TITLE LEFT, THE TWO ACTS RIGHT — her layout, verbatim: "there on
            top, titple and on the righ edit and on/off button."

            The row sits INSIDE `SheetHeader`, which already spends
            `pe-[var(--space-9)]` reserving the top-inline-end corner for the
            drawer's own close chip. So these two never collide with it: the
            chip is the drawer's exit and stays where every other drawer in the
            app puts it, and these are the ROLE's controls, one step in from it.
            Inventing a third arrangement for a head the kit already draws would
            be the "third slide-in" this panel exists not to be. */}
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="min-w-0 truncate">{role.title}</SheetTitle>
            {acts && (
              <span className="flex shrink-0 items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t("Edit this role")} — ${role.title}`}
                      onClick={() => onEdit(role)}
                    >
                      <PencilSimple className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("Edit this role")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${
                        role.active ? t("Deactivate") : t("Activate")
                      } — ${role.title}`}
                      onClick={() => onToggleActive(role)}
                    >
                      <Power className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {role.active ? t("Deactivate") : t("Activate")}
                  </TooltipContent>
                </Tooltip>
              </span>
            )}
          </div>
          {/* ALWAYS DRAWN, even with nothing to say. It is the drawer's
              `aria-describedby` target as well as its subtitle, and a role with
              no description is the ordinary case rather than an error. */}
          <SheetDescription>
            {role.description?.trim() ? role.description : t("No description yet.")}
          </SheetDescription>
        </SheetHeader>

        {/* THE OVERVIEW — four facts, none of them the grid. See this file's
            header for the line this stays on the right side of. */}
        <div className="flex flex-col gap-3 px-[var(--space-6)] py-[var(--space-4h)]">
          <p className="text-sm">
            {/* A WHOLE SENTENCE WITH A HOLE IN IT, never a number glued to a
                translated noun (R28) — the same two keys the matrix's own row
                meta already uses, so the count reads identically in both
                places. */}
            {role.memberCount === 1
              ? t("{count} person", { count: String(role.memberCount) })
              : t("{count} people", { count: String(role.memberCount) })}
          </p>

          {!role.active ? (
            <p className="text-muted-foreground text-sm">{t("Deactivated")}</p>
          ) : perms === null ? (
            <Skeleton variant="list" lines={2} />
          ) : summary ? (
            <>
              <p className="text-muted-foreground text-sm">
                {t("Sees {count} of {total} areas", {
                  count: String(summary.sees),
                  total: String(summary.total),
                })}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("Can change {count} of {total} areas", {
                  count: String(summary.changes),
                  total: String(summary.total),
                })}
              </p>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
