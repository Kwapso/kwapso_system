"use client"

// THE SCOPE PICKER — a fresh conversation's first state. Client ruling,
// 15 Sep 2026: "when you open it, use your design D so that every time you
// open a new conversation, it opens a scope picker first." Design D's own
// wording, carried over from the artifact this feature was built from
// (https://claude.ai/code/artifact/8d4b7c6e-639d-4776-a3d9-337ae7e957d5,
// "Section 1 · Your pick"): the title and the three rows below are the exact
// copy drawn there, nothing paraphrased to fit this file.
//
// DRAWN INSIDE THE TAB'S OWN BODY, NOT A DIALOG — Laws R59/R67. A picker is
// ordinarily a slide-in (R59), but this one has nowhere to slide OVER: it IS
// the fresh tab's own body, the exact surface the ordinary transcript and
// composer take over the moment a row below is pressed. `agent-panel.tsx`
// renders this in place of the ordinary conversation for a tab whose `scope`
// is still `null` — see that file.

import * as React from "react"

import { BookBookmark, Database, Globe } from "@shared/ui/foundations/icons"

import { useT } from "@shared/web/language"
import type { AgentTabScope } from "@/lib/agent-conversation-tabs"

function PickerRow({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent flex items-start gap-3 rounded-[var(--radius)] p-2.5 text-left"
    >
      <span className="text-muted-foreground mt-0.5" aria-hidden>
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">{sub}</span>
      </span>
    </button>
  )
}

export function AgentScopePicker({
  hasRecord,
  onPick,
}: {
  /** Whether there IS a record to scope to right now — the task's own rule:
   * "if 'This record' has no current record, hide that option." A collection
   * screen, the team overview, or nothing at all (narrow viewport, where the
   * app's own workspace-tab tracking is switched off — `workspace-tabs.ts`
   * decision 5) all read `false` here, which is the honest, conservative
   * side to be wrong on: the option simply does not offer something it
   * cannot deliver. */
  hasRecord: boolean
  onPick: (scope: AgentTabScope) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-6">
      <div className="bg-surface-panel flex w-full max-w-sm flex-col gap-0.5 rounded-[var(--radius)] p-2">
        <p className="px-2 pt-1 pb-2 text-sm font-semibold">{t("What should this conversation read?")}</p>
        {hasRecord && (
          <PickerRow
            icon={<Database className="size-[18px]" />}
            label={t("This record")}
            sub={t("Picks up the record you're viewing")}
            onClick={() => onPick("record")}
          />
        )}
        <PickerRow
          icon={<BookBookmark className="size-[18px]" />}
          label={t("Knowledge base")}
          sub={t("Articles and indexed files")}
          onClick={() => onPick("knowledge")}
        />
        <PickerRow
          icon={<Globe className="size-[18px]" />}
          label={t("Everything (today's default)")}
          sub={t("All six sources, untick later")}
          onClick={() => onPick("everything")}
        />
      </div>
    </div>
  )
}
