"use client"

// ADD OR CORRECT ONE GLOSSARY WORD, the small form the Glossary tab's own
// "Add word"/edit actions open. A glossary entry is a knowledge source under
// the hood (kind "glossary", workers/content/src/lib/knowledge.ts), but it
// carries none of the generic form's own filing fields (an account, who may
// read it): a word is always team-wide, so this dialog asks only the two
// things that differ, the word and its definition. Same shape as every other
// dialog in the app: FormShellDialog, per-session draft (R4 + R7).

import * as React from "react"

import { DialogDescription, DialogTitle } from "@shared/ui/components/dialog/dialog"
import { Field } from "@shared/web/field"
import { FormShellDialog, fieldSpacing } from "@shared/web/form-shell"
import { Input } from "@shared/ui/components/input/input"
import { Textarea } from "@shared/ui/components/textarea/textarea"
import { toast } from "@shared/ui/components/sonner/sonner"
import { defaultFieldConfig } from "@shared/web/screen-engine/config"
import { TITLE_MAX_CHARS } from "@shared/types"

import { ApiFailure } from "@/lib/api"
import { useFormDraft } from "@shared/web/use-form-draft"
import { useLanguage } from "@shared/web/language"

// R87 (title-length, RULES.md): the word is a title-shaped field, so it reads
// the one shared ceiling, exactly as every other title field does.
const wordField = {
  ...defaultFieldConfig,
  label: "Word",
  required: true,
  validation: { ...defaultFieldConfig.validation, maxLength: TITLE_MAX_CHARS },
}
const definitionField = { ...defaultFieldConfig, label: "Definition", required: true }

export type GlossaryFormValues = { word: string; definition: string }

export function GlossaryFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initial,
  draftKey,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: GlossaryFormValues) => Promise<void>
  /** Present = EDIT mode (prefilled). */
  initial?: Partial<GlossaryFormValues>
  /** stable id for per-session draft persistence (CACHING.md §11); omit to disable */
  draftKey?: string
}) {
  const { t } = useLanguage()
  const isEdit = !!initial
  const [values, setValues, clearDraft] = useFormDraft(
    draftKey,
    { word: initial?.word ?? "", definition: initial?.definition ?? "" },
    open
  )
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({ word: values.word.trim(), definition: values.definition.trim() })
      clearDraft()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof ApiFailure
          ? err.message
          : isEdit
            ? t("Couldn't save this word.")
            : t("Couldn't add this word to the glossary.")
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
      title={<DialogTitle>{isEdit ? t("Correct this word") : t("Add a word")}</DialogTitle>}
      subtitle={
        <DialogDescription>
          {t(
            "Words and their definitions become part of the knowledge base: searchable here, and read by the assistant."
          )}
        </DialogDescription>
      }
      submit={{
        busy,
        disabled: !values.word.trim() || !values.definition.trim(),
      }}
    >
      <Field
        config={wordField}
        htmlFor="glossary-word"
        className={fieldSpacing}
        count={values.word.length}
        countMax={TITLE_MAX_CHARS}
      >
        <Input
          id="glossary-word"
          value={values.word}
          onChange={(e) => setValues((v) => ({ ...v, word: e.target.value }))}
          placeholder={t("e.g. Wave")}
          maxLength={TITLE_MAX_CHARS}
          disabled={busy}
          autoFocus
        />
      </Field>
      <Field config={definitionField} htmlFor="glossary-definition" className={fieldSpacing}>
        <Textarea
          id="glossary-definition"
          value={values.definition}
          onChange={(e) => setValues((v) => ({ ...v, definition: e.target.value }))}
          placeholder={t("Write it the way you would explain it to a new colleague.")}
          disabled={busy}
          className="min-h-32"
        />
      </Field>
    </FormShellDialog>
  )
}
