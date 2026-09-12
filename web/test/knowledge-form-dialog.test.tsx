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

  it("tracker b-gmail: a mirrored source that IS private says so, never 'anyone can read'", () => {
    // The bug: this used to coerce the trigger to show "Anyone who can read
    // the knowledge base" whenever a mirrored source's real value was
    // "private" (Radix has no item to label "private" with, once the "Only
    // me" option is gone) — a screen claiming a source was open that a real
    // teammate, tested against the live door, could not read. The fix says
    // the true word and why nothing here can change it, rather than guessing
    // a value Radix can render.
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={noop}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        mirrored
        sightingsCount={1}
        initial={{ title: "A fresh mail thread", visibility: "private", body: "", sourceUrl: "", accountId: "", visibleToAppId: "" }}
      />
    )
    expect(screen.getByText("Only me")).toBeTruthy()
    expect(
      screen.getByText("Who can read this follows who has already seen it — it isn't set here.")
    ).toBeTruthy()
    // No live control claiming a different, wrong state.
    expect(screen.queryByRole("combobox", { name: /who can use it/i })).toBeNull()
    expect(screen.queryByText(/anyone who can read the knowledge base/i)).toBeNull()
  })

  it("a mirrored source that is ALREADY team-readable keeps the real, working control", () => {
    // The fix must not widen the dropdown or touch team/app-scoped mirrored
    // sources — only the specific state that was lying gets replaced.
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
    expect(screen.getByRole("combobox", { name: /who can use it/i })).toBeTruthy()
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

// THE THREE STATES A PERSON SEES pasting a video link (owner's own words, 12
// Sep: "it will paste, show me it's loading, show me what kind of transcript
// it's extracting, and then tell me when it's done"). `createKnowledge`'s own
// warm-sentence composition and the toast it fires are use-screen-actions.ts's
// job, not this component's — these tests are about what THIS file owns: the
// button no longer refuses a bare video link, says something different while
// it waits, and a refusal from the door stays on screen rather than vanishing
// with the dialog.
describe("KnowledgeFormDialog — a video link's three states", () => {
  const base = { title: "", visibility: "team" as const, body: "", sourceUrl: "", accountId: "", visibleToAppId: "" }

  it("a bare video link does not disable submit, unlike an ordinary bare link", () => {
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={noop}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={base}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. how we handle/i), { target: { value: "A talk" } })
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://www.youtube.com/watch?v=abc123" },
    })
    expect((screen.getByRole("button", { name: /submit/i }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByText(/we'll read this video's captions or transcript/i)).toBeTruthy()

    // An ordinary page, same shape (a title, a bare link, no body), is still
    // refused — this app does not fetch arbitrary pages.
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://example.com/docs/handover" },
    })
    expect((screen.getByRole("button", { name: /submit/i }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/we don't open the page for you/i)).toBeTruthy()
  })

  it("says 'Reading the link…' while a video-link save is in flight, not 'Submitting…'", async () => {
    let resolveSubmit: () => void = () => {}
    const pending = new Promise<void>((r) => (resolveSubmit = r))
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={() => pending}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={base}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. how we handle/i), { target: { value: "A talk" } })
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://www.youtube.com/watch?v=abc123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    expect(await screen.findByText("Reading the link…")).toBeTruthy()
    expect(screen.queryByText("Submitting…")).toBeNull()
    resolveSubmit()
  })

  it("an ordinary save (no video link) still says 'Submitting…', unchanged", async () => {
    let resolveSubmit: () => void = () => {}
    const pending = new Promise<void>((r) => (resolveSubmit = r))
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={() => pending}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={{ ...base, body: "Some words already written here." }}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. how we handle/i), { target: { value: "A note" } })
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    expect(await screen.findByText("Submitting…")).toBeTruthy()
    resolveSubmit()
  })

  it("renders a refusal from the door verbatim and keeps the dialog open", async () => {
    const onOpenChange = () => {
      throw new Error("must not close the dialog on a refusal")
    }
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={async () => ({ refusedBecause: "We recognise this host, but it publishes no transcript." })}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={base}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. how we handle/i), { target: { value: "A talk" } })
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://www.youtube.com/watch?v=abc123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    expect(await screen.findByText("We recognise this host, but it publishes no transcript.")).toBeTruthy()
  })

  it("clears the refusal the moment the link changes, rather than describing the wrong URL", async () => {
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={async () => ({ refusedBecause: "We recognise this host, but it publishes no transcript." })}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={base}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. how we handle/i), { target: { value: "A talk" } })
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://www.youtube.com/watch?v=abc123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    await screen.findByText("We recognise this host, but it publishes no transcript.")
    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://www.youtube.com/watch?v=xyz789" },
    })
    expect(screen.queryByText("We recognise this host, but it publishes no transcript.")).toBeNull()
  })

  it("an ordinary successful submit still clears the draft and closes, unchanged", async () => {
    let closed = false
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={(o) => {
          if (!o) closed = true
        }}
        onSubmit={async () => {}}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={{ ...base, body: "Some words already written here." }}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. how we handle/i), { target: { value: "A note" } })
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    await Promise.resolve()
    await Promise.resolve()
    expect(closed).toBe(true)
  })
})
