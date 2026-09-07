// RUN ME PROPERLY, OR BE TOLD HOW — the one guard between a wrong invocation and
// "your tool is broken".
//
// ── WHAT HAPPENED ───────────────────────────────────────────────────────────
//
// Eight scripts in this folder import the worker's TypeScript directly, which
// Node only does with `--experimental-transform-types` (model.ts uses parameter
// properties, which strip-only mode refuses). Every one of them documents the
// full command in its own header.
//
// On 2026-09-07 somebody ran `node scripts/agent-routing-bench.mjs --self-test`
// without the flag, got
//
//     SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]:
//     TypeScript parameter property is not supported in strip-only mode
//         at parseTypeScript (node:internal/modules/typescript:68:40)
//
// and was one sentence away from reporting that the self-test does not run. The
// instructions were six lines above the command they typed. That is not really a
// reading failure: a stack trace from `node:internal/modules/typescript` looks
// exactly like a broken tool, and nothing in it says "you left a flag off".
//
// It matters most on the routing bench, because that script is a GATE somebody
// runs to decide whether to spend money — so "it is broken" and "you invoked it
// wrong" lead to opposite decisions, and the error told them the wrong one.
//
// ── WHY BEHAVIOUR RATHER THAN FLAG-SNIFFING ─────────────────────────────────
//
// The obvious guard is to read `process.execArgv` for the flag. That is wrong
// twice: the flag can arrive through NODE_OPTIONS, and the day a Node release
// turns this on by default the check would refuse a runtime that works perfectly.
// So this ATTEMPTS the import and interprets the failure — it can only ever fire
// when the import genuinely could not happen.

/** True for the one failure this exists to translate, matched on Node's own error
 * CODE rather than the message text (which is not a stable contract). */
function isStripOnlyRefusal(e) {
  return e?.code === "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX"
}

/** Import a `.ts` module the way these scripts need to, and turn the one
 * predictable invocation failure into the command that fixes it.
 *
 * Every other error is re-thrown untouched: a real syntax error in the worker's
 * source must not be dressed up as "you forgot a flag", which would send somebody
 * looking in exactly the wrong place. */
export async function importTs(specifier) {
  try {
    return await import(specifier)
  } catch (e) {
    if (!isStripOnlyRefusal(e)) throw e
    const script = process.argv[1] ? process.argv[1].replace(`${process.cwd()}/`, "") : "scripts/<this script>"
    const args = process.argv.slice(2).join(" ")
    console.error(
      `\nThis script reads the worker's TypeScript directly, which Node needs a flag for.\n` +
        `Nothing is broken — the command is:\n\n` +
        `    node --experimental-transform-types ${script}${args ? ` ${args}` : ""}\n\n` +
        `(Node refused with ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX: strip-only mode cannot read\n` +
        ` the parameter properties in workers/data-ops/src/lib/model.ts.)\n`
    )
    process.exit(2)
  }
}
