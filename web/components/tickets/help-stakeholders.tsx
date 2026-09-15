"use client"

// Stakeholders on a ticket — the people kept in the loop: the raiser, your team's
// admins, anyone @mentioned, plus people manually added. ADD-ONLY by design — you
// can pull a teammate in, but no one is ever removed (and there's no assignee).
// Gated by help:read (seeing a ticket lets you involve a teammate). Library primitives.

import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/components/avatar/avatar"
import { Badge } from "@shared/ui/components/badge/badge"
import { toast } from "@shared/ui/components/sonner/sonner"

import type { HelpStakeholder } from "@shared/types"
import type { PickablePerson } from "@/lib/members"
import { ApiFailure } from "@/lib/api"
import { letterMark } from "@/lib/identity"
import { useLanguage } from "@shared/web/language"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { StaffPillPicker } from "@shared/web/staff-pill-picker"

const ORIGIN_LABEL: Record<HelpStakeholder["origin"], string> = {
  raiser: "Raiser",
  admin: "Admin",
  mentioned: "Mentioned",
  added: "Added",
}

export function HelpStakeholders({
  stakeholders,
  members,
  canAdd,
  onAdd,
}: {
  stakeholders: HelpStakeholder[]
  /** Our own staff only — the caller narrows through the one people seam, so a
   * client contact can never be offered here (web/lib/members.ts). */
  members: PickablePerson[]
  canAdd: boolean
  onAdd: (userId: string) => Promise<void>
}) {
  const { t, lang } = useLanguage()
  const [busy, setBusy] = React.useState(false)

  const existing = new Set(stakeholders.map((s) => s.userId))
  const addable = members.filter((m) => !existing.has(m.id))

  async function add(userId: string) {
    setBusy(true)
    try {
      await onAdd(userId)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't add them to the ticket."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t("Everyone kept in the loop on this ticket, the person who raised it, your admins, and anyone mentioned.")}</p>

      {stakeholders.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("Just the person who raised it and your admins so far.")}</p>
      ) : (
        <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">
          {stakeholders.map((s) => (
            <li
              key={s.userId}
              className="flex flex-wrap items-center gap-2 px-3 py-2"
            >
              <Avatar className="size-8">
                {s.imageUrl && <AvatarImage src={s.imageUrl} alt="" />}
                <AvatarFallback>{letterMark(s.name || s.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 basis-[12rem]">
                {/* R54. `origin: "raiser"` is the one value here that can be a client
                    contact — every other way onto this list (an admin, a mention, a
                    colleague added by hand) is one of ours. A contact keeps their
                    name; we are named by our first. */}
                <p className="truncate text-sm font-medium">
                  {(s.origin === "raiser" ? s.name : staffNameFromSnapshot(s.name)) || s.email}
                </p>
                <p className="text-muted-foreground truncate text-xs">{s.email}</p>
              </div>
              <Badge variant="secondary" className="text-badge">
                {ORIGIN_LABEL[s.origin]}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {canAdd && addable.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">{t("Pick someone to keep in the loop")}</p>
          {/* THE HORIZONTAL CHOICES, NOT THE DROPDOWN. A click adds straight
              away — no separate confirm — and the pill it belonged to is gone
              on the next render, folded into the list above with an "Added"
              badge: ADD-ONLY (R54's own neighbour rule), so there is nothing
              here to un-press. `value` stays `[]`: nothing in this row is ever
              "selected" state, only clicked. */}
          <StaffPillPicker
            mode="multi"
            ariaLabel={t("Keep in the loop")}
            people={addable.map((m) => ({ id: m.id, name: m.name, photo: m.photo }))}
            lang={lang}
            value={[]}
            onValueChange={(ids) => {
              const picked = ids[0]
              if (picked) void add(picked)
            }}
            disabled={busy}
          />
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        {t("You can add members, but no one is ever removed.")}
      </p>
    </div>
  )
}
