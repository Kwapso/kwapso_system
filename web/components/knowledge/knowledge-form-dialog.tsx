"use client"

// Knowledge-source form — write something into the knowledge base, or correct
// what is already there. The whole point of the module in one dialog: the owner
// asked for a base a person can "add to, correct, and remove something wrong
// from", and a source list you can only watch is not that.
//
// TWO FIELDS THAT ARE NOT ABOUT THE TEXT, and they are the interesting ones:
//   • FILED UNDER — which client's compartment this belongs to, or the agency's.
//     A picker over accounts the caller can already see, because a compartment
//     built from an id nobody owns is a slice nothing can ever reach again.
//   • WHO CAN USE IT — the team, the people on one app, or only you. Two fences
//     behind one question: `owner_user_id` (the one a personal Google connection
//     lands on — material that arrived through what YOU can see stays in YOUR
//     answers) and `visible_to_app_id`, which borrows the app record's own rule
//     that only its staff and an admin may open it (12.3 + 8.11). Picking an app
//     you are not on is refused by the door, in words, rather than quietly
//     filing something you would be the first person unable to read.
//
// A MIRRORED source (one the sweep keeps in step with a ticket, an article or an
// account) hands `textOwnedElsewhere` in, and the two text fields go read-only
// with the reason said out loud — the sweep would overwrite an edit on its next
// pass, and a form that silently loses your typing is worse than one that says
// it will. Library primitives, FormShell, per-session draft (R4 + R7).
//
// "ONLY YOU" IS NOT OFFERED ON A MIRRORED SOURCE, and that is a correction, not
// a simplification: it used to be, the door wrote it, and the very next Google
// sweep silently put it back — a live `writeSightings` + `teamVisibleRecomputeSql`
// own `owner_user_id` on a mirrored row now (knowledge-google.ts), the same
// column this form used to write directly. A choice that never survives the next
// tick is not a choice, so `mirrored` drops the option rather than keep offering
// one the door has quietly stopped honouring. What replaces it is `sightingsLine`
// — read-only, derived from who has actually sighted the thing — because whether
// a mirrored source reads private today is a FACT about who has seen it, not a
// setting anyone here picks. Wanting it kept off the team's answers entirely is a
// different want than "only me", and it already has a door: take the source away
// (`setSourceActive`), not a third mechanism invented here.

import * as React from "react"

import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { pickerKey, searchAccounts } from "@/lib/picker-sources"
import { RecordPicker } from "@/components/records/record-picker"
import { accountOption, type PickableRecord } from "@/lib/pickable"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { richTextValue } from "@shared/web/rich-text"
import { Input } from "@shared/ui/components/input/input"
import { Notes } from "@shared/web/notes-editor/notes-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/components/select/select"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"

import { ApiFailure } from "@/lib/api"
import { useFormDraft } from "@shared/web/use-form-draft"
import { isVideoLink } from "@shared/media-links"
import { useT } from "@shared/web/language"
import { sightingsLine } from "@/components/knowledge/knowledge-source-card"

const titleField = { ...defaultFieldConfig, label: "What is it called?", required: true }
const bodyField = { ...defaultFieldConfig, label: "What should the assistant know?", required: false }
const linkField = { ...defaultFieldConfig, label: "Link (optional)", required: false }
const filedField = { ...defaultFieldConfig, label: "Filed under", required: false }
const visibilityField = { ...defaultFieldConfig, label: "Who can use it", required: false }
const appField = { ...defaultFieldConfig, label: "Which app's members", required: true }

/** Radix Select can't hold an empty value, so "the agency's own" uses a sentinel. */
const AGENCY = "__agency__"

export type KnowledgeFormValues = {
  title: string
  body: string
  sourceUrl: string
  accountId: string
  visibility: "team" | "app" | "private"
  /** the app whose people may read it — meaningful only when visibility is "app" */
  visibleToAppId: string
}

export function KnowledgeFormDialog({
  open,
  onOpenChange,
  onSubmit,
  teamId,
  accountOptions,
  appOptions,
  initial,
  draftKey,
  textOwnedElsewhere,
  textOwnedNote,
  titleOwnedElsewhere,
  mirrored,
  sightingsCount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Void on an ordinary save (every EDIT, and a CREATE that isn't a bare video
   * link) — closes and clears the draft, exactly as before this field existed.
   * A CREATE that read a video link and couldn't returns `refusedBecause`
   * instead, which keeps the dialog open and renders the sentence in place. */
  onSubmit: (values: KnowledgeFormValues) => Promise<{ refusedBecause?: string | null } | void>
  /** the accounts this caller may file under — already fenced by their own read */
  /** the team whose clients the compartment picker searches (accounts PAGE, R14) */
  teamId: string | null
  accountOptions: PickableRecord[]
  /** the apps this caller may limit a source to. The host hands in the ones it
   * already loaded; the DOOR is what decides, and it refuses any app the caller
   * is not staffed to — this list only stops somebody choosing one to be told no. */
  appOptions: PickableRecord[]
  /** Present = EDIT mode (prefilled). */
  initial?: Partial<KnowledgeFormValues>
  /** stable id for per-session draft persistence (CACHING.md §11); omit to disable */
  draftKey?: string
  /** true when this source's words belong to something else — a mirrored row the
   * sweep keeps in step, or an uploaded file the words were read out of */
  textOwnedElsewhere?: boolean
  /** WHY they are read-only, in the sentence that fits. Two different things own
   * words here and they need two different explanations: a mirrored source is
   * kept in step with a record, an uploaded file IS the record. One boolean with
   * one sentence would have told half the people the wrong thing. */
  textOwnedNote?: string
  /** true when even the NAME belongs elsewhere. Separate from the words on
   * purpose: a mirrored source is called what its row is called, and the sweep
   * would put that name straight back — but nothing owns what we call an
   * uploaded file, so a file source can be renamed while its words stay
   * read-only. Defaults to `textOwnedElsewhere`, which is what a mirrored source
   * has always meant. */
  titleOwnedElsewhere?: boolean
  /** true when a live sweep, not this form, decides whether this source reads
   * private — drops "Only me" from the "Who can use it" choices and shows the
   * derived reach line instead. See the file header. */
  mirrored?: boolean
  /** how many people's own sight of this source is what the "private" fact
   * above is derived from — meaningless, and unused, unless `mirrored`. */
  sightingsCount?: number
}) {
  const t = useT()
  const isEdit = !!initial
  const [values, setValues, clearDraft] = useFormDraft(
    draftKey,
    {
      title: initial?.title ?? "",
      body: initial?.body ?? "",
      sourceUrl: initial?.sourceUrl ?? "",
      accountId: initial?.accountId || AGENCY,
      visibility: initial?.visibility ?? ("team" as const),
      visibleToAppId: initial?.visibleToAppId ?? "",
    },
    open
  )
  const [busy, setBusy] = React.useState(false)
  // WHY IT COULDN'T READ THE LINK, verbatim from the door (see `onSubmit`'s own
  // type) — two genuinely different sentences (a host we don't recognise vs.
  // one we do that simply publishes no transcript), composed server-side and
  // shown AS WRITTEN, never paraphrased into one generic failure and never a
  // toast that disappears before it's read. Cleared the moment the person
  // changes the link — a stale refusal about the last URL would describe the
  // wrong thing the moment they paste a new one.
  const [linkRefusal, setLinkRefusal] = React.useState<string | null>(null)

  // A LINK IS NOT A SOURCE — IT IS A LINK TO ONE.
  //
  // Every unreadable thing that ever reached this knowledge base was accepted,
  // stored and quietly never read, and nobody was told. A link with nothing
  // beside it used to be that shape exactly — a row that looks filed and holds
  // nothing — for EVERY host. It no longer is for a VIDEO link: the owner's own
  // words, 12 Sep, "whether I paste Tella, Loom, or YouTube doesn't matter... it
  // will paste [and] show me what kind of transcript it's extracting" — so a
  // bare video link is now the expected, submittable shape, and the door reads
  // it for real (`read`/`refusedBecause` on the response). An ordinary page is
  // still refused with nothing beside it: this app does not fetch arbitrary
  // pages, and "we don't open the page for you" stays true for everything that
  // isn't a video.
  const link = values.sourceUrl.trim()
  const linkIsVideo = isVideoLink(link)
  const nothingToRead = !!link && !linkIsVideo && !richTextValue(values.body).trim()
  // THE ONE CASE THE SUBMIT BUTTON SAYS SOMETHING DIFFERENT FOR — a real read
  // behind the door, seconds rather than an ordinary write's milliseconds. Only
  // when there is no body already: a video link with words already pasted
  // beside it is an ordinary note that happens to carry a link, and saving it
  // is the same instant write every other source gets.
  const willReadVideoLink = !!link && linkIsVideo && !richTextValue(values.body).trim()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const result = await onSubmit({
        title: values.title.trim(),
        body: richTextValue(values.body),
        sourceUrl: values.sourceUrl.trim(),
        accountId: values.accountId === AGENCY ? "" : values.accountId,
        visibility: values.visibility,
        // Only sent when it is the answer. "Team" and "only me" both mean no
        // app, and sending one alongside them would store a restriction the
        // person did not choose.
        visibleToAppId: values.visibility === "app" ? values.visibleToAppId : "",
      })
      // A REFUSAL IS NOT A THROW — the source still saved (as an ordinary,
      // unreadable-video note), so closing the dialog and clearing the draft
      // would be right for THAT fact and wrong for this one: the person asked
      // for a transcript and needs to see why they didn't get one before the
      // form disappears. Stays open; the sentence renders under the link field.
      if (result && "refusedBecause" in result && result.refusedBecause) {
        setLinkRefusal(result.refusedBecause)
        return
      }
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof ApiFailure
          ? err.message
          : isEdit
            ? t("Couldn't save the source.")
            : t("Couldn't add it to the knowledge base.")
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormShellDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      onSubmit={submit}
      title={<DialogTitle>{isEdit ? t("Correct this source") : t("Add to the knowledge base")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {textOwnedElsewhere
            ? (textOwnedNote ??
              t("This one is kept in step with the record it came from, so its words are edited there. You can still change where it is filed and who can use it."))
            : t("Anything you put here is something the assistant may use to answer questions, and it will name this source when it does.")}
        </DialogDescription>
      }
      submit={{
        busy: busy,
        // NOTHING PASTED MEANS NO SOURCE. The door says the same thing; this
        // stops a person getting there and being told no.
        disabled: !values.title.trim() || nothingToRead,
        // THE OWNER'S OWN WORDS: "show me it's loading" — a video read is a
        // real fetch behind this door, seconds rather than an ordinary save's
        // milliseconds, and "Submitting…" would read as stuck. Every other
        // save on this form (and every other form in the app) still says
        // "Submitting…" — see `SubmitConfig.loadingLabel`'s own header.
        loadingLabel: willReadVideoLink ? t("Reading the link…") : undefined,
      }}
    >
      <Field config={titleField} htmlFor="knowledge-title" className={fieldSpacing}>
        <Input
          id="knowledge-title"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          placeholder={t("e.g. How we handle a Bergman dispatch outage")}
          disabled={busy || (titleOwnedElsewhere ?? textOwnedElsewhere)}
          autoFocus
        />
      </Field>
      <Field config={bodyField} htmlFor="knowledge-body" className={fieldSpacing}>
        <Notes
          key={open ? "open" : "shut"}
          // THE NAME A SCREEN READER READS. The `htmlFor` above lands the id on
          // the editable node itself, because the kit Field clones it onto its
          // single child — and this is the label that id could never carry, since
          // a label element's `for` attribute binds only to a labelable control
          // and the editable node here is a plain div. Same words as the visible
          // label, taken from the same config, so the two can never drift apart.
          aria-label={t(bodyField.label)}
          // `textOwnedElsewhere`, not just `busy` — this file's own header says
          // "the two text fields go read-only" when a mirrored source owns the
          // words, and the title Input above has enforced that since the day it
          // was written. The body never could: the editor had no `disabled` prop
          // to be handed, so the promise held for one of the two fields and the
          // sweep quietly overwrote anything typed into the other on its next
          // pass — the exact loss the sentence was written to prevent.
          disabled={busy || textOwnedElsewhere}
          defaultValue={values.body}
          onChange={(html) => setValues((v) => ({ ...v, body: html }))}
          placeholder={t("Write it the way you would explain it to a new colleague.")}
          className="min-h-32"
        />
      </Field>
      <Field config={linkField} htmlFor="knowledge-link" className={fieldSpacing}>
        <Input
          id="knowledge-link"
          value={values.sourceUrl}
          onChange={(e) => {
            const sourceUrl = e.target.value
            setValues((v) => ({ ...v, sourceUrl }))
            // A refusal describes the LAST url. The moment they change it, it
            // describes nothing that's still true — cleared rather than left
            // to read as an answer about whatever they've just typed instead.
            if (linkRefusal) setLinkRefusal(null)
          }}
          placeholder="https://…"
          disabled={busy || textOwnedElsewhere}
        />
        {linkRefusal ? (
          // RENDERED AS WRITTEN, never wrapped in t() — this is the door's own
          // composed sentence (see `onSubmit`'s type), the same shape as
          // `knowledgeAnswer`'s `reason`: DATA the response carries, not
          // catalogued UI copy. Two genuinely different sentences live here
          // (a host we don't recognise vs. one that publishes no transcript)
          // and neither gets paraphrased into the other.
          <p className="text-warning mt-2 text-sm">{linkRefusal}</p>
        ) : nothingToRead ? (
          <p className="text-warning mt-2 text-sm">
            {t(
              "A link on its own gives the assistant nothing to read — we don't open the page for you. Paste or write what it says above and this source is good to go."
            )}
          </p>
        ) : willReadVideoLink ? (
          <p className="text-muted-foreground mt-2 text-xs">
            {t("We'll read this video's captions or transcript when you save it.")}
          </p>
        ) : null}
      </Field>
      <Field config={filedField} htmlFor="knowledge-filed" className={fieldSpacing}>
        <RecordPicker
          id="knowledge-filed"
          value={values.accountId}
          onChange={(accountId) => setValues((v) => ({ ...v, accountId }))}
          search={(term) => searchAccounts(term)}
          searchKey={pickerKey("accounts", teamId)}
          options={accountOptions.map(accountOption)}
          emptyOption={{ value: AGENCY, label: t("The agency's own") }}
          placeholder={t("The agency's own")}
          searchPlaceholder={t("Search accounts…")}
          emptyText={t("No account matched.")}
          disabled={busy}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          {t("Filing it under an account is how a question about them finds it first.")}
        </p>
      </Field>
      <Field config={visibilityField} htmlFor="knowledge-visibility" className={fieldSpacing}>
        {/* A MIRRORED source that is CURRENTLY private (nobody else has seen it
            yet) used to be shown here as "Anyone who can read the knowledge
            base" — a display coercion, because Radix has nothing to label a
            "private" value with when that item is not offered below, and
            "team" was picked as a harmless-looking fallback. It was not
            harmless: the trigger read as an open source that was, in fact,
            readable by nobody but its connector. Tracker `b-gmail`, caught by
            testing the actual door rather than trusting the screen — a real
            teammate, signed in as themselves, could not read a source this
            control displayed as "anyone can". Say the true word instead, and
            say why nothing here can change it — the state is a FACT about who
            has seen it (see the file header), never a choice this form makes
            for a mirrored source, so there is nothing to offer a control for. */}
        {mirrored && values.visibility === "private" ? (
          <div>
            <p className="text-sm">{t("Only me")}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("Who can read this follows who has already seen it — it isn't set here.")}
            </p>
          </div>
        ) : (
          <Select
            value={values.visibility}
            onValueChange={(visibility) =>
              setValues((v) => ({
                ...v,
                visibility:
                  visibility === "private" ? "private" : visibility === "app" ? "app" : "team",
              }))
            }
            disabled={busy}
          >
            <SelectTrigger id="knowledge-visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team">{t("Anyone who can read the knowledge base")}</SelectItem>
              {/* THE MIDDLE ANSWER (12.3). Offered only when this caller is on an
                  app, the door refuses any other, so a picker with nothing in it
                  would be an option that can only end in a refusal. */}
              {appOptions.length > 0 && (
                <SelectItem value="app">{t("Only the members on one app")}</SelectItem>
              )}
              {/* NOT OFFERED ON A MIRRORED SOURCE. See the file header — a choice
                  the next sweep silently erases is not a choice. (A mirrored
                  source already sitting at "private" never reaches this branch
                  at all — see above.) */}
              {!mirrored && <SelectItem value="private">{t("Only me")}</SelectItem>}
            </SelectContent>
          </Select>
        )}
        {/* No line at all when nobody has sighted it yet (sweep hasn't run since
            the fold-writer shipped, or never will for this kind) — the same
            "null means undrawn, not drawn empty" rule `sightingsLine`'s own
            comment states, so this form never says a new, unreviewed sentence
            about a state the rest of the app stays silent on too. */}
        {mirrored && sightingsLine({ sightingsCount: sightingsCount ?? 0 }, t) && (
          <p className="text-muted-foreground mt-1 text-xs">
            {sightingsLine({ sightingsCount: sightingsCount ?? 0 }, t)}
          </p>
        )}
      </Field>
      {values.visibility === "app" && (
        <Field config={appField} htmlFor="knowledge-app" className={fieldSpacing}>
          <RecordPicker
            id="knowledge-app"
            value={values.visibleToAppId}
            onChange={(visibleToAppId) => setValues((v) => ({ ...v, visibleToAppId }))}
            options={appOptions.map((a) => ({ value: a.id, label: a.name, picture: a.logoUrl }))}
            placeholder={t("Pick the app")}
            searchPlaceholder={t("Search apps…")}
            emptyText={t("No app matched.")}
            disabled={busy}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            {t("The staff on that app can read it, and so can an admin. Nobody else will see it, and the assistant will not answer anyone else from it.")}
          </p>
        </Field>
      )}
    </FormShellDialog>
  )
}
