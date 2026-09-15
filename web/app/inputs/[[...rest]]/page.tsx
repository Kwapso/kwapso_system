// Top-level Inputs page — its own clean URL (/inputs), resolving the active
// team from context like /home. Backed by the SAME deep-link host as /t/*
// (one client-resolved shell); the gateway serves this shell for any /inputs/*
// depth (workers/gateway run_worker_first + SHELL_MODULES + the /inputs/*
// rewrite). A to-do has no detail screen of its own (see TodosPanel's own
// header, web/components/work/work-panels.tsx), so this address never carries
// a record id in practice — the `[[...rest]]` catch-all is kept anyway, the
// same shape every other sidebar page takes, so a future record screen costs
// nothing here.

import { DeepLinkScreen } from "@/components/deep-link/deep-link-screen"

export const dynamic = "force-static"

export function generateStaticParams() {
  return [{ rest: [] as string[] }]
}

export default function InputsPage() {
  return <DeepLinkScreen />
}
