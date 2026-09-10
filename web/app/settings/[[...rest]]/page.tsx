// /settings resolves INSIDE the one deep-link shell (client-resolved from the URL) — so
// moving between Settings and any team screen is soft History-API nav, no reload. The
// content is SettingsScreen (deep-link-screen.tsx dispatches to it).
//
// AN OPTIONAL CATCH-ALL SINCE 2026-09-09, because Settings grew a level under
// it: `/settings/tickets` is one module's own settings page, the app's ordinary
// (module, id) grammar read once more (the whole argument is in
// `web/components/screens/module-settings-screen.tsx`'s header). This is the
// same shape `/tickets/[[...rest]]` and every other module page already takes —
// `generateStaticParams` emits the ONE bare shell and the gateway serves it for
// any depth beneath, which is why a reload at /settings/tickets is not a 404
// (`SHELL_MODULES` + `run_worker_first`, held together by
// `workers/gateway/test/shell-routing.test.ts`).
//
// NO `"use client"` HERE, AND IT IS NOT AN OVERSIGHT. This file carried one
// while it was `app/settings/page.tsx`; the moment it grew `generateStaticParams`
// Next refuses the pair outright — *"cannot use both 'use client' and export
// function generateStaticParams()"* — and the refusal is a BUILD error, which
// `npm run check` never runs (it lints, typechecks and tests; it does not
// build). So this cost a green check and a broken export until `npm run
// build:static` was run by hand on 2026-09-09. Every other module shell in
// `app/` is a server file for the same reason; the "use client" belongs to
// `DeepLinkScreen`, which declares its own.

import { DeepLinkScreen } from "@/components/deep-link/deep-link-screen"

export const dynamic = "force-static"

export function generateStaticParams() {
  return [{ rest: [] as string[] }]
}

export default function SettingsPage() {
  return <DeepLinkScreen />
}
