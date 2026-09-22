#!/usr/bin/env node
/**
 * sync-design.mjs — pull the kwapso design system into shared/ui/ at a tag.
 *
 * The kit at github.com/Kwapso/kwapso-ui-ux is a DEPENDENCY, vendored rather than
 * installed, so that `npm ci` and the Cloudflare build never need private-repo
 * credentials. This script is the only door new kit code enters through:
 *
 *     node scripts/sync-design.mjs v0.9.0
 *
 * It clones the repo at that tag (default: the tag pinned in
 * shared/ui/VERSION.json), replaces shared/ui/ with the kit's deliverable
 * directories, and writes VERSION.json with the tag, the commit sha, and a
 * content hash. `npm run check` recomputes that hash (web/test/vendored-kit
 * .test.ts) and goes red if anything under shared/ui/ was hand-edited since —
 * a local edit to the kit must be made upstream instead, or the fork drifts.
 *
 * --from <path>   VENDOR FROM A LOCAL CLONE INSTEAD OF GITHUB, for a tag that
 * is minted locally but deliberately not pushed yet (client: "do not update
 * the ui repo yet, we will first iterate on this"). The default two-URL
 * GitHub path above is untouched — `--from` is opt-in, one extra argument:
 *
 *     node scripts/sync-design.mjs v1.2.149 --from ../kwapso-design
 *
 * This clones the TAG out of the local working copy at that path (a plain
 * local `git clone --branch`, no network, no identity) rather than out of
 * `origin`, so an unpushed tag vendors exactly as a pushed one would.
 * VERSION.json then carries `"source": "local"` (the default GitHub path
 * writes `"source": "github"`) so the next reader — and `kit:drift`, see its
 * own header — knows this vendored copy did not come from the remote and the
 * tag still owes the kit repo a push. `--from` is for iterating BEFORE that
 * push, never a substitute for it: push the tag to origin before any other
 * app is pointed at it, and re-run this script without `--from` once it is
 * (the hash will not change, only VERSION.json's `source`/`sha` bookkeeping
 * — both already agree, since the local clone and origin share history once
 * pushed).
 *
 * shared/ui/ is also excluded from this repo's oxlint (.oxlintrc.json), for
 * the same reason node_modules is: it is a DEPENDENCY. Its own repo lints it;
 * linting a vendored copy we may not edit would only produce unactionable red.
 *
 * CLONING CARRIES THE `alaap-kwapso` IDENTITY, and both halves of that were
 * learned the hard way, so both are written down.
 *
 * A username in the URL does not SELECT a credential — it forces git to look
 * one up for that exact user, and when the keychain has nothing filed under it
 * git falls through to an interactive password prompt. There is no terminal on
 * the vendor path, so on 7 Sep 2026 the prompt failed as `could not read
 * Password … Device not configured` and the step died at `git clone` with the
 * tag sitting correctly on the remote. That is why the identity was taken out.
 *
 * AND THE PLAIN URL IS WORSE, measured on 8 Sep 2026 during the main ×
 * feat/ui-ux merge: `https://github.com/Kwapso/kwapso-ui-ux.git` lets the
 * machine's DEFAULT credential answer, and that account cannot see this
 * repository, so the clone returns `Repository not found` — a 404 that reads
 * like a deleted repo rather than a wrong account. The identity URL cloned
 * v1.2.70 on the first attempt on the same machine in the same minute.
 *
 * So the failure is not the username; it is a keychain with nothing filed
 * under it. If this prompts, file the `alaap-kwapso` credential rather than
 * removing the identity — removing it swaps a loud failure for a misleading
 * one.
 */

import { execSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import { join, dirname, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const TARGET = join(ROOT, "shared", "ui")
/* TWO URLS, TRIED IN ORDER, BECAUSE BOTH OPERATORS ARE RIGHT ABOUT THEIR OWN
 * MACHINE — 9 Sep 2026, after this line was changed and changed back.
 *
 * The identity URL forces git to look up a credential filed under
 * `alaap-kwapso`. On the machine that has one, that is the only URL that
 * works: the plain URL lets the DEFAULT credential answer, that account cannot
 * see the repository, and the clone returns `Repository not found` — a 404
 * that reads like a deleted repo.
 *
 * On a machine WITHOUT that entry the same URL is the failure: git falls
 * through to an interactive password prompt, and on a path with no terminal
 * that is `could not read Password … Device not configured`. The plain URL
 * works there, because the default credential CAN see the repository.
 *
 * So the fault was never the username; it is which credential the machine has
 * filed. One line cannot be right for both, and it was reverted once in each
 * direction. Trying them in order is: the identity first, because where it
 * works it is the only thing that does, and the plain URL second. Whichever
 * answers, answers — and the failure message names both so the next person
 * does not change the line a third time. */
const REPOS = [
  "https://alaap-kwapso@github.com/Kwapso/kwapso-ui-ux.git",
  "https://github.com/Kwapso/kwapso-ui-ux.git",
]

/** The kit's deliverable surface. demo/, verify/, mini-app/ and the GAPS
 * paper trail stay upstream — they are the workshop, not the product. */
const DELIVERED = [
  /* THE LAYOUT CHANGED AT v1.1.0 and this list is the record of it. The kit
     restructured to the four words the client uses: `controls/` and
     `structures/` became one `components/`, and `tokens/`, `icons/` and
     `motion/` moved under `foundations/`. Nothing was renamed inside those
     folders — 1,431 of 1,507 moved paths are byte-identical and not one
     basename changed — so this is a pure folder move and the app's imports
     follow it mechanically.

     `lib/` stayed at top level and is byte-identical between versions, which
     is why the app's `@shared/ui/lib/*` imports need no change at all.

     `docs/` arrives too, since 2026-08-27: five rulebooks, about 156 KB, that
     had never once reached this repository because they were not on this list.
     See the git history of this line. */
  "components", "compositions", "foundations",
  "lib", "assets", "manifest.json", "README.md", "CHANGELOG.md", "docs",
]

/** One hash over every delivered file's path + bytes, path-sorted, so the
 * hand-edit guard can recompute it without git. */
export function contentHash(dir) {
  const files = []
  const walk = (d) => {
    for (const e of readdirSync(d).sort()) {
      if (e === "VERSION.json") continue
      const p = join(d, e)
      if (statSync(p).isDirectory()) walk(p)
      else files.push(p)
    }
  }
  walk(dir)
  const h = createHash("sha256")
  for (const f of files) {
    h.update(relative(dir, f))
    h.update("\0")
    h.update(readFileSync(f))
    h.update("\0")
  }
  return h.digest("hex")
}

const main = async () => {
  // --from <path> is the only flag; everything else on the line is positional
  // (the tag). Parsed out first so `tag` below never sees the flag's own
  // tokens.
  const rawArgs = process.argv.slice(2)
  const fromFlagAt = rawArgs.indexOf("--from")
  const fromPath = fromFlagAt === -1 ? null : rawArgs[fromFlagAt + 1]
  if (fromFlagAt !== -1 && !fromPath) {
    console.error("usage: node scripts/sync-design.mjs [<tag>] --from <path-to-local-kit-clone>")
    process.exit(1)
  }
  // GUARDED AGAINST THE ABSENT FLAG, 22 Sep 2026. This read
  // `i !== fromFlagAt && i !== fromFlagAt + 1`, and when `--from` is absent
  // `fromFlagAt` is -1, so the second clause became `i !== 0` and silently ate
  // the TAG. `sync-design.mjs v1.2.163` therefore fell through to the pinned
  // tag and re-vendored the version already on disk, reporting success. It
  // only stayed invisible because every earlier GitHub sync happened to name
  // the tag that was already pinned. A tag argument that is quietly discarded
  // is how the wrong kit ships, so the flag's own indices are only excluded
  // when the flag is actually there.
  const drop = fromFlagAt === -1 ? new Set() : new Set([fromFlagAt, fromFlagAt + 1])
  const positional = rawArgs.filter((_, i) => !drop.has(i))

  const pinned = existsSync(join(TARGET, "VERSION.json"))
    ? JSON.parse(readFileSync(join(TARGET, "VERSION.json"), "utf8")).tag
    : null
  const tag = positional[0] ?? pinned
  if (!tag) {
    console.error("usage: node scripts/sync-design.mjs <tag> [--from <path>]   (no VERSION.json to default from)")
    process.exit(1)
  }

  const tmp = mkdtempSync(join(tmpdir(), "kwapso-design-"))
  try {
    let cloned = false
    if (fromPath) {
      // LOCAL SOURCE — for a tag minted in the kit repo and deliberately not
      // pushed yet. A plain local `git clone --branch` against a path on
      // disk needs no network and no identity: git treats the path exactly
      // like a remote and can see any tag committed there, pushed or not.
      const resolvedFrom = resolve(fromPath)
      if (!existsSync(join(resolvedFrom, ".git")))
        throw new Error(`sync-design --from: ${resolvedFrom} is not a git repository`)
      console.log(`sync-design: cloning LOCAL ${resolvedFrom} at ${tag} (source: local, not origin) …`)
      try {
        execSync(`git clone --quiet --depth 1 --branch ${tag} ${resolvedFrom} ${tmp}/kit`, {
          stdio: ["ignore", "ignore", "pipe"],
        })
        cloned = true
      } catch (err) {
        throw new Error(
          `sync-design --from: tag ${tag} not found in the local clone at ${resolvedFrom}.\n` +
            `  ${String(err.stderr ?? err.message).trim().split("\n")[0]}\n` +
            "  Check the tag was actually committed there (git tag --points-at HEAD)."
        )
      }
      console.log(
        "sync-design: NOTE — this tag is vendored from a local clone and may not be on GitHub yet. " +
          "Push it to origin before any other app consumes this tag; `npm run kit:drift` will warn " +
          "(not fail) about this until then."
      )
    } else {
      console.log(`sync-design: cloning Kwapso/kwapso-ui-ux at ${tag} …`)
      // GIT_TERMINAL_PROMPT=0 turns a hung password prompt into a fast failure,
      // which is what makes trying the second URL possible at all.
      const failures = []
      for (const repo of REPOS) {
        try {
          execSync(`git clone --quiet --depth 1 --branch ${tag} ${repo} ${tmp}/kit`, {
            stdio: ["ignore", "ignore", "pipe"],
            env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
          })
          cloned = true
          break
        } catch (err) {
          failures.push(`  ${repo}\n    ${String(err.stderr ?? err.message).trim().split("\n")[0]}`)
        }
      }
      if (!cloned)
        throw new Error(
          `sync-design: neither remote answered for ${tag}.\n${failures.join("\n")}\n` +
            "  Both URLs are tried on purpose — see the note beside REPOS. If the\n" +
            "  identity URL prompts, file the `alaap-kwapso` credential; if the plain\n" +
            "  one 404s, your default account cannot see the repository.\n" +
            "  If this tag is only committed locally and not pushed yet, use\n" +
            "  --from <path-to-local-kit-clone> instead."
        )
    }
    const sha = execSync(`git -C ${tmp}/kit rev-parse HEAD`).toString().trim()

    for (const entry of DELIVERED)
      if (!existsSync(join(tmp, "kit", entry)))
        throw new Error(`the kit at ${tag} is missing ${entry} — refusing a partial vendor`)

    rmSync(TARGET, { recursive: true, force: true })
    for (const entry of DELIVERED)
      cpSync(join(tmp, "kit", entry), join(TARGET, entry), { recursive: true })

    /* THE ART STAGE IS GONE, and its absence is the point. Until v1.0.8 the
       kit shipped icon NAMES and no icon ART, so this script stood lucide's
       glyphs in front of the placeholders on the way past. v1.0.8 ships the
       Iconoir pack — 1,383 drawn glyphs — so there is nothing to stand in for,
       and scripts/icon-art.mjs is deleted rather than left switched off. The
       app imports no icon package at all now; web/test/icon-vocabulary.test.ts
       keeps it that way. */
    const hash = contentHash(TARGET)
    writeFileSync(
      join(TARGET, "VERSION.json"),
      JSON.stringify(
        {
          repo: "Kwapso/kwapso-ui-ux",
          tag,
          sha,
          hash,
          syncedAt: new Date().toISOString().slice(0, 10),
          // "local" when vendored via --from (an unpushed tag, iterated from a
          // local kit clone); "github" for the ordinary origin clone above.
          // kit-drift.mjs reads this to warn, not fail, that a local-sourced
          // tag is not yet on origin.
          source: fromPath ? "local" : "github",
          iconArt: { count: readdirSync(join(TARGET, "foundations", "icons")).filter((f) => f.endsWith(".svg")).length, source: "kwapso-ui-ux" },
        },
        null,
        2
      ) + "\n"
    )
    console.log(`sync-design: shared/ui is now ${tag} (${sha.slice(0, 9)}), hash ${hash.slice(0, 12)}…`)
    console.log("sync-design: now run `node scripts/design-imports.mjs`, then `npm run check`.")
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
