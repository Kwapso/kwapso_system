// AN OUTSIDE PERSON'S PHOTOGRAPH IS GREY; ONE OF OURS IS NOT. Aurora's
// ruling, 23 Sep 2026, verbatim: *"external photos (from contacts) gray scale.
// keep staff nirmal."* ("nirmal" is normal.)
//
// RENDERED, NOT READ. A source census would prove that the word `external`
// appears beside a mark, which is a different sentence from "a contact's face
// comes out grey and a colleague's does not". The two populations differ by
// one class on one element, and the only honest way to say which element got
// it is to mount the thing and look. jsdom cannot tell us what a filter LOOKS
// like — no layout, no paint — but it can tell us exactly which node carries
// the utility, which is the decision this ruling is about; the pixel is
// Tailwind's `filter: grayscale(100%)` and is not ours to re-test.
//
// AT FOUR CALL SITES, ON PURPOSE. The brief that commissioned this said a
// treatment applied in six of eight places is worse than none, because the two
// that are missed become the lie. So the proof walks the chain rather than the
// component: the mark itself, the two shared helpers every people-shaped
// screen draws through (`PeopleFaces`, `PersonCard`), and one REAL screen
// (`AppStakeholdersFields`, the client's own contacts on a system) where
// nothing is passed by the test at all and `external` has to survive four
// hops of the app's own wiring to arrive.
//
// AND THE NEGATIVE, WHICH IS THE HALF THAT CATCHES A LAZY FIX. A greyscale on
// the MARK rather than on the IMAGE would satisfy every positive assertion
// here and would also drain the mark's own fallback tile — so the staff cases
// and the initials case are asserted just as hard as the contact ones.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { PeopleFaces } from "@shared/web/people-faces"
import { PersonCard } from "@shared/web/person-card"
import { RecordMark } from "@shared/web/record-mark"
import { AppStakeholdersFields } from "@/components/apps/app-stakeholders-fields"
import { TicketThread } from "@shared/ui/components/ticket-thread/ticket-thread"
import { List } from "@shared/web/list-compat"
import { Select, SelectTrigger, SelectValue } from "@shared/ui/components/select/select"

const OURS = "https://cdn.example.com/aurora.jpg"
const THEIRS = "https://cdn.example.com/marta.jpg"

/* AUTO-CLEANUP IS OFF IN THIS REPO — vitest runs without `globals`, so
   testing-library never registers its own `afterEach`, and every suite here
   that renders says so itself. This file did not, and it cost two hours: the
   renders accumulated in one document, `imageFor` reached them with a bare
   `document.querySelector`, and two cases went GREEN while the thing they
   were meant to guard was deleted — they were reading a greyed <img> left
   behind by an earlier test. Both halves are fixed: the DOM is torn down
   between cases, AND the query below is scoped to the render that asked, so
   a leak can never satisfy an assertion again even if this line is dropped. */
afterEach(cleanup)

/** The `<img>` for `src`, WITHIN the container of the render that asked. The
 * marks are `aria-hidden` on purpose (record-mark.tsx: the name is always
 * beside them), so there is no accessible name to query by and the DOM is
 * read directly — but never from `document`, for the reason above. */
function imageIn(container: HTMLElement, src: string): HTMLImageElement {
  const img = container.querySelector<HTMLImageElement>(`img[src="${src}"]`)
  if (!img) throw new Error(`no <img> rendered for ${src} — the photograph never reached the page`)
  return img
}

describe("an external person's photograph is greyed, a staff photograph is not", () => {
  it("call site 1 — the mark itself: a contact's photograph carries grayscale, a colleague's does not", () => {
    const { container } = render(
      <>
        <RecordMark picture={OURS} name="Aurora" shape="round" />
        <RecordMark picture={THEIRS} name="Marta Bergman" shape="round" external />
      </>
    )
    expect(imageIn(container, THEIRS).className).toContain("grayscale")
    expect(imageIn(container, OURS).className).not.toContain("grayscale")
  })

  it("call site 1b — the greyscale rides the PHOTOGRAPH, never the mark's own box", () => {
    // If the filter sat on the box, it would also drain the fallback tile and
    // the kit's own accent fills wherever a caller pairs one with an outside
    // face. It must be on the <img> and nowhere above it.
    const { container } = render(<RecordMark picture={THEIRS} name="Marta Bergman" shape="round" external />)
    const img = imageIn(container, THEIRS)
    expect(img.className).toContain("grayscale")
    for (let node = img.parentElement; node && node !== container.parentElement; node = node.parentElement) {
      expect(node.className).not.toContain("grayscale")
    }
  })

  it("call site 1c — an INITIALS face is never greyed, whoever it belongs to (her word was \"photos\")", () => {
    const { container } = render(<RecordMark name="Marta Bergman" shape="round" external />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.innerHTML).not.toContain("grayscale")
    expect(container.textContent).toBe("M")
  })

  it("call site 2 — PeopleFaces: one row holding both populations greys exactly the right face", () => {
    // The case the treatment is FOR: a meeting's attendees are our people and
    // the client's, side by side in one cell. A row-level flag would have had
    // to choose one answer for the row; this is why the fact is per person.
    const { container } = render(
      <PeopleFaces
        people={[
          { key: "a", name: "Aurora", picture: OURS },
          { key: "m", name: "Marta Bergman", picture: THEIRS, external: true },
        ]}
      />
    )
    expect(imageIn(container, THEIRS).className).toContain("grayscale")
    expect(imageIn(container, OURS).className).not.toContain("grayscale")
  })

  it("call site 3 — PersonCard: the members wall stays in colour, a contact tile goes grey", () => {
    const { container } = render(
      <>
        <PersonCard picture={OURS} mark="AU" markName="Aurora" title={<span>Aurora</span>} />
        <PersonCard
          picture={THEIRS}
          mark="MB"
          markName="Marta Bergman"
          title={<span>Marta Bergman</span>}
          external
        />
      </>
    )
    expect(imageIn(container, THEIRS).className).toContain("grayscale")
    expect(imageIn(container, OURS).className).not.toContain("grayscale")
  })

  it("call site 4 — a real screen: every contact on a system's stakeholder checklist is grey, unasked", () => {
    // NOTHING HERE PASSES `external`. The checklist knows its own people are
    // the client's (that is the one thing the component is for), so the fact
    // is a constant inside it — and this assertion is what proves the wiring
    // survives from the door's `personLogoUrl` through two `.map`s and a
    // shared component, rather than proving the test remembered to say so.
    const { container } = render(
      <AppStakeholdersFields
        contacts={[{ id: "c1", name: "Marta Bergman", photo: THEIRS }]}
        lang="en"
        stakeholderContactIds={[]}
        onStakeholderContactIdsChange={() => {}}
        mainStakeholderContactId=""
        onMainStakeholderContactIdChange={() => {}}
      />
    )
    expect(screen.getAllByText("Marta Bergman").length).toBeGreaterThan(0)
    expect(imageIn(container, THEIRS).className).toContain("grayscale")
  })

  it("call site 4b — and the photograph reaches that screen at all (R111's half of the same pixel)", () => {
    // The checklist drew a letter tile for every contact until 23 Sep 2026,
    // because both callers flattened `AccountLink.personLogoUrl` away before
    // it arrived. Greyscale on a face that is never drawn is nothing at all,
    // so the two rulings are asserted over the same render.
    const { container } = render(
      <AppStakeholdersFields
        contacts={[{ id: "c1", name: "Marta Bergman", photo: THEIRS }]}
        lang="en"
        stakeholderContactIds={[]}
        onStakeholderContactIdsChange={() => {}}
        mainStakeholderContactId=""
        onMainStakeholderContactIdChange={() => {}}
      />
    )
    expect(container.querySelector(`img[src="${THEIRS}"]`)).not.toBeNull()
  })

  // ── THE KIT ROUTE, unblocked by v1.2.166 ─────────────────────────────────
  //
  // Everything above goes through `RecordMark`, which is the APP's own mark.
  // A face can also reach the screen through the VENDORED kit — a ticket
  // thread's bubble, a choice's face, a list row's well — and until the tag
  // landed those routes had no way to be told whose face they held. These two
  // mount the vendored components directly, so a future re-vendor that drops
  // the prop fails here rather than silently un-greying a whole surface.

  it("call site 5 — the ticket thread: a client's bubble is grey, ours is not", () => {
    const { container } = render(
      <TicketThread
        messages={[
          { id: "1", side: "theirs", author: "Marta Bergman", initials: "MB", image: THEIRS, external: true },
          { id: "2", side: "mine", author: "Aurora", initials: "AU", image: OURS },
        ]}
      />
    )
    expect(imageIn(container, THEIRS).className).toContain("grayscale")
    expect(imageIn(container, OURS).className).not.toContain("grayscale")
  })

  it("call site 6 — a kit list row can be told, through the app's one translation seam", () => {
    // `list-compat.tsx` is the ONE place the app's list contract meets the
    // kit's. No caller passes `external` today (both `image` sites are a
    // team's logo), so this asserts the SEAM rather than a screen: a fact
    // handed in at the app's contract arrives at the kit's Avatar.
    const { container } = render(
      <List
        items={[
          { id: "a", image: OURS, initials: "AU", title: "Aurora" },
          { id: "m", image: THEIRS, initials: "MB", title: "Marta Bergman", external: true },
        ]}
      />
    )
    expect(imageIn(container, THEIRS).className).toContain("grayscale")
    expect(imageIn(container, OURS).className).not.toContain("grayscale")
  })

  it("call site 7 — a choice's TRIGGER: the chosen contact stays grey once the list shuts", () => {
    // THE HALF THAT COULD SILENTLY REGRESS. R90 made a picker show the chosen
    // record's face in the trigger as well as the open list; if `external`
    // rode the ITEM instead of the FACE, a contact would be grey while the
    // list was open and turn colour the instant it closed — which is worse
    // than never treating it, because the face would be telling two different
    // stories about one person seconds apart. This is the closed trigger.
    const { container } = render(
      <Select>
        <SelectTrigger face={{ src: THEIRS, name: "Marta Bergman", external: true }}>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
      </Select>
    )
    expect(imageIn(container, THEIRS).className).toContain("grayscale")
  })

  it("call site 7b — and a STAFF face in the same trigger is not greyed", () => {
    const { container } = render(
      <Select>
        <SelectTrigger face={{ src: OURS, name: "Aurora" }}>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
      </Select>
    )
    expect(imageIn(container, OURS).className).not.toContain("grayscale")
  })

  it("a contact with NO photograph draws the same tile a colleague with none draws", () => {
    // The fallback is the app's own token pair (`bg-muted`), not this person's
    // colours, so there is nothing of theirs to desaturate. Two marks, one
    // external, identical ink.
    const ours = render(<RecordMark name="Aurora" shape="round" />).container.firstElementChild?.className
    cleanup()
    const theirs = render(<RecordMark name="Aurora" shape="round" external />).container.firstElementChild?.className
    expect(theirs).toBe(ours)
  })
})
