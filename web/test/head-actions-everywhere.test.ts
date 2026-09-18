// THE FOLD, REINFORCED EVERYWHERE — Aurora's own pattern for a law that just
// landed on one screen: "reinforce it everywhere." `head-actions-fold.test.tsx`
// proved the shared component (`shared/web/head-actions.tsx`) and that the
// ticket head (`web/components/tickets/help-detail.tsx`) routes through it.
// This file is the census that catches every OTHER record head that passes
// `actions=` to `RecordScreen` and draws a wide, multi-control row without
// wiring the same fold — so the next screen that grows a second button beside
// its Edit pen cannot ship silently unfolded.
//
// DERIVED, NOT HAND-LISTED. It walks every `.tsx` under `web/components`,
// finds every `<RecordScreen … actions={…}>` call (comments stripped first,
// so a doc comment that merely NAMES `<RecordScreen>` never counts), and
// reads the exact text handed to `actions`. A call whose actions value draws
// more than one standalone control (`Button`, `EditPenButton`,
// `RecordActionsMenu`, `RecordTimerButton`) is a WIDE row — the shape that
// wraps a title onto a second line at a narrow pane width — and must wrap
// itself in `HEAD_ACTIONS_ROW_CLASS` and offer the same acts through
// `HeadActionsFoldMenu` in the same call's own `chips`. A call with at most
// one control has nothing that could ever wrap, so it may instead carry a
// reasoned line in `HEAD_ACTIONS_FOLD_EXEMPT` below — ROT-CHECKED: an entry
// whose row has grown a second control fails the same way an unwired new
// screen does, and an entry naming a file that is no longer a candidate at
// all fails too, so the list can only ever describe the heads that are
// really single-control today.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

// `__dirname`, not `process.cwd()` — the same reason `head-actions-fold.test.tsx`
// (right beside this file) computes ROOT this way: it is right regardless of
// which directory vitest happens to be invoked from.
const ROOT = join(__dirname, "..", "..")

/** The controls this app draws standalone, beside a record head's chips —
 * the exact set `shared/web/head-actions.tsx`'s own header names as
 * candidates for the fold, plus the bare `Button` every bespoke head reaches
 * for when neither of the two named components fits (sprint's Complete,
 * story's Ready for review/Done, process's Edit, member's recipe buttons). */
const CONTROL_TAGS = ["Button", "EditPenButton", "RecordActionsMenu", "RecordTimerButton"]

/** One `<RecordScreen …>` call, with the exact text of its `actions={…}`
 * value (braces balanced, so a nested `actions={overflow}` inside
 * `RecordActionsMenu` doesn't truncate the outer one) — or `null` when the
 * call passes no `actions` prop at all (the loading/error/empty branches
 * every detail screen also renders through `RecordScreen`). */
type RecordScreenCall = { tag: string; actionsValue: string | null }

function recordScreenCalls(strippedSource: string): RecordScreenCall[] {
  const calls: RecordScreenCall[] = []
  let idx = 0
  for (;;) {
    const start = strippedSource.indexOf("<RecordScreen", idx)
    if (start === -1) break
    const after = strippedSource[start + "<RecordScreen".length]
    // Not a real tag start (e.g. `<RecordScreenX`) — keep scanning past it.
    if (after !== undefined && !/[\s/>]/.test(after)) {
      idx = start + 1
      continue
    }
    // Walk to the opening tag's own closing `>`, at BRACE DEPTH ZERO — a
    // prop's own JSX value can hold any number of `<`/`>` of its own, so only
    // an unbalanced-brace position can be the real end of the tag.
    let i = start + "<RecordScreen".length
    let depth = 0
    while (i < strippedSource.length) {
      const ch = strippedSource[i]
      if (ch === "{") depth++
      else if (ch === "}") depth--
      else if (depth === 0 && ch === ">") break
      i++
    }
    const tag = strippedSource.slice(start, i + 1)
    calls.push({ tag, actionsValue: extractActionsValue(tag) })
    idx = i + 1
  }
  return calls
}

/** The exact substring inside `actions={ … }`, brace-balanced. `null` when
 * the tag carries no `actions` prop. */
function extractActionsValue(tag: string): string | null {
  const m = tag.match(/\bactions=\{/)
  if (!m || m.index === undefined) return null
  const openBrace = m.index + m[0].length - 1
  let depth = 1
  let i = openBrace + 1
  while (i < tag.length && depth > 0) {
    if (tag[i] === "{") depth++
    else if (tag[i] === "}") depth--
    i++
  }
  return tag.slice(openBrace + 1, i - 1)
}

/** RESOLVES A BARE VARIABLE REFERENCE. `help-detail.tsx` (and any other head)
 * may build its wide row as `const actions = (<div …>…</div>)` above the
 * `return`, and hand `RecordScreen` `actions={actions}` — a bare identifier,
 * not inline JSX. `extractActionsValue` above still finds the right prop, but
 * the text it captures is just the four-letter variable name, which would
 * read as a zero-control row. This walks back to that variable's own
 * declaration (`const <name> = (` … balanced parens) and returns ITS body
 * instead, so a hoisted-out actions block is read exactly as if it had been
 * written inline. Falls back to the raw value when it isn't a bare
 * identifier, or when no such declaration is found in the file. */
function resolveActionsValue(rawValue: string, wholeStrippedSource: string): string {
  const trimmed = rawValue.trim()
  if (!/^[A-Za-z_$][\w$]*$/.test(trimmed)) return rawValue
  const declRe = new RegExp(`const\\s+${trimmed}\\s*=\\s*\\(`)
  const m = wholeStrippedSource.match(declRe)
  if (!m || m.index === undefined) return rawValue
  const openParen = m.index + m[0].length - 1
  let depth = 1
  let i = openParen + 1
  while (i < wholeStrippedSource.length && depth > 0) {
    if (wholeStrippedSource[i] === "(") depth++
    else if (wholeStrippedSource[i] === ")") depth--
    i++
  }
  return wholeStrippedSource.slice(openParen + 1, i - 1)
}

/** How many standalone controls a `actions=` value draws — the row's own
 * "would this ever need to wrap" count. */
function controlCount(actionsValue: string): number {
  let n = 0
  for (const tagName of CONTROL_TAGS) {
    const re = new RegExp(`<${tagName}\\b`, "g")
    n += (actionsValue.match(re) ?? []).length
  }
  return n
}

/** THE SINGLE-CONTROL HEADS — the ones this law's own carve-out names: "If a
 * head has only a single … overflow menu and nothing else, it needs no
 * fold." A head whose whole `actions=` draws at most one standalone control
 * never wraps at any width, so folding it buys nothing; it still has to say
 * so here, by name, with the reason — never silently skipped. */
const HEAD_ACTIONS_FOLD_EXEMPT: Record<string, string> = {
  "work/wave-detail.tsx":
    "The head's whole `actions=` is the one RecordActionsMenu trigger (`canEdit ? <RecordActionsMenu actions={overflow} /> : undefined`) — nothing else stands beside it, so there is no second control the fold could ever save from wrapping.",
  "knowledge/knowledge-detail.tsx":
    "The head's whole `actions=` is the one standalone EditPenButton (`canEdit && <EditPenButton … />`) — knowledge-detail.tsx carries no overflow menu at all, so a single 40px icon button is the entire row and never wraps.",
}

describe("every record head that passes actions= to RecordScreen folds it", () => {
  // An absolute root, so the walk finds the real `web/components` tree
  // regardless of which directory vitest starts in.
  const componentsRoot = `${ROOT}/web/components`
  const all = sourceFiles(componentsRoot, { extensions: [".tsx"], skipTests: true })

  it("found more than a handful of components — the walk reached the real tree", () => {
    expect(all.length).toBeGreaterThan(50)
  })

  const candidates = all
    .map((f) => ({ ...f, stripped: stripComments(f.source) }))
    .flatMap((f) =>
      recordScreenCalls(f.stripped)
        .filter((c) => c.actionsValue !== null && c.actionsValue.trim().length > 0)
        .map((c) => ({
          rel: f.rel,
          actionsValue: resolveActionsValue(c.actionsValue as string, f.stripped),
          tag: c.tag,
        }))
    )

  it("finds at least the eleven record heads this lane wired (plus the ticket head from the lane before it)", () => {
    const rels = new Set(candidates.map((c) => c.rel))
    for (const expected of [
      "accounts/account-detail.tsx",
      "accounts/contact-detail.tsx",
      "apps/app-detail.tsx",
      "knowledge/knowledge-detail.tsx",
      "meetings/meeting-detail.tsx",
      "process/process-detail.tsx",
      "team/member-screen.tsx",
      "work/sprint-detail.tsx",
      "work/story-detail.tsx",
      "work/task-detail.tsx",
      "work/wave-detail.tsx",
    ]) {
      expect(rels.has(expected), `${expected} should be a candidate (it passes actions= to RecordScreen)`).toBe(true)
    }
  })

  it("never silently drops a RecordScreen call — every candidate is either wired or named", () => {
    const offenders: string[] = []
    for (const c of candidates) {
      const count = controlCount(c.actionsValue)
      const exempt = HEAD_ACTIONS_FOLD_EXEMPT[c.rel]
      if (count <= 1) {
        // NOTHING TO FOLD — but it still has to be NAMED, with a reason, so a
        // reader never has to re-derive "why does this one not fold" by hand.
        if (!exempt) {
          offenders.push(
            `${c.rel}: a single-control actions row (${count} control) with no HEAD_ACTIONS_FOLD_EXEMPT entry — name it, with a reason, or wire the fold anyway`
          )
        }
        continue
      }
      // A WIDE ROW — this is exactly the shape the ticket head's own fold
      // exists for, so it must wear both halves: the wide row wrapped in
      // HEAD_ACTIONS_ROW_CLASS (inside the actions value itself), and the
      // narrow trigger, HeadActionsFoldMenu, somewhere else in the SAME
      // RecordScreen call (its own chips prop).
      const wrapsWideRow = /HEAD_ACTIONS_ROW_CLASS/.test(c.actionsValue)
      const offersFold = /HeadActionsFoldMenu/.test(c.tag)
      if (!wrapsWideRow || !offersFold) {
        offenders.push(
          `${c.rel}: ${count} standalone controls in actions= but ${
            !wrapsWideRow ? "no HEAD_ACTIONS_ROW_CLASS wrapper" : "no HeadActionsFoldMenu in the same call's chips"
          }`
        )
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([])
  })

  describe("HEAD_ACTIONS_FOLD_EXEMPT stays honest — rot-checked both ways", () => {
    it("every exemption reasons about being a single-control row", () => {
      for (const [rel, reason] of Object.entries(HEAD_ACTIONS_FOLD_EXEMPT)) {
        expect(reason.length, `${rel}'s exemption needs a real reason`).toBeGreaterThan(20)
      }
    })

    it("every exemption still names a real candidate whose row is still single-control", () => {
      for (const rel of Object.keys(HEAD_ACTIONS_FOLD_EXEMPT)) {
        const matches = candidates.filter((c) => c.rel === rel)
        expect(matches.length, `${rel} is named in HEAD_ACTIONS_FOLD_EXEMPT but is no longer a candidate at all`).toBeGreaterThan(0)
        for (const m of matches) {
          expect(
            controlCount(m.actionsValue),
            `${rel} is named in HEAD_ACTIONS_FOLD_EXEMPT as single-control, but its actions= row now draws more than one — wire the fold instead of leaving the exemption stale`
          ).toBeLessThanOrEqual(1)
        }
      }
    })
  })
})
