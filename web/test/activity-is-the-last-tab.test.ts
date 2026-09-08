import { describe, expect, it } from "vitest"
import { readFileSync, globSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

/* ACTIVITY IS ALWAYS THE LAST TAB, THE FURTHEST TO THE RIGHT.
 *
 * The client, 2026-09-06: "In all the screens across the app, Activity is
 * always the last tab, the furthest to the right."
 *
 * It is a rule about position, and position is the only thing that carries it.
 * Activity is the one tab on every record that is ABOUT the record rather than
 * PART of it — a log of what happened, not another face of the thing — so it
 * sits where a person stops looking rather than in the middle of the work. Nine
 * detail screens already did this; `help-detail` had it third, with Related
 * stories, Work logs, Files and links and Stakeholders to its right, so the
 * ticket was the one record where the log interrupted the record.
 *
 * WHY A TEST AND NOT A CONVENTION. Nothing about a tabs array makes its order
 * visible in review — a new tab is appended to the end, which is exactly where
 * this rule says the log belongs, so the ordinary way to add a tab is also the
 * way to break this. The check reads the arrays off disk rather than rendering,
 * because the fact is positional and lexical: which entry comes last.
 */
describe("every tabbed record", () => {
  it("puts Activity last, the furthest right", () => {
    const files = globSync("{web,web-portal}/components/**/*.tsx", {
      cwd: ROOT,
      exclude: (p) => p.includes("node_modules") || p.includes("/.next/"),
    })
    const wrong: string[] = []
    for (const file of files) {
      const source = readFileSync(join(ROOT, file), "utf8")
      let from = 0
      for (;;) {
        const open = source.indexOf("tabs: [", from)
        if (open === -1) break
        // Walk to the array's own close, so nested arrays inside a tab entry
        // (a conditional group, a spread) do not end the scan early.
        let i = open + "tabs: [".length
        let depth = 1
        while (depth > 0 && i < source.length) {
          if (source[i] === "[") depth++
          else if (source[i] === "]") depth--
          i++
        }
        const block = source.slice(open, i)
        from = i
        const labels = [...block.matchAll(/label:\s*t\("([^"]+)"\)/g)].map((m) => m[1])
        if (!labels.includes("Activity")) continue
        if (labels[labels.length - 1] !== "Activity") {
          const after = labels.slice(labels.indexOf("Activity") + 1)
          wrong.push(
            `${file} — Activity is followed by ${after.map((l) => `"${l}"`).join(", ")}`
          )
        }
      }
    }
    expect(
      wrong,
      "Activity must be the last tab on every record (client, 2026-09-06). Move the entry to " +
        "the end of the array:\n" + wrong.join("\n")
    ).toEqual([])
  })
})
