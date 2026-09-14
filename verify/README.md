# `verify/`, the decision rigs

A rig in here is a throwaway side-by-side, built to settle ONE design question
from a picture instead of from a paragraph. The rule that produced this
folder: never ask the client, or the owner, to choose between two states
described in prose — build a page that shows both, sitting next to each
other, and point at it. `verify/pinned-corners/` and `verify/toolbar-floor/`
are the two rigs the convention was drawn from; every rig since has been
built the same shape.

**A rig mounts REAL components. It is never a mockup.** The whole reason a
rig outranks a screenshot or a description is that it draws the actual file
the app ships — `<ToolbarRow>`, `<MembersGallery>`, `<GoogleConnectionsSection>`,
whatever the question is about — imported unchanged, under the app's own
`web/app/globals.css`, through the real Tailwind pipeline. A rig's own header
comment always says which real files it mounts and what it had to fake
instead (almost always the same wall: the app is behind a sign-in, and a rig
cannot mint a session). Faking the sign-in behind a real component is fine.
Redrawing the component by hand is not — that is a mockup wearing a rig's
name, and it proves nothing about what ships.

**A rig that SIMULATES something must say so, on the page.** Sometimes the
honest rig is CSS standing in for a source change that has not landed yet —
an overlay approximating a layout the real component doesn't draw today. That
is allowed, but the frame has to be labelled SIMULATED where a reader sees
it, in the page itself, not only in a comment. `verify/team-toolbar-fold/`'s
B/C frames are the worked example: real `<MembersGallery>`/`<RolesMatrix>`
render underneath, CSS overlays approximate the two candidate shapes on top,
and the page marks the overlays SIMULATED so nobody mistakes an approximation
for a real render.

## Shape

```
verify/<name>/
  build.mjs      # bundles page.tsx (+ portal-page.tsx if there's a second front door) to index.html
  page.tsx       # the rig itself — mounts real components, renders the comparison
  styles.css     # imports the app's own globals.css; never a forked stylesheet
  .gitignore     # hides the file build.mjs writes (index.html, portal.html)
```

`node verify/<name>/build.mjs` writes the bundle; a `.claude/launch.json`
entry (see below) just serves the already-built output with `python3 -m
http.server`, the same pattern `verify-appearance-panel` and
`verify-team-toolbar-fold` use today.

**None of it is committed.** Not the built `index.html`/`portal.html`, and
not `build.mjs`/`page.tsx`/`styles.css` either — the whole `verify/<name>/`
folder is untracked by discipline, never `git add`ed, for as long as the rig
exists. The root `.gitignore` carries no line for `verify/` at all; it never
needed one, because nothing in here is meant to survive a commit. The one job
a rig's own nested `.gitignore` does is narrower and more urgent: hide the
*built* file specifically, so an incautious `git add -A` run while a rig is
still open on someone's machine can't sweep a multi-megabyte bundle (the
whole kit and Tailwind's output inlined) into a commit before anyone
notices. `web/test/named-paths.test.ts` reads a nested `.gitignore` the same
way it reads the root one, scoped to the directory that wrote it — that is
what closed the gap where an ungitignored rig bundle got read as if it were
prose this repo wrote on purpose.

A `.claude/launch.json` entry is OPTIONAL, and named `verify-<name>` when a
rig has one. Most rigs are opened once, read, and closed; only give a rig a
launch entry when it is going to be reopened enough times that typing
`python3 -m http.server <port> --directory verify/<name>` by hand each time
would be the annoying part.

## When a rig is done

**A finished rig is deleted the moment its decision is recorded in
[`decisions.html`](decisions.html), and its `launch.json` entry goes with
it.** The rig is scaffolding for making the call; the decision is the
record. Keeping a rig around after its ruling has shipped is not evidence of
anything — the code it was built to compare against has already moved on,
so an old rig left in place is a stale side-by-side nobody re-reads, sitting
next to the URLs of half a dozen HTTP servers that no longer have a reason to
exist. `decisions.html` is the one tracked file under `verify/` for exactly
this reason: it is where a ruling outlives the rig that produced it.

Only two rigs are exempt from this while their work is still open:
`verify/appearance-panel/` and `verify/team-toolbar-fold/`, both live.
Nothing else under `verify/` should sit here for more than the session that
needed it.

## Why `npm run check` skips it

`verify/` is not one of the root `package.json` workspaces, and none of the
`npx tsc --noEmit -p <workspace>` calls `npm run check` makes point at it — so
a rig's TypeScript is never checked by the gate. That is deliberate, not an
oversight to close: a rig is glued together fast to answer one visual
question and is deleted within days, and holding it to the same type-safety
bar as shipped code would slow down exactly the sessions this convention
exists to unblock. It also means a broken rig can pass every check in the
repo green — the gate proves nothing about `verify/`, on purpose, so never
read a green `npm run check` as having exercised a rig.
