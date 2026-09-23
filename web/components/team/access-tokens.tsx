"use client"

// Personal access tokens (Settings) — the human side of the MCP front desk.
// Create a token (pinned to your CURRENT team; the secret is shown ONCE — copy
// it then), see when each was last used, and revoke any. Machines send the
// token as `Authorization: Bearer …` to the /mcp endpoint and act AS you, in
// that team only, capped by your live role.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Input } from "@shared/ui/components/input/input"
import { Field } from "@shared/web/field"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { toast } from "@shared/ui/components/sonner/sonner"
import {
  DialogDescription,
  DialogTitle,
} from "@shared/ui/components/dialog/dialog"
import { Sheet, SheetContent } from "@shared/ui/components/sheet/sheet"
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
import { Prohibit, Copy, ClockCounterClockwise } from "@shared/ui/foundations/icons"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"

import type { McpCall, McpTokenSummary } from "@shared/types"
import { MCP_TOKEN_TTL_DAYS } from "@shared/workers/limits"
import { FormShell, fieldSpacing } from "@shared/web/form-shell"
import { ApiFailure, mcp } from "@/lib/api"
import { formatActivityWhen, formatDate, formatRelative } from "@shared/web/format"
import { formatCount } from "@shared/web/format-count"
import { useCached, useCachedValue, primeCache } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import { AddButton, ToolbarRow } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { LoadMore } from "@/components/records/load-more"
import { cursorKey, listFetch, mcpCallsKey, totalKey } from "@/lib/live-resources"

/** Past its deadline (or missing one — the server treats that as expired too).
 * A token that has run out is not "active": it stops working the same way a
 * revoked one does, so the screen must not keep calling it live. */
function hasExpired(t: McpTokenSummary): boolean {
  return !t.expiresAt || t.expiresAt <= new Date().toISOString()
}

// A ready-to-paste connect prompt for ANY AI (Claude, Gemini, GPT, …) — endpoint,
// the Bearer header, and a Claude-Desktop-style stdio config. Built from the LIVE
// app host so it's correct for staging or production without a hardcoded URL. When
// we hold the real secret (right after create) we embed it; otherwise we leave the
// `kwapso_mcp_YOUR_TOKEN` placeholder for the developer to swap in.
function connectPrompt(token: string): string {
  const origin = typeof window === "undefined" ? "https://kwapso.<workers-subdomain>.workers.dev" : window.location.origin
  const endpoint = `${origin}/mcp`
  return `Connect to my kwapso workspace over MCP (Model Context Protocol).

Endpoint: ${endpoint}
Auth header: Authorization: Bearer ${token}
Protocol: MCP over HTTP. JSON-RPC 2.0 (initialize, tools/list, tools/call)

If your tool runs MCP servers locally over stdio (e.g. Claude Desktop), add this to its config:
{
  "mcpServers": {
    "kwapso": {
      "command": "npx",
      "args": ["mcp-remote", "${endpoint}", "--header", "Authorization: Bearer ${token}"]
    }
  }
}

Then call tools/list to see what I can do. You act as me, in one team, capped by my role:
reads, exports and imports are free; only the assistant tools (agent_chat, agent_confirm,
plan_import, and ask_knowledge when it composes an answer) use the team's assistant credits.`
}

function copyInstructions(token: string, t: (english: string) => string) {
  void navigator.clipboard?.writeText(connectPrompt(token)).then(
    () => toast.success(t("Setup instructions copied. Paste into any AI.")),
    () => toast.error(t("Couldn't copy. Try again."))
  )
}

export function AccessTokensSection({ teamName }: { teamName: string | null }) {
  const { t, lang } = useLanguage()
  const tokensQ = useCached<McpTokenSummary[]>("mcp-tokens", () =>
    mcp.tokens().then((r) => r.tokens)
  )
  const tokens = tokensQ.data ?? []

  const [createOpen, setCreateOpen] = React.useState(false)
  const [label, setLabel] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  // The show-once secret, displayed right after a create (until dismissed).
  const [secret, setSecret] = React.useState<string | null>(null)
  const [revoking, setRevoking] = React.useState<McpTokenSummary | null>(null)
  const [viewingCalls, setViewingCalls] = React.useState<McpTokenSummary | null>(null)

  async function create() {
    if (!label.trim() || busy) return
    setBusy(true)
    try {
      // ONE round trip. The door answers with the list the new token is now on,
      // so this used to be a create followed by a read of what the create knew.
      const r = await mcp.createToken(label.trim())
      setSecret(r.secret)
      setLabel("")
      primeCache("mcp-tokens", r.tokens)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't create the token."))
    } finally {
      setBusy(false)
    }
  }

  async function revoke() {
    if (!revoking || busy) return
    setBusy(true)
    try {
      const { tokens } = await mcp.revokeToken(revoking.id)
      primeCache("mcp-tokens", tokens)
      toast.success(t("Token revoked."))
      setRevoking(null)
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't revoke the token."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="motion-panel-in flex flex-col gap-4">
      {/* THE EYEBROW AND THE SENTENCE ARE GONE — client ruling, 2026-09-11, over
       * a screenshot of this exact section: "i said nothing on white backgorund.
       * remove this text Access tokens / Let an outside tool (an AI agent, a
       * script, an automation) work in your team as you, capped by your role, in
       * the team the token was made for. … remove the text directly on white
       * background."
       *
       * THE FOURTH TIME SHE HAS SAID THIS SENTENCE (Team tab, Integrations,
       * Settings › Modules, here), and this time she is overruling R67's own
       * written exemption rather than reporting a gap in it: that law explicitly
       * declared PROSE "deliberately not content" because "a sentence directly
       * under a heading is part of the title block". She has looked at that
       * decision and rejected it, so the LAW moved with this screen — R67
       * amendment 4, and `web/test/sections-stand-on-paper.test.ts` carries it.
       *
       * DELETED RATHER THAN BOXED, which is her own instruction and is the right
       * one here: the register below already titles the section ("No tokens
       * yet.") and already carries the one first-add, so the eyebrow and the
       * sentence were a SECOND title for one thing, floating on the page.
       * A section titled twice is not fixed by giving the spare title a box.
       *
       * WHAT THIS COSTS, stated rather than discovered later: nothing on screen
       * now says what a token IS before you make one. If she wants that sentence
       * back it belongs in the register's own `description`, on the page ground
       * (R103), the same shape the Google card beside it uses. */}
      {/* PLAIN, AS OF 23 SEP 2026. Aurora: "the whole settings module does
       * not have the mibnimal aspect! Make minimal the whole app, not only
       * tickets anymore." This box used to paint `bg-surface-panel` behind
       * the create row, the error, the skeleton and the rows together — the
       * OLD default this ruling took off every other section. Read on its
       * own merits today rather than on the paragraph that used to justify
       * it: this is a plain row list — the create row and each token row
       * already separate with their own inset `shadow-[var(--hairline-
       * under)]` hairline, the identical construction R80 ("rows are a
       * list, never a banded table. No inner card around a list") already
       * names for every other list in the app — and it is none of
       * `PAPER_ON_PURPOSE`'s five things (not a conversation card, an empty
       * or error state, a tile, a well, or a not-a-section). R103's own
       * amendment already took the zero state out to the page ground below;
       * this takes the box off the rest of it for the same reason. */}
      {tokensQ.data !== undefined && !tokensQ.error && tokens.length === 0 ? (
        // The kit's register (27.21) with the one act, on the page ground
        // rather than inside a panel's paper (R103) — owner ruling
        // 2026-09-07, amended 22 Sep 2026.
        <CollectionEmptyState title={t("No tokens yet.")} onCreate={() => setCreateOpen(true)} />
      ) : (
      <div className="flex flex-col">
        {/* THE CREATE BUTTON CAME INSIDE THE BOX WITH THE HEADING'S REMOVAL —
         * 2026-09-11. It used to ride the header row opposite the eyebrow, and
         * R67 let it stand on the page because a heading row is a title block
         * and a lone control is an act. With the eyebrow gone it would have been
         * a `+` floating alone over the page, which is the shape she
         * has now objected to four times; so it takes the list's own top row,
         * with the same inset hairline every other row in this list carries.
         *
         * R50, ONE LAYER DOWN — client ruling, 2026-09-10, over a screenshot of
         * this same section: "in settings the acces tokens with the plus and no
         * tokens yet?? makes no sense, duplicated. leave only the No tokens yet."
         * The register below already carries the one first-add, so while there
         * are no tokens this row draws NOTHING — `AddButton` returns null on
         * `empty`, and the row goes with it rather than leaving an empty band of
         * padding above the zero. The same sentence `<ToolbarRow>` has answered
         * since 7 Sep, asked of the button itself, because a create button that
         * is not in a toolbar was outside R50's two censuses by construction. */}
        {tokens.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2 p-3 shadow-[var(--hairline-under)]">
            <AddButton
              label={t("New token")}
              onClick={() => setCreateOpen(true)}
              empty={tokens.length === 0}
            />
          </div>
        )}
        {tokensQ.error ? (
          <div className="p-4">
            <ShapeStateBody
              shape="recordChrome"
              state="error"
              copy={{ errorTitle: t("Couldn't load your tokens.") }}
              action={
                <Button variant="secondary" onClick={() => tokensQ.refresh()}>
                  {t("Try again")}
                </Button>
              }
            />
          </div>
        ) : tokensQ.data === undefined ? (
          <div className="p-4">
            <Skeleton variant="list" lines={2} />
          </div>
        ) : (
          tokens.map((token) => (
            <div
              key={token.id}
              // A row rule inside one panel, as an inset hairline rather than a
              // border (kit §2.7 — web/test/kit-conformance.test.ts). One list,
              // one kind of row, so a paper step would be saying they differ.
              className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3 text-sm shadow-[var(--hairline-under)] last:shadow-none"
            >
              <span className="font-medium">{token.label}</span>
              {token.revokedAt ? (
                <Badge variant="secondary" className="text-muted-foreground text-badge">
                  {t("Revoked")}
                </Badge>
              ) : hasExpired(token) ? (
                <Badge variant="secondary" className="text-muted-foreground text-badge">
                  {t("Expired")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-badge">
                  {t("Active")}
                </Badge>
              )}
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                {/* THREE WHOLE CLAUSES, joined by the middot — not one sentence
                    stitched out of translated pieces. Each says one fact about the
                    token and carries its own hole, so a translator can move the
                    date inside its own clause, which is exactly what German and
                    Japanese need to do. They used to be a JSX text run plus three
                    templates: only the word "Created" was ever in the catalogue,
                    and it was in it as a bare fragment. */}
                {t("Created {when}", { when: formatActivityWhen(token.createdAt) })}
                {token.lastUsedAt
                  ? ` · ${t("last used {when}", { when: formatActivityWhen(token.lastUsedAt) })}`
                  : ` · ${t("never used")}`}
                {token.revokedAt
                  ? ""
                  : hasExpired(token)
                    ? ` · ${t("expired {date}", { date: formatDate(token.expiresAt, lang) })}`
                    : ` · ${t("works until {date}", { date: formatDate(token.expiresAt, lang) })}`}
              </span>
              <div className="flex items-center gap-2">
                {/* Every call this token has made — reads included, not just
                 * writes (the activity feed only ever hears from a write). Shown
                 * for a revoked token too: its trail is exactly what somebody
                 * checks right after revoking one they think leaked. */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewingCalls(token)}
                  className="gap-1"
                  title={t("See this token's calls")}
                >
                  <ClockCounterClockwise className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">{t("Calls")}</span>
                </Button>
                {!token.revokedAt && (
                  <>
                    {/* Copy the connect prompt for any AI. The secret can't be re-read,
                     * so this carries the `kwapso_mcp_YOUR_TOKEN` placeholder to swap.
                     * Label collapses to icon-only below sm (narrow-screen rule).
                     * Nothing to set up with an expired token — make a new one. */}
                    {!hasExpired(token) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyInstructions("kwapso_mcp_YOUR_TOKEN", t)}
                        className="gap-1"
                        title={t("Copy setup instructions for any AI")}
                      >
                        <Copy className="size-3.5" aria-hidden />
                        <span className="hidden sm:inline">{t("Instructions")}</span>
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setRevoking(token)}
                      className="text-destructive hover:text-destructive gap-1"
                    >
                      <Prohibit className="size-3.5" aria-hidden />
                      <span className="hidden sm:inline">{t("Revoke")}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {/* Create — FormShell (Law R4), IN A SLIDE-IN (Law R59).
       *
       * THIS IS THE SCREEN THE CLIENT WAS LOOKING AT. On 2026-09-09, over a
       * screenshot of this exact "New access token" dialog, she ruled:
       * "This should be a slide-in, like all the other screens. The only ones
       * that are overlays are the warnings, such as archive or delete, and so
       * on." It is recorded here, at the point where the presentation is
       * chosen, so that nobody reverts it as a style preference later. It is
       * not a preference and it is not about this one dialog: she was shown
       * one and answered about the class, which is why R59 derives its subject
       * instead of listing this file.
       *
       * THE TWO SURFACES ON THIS SCREEN LAND IN DIFFERENT BUCKETS, and that is
       * the point rather than an inconsistency. Tokens are dangerous material,
       * so the whole screen reads as warning-adjacent and the lazy move is to
       * leave all of it centred. Her line is drawn by what a surface DOES:
       * - THIS one COLLECTS a name and creates a credential → a form → a
       *   drawer. Its second face (the secret, shown once) is the same act
       *   finishing, on the same panel, so it moves with it.
       * - The REVOKE check further down ASKS a yes/no question about something
       *   that already exists → a warning → it stays an `AlertDialog`, centred,
       *   untouched by this change. "such as archive or delete, and so on" is
       *   exactly that control.
       *
       * WHY THIS ONE HAND-BUILDS ITS PANEL INSTEAD OF USING `FormShellDialog`,
       * which is how the app's other ~35 forms became drawers: that wrapper
       * renders a `FormShell` unconditionally, and this dialog has TWO faces
       * sharing one open state — the form, then the one-time secret reveal.
       * The wrapper has nowhere to put the second one. So the Sheet is built
       * here and mirrors the wrapper's own `SheetContent` decisions rather
       * than inventing new ones: `side="right"` (all the app's panels), the
       * same width clamp (a form panel is one width across the app), `p-0`
       * because `FormShell` owns its own edges. Two differences, both
       * deliberate: `showClose` is left at its default, because this caller
       * passes `FormShell` no `onCancel` and so draws no Cancel button — the
       * kit's ✕ chip is then the only dismiss control, and a panel with none
       * would be a worse bug than the one being fixed; and `overflow-hidden`
       * is NOT set, because `form-shell.tsx` moved clipping off the animated
       * element on purpose (its "FOCUS RING'S OUTER EDGE" note).
       *
       * `fill` on the FormShell below is the same reason `FormShellDialog`
       * passes it: the panel is already edge-to-edge and full-height, so the
       * shell fills it rather than sizing to content under an 85dvh cap. The
       * commit control then sits on the panel's own bottom edge at every
       * height, which is the whole reason the drawer is better here.
       *
       * After creating, the same panel shows the secret ONCE with a copy
       * button; it is never retrievable again. */}
      <Sheet
        open={createOpen}
        onOpenChange={(o) => {
          if (busy) return
          setCreateOpen(o)
          if (!o) setSecret(null)
        }}
      >
        <SheetContent
          side="right"
          className="w-[clamp(26.25rem,34vw,40rem)] max-w-[min(100%,40rem)] p-0"
        >
          {secret ? (
            <div className="flex flex-col gap-4 p-6">
              <DialogTitle>{t("Copy your token now")}</DialogTitle>
              <DialogDescription>
                {t("This is the only time it's shown. Anyone holding it can act as you in")}{" "}
                {teamName ?? t("this team")}. Treat it like a password. It works for{" "}
                {MCP_TOKEN_TTL_DAYS} {t("days, then you make a new one.")}
              </DialogDescription>
              <div className="bg-muted/60 flex items-center gap-2 rounded-[var(--radius)] p-3">
                <code className="min-w-0 flex-1 break-all text-xs">{secret}</code>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => {
                    void navigator.clipboard?.writeText(secret).then(
                      () => toast.success(t("Copied.")),
                      () => toast.error(t("Couldn't copy. Select it by hand."))
                    )
                  }}
                >
                  <Copy className="size-3.5" aria-hidden /> {t("Copy")}
                </Button>
              </div>
              {/* One-tap: the whole connect prompt WITH this token embedded, ready to
               * paste into Claude, Gemini, GPT — the fastest way to hand it off. */}
              <Button
                variant="secondary"
                size="sm"
                className="gap-1 self-start"
                onClick={() => copyInstructions(secret, t)}
              >
                <Copy className="size-3.5" aria-hidden /> {t("Copy setup instructions for any AI")}
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                {/* R84 — a sheet footer, not a title component, so black. */}
                <Button
                  variant="inverse"
                  onClick={() => {
                    setSecret(null)
                    setCreateOpen(false)
                  }}
                >
                  {t("Done")}
                </Button>
              </div>
            </div>
          ) : (
            <FormShell
              fill
              onSubmit={(e) => {
                e.preventDefault()
                void create()
              }}
              title={<DialogTitle>{t("New access token")}</DialogTitle>}
              subtitle={
                <DialogDescription>
                  {t("Pinned to")} {teamName ?? t("your current team")}. It can do exactly what you can do
                  there, nothing more, and it stops working after {MCP_TOKEN_TTL_DAYS} {t("days.")}
                </DialogDescription>
              }
              submit={{
                busy: busy,
                disabled: !label.trim(),
              }}
            >
              <Field
                config={{ ...defaultFieldConfig, label: t("Name"), required: true }}
                htmlFor="token-label"
                className={fieldSpacing}
              >
                <Input
                  id="token-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t("CI importer")}
                  disabled={busy}
                  autoFocus
                />
              </Field>
            </FormShell>
          )}
        </SheetContent>
      </Sheet>

      {/* Revoke — destructive, so confirm. */}
      <AlertDialog open={!!revoking} onOpenChange={(o) => !busy && !o && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Revoke")} {revoking?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Anything using this token stops working immediately. This can't be undone, you can always create a new token.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void revoke()
              }}
              disabled={busy}
            >
              {busy ? <Spinner /> : null}
              {busy ? t("Revoking…") : t("Revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* One token's own call log — every MCP call, reads included: which tool,
       * ok or refused, when. A record view, so it slides in like everything
       * else (R59) rather than centring like the revoke warning above it. */}
      <Sheet open={!!viewingCalls} onOpenChange={(o) => !o && setViewingCalls(null)}>
        <SheetContent side="right" className="w-[clamp(26.25rem,34vw,40rem)] max-w-[min(100%,40rem)]">
          {viewingCalls && <TokenCallLog token={viewingCalls} />}
        </SheetContent>
      </Sheet>
    </section>
  )
}

/** ONE TOKEN'S OWN CALL LOG (R14: paged; R16: the exact count through
 * `formatCount`). Its own component so the hooks below only run while the
 * sheet that needs them is actually open.
 *
 * DRAWN THROUGH THE SAME SEAMS EVERY OTHER PAGED PANEL USES — `<ToolbarRow>`
 * with a search box that asks the DOOR (R48/R19: `q` narrows `tool_name`,
 * the same question `countCalls` answers), the row's own required `empty`
 * prop wired to the RESTING (unsearched) read so a genuinely empty log draws
 * no toolbar at all (R50), and `PINNED_TOOLBAR` (worn by the row itself,
 * R63) staying on top while the rows scroll under it — the exact three laws
 * this panel shipped green without, because a hand-rolled `<Table>` with no
 * `<ToolbarRow>` at all was invisible to every census that reads FROM one.
 *
 * A PLAIN ROW LIST, never a banded table (R80) — the same shape
 * `work-logs-panel.tsx` already draws for the record engine's other paged,
 * time-ordered nested collections, and `formatRelative` for the timestamp
 * so it never wraps at 375px the way an absolute "2026-09-16 20:41" did. */
function TokenCallLog({ token }: { token: McpTokenSummary }) {
  const { t, lang } = useLanguage()
  const key = mcpCallsKey(token.id)
  const restingQ = useCached<McpCall[]>(key, () => listFetch.mcpCalls(token.id))
  const restingTotal = useCachedValue<number>(totalKey("mcp-calls", token.id))

  // WHILE A SEARCH IS TYPED, THE FILTERED READ IS THE LIST — its own cache key
  // and its own cursor, the same shape `work-logs-panel.tsx`'s `personFilter`
  // takes: the resting (unsearched) read stays warm underneath, so clearing
  // the box costs nothing. Its TOTAL rides local state rather than the shared
  // cache (R16, the searched question's own count): a search is this reader's
  // alone and nobody else's screen needs to hear about it, so it does not
  // belong in a key another component could read.
  const [q, setQ] = React.useState("")
  const [filteredTotal, setFilteredTotal] = React.useState<number | null>(null)
  const filteredKey = q ? `${key}:q:${q}` : key
  const filteredQ = useCached<McpCall[]>(q ? filteredKey : null, () =>
    mcp.calls(token.id, { q }).then((r) => {
      primeCache(cursorKey(filteredKey), r.nextCursor)
      setFilteredTotal(r.total)
      return r.calls
    })
  )
  const calls = q ? (filteredQ.data ?? null) : (restingQ.data ?? null)
  // THE BADGE ANSWERS THE SAME QUESTION THE ROWS DO (R16) — the searched total
  // while a search is typed, never the whole collection's underneath it.
  const total = q ? filteredTotal : restingTotal
  const activeFetchPage = (cursor: string) =>
    mcp.calls(token.id, { cursor, q: q || undefined }).then((r) => ({ rows: r.calls, nextCursor: r.nextCursor }))

  if (restingQ.error)
    return (
      <div className="flex flex-col gap-4 p-6">
        <DialogTitle>{t("Calls")}</DialogTitle>
        <ShapeStateBody
          shape="recordChrome"
          state="error"
          copy={{ errorTitle: t("Couldn't load this token's calls.") }}
          action={
            <Button variant="secondary" onClick={() => restingQ.refresh()}>
              {t("Try again")}
            </Button>
          }
        />
      </div>
    )
  if (restingQ.data === undefined)
    return (
      <div className="flex flex-col gap-4 p-6">
        <DialogTitle>{t("Calls")}</DialogTitle>
        <Skeleton variant="list" lines={4} />
      </div>
    )

  return (
    <div className="flex h-full flex-col">
      {/* THE HEAD, fixed — the drawer's own three-part frame (sheet.tsx's own
       * header comment: "the head and the foot do not move and the body
       * scrolls"). `SheetContent` carries no padding of its own, so this pays
       * the drawer's 24px inset. */}
      <div className="flex flex-col gap-1 p-6 pb-4">
        <DialogTitle>{t("Calls")}</DialogTitle>
        <DialogDescription>
          {token.label}
          {total ? ` · ${formatCount(total)}` : ""}
        </DialogDescription>
      </div>
      {/* THE BODY, scrolling — and the scrollport `<ToolbarRow>`'s own
       * `PINNED_TOOLBAR` pins against. `bg-popover` matches the drawer's own
       * surface (sheet.tsx: "Overlay surface is --popover") and PUBLISHES
       * `--pinned-ground` for it (globals.css `.bg-popover`), so the pinned
       * row paints the same paper it is standing on instead of a hole. */}
      <div className="bg-popover min-h-0 flex-1 overflow-y-auto">
        <ToolbarRow
          // R50 — the RESTING read's own row count, never the searched one: a
          // log with zero calls ever draws no toolbar at all, but a search
          // that narrows a non-empty log to zero keeps the box up so the box
          // that found nothing can still be cleared.
          empty={restingQ.data.length === 0}
          search={
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search calls…")}
              className="h-9 w-full sm:w-48"
              aria-label={t("Search calls")}
            />
          }
        />
        <div className="px-6 pb-6">
          {calls === null ? (
            <Skeleton variant="list" lines={3} />
          ) : calls.length === 0 ? (
            <CollectionEmptyState filtered={Boolean(q)} title={t("No calls yet.")} />
          ) : (
            <>
              {/* PLAIN, AS OF 23 SEP 2026 — this used to paint
                  `bg-surface-panel` AND draw its row rule as a literal
                  `divide-y` border, both wrong on their own merits today:
                  R105 says a sheet's own sections paint no background (this
                  list lives inside the call-log Sheet), and R67's surviving
                  half says separation is a fill or an inset shadow, never a
                  stroke — `divide-y` is a stroke. Each row now carries the
                  same inset `shadow-[var(--hairline-under)]` hairline every
                  other list in this file already uses. */}
              <ul className="flex flex-col">
                {calls.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm shadow-[var(--hairline-under)] last:shadow-none"
                  >
                    <span className="min-w-0 flex-1 basis-[12rem] truncate font-mono text-xs">{c.toolName}</span>
                    {c.ok ? (
                      <Badge variant="secondary" className="shrink-0 text-badge">
                        {t("Ok")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-destructive shrink-0 text-badge">
                        {t("Refused")}
                      </Badge>
                    )}
                    <span className="text-muted-foreground shrink-0 whitespace-nowrap text-xs tabular-nums">
                      {formatRelative(c.createdAt, t, lang)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-3">
                <LoadMore listKey={q ? filteredKey : mcpCallsKey(token.id)} fetchPage={activeFetchPage} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
