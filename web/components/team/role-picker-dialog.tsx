"use client"

// Role-picker dialog — pick one role from the team's roles for a given member.
// Reusable: the Members screen uses it to change a member's role; the Roles
// screen will reuse it later. Library primitives (Sheet + RadioGroup).

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@shared/ui/components/sheet/sheet"
import {
  RadioGroup,
  RadioGroupItem,
} from "@shared/ui/components/radio-group/radio-group"
import { Label } from "@shared/ui/components/label/label"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { toast } from "@shared/ui/components/sonner/sonner"

import type { TeamRole } from "@shared/types"
import { ApiFailure } from "@/lib/api"
import { useT } from "@shared/web/language"

export function RolePickerDialog({
  open,
  onOpenChange,
  roles,
  currentRoleId,
  subjectName,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: TeamRole[]
  /** The role the subject currently holds. When set, it's hidden from the list
   * (shown as static "Current role: …" text) so you can only pick a different one. */
  currentRoleId: string | null
  /** Who the role is for — shown in the description (e.g. a member's name). */
  subjectName: string | null
  onPick: (roleId: string) => Promise<void>
}) {
  const t = useT()
  // No preselection: the current role isn't in the list, so start empty and let
  // the person pick a *different* role.
  const [selected, setSelected] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  // Re-seed (clear) the selection each time the dialog opens for a (new) subject.
  React.useEffect(() => {
    if (open) setSelected(null)
  }, [open, currentRoleId])

  // Hide the member's CURRENT role from the choices — you can only pick a
  // different one. Only filter when we know their current role.
  const currentTitle =
    currentRoleId != null
      ? (roles.find((r) => r.id === currentRoleId)?.title ?? null)
      : null
  const choices =
    currentRoleId != null ? roles.filter((r) => r.id !== currentRoleId) : roles

  async function save() {
    if (!selected) return
    setBusy(true)
    try {
      await onPick(selected)
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof ApiFailure ? err.message : t("Couldn't change the role.")
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      {/* A PICKER IS A FORM, AND THEREFORE A SLIDE-IN. Client ruling,
          2026-09-09, over a screenshot of the "New access token" dialog:
          "This should be a slide-in, like all the other screens. The only
          ones that are overlays are the warnings, such as archive or delete,
          and so on." Law R59; not a style preference, do not revert it.

          WHY A PICKER FALLS ON THE FORM SIDE OF HER LINE, since she named
          neither. Her two buckets are drawn by what the surface DOES: a
          warning asks a yes/no question about something that already exists;
          everything else COLLECTS an answer and commits it. This screen
          collects one — a radio group of roles and a "Save role" button that
          writes. That it collects by choosing rather than by typing is the
          input control's business, not the presentation's, and the app
          already agrees in the one place it had to decide: the record picker
          (`components/records/record-picker.tsx`) has been a `Sheet` since
          before this ruling. Two pickers presenting two ways would be the
          drift the ruling exists to stop.

          The footer is a real `SheetFooter` (there is no <form> here — the
          commit is an onClick — so nothing needed hoisting or a `form=`
          attribute). It pins: `sheet-*` slots are exempt from
          `SheetContent`'s "every other child scrolls" rule, so a team with
          many roles scrolls the radio group and never the Save control. */}
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("Change role")}</SheetTitle>
          <SheetDescription>
            {subjectName
              ? `Pick the role for ${subjectName}.`
              : t("Pick a role.")}
          </SheetDescription>
        </SheetHeader>

        {currentTitle && (
          <p className="text-muted-foreground text-sm">
            {t("Current role:")} <span className="text-foreground font-medium">{currentTitle}</span>
          </p>
        )}

        <RadioGroup
          value={selected ?? undefined}
          onValueChange={setSelected}
          className="gap-2"
        >
          {choices.map((r) => (
            <Label
              key={r.id}
              htmlFor={`role-${r.id}`}
              className="hover:bg-muted/50 flex items-start gap-2 rounded-[var(--radius)] bg-surface-panel p-3 motion-hover"
            >
              <RadioGroupItem
                id={`role-${r.id}`}
                value={r.id}
                className="mt-0.5"
                disabled={busy}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{r.title}</div>
                {r.description && (
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {r.description}
                  </div>
                )}
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">
                {r.memberCount} {t("member")}{r.memberCount === 1 ? "" : "s"}
              </span>
            </Label>
          ))}
        </RadioGroup>

        <SheetFooter>
          <Button
            onClick={() => void save()}
            disabled={busy || !selected}
          >
            {busy ? <Spinner /> : null}
            {busy ? t("Saving…") : t("Save role")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
