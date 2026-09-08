// THE CONTRACT FOR `strip-comments.mjs`, HAND-WRITTEN, AND WHY IT HAS TO BE.
//
// The implementation is plain JavaScript (its own header says why: `scripts/*.mjs`
// run under plain node, and one of them is a deploy gate). It carries full JSDoc
// types, and where `allowJs` is on — `web/`, `web-portal/`, `tools/screen-builder`
// — tsc reads them and needs nothing else.
//
// THE NINE WORKER TSCONFIGS ARE THE REASON THIS FILE EXISTS. They do not set
// `allowJs`, so it is false, and tsc will not open a `.js`/`.mjs` file AT ALL:
// with `strict` on, the import is TS7016, "implicitly has an 'any' type" — and it
// is not a near miss, it is a refusal to look, so no amount of JSDoc changes it.
// Measured on 7 Sep 2026, before this file existed:
//
//     shared/rules/source-scan.ts(124,51): error TS7016: Could not find a
//     declaration file for module './strip-comments.mjs'
//
// Every worker's `gating-seam` and `publish-seam` suite reads source through
// `@shared/rules/source-scan`, so all nine programs resolve this import.
//
// THE ALTERNATIVE WAS `allowJs: true` IN NINE TSCONFIGS, and that is the larger
// change by some distance: it opens every worker's program to every stray `.js`
// in its reach, in programs typed with `@cloudflare/workers-types` and no node
// types, to make ONE file readable. A declaration file is the smaller promise —
// three lines, next to the thing they describe.
//
// KEEPING IT HONEST. The names here and the exports there are asserted to match
// in web/test/source-scan.test.ts ("the declaration file and the implementation
// export the same names"), so a function added to one and not the other turns the
// build red rather than going unnoticed until a caller reaches for it.

/**
 * The one dial. `keepLength` blanks each comment with the same number of
 * characters instead of removing it, so every index into the result still points
 * at the same place in the original.
 */
export type StripOptions = { keepLength?: boolean }

/** Remove every comment and NOTHING else. See the implementation's own comment
 * for why this is a tokeniser and not two regexes. */
export declare function stripComments(src: string, options?: StripOptions): string

/** JSONC → JSON, for a caller about to `JSON.parse` the result. A DIFFERENT JOB
 * from `stripComments`, deliberately not folded into it. */
export declare function stripJsoncComments(src: string): string
