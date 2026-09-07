#!/usr/bin/env node
/**
 * components-layout-codemod.mjs — fold web/components' flat folder into one
 * subfolder per module or kind, and move every reference with it.
 *
 *     node scripts/components-layout-codemod.mjs --check   report only, write nothing
 *     node scripts/components-layout-codemod.mjs           move + rewrite
 *
 * THE MOVE. 128 components sat flat beside three subfolders (deep-link/,
 * process/, screens/). Each goes to the folder of the module it belongs to
 * (tickets/, work/, accounts/ …) or the kind it is (shell/, records/). No
 * basename changes — this is a pure folder move, like the kit's own layout
 * move (scripts/kit-layout-codemod.mjs), which this script is modelled on.
 *
 * WHY A SCRIPT AND NOT A `sed`. The proof, not the rewrite. Every rewritten
 * specifier and every rewritten path string is resolved against the disk AFTER
 * the move and BEFORE anything is written; one that does not resolve is a hard
 * failure. Three shapes of reference are rewritten, and nothing else is touched:
 *
 *   1  `@/components/<base>`               import specifiers, web/ only (the alias
 *                                          is per app — the portal's own
 *                                          `@/components/…` is a different folder)
 *   2  `web/components/<base>[.tsx]`       path strings anywhere — registry keys,
 *                                          test reads, scripts, the canon in
 *                                          documents/ and the four root docs
 *   3  `WEB|"web"|"..", "components", "<base>.tsx"`   the tests' own join() reads
 *   4  `components/<base>.tsx`               the same read written as one string
 *                                          (`read("components/app-shell.tsx")`),
 *                                          the prose in web/lib that names a
 *                                          component, and the registry's web-relative
 *                                          `pagerFile` paths — nowhere else, for the
 *                                          reason in 1
 *
 * A reference this script cannot classify is left alone for tsc and the suite
 * to find — loudly, as an ENOENT, never as a silent skip.
 *
 * KEPT, like its model. kit-layout-codemod.mjs is still on disk and CLAUDE.md
 * cites it as the record of HOW 671 import sites moved; this is the same
 * record for 128 components and every reference to them. Re-running it on a
 * folded tree is a no-op — the plan names no flat file, so it moves nothing.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const COMPONENTS = join(ROOT, "web", "components")
const CHECK = process.argv.includes("--check")

/** Where each flat component goes. Basenames only — nothing is renamed. */
const LAYOUT = {
  shell: [
    "app-shell", "team-section-nav", "team-switcher", "profile-menu", "brand-mark", "version-watch",
    "install-prompt", "error-boundary", "in-app-link", "timer-bar", "auth-card",
  ],
  "deep-link": ["deep-link-screen"],
  records: [
    "record-chrome", "record-picker", "record-table", "record-calendar", "collection-heading", "counted-tabs",
    "overview-list", "paged-find", "load-more", "activity-panel", "relationship-map", "file-picker",
    "translate-human-text",
  ],
  assistant: [
    "agent-blocks", "agent-history-dialog", "agent-host", "agent-markdown", "agent-panel", "agent-sources",
    "agent-usage-dialog", "ask-the-assistant", "assistant-limit-notice",
  ],
  tickets: [
    "help-attachments", "help-detail", "help-form-dialog", "help-stakeholders", "tickets-collection",
    "triage-reply-dialog", "triage-strip", "resolve-dialog", "mail-reply-dialog",
  ],
  work: [
    "stories-screen", "story-attachments", "story-detail", "story-form-dialog", "review-dialog",
    "sprint-detail", "sprint-form-dialog", "sprints-screen",
    "task-detail", "task-form-dialog", "tasks-screen", "todo-form-dialog",
    "time-form-dialog", "time-panel", "time-screen",
    "wave-detail", "wave-finder", "wave-form-dialog", "waves-screen",
    "work-logs-panel", "work-panels",
  ],
  accounts: [
    "account-detail", "account-detail-panels", "account-form-dialog", "client-org-panel",
    "contact-detail", "contact-link-dialog", "contact-panels", "contacts-by-company", "contacts-screen",
  ],
  apps: [
    "app-detail", "app-form-dialog", "app-money-panel", "app-tiles", "apps-screen",
    "modules-panel", "deliverables-panel", "stakeholders-panel",
  ],
  process: [
    "process-date-slider", "process-detail", "process-flowchart", "process-form-dialog", "process-map",
    "processes-screen", "step-form-dialog", "draft-review", "read-a-call", "impact-panel",
  ],
  money: ["internal-rate-card", "account-rate-card", "rate-form-dialog", "margin-panel"],
  team: [
    "invitations", "invite-dialog", "role-detail", "role-form-dialog", "role-picker-dialog",
    "create-team-dialog", "team-edit-dialog", "staff-panel", "staff-profile-dialog", "certificate-form-dialog",
    "legal-details-dialog", "profile-dialog", "email-change-dialog", "access-tokens",
    "internal-screens", "internal-record-dialog",
  ],
  knowledge: [
    "knowledge-detail", "knowledge-form-dialog", "knowledge-upload-dialog",
    "google-connections", "google-scope-dialog", "google-source-dialog", "google-sync",
  ],
  meetings: ["meeting-detail", "meeting-form-dialog", "meetings-screen"],
  choices: ["selectable-detail", "selectable-form-dialog", "selectable-screen", "manage-dropdowns-link"],
  screens: ["import-screen", "pulse", "pulse-charts"],
}

/** base → folder, and the check that the plan names every flat file exactly once. */
const FOLDER = new Map()
for (const [folder, bases] of Object.entries(LAYOUT))
  for (const base of bases) {
    if (FOLDER.has(base)) fail(`${base} is listed twice (${FOLDER.get(base)} and ${folder})`)
    FOLDER.set(base, folder)
  }
const flat = readdirSync(COMPONENTS)
  .filter((e) => statSync(join(COMPONENTS, e)).isFile() && e.endsWith(".tsx"))
  .map((e) => e.replace(/\.tsx$/, ""))
const unplanned = flat.filter((b) => !FOLDER.has(b))
const missing = [...FOLDER.keys()].filter((b) => !flat.includes(b) && !existsSync(join(COMPONENTS, FOLDER.get(b), `${b}.tsx`)))
if (unplanned.length) fail(`flat components with no folder in the plan: ${unplanned.join(", ")}`)
if (missing.length) fail(`plan names components that do not exist: ${missing.join(", ")}`)
console.log(`\ncomponents-layout-codemod${CHECK ? " (--check)" : ""}`)
console.log("-".repeat(30))
console.log(`  flat components planned   ${flat.length} → ${Object.keys(LAYOUT).length} folders`)

// 1 · THE MOVE
let moved = 0
for (const base of flat) {
  const folder = FOLDER.get(base)
  if (!CHECK) {
    mkdirSync(join(COMPONENTS, folder), { recursive: true })
    renameSync(join(COMPONENTS, `${base}.tsx`), join(COMPONENTS, folder, `${base}.tsx`))
  }
  moved++
}
console.log(`  files moved               ${moved}`)

/** Does this component path name a real file on the (post-move) disk? Under
 * --check the move has not happened, so the planned location is what counts. */
function resolves(folder, base) {
  return CHECK ? flat.includes(base) || existsSync(join(COMPONENTS, folder, `${base}.tsx`)) : existsSync(join(COMPONENTS, folder, `${base}.tsx`))
}

// 2 · THE REWRITE
const SKIP = new Set(["node_modules", ".next", "out", ".git", "ui", ".plans", ".session-notes", "glide", "dist", "coverage"])
const walk = (d, out = []) => {
  for (const e of readdirSync(d)) {
    if (SKIP.has(e)) continue
    const p = join(d, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|mjs|md|css|jsonc)$/.test(e)) out.push(p)
  }
  return out
}
const files = [
  ...["web", "web-portal", "shared", "workers", "scripts", "tools", "documents"].flatMap((r) => walk(join(ROOT, r))),
  ...readdirSync(ROOT).filter((f) => f.endsWith(".md")).map((f) => join(ROOT, f)),
]

const BASE = "([a-z0-9-]+)"
let rewritten = 0, filesTouched = 0
const unresolved = new Map()
const leftAlone = (whole) => {
  unresolved.set(whole, (unresolved.get(whole) ?? 0) + 1)
  return whole
}

for (const path of files) {
  const before = readFileSync(path, "utf8")
  let after = before
  const inWeb = path.startsWith(join(ROOT, "web") + "/")
  const isTest = /\/(web|workers\/[^/]+)\/test\//.test(path)

  // 1 · `@/components/<base>` — web/ only; the portal's alias is its own folder.
  if (inWeb)
    after = after.replace(new RegExp(`@/components/${BASE}(?=["'\`])`, "g"), (whole, base) => {
      const folder = FOLDER.get(base)
      if (!folder) return whole // a subfolder already, or not a component of ours
      if (!resolves(folder, base)) return leftAlone(whole)
      rewritten++
      return `@/components/${folder}/${base}`
    })

  // 2 · `web/components/<base>` path strings, anywhere, followed by `.tsx` or a non-path character.
  after = after.replace(new RegExp(`web/components/${BASE}(?![\\w/-])`, "g"), (whole, base) => {
    const folder = FOLDER.get(base)
    if (!folder) return whole
    if (!resolves(folder, base)) return leftAlone(whole)
    rewritten++
    return `web/components/${folder}/${base}`
  })

  // 3 · the tests' own `join(WEB, "components", "<base>.tsx")` reads (and the
  //     `"web", "components"` / `"..", "components"` spellings of the same thing).
  if (isTest)
    after = after.replace(
      new RegExp(`((?:WEB|"web"|"\\.\\.")\\s*,\\s*"components"\\s*,\\s*)"${BASE}\\.tsx"`, "g"),
      (whole, prefix, base) => {
        const folder = FOLDER.get(base)
        if (!folder) return whole
        if (!resolves(folder, base)) return leftAlone(whole)
        rewritten++
        return `${prefix}"${folder}", "${base}.tsx"`
      },
    )

  // 4 · `components/<base>.tsx` as one string — web/ and the registry's own
  //     web-relative `pagerFile` paths: not preceded by `/` (that is shape 2, or
  //     the portal's `@/components/`), `@`, `-` or a word. A kit part id like
  //     "components/pulse-band" is never a moved basename (checked: no kit
  //     component shares a name with one), so it falls through untouched.
  if (inWeb || path.startsWith(join(ROOT, "shared", "rules") + "/"))
    after = after.replace(new RegExp(`(?<![\\w/@-])components/${BASE}\\.tsx`, "g"), (whole, base) => {
      const folder = FOLDER.get(base)
      if (!folder) return whole
      if (!resolves(folder, base)) return leftAlone(whole)
      rewritten++
      return `components/${folder}/${base}.tsx`
    })

  if (after !== before) {
    filesTouched++
    if (!CHECK) writeFileSync(path, after)
  }
}

console.log(`  references rewritten      ${rewritten}`)
console.log(`  files touched             ${filesTouched}`)
if (unresolved.size) {
  console.error(`\n  UNRESOLVED — these would not point at a real file, so they were LEFT ALONE:`)
  for (const [spec, n] of unresolved) console.error(`      ${spec}  ×${n}`)
  process.exit(1)
}
console.log(`\n  every rewritten reference resolves against web/components on disk`)
console.log(CHECK ? "  --check: nothing written\n" : "  written\n")

function fail(msg) {
  console.error(`\n  ${msg}\n`)
  process.exit(1)
}
