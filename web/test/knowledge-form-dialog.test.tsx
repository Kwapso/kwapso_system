// PART 2's screen half: a MIRRORED source used to offer "Only me" in the "Who
// can use it" select, the door wrote owner_user_id from it, and the very next
// Google sweep silently put it back (knowledge.ts's mirrored UPDATE branch —
// see that file's own comment). The fix removed the write; this locks that the
// CHOICE is gone too, because a form still offering a setting the door has
// quietly stopped honouring is the same lie in a different layer. What
// replaces it is the derived, read-only reach line — the true fact ("who has
// actually sighted this") standing in for the setting nobody can pick anymore.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

// THE THEATRICAL NARRATION (owner's own ask, 12 Sep) AND ITS ONE CONDITION:
// a predicted step that keeps claiming progress after the request has died
// is what turns this from delightful into a lie. These two shapes — the
// honesty timeout, and a settle that must stop the narration immediately —
// are the whole point of the feature, per the hub's own brief, so they are
// the two mutation-proved here rather than merely asserted once.
describe("KnowledgeFormDialog — the video-link narration's honesty condition", () => {
  const videoBase = {
    title: "A talk",
    visibility: "team" as const,
    body: "",
    sourceUrl: "https://www.youtube.com/watch?v=abc123",
    accountId: "",
    visibleToAppId: "",
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  async function settle(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  it("advances through the predicted steps while the request is still running", async () => {
    const pending = new Promise<void>(() => {}) // never resolves for this test
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={() => pending}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={videoBase}
      />
    )
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    })
    // Step 0 ("Reading the link…") is the button's own label, not drawn a
    // second time here — see the component's own comment on that branch.
    expect(screen.queryByText("Making sense of what it says…")).toBeNull()
    await settle(1200)
    expect(screen.getByText("Making sense of what it says…")).toBeTruthy()
    await settle(1200)
    expect(screen.getByText("Almost done…")).toBeTruthy()
  })

  // THE HONESTY BOUND, MUTATION-PROVED. If this fires before the real
  // request has died, or never fires at all, a person is left staring at
  // "Almost done…" for ever — the exact "spinner that lies" the owner named
  // as the one unacceptable outcome.
  it("stops advancing and names the wait once the honesty bound is crossed", async () => {
    const pending = new Promise<void>(() => {})
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={() => pending}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={videoBase}
      />
    )
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    })
    await settle(14_999)
    expect(screen.queryByText("This is taking longer than it should.")).toBeNull()
    await settle(1)
    expect(screen.getByText("This is taking longer than it should.")).toBeTruthy()
    // STOPS ADVANCING: once crossed, later timers firing (there are none left
    // to fire, but time itself keeps moving) must not un-cross it or swap the
    // sentence back to a predicted step.
    await settle(60_000)
    expect(screen.getByText("This is taking longer than it should.")).toBeTruthy()
  })

  // THE FAILURE PATH, MUTATION-PROVED. A request that dies must land on the
  // truth immediately, not finish its predicted dance first — the owner's
  // own words, "if there is some infinite delay or failure, you can catch
  // that, then that's fine," name failure and the endless case in the same
  // breath, and this is the failure half of that sentence.
  it("a refusal lands immediately and clears the narration, even mid-step", async () => {
    let resolveSubmit: (v: { refusedBecause: string }) => void = () => {}
    const pending = new Promise<{ refusedBecause: string }>((r) => (resolveSubmit = r))
    render(
      <KnowledgeFormDialog
        open
        onOpenChange={noop as unknown as (open: boolean) => void}
        onSubmit={() => pending}
        teamId="T1"
        accountOptions={[]}
        appOptions={[]}
        initial={videoBase}
      />
    )
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    })
    await settle(1200)
    expect(screen.getByText("Making sense of what it says…")).toBeTruthy()
    await act(async () => {
      resolveSubmit({ refusedBecause: "We recognise this host, but it publishes no transcript." })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByText("We recognise this host, but it publishes no transcript.")).toBeTruthy()
    expect(screen.queryByText("Making sense of what it says…")).toBeNull()
    // AND THE REFUSAL KEEPS WINNING, however long the clock runs afterwards:
    // a stray timer firing late (this request's, or a future one's) must
    // never resurrect the timeout sentence over the real one the person is
    // now reading — proof the refusal's priority in the render holds, not
    // just true the instant it lands.
    await settle(60_000)
    expect(screen.queryByText("This is taking longer than it should.")).toBeNull()
    expect(screen.getByText("We recognise this host, but it publishes no transcript.")).toBeTruthy()
  })
})
