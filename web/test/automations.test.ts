// R70 — EVERY AUTOMATION IS ON ITS MODULE'S SETTINGS PAGE, AND ONE THAT CANNOT
// BE SWITCHED SAYS WHY.
//
// THE CLIENT, 2026-09-11, shown a census of thirty automatic behaviours and a
// staged plan for them:
//     *"include absolutely all of those in settings by module. I want no
//      automation without visibility."*
//     *"so far i want visibility and on+off."*
//
// A REGISTRY OF THIRTY-THREE ROWS ROTS, so nothing below trusts one. Four
// censuses, read off the disk, each failing in both directions:
//
//   i   · EVERY BRANDED SEND is an automation, and every automation that claims
//         to send names a real one. Derived through `shared/rules/email-sites.ts`
//         — R30's own census, extracted so the two laws cannot come to disagree
//         about what an email is.
//   ii  · EVERY CRON in every `workers/*/wrangler.jsonc` is claimed by at least
//         one automation, and every automation that claims a schedule names one
//         that is really configured.
//   iii · EVERY EXPORT of the files whose whole job is doing things by
//         themselves (`AUTOMATION_OWN_FILES`) is claimed or excused in writing.
//   iv  · EVERY SWITCH IS CONSULTED. `switchable: true` must have an
//         `automationOff("<key>")` read somewhere in `workers/`, and every such
//         read must name a switchable entry. An offered switch that nothing
//         reads is THE failure this repo keeps shipping — R36's fifteen dead
//         permission boxes, `screens`' four rights and no door, R61's gear that
//         renders `null` for ever — and it is the one a person cannot see,
//         because a switch that does nothing looks exactly like one that works.
//
// AND THE HONEST GAP, stated here rather than papered over. The SILENT
// state-changes — a status flip, a history row, a lock — pass through no seam,
// import nothing distinctive and appear in no configuration. Census (iii) is the
// strongest thing available: it catches the next flip, because the next flip
// will be written beside the three that exist. It does not catch an `if` added
// to `updateTicket`, and nothing here claims otherwise.

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import {
  AUTOMATIONS,
  AUTOMATION_OWN_FILES,
  AUTOMATION_OWN_FILE_EXEMPT,
} from "@shared/automations"
import { GLOSSARY } from "@shared/glossary"
import { emailSites } from "@shared/rules/email-sites"
import { sourceFiles, stripComments, stripJsoncComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const ROOT = join(WEB, "..")
const read = (p: string) => readFileSync(p, "utf8")

/** Every `.ts` under every worker's `src/`, comments stripped — the surface
 * every census below reads. Comments off for the reason every source scan in
 * this repo gives: half the files here DISCUSS the seam being scanned, and a
 * census that read prose would find a flag read inside an explanation of one. */
function workerSource(): { rel: string; code: string }[] {
  const srcDirs = readdirSync(join(ROOT, "workers"), { withFileTypes: true })
    .filter((w) => w.isDirectory())
    .map((w) => join(ROOT, "workers", w.name, "src"))
  return sourceFiles(srcDirs, { extensions: [".ts"], relativeTo: ROOT }).map((f) => ({
    rel: f.rel,
    code: stripComments(f.source),
  }))
}

describe("R70 — every automation is visible, and one that cannot be switched says why", () => {
  const entries = AUTOMATIONS
  const workers = workerSource()

  // ── THE TRIPWIRES, FIRST ───────────────────────────────────────────────────
  // Every clause below is a set relation, and a set relation against an empty
  // set passes. These are what stop this whole suite reporting a perfectly
  // governed app because a walk went blind.
  it("the registry and the walks are not empty", () => {
    expect(
      entries.length,
      "R70 — AUTOMATIONS is empty. Settings-by-automation is a shipped feature (client, 2026-09-11, \"I want no automation without visibility\"); if it is genuinely being withdrawn that is a decision to take with her, not a green build"
    ).toBeGreaterThan(20)
    expect(
      workers.length,
      "R70 — the worker walk opened no files. Every census below reads it, so fix the walk before trusting a single result"
    ).toBeGreaterThan(50)
    expect(new Set(entries.map((a) => a.key)).size, "R70 — a key is declared twice").toBe(entries.length)
  })

  // ── THE SHAPE OF A ROW ─────────────────────────────────────────────────────
  it("a key names its own segment, and a row that cannot be switched carries a reason", () => {
    const misfiled = entries.filter((a) => !a.key.startsWith(`${a.segment}.`))
    expect(
      misfiled.map((a) => a.key),
      "R70 — a key must open with its own segment, so that a flag read in a worker says where its row is without a second lookup"
    ).toEqual([])

    // THE CLAUSE THE CLIENT'S RULING ACTUALLY TURNS ON. "You may see this and
    // may not change it" is visibility; a row that is visible and inert with no
    // explanation is the control-that-looks-like-it-works this repo has shipped
    // four times.
    const unexplained = entries.filter((a) => !a.switchable && !(a.helpText ?? "").trim())
    expect(
      unexplained.map((a) => a.key),
      "R70 — these automations cannot be switched off and do not say why. A `switchable: false` carries `helpText`, and it is SHOWN ON SCREEN: her ruling is visibility, and a row a person cannot act on and cannot understand is worse than one that is hidden"
    ).toEqual([])

    // …and the other way. A reason under a working switch is a sentence that
    // contradicts the control beside it.
    const explainedAnyway = entries.filter((a) => a.switchable && (a.helpText ?? "").trim())
    expect(
      explainedAnyway.map((a) => a.key),
      "R70 — these automations CAN be switched off and carry a reason why they cannot. Delete the reason or make the row honest"
    ).toEqual([])
  })

  // ── THE MARK, AND THE REASON IT CANNOT BE PARTED FROM ─────────────────────
  //
  // THE CLIENT, 2026-09-11, SHOWN THE AUTOMATIONS LIST:
  //   *"ah ok, i like it. like we have protected choices to have protected
  //    automations! Still have the visibility, but cannot change it"*
  //
  // One word across both halves of a module's settings page. The clause above
  // holds the REASON in the data; this one holds the two things a person
  // actually sees, off the screen's own source:
  //
  //   · THE WORD IS THE DICTIONARY'S, read out of `GLOSSARY.protectedChoice`
  //     rather than typed here — so the day that term is reworded, the screen
  //     that must say it is what goes red, not this file.
  //   · THE PART IS THE CHOICES HALF'S OWN, derived by finding the badge that
  //     carries that word in `selectable-screen.tsx` and requiring the same
  //     element and the same variant here. Two different-looking badges for one
  //     concept on one page is the fault her ruling was aimed at, and a check
  //     that hard-coded `variant="secondary"` would let the two drift apart the
  //     moment the Choices half changed.
  //   · THE MARK AND THE REASON SHARE ONE GUARD, which is the half that matters
  //     most. The word carries a DIFFERENT promise on each half of the page — a
  //     choice's protection comes off in one click, an automation's never comes
  //     off at all — so the badge alone would teach a reader the Choices
  //     sentence and let them carry it to a row where it is false. Sharing a
  //     branch makes "badge with no reason" unwriteable rather than merely
  //     discouraged, and R70's own data clause (a `switchable: false` always
  //     carries `helpText`) is what then puts the pair on EVERY unswitchable
  //     row.
  //
  // And the negative half, which is the one a later edit would break: nothing a
  // person can switch wears the mark. It is read positionally, in the shape
  // R20's own census uses — each marker is tied to the CONDITION that governs
  // it, sliced by brace balance from the `{` that opens the branch, so "inside
  // this branch" is a fact about the file and not about a regex's appetite.

  /** Every JSX expression container in `src` that OPENS WITH A CONDITION —
   * `{cond ? (…)}` or `{cond && (…)}` — as that condition and the source it
   * governs. The body is sliced by brace balance, so a marker is inside a
   * branch or it is not, and a nested `{t(a.title)}` is never mistaken for one
   * (it opens with no condition). */
  function guardedBranches(src: string): { cond: string; body: string }[] {
    const out: { cond: string; body: string }[] = []
    for (let i = 0; i < src.length; i++) {
      if (src[i] !== "{") continue
      const opener = /^\s*([^{}]*?)\s*(?:\?|&&)\s*\(/.exec(src.slice(i + 1, i + 300))
      if (!opener) continue
      let depth = 0
      let j = i
      for (; j < src.length; j++) {
        if (src[j] === "{") depth++
        else if (src[j] === "}" && --depth === 0) break
      }
      out.push({ cond: opener[1], body: src.slice(i, j + 1) })
    }
    return out
  }

  it("a row that cannot be switched wears the dictionary's mark beside its reason, and a row that can wears neither", () => {
    const term = GLOSSARY.protectedChoice.term
    const says = `{t("${term}")}`
    /** The word as a literal inside a pattern — it carries braces, brackets and
     * parentheses of its own, every one of them a regex operator. */
    const literal = says.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // 1 · THE PART, DERIVED OFF THE CHOICES HALF. Same page, same concept.
    const choices = stripComments(
      read(join(WEB, "components/choices/selectable-screen.tsx"))
    )
    const drawn = new RegExp(`<(\\w+)([^>]*)>\\s*${literal}`).exec(choices)
    expect(
      drawn,
      `R70 — the Choices half no longer draws "${term}" as a badge, so there is nothing to derive the automations mark FROM. If the Choices screen changed, this check must follow it rather than be deleted: one concept, one part, one word, on one page`
    ).not.toBeNull()
    const part = drawn![1]
    const variant = /variant="(\w+)"/.exec(drawn![2])?.[1]
    expect(variant, `R70 — the Choices badge for "${term}" names no variant`).toBeTruthy()

    // 2 · THE AUTOMATIONS HALF SAYS THE SAME WORD, ONCE, THROUGH THE SAME PART.
    const screen = stripComments(read(join(WEB, "components/screens/module-automations.tsx")))
    const said = screen.split(says).length - 1
    expect(
      said,
      `R70 — the automations rows say "${term}" ${said} time(s) and must say it exactly once: the mark belongs to the ONE branch that draws a row nobody can switch. The client's ruling of 2026-09-11 is that an unswitchable automation wears the same word a protected choice does ("like we have protected choices to have protected automations"), and a second occurrence is a mark drawn somewhere a person CAN change the row`
    ).toBe(1)
    expect(
      new RegExp(`<${part}\\s[^>]*variant="${variant}"[^>]*>\\s*${literal}`).test(screen),
      `R70 — the automations mark is not the Choices half's own part. Both must be <${part} variant="${variant}"> carrying t("${term}"): two different-looking badges for one concept on one page is exactly what the ruling that asked for the word was aimed at`
    ).toBe(true)

    // 3 · IT SHARES ITS GUARD WITH THE REASON, AND THAT GUARD IS THE
    //     UNSWITCHABLE ONE.
    const branches = guardedBranches(screen)
    expect(
      branches.length,
      "R70 — read no conditional branch at all out of the automations screen; the slicer is broken, and a blind check passes exactly like a clean one"
    ).toBeGreaterThan(1)

    const marked = branches.filter((b) => b.body.includes(says))
    expect(
      marked.length,
      `R70 — the mark must sit inside exactly one guarded branch; found ${marked.length}. A "${term}" badge drawn unconditionally would be worn by every row on the page, including the ones with a working switch`
    ).toBe(1)
    expect(
      /^!a\.switchable\b/.test(marked[0].cond),
      `R70 — the mark is drawn under \`${marked[0].cond}\`, which is not the row that cannot be switched. The badge says "you can see this and you cannot change it"; on a row with a switch beside it, that is a lie a person can act on`
    ).toBe(true)
    expect(
      marked[0].body.includes("t(a.helpText)"),
      `R70 — the mark renders without the reason in the same branch. "${term}" promises something DIFFERENT on each half of this page — a choice's protection comes off in one click, an automation's never comes off — so the sentence beside the badge is what says which promise this row is making. They share one guard so that no later edit can leave the badge standing alone`
    ).toBe(true)

    // …and the switch is the other branch, so the page has exactly two answers
    // to "can I change this?" and a row gives one of them.
    const switched = branches.filter((b) => b.body.includes("<Switch"))
    expect(
      switched.length,
      `R70 — the switch must sit inside exactly one guarded branch; found ${switched.length}`
    ).toBe(1)
    expect(
      /^a\.switchable\b/.test(switched[0].cond),
      `R70 — the switch is drawn under \`${switched[0].cond}\` rather than \`a.switchable\`, so a row the registry says cannot be switched may be drawn with a control that moves`
    ).toBe(true)
  })

  // ── THE SOURCE STILL EXISTS ───────────────────────────────────────────────
  it("every entry names code that is still there", () => {
    const missing: string[] = []
    for (const a of entries) {
      const [rel, fn] = a.source.split("::")
      if (!rel || !fn) {
        missing.push(`${a.key} — source is not "<file>::<function>"`)
        continue
      }
      let code: string
      try {
        code = stripComments(read(join(ROOT, rel)))
      } catch {
        missing.push(`${a.key} — ${rel} does not open`)
        continue
      }
      // Exported or module-private: four of these are deliberately private
      // (`refuseIfLocked`, `sweepKind`, `autoStops`, `retireVanished`) and a law
      // that only looked at exports would have called them gone.
      if (!new RegExp(`\\b(?:function|const)\\s+${fn}\\b`).test(code))
        missing.push(`${a.key} — ${rel} no longer declares ${fn}`)
    }
    expect(
      missing,
      "R70 — an automation naming code that is gone is a settings row describing something the app no longer does, which is the worst kind of visibility. Either the automation was removed (delete the row) or it moved (re-point it)"
    ).toEqual([])
  })

  // ── i · EVERY BRANDED SEND IS AN AUTOMATION ───────────────────────────────
  it("every email this base composes has a row, and every row that claims to send names one", () => {
    const sends = new Set(emailSites(ROOT).keys())
    expect(
      sends.size,
      "R70 — the email census found nothing. It is R30's own derivation (shared/rules/email-sites.ts); if the seam was renamed, teach that file rather than this one"
    ).toBeGreaterThan(8)

    // CLAIMED BY ANY ROW, not only by a `trigger: "send"` one. `trigger` says
    // what sets an automation GOING, and three of these are set going by a
    // schedule and happen to end in an envelope — the morning digest, the growth
    // alarm and the nightly fault report. A census that asked for `send` here
    // would have told three crons to lie about what starts them.
    const claimed = new Set(entries.map((a) => a.source))
    const unclaimed = [...sends].filter((s) => !claimed.has(s))
    expect(
      unclaimed,
      "R70 — these emails leave the building and appear on no settings page. The client's ruling is that there is no automation without visibility, and a message a person receives is the most visible automation there is. Add a row to AUTOMATIONS (shared/automations.ts) naming the module whose page it belongs on"
    ).toEqual([])

    // …and the other way, on the rows that say a SEND is what they are.
    const phantom = entries
      .filter((a) => a.trigger === "send" && !sends.has(a.source))
      .map((a) => a.key)
    expect(
      phantom,
      "R70 — these rows say they send an email and the source census cannot find one at that function. Either the send moved (re-point the row) or the trigger is wrong"
    ).toEqual([])
  })

  // ── ii · EVERY SCHEDULE IS CLAIMED ────────────────────────────────────────
  it("every cron in every wrangler config has a row, and every row naming a cron names a real one", () => {
    const configured = new Set<string>()
    let configsRead = 0
    for (const w of readdirSync(join(ROOT, "workers"), { withFileTypes: true })) {
      if (!w.isDirectory()) continue
      let raw: string
      try {
        raw = read(join(ROOT, "workers", w.name, "wrangler.jsonc"))
      } catch {
        continue
      }
      configsRead++
      // The TOP-LEVEL `triggers` only. Each worker repeats its crons inside
      // `env.staging`, and a staging twin is the same schedule said twice, not a
      // second job — reading both would ask the registry to claim one schedule
      // per environment.
      const cfg = JSON.parse(stripJsoncComments(raw)) as {
        triggers?: { crons?: string[] }
      }
      for (const expr of cfg.triggers?.crons ?? []) configured.add(`${w.name} ${expr}`)
    }
    expect(configsRead, "R70 — read no wrangler.jsonc at all; the walk is broken").toBeGreaterThan(4)
    expect(
      configured.size,
      "R70 — found no cron trigger anywhere. This base runs unattended work on three schedules; a census that finds none is blind, not clean"
    ).toBeGreaterThan(0)

    const claimed = new Set(
      entries.filter((a) => a.cron).map((a) => `${a.cron!.worker} ${a.cron!.expression}`)
    )
    const unclaimed = [...configured].filter((c) => !claimed.has(c))
    expect(
      unclaimed,
      "R70 — these schedules run unattended and appear on no settings page. Every one of them does something to somebody's data or somebody's inbox, and until it has a row nobody outside this repository can know it exists"
    ).toEqual([])

    const phantom = [...claimed].filter((c) => !configured.has(c))
    expect(
      phantom,
      "R70 — these rows name a schedule no wrangler config declares. A settings page describing a job that does not run is the same fault as one that hides a job that does"
    ).toEqual([])

    // …and the field is only ever on a cron row.
    const mismatched = entries.filter((a) => (a.trigger === "cron") !== Boolean(a.cron))
    expect(
      mismatched.map((a) => a.key),
      "R70 — `cron` belongs on a `trigger: \"cron\"` row and on no other. A row that runs on a schedule says which one; a row that does not must not pretend to"
    ).toEqual([])
  })

  // ── iii · THE FILES THAT EXIST ONLY TO DO THINGS BY THEMSELVES ────────────
  it("every export of an automation's own file is claimed, or excused in writing", () => {
    const claimed = new Set(entries.map((a) => a.source))
    const unclaimed: string[] = []
    const seen = new Set<string>()
    let exportsFound = 0
    for (const rel of AUTOMATION_OWN_FILES) {
      const code = stripComments(read(join(ROOT, rel)))
      for (const m of code.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
        const key = `${rel}::${m[1]}`
        exportsFound++
        seen.add(key)
        if (!claimed.has(key) && !AUTOMATION_OWN_FILE_EXEMPT[key]) unclaimed.push(key)
      }
    }
    // TRIPWIRE — the slice matched something. These two files hold ten exported
    // functions between them; zero means the regex or the paths went stale.
    expect(
      exportsFound,
      "R70 — read no exported function out of AUTOMATION_OWN_FILES. The files moved or the scan stopped matching; either way this clause is enforcing nothing"
    ).toBeGreaterThan(5)

    expect(
      unclaimed,
      "R70 — these live in a file whose whole job is doing things by itself, and they are on no settings page and in no exemption. This is the census the SILENT automations are held by: a new status flip or history writer goes where its siblings are, and this is what notices it"
    ).toEqual([])

    // Rot the other way, so the exemption list can only shrink.
    const stale = Object.keys(AUTOMATION_OWN_FILE_EXEMPT).filter((k) => !seen.has(k))
    expect(
      stale,
      "R70 — AUTOMATION_OWN_FILE_EXEMPT excuses something that no longer exists. Delete the line"
    ).toEqual([])
  })

  // ── iv · EVERY SWITCH IS REALLY CONSULTED ─────────────────────────────────
  it("a switch that is offered is read, and a flag that is read is offered", () => {
    const readKeys = new Set<string>()
    for (const f of workers)
      // A WINDOW, NOT A NON-GREEDY RUN TO THE FIRST `)`. One call site passes
      // `d1ConfigFrom(env, "automation")` as its first argument, so a pattern
      // that stopped at a bracket stopped inside the arguments and read nothing.
      // The key must carry a DOT, which is what keeps `"automation"` — a
      // perfectly ordinary string in the same call — from being read as one.
      for (const m of f.code.matchAll(/automationOff\([\s\S]{0,200}?"([a-z0-9]+\.[a-z0-9-]+)"/g))
        readKeys.add(m[1])

    expect(
      readKeys.size,
      "R70 — found no automationOff(\"…\") read anywhere in workers/. Either the seam was renamed (teach this regex) or twelve switches on the settings page decide nothing at all"
    ).toBeGreaterThan(0)

    const offered = entries.filter((a) => a.switchable).map((a) => a.key)
    const inert = offered.filter((k) => !readKeys.has(k))
    expect(
      inert,
      "R70 — these are drawn as switches and NOTHING READS THEM. A control that looks like it works is the exact failure this repo has shipped four times: the person switches it, the app says nothing, and the automation carries on. Either read the flag at the automation (`automationOff(cfg, guard.databaseId, \"<key>\")`) or mark the row `switchable: false` with the reason a reader will see"
    ).toEqual([])

    const unoffered = [...readKeys].filter((k) => !offered.includes(k))
    expect(
      unoffered,
      "R70 — a worker consults a flag that no switchable automation declares, so it is a silence nobody can turn back on: `isAutomationOff` refuses an unknown key, so this read is dead code that reads as a feature"
    ).toEqual([])
  })

  // ── THE DOOR REFUSES WHAT THE REGISTRY REFUSES ────────────────────────────
  // Positional, in the shape R20's own census uses: the write door must consult
  // the registry's `switchable` before it stores anything, so that "off" can
  // never be written against an automation whose page says it cannot be.
  it("the write door asks the registry before it stores a silence", () => {
    const door = stripComments(read(join(ROOT, "workers/tenancy/src/lib/automations-config.ts")))
    expect(
      /AUTOMATIONS\.find\(/.test(door),
      "R70 — the automation store does not look the key up in the registry. A store that accepts any key makes an automation silenced by a typo indistinguishable from one silenced on purpose, which is the whole of the \"off is a value, absence is a fault\" discipline"
    ).toBe(true)
    expect(
      /!entry\.switchable/.test(door),
      "R70 — the automation store does not refuse a key the registry says cannot be switched. The sign-in code has to be unswitchable at the DOOR and not only on the screen"
    ).toBe(true)
  })

  // ── EVERY ROW HAS A PAGE TO SIT ON ────────────────────────────────────────
  // Sliced off `MODULE_SETTINGS`'s own literal, the same way R61 reads it and
  // for the same reason: the table is not exported, and exporting a constant so
  // a test can read it would loosen the thing being protected. R61 in turn holds
  // every one of those segments to a real `MODULE_PERMISSION` key, so this
  // clause inherits that for nothing.
  it("every automation names a settings page that really exists", () => {
    const host = stripComments(read(join(WEB, "components/screens/module-settings-screen.tsx")))
    const at = host.indexOf("const MODULE_SETTINGS")
    expect(at, "R70 — MODULE_SETTINGS is not in module-settings-screen.tsx under that name").toBeGreaterThan(-1)
    const close = host.indexOf("\n]", at)
    const declared = [...host.slice(at, close).matchAll(/^\s*segment:\s*"([a-z0-9-]+)"/gm)].map((m) => m[1])
    expect(declared.length, "R70 — read no segment out of MODULE_SETTINGS").toBeGreaterThan(0)

    const homeless = [...new Set(entries.map((a) => a.segment))].filter((s) => !declared.includes(s))
    expect(
      homeless,
      "R70 — these automations are filed under a module with no settings page, so their rows are drawn nowhere and the client's ruling is unmet for them. Add the segment to MODULE_SETTINGS (and R61 will then ask for its gear)"
    ).toEqual([])
  })
})
