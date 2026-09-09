// A FIELD CONFIG CARRIES NO KEY IT DOES NOT DECLARE.
//
// 44 `FieldConfig`s across both front doors set `hint:`, a name the type has
// never had — it has `helpText`. Nothing in the app or the kit reads `hint`,
// and TypeScript never objected, because every one of them was a NAMED
// CONSTANT (`const accountField = { ...defaultFieldConfig, hint: "…" }`)
// rather than an inline literal handed straight to a typed parameter, so the
// excess-property check that would have caught a stray key on a literal never
// fires on a variable. The words were written for a person and read by
// nobody: `shared/web/field.tsx` forwards `config.helpText` to the kit as
// `help`, so a field with `hint` instead simply rendered no help text at all,
// silently, on every language the app speaks.
//
// SO THE ALLOWED SHAPE IS DERIVED, off `FieldConfig`'s own declaration in
// shared/web/screen-engine/config.ts, rather than copied into a list here
// that could itself go stale the next time the interface grows a field. A
// second, independent hand-list would be exactly the failure this test
// exists to close — two definitions of the same shape, one of them silently
// behind the other.
//
// THE OBJECT SAYS WHAT IT IS, the same signature `isFieldConfigWord` already
// reads in wrapped-strings.test.ts (R33): a `FieldConfig` is an object
// literal that SPREADS `defaultFieldConfig` (or a field config built from
// one, like `{ ...appField, required: false }`), and nothing else in this
// app writes that spread. A bare `{ label: "…" }` — the nav registry, a copy
// table — is not caught here, which is the point: this test is narrow by
// construction to the one shape that has this exact defect available to it.

import { relative } from "node:path"
import { describe, expect, it } from "vitest"
import ts from "typescript"

import { ROOT, appFiles } from "../../scripts/lib/i18n-source.mjs"

/** The keys `FieldConfig` (and the `BaseConfig` it extends) actually declare,
 * read off shared/web/screen-engine/config.ts rather than hand-listed — so a
 * field the interface grows tomorrow is allowed here without editing this
 * file, and a key nobody declared stays caught. */
function declaredFieldConfigKeys(): Set<string> {
  const path = ROOT + "/shared/web/screen-engine/config.ts"
  const source = ts.sys.readFile(path)
  if (!source) throw new Error(`could not read ${path} — did the config move?`)
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)

  const keys = new Set<string>()
  const wanted = new Set(["FieldConfig", "BaseConfig"])
  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) && wanted.has(node.name.text)) {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
          keys.add(member.name.text)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return keys
}

type Offence = { file: string; line: number; key: string }

/** Every property key written on an object literal that spreads a field
 * config, whether or not it is one `FieldConfig` actually declares. */
function fieldConfigKeyCensus(): { offences: Offence[]; objectsSeen: number } {
  const offences: Offence[] = []
  let objectsSeen = 0

  const isFieldConfigSpread = (obj: ts.ObjectLiteralExpression): boolean =>
    obj.properties.some(
      (p) => ts.isSpreadAssignment(p) && /[Ff]ieldConfig\b/.test(p.expression.getText())
    )

  for (const { path, tree } of appFiles()) {
    const file = relative(ROOT, path)
    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node) && isFieldConfigSpread(node)) {
        objectsSeen++
        for (const prop of node.properties) {
          if (ts.isSpreadAssignment(prop)) continue
          const name = prop.name
          if (name && (ts.isIdentifier(name) || ts.isStringLiteral(name))) {
            const key = ts.isIdentifier(name) ? name.text : name.text
            const { line } = tree.getLineAndCharacterOfPosition(prop.getStart(tree))
            offences.push({ file, line: line + 1, key })
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return { offences, objectsSeen }
}

describe("a field config carries no key it does not declare", () => {
  const ALLOWED = declaredFieldConfigKeys()

  it("declaredFieldConfigKeys: the read found the interface, not an empty file", () => {
    // A BLIND CHECK REPORTS ALL CLEAR EXACTLY LIKE A PASSING ONE — if the
    // interface moved or was renamed, `ALLOWED` would be empty and every real
    // key below (`label`, `required`, …) would fail as "undeclared", which is
    // loud rather than silent, but is still worth a floor of its own so the
    // failure reads as "the walk broke" rather than "every field is wrong".
    expect(
      ALLOWED.size,
      "found no FieldConfig/BaseConfig properties — did shared/web/screen-engine/config.ts move or rename the interface?"
    ).toBeGreaterThanOrEqual(7)
    expect([...ALLOWED].sort()).toEqual(
      ["disabled", "helpText", "label", "required", "validation", "visibilityRules", "visible"].sort()
    )
  })

  it("field-config-keys: no object spreading a field config sets a key the type doesn't have", () => {
    const { offences, objectsSeen } = fieldConfigKeyCensus()

    // THE POSITIVE CONTROL. wrapped-strings.test.ts's own count of field-config
    // `label`/`helpText` positions is in the hundreds; a census that finds
    // fewer than 40 field-config OBJECTS (not positions) is reading the wrong
    // files or the spread signature stopped matching, and would report a false
    // all-clear exactly like the bug this test exists to catch.
    expect(
      objectsSeen,
      "found under 40 objects spreading a field config — the census may be reading nothing"
    ).toBeGreaterThanOrEqual(40)

    const undeclared = offences.filter((o) => !ALLOWED.has(o.key))
    expect(
      undeclared.map((o) => `${o.file}:${o.line} sets "${o.key}", which FieldConfig has no such key`),
      "a field config sets a key the type does not declare — it will be silently dropped on the way to the screen " +
        "(shared/web/field.tsx only forwards label/helpText/required/disabled/visible/visibilityRules/validation). " +
        "Rename it to the key FieldConfig actually has, most likely helpText."
    ).toEqual([])
  })
})
