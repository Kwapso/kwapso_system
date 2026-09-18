// R87 — A TITLE FITS ONE LINE ON A MACBOOK AIR, AND EVERY TITLE-SHAPED FIELD
// IS CAPPED THERE.
//
// The client's ruling, 18 Sep 2026, verbatim: "for all titles (main, details,
// all) i would like to limit the lnght to what would fit in 1 line in a
// laptiop. this menas a max charactes for titles in the forms (not sutting
// it) wdyt? and ow many cahracters would taht be? consider text size
// regualr and the monitor size of a macbook" — and her pick, shown a
// side-by-side of three enforcement options: "for title lenght. set this
// limit considering macbook air, enforce with e3."
//
// TWO SEAMS, ONE CONSTANT (`TITLE_MAX_CHARS`, shared/types.ts = 50). THE FORM
// SEAM: every title-shaped `FieldConfig` sets `validation.maxLength` to the
// constant and its `<Input>` carries the identical `maxLength`, positionally
// — the same discipline R20 already holds every worker body field to, read
// here off the SOURCE (never imported and executed: a form-dialog file pulls
// in browser-only kit components a Vitest node environment cannot load). THE
// DOOR SEAM: every matching write door calls `requireText`/`optionalText`
// with the same constant in place of `TEXT_LIMITS.short`. THE RENDER SEAM:
// every one-line title renderer truncates with an ellipsis rather than
// wrapping or rejecting an already-longer, pre-existing title.
//
// WHAT IS DELIBERATELY NOT HERE, so the next reader does not "complete" it: a
// dropdown VALUE (`selectable-form-dialog.tsx`'s `optionField`, a Choice, not
// a record), a ROLE's name, a PROCESS's or a STEP's name (named records, but
// outside the ruling's own worked examples and the canvas measurement), and
// a PERSON's name (`contact-link-dialog.tsx`'s `ContactCreateDialog` — "a
// person's name is not a title", and the file sits outside the owned
// `*-form-dialog.tsx` glob regardless).

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { TITLE_MAX_CHARS } from "@shared/types"

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, ...p.split("/")), "utf8")

describe("TITLE_MAX_CHARS — the one shared ceiling", () => {
  it("is 50, canvas-measured and rounded down from the narrowest one-line renderer", () => {
    expect(TITLE_MAX_CHARS).toBe(50)
  })
})

/** EVERY FORM WITH A TITLE-SHAPED FIELD — the census this suite proves,
 * spelled out rather than derived, because "which field on this form is the
 * TITLE" is a product judgement (a person's name is not a title; a dropdown
 * value is not a title) that a parser cannot make safely. Each entry names
 * the file, the field config identifier the form declares, and the `<Input>`
 * id it renders through — read off disk so a rename of any of the three
 * fails this suite rather than silently stops being checked. */
const TITLE_FORMS: { file: string; configVar: string; inputId: string }[] = [
  { file: "web/components/tickets/help-form-dialog.tsx", configVar: "titleField", inputId: "help-title" },
  { file: "web/components/work/story-form-dialog.tsx", configVar: "titleField", inputId: "story-title" },
  { file: "web/components/work/task-form-dialog.tsx", configVar: "titleField", inputId: "task-title" },
  { file: "web/components/meetings/meeting-form-dialog.tsx", configVar: "titleField", inputId: "meeting-title" },
  { file: "web/components/work/wave-form-dialog.tsx", configVar: "nameField", inputId: "wave-name" },
  { file: "web/components/work/sprint-form-dialog.tsx", configVar: "nameField", inputId: "sprint-name" },
  { file: "web/components/apps/app-form-dialog.tsx", configVar: "nameField", inputId: "app-name" },
  { file: "web/components/accounts/account-form-dialog.tsx", configVar: "nameField", inputId: "account-name" },
  { file: "web/components/knowledge/knowledge-form-dialog.tsx", configVar: "titleField", inputId: "knowledge-title" },
  { file: "web/components/work/todo-form-dialog.tsx", configVar: "titleField", inputId: "todo-title" },
]

describe("the form seam — every title field caps at TITLE_MAX_CHARS, in the config and on the input", () => {
  for (const { file, configVar, inputId } of TITLE_FORMS) {
    it(`${file}: imports TITLE_MAX_CHARS from shared/types`, () => {
      const src = read(file)
      expect(src, `${file} must import TITLE_MAX_CHARS`).toMatch(
        /import\s*\{[^}]*\bTITLE_MAX_CHARS\b[^}]*\}\s*from\s*"@shared\/types"/
      )
    })

    it(`${file}: the ${configVar} config sets validation.maxLength to TITLE_MAX_CHARS`, () => {
      const src = read(file)
      const configAt = src.indexOf(`const ${configVar} =`)
      expect(configAt, `${file} must declare a const ${configVar}`).toBeGreaterThan(-1)
      // The config object is a short, module-scope literal — the next 400
      // characters comfortably hold it on every one of these ten forms, so a
      // literal window (rather than a bracket-balancing parse this suite does
      // not need) is enough to prove the field sits INSIDE this config, not
      // merely somewhere later in the file.
      const window = src.slice(configAt, configAt + 400)
      expect(
        window,
        `${file}'s ${configVar} must spread validation: { ...defaultFieldConfig.validation, maxLength: TITLE_MAX_CHARS }`
      ).toMatch(/validation:\s*\{\s*\.\.\.defaultFieldConfig\.validation,\s*maxLength:\s*TITLE_MAX_CHARS/)
    })

    it(`${file}: the #${inputId} input carries maxLength={TITLE_MAX_CHARS} and a live count/countMax`, () => {
      const src = read(file)
      const idAt = src.indexOf(`id="${inputId}"`)
      expect(idAt, `${file} must render an input id="${inputId}"`).toBeGreaterThan(-1)
      // The <Input> is a short JSX element — look a little behind (the id is
      // not always the first prop) and ahead for its own maxLength.
      const window = src.slice(Math.max(0, idAt - 200), idAt + 400)
      expect(window, `${file}'s #${inputId} input must cap at TITLE_MAX_CHARS`).toMatch(
        /maxLength=\{TITLE_MAX_CHARS\}/
      )
      // The <Field> wrapping it carries the live counter — found by walking
      // BACK from the input's own id to the nearest <Field, the same
      // direction a reader's eye takes.
      const fieldAt = src.lastIndexOf("<Field", idAt)
      expect(fieldAt, `${file} must wrap #${inputId} in a <Field`).toBeGreaterThan(-1)
      const fieldWindow = src.slice(fieldAt, idAt)
      expect(fieldWindow, `${file}'s <Field> around #${inputId} must pass count`).toMatch(/count=\{/)
      expect(fieldWindow, `${file}'s <Field> around #${inputId} must pass countMax={TITLE_MAX_CHARS}`).toMatch(
        /countMax=\{TITLE_MAX_CHARS\}/
      )
    })
  }
})

describe("what is deliberately NOT a title, and stays uncapped", () => {
  it("a dropdown value (a Choice) carries no TITLE_MAX_CHARS", () => {
    const src = read("web/components/choices/selectable-form-dialog.tsx")
    expect(src).not.toMatch(/TITLE_MAX_CHARS/)
  })

  it("a contact's own name (a person, not a title) carries no TITLE_MAX_CHARS", () => {
    const src = read("web/components/accounts/contact-link-dialog.tsx")
    expect(src).not.toMatch(/TITLE_MAX_CHARS/)
  })
})

/** THE DOOR SEAM — every write door validating a title-shaped field, named by
 * file and the exact `requireText`/`optionalText` call it must carry
 * `TITLE_MAX_CHARS` in place of `TEXT_LIMITS.short`. Grouped by file so a
 * worker-side rename is caught at the file, not silently skipped. */
const TITLE_DOORS: { file: string; needle: string }[] = [
  { file: "workers/content/src/lib/help.ts", needle: 'optionalText(input.titleDe, "German title", TITLE_MAX_CHARS)' },
  { file: "workers/content/src/lib/help.ts", needle: 'optionalText(input.titleEn, "English title", TITLE_MAX_CHARS)' },
  { file: "workers/content/src/lib/stories.ts", needle: 'requireText(input.title, "Title", TITLE_MAX_CHARS)' },
  { file: "workers/content/src/lib/stories.ts", needle: 'requireText(input.name, "Name", TITLE_MAX_CHARS)' },
  { file: "workers/content/src/lib/meetings.ts", needle: 'requireText(input.title, "What it is about", TITLE_MAX_CHARS)' },
  { file: "workers/content/src/routes/todos.ts", needle: 'requireText(body.title, "What we need", TITLE_MAX_CHARS)' },
  { file: "workers/content/src/routes/todos.ts", needle: 'requireText(body.title, "What needs doing", TITLE_MAX_CHARS)' },
  { file: "workers/tenancy/src/routes/waves.ts", needle: 'requireText(body.name, "Name", TITLE_MAX_CHARS)' },
  { file: "workers/tenancy/src/routes/processes.ts", needle: 'requireText(body.name, "Name", TITLE_MAX_CHARS)' },
  { file: "workers/tenancy/src/routes/accounts.ts", needle: 'requireText(body.name, "Name", TITLE_MAX_CHARS)' },
  { file: "workers/content/src/routes/knowledge.ts", needle: 'requireText(body.title, "Title", TITLE_MAX_CHARS)' },
  { file: "workers/content/src/routes/knowledge.ts", needle: 'optionalText(body.title, "Title", TITLE_MAX_CHARS)' },
  { file: "workers/content/src/lib/knowledge.ts", needle: 'requireText(input.title, "Title", TITLE_MAX_CHARS)' },
]

describe("the door seam — every write door refuses a title over TITLE_MAX_CHARS, positionally (R20)", () => {
  // ONE READ PER FILE, so a file named twice above is not opened twice.
  const files = [...new Set(TITLE_DOORS.map((d) => d.file))]
  for (const file of files) {
    it(`${file}: imports TITLE_MAX_CHARS from @shared/types`, () => {
      const src = read(file)
      expect(src, `${file} must import TITLE_MAX_CHARS`).toMatch(
        /import\s*\{[^}]*\bTITLE_MAX_CHARS\b[^}]*\}\s*from\s*"@shared\/types"/
      )
    })
  }

  for (const { file, needle } of TITLE_DOORS) {
    it(`${file}: carries ${JSON.stringify(needle)}`, () => {
      const src = read(file)
      expect(src.includes(needle), `${file} must contain:\n  ${needle}`).toBe(true)
    })
  }
})

/** THE APP-MODULE NAME FIELD — a title too (18 Sep 2026), but not through the
 * TITLE_FORMS shape above: `web/components/apps/modules-panel.tsx` renders no
 * `<Field>`/`<Input>` of its own at all, it opens the generic
 * `InternalRecordDialog` (web/components/team/internal-record-dialog.tsx)
 * with `moduleFields()`'s data-shaped field list, which is also how
 * `brandAssetFields`, `deliverableFields`, `clientDepartmentFields`,
 * `clientRoleFields` and `clientToolFields` render — none of which is a
 * title, per R87's own worked examples. So the cap is a property of ONE
 * field's DATA (`titleCap: true` on `moduleFields()`'s "Name"), read by the
 * shared renderer, rather than a literal `<Field config={nameField}>` this
 * suite's own bracket-window trick could find — proved here by the data and
 * the renderer separately instead. */
describe("the app-module name field — a title too, wired through the generic InternalRecordDialog rather than a dedicated *-form-dialog.tsx", () => {
  const dialogFile = "web/components/team/internal-record-dialog.tsx"

  it(`${dialogFile}: imports TITLE_MAX_CHARS from shared/types`, () => {
    const src = read(dialogFile)
    expect(src, `${dialogFile} must import TITLE_MAX_CHARS`).toMatch(
      /import\s*\{[^}]*\bTITLE_MAX_CHARS\b[^}]*\}\s*from\s*"@shared\/types"/
    )
  })

  it(`${dialogFile}: moduleFields()'s "Name" field carries titleCap: true, and none of this form's other field sets do`, () => {
    const src = read(dialogFile)
    const modulesAt = src.indexOf("export const moduleFields")
    expect(modulesAt, `${dialogFile} must declare moduleFields`).toBeGreaterThan(-1)
    const nextExport = src.indexOf("export const", modulesAt + 1)
    const moduleFieldsBody = src.slice(modulesAt, nextExport > -1 ? nextExport : undefined)
    const nameLineAt = moduleFieldsBody.indexOf('key: "name"')
    expect(nameLineAt, "moduleFields must declare a name field").toBeGreaterThan(-1)
    const nameLine = moduleFieldsBody.slice(nameLineAt, moduleFieldsBody.indexOf("\n", nameLineAt))
    expect(nameLine, "moduleFields()'s Name field must carry titleCap: true").toMatch(/titleCap:\s*true/)

    // THE OTHER FIVE FIELD SETS THIS SAME DIALOG RENDERS STAY UNCAPPED — a
    // brand asset's name, a deliverable's title, a department's, a role's and
    // a tool's all sit outside R87's own worked examples, same as a Choice's
    // value or a contact's name (the two exclusions the suite above already
    // proves). Checked by NAME rather than assumed, so a titleCap added to
    // any of them is a deliberate, reviewed change to this test, not a silent
    // widening of the law.
    for (const fn of [
      "brandAssetFields",
      "deliverableFields",
      "clientDepartmentFields",
      "clientRoleFields",
      "clientToolFields",
    ]) {
      const at = src.indexOf(`export const ${fn}`)
      expect(at, `${dialogFile} must declare ${fn}`).toBeGreaterThan(-1)
      const nextAt = src.indexOf("export const", at + 1)
      const body = src.slice(at, nextAt > -1 ? nextAt : undefined)
      expect(body, `${fn} must carry no titleCap — it is outside R87's worked examples`).not.toMatch(/titleCap/)
    }
  })

  it(`${dialogFile}: a titleCap field's <Field> passes count/countMax, and its <Input> carries maxLength, both keyed off TITLE_MAX_CHARS`, () => {
    const src = read(dialogFile)
    expect(
      src,
      `${dialogFile}'s <Field> must pass count/countMax off TITLE_MAX_CHARS when a field carries titleCap`
    ).toMatch(/f\.titleCap\s*\?\s*\{\s*count:[^}]*countMax:\s*TITLE_MAX_CHARS\s*\}/)
    expect(
      src,
      `${dialogFile}'s <Input> must carry maxLength={TITLE_MAX_CHARS} when a field carries titleCap`
    ).toMatch(/f\.titleCap\s*\?\s*\{\s*maxLength:\s*TITLE_MAX_CHARS\s*\}/)
  })

  const doorFile = "workers/tenancy/src/routes/processes.ts"
  const doorFunctions = ["postCreateAppModule", "postUpdateAppModule"]

  it(`${doorFile}: imports TITLE_MAX_CHARS from @shared/types`, () => {
    const src = read(doorFile)
    expect(src, `${doorFile} must import TITLE_MAX_CHARS`).toMatch(
      /import\s*\{[^}]*\bTITLE_MAX_CHARS\b[^}]*\}\s*from\s*"@shared\/types"/
    )
  })

  for (const fn of doorFunctions) {
    it(`${doorFile}'s ${fn}: refuses an app-module name over TITLE_MAX_CHARS, not TEXT_LIMITS.short`, () => {
      const src = read(doorFile)
      const fnAt = src.indexOf(`export async function ${fn}(`)
      expect(fnAt, `${doorFile} must declare ${fn}`).toBeGreaterThan(-1)
      const nextFnAt = src.indexOf("export async function", fnAt + 1)
      const body = src.slice(fnAt, nextFnAt > -1 ? nextFnAt : undefined)
      expect(body, `${fn} must validate body.name against TITLE_MAX_CHARS`).toMatch(
        /requireText\(body\.name,\s*"Name",\s*TITLE_MAX_CHARS\)/
      )
    })
  }
})

/** THE RENDER SEAM — every one-line title renderer truncates with an
 * ellipsis, through the ONE shared helper (`clampRecordHeading`), rather
 * than each drawing its own. */
describe("the render seam — every one-line title renderer truncates through the shared helper", () => {
  it("clampRecordHeading (shared/web/record-heading.tsx) draws a single-line truncate, not a two-line clamp", () => {
    const src = read("shared/web/record-heading.tsx")
    expect(src, "the function must still be named clampRecordHeading — the seam both call sites import")
      .toMatch(/export function clampRecordHeading/)
    expect(src, "R87 supersedes the old line-clamp-2 with a one-line truncate").toMatch(
      /className="min-w-0 truncate"/
    )
    // The old TWO-LINE class must be gone from the rendered node, not merely
    // joined by the new one — checked on the className literal itself, not
    // on the file's prose, which legitimately still narrates the change.
    expect(
      src,
      "the two-line clamp class must be gone from the rendered node"
    ).not.toMatch(/className="[^"]*line-clamp-2/)
    // Reachable in full: the truncated node still carries the whole string.
    expect(src).toMatch(/title=\{title\}/)
  })

  it("CollectionHeading draws its own title through clampRecordHeading", () => {
    const src = read("web/components/records/collection-heading.tsx")
    expect(src).toMatch(/import\s*\{\s*clampRecordHeading\s*\}\s*from\s*"@shared\/web\/record-heading"/)
    expect(src).toMatch(/clampRecordHeading\(t\(title\)\)/)
  })

  it("RecordTable's first column — the list title cell — draws through clampRecordHeading", () => {
    const src = read("web/components/records/record-table.tsx")
    expect(src).toMatch(/import\s*\{\s*clampRecordHeading\s*\}\s*from\s*"@shared\/web\/record-heading"/)
    expect(src).toMatch(/clampRecordHeading\(cellValue\)/)
  })

  it("both record-heading seams (record-chrome.tsx, screen-renderer.tsx) still feed their title through the clamp", () => {
    // The exact assertion `record-heading-clamps.test.tsx` already makes for
    // R52 — repeated here because R87 is what changed the clamp's OWN shape,
    // and a suite naming the law that changed something should be able to
    // prove the seam it changed still has both its readers.
    for (const file of ["web/components/records/record-chrome.tsx", "shared/web/screen-engine/screen-renderer.tsx"]) {
      const src = read(file)
      expect(src, `${file} imports the clamp`).toMatch(/clampRecordHeading/)
      expect(src, `${file} feeds its title THROUGH the clamp`).toMatch(/clampRecordHeading\(title\)/)
    }
  })
})
