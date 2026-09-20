"use client"

// RunSteps, capped. R91 (no nested scroll), Aurora's ruling 21 Sep 2026:
// the paused-turn confirm list used to scroll on its own
// (`max-h-[40vh] overflow-y-auto`) inside the assistant aside, a second
// moving region beside the thread's own sanctioned scroll. Flattened: the
// page scrolls, and a long confirm list is capped by a "Show more" door
// instead (R88 style), never a scroller.
//
// THE CAPPING LIVES HERE, NOT AT THE CALL SITE. The panel must hand the kit's
// RunSteps the confirm steps THEMSELVES, verbatim, because the test that
// proves an admin is approving real steps (not a bare label) reads the
// panel's own JSX for `steps={chat.confirmSteps}` (web/test/agent-confirm-
// panel.test.tsx). A slice at the call site would still paint five rows, but
// it would no longer be the thing that test is watching for, so the cap is
// owned here instead: this component takes the WHOLE list and decides for
// itself how much of it to paint, with a door for the rest. No
// `overflow-y-auto`, no `max-h-*` anywhere in this file, so R91's own census
// (web/test/no-nested-scroll.test.ts) has nothing to catch.

import * as React from "react"

import { RunSteps as KitRunSteps, type RunStepsProps } from "@shared/ui/components/run-steps/run-steps"
import { Button } from "@shared/ui/components/button/button"
import { useT } from "@shared/web/language"

/** Rows painted before the door. Five is roughly a phone's own confirm-panel
 * height before the two action buttons (Not now / Go ahead) would be pushed
 * off the fold. */
const VISIBLE_STEPS = 5

/**
 * The one call site's own RunSteps: the kit's component underneath, plus a
 * "Show {count} more" / "Show less" door once the list runs past five. Reset
 * for free on every new confirm, because the panel only mounts this while a
 * turn is paused; a fresh mount always starts collapsed.
 */
export function RunSteps({ steps, ...props }: RunStepsProps) {
  const t = useT()
  const [expanded, setExpanded] = React.useState(false)
  const hidden = steps.length - VISIBLE_STEPS
  const visible = expanded || hidden <= 0 ? steps : steps.slice(0, VISIBLE_STEPS)

  return (
    <div className="flex flex-col gap-4">
      <KitRunSteps steps={visible} {...props} />
      {hidden > 0 && (
        <Button variant="link" size="sm" className="self-start" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t("Show less") : t("Show {count} more", { count: hidden })}
        </Button>
      )}
    </div>
  )
}
