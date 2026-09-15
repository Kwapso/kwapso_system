// R78 — STAFF IS PICKED FROM A PILL ROW, NEVER A DROPDOWN.
//
// The client's ruling, 15 Sep 2026, verbatim: "On Add Task and generally
// absolutely everywhere where we are selecting staff, do the horizontal
// choices, not the dropdown. By default, in all of these where I'm selecting
// staff, always put the user preselected by default." The second half (the
// default) is a per-form correctness question no static census can prove —
// it is checked at each call site instead (`StoryFormDialog`'s own
// `defaultAssigneeId`, `AppFormDialog`'s `defaultStaffUserId`, and so on).
// This law is the first half, held structurally: a STAFF/MEMBER list may
// never reach a dropdown-shaped control again, on either front door.
//
// THE ONE WAY IN. `shared/web/staff-pill-picker.tsx`'s `StaffPillPicker` is
// the only control a staff/member list may feed — `role="radiogroup"` for a
// single pick, `role="group"` + `aria-pressed` for many, both plain buttons
// in a wrapping row, never a Popover/Command/Select. Every dropdown that used
// to take a staff list (task/story assignee, account manager, an app's staff
// + lead, a ticket's stakeholders, triage duty) reads through it now.
//
// THE CENSUS, OFF THE DISK, DERIVED LIKE EVERY OTHER LAW HERE. Two things
// have to both be found in the same JSX element for a finding: (a) the
// element is a dropdown-shaped control — literally `<Select` (the kit's own,
// still legitimately fed a team's OTHER vocabularies: countries, industries,
// ticket types) or `<RecordPicker` NOT carrying `layout="row"` (`layout="row"`
// already draws the identical bare-button pill row this law asks for — R78's
// prose above is silent on it because there is nothing left to fix, not
// because the census cannot see it: `record-picker.tsx`'s row layout was
// never a Select-shaped mount, so it was never IN this law's population in
// the first place); and (b) a STAFF/MEMBER list reaches it — either a direct
// call inside the tag (`useAssignableMembers(`/`assignableMembers(`/
// `staffedOn(`), or a variable the file itself built from one of those three,
// or a value typed `PickablePerson[]` (a prop, a param, a local) — referenced
// by name inside the same tag. `RecordPicker` is deliberately IN the
// population despite not being literally named `<Select>`/`<Combobox>`: its
// default/`control` layout IS the Popover+Command combobox the client's
// ruling means by "the dropdown" (its own header calls it exactly that), so a
// census that only caught the kit's bare `<Select>` would pass the very shape
// the ruling was about.
//
// A WORD ON WHAT THIS DOES NOT CLAIM. The scanner below is text-based, like
// every other derived census in this file family (`tab-strips-pin.test.ts`,
// `alphabetical-options.test.ts`), and reads TWO shapes because the two
// mounts build their rows two different ways: `RecordPicker`/`Combobox` are
// self-closing single-element controls (`options={…}` on the one tag), so
// their slice runs from the mount's own `<` to the `>` closing that opening
// tag, stepping over `{…}` expressions so a nested element inside a prop (an
// `icon={<Foo/>}`) cannot end it early; `<Select>` is a COMPOUND component —
// every real call site builds its rows as CHILDREN (`SelectContent` ›
// `.map()` › `SelectItem`), never as a prop on `<Select>` itself — so its
// slice runs to the matching `</Select>` instead (`elementSlice`, below). It
// is not a type-checker — a staff list smuggled through an `as any` or a
// differently-named local this census's three producers cannot trace would
// not be caught — but every real call site in the app today is one of the
// three shapes above (see `web/lib/members.ts`'s own header: "a rule copied
// nine times is a rule that holds eight times", the same argument this
// census is built to enforce
// structurally rather than trust to memory).

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { STAFF_PILL_ROW_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

/** A dropdown-shaped mount this law holds to account — see the header for why
 * `RecordPicker` is in scope and `layout="row"` is not. */
const MOUNT = /<(Select|Combobox|RecordPicker)\b/g

const ROW_LAYOUT = /layout\s*=\s*\{?["']row["']\}?/

/** The three seams `web/lib/members.ts` supplies a staff/member list through —
 * called directly inside a mount's own tag, or bound to a local this file
 * then references by name (see `memberVarNames` below). */
const MEMBER_PRODUCER_CALL = /\b(?:useAssignableMembers|assignableMembers|staffedOn)\s*\(/

const MEMBER_PRODUCER_BINDING =
  /\bconst\s+(\w+)\s*=\s*(?:useAssignableMembers|assignableMembers|staffedOn)\s*\(/g

/** A local, prop or param this file itself declared as `PickablePerson[]` —
 * the type every staff-list producer above returns (`web/lib/members.ts`),
 * so a value threaded through a prop rather than read from the hook directly
 * (`StoryFormDialog`'s own `members: PickablePerson[]`) is still traceable. */
const TYPED_MEMBER_LIST = /(\w+)\s*(?:\?)?\s*:\s*PickablePerson\[\]/g

/** Every name in `src` a staff/member list could be sitting in — the union of
 * both binding shapes above, deduplicated. */
function memberVarNames(src: string): string[] {
  const names = new Set<string>()
  for (const m of src.matchAll(MEMBER_PRODUCER_BINDING)) names.add(m[1])
  for (const m of src.matchAll(TYPED_MEMBER_LIST)) names.add(m[1])
  return [...names]
}

/** The substring from a mount's own `<` to the `>` closing its opening tag —
 * stepping over `{…}` so a nested element inside a prop expression cannot
 * end the scan early (the same shape `tab-strips-pin.test.ts`'s own census
 * needs none of, because a `<TabsView` mount's attributes never nest another
 * element the way `icon={<Foo/>}` can here). Self-closing (`/>`) and open
 * (`>`) tags both end on the first `>` at brace depth 0. */
function tagSlice(src: string, start: number): string {
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (ch === "{") depth++
    else if (ch === "}") depth--
    else if (ch === ">" && depth === 0) return src.slice(start, i + 1)
  }
  return src.slice(start)
}

/** `<Select` is a COMPOUND component in this app (`Select` › `SelectContent`
 * › `SelectItem`), and every real call site builds its rows as CHILDREN — a
 * `.map()` over `SelectItem` inside `<SelectContent>` — never as a single
 * `options=` prop the way `RecordPicker`/`Combobox` take one. So a `Select`
 * mount's own SLICE has to reach its closing `</Select>`, not merely its
 * opening tag (`tagSlice` above, still exact for `RecordPicker`/`Combobox`,
 * which this codebase always writes self-closing with every option on the
 * one element). No nesting handling: nothing in this app nests one `<Select>`
 * inside another. */
function elementSlice(src: string, start: number, tagName: string): string {
  if (tagName !== "Select") return tagSlice(src, start)
  const close = `</${tagName}>`
  const closeIdx = src.indexOf(close, start)
  return closeIdx === -1 ? tagSlice(src, start) : src.slice(start, closeIdx + close.length)
}

type Finding = { rel: string; mount: string; tag: string }

/** The index of the character that CLOSES `openCh` opened at `openIdx`,
 * counting nested pairs — `(`/`)` for a call's own argument list, `{`/`}`
 * for a block body. -1 if `src` runs out first. */
function matchClose(src: string, openIdx: number, openCh: string, closeCh: string): number {
  let depth = 0
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === openCh) depth++
    else if (src[i] === closeCh) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** THE INDIRECTION THIS LAW MOST NEEDS TO SEE THROUGH. Both this repo's real
 * `task-form-dialog.tsx` and `story-form-dialog.tsx` built their assignee
 * field through a LOCAL FACTORY — `const picker = (id, value, …, options,
 * set) => (<RecordPicker … options={options} … />)` — so the `<RecordPicker>`
 * JSX itself never mentions "members" at all; it mentions its own parameter,
 * `options`. A per-mount scan of the tag alone is blind to this by
 * construction, which is exactly the shape this repo shipped with the day
 * this law was written — caught only by writing this second pass and proving
 * it against the real files, not assumed to be unnecessary.
 *
 * So: find every `const NAME = (params) => body` in the file whose BODY
 * contains a dropdown-shaped mount (the same `MOUNT`/`ROW_LAYOUT` rule as
 * the direct pass), then find every CALL `NAME(...)` elsewhere in the file
 * and ask whether a staff/member-source name appears as a whole word in
 * THAT CALL's own argument list — the caller's evidence, since the callee's
 * own tag never carries it. */
function helperFindings(src: string, rel: string, varNames: string[]): Finding[] {
  const out: Finding[] = []
  const defRe = /\bconst\s+(\w+)\s*=\s*\(/g
  const wrapping = new Map<string, { mount: string }>()
  for (const m of src.matchAll(defRe)) {
    const name = m[1]
    const parenStart = m.index + m[0].length - 1
    const parenEnd = matchClose(src, parenStart, "(", ")")
    if (parenEnd === -1) continue
    const afterParams = src.slice(parenEnd + 1, parenEnd + 400)
    const arrow = /^\s*(?::[^=]+)?=>\s*/.exec(afterParams)
    if (!arrow) continue
    const bodyStart = parenEnd + 1 + arrow[0].length
    const bodyChar = src[bodyStart]
    let bodyEnd: number
    if (bodyChar === "(") bodyEnd = matchClose(src, bodyStart, "(", ")")
    else if (bodyChar === "{") bodyEnd = matchClose(src, bodyStart, "{", "}")
    else bodyEnd = Math.min(src.length - 1, bodyStart + 1500) // bare-expression body: a generous cap
    if (bodyEnd === -1) continue
    const body = src.slice(bodyStart, bodyEnd + 1)
    // A FRESH, non-global regex literal here on purpose: `MOUNT` carries the
    // `g` flag for the `matchAll` iterations elsewhere in this file, and a
    // global regex's `.test()`/`.exec()` carries `lastIndex` between calls —
    // reusing `MOUNT` itself here left `lastIndex` wherever the PREVIOUS
    // helper body's match ended, and cost the census real files (measured:
    // running this against `task-form-dialog.tsx` alone found its `picker`
    // helper; running the full `web/` walk first, then this file, missed it,
    // because a bare `.test()` two files earlier had walked `lastIndex` past
    // where this body's own match sits).
    const mountMatch = /<(Select|Combobox|RecordPicker)\b/.exec(body)
    if (!mountMatch) continue
    if (mountMatch[1] === "RecordPicker" && ROW_LAYOUT.test(body)) continue // the compliant pill row
    wrapping.set(name, { mount: mountMatch[1] })
  }
  if (wrapping.size === 0) return out
  for (const [name, { mount }] of wrapping) {
    // Every CALL of the helper — `name(`. The DEFINITION line reads
    // `name = (`, an `=` between the identifier and the paren that `\s*\(`
    // cannot cross, so it never matches here and needs no separate exclusion.
    const callRe = new RegExp(`\\b${name}\\s*\\(`, "g")
    for (const c of src.matchAll(callRe)) {
      const argStart = c.index + c[0].length - 1
      const argEnd = matchClose(src, argStart, "(", ")")
      if (argEnd === -1) continue
      const args = src.slice(argStart, argEnd + 1)
      if (varNames.some((v) => new RegExp(`\\b${v}\\b`).test(args))) {
        out.push({ rel, mount, tag: args })
      }
    }
  }
  return out
}

/** Every `<Select`/`<Combobox`/non-row `<RecordPicker` mount, on either front
 * door, whose own element (or, indirectly, its own local FACTORY's caller —
 * see `helperFindings`) feeds it a staff/member list — the population this
 * law holds to account. */
function findings(): Finding[] {
  const files = sourceFiles([join(ROOT, "web"), join(ROOT, "web-portal")], {
    extensions: [".tsx"],
    relativeTo: ROOT,
    skipTests: true,
  })
  const out: Finding[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    const varNames = memberVarNames(src)
    for (const m of src.matchAll(MOUNT)) {
      const tag = elementSlice(src, m.index, m[1])
      if (m[1] === "RecordPicker" && ROW_LAYOUT.test(tag)) continue // the compliant pill row
      const fed =
        MEMBER_PRODUCER_CALL.test(tag) || varNames.some((name) => new RegExp(`\\b${name}\\b`).test(tag))
      if (fed) out.push({ rel: f.rel, mount: m[1], tag })
    }
    out.push(...helperFindings(src, f.rel, varNames))
  }
  return out
}

/** The law itself, as a pure function of the findings and the exemption table
 * — so the mutation proof below exercises it against a synthetic fixture
 * without touching a real file. */
function offenders(found: Finding[], exempt: Record<string, string>): string[] {
  return found.filter((f) => !(f.rel in exempt)).map((f) => `${f.rel} (<${f.mount}>)`)
}

describe("R78 — staff is picked from a pill row, never a dropdown", () => {
  it("staff-pill-row: no <Select>/<Combobox>/non-row <RecordPicker> in web/ or web-portal/ is fed a staff/member list", () => {
    const found = findings()
    const bad = offenders(found, STAFF_PILL_ROW_EXEMPT)
    expect(
      bad,
      "these mounts feed a staff/member list to a dropdown-shaped control instead of " +
        "shared/web/staff-pill-picker.tsx's StaffPillPicker (R78):\n  " + bad.join("\n  ")
    ).toEqual([])
  })

  it("staff-pill-row: STAFF_PILL_ROW_EXEMPT can only shrink — every line excuses a real, still-failing mount", () => {
    const found = findings()
    const stale = Object.keys(STAFF_PILL_ROW_EXEMPT).filter(
      (rel) => !found.some((f) => f.rel === rel)
    )
    expect(
      stale,
      "STAFF_PILL_ROW_EXEMPT names a file with no offending mount any more — delete the line:\n  " +
        stale.join("\n  ")
    ).toEqual([])
  })

  // PROVE THE CHECK CAN FAIL, the same discipline every derived census in
  // this base is held to — against a SYNTHETIC fixture, never a real file, so
  // this proof needs no disk mutation and cannot itself go stale as the app's
  // own files change.
  it("staff-pill-row: the census is provably not vacuous", () => {
    const compliantPillRow =
      '<StaffPillPicker mode="single" people={assignableMembers(m)} lang={lang} value={v} onValueChange={f} />'
    const compliantRowLayout =
      '<RecordPicker layout="row" ariaLabel={t("Who is picking this up?")} value="" onChange={accept} options={peopleOptions} />'
    const compliantUnrelatedSelect =
      '<Select value={country} onValueChange={setCountry}><SelectContent>{countries.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>'
    const offendingSelect =
      "<Select value={assigneeId} onValueChange={setAssigneeId}><SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>"
    const offendingRecordPicker =
      '<RecordPicker id="task-assignee" value={assigneeId} onChange={setAssigneeId} options={members.map(asOption)} />'

    const src = (mount: string) =>
      `function Fixture() { const members = useAssignableMembers(teamId); return ${mount} }`

    // findings() itself reads real disk; this drives the same regex objects
    // (MOUNT/ROW_LAYOUT/MEMBER_PRODUCER_CALL/memberVarNames/elementSlice) over
    // an in-memory string instead, so the proof needs no fixture files.
    const scan = (source: string): Finding[] => {
      const out: Finding[] = []
      const varNames = memberVarNames(source)
      for (const m of source.matchAll(MOUNT)) {
        const tag = elementSlice(source, m.index, m[1])
        if (m[1] === "RecordPicker" && ROW_LAYOUT.test(tag)) continue
        const fed =
          MEMBER_PRODUCER_CALL.test(tag) || varNames.some((n) => new RegExp(`\\b${n}\\b`).test(tag))
        if (fed) out.push({ rel: "fixture", mount: m[1], tag })
      }
      return out
    }

    expect(scan(src(compliantPillRow))).toEqual([])
    expect(scan(src(compliantRowLayout))).toEqual([])
    expect(scan(src(compliantUnrelatedSelect))).toEqual([])
    expect(scan(src(offendingSelect)).map((f) => f.mount)).toEqual(["Select"])
    expect(scan(src(offendingRecordPicker)).map((f) => f.mount)).toEqual(["RecordPicker"])
  })

  // THE INDIRECTION THIS LAW WAS ACTUALLY EARNED BY. The direct per-mount
  // scan above is the whole census for a `<Select>`/`<RecordPicker>` written
  // inline — but `task-form-dialog.tsx` and `story-form-dialog.tsx`, the two
  // real files this law converted, both built their assignee field through a
  // LOCAL FACTORY (`const picker = (id, value, …, options, set) => (
  // <RecordPicker … options={options} … />)`), whose own JSX never mentions
  // "members" at all — only its own parameter, `options`. Reverting either
  // file to that shape (measured, 15 Sep 2026: `task-form-dialog.tsx`
  // temporarily reverted, backed up first with `cp`, restored the same way)
  // passed the DIRECT scan clean and was only caught once `helperFindings`
  // existed — so that shape is pinned here, permanently, rather than trusted
  // to the one-off manual proof.
  it("staff-pill-row: the census sees through a local picker-factory indirection", () => {
    const compliantHelperSrc = `
      function Fixture() {
        const members = useAssignableMembers(teamId)
        const picker = (id, value, placeholder, searchPlaceholder, options, set) => (
          <RecordPicker id={id} value={value} onChange={set} options={options} placeholder={placeholder} searchPlaceholder={searchPlaceholder} />
        )
        return picker("x", v, "Nobody", "Search…", countries.map(asOption), setCountry)
      }
    `
    const offendingHelperSrc = `
      function Fixture() {
        const members = useAssignableMembers(teamId)
        const picker = (id, value, placeholder, searchPlaceholder, options, set) => (
          <RecordPicker id={id} value={value} onChange={set} options={options} placeholder={placeholder} searchPlaceholder={searchPlaceholder} />
        )
        return picker("task-assignee", values.assigneeId, "Nobody yet", "Search members…", members.map(asOption), set)
      }
    `
    const offendingHelperRowLayoutSrc = `
      function Fixture() {
        const members = useAssignableMembers(teamId)
        const picker = (id, value, options) => (
          <RecordPicker layout="row" id={id} value={value} options={options} />
        )
        return picker("x", v, members.map(asOption))
      }
    `

    const helperScan = (source: string) => helperFindings(source, "fixture", memberVarNames(source))

    // A helper called with an UNRELATED list (countries, not members) is not
    // a finding — the factory shape alone proves nothing without a real
    // staff/member list at the CALL SITE.
    expect(helperScan(compliantHelperSrc)).toEqual([])
    // The exact shape this law converted: the call site's own argument list
    // carries `members`, invisible to the direct per-mount scan alone.
    expect(helperScan(offendingHelperSrc).map((f) => f.mount)).toEqual(["RecordPicker"])
    // And the row-layout carve-out reaches through the indirection too — a
    // helper whose OWN body already draws the compliant pill row is never a
    // finding, whatever its caller passes.
    expect(helperScan(offendingHelperRowLayoutSrc)).toEqual([])
  })
})
