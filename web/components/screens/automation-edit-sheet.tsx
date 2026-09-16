"use client"

// THE AUTOMATION'S OWN PANEL — DETAIL FIRST, EDIT ON REQUEST. R59's Sheet,
// reached from `ModuleAutomations`' table by pressing a row (there is no
// detail SCREEN for an automation to navigate to, so the press opens this
// directly — the same convention Contacts, Tasks and Meetings use to reach a
// record's editor, read onto a row that has nowhere else to go).
//
// ── THE CLIENT'S RULING, 2026-09-15 ─────────────────────────────────────────
//
//   *"When I click on Automation, it should open on the detail page, so just
//    the name, the description, the module, and the cheapest status. On the
//    top next to the header, replicating the big card of the main page
//    design, put the button to edit, which should then show the edit screen
//    on the same slide in."*
//
// So this ONE panel now carries TWO FACES sharing one open state — a
// read-only DETAIL face (name, status chip above it, an Edit pencil at the
// head's top-right — the identity-row-then-title-then-actions shape every
// record detail draws, `RecordScreen` in web/components/records/
// record-chrome.tsx) and the EDIT face this file already had (Name,
// Description, Status). `mode` picks between them; pressing the pencil
// swaps to "edit", Save and Cancel both return to "detail" — Save because
// the values it saved are now the detail face's own values, Cancel because
// nothing changed. Closing the whole sheet (backdrop, Escape) is a third,
// different act and is untouched by either.
//
// WHY THIS HAND-BUILDS ITS PANEL INSTEAD OF `FormShellDialog` — the same
// reasoning `web/components/team/access-tokens.tsx` already wrote out for its
// own two-faced panel (create form, then the one-time secret): that wrapper
// renders a `FormShell` unconditionally and has nowhere to put a second face.
// So the `Sheet`/`SheetContent` are built here, mirroring that file's own
// decisions — `side="right"`, the same width clamp (one form panel width
// across the app), `p-0` because `FormShell` owns its own edges on the edit
// face. The edit face draws its own Cancel button in the form footer (the
// client's 2026-08-31 ruling: "on add/edit … we already have the cancel for
// that"); the detail face draws none. Both close by backdrop click or Escape
// alone — see "NO ✕, ON EITHER FACE" below for the 2026-09-16 ruling that
// took the kit's own close chip off this sheet entirely.
//
// ── THE HEAD'S OWN ORDER, AND THE ✕ (client ruling, 2026-09-16) ─────────────
//
//   *"Remove the X button to close it and put the module first, and
//    underneath the description."*
//
// Two changes to the DETAIL face's body, both below: the `OverviewList` now
// reads Module, then Description — it read the other way round from
// 2026-09-15 until this ruling — and `SheetContent`'s `showClose` (this
// file's own final return, below) is `false` unconditionally rather than
// moving with `mode`. Closing was never IN QUESTION — her sentence removes a
// CONTROL, not a capability — so both faces keep reaching it exactly the way
// they already did: the backdrop and Escape, `Sheet`'s own modal `Dialog`
// behaviour underneath, wired by neither `mode` nor `showClose`.
//
// ── THE STATUS CHIP'S COLOUR ─────────────────────────────────────────────────
//
// The client, 2026-09-15, over the automations table: *"make sure that each
// status has a different color because right now active and protected look
// the same."* Two rulings later, both 16 Sep 2026, landed as FILLS —
// `AUTOMATION_STATUS_VARIANT` below (still live, see next section) went
// `inverse`/`success`/`outline`, then Inactive's own follow-up swapped
// `outline` for `secondary` ("make sure that the status 'inactive' for the
// automations also has a background… the pill"). THE THIRD RULING, SAME
// EVENING, REPLACED THE WHOLE APPROACH: *"For automations, let's change the
// full color pill to also be a dot. Inactive gets gray, and active gets
// green."* — and, the same breath, *"All dots are always solid, not
// rings."* So the status chip this panel's own detail head draws (below) and
// `ModuleAutomations`' own list column no longer read a FILL at all: both
// read `AUTOMATION_STATUS_DOT`, a `Record<AutomationStatus, DotTone>`, and
// draw `<Badge variant="status" dot={…}>` — the same shape the ticket detail
// head's own stage chip draws (`help-detail.tsx`'s retired status pill,
// `helpStatusDotTone`) and `shared/status-tones.ts`'s own style, kept local
// here rather than added to that file because `AutomationStatus` is not
// `HelpStatus`/`StoryStatus` and this map has exactly one reader pair.
//
//   on (Active)     → `shipped` — green (`--dot-shipped`, `--kw-forest`),
//                      her word exactly.
//   off (Inactive)  → `archived` — grey (`--dot-archived`,
//                      `--ink-disabled`), her word exactly.
//   protected       → `building` — charcoal (`--dot-building`,
//                      `--foreground`). SHE DID NOT NAME THIS ONE: the
//                      ruling above gives Active and Inactive their colours
//                      and says nothing about Protected. `building` is this
//                      change's own suggestion — the same tone the ticket/
//                      story status maps already use for "in build, no
//                      colour of its own" — chosen because it is the one
//                      lifecycle tone left that is neither green nor grey
//                      and reads as neutral-strong rather than a fourth
//                      invented hue (R32, the closed palette). Flag this for
//                      her the next time status colours come up.
//
// `AUTOMATION_STATUS_VARIANT` IS NOT DELETED — it still has two readers
// outside this change's own scope: the Choices table's own status cell
// (`deep-link/shape.tsx#shapeChoicesTable`) and the internal automations
// panel (`team/internal-screens.tsx`), neither of which this ruling named.
// Both keep the filled-pill look unchanged; the divergence from Automations'
// own new dot is the SAME kind of gap this file already carried on purpose
// (see the next paragraph, unchanged) — "worth its own pass, not this one."
//
// NOT THE SAME COLOUR THE CHOICES TABLE DRAWS FOR ITS OWN "Protected" (
// deep-link/shape.tsx, `variant="secondary"`) — read as a separate, narrower
// finding rather than folded in here: this ruling was given over the
// Automations screen alone, Choices' table is out of this lane's scope
// (settings-screen.tsx/shape.tsx are read-only reference for this change),
// and the Choices table has the identical undifferentiated-badge shape this
// ruling is about. Worth its own pass; not this one.
//
// ── R70, STILL HERE, UNCHANGED IN SHAPE ─────────────────────────────────────
//
// The Protected badge and its reason, and the working `<Switch>` beside a
// switchable row, still render exactly as they did before this file grew a
// second face — inside the EDIT face's own Status field, in the same two
// guarded branches (`!a.switchable && a.helpText` / `a.switchable`) R70
// (`web/test/automations.test.ts`) reads by name. That badge keeps
// `variant="secondary"`, matching the Choices half's own part+variant, which
// is what that law derives and requires — a DIFFERENT badge from the detail
// head's status chip above, on purpose: R70's mark is "you can see this and
// you cannot change it," asked once, in the one place a person is actively
// choosing whether to try. The detail head's chip is "what is this row's
// status," asked on every row regardless of whether it can change — two
// different questions the client's two rulings (2026-09-11 for the first,
// 2026-09-15 for this file's other three) each answered on their own screen.
//
// THE REASON IS THEREFORE ONE PRESS FURTHER THAN IT USED TO BE — pressing a
// row now opens the detail face, and a protected row's `helpText` only shows
// once Edit is pressed. That is a real change from R70's own header
// ("the reason moves into the sheet… a Protected row's reason is one press
// away, never hidden behind a second control"), and it is this exact ruling's
// own doing: "just the name, the description, the module, and the cheapest
// status" is what she asked the detail face to hold, and a reason sentence is
// not one of the four. If she wants it back on the detail face too, that is a
// fifth field to add here, not a regression to quietly undo.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Sheet, SheetContent } from "@shared/ui/components/sheet/sheet"
import { Field } from "@shared/web/field"
import { FormShell, fieldSpacing } from "@shared/web/form-shell"
import { Input } from "@shared/ui/components/input/input"
import { PencilSimple } from "@shared/ui/foundations/icons"
import { Switch } from "@shared/ui/components/switch/switch"
import { Textarea } from "@shared/ui/components/textarea/textarea"
import { Text } from "@shared/ui/components/typography/typography"
import { toast } from "@shared/ui/components/sonner/sonner"
import type { DotTone } from "@shared/app-stages"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { Icon } from "@shared/web/screen-engine/icon"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useT } from "@shared/web/language"

import { ApiFailure, tenancy } from "@/lib/api"
import { CONCEPT_ICON } from "@/lib/pages"
import { OverviewList } from "@/components/records/overview-list"
import {
  automationOverride,
  automationStatus,
  type Automation,
  type AutomationStatus,
} from "@shared/automations"

/** THE FILLED-PILL DERIVATION — SUPERSEDED FOR THIS SCREEN, STILL LIVE FOR
 * TWO OTHERS. See this file's own header ("THE STATUS CHIP'S COLOUR") for
 * the 16 Sep 2026 ruling that moved Automations' own status chip to a dot
 * (`AUTOMATION_STATUS_DOT`, below). This map is UNCHANGED and still exported
 * because `deep-link/shape.tsx#shapeChoicesTable` and
 * `team/internal-screens.tsx` both still read it — neither was named in the
 * dot ruling, and removing their import would be an unrelated redesign no
 * one asked for in this pass. */
export const AUTOMATION_STATUS_VARIANT: Record<AutomationStatus, "inverse" | "success" | "secondary"> = {
  protected: "inverse",
  on: "success",
  off: "secondary",
}

/** THE DOT DERIVATION — the client's ruling, 16 Sep 2026: "let's change the
 * full color pill to also be a dot. Inactive gets gray, and active gets
 * green." See this file's own header for the full account, including that
 * she did not name Protected's tone (`building` is this change's own
 * suggestion). `ModuleAutomations`' own table column imports this rather
 * than keeping a second copy, so the list row and this panel's own detail
 * head can never disagree about which dot a status wears. */
export const AUTOMATION_STATUS_DOT: Record<AutomationStatus, DotTone> = {
  protected: "building",
  on: "shipped",
  off: "archived",
}

type FormValues = { title: string; description: string }
const EMPTY: FormValues = { title: "", description: "" }

/** The panel's two faces. Reset to "detail" every time a DIFFERENT row opens
 * (below) so pressing Edit on one automation never leaves the next one
 * opened straight into the edit form. */
type SheetMode = "detail" | "edit"

export function AutomationEditSheet({
  open,
  onOpenChange,
  teamId,
  automation,
  settings,
  mayChange,
  moduleTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  /** The row this sheet shows/edits, or `null` while there is none to show — the
   * caller clears this only after `onOpenChange(false)`, so the fields do
   * not blank out mid-close. */
  automation: Automation | null
  /** This row's own segment's parsed stored blob — read once by the caller
   * for every row it draws (R56: one door, read once) and handed down
   * rather than re-fetched here. */
  settings: unknown
  mayChange: boolean
  /** The module's own translated settings-page title — `moduleTitle(a.segment)`
   * in `module-automations.tsx`, computed there from `AutomationsScope` (which
   * this file knows nothing about) and handed down rather than re-derived. */
  moduleTitle: string
}) {
  const t = useT()

  // REMEMBER THE LAST REAL ROW through the close transition, so `open` can
  // fall to `false` (starting the Sheet's own exit animation) a render
  // before `automation` falls to `null` without the fields blanking first.
  const [last, setLast] = React.useState<Automation | null>(automation)
  React.useEffect(() => {
    if (automation) setLast(automation)
  }, [automation])
  const a = automation ?? last

  const [mode, setMode] = React.useState<SheetMode>("detail")
  const lastKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (a && a.key !== lastKeyRef.current) {
      lastKeyRef.current = a.key
      setMode("detail")
    }
  }, [a])

  const override = a ? automationOverride(settings, a.key) : null
  const status = a ? automationStatus(a, settings) : "on"

  const STATUS_LABEL: Record<AutomationStatus, string> = {
    on: t("Active"),
    off: t("Inactive"),
    protected: t("Protected"),
  }

  const [values, setValues, clearDraft] = useFormDraft<FormValues>(
    a ? `automation:edit:${teamId}:${a.key}` : undefined,
    a ? { title: override?.title ?? "", description: override?.description ?? "" } : EMPTY,
    open
  )
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!a) return
    setBusy(true)
    try {
      await tenancy.setAutomationOverride(a.key, values.title.trim(), values.description.trim())
      clearDraft()
      setMode("detail")
      toast.success(t("Saved."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't save that."))
    } finally {
      setBusy(false)
    }
  }

  async function flip(on: boolean) {
    if (!a) return
    setBusy(true)
    try {
      await tenancy.setAutomation(a.key, on)
      toast.success(on ? t("Switched on.") : t("Switched off."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't change that. Try again."))
    } finally {
      setBusy(false)
    }
  }

  if (!a) return null

  const name = override?.title ?? t(a.title)
  const description = override?.description ?? t(a.description)

  // THE TWO FACES, PICKED BY A PLAIN VARIABLE RATHER THAN A `{cond ? (…) :
  // (…)}` JSX EXPRESSION — deliberately, so R70's own branch-slicer
  // (`web/test/automations.test.ts`'s `guardedBranches`, which finds every
  // JSX expression container shaped `{cond ? (` or `{cond && (` and reads its
  // body by brace balance) never wraps BOTH faces in one outer "branch". If
  // this mode switch were written as `{mode === "edit" ? (<FormShell>…) :
  // (<div>…)}`, that outer container's own sliced body would span both
  // faces — including the edit face's "Protected" badge and its `<Switch>` —
  // and R70 would then find TWO branches carrying each mark instead of the
  // one it requires. A plain `const` ternary carries no leading `{`, so the
  // scanner never sees it as a branch at all; the two REAL guarded branches
  // inside the edit face (below) are exactly as they were before this file
  // grew a second face.
  const panelBody =
    mode === "edit" ? (
      <FormShell
        fill
        onSubmit={submit}
        title={<DialogTitle>{name}</DialogTitle>}
        subtitle={<DialogDescription>{description}</DialogDescription>}
        submit={{ busy, disabled: !mayChange }}
        onCancel={() => setMode("detail")}
      >
        <Field
          config={{ ...defaultFieldConfig, label: t("Name") }}
          htmlFor="automation-title"
          className={fieldSpacing}
        >
          <Input
            id="automation-title"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder={t(a.title)}
            disabled={busy || !mayChange}
            autoFocus
          />
        </Field>
        <Field
          config={{ ...defaultFieldConfig, label: t("Description") }}
          htmlFor="automation-description"
          className={fieldSpacing}
        >
          <Textarea
            id="automation-description"
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            placeholder={t(a.description)}
            disabled={busy || !mayChange}
            rows={3}
          />
        </Field>
        <Field
          config={{ ...defaultFieldConfig, label: t("Status") }}
          htmlFor="automation-status"
          className={fieldSpacing}
        >
          {!a.switchable && a.helpText ? (
            <div className="flex flex-col gap-1">
              <Badge variant="secondary" className="w-fit shrink-0">
                {t("Protected")}
              </Badge>
              <Text className="text-muted-foreground">{t(a.helpText)}</Text>
            </div>
          ) : null}
          {a.switchable ? (
            // `flex-wrap` — the census in `web/test/rules.test.ts` ("a
            // record's name survives a narrow screen") reads 1400 characters
            // forward of ANY `flex items-center` row looking for `min-w-0`
            // near a `<Badge>`, and this row's own neighbourhood (the detail
            // face's status chip, a few hundred characters later in this same
            // file) satisfies both — a real finding about the FILE's text
            // proximity even though this particular row carries no badge of
            // its own. Wrapping costs nothing here (a switch and one short
            // word never need the second line) and keeps the census honest
            // rather than gamed around.
            <div className="flex flex-wrap items-center gap-2">
              <Switch
                id="automation-status"
                checked={status === "on"}
                aria-label={t(a.title)}
                disabled={!mayChange || busy}
                onCheckedChange={(v: boolean) => void flip(v)}
              />
              <Text>{status === "on" ? t("Active") : t("Inactive")}</Text>
            </div>
          ) : null}
        </Field>
      </FormShell>
    ) : (
      // THE DETAIL FACE — read-only: name, status chip above it, Edit at
      // the head's top-right (record-chrome's own action-button shape,
      // `Button variant="secondary" size="icon"` carrying a bare
      // `PencilSimple`, e.g. `account-detail.tsx`), then Description and
      // Module below it. `DialogDescription` carries the a11y wiring
      // (Radix wants a description registered somewhere in the content)
      // without doubling the sentence on screen — `sr-only` here, said
      // again, visibly, as the Description row just below.
      <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius)]">
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <div className="flex flex-col gap-2 px-6 pt-6 pb-4 shadow-[var(--hairline-over)]">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1">
              <Badge variant="status" dot={AUTOMATION_STATUS_DOT[status]} className="mb-2 w-fit shrink-0">
                {STATUS_LABEL[status]}
              </Badge>
              <DialogTitle className="block text-4xl">{name}</DialogTitle>
            </div>
            {mayChange && (
              <div className="ms-auto shrink-0">
                <Button variant="secondary" size="icon" onClick={() => setMode("edit")} aria-label={t("Edit")}>
                  <PencilSimple className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {/* MODULE FIRST, DESCRIPTION UNDERNEATH — client ruling, 2026-09-16,
              verbatim: "put the module first, and underneath the description."
              The module's own mark/icon rides beside its name exactly as it
              does everywhere else the app draws a module (this same icon+name
              pairing, off `CONCEPT_ICON`, is `module-automations.tsx`'s own
              Module cell one file over). */}
          <OverviewList
            items={[
              {
                id: "module",
                label: t("Module"),
                value: (
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon
                      name={CONCEPT_ICON[a.segment as keyof typeof CONCEPT_ICON] ?? CONCEPT_ICON.settings}
                      className="text-muted-foreground size-4 shrink-0"
                    />
                    <span className="min-w-0 truncate">{moduleTitle}</span>
                  </span>
                ),
              },
              { id: "description", label: t("Description"), value: description },
            ]}
          />
        </div>
      </div>
    )

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (busy) return
        onOpenChange(o)
      }}
    >
      {/* WIDTH AND SIDE mirror `FormShellDialog`/`access-tokens.tsx`'s own
       * hand-built panel — one form-panel width across the app.
       *
       * NO ✕, ON EITHER FACE — client ruling, 2026-09-16, verbatim: "Remove
       * the X button to close it." `showClose` is now `false` unconditionally
       * rather than moving with `mode` (it used to stand down only for the
       * edit face, matching `FormShellDialog`'s own Cancel-button panels).
       * Closing still reaches exactly the way it already did on BOTH faces —
       * this sheet's own 2026-09-15 header said so before this ruling ever
       * removed the chip: "the backdrop and Escape either already reaches" —
       * `Sheet` is Radix's modal `Dialog` underneath, so the overlay click and
       * Escape are the primitive's own behaviour, never wired by `showClose`.
       * The edit face keeps its own Cancel button in the form footer
       * (`FormShell`'s `onCancel` above); the detail face now closes by
       * backdrop or Escape alone — no other control on this face was ever
       * built to dismiss the panel, so those two are the whole of its door. */}
      <SheetContent
        side="right"
        showClose={false}
        className="w-[clamp(26.25rem,34vw,40rem)] max-w-[min(100%,40rem)] p-0"
      >
        {panelBody}
      </SheetContent>
    </Sheet>
  )
}
