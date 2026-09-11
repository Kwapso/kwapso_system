// AMBIENT TYPE FOR THE ONE PLAIN-JS SEAM A WORKER TEST NEEDS TO REACH.
//
// `scripts/lib/cf-credentials.mjs` is the one place this repo reads a real
// Cloudflare account id + API token from (Keychain, via
// ~/.config/cloudflare/accounts.json) — "scripts must not hard-code account
// or token" applies here too, so knowledge-reader-real-model.test.ts imports
// it rather than re-deriving the same lookup. `scripts/` sits outside every
// worker's tsconfig `include`, and this repo does not turn on `allowJs`, so
// TypeScript cannot infer the .mjs file's own types — this is the narrow,
// single-purpose declaration that lets that one import type-check, matching
// the .mjs file's actual exported shape exactly.

// A relative-specifier `declare module "../../../scripts/lib/cf-credentials.mjs"`
// does not resolve here under `moduleResolution: "bundler"` — verified: tsc
// still reports TS7016 with that form present and included. Scoped by
// extension instead: the only `.mjs` import in this worker's test/ folder is
// this one file, so this stays narrow in practice without being narrow in
// syntax.
declare module "*/cf-credentials.mjs" {
  export function cloudflareCredentials(dir?: string): { account: string; token: string; key: string }
}
