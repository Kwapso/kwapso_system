# 8. Spacing, and the scale setting

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## 8. Spacing, and the scale setting

### S1: the vertical rhythm is 4, 8, 16, 24, 40

> **AMENDED by [N7](#n7-five-gaps-and-each-one-means-something) (18 Aug 2026),** which
> attaches a MEANING to each of the five steps and drops the `gap-3` line below (S1 named
> the scale and then broke it in its own next sentence). N7 also carries the census: 210 of
> the app's 516 gaps are off-scale, and `gap-6`, the gap that means "these are separate",
> is used eleven times in the whole app. Implement N7's table, not this list.

`gap-1` / `gap-2` / `gap-4` / `gap-6` / `gap-10`. Nothing between them.

- Between fields in a form: `gap-4`
- Between panels on a screen: `gap-6`
- Between major sections: `gap-10`

Evidence: `brand.css` `--margin--s: 10px`, `--base: 20px`, `--m: 40px`, `--l: 60px`,
`--xl: 80px`, `--xxl: 100px`, a doubling scale; its gap census is 10px (44 rules), 20px
(38), 16px (18), 40px (12). Card padding on the brand site is 40px, and section vertical
rhythm is 100px top. The portal already uses `gap-10` between sections
(`web-portal/components/home-screen.tsx:58`, `company-screen.tsx:60`, `impact-screen.tsx:132`).

### S2: horizontal gutters are `px-4 sm:px-6 lg:px-10`

One string, used by the shell and by the header band so they align to the same left edge.
See [L1](#l1-one-page-container-one-cap).

**AMENDED 17 Sep 2026 — the outer gutters step down one rung.** The client's ruling,
verbatim: *"Because adding the breadcrumbs took up considerable screen space, let's reduce
the margin that we have on the sides above and below both the main content and the
assistant. Let's optimize the height. Let's not leave so much blank space there."* Every
block-direction contributor to the gutter around the content column and the aside steps
down exactly one `--space-*` rung (kit v1.2.106): `--shell-gutter` and `--aside-inset`
(kept equal to each other) go from `--space-5` to `--space-4`; the card's own head band,
its trail inset ([L13](#l13-the-trail-line-lives-inside-the-content-card-above-the-head-the-chrome-shortcuts-are-only-partly-replicated))
and its body padding each drop one rung at both densities; the gap between the trail and
the head drops with them. The rail's own gutter is deliberately untouched — the ruling
names "the main content and the assistant," not the rail — so `--rail-inset` stays at
`--space-5` on purpose, a flag for whoever next touches it rather than an oversight.

**AMENDED 18 Sep 2026 ~06:40 (Round 17) — the rail's own gutter is touched too, and both
gaps step down together.** The client's ruling, verbatim: *"reduce the margin between the
super far edge of screen and the side navbar, same as reduce it between side navbar and
main content. keep spacing equa on both sides - but reduce (i'd say to half of what it is,
but i dont see the pixels, just human eye)."* The flag the 17 Sep amendment left for whoever
next touched `--rail-inset` is picked up here: the gap between the viewport's own edge and
the rail, and the gap between the rail and the main content, are read together and kept
equal — the same requirement S2 already holds for the content/aside pair — and both step
down by roughly half their current measure, read by eye rather than to an exact pixel figure
she named. `--rail-inset` moves off `--space-5` for the first time since this rule shipped.

**Status: ruled, in build, 18 Sep 2026 (kit v1.2.116).**

**AMENDED 18 Sep 2026 ~13:20 (Round 20) — the rail brand row aligns to the tab strip's own
band, and a collapsed rail keeps every size.** Two further rulings on the rail, the same
round:

- *"on the sidebar tge logo is way too up!!! make it aligned with text on foler tabs"* — the
  rail's own mark-plus-wordmark lockup (`rail-brand`, `rail.tsx`) sat 10px above the active
  content tab's own label centre, measured live (`verify/shell-chrome/`, 1440×900). Kit
  v1.2.121 first fixed it by COMPUTING a centre from four tokens
  (`--shell-gutter + --folder-lip/2 - --icon-20/2 - --rail-inset`) — correct at the kit's own
  15px harness root, 8.65px off on the live app's 16px root, because one of the four terms
  stood in for the mark's own rendered height rather than for a fact about the tab strip band
  it was reaching for. **Kit v1.2.122 rewrote it to build a BAND instead of a centre:** a new
  token, `--strip-row` (aliased to `--folder-lip`), names the exact box the tab strip's label
  already centres inside; the rail brand row now takes `h-[var(--strip-row)]` and relies on
  its own pre-existing `items-center` to centre the mark inside that box, the same way the
  tab strip centres its label regardless of the label's own line height — two boxes with
  coincident centres BY CONSTRUCTION, not by an offset computed from outside either one.
  Measured after the rewrite: 0.53px off at the kit's 15px root, 0.59px off at the live app's
  16px root — both sub-pixel, both close to identical, which is the actual proof a fix keyed
  to the wrong facts does not give. **Status: ruled, in build, 18 Sep 2026 (kit v1.2.122).**
- *"when contracting sidebar, yuo should not make icons or spaces smaller, keep it as it is,
  just without tetxs"* — collapsing the rail used to shrink each row's own box from
  `--control-height-button` (37.5px at the kit's 15px root) down to `--avatar-md` (30px), an
  8px shrink carried straight through to the row-to-row rhythm; the glyph inside was never
  part of that shrink (`ROW_SHAPE`'s own `[&_svg]:size-[var(--icon-button)]` reads off the
  row, not a now-absent icon wrapper), so what she is naming as "icons or spaces smaller" is
  the row box and the rhythm it sets, not the glyph itself. `ROW_COLLAPSED` (`rail.tsx`) now
  reads the SAME `--control-height-button` token `ROW_EXPANDED` does — one row height, one
  row-to-row rhythm, in both states — and the rail's own collapsed root width widens the same
  8px so the now-larger circle still fits without clipping. Only the destination LABEL leaves
  the layout on collapse; nothing else resizes. **Status: ruled, in build** (kit v1.2.120,
  already in `HEAD` before this session's own sync to v1.2.122).

### S3: card padding is `p-4`, panel padding is `p-6`

`CollectionCard` already uses `p-4` (`screen-bits.tsx:35`). Detail panels use `p-6`, which
matches `CardHeader` and `CardContent` defaults so no override is needed there.

### S4: the scale setting is three steps, and it sets one CSS variable

Add a display preference with three steps, following the language preference exactly:
`shared/web/language-section.tsx` for the settings panel and
`shared/web/language-menu.tsx` for the portal header. Persist it the same way language is
persisted, through `setLanguage` at `web/lib/api/auth.ts:63`, so it follows the person
between devices rather than living in one browser.

| Step | Root font size | Effect |
|---|---|---|
| Compact | `15px` | |
| Comfortable (default) | `16px` agency, `17px` portal | today's values |
| Large | `18px` agency, `19px` portal | |

One variable, set on `<html>`. Because every size token in the theme is in `rem`
(`--text-xs: 0.875rem`, `--text-sm: 0.9375rem`, `--text-base: 1rem`) and every spacing
class is a Tailwind `rem` step, **text and spacing move together from one number**, which
is precisely what the iPhone's setting does. No component takes a size prop and no
component needs one.

Where it lives: `web/components/screens/settings-screen.tsx`, in the Appearance tab —
where, since the client's ruling of 2026-09-10 (*"language shoudl be in settings
somewhere, not in my porfile"*), `LanguageSection` sits beside it again as the fourth
card, under `ScaleSection`, `ThemeSection` and `SpineSection`. In the portal it is in the
header beside `ModeToggle` (`web-portal/components/portal-shell.tsx`), because the portal
has no settings screen by design.

Evidence: (inferred) from the owner's brief. The mechanism is forced by
`web-portal/app/globals.css:25-34`, which already changes the whole portal's size by
setting `:root { font-size }` and nothing else, proving the approach works in this
codebase.

### S5: the scale setting is what makes the locked viewport honest

`web/app/layout.tsx` sets `maximumScale: 1, userScalable: false`. With pinch-zoom
disabled, S4 is the only way a person can make this app bigger. Do not ship the viewport
lock without the setting.

### S6: touch targets stay at 44px on coarse pointers at every scale step

`web-portal/app/globals.css:38-44` already enforces this for `button`, `a[role="button"]`
and `[role="tab"]`. Copy that block into `web/app/globals.css`. At the Compact step the
`rem`-derived height of `size="sm"` drops below 44px, so the floor must be absolute.

### S7: a container's side margin equals the gap it already keeps above its own toolbar — everywhere

**The rule.** The client's ruling, 17 Sep 2026, verbatim: *"Finally, can you make the
overall full content inside this container wider, not only the toolbar, but everything?
I'm trying to optimize the usage of space. I would say the margin on the sides should be
the same as the margin you now have on top of the toolbar. That's really ideal. Make sure
that you apply this change absolutely fucking everywhere."*

**The mechanism.** A content container's own side margin is capped at the same measure as
the gap the tab strip already keeps above the toolbar it carries
([K33](#k33-the-gap-above-a-toolbar-equals-the-gap-below-it-the-tab-strip-and-its-card-share-one-gapless-column),
[R83](../RULES.md)) — narrower than the horizontal gutter
[S2](#s2-horizontal-gutters-are-px-4-smpx-6-lgpx-10) otherwise sets. One number governs
both: the vertical gap above a toolbar and the horizontal margin around everything the
container holds, on every container this applies to, everywhere, per her own words — never
a screen's own choice.

**Status: ruled, in build, 17 Sep 2026.**

**Law.** None registered.

### S8: every screen carries the app's content inset, and none gets its own number

**The ruling.** Aurora, verbatim, 23 Sep 2026, over the accounts screen: *"there's no
margin form the left. make sure you implement the margins everywhere, and i dont have to
review it one by one. makeit rule."*

**The mechanism.** The inset a screen's content sits inside of is a SHELL DEFAULT, not a
per-screen choice: `shared/ui/compositions/templates/screen-shell.tsx`'s own
`SHELL_CONTENT_INSET_X` (`px-[var(--space-6)]`, 24px) is spent by `DENSITY_BODY` on the
pane's own inner stack (`[data-slot="screen-shell-stack"]`), and
`web/components/shell/app-shell.tsx` mounts that one `ScreenShell` unconditionally, so
every module the app renders (list or detail, recipe-driven or host-composed, top-level or
team-scoped) inherits the identical 24px left/right inset for free. A screen cannot ADD
this inset, there is nothing to add, it can only CANCEL it, by reaching past the pane's own
padded edge: the app's one sanctioned way to do that on purpose is the record footer band's
own `-mx-[var(--pane-inset-x…)]` / `-mx-[var(--pane-escape-x…)]` escape, always paired with
a matching padding put back.

**What it costs.** Nothing on an ordinary screen: the inset is inherited the moment a
screen renders as `{children}` inside `ScreenShell`, so a screen writes nothing to get it
and must write nothing to keep it. What it forbids is a screen's own host file reaching
past the pane's padded edge, or a blunt equivalent (`w-screen`, `100vw`), without a
reasoned, rot-checked exemption named in `CONTENT_INSET_EXEMPT`
(`shared/rules/registry.ts`), empty today, since no screen has yet earned one.

**Status: ruled and enforced, 23 Sep 2026.** Measured live against staging before this law
shipped (1440×842 and 760×900, rail collapsed): Accounts, Tickets, Backlog and a ticket
record already read the identical 24px left inset, across every view, every tab and both
widths, so no accounts source file needed changing; the law exists so a future screen
cannot regress the same complaint.

**Law.** [R109](../RULES.md) (`content-inset`), three parts, `web/test/content-inset.test.ts`:
(i) the screen registry is derived, never hand-listed, from every `Screen`/`Collection`/
`Detail*` component the app's own three module dispatchers import
(`web/components/deep-link/collection-content.tsx`, `module-content.tsx`,
`deep-link-screen.tsx`); (ii) every registry file is censused for the escape signature, or
named in `CONTENT_INSET_EXEMPT`, keyed by `{file, contains}`, the offending line's own
text, rot-checked both ways; (iii) three structural assertions prove the inset-bearing
element itself rather than trusting inheritance on faith: one unconditional `<ScreenShell>`
mount, `SHELL_CONTENT_INSET_X` pinned to `px-[var(--space-6)]` and spent by both
`DENSITY_BODY` densities, and the `screen-shell-stack` element spending
`DENSITY_BODY[density]`.

---
