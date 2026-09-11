// THE DOCS MUST AGREE WITH THE ROSTER ON DISK.
//
// Earned by: a doc sweep that had to correct "seven workers" and "one public door"
// in fourteen places at once, two months after the eighth worker (the client
// portal's front door) shipped. Every one of those sentences was true when it was
// written. None of them was checked, so none of them was updated — and a runbook
// that says "delete the seven workers" leaves a public address live.
//
// So the roster is DERIVED, never listed here: the worker names come from
// `workers/` on disk, and which of them are public comes from each
// `wrangler.jsonc`'s own `workers_dev` flag. Add a worker and this test's
// expectations move on their own; the docs that disagree go red the same day.
//
// Deliberately NARROW. It reads two claim shapes and no others:
//   1. a COUNT OF WORKERS  — "eight workers", "8 workers", "8-worker split"
//   2. a COUNT OF PUBLIC DOORS — "two public doors", plus the handful of stale
//      phrasings that used to say there was one
// It does not police every number in every doc. A check that shouts about prose
// gets switched off, and a check that is off is worse than no check at all.
//
// A genuine SUBSET claim ("the six workers that bind the core DB") is legitimate
// and stays legitimate — it is a reviewed line in SUBSET_CLAIMS below, with the
// reason, exactly like every other deny-list in this codebase.

import { describe, expect, it } from "vitest"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, sep } from "node:path"

import { RULES_REGISTRY } from "@shared/rules/registry"
import { sourceFiles } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(p, "utf8")

/** Every worker on disk — the roster, derived. */
const WORKERS = readdirSync(join(ROOT, "workers"))
  .filter((d) => {
    try {
      return statSync(join(ROOT, "workers", d, "wrangler.jsonc")).isFile()
    } catch {
      return false
    }
  })
  .sort()

/** A worker is PUBLIC unless its own config switches the public URL off. Absence
 * is the dangerous direction, so absence reads as public — the same way
 * Cloudflare treats it.
 *
 * PER SETTING, not per file. Every worker here declares `workers_dev` once at the
 * top level (production) and again under `env.staging`, so asking only "does the
 * word false appear anywhere?" let a worker be opened in ONE environment and
 * still read as closed — production wide open, the test green, and the docs
 * cheerfully saying two public doors. A single `true` anywhere makes it public. */
const isPublic = (w: string) => {
  const cfg = read(join(ROOT, "workers", w, "wrangler.jsonc"))
  if (/"workers_dev"\s*:\s*true/.test(cfg)) return true
  return !/"workers_dev"\s*:\s*false/.test(cfg)
}

const PUBLIC_WORKERS = WORKERS.filter(isPublic)

/** Docs this check reads: the canon in the repo root, plus the skills that stand a
 * fork up (a skill with a stale count builds a broken product), plus `.plans/` —
 * each build plan opens "for a fresh agent with no prior context", so a stale
 * claim there is read as law by the one reader least able to catch it. */
const PLANS = readdirSync(join(ROOT, ".plans"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => join(".plans", f))

/** The fork-standing skills, DERIVED — because they are the one entry here that
 * can legitimately leave the repository, and on 2026-08-24 they did: the vendored
 * copies moved to `~/.claude/skills` and this list still named two files by hand,
 * so every doc claim in the codebase went unchecked behind four ENOENTs. A
 * hand-written path is a claim that a file exists, which is exactly the kind of
 * claim this file exists to stop anyone making. Present → still checked; gone →
 * nothing to check, and the other docs are read as normal. */
function skillDocs(): string[] {
  const dir = join(ROOT, "skills")
  if (!existsSync(dir)) return []
  const out: string[] = []
  const walk = (rel: string) => {
    for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      const next = join(rel, entry.name)
      if (entry.isDirectory()) walk(next)
      else if (entry.name.endsWith(".md")) out.push(next)
    }
  }
  walk("skills")
  return out
}

/** THE CANON, WHICH IS NO LONGER ALL AT THE ROOT. On 2026-09-06 forty-two of the
 * forty-six root documents moved into `documents/`; only README, CLAUDE, RULES and
 * AGENTS stayed, because those four are opened by name — by a newcomer, by an agent
 * following CLAUDE.md, by `rules.test.ts`, and by whatever tool reads AGENTS.md out
 * of habit.
 *
 * That move is precisely the shape of failure the `skillDocs()` note above already
 * records: this line used to be `readdirSync(ROOT)` alone, and on its own it would
 * have come back with FOUR files and gone green, having quietly stopped reading the
 * other forty-two. Nothing would have been red. So the two directories are read
 * together, and the count is asserted below rather than trusted — a canon that
 * shrinks to a handful is a bug in this file, not a tidy repository. */
/** AN ARTEFACT IS NOT A DOCUMENT, AND THE REPO ALREADY SAYS WHICH IS WHICH.
 * A skill that writes its report to the repo root (`lean-mean-report.md`,
 * `story-review.md`, `interface-lessness-report.md`) leaves a `.md` file there that
 * is git-ignored PRECISELY because it is machine output, not canon — `.gitignore`
 * says so in its own words, and this reads that answer rather than guessing at one
 * with a name pattern.
 *
 * Derived HERE, once, and applied to the walk itself. It used to be re-derived in
 * two places lower down and applied to two assertions out of the nine that scan
 * DOCS, so a stale audit report at the root — "seven workers", "R1–R19" — turned
 * the build red on any machine that had merely RUN a review. Both of those
 * sentences were true when the skill wrote them, which is the definition of an
 * artefact and the reason the doc-map assertion excused one in the first place;
 * the other seven scans never got the same sentence. Filtering the walk means the
 * next scan added to this file inherits the answer instead of having to remember
 * it. */
const ARTEFACTS_AT_ROOT = new Set(
  read(join(ROOT, ".gitignore"))
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("/") && l.endsWith(".md"))
    .map((l) => l.slice(1))
)

const canonDocs = (): string[] => [
  ...readdirSync(ROOT).filter((f) => f.endsWith(".md") && !ARTEFACTS_AT_ROOT.has(f)),
  ...readdirSync(join(ROOT, "documents"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => join("documents", f)),
]

const DOCS = [
  ...canonDocs(),
  ...skillDocs(),
  join("web", "e2e", "README.md"),
  ...PLANS,
]

const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10,
}
const toNumber = (s: string) => WORDS[s.toLowerCase()] ?? Number(s)

/** What counts as a CLAIM. Stripped before matching, in this order:
 *  - fenced code blocks — a shell transcript printing "12 workers" is output, not a
 *    claim about the roster;
 *  - WHITESPACE, collapsed to single spaces. A markdown paragraph wraps wherever it
 *    hits the margin, and the reader hears one sentence either way — so the check has
 *    to read it that way too. Without this, "gateway stays the\n  single public door"
 *    was invisible to every pattern below: the one stale security claim in the repo
 *    sat in AGENT-MODULES-PLAN.md for a month, under the very check written to catch
 *    it, because a line break landed in the middle of it. Collapsing here (before the
 *    quote strips, not after) also means a QUOTE that wraps is still read as a quote;
 *  - short QUOTED phrases, `like this` or "like this" — the same reason the source
 *    scans strip comments before matching (CONVENTIONS.md, "writing a check that can
 *    fail"): the docs that explain this very check have to be able to quote the stale
 *    sentences it forbids. Capped at 60 characters so a whole paragraph can't hide
 *    inside a pair of quotes;
 *  - markdown emphasis — so `**8 Workers**` reads as `8 Workers`. */
const prose = (src: string) =>
  src
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\s+/g, " ")
    .replace(/`[^`\n]{1,60}`/g, " ")
    .replace(/"[^"\n]{1,60}"/g, " ")
    .replace(/\*\*?/g, "")

const NUM = "one|two|three|four|five|six|seven|eight|nine|ten|\\d{1,2}"

/** REVIEWED SUBSET CLAIMS — a count of SOME workers, which is true and must stay
 * sayable. Keyed by the exact phrase, with the reason. If you reword one of these
 * the test goes red: re-read the sentence, then re-approve it here. */
const SUBSET_CLAIMS: { doc: string; phrase: string; why: string }[] = [
  {
    doc: "OPERATIONS.md",
    phrase: "four workers",
    why: "the per-caller rate limiter's roster, not the app's: CALLER_LIMIT is bound on tenancy, content, data-ops and mcp — the four that RESOLVE A CALLER, which is what a per-caller ceiling has to key on. Realtime holds no doors, and auth's doors have no session to key on by definition and carry their own throttles. THE GATEWAYS ARE NOT ON THIS LIST FOR THE SAME REASON, and the sentence used to stop there — 'the two gateways cannot (they decode no session)' — which stopped being the whole truth on 6 Sep 2026: the agency gateway now binds MAINTENANCE_LIMIT, keyed on the ADDRESS, precisely BECAUSE it decodes no session. The maintenance doors carry no session by design, so an IP is the only key there is. So: no gateway can hold a per-CALLER limiter, and one of them holds a per-ADDRESS one. Four is still the right number for the claim this pins; the reason is no longer 'gateways cannot be throttled'.",
  },
  {
    doc: "CONVENTIONS.md",
    phrase: "two workers",
    why: "the shared/ rule — 'if two workers would write it the same way, it lives in shared/'. A pair, not a roster.",
  },
  {
    doc: "ERROR-HANDLING.md",
    phrase: "six workers",
    why: "the workers that BIND THE CORE DB and so can record their own crashes — neither gateway does.",
  },
  {
    doc: "BOOTSTRAP.md",
    phrase: "five workers",
    why:
      "the workers carrying CF_ACCOUNT_ID — tenancy, content, data-ops, AND realtime + mcp. " +
      "This entry read 'three workers' until an audit checked it against the configs: realtime " +
      "took the var when the live channel learned to fence a joining socket, and mcp has always " +
      "carried it. A reviewed subset claim is only as good as its last review, and this one had " +
      "quietly become the wrong number in the one file that tells a stranger which configs to " +
      "overwrite — leaving the original author's account id on two workers of a fork.",
  },
  {
    doc: "BASE-MANUAL.md",
    phrase: "two workers",
    why: "'one of the two workers with a public URL' — the public pair, which this test verifies separately.",
  },
  {
    doc: "BASE-MANUAL.md",
    phrase: "three workers",
    why: "the workers whose mutation routes the publish seam covers (tenancy, content, data-ops) — R1's own scope, not the roster.",
  },
]

const allowedSubset = (doc: string, phrase: string) =>
  // Matched on the BASENAME, not the path. A pin here approves a SENTENCE in a named
  // document; which folder that document sits in is not part of what was reviewed, and
  // when the canon moved into `documents/` on 2026-09-06 every one of these six pins
  // stopped matching at once. That failed loudly, which is the good outcome — but the
  // fix is to stop encoding the location in the first place, so the next move costs
  // nothing. Basenames are unique across the canon (the doc map check relies on the
  // same fact).
  SUBSET_CLAIMS.some(
    (s) => s.doc === (doc.split(sep).pop() as string) && s.phrase.toLowerCase() === phrase.toLowerCase()
  )

describe("docs agree with the roster on disk", () => {
  it("the canon is actually being read — this check cannot go quiet", () => {
    // THE TRIPWIRE FOR THE LINE ABOVE. Every assertion in this file is a scan over
    // DOCS, and a scan over an empty list passes. When the documents moved into
    // `documents/` on 2026-09-06 a root-only `readdirSync` would have left four
    // files here and reported all clear over a canon of forty-six — the same
    // vacuous pass `skillDocs()` was rewritten to stop, and the same one R33's
    // import ban learned to assert its way out of. So the corpus is proved
    // non-trivial before anything is concluded from it.
    expect(
      canonDocs().length,
      "the canon collapsed — did documents/ move again, or get renamed? Fix the walk, " +
        "do not lower this number: every check in this file scans DOCS and an empty " +
        "scan is indistinguishable from a clean one"
    ).toBeGreaterThan(30)
    expect(canonDocs(), "README.md must stay at the root — it is the front door").toContain("README.md")
    expect(
      canonDocs().filter((d) => d.startsWith("documents")).length,
      "documents/ holds the canon; if it is empty the walk is reading the wrong place"
    ).toBeGreaterThan(20)
    // AND THE SAME QUESTION OF THE SUBTRACTION. ARTEFACTS_AT_ROOT is read out of
    // .gitignore, so a rewrite that drops those lines — or moves them behind a
    // pattern this reader does not parse — empties the set in silence, and every
    // scan below quietly starts grading machine output as canon again. An empty
    // exclusion list is indistinguishable from a repository with no artefacts,
    // which is why it is asserted rather than assumed.
    expect(
      [...ARTEFACTS_AT_ROOT],
      "no root .md is ignored any more — did .gitignore change shape? The skills still " +
        "write their reports to the root, and this set is what keeps them out of the canon"
    ).not.toEqual([])
    expect(
      canonDocs().filter((d) => ARTEFACTS_AT_ROOT.has(d)),
      "the walk is handing back a file .gitignore calls an artefact"
    ).toEqual([])
  })

  it("the roster itself is readable, and exactly two doors are public", () => {
    // If this fails, the repo changed shape and every expectation below is moot —
    // fix this first. Two public doors is the LAW (one per front end): a third
    // public address would be a third route onto /internal/*, the agent and the
    // act-as-user surface.
    expect(WORKERS.length, "workers/ must hold at least the six brains + two doors").toBeGreaterThanOrEqual(8)
    expect(PUBLIC_WORKERS).toEqual(["gateway", "portal-gateway"])
  })

  it("no doc states a worker count that disagrees with workers/ on disk", () => {
    const expected = WORKERS.length
    const wrong: string[] = []

    for (const doc of DOCS) {
      const src = prose(read(join(ROOT, doc)))
      // "eight workers" / "8 workers" / "8-worker split" / "eight-worker shape"
      const re = new RegExp(`\\b(${NUM})[ -](workers\\b|worker[- ](?:split|shape|count))`, "gi")
      for (const m of src.matchAll(re)) {
        const n = toNumber(m[1])
        if (n === expected) continue
        const phrase = `${m[1].toLowerCase()} workers`
        if (allowedSubset(doc, phrase)) continue
        wrong.push(`${doc}: "${m[0].trim()}" — there are ${expected} workers on disk (${WORKERS.join(", ")})`)
      }
    }

    expect(
      wrong,
      `A doc names a different number of workers than workers/ holds. Either the doc is stale ` +
        `(fix the sentence) or it is a deliberate SUBSET claim (add it to SUBSET_CLAIMS with a reason):\n` +
        wrong.join("\n")
    ).toEqual([])
  })

  it("no doc states a public-door count that disagrees with the wrangler configs", () => {
    const expected = PUBLIC_WORKERS.length
    const wrong: string[] = []

    for (const doc of DOCS) {
      const src = prose(read(join(ROOT, doc)))
      const re = new RegExp(`\\b(${NUM})[ -]public[ -](?:door|gateway|address|front door)s?\\b`, "gi")
      for (const m of src.matchAll(re)) {
        if (toNumber(m[1]) === expected) continue
        wrong.push(`${doc}: "${m[0].trim()}" — ${expected} workers are public (${PUBLIC_WORKERS.join(", ")})`)
      }
    }

    expect(
      wrong,
      `A doc names a different number of public doors than the wrangler configs allow:\n` + wrong.join("\n")
    ).toEqual([])
  })

  // THE LAWS' RANGE IS DERIVED FROM THE REGISTRY, NEVER TYPED.
  //
  // Earned the same way the worker count was: README.md still advertised
  // "R1–R19" three laws after R22 shipped, and two build plans said "R1–R21".
  // Every one of those sentences was true when written. The range is the single
  // most load-bearing pointer in the rulebook — a reader who trusts it simply
  // never learns that R20, R21 and R22 exist, which is how a law goes unread.
  //
  // `registry-integrity` already forbids a law without its check; this forbids a
  // law the docs never mention.
  it("no doc states a Laws range that stops short of the registry", () => {
    const registry = read(join(ROOT, "shared", "rules", "registry.ts"))
    const ids = [...registry.matchAll(/\bid:\s*"R(\d+)"/g)].map((m) => Number(m[1]))
    expect(ids.length, "registry.ts must declare rule ids as `id: \"R<n>\"`").toBeGreaterThan(0)
    const highest = Math.max(...ids)

    const wrong: string[] = []
    for (const doc of DOCS) {
      const src = prose(read(join(ROOT, doc)))
      // "R1–R19" / "R1-R22" — the range shape only. A bare "R14" cites ONE law
      // and stays sayable; policing every mention would make the check noisy,
      // and a noisy check gets switched off.
      for (const m of src.matchAll(/\bR1\s*[–-]\s*R(\d+)\b/g)) {
        if (Number(m[1]) === highest) continue
        // DISTINCT ids, not raw matches. `ids` counts every `id: "R<n>"` in the
        // file, and `LAW_ID_ORIGIN` carries seven COLLISION RECORDS — R20 to R26,
        // each naming a law `main` minted and one `feat/ui-ux` minted under the
        // same number during the 8 Sep renumbering. So the message said "the
        // registry declares 65 laws" while it declares 58, and the number a
        // reader was being corrected WITH was itself wrong. The assertion was
        // always right (`highest` is a Math.max); only the sentence lied.
        wrong.push(
          `${doc}: "${m[0].trim()}" — the registry declares ${new Set(ids).size} laws, up to R${highest}`
        )
      }
    }

    expect(
      wrong,
      `A doc names a Laws range that disagrees with shared/rules/registry.ts. A reader who ` +
        `trusts the range never learns the newest laws exist — fix the sentence, and say what ` +
        `the new laws are while you are there:\n` + wrong.join("\n")
    ).toEqual([])
  })

  // A UI LAW NOBODY CAN READ IS A UI LAW NOBODY FOLLOWS.
  //
  // The sibling of the range check above, and it closes the same shape one level
  // in. That one stops a document UNDER-STATING how many laws there are; this
  // one stops the laws existing only where a machine reads them.
  //
  // Earned on 2026-09-11, at the client's own instruction — "dont forget about
  // writing the rules in ui ux" — when the count was taken: the registry
  // declared 37 laws with `dimension: "ui"` and UI-RULEBOOK.md named TEN of
  // them. Twenty-seven were enforced by a check and described nowhere a
  // designer or a new developer would look, including every ruling the client
  // herself had made over the preceding fortnight: the toolbar defaults, the
  // empty-collection rule, the two radii, the closed palette, images that fill,
  // the pinned toolbar, the chip above the title, no emoji, nothing on the
  // white. Every one of those was written into `registry.ts` and RULES.md on
  // the day it was ruled — the law books were never the problem. The book a
  // PERSON opens before building a screen was, and nothing checked it, which is
  // exactly how the gap opened silently and stayed open.
  //
  // WHY UI-RULEBOOK AND NOT UI-CONVENTIONS. Both are human-facing and both
  // carry UI law, and requiring an entry in both would make the pair one
  // document with two names. UI-RULEBOOK is the one whose stated job is "every
  // rule has an id you can cite in a pull request", it has a rule index keyed by
  // R-number, and it is the book a designer is sent to. UI-CONVENTIONS keeps its
  // §3 table of the same laws; that table is not asserted here because the
  // assertion that matters is that the law reaches a reader, and a second
  // required copy is a second thing to forget.
  //
  // DELIBERATELY A NAME CHECK, NOT A PROSE CHECK, for the reason this file's own
  // header gives about the worker counts: a check that grades sentences gets
  // switched off, and a check that is off is worse than no check at all. This
  // asks only that the R-number is NAMED. A reader who follows it lands on a
  // rule; a lane that adds a UI law is stopped and made to write one.
  //
  // AND BOTH DIRECTIONS, because an R-number in the book that the registry no
  // longer has is rot of the same kind — it sends a reader to a law that is not
  // there, which is the failure `named-paths` (R58) exists to stop for paths.
  //
  // NOT A NEW LAW, and that is an argument rather than a shortcut. A law cannot
  // be added without its check (`registry-integrity`) and a new R-number costs a
  // RULES.md row, a registry entry and a checkId in the known-checks list — and
  // what this asserts is not a property of the PRODUCT. It is a property of the
  // canon, exactly like "no doc understates the Laws range" above it, which is
  // also unregistered and sits four lines away. This is that check, asked of a
  // named document rather than of a range.
  it("every UI law in the registry is named in UI-RULEBOOK.md", () => {
    const ui = RULES_REGISTRY.filter((r) => r.dimension === "ui").map((r) => r.id)

    // THE TRIPWIRE, the same one every scan in this file carries. A census that
    // comes back empty passes an "everything is documented" assertion perfectly,
    // and that is precisely the failure mode being closed — the gap this check
    // was written for was invisible for weeks because nothing was counting.
    expect(
      ui.length,
      "the registry reported almost no UI laws — the dimension field or the import has changed " +
        "shape. Fix the derivation, never this number: a scan over nothing reports all clear"
    ).toBeGreaterThan(20)

    const book = read(join(ROOT, "documents", "UI-RULEBOOK.md"))
    const named = (id: string) => new RegExp(`\\b${id}\\b`).test(book)

    const undocumented = ui.filter((id) => !named(id))
    expect(
      undocumented,
      `these laws carry dimension: "ui" in shared/rules/registry.ts and are named nowhere in ` +
        `documents/UI-RULEBOOK.md: ${undocumented.join(", ")}\n` +
        `A UI law that only a check can read is a law nobody building a screen will follow. ` +
        `Write it an entry in the section it belongs to — what to do, what it costs where the ` +
        `law has a cost, and the R-number — and add it to that file's rule index. Derive the ` +
        `words from the law's own \`law\` and \`why\` text and from RULES.md; do not invent a ` +
        `rule and do not soften one.`
    ).toEqual([])

    // …AND THE OTHER WAY. An R-number the book cites that the registry no longer
    // holds sends a reader after a law that is not there.
    const known = new Set(RULES_REGISTRY.map((r) => r.id))
    const dangling = [...new Set(book.match(/\bR\d+\b/g) ?? [])].filter((id) => !known.has(id))
    expect(
      dangling,
      `documents/UI-RULEBOOK.md cites ${dangling.join(", ")}, which shared/rules/registry.ts ` +
        `does not declare. Either the law was retired — say so in the past tense, the way the ` +
        `canon narrates every other retirement — or the number is wrong.`
    ).toEqual([])
  })

  // THE ONE NUMBER THAT PRICES A PLATFORM MOVE, DERIVED RATHER THAN REMEMBERED.
  //
  // PLATFORMS.md is the only document that estimates what leaving Cloudflare
  // would cost, and the honest half of that estimate is its admission that the
  // GLOBAL core database has no adapter: it is reached raw, at N call sites in M
  // files, and every effort band in that file understates pillar 1 by exactly
  // that work. The number was typed by hand, and two independent architecture
  // measurements have now caught it stale in a row — 151/27 on the page against
  // 154/28, then against 156/29. It drifts one direction only, nobody reading
  // the sentence can tell, and it is load-bearing.
  //
  // So it is censused off the SOURCE, by the doc's own published command:
  // `grep -rn "env.DB.prepare(" --include='*.ts' workers/ shared/ | grep -v test`,
  // reproduced here line for line — including the fact that `grep -v test`
  // filters the whole `path:line:text`, not just the path.
  it("PLATFORMS.md's core-database count is the count on disk", () => {
    const lines: string[] = []
    for (const { rel, source } of sourceFiles([join(ROOT, "workers"), join(ROOT, "shared")], {
      extensions: [".ts"],
      relativeTo: ROOT,
    }))
      source.split("\n").forEach((text, i) => {
        if (text.includes("env.DB.prepare(")) lines.push(`${rel}:${i + 1}:${text}`)
      })
    // `grep -v test` — the doc's own filter, on the whole line, so the census
    // and the sentence can never mean two different things.
    const hits = lines.filter((l) => !l.includes("test"))
    const sites = hits.length
    const files = new Set(hits.map((l) => l.split(":")[0])).size

    // THE TRIPWIRE. Every assertion below compares against these two numbers, and
    // a walk that found nothing would satisfy an equality with a doc that had
    // been "corrected" to zero. Core is reached raw by five workers; if this is
    // small, the walk is broken, not the codebase.
    expect(sites, "the census collapsed — fix the walk, never the expectation").toBeGreaterThan(100)
    expect(files, "the census collapsed — fix the walk, never the expectation").toBeGreaterThan(15)

    // The three places the file states it, each matched on its own SHAPE so a
    // reworded sentence goes red rather than going quiet — the same bargain
    // SUBSET_CLAIMS above makes. Read off the RAW source, not `prose()`: the
    // first of them carries a backticked identifier, which `prose` strips.
    const src = read(join(ROOT, "documents", "PLATFORMS.md"))
    const CLAIMS: { what: string; re: RegExp; expect: number[] }[] = [
      {
        what: "the pillar-1 table row",
        re: /plus (\d+) raw `env\.DB\.prepare\(…\)` sites in (\d+) files/,
        expect: [sites, files],
      },
      {
        what: "the paragraph that admits core has no adapter",
        re: /\*\*(\d+) call sites across (\d+) production files\*\*/,
        expect: [sites, files],
      },
      { what: "the port estimate", re: /a codemod over (\d+) sites/, expect: [sites] },
    ]

    const wrong: string[] = []
    for (const c of CLAIMS) {
      const m = c.re.exec(src)
      if (!m) {
        wrong.push(
          `${c.what}: PLATFORMS.md no longer states the count in the shape this check reads ` +
            `(${c.re}). Re-point the pattern at the new sentence — do not delete the claim.`
        )
        continue
      }
      c.expect.forEach((want, i) => {
        const said = Number(m[i + 1])
        if (said !== want) wrong.push(`${c.what}: says ${said}, the source has ${want} ("${m[0]}")`)
      })
    }

    expect(
      wrong,
      `PLATFORMS.md's core-database count has drifted from the source. It is the size of the ` +
        `one gap in the estimate of what leaving Cloudflare costs, so a stale figure there ` +
        `understates a port by exactly the work nobody counted. Current census: ${sites} sites ` +
        `in ${files} files.\n` + wrong.join("\n")
    ).toEqual([])
  })

  it("no doc still says a single worker is the only public one", () => {
    // The phrasings the sweep had to correct. They carry no number, so the count
    // check above cannot see them — and each one reads as a security guarantee,
    // which is exactly the kind of sentence that must not be quietly wrong.
    //
    // This one also reads the WRANGLER COMMENTS, not just the .md files. Five of
    // them said "only the gateway is public" — and a config comment is where that
    // rule is read at the exact moment someone is deciding whether to add a public
    // route, so it is the last place that should be out of date.
    const STALE = [
      /\bthe only public door\b(?!s)/i,
      /\bone public door\b/i,
      /\bthe single public door\b/i,
      /\bonly the gateway is public\b/i,
      /\bthe single front desk\b/i,
      /\bthe single public address\b/i,
      /\bthe only worker with a public URL\b/i,
    ]
    const wrong: string[] = []
    const CONFIGS = WORKERS.map((w) => join("workers", w, "wrangler.jsonc"))
    for (const doc of [...DOCS, ...CONFIGS]) {
      const src = prose(read(join(ROOT, doc)))
      for (const re of STALE) {
        const m = src.match(re)
        if (m) wrong.push(`${doc}: "${m[0]}" — ${PUBLIC_WORKERS.length} doors are public (${PUBLIC_WORKERS.join(", ")})`)
      }
    }
    expect(
      wrong,
      `A doc still describes ONE public door. Say how many there really are, and keep the ` +
        `reason the rule exists: no public route may reach /internal/*, the agent, or the ` +
        `act-as-user surface.\n` + wrong.join("\n")
    ).toEqual([])
  })
})

// README.md IS THE CURRENT-STATE FILE, NOT THE CHANGELOG.
//
// Its opening prose had grown five `UPDATED <date>:` stamps INSIDE the sentences
// describing what is true now — including "was 'roles & permissions'" and two
// competing dates for the same fact. It is the first thing every new reader and
// every agent opens, and it was the one place where current state had to be
// sifted out of history. The history is not worthless; it lives in
// BASE-IMPROVEMENTS.md § "When each piece landed", where changes already go.
//
// Scoped to README.md on purpose. ROADMAP.md and SCREEN-ENGINE-PLAN.md are
// declared HISTORY (README says so), so a dated amendment there is the content.
describe("README.md states what is true now, not when it became true", () => {
  const readme = read(join(ROOT, "README.md"))

  it("carries no inline UPDATED/ADDED date stamps", () => {
    const stamps = [...readme.matchAll(/\b(UPDATED|ADDED|BUILT)\s+20\d\d-\d\d-\d\d/g)].map(
      (m) => m[0]
    )
    expect(
      stamps,
      `README.md is the doc map and the current-state file. Put the change in ` +
        `BASE-IMPROVEMENTS.md and write the present tense here: ${stamps.join(", ")}`
    ).toEqual([])
  })

  it("its doc map really does name every root document", () => {
    // The map claims to list them all, and AGENTS.md — the cross-tool filename an
    // agent opens by habit — was the one it never mentioned. A map with a hole in
    // it is worse than no map: a reader trusts it and stops looking.
    // TRACKED documents only — `canonDocs()` has already dropped the root
    // artefacts, using .gitignore as the repo's own answer to "is this ours"
    // (see ARTEFACTS_AT_ROOT). Demanding README link to a file that is not in
    // the repository would make the build red on a machine that had merely run
    // an audit; that reasoning was written here first and now governs the walk
    // itself, so every scan in this file gets it rather than this one alone.
    // The audit artefacts still land at the ROOT, which is why the ignore list is
    // read there — but the canon they had to be told apart from now lives in
    // `documents/`, and nothing in that folder is ever an artefact. Matching on the
    // BASENAME keeps the map's own spelling free: README may write
    // `[CACHING.md](documents/CACHING.md)` or name the file in prose, and either
    // reaches the reader, which is the whole property being checked.
    const canon = canonDocs()
      .map((f) => f.split(sep).pop() as string)
      .filter((f) => f !== "README.md")
      .sort()
    // Same tripwire as above: a map that names nothing passes a scan over nothing.
    expect(canon.length, "the canon collapsed — see the tripwire above").toBeGreaterThan(30)
    const missing = canon.filter((f) => !readme.includes(f))
    // THE FAILURE NAMES BOTH CAUSES, because for a year it named the wrong one.
    // A review skill writes its report to the repo ROOT, and a report that
    // nothing ignores is read here as canon — so the message was "not reachable
    // from README.md's doc map", which sends the reader to edit the doc map and
    // link a file that should never have been read as a document. Twelve skills
    // write such a report and .gitignore excused five of them, so five of the
    // twelve failed usefully and seven failed misleadingly.
    expect(
      missing,
      `these documents are not reachable from README.md's doc map: ${missing.join(", ")}\n` +
        `If one of those is a REVIEW SKILL's report rather than a document — anything ` +
        `matching *-review.md or *-report.md — it does not belong in the doc map at all: ` +
        `give it a line in .gitignore beside the others, which is where this check reads ` +
        `"not ours" from. scaling-review.md is the one report that IS a document, and ` +
        `.gitignore says why.`
    ).toEqual([])
  })
})

/** A RULING CHANGED THE CODE. DID IT CHANGE THE PROSE?
 *
 * Nothing here asked that question until 2026-09-10, and the cost of not asking
 * was six instances of one shape in a single session: R57's component count,
 * the Laws range, a lane brief's worktree path, the .gitignore artefacts, and
 * the Activity-tab retirement TWICE - once closed in one file and left live in
 * five others (including eight lines below the amendment itself), then swept on
 * `grep "Activity tab"`, which cannot match "Overview + Activity", so seven more
 * survived.
 *
 * THE SECOND SWEEP IS WHY THIS EXISTS. Nobody was careless. A person swept
 * properly, read every hit and decided each honestly - WITH A PATTERN. A pattern
 * is a hand-listed census, which is the exact thing R14, R19, R22, R36, R47 and
 * R54 exist to forbid, and this one inherited the blind spot of the list it was
 * meant to supersede. So the vocabulary stops being somebody's memory and
 * becomes data.
 *
 * Each entry is a thing the product RETIRED and the phrases that describe it as
 * still living. A phrase is allowed when a RETIREMENT MARKER sits within two
 * lines of it, so the canon may narrate the history freely and may not state the
 * dead thing as present. Rot-checked: a phrase nothing says any more is a line
 * to delete, or this becomes a record of what the docs used to be wrong about.
 *
 * NARROW ON PURPOSE, like GLOSSARY_SYNONYMS. And matched on WORD BOUNDARIES: the
 * first draft flagged "an activity table past ~5M rows" because "activity tab"
 * is a substring of "activity table", which is the same class of sloppiness the
 * check is here to catch. */
const RETIRED_IN_THE_CANON: Record<string, { since: string; phrases: RegExp[] }> = {
  "the record Activity tab": {
    since: "2026-09-07, the client's ruling: kill all old activity tabs",
    phrases: [/overview \s*\+\s*activity/i, /\bactivity tabs?\b/i, /<ActivityPanel>/i],
  },
  // THE INTERNAL RATES, 2026-09-10. The canon described a THREE-card money model
  // for a month and the client cut it to one, so a document that still says
  // "what our own hour costs" in the present tense is telling the next agent to
  // build against a table that is not there.
  //
  // THE PHRASES ARE NARROW ON PURPOSE, and the narrowness is the whole of
  // whether this line is usable. A bare /margin/ matches `--margin--m` in
  // UI-RULEBOOK, "four times the margin it had" in ARCHITECTURE, "Resend Pro
  // marginal" in COSTS and a dozen CSS notes — a rule that fires on a dozen true
  // sentences is a rule the next person deletes. So: the two table names, which
  // can mean nothing else; the phrase "internal rate", which was only ever this
  // feature; and "margin" ONLY where it is qualified as money.
  "the internal rate cards and the margin": {
    since:
      "2026-09-10, the client's ruling: \"kill the whole internal rates thing. will develop this in the future much much more but for now i iwanna wipe it clean\". Both tables dropped by team migration 0077, the two screens and lib/internal-money.ts deleted, six agent tools and seven doors removed, and R24's structural inbound half retired with them",
    phrases: [
      /\binternal_role_rates\b/,
      /\binternal_rates\b/,
      /\binternal rate/i,
      /\brole rate card\b/i,
      /\bmargin (?:panel|door|math|arithmetic|screens?)\b/i,
      /\bthe margin (?:is|and|computed|never)\b/i,
    ],
  },
  // THE ACCOUNT RATE CARD, 2026-09-10, an hour after the internal rates and by
  // the same person. The line above is its sibling and the two are deliberately
  // separate entries rather than one widened one: they were retired by two
  // different rulings, they dropped two different tables in two different
  // migrations, and a document can be current about one and stale about the
  // other — which is exactly what happened to four passages between the two
  // rulings.
  //
  // NARROW FOR THE SAME REASON, and it is a sharper problem here: "rate card" on
  // its own is a phrase COSTS.md uses five times about Cloudflare's and
  // Anthropic's published prices, which is a real and unrelated meaning. So the
  // phrases are the table name, the tool names, the QUALIFIED phrase "account
  // rate card", and the screen it was drawn on — none of which can mean anything
  // else in this repo.
  "the account rate card": {
    since:
      "2026-09-10, the client's ruling: \"The whole account rates also killed it\", an hour after she retired the internal rates. Table dropped by team migration 0078, lib/rates.ts and web/components/money/ deleted, four doors and three agent/MCP tools removed, `set_record_active` lost its `account_rate` record, and the Rates tab on a client's record went with the card it drew",
    phrases: [
      /\baccount_rates\b/,
      /\baccount rate cards?\b/i,
      /\blist_account_rates\b/,
      /\bcreate_account_rate\b/,
      /\bupdate_account_rate\b/,
      /\bset_account_rate_active\b/,
      /\bRates tab\b/,
    ],
  },
}

/** Words that make a mention HISTORY rather than a claim. Generous on purpose:
 * the failure caught here is a doc asserting a dead thing is alive, and a
 * passage that mentions the retirement at all is not doing that. */
const RETIREMENT_MARKERS =
  /retir|\bwas\b|\bwere\b|used to|until|no longer|any more|not an? |since |kill|remov|shipped|grew|old /i

/** DOCUMENTS THAT ARE HISTORY BY DECLARATION, where describing the old world is
 * the job. Data with a reason each, rot-checked below so the list can only
 * shrink - the same shape every exemption in this repo takes. */
const HISTORY_DOCS: Record<string, string> = {
  "documents/ROADMAP.md":
    "README's doc map calls it 'history, not a plan' in those words - the build record of a round that closed on 2026-07-02, so it describes the app as it was and must not be edited to describe the app as it is",
  "documents/SCREEN-ENGINE-PLAN.md":
    "the screen-recipe engine's own build plan, declared history by README's map; it records what that round shipped, Activity tab included",
}

/** THE RESIDUE THE MARKERS CANNOT READ, decided by a person and written down.
 *
 * `RETIREMENT_MARKERS` is a heuristic and it is doing real work — it clears most
 * of the canon's history-telling without anybody listing it. But it is a
 * HAND-LIST OF WORDS, and the first three lines it could not read were narrated
 * with "shipping", "went with" and a clause the splitter cut the marker off
 * from. Widening the vocabulary every time it misses one is the exact failure
 * this whole control exists because of: `story_checks_out_review` spent six
 * rounds proving that a pattern is a hand-listed census, and a longer pattern is
 * a longer hand-list.
 *
 * So the residue becomes BOUNDED data instead. Each key is a distinctive
 * fragment of the line — not a line NUMBER, which every edit above it would
 * shift — and each value says why that mention is history. Rot-checked: a
 * fragment that no longer appears, or one whose line the markers now clear on
 * their own, turns the build red and the line gets deleted. It can only shrink,
 * and a human read every entry in it. */
const NARRATES_THE_RETIREMENT: Record<string, string> = {
  '"kill all old activity tabs", the history reached instead from':
    "R2's own law text quoting the client's ruling — the sentence that RETIRES the tab. The marker is the quote itself and the clause splitter cuts it off from the mention",
  "shipping an Activity tab with no count at all":
    "R8's *Earned by:* clause, describing the world before the amendment. 'shipping' is a gerund the marker list does not carry, and adding it would clear live prose too",
  'activity tabs"): a record\'s history is reached from the ink footer':
    "UI-CONVENTIONS' own code comment, where the client's quoted ruling WRAPS across two lines — 'The client retired it on 7 Sep 2026 (\"kill all old' ends the line above. The clause splitter cannot see a marker that is on the previous line, and widening it to neighbours wholesale would restore the exact blind spot this control was tightened to close",
  "The `<ActivityPanel>` half went with the Activity tab on 7 Sep 2026":
    "BUILD-A-MODULE's correction of its own false clause, 10 Sep 2026 — it says the obligation moved, in the sentence that says so. 'went with' is not a marker and should not become one",
}

describe("a ruling that changed the code changed the prose too", () => {
  const isPlan = (doc: string): boolean => doc.startsWith(".plans/")
  // WHAT A SKILL LEAVES AT THE ROOT is not in DOCS at all any more — see
  // ARTEFACTS_AT_ROOT beside the walk. This block used to derive that set a
  // second time and skip on it here; `/-review[.]md$/` before that matched
  // `story-review.md` and NOT `lean-mean-report.md` or
  // `interface-lessness-report.md`, a predicate already a hand-list of two
  // thirds of its own subject, which is the shape this whole file spent a day
  // learning to distrust.

  it("no document states a retired thing as if it were still there", () => {
    const offenders: string[] = []
    for (const doc of DOCS) {
      if (HISTORY_DOCS[doc] || isPlan(doc)) continue
      let lines: string[]
      try {
        lines = read(join(ROOT, doc)).split("\n")
      } catch {
        continue
      }
      for (const [thing, { phrases }] of Object.entries(RETIRED_IN_THE_CANON))
        lines.forEach((line, i) => {
          // PER CLAUSE, NOT PER LINE — the blind spot `story_checks_out_review`
          // found ninety seconds after this shipped, by constructing the case
          // it thought might be missed rather than reverting one it knew was
          // caught. A marker anywhere on the line used to wave the WHOLE line
          // through, so this sentence passed while half of it was false:
          //
          //   "(it was <ActivityPanel> until 7 Sep 2026) and asserts each
          //    contains TabsView + <ActivityPanel>."
          //
          // The first mention is history, the second is a live claim about an
          // assertion the check stopped making, and they are one clause apart
          // in the very line where the review had said that reading for one
          // shape makes a second shape in the same line invisible.
          //
          // So each MATCH is judged on its own surroundings: the text between
          // the clause breaks either side of it, widened to the neighbouring
          // lines only when the clause itself is short, because prose wraps and
          // a retirement is routinely narrated in the sentence above.
          const context = (at: number): string => {
            const before = line.slice(0, at)
            const after = line.slice(at)
            const open = Math.max(
              ...[".", ";", "—", ")", " and ", " but "].map((d) => before.lastIndexOf(d))
            )
            const shut = Math.min(
              ...[".", ";", "—", "(", " and ", " but "]
                .map((d) => after.indexOf(d))
                .filter((n) => n >= 0)
                .concat([after.length])
            )
            const clause = line.slice(open + 1, at + shut)
            // A clause too short to carry its own history is read with its
            // neighbours; a full one is judged alone.
            return clause.length < 40 ? lines.slice(Math.max(0, i - 2), i + 3).join(" ") : clause
          }
          let flagged = false
          for (const re of phrases) {
            const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)
            for (const m of line.matchAll(rx)) {
              if (flagged) break
              if (RETIREMENT_MARKERS.test(context(m.index ?? 0))) continue
              if (Object.keys(NARRATES_THE_RETIREMENT).some((frag) => line.includes(frag))) continue
              offenders.push(`${doc}:${i + 1} states ${thing} as live: ${line.trim().slice(0, 90)}`)
              flagged = true
            }
          }
        })
    }
    expect(
      offenders,
      "a document describes something the product retired as if it were still there. " +
        "Say it in the past tense, or name the retirement within two lines"
    ).toEqual([])
  })

  it("every retired thing is still worth naming, and every history exemption is real", () => {
    const canon = DOCS.map((d) => {
      try {
        return read(join(ROOT, d))
      } catch {
        return ""
      }
    }).join("\n")
    for (const [thing, { phrases }] of Object.entries(RETIRED_IN_THE_CANON))
      expect(
        phrases.some((re) => re.test(canon)),
        `RETIRED_IN_THE_CANON lists "${thing}", which the canon no longer mentions at all - delete the entry`
      ).toBe(true)
    for (const [frag, why] of Object.entries(NARRATES_THE_RETIREMENT)) {
      expect(
        canon.includes(frag),
        `NARRATES_THE_RETIREMENT still lists "${frag.slice(0, 40)}…", which the canon no longer says — delete the line`
      ).toBe(true)
      expect(why.length, `"${frag.slice(0, 30)}…" needs a real reason`).toBeGreaterThan(40)
    }
    for (const [doc, why] of Object.entries(HISTORY_DOCS)) {
      expect(existsSync(join(ROOT, doc)), `HISTORY_DOCS names ${doc}, which is gone - delete the line`).toBe(true)
      expect(why.length, `${doc} needs a real reason`).toBeGreaterThan(40)
    }
  })
})
