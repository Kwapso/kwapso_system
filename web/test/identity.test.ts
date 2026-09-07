import { describe, expect, it } from "vitest"

import { letterMark, personInitials, personName } from "@/lib/identity"

// R54, 7 Sep 2026. This block used to assert `joins "First Last"`, and that was
// the right answer right up until the client's ruling: "when it's staff who
// records activity, only use the first name, so not Audora Alasa, only Audora."
//
// `personName` NAMES STAFF AND ONLY STAFF, which is why the whole expectation
// moved rather than the trim being pushed out to the call sites. It takes a
// `StaffIdentity` — the `first_name`/`last_name`/`email` triple the global
// `users` table holds — and every one of its callers hands it a `TeamMember` or
// the signed-in viewer: the profile menu, the profile screen, the app shell, the
// team roster, the deep-link crumbs and shapes, the change-role and remove
// panels, and `assignableMembers`. A CONTACT OR A CUSTOMER CANNOT REACH IT: they
// are `accounts` rows of type `individual` with a single `name` column and no
// first/last pair at all, and they travel as `AccountLink.personName` — a
// STRING FIELD that shares this function's spelling and none of its code.
describe("personName", () => {
  it("answers the FIRST NAME alone", () => {
    expect(personName({ firstName: "Alaap", lastName: "Kanchwala" })).toBe("Alaap")
  })

  it("keeps a two-word given name whole", () => {
    // The structured path is the EXACT one. `staffNameFromSnapshot` reads a
    // joined string and has to guess where the given name ended, so it answers
    // "Mary" here and loses "Jane"; this reads `first_name` as one field and
    // cannot make that mistake. It is why there are two functions in the seam.
    expect(personName({ firstName: "Mary Jane", lastName: "Watson" })).toBe("Mary Jane")
  })

  it("uses just the part it has when one name is missing", () => {
    expect(personName({ firstName: "Alaap", lastName: null })).toBe("Alaap")
    // A surname and no given name is not the ruling being bent: this person has
    // exactly ONE name on file, and showing it beats showing their email to
    // everybody. It is still one name, never "name and surname".
    expect(personName({ firstName: null, lastName: "Kanchwala" })).toBe("Kanchwala")
  })

  it("falls back to email when there is no name", () => {
    expect(personName({ firstName: null, lastName: null, email: "a@x.com" })).toBe("a@x.com")
  })

  it('returns "" when there is neither a name nor an email', () => {
    expect(personName({ firstName: null, lastName: null, email: null })).toBe("")
    expect(personName({})).toBe("")
  })
})

describe("personInitials", () => {
  it('builds two-letter initials uppercased ("AK")', () => {
    expect(personInitials("alaap", "kanchwala")).toBe("AK")
  })

  it('returns "?" when blank/unknown', () => {
    expect(personInitials(null, null)).toBe("?")
    expect(personInitials(undefined, undefined)).toBe("?")
    expect(personInitials("", "")).toBe("?")
  })
})

describe("letterMark", () => {
  it('returns the first letter uppercased ("A")', () => {
    expect(letterMark("acme")).toBe("A")
  })

  it('returns "?" when blank/undefined', () => {
    expect(letterMark("")).toBe("?")
    expect(letterMark(null)).toBe("?")
    expect(letterMark(undefined)).toBe("?")
  })
})
