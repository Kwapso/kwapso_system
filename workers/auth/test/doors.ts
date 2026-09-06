// EVERY DOOR ON THIS WORKER, AS ONE STRING — the thing four suites here used to
// get by reading src/index.ts.
//
// WHY IT EXISTS. Until 6 Sep 2026 auth kept all eighteen handlers in index.ts,
// so "the doors" and "that file" were the same thing and every source-reading
// assertion said `readFileSync(index.ts)`. Splitting the handlers into routes/
// broke seven of those assertions at once — correctly: each one had a canary, and
// each went red rather than quietly passing over an empty string. That is the
// failure worth designing against, because the SILENT version of it is a suite
// that reads a file the code has left and reports a clean bill of health for
// nothing at all.
//
// So the door surface is now read as a DIRECTORY, sorted and stable, with a
// tripwire on the count: add a routes file and this fails until somebody has
// looked, rather than the new file's handlers escaping every assertion below.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect } from "vitest"

import { sourceFiles } from "@shared/rules/source-scan"

const SRC = join(__dirname, "..", "src")

/** How many modules routes/ holds. A new one is a deliberate change: bump this
 * and check that the suites reading `doorSource()` still say what they mean. */
export const ROUTE_MODULES = 4

/** index.ts plus every routes module, concatenated in sorted path order.
 * Handler bodies keep their within-file order, which is what the slice-between-
 * two-function-names assertions stand on. */
export function doorSource(): string {
  const routes = sourceFiles(join(SRC, "routes"), { extensions: [".ts"] })
  expect(
    routes.length,
    `expected ${ROUTE_MODULES} route modules under auth/src/routes — if that changed on purpose, update ROUTE_MODULES in test/doors.ts and re-read the suites that use it`
  ).toBe(ROUTE_MODULES)
  return [readFileSync(join(SRC, "index.ts"), "utf8"), ...routes.map((f) => f.source)].join("\n")
}
