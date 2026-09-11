// PART 2's screen half: a MIRRORED source used to offer "Only me" in the "Who
// can use it" select, the door wrote owner_user_id from it, and the very next
// Google sweep silently put it back (knowledge.ts's mirrored UPDATE branch —
// see that file's own comment). The fix removed the write; this locks that the
// CHOICE is gone too, because a form still offering a setting the door has
// quietly stopped honouring is the same lie in a different layer. What
// replaces it is the derived, read-only reach line — the true fact ("who has
// actually sighted this") standing in for the setting nobody can pick anymore.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { KnowledgeFormDialog } from "@/components/knowledge/knowledge-form-dialog"

afterEach(cleanup)

const noop = async () => {}

describe("KnowledgeFormDialog — a mirrored source's 'Only me' is gone, not just ineffective", () => {
  it("does not offer 'Only me' on a mirrored source, and shows the derived reach instead", async () => {
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={noop}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        mirrored
        sightingsCount={3}
        initial={{ title: "A mirrored source", visibility: "team", body: "", sourceUrl: "", accountId: "", visibleToAppId: "" }}
      />
    )
    fireEvent.click(screen.getByRole("combobox", { name: /who can use it/i }))
    expect(screen.queryByRole("option", { name: /only me/i })).toBeNull()
    expect(screen.getByText("Reached us through 3 people")).toBeTruthy()
  })

  it("still offers 'Only me' on an ordinary (non-mirrored) source", async () => {
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={noop}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={{ title: "A note", visibility: "team", body: "", sourceUrl: "", accountId: "", visibleToAppId: "" }}
      />
    )
    fireEvent.click(screen.getByRole("combobox", { name: /who can use it/i }))
    expect(screen.getByRole("option", { name: /only me/i })).toBeTruthy()
  })

  it("draws no reach line when nobody has sighted a mirrored source yet", () => {
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={noop}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        mirrored
        sightingsCount={0}
        initial={{ title: "A mirrored source", visibility: "team", body: "", sourceUrl: "", accountId: "", visibleToAppId: "" }}
      />
    )
    expect(screen.queryByText(/reached us/i)).toBeNull()
  })
})
