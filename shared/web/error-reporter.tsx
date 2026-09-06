"use client"

// MOUNTS THE GLOBAL ERROR LISTENERS ONCE, AT AN APP ROOT — the async half of
// error reporting, and the only half a React error boundary cannot reach.
//
// A boundary catches what React can see: a throw during render, in a lifecycle,
// in an event handler it owns. It cannot see an async throw or a rejected
// promise nobody awaited, and those are reported here or nowhere. On the portal,
// "or nowhere" is not hypothetical: a swallowed sign-out was invisible until
// these two handlers were mounted.
//
// WHY IT IS SHARED (6 Sep 2026). The two front doors are deliberately NOT copies
// of each other — the agency app and the client portal are two permission-gated
// views of the same rows, they say different words to different people, and
// CLAUDE.md is explicit that they are never synced. That is a rule about SCREENS.
// This is not a screen: it renders null, it takes no props, it says nothing to
// anybody, and both copies were the same eleven lines with different comments
// above them. Its two neighbours that DO differ — error-boundary.tsx and
// collection-heading.tsx — stay two files, each with a header explaining what
// the agency sees and what a client sees, because there the difference is the
// point. Here there was no difference to lose, only a second place for a fix to
// have to be made twice.
//
// Renders nothing. See shared/web/log.ts for what installGlobalErrorReporting
// actually attaches, and where the report goes.

import * as React from "react"

import { installGlobalErrorReporting } from "@shared/web/log"

export function ErrorReporter() {
  React.useEffect(() => {
    installGlobalErrorReporting()
  }, [])
  return null
}
