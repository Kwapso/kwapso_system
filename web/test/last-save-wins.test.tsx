// A LIVE PATCH ON A RECORD YOU ARE EDITING DOES NOT TOUCH WHAT YOU TYPED.
//
// The owner's ruling, 2026-09-07, verbatim: "I would just assume everything
// happens sequentially. If somebody just saves or clicks submit on an edit
// screen for the same record that I'm currently editing, I would technically
// hit the save button 1 or 2 seconds after them. Sequentially, I propagate the
// latest change, and that is what should be reflected."
//
// So: the other person's save lands as a row-level live patch (`patchRow`, the
// R1/R15 seam) and the ROW on screen moves to theirs; the FORM keeps the
// draft; nothing prompts; and when this person saves, the row is their draft.
// Last save wins, in the order the saves actually happened.
//
// THE MECHANISM IS `useFormDraft` (R7): it seeds from `initial` only on the
// inactive→active edge, never while the form is open, so a new `initial` from
// a patched row cannot reach the values. This file exists because nothing
// proved that — `use-form-draft.test.ts` covers restore/persist/clear, and a
// `useEffect(() => setValues(initial), [initial])` added to any one dialog
// tomorrow would quietly overwrite a person's typing with their colleague's
// and stay green. Rendered through a REAL dialog over a REAL cached read, so
// the whole path is under test: store → host → dialog → form.
//
// THE CANARY IS THE ROW. If the patch had not actually landed, "the input
// still holds my text" would be true of a broken store too — so the host
// renders the row beside the form, and the test insists the row moved.

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { clearCache, patchRow, primeCache, useCached } from "@shared/web/store"
import { RoleFormDialog } from "@/components/role-form-dialog"

vi.mock("@/lib/api", () => ({ ApiFailure: class extends Error {} }))

afterEach(() => {
  cleanup()
  clearCache()
  sessionStorage.clear()
})

type Role = { id: string; title: string; description: string | null }

const KEY = "roles:team-1"
const MINE: Role = { id: "r1", title: "Editor", description: "" }
const THEIRS: Role = { id: "r1", title: "Editor (renamed by a colleague)", description: "Their sentence." }

/** What a detail host does: read the collection, find the row by id, hand the
 * dialog `initial` off the row — so a patch re-renders the dialog with a NEW
 * `initial`, which is the exact moment a draft could be overwritten. */
function Host({ onSubmit }: { onSubmit: (title: string, description: string) => Promise<void> }) {
  const rolesQ = useCached<Role[]>(KEY, async () => [MINE])
  const role = rolesQ.data?.find((r) => r.id === "r1")
  const [open, setOpen] = React.useState(true)
  if (!role) return <p>no row</p>
  return (
    <>
      <p data-testid="row">{role.title}</p>
      <RoleFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={{ title: role.title, description: role.description ?? "" }}
        draftKey="role:edit:r1"
        onSubmit={onSubmit}
      />
    </>
  )
}

describe("last save wins — a live patch meets an open draft", () => {
  it("the row takes the colleague's save; the draft keeps mine; my save is what lands", async () => {
    primeCache(KEY, [MINE])
    const onSubmit = vi.fn(async () => {})
    render(<Host onSubmit={onSubmit} />)

    const input = (await screen.findByLabelText(/Role name/)) as HTMLInputElement
    expect(input.value).toBe("Editor")

    // I type.
    fireEvent.change(input, { target: { value: "Editor, as I want it" } })
    expect(input.value).toBe("Editor, as I want it")

    // A colleague saves the same record two seconds before me: the door
    // publishes, the listener patches the one row.
    await act(async () => {
      await patchRow(KEY, "id", "r1", async () => THEIRS as unknown as Record<string, unknown>)
    })

    // THE CANARY: the patch landed — the row on screen is theirs now.
    await waitFor(() => expect(screen.getByTestId("row").textContent).toBe(THEIRS.title))
    // …and the form did not flinch. Nothing prompted, nothing reset.
    expect(input.value).toBe("Editor, as I want it")
    expect(screen.queryByText(/changed|overwrite|reload|conflict/i)).toBeNull()

    // I save. What lands is my draft — the latest save, in order.
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith("Editor, as I want it", "")
  })

  it("a field I never touched still follows my draft, not the patch — the form saves as one record", async () => {
    // The colleague changed the description; I only changed the title. The
    // ruling is sequential, whole-record: my save carries the description the
    // form opened with, and theirs is replaced by it. No field-level merge —
    // that would be a third record neither of us wrote.
    primeCache(KEY, [MINE])
    const onSubmit = vi.fn(async () => {})
    render(<Host onSubmit={onSubmit} />)
    const input = (await screen.findByLabelText(/Role name/)) as HTMLInputElement
    fireEvent.change(input, { target: { value: "Mine" } })
    await act(async () => {
      await patchRow(KEY, "id", "r1", async () => THEIRS as unknown as Record<string, unknown>)
    })
    await waitFor(() => expect(screen.getByTestId("row").textContent).toBe(THEIRS.title))
    const description = screen.getByLabelText(/Description/) as HTMLTextAreaElement
    expect(description.value).toBe("")
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Mine", ""))
  })
})
