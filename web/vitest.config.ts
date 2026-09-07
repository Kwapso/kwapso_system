import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

// Web unit tests. jsdom by default (the store test renders a hook); the pure
// tests (identity / screens / shape) don't care which env they run in. The `@/`
// and `@shared/` aliases mirror web/tsconfig.json so tests import the same way
// the app does. Playwright e2e specs (web/e2e) are NOT vitest tests — excluded.
export default defineConfig({
  // web/tsconfig.json leaves JSX to Next (`preserve`), which a plain vitest run
  // can't parse — so the transform is told to compile it here. Without this a
  // test that RENDERS a component (the confirm panel) can't even be loaded.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    /* 60s, and the argument is the one this line already carried at 20s — the
     * same measurement, taken again on a busier machine.
     *
     * IT WAS 5s. Three tests went red on the STOPWATCH in one night —
     * table-header-sorts (5492ms), splash, and knowledge-ceiling (6730ms) —
     * every one of them passing alone and passing again on a re-run. Nothing was
     * broken; the suite renders whole screens and walks the source tree off
     * disk, so its heavy tests genuinely sit either side of five seconds once
     * the machine is busy. So the line moved to 20s.
     *
     * IT IS NOW 60s, 7 Sep 2026, measured. Several parallel branches were being
     * gated on one machine — 20 to 33 concurrent vitest and tsc processes, load
     * average 30 to 63 — and this suite reported `transform 115s` and
     * `environment 820s` for a run whose own tests do nothing of the kind. Five
     * consecutive `npm run check` runs failed on FOUR DIFFERENT test files
     * (splash, cold-screen-hops, table-header-sorts, wrapped-strings), every one
     * of them a 20-second TIMEOUT and every one passing alone. That is esbuild
     * and jsdom being starved of CPU, not a code path. The two sibling configs
     * (`vitest.workers.config.ts`, `web-portal/vitest.config.ts`) are
     * deliberately left at 20s: neither failed once across those five runs, and
     * a ceiling should move where it has been measured wrong and nowhere else.
     *
     * THIS STILL DOES NOT HIDE A HANG, which is why the number can move at all.
     * A hung test never finishes, so it fails at 60s exactly as it failed at 5s;
     * the line simply sits where "slow" and "stuck" actually separate for this
     * codebase on the machines it is actually run on. The cost of leaving it was
     * higher, and it is the same cost as last time: a gate that goes red when
     * nothing is wrong teaches people to re-run until green, and then the real
     * red gets the same treatment. */
    testTimeout: 60_000,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    exclude: ["node_modules", "e2e/**", ".next", "out"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
})
