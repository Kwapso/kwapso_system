// THE SCOPE PICKER, WORD FOR WORD. Design D's own copy — carried over from
// the artifact this feature was built from
// (https://claude.ai/code/artifact/8d4b7c6e-639d-4776-a3d9-337ae7e957d5,
// "Section 1 · Your pick") — is the whole point of this surface, so this
// reads the rendered text rather than trusting the component's own claim to
// have copied it. Also locks the task's own rule: no current record, no
// "This record" row.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AgentScopePicker } from "@/components/assistant/agent-scope-picker"
import type { AgentTabScope } from "@/lib/agent-conversation-tabs"

afterEach(cleanup)

describe("AgentScopePicker", () => {
  it("draws the exact title and all three rows when a record is open", () => {
    render(<AgentScopePicker hasRecord onPick={vi.fn()} />)
    expect(screen.getByText("What should this conversation read?")).toBeTruthy()
    expect(screen.getByText("This record")).toBeTruthy()
    expect(screen.getByText("Picks up the record you're viewing")).toBeTruthy()
    expect(screen.getByText("Knowledge")).toBeTruthy()
    expect(screen.getByText("Articles and indexed files")).toBeTruthy()
    expect(screen.getByText("Everything")).toBeTruthy()
    expect(screen.getByText("All six sources, untick later")).toBeTruthy()
  })

  it("hides \"This record\" when there is nothing to point it at", () => {
    render(<AgentScopePicker hasRecord={false} onPick={vi.fn()} />)
    expect(screen.queryByText("This record")).toBeNull()
    // The other two still draw — the task's rule is narrow, about ONE row.
    expect(screen.getByText("Knowledge")).toBeTruthy()
    expect(screen.getByText("Everything")).toBeTruthy()
  })

  it("each row hands back its own scope, exactly once", () => {
    const picks: AgentTabScope[] = []
    render(<AgentScopePicker hasRecord onPick={(s) => picks.push(s)} />)
    fireEvent.click(screen.getByText("This record"))
    fireEvent.click(screen.getByText("Knowledge"))
    fireEvent.click(screen.getByText("Everything"))
    expect(picks).toEqual(["record", "knowledge", "everything"])
  })
})
