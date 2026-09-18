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
//
// "EVERYTHING" IS A REAL, CONCRETE CHOICE — NOT A "DEFAULT" PSEUDO-ENTRY.
// Client ruling, 18 Sep 2026, verbatim: "kill this 'todsays default' for
// setting scopo of asistant." This row used to read "Everything (today's
// default)" — the parenthetical is gone; the label is now just "Everything",
// the same shape as the other two rows ("This record", "Knowledge"). Nothing
// about the THIRD row's behaviour changes: it is still one of exactly three
// rows a person picks from, never an auto-inferred entry standing apart from
// the real choices — the ruling's own words draw that line ("the scope is
// what the user picks... with no 'default' pseudo-entry"), and "Everything"
// already was, and remains, an ordinary pick.
//
// THIS ROW'S OWN LABEL NO LONGER BECOMES THE TAB'S TITLE, AS OF kit v1.2.125
// / the SAME-DAY reversal in `web/lib/agent-conversation-tabs.ts`. Until
// today `agent-panel.tsx`'s `handlePickScope` rebuilt this exact string
// ("Everything", "Knowledge", the record's name) and wrote it straight into
// the tab's own `label` — which is what let a tab sit there reading
// "Everything" forever, her third report on this strip. A picker ROW's own
// words are a category; a tab's title is the CONVERSATION's own subject, and
// the two are now genuinely two things: `pickAgentTabScope` no longer takes
// or writes a label at all, and `agent-panel.tsx`'s `handleSend` titles the
// tab off the first message actually sent, the instant it is sent. This
// file's own copy is unaffected either way — the rows still read exactly
// these three words.

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
          label={t("Knowledge")}
          sub={t("Articles and indexed files")}
          onClick={() => onPick("knowledge")}
        />
        <PickerRow
          icon={<Globe className="size-[18px]" />}
          label={t("Everything")}
          sub={t("All six sources, untick later")}
          onClick={() => onPick("everything")}
        />
      </div>
    </div>
  )
}
