// Tiny resolve hook: extensionless/`.ts`-less relative and `@shared/*` imports
// in this repo's source resolve to real files on disk. Used only by the
// audit's extraction script, via `--import`.
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"

const ROOT = fileURLToPath(new URL("../../", import.meta.url))

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@shared/")) {
    const rel = specifier.slice("@shared/".length)
    const abs = path.join(ROOT, "shared", rel)
    for (const ext of ["", ".ts", "/index.ts"]) {
      if (existsSync(abs + ext)) return nextResolve(pathToFileURL(abs + ext).href, context)
    }
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    const base = fileURLToPath(new URL(specifier, context.parentURL))
    for (const ext of [".ts", "/index.ts"]) {
      if (existsSync(base + ext)) return nextResolve(pathToFileURL(base + ext).href, context)
    }
  }
  return nextResolve(specifier, context)
}
