"use client"

// ONE SOURCE, AS A CARD — the row the knowledge list actually needs, and the
// one the generic engine (screen-renderer.tsx's `display: "cards"` path)
// cannot draw: a title and a kind used to be the whole card, and a person
// correcting where something is filed or who may use it had to open the
// record to do either. This is a host-composed component rather than a
// recipe (CLAUDE.md's "engine-expressible → a recipe; bespoke → a
// host-composed component") because three of its six facts are editable
// inline and the engine's card has no slot for that at all.
//
// SIX FACTS, IN THE ORDER THE HUB'S BRIEF ASKS FOR THEM: compartment, app,
// sharing, pieces, sightings, last modified. The first three are editable —
// and they are editable through the ONE door that already writes them
// (`content.updateKnowledge`, wired here as `onEditFiling`), never a second
// write path invented for the row. Compartment and sharing share ONE edit
// affordance on purpose: the door writes `account_id`/`compartment` and
// `owner_user_id`/`visible_to_app_id` in the SAME statement (`updateSource`,
// workers/content/src/lib/knowledge.ts), so offering two separate pencils
// would promise two independent writes the door does not have.
//
// APP IS READ-ONLY. `apps` (0073's JSON array, "which apps this concerns")
// has no write door anywhere in the app yet — `SourceInput` never reads it —
// so an edit control here would be a control that always refuses. Flagged to
// the hub rather than guessed at.
//
// THE ONE THING MOST LIKELY TO LOOK BROKEN: a `generated_only` source with
// zero pieces is a CARD, on purpose (findable, never quoted) — see
// `piecesLabel` below. Its exact wording is a placeholder pending a glossary
// decision (the hub's brief asked for one before shipping copy); it renders
// as plain text, never as a warning or an error tone, so it does not read as
// a bug while the words are still provisional.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/components/card/card"
import { PencilSimple } from "@shared/ui/foundations/icons"
import { Icon, type IconName } from "@shared/web/screen-engine/icon"
import { formatRelative, type Translate } from "@shared/web/format"
import { useLanguage } from "@shared/web/language"

import { KNOWLEDGE_KIND_ICON } from "@/components/deep-link/shape"
import type { KnowledgeSource } from "@shared/types"

/** Who may read it, in the caller's own words — the exact three sentences
 * `knowledge-form-dialog.tsx`'s "Who can use it" select already offers, so a
 * card never says something its edit dialog would contradict. */
function sharingLabel(source: KnowledgeSource, t: Translate): string {
  if (source.visibility === "private") return t("Only me")
  if (source.visibility === "app") return t("Only the members on one app")
  return t("Anyone who can read the knowledge base")
}

/** Where it is filed. `accounts` (0073's array) leads when it carries
 * anything; every row does today reads empty (nothing writes it yet — see
 * DATA-MODEL.md), so this falls back to the singular `accountId` the door
 * has always written, which is what keeps this card honest against today's
 * real data instead of showing "filed nowhere" on every row in the base. */
function compartmentLabel(
  source: KnowledgeSource,
  accountNames: Map<string, string>,
  t: Translate
): string {
  const ids = source.accounts.length > 0 ? source.accounts : source.accountId ? [source.accountId] : []
  if (ids.length === 0) return t("The agency")
  if (ids.length === 1) return accountNames.get(ids[0]) ?? t("An account")
  return t("{count} accounts", { count: String(ids.length) })
}

/** What it concerns. No fallback here — unlike the compartment, there is no
 * pre-existing singular column this can read instead (`appId` names what a
 * MIRRORED source is about, rewritten by the sweep on every pass, not a
 * person's filing decision) — so an empty array reads as exactly what it is
 * today: nothing has filed this under an app yet. */
function appLabel(source: KnowledgeSource, t: Translate): string {
  if (source.apps.length === 0) return t("Not filed under an app")
  if (source.apps.length === 1) return t("1 app")
  return t("{count} apps", { count: String(source.apps.length) })
}

/** How many searchable pieces it became — and the one case that is not an
 * error: `generatedOnly` with zero pieces is a CARD (KB-AUDIT.md §4.3), a
 * source that produced nothing beyond the sentence the app wrote for it.
 * Findable, never quoted, and that is by design, so it reads as plain text
 * rather than a warning. */
function piecesLabel(source: KnowledgeSource, t: Translate): string {
  if (source.chunkCount === 0 && source.generatedOnly)
    return t("0 pieces — findable, but the assistant won't quote it")
  if (source.chunkCount === 0) return t("Not indexed yet")
  return t("{count} pieces", { count: String(source.chunkCount) })
}

export function KnowledgeSourceCard({
  source,
  accountNames,
  onOpen,
  onEditFiling,
  canEdit,
}: {
  source: KnowledgeSource
  /** account id → name, the same map the compartment facet already builds
   * (collection-content.tsx) — read here rather than fetched again (R56). */
  accountNames: Map<string, string>
  /** open the record itself — the whole card is the press target, same as
   * every other card in the app (screen-renderer.tsx's own reasoning). */
  onOpen: () => void
  /** open the one dialog that writes compartment + sharing together. */
  onEditFiling: () => void
  canEdit: boolean
}) {
  const { t, lang } = useLanguage()
  return (
    <Card
      variant="raised"
      interactive
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <CardHeader className="flex-row flex-wrap items-center gap-3">
        <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-[var(--radius)]">
          <Icon
            name={(KNOWLEDGE_KIND_ICON[source.kind] ?? "file") as IconName}
            aria-hidden
            className="size-4"
          />
        </span>
        <CardTitle className="min-w-0 basis-[12rem] truncate">
          {source.active ? source.title : t("{title} (not in use)", { title: source.title })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge>{compartmentLabel(source, accountNames, t)}</Badge>
          <Badge variant="secondary">{appLabel(source, t)}</Badge>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("Edit filing")}
              className="ms-auto size-7"
              onClick={(e) => {
                // The card underneath opens the record; this opens the
                // dialog instead, so the two press targets cannot fire
                // together.
                e.stopPropagation()
                onEditFiling()
              }}
            >
              <PencilSimple className="size-3.5" />
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">{sharingLabel(source, t)}</p>
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span>{piecesLabel(source, t)}</span>
          <span>{t("{count} sightings", { count: String(source.sightingsCount) })}</span>
          <span>
            {source.updatedAt || source.createdAt
              ? t("Last edited {when}", {
                  when: formatRelative(source.updatedAt ?? source.createdAt, t, lang),
                })
              : null}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
