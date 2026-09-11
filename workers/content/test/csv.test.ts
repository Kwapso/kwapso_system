// The CSV builder behind the export endpoints. The one thing that must never
// break: quoting — a title like `Say "hi", then wait` or a multi-line body must
// survive Excel and round-trip back through the CSV importer.

import { describe, expect, it } from "vitest"

import { csvResponse, parseCsv, toCsv } from "@shared/workers/csv"

describe("toCsv — RFC-4180 quoting", () => {
  it("quotes commas, quotes and newlines; doubles internal quotes", () => {
    const csv = toCsv(
      ["title", "body"],
      [
        ['Say "hi", then wait', "line one\nline two"],
        ["plain", null],
      ]
    )
    expect(csv).toContain("title,body")
    expect(csv).toContain('"Say ""hi"", then wait"') // quotes doubled, field quoted
    expect(csv).toContain('"line one\nline two"') // newline stays INSIDE the quoted field
    expect(csv).toContain("plain,") // null → empty field, unquoted plain text stays bare
  })

  it("opens with a UTF-8 BOM and ends rows CRLF (Excel-safe)", () => {
    const csv = toCsv(["a"], [["x"]])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.endsWith("\r\n")).toBe(true)
  })

  it("renders booleans as yes/no (the human-readable active column)", () => {
    expect(toCsv(["active"], [[true], [false]])).toContain("yes\r\nno")
  })

  it("neutralizes formula-injection (a value a spreadsheet would execute)", () => {
    // A user-controlled role description of `=HYPERLINK(...)` must NOT run in Excel —
    // it's prefixed with the text-literal apostrophe (which Excel hides on display).
    const csv = toCsv(["description"], [["=HYPERLINK(\"http://evil\",\"x\")"], ["-2+3"], ["@SUM(A1)"], ["safe"]])
    expect(csv).toContain(`"'=HYPERLINK`) // quoted (has a comma) + leading '
    expect(csv).toContain("'-2+3")
    expect(csv).toContain("'@SUM(A1)")
    expect(csv).toContain("safe") // a normal value is untouched
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m) // never a bare leading =
  })

  it("csvResponse sets the download headers", () => {
    const res = csvResponse("learning.csv", "a\r\n")
    expect(res.headers.get("Content-Type")).toContain("text/csv")
    expect(res.headers.get("Content-Disposition")).toContain('filename="learning.csv"')
  })
})

// MOVED HERE from workers/data-ops (its own import reader) so
// workers/content's knowledge sheet grain can use the same parser — a
// worker's own src/lib is not shared across workers, this file already is.
describe("parseCsv — the other direction, RFC-4180-ish", () => {
  it("splits the header from the rows, trimming header whitespace", () => {
    expect(parseCsv("Client, Plan\nAcme,Pro\nBergman,Starter\n")).toEqual({
      headers: ["Client", "Plan"],
      rows: [
        ["Acme", "Pro"],
        ["Bergman", "Starter"],
      ],
    })
  })

  it("handles quoted fields with embedded commas, newlines, and doubled quotes", () => {
    const csv = 'Name,Note\n"Say ""hi""","line one\nline two"\n'
    expect(parseCsv(csv)).toEqual({
      headers: ["Name", "Note"],
      rows: [['Say "hi"', "line one\nline two"]],
    })
  })

  it("strips a leading UTF-8 BOM and tolerates CRLF line endings", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n")).toEqual({ headers: ["a", "b"], rows: [["1", "2"]] })
  })

  it("flushes a trailing row with no final newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual({ headers: ["a", "b"], rows: [["1", "2"]] })
  })

  it("drops fully-blank trailing lines rather than filing an empty row", () => {
    expect(parseCsv("a,b\n1,2\n\n\n")).toEqual({ headers: ["a", "b"], rows: [["1", "2"]] })
  })
})
