"use client";

/* ============================================================================
   SettingsRoute — the workspace's own switches. Appearance, notifications,
   integrations and the working week.

   ASSEMBLED FROM ONE SHAPE, NOT DESIGNED
     · FormScreen — grouped fields, one commit, the page surface (shape 5).

   DESIGN SOURCE
   "Kwapso UI Kit.dc.html" chapter 26.05 (Settings — not a special case),
   which is the chapter that draws THIS screen; 27.20 (password and security)
   which states the Settings composition's own anatomy; and 27.14 for the
   onboarding step that offers the same three choices.

     ch26.05, verbatim: "Settings has no layout pattern of its own. It's a
       plain page-title header followed by the same underline tab strip used
       on every detail page's sub-tabs (section 4) — five tabs (Appearance,
       Members, Roles, Notifications, Integrations) instead of a record's
       tabs, that's the only difference."

     WHICH CHAPTER'S WORDS THE APPEARANCE PANEL TAKES, AND WHY IT MATTERS.
     26.05 and 27.14 offer the same three choices in DIFFERENT words, and
     both sets are the artifact's. 26.05 draws "Compact / 13px root, tight
     rows.", "Regular / 15px root, the default in both doors.", "Large / 17px
     root, roomy rows." and heads the group "Scale". 27.14 draws the short
     form — "Text size", "13px", "Tight rows." — which is the ONBOARDING
     step's, and `screens/onboarding.tsx` carries it. This screen is 26.05's,
     so it takes 26.05's, verbatim. Neither set is paraphrased and neither is
     mixed with the other.

     ch27.20, verbatim: "Where a member changes their password and sees where
       they are signed in. It is the Settings composition with a sixth tab —
       no vault imagery, no shield icons, no security score."

     The tab row the same chapter draws, in its own order: Appearance,
     Members, Roles, Notifications, Integrations, Security.

     ch27.14 on how a choice is offered, verbatim: "Choices are shown, not
       described … a small picture of the thing, its name, one line, and the
       ring on the one that is picked — never a list of words."

   THE LAW THIS FILE OBEYS
   · SETTINGS IS NOT A SPECIAL PLACE. No vault imagery, no shield, no score.
     It is the same form shell every other form in the app renders through.
   · EACH GROUP IS A GROUP, NOT A CARD. `FormScreen`'s sections are fieldsets
     with an eyebrow and a hairline. ch27.2 forbids cards inside a form.
   · A SWITCH SAYS WHAT IT DOES. Every toggle carries a description line, so
     nothing on this page is a bare word with a control beside it.
   · THE ASSISTANT IS NOT MODAL. Where the assistant has changed one of these
     controls, the application marks that control with a dot and a sentence —
     never a ring, never a lock. `assistantChanged` is the slot for it, and it
     is drawn as the field's own help line rather than as new furniture.

   WHAT NO SHAPE OFFERED — SYS1-5 still open, SYS1-6 CLOSED HERE (2026-08-26)
     · THE TAB ROW. ch27.20's Settings composition carries six tabs above the
       body. `FormScreen` has no tab slot, and `CollectionScreen` — the only
       shape that has one — cannot take a form as its body. This route
       therefore renders ONE tab's worth of settings as groups, and the tab
       row is the application's own navigation until a shape carries it.
     · THE VISUAL OPTION CARD IS BUILT NOW — `AppearanceOptionGroup`, below,
       drawn to 26.05's "How an option panel is built" with override 33's 1px
       ring, and exported so `onboarding.tsx` renders 27.14's step 2 from the
       same block. The Background (spine) group — mango default by override
       56, and THREE options again since the client's ruling of 2026-09-03
       ("you know, i changed my mind. i want to go back to the 3 options
       (sorry)") reversed the 2026-09-02 cut of D3's three to Mango and Quiet
       — ships beside Theme and Scale, which p16 drew and this screen
       previously omitted entirely. Renamed from "Sidebar" to "Background" on
       client instruction once the fill it picks stopped being confined to
       the rail and started painting the whole screen; that renaming stands
       and is untouched by the spine-count reversal.

   RENDERING CONTEXT
   `"use client"`. `FormScreen` builds the submit handler during its render.
   ========================================================================= */

import * as React from "react";

import { Badge } from "../../components/badge/badge";
import { Button } from "../../components/button/button";
import { Card } from "../../components/card/card";
import { Input } from "../../components/input/input";
import { Separator } from "../../components/separator/separator";
import { Headline, Hint, Text } from "../../components/typography/typography";
import { cn } from "../../lib/utils";
import { Choice } from "../../components/choice/choice";
import { Field } from "../../components/field/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/select/select";
import { Switch } from "../../components/switch/switch";
import { FormScreen, MainScreen, type FormScreenSection } from "../templates";
import { type ShapeState, type ShapeStateCopy } from "../states";

/** Every switch and choice this screen holds. */
export interface SettingsValues {
  /** Paper, unlit, or the device's own setting. */
  theme: string;
  /**
   * The window's fill — `ink`, `paper` or `mango`, painted behind the rail,
   * the floating content card's own ground, and everything else behind the
   * app. Client ruling D3 put the group in Settings · Appearance, the ruling
   * of 2026-09-02 cut it from three options to two, the ruling of 2026-09-03
   * put the three back, and override 56 makes mango the default. Labelled
   * "Background" (renamed from "Sidebar" once the fill stopped being
   * confined to the rail).
   */
  spine: string;
  /** Which root scale the interface is read at. */
  scale: string;
  /** Which day the sprint boundary falls on. */
  weekStart: string;
  /** A mail when a ticket is assigned to you. */
  notifyAssigned: boolean;
  /** A mail when a client answers a request. */
  notifyClientReply: boolean;
  /** The weekly digest of everything on your accounts. */
  notifyDigest: boolean;
  /** Time is pushed to the ledger as it is booked. */
  syncTime: boolean;
  /** Invoices are drafted from the retainer each month. */
  syncInvoices: boolean;
}

export interface SettingsRouteProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "title" | "onSubmit" | "onChange"> {
  /* ---- The shell. `MainScreen`'s, which is `ScreenShell`'s. -------------
     SETTINGS IS A MAIN SCREEN, and the client's own test settles it: "a main
     screen is in the navbar; a detail screen has breadcrumbs." Settings is in
     the navbar. It has no breadcrumb, no record, no identity chip row, no
     number pill and no charcoal footer, so nothing about it is a detail
     screen. `SHELL.md`'s "Record sub-views and Settings" sentence, which put
     Settings on the underline strip, WAS an exception on the tab axis only
     and never a reclassification; since 2026-09-02 it is not even that —
     the client retired the folder tab variant, `MainScreen` has no
     `tabsVariant` to take, and the underline strip is the only strip. The
     paragraph is kept because the classification it argues for is what puts
     this route on `MainScreen` at all.

     Before this the route returned `FormScreen surface="page"`, which is a
     bare `div` with `gap-6` on it: no page, no screen card, no rail and no
     OFF-BEIGE BODY PANE. The form is the BODY of a screen, not the screen. */

  /** The navigation rail's contents. Placed by the shell, dropped narrow. */
  rail?: React.ReactNode;
  /** Accessible name for the rail. */
  railLabel?: string;
  /** The micro line over the heading. */
  eyebrow?: React.ReactNode;

  /** The page heading. */
  title?: React.ReactNode;
  /** The one line under it. */
  description?: React.ReactNode;

  /** The values. Controlled: the workspace owns them, not this screen. */
  values?: SettingsValues;
  /** One control changed. */
  onChange?: (field: keyof SettingsValues, value: string | boolean) => void;

  /**
   * Controls the assistant changed this session, and the sentence saying so.
   * Ruling: the assistant is NOT modal — a control it touched gets a dot and
   * a sentence, never a ring and never a lock.
   */
  assistantChanged?: Partial<Record<keyof SettingsValues, React.ReactNode>>;

  /** The group eyebrows. */
  sectionLabels?: Partial<Record<SettingsSectionId, string>>;
  /** The control labels. */
  fieldLabels?: Partial<Record<keyof SettingsValues, string>>;
  /** The line under each control. */
  fieldHelp?: Partial<Record<keyof SettingsValues, React.ReactNode>>;

  /** Commit. */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  /** The commit's label. */
  submitLabel?: React.ReactNode;
  /** Retreat. */
  onCancel?: () => void;
  /** Its label. */
  cancelLabel?: React.ReactNode;
  /** The commit is running. */
  submitting?: boolean;
  /** Nothing may be changed. */
  disabled?: boolean;

  /** Loading, empty or error. */
  state?: ShapeState;
  /** Per-locale words. */
  copy?: Partial<ShapeStateCopy>;
  /** Try to load the settings again. */
  onRetry?: () => void;
  /** Its label. */
  retryLabel?: React.ReactNode;
}

/** The groups this screen is built from. */
export type SettingsSectionId = "appearance" | "week" | "notifications" | "integrations";

/* OVERRIDE 47 (2026-08-23) — "The working week" WAS INVENTED AND IS GONE.
   Three of these four are CH26.05's own tab words — Appearance, Notifications,
   Integrations, from the five it names — and the fourth was ours. The register
   swept it in N4's TAIL with the collection tab strips and the client ruled the
   same way on all of them: naming a product's sections is the dev team's work.
   THE KEY STAYS AS A SLOT, not a proposal. `sectionLabels` is already a prop,
   so an application supplies the word and the eyebrow comes back; empty, the
   group renders with no eyebrow, which is `FormSection`'s own behaviour and
   costs the screen no field. */
const SECTION_LABELS: Record<SettingsSectionId, string> = {
  appearance: "Appearance",
  week: "",
  notifications: "Notifications",
  integrations: "Integrations",
};

const FIELD_LABELS: Record<keyof SettingsValues, string> = {
  theme: "Theme",
  spine: "Background",
  scale: "Scale",
  weekStart: "Sprint starts on",
  notifyAssigned: "A ticket is assigned to me",
  notifyClientReply: "A client answers a request",
  notifyDigest: "Weekly digest for my accounts",
  syncTime: "Push booked time to the ledger",
  syncInvoices: "Draft invoices from the retainer",
};

const FIELD_HELP: Partial<Record<keyof SettingsValues, string>> = {
  theme: "Three choices, and the machine’s is one of them.",
  spine: "Three looks for the whole app, not just the rail.",
  scale: "How large the type and the rows sit. Applies to every screen, not just type.",
  weekStart: "Sets the sprint boundary and the week a figure is counted in.",
  notifyClientReply: "Only on accounts you own.",
  notifyDigest: "Sent on the first working day, in your timezone.",
  syncTime: "Runs nightly. A correction the next day is picked up.",
  syncInvoices: "Drafted, never sent. Somebody still presses send.",
};

/* ============================================================================
   THE SMALL PICTURES — THE KIT'S OWN ANATOMY, VALUE FOR VALUE.
   26.05 draws every picture as ONE 58px band at radius 24: a 54px rail
   column on the left, then two bars — 8px at 66% over 6px at 88%, 8px
   apart, inside 13px of padding. The THEME pictures are PINNED, and the
   coverage chapter licenses exactly this — "the small pictures of light
   and dark inside the Appearance step": a picture OF a palette cannot
   re-theme with the palette without lying about the choice it depicts.
   The kit's own hexes ship — #FFFEF9 / #F7F2EB / rgba(26,25,24,.30/.12)
   for light, #141310 / #1C1B18 / rgba(255,254,249,.42/.18) for dark, and
   the split System picture's 50/50 gradient with its grey rail #8e8b84
   and grey bars rgba(128,126,120,.55/.30). The SPINE and SCALE pictures
   are NOT pinned, because the kit's own markup draws them from tokens
   (`var(--card)`, `var(--inv)`, `var(--sheet)`, `var(--hair)`) — a spine
   or a type size is the same fact in either palette.
   ========================================================================= */

/* Below the shared 45rem the kit redraws the card as a ROW — a 76×40
   picture with a 44px rail on the left, the words in the middle, the badge
   at the end — and the picture regains its full 58px band from 45rem up.
   Both sets of measures are the kit's own (wide: 58 / 54 / 13 / 8@66% /
   6@88%; narrow: 40 / 44 / 11 / 7@64% / 5@88%). */
const THUMB =
  "flex h-10 w-[4.75rem] min-w-0 shrink-0 overflow-hidden rounded-[var(--radius)] " +
  "min-[45rem]:h-[3.625rem] min-[45rem]:w-full";

/** The two bars — the picture's stand-in for rows of type. */
const ThumbBars = ({ strong, faint }: { strong: string; faint: string }) => (
  <span className="flex min-w-0 flex-1 flex-col gap-1.5 p-[0.6875rem] min-[45rem]:gap-2 min-[45rem]:p-[0.8125rem]">
    <span
      className="h-[0.4375rem] w-[64%] rounded-pill min-[45rem]:h-2 min-[45rem]:w-[66%]"
      style={{ background: strong }}
    />
    <span
      className="h-[0.3125rem] w-[88%] rounded-pill min-[45rem]:h-1.5"
      style={{ background: faint }}
    />
  </span>
);

/** The rail column inside a picture — 44 narrow, the kit's 54 from 45rem. */
const THUMB_RAIL = "h-full w-11 shrink-0 min-[45rem]:w-[3.375rem]";

/** The theme pictures: light, dark, and the split that is both at once —
    pinned to the kit's own hexes (see the block comment above). */
export const ThemePicture = ({ tone }: { tone: "light" | "dark" | "system" }) => {
  const drawn = {
    light: {
      field: "#FFFEF9",
      rail: "#F7F2EB",
      strong: "rgba(26,25,24,.30)",
      faint: "rgba(26,25,24,.12)",
    },
    dark: {
      field: "#141310",
      rail: "#1C1B18",
      strong: "rgba(255,254,249,.42)",
      faint: "rgba(255,254,249,.18)",
    },
    system: {
      field: "linear-gradient(90deg,#FFFEF9 50%,#141310 50%)",
      rail: "#8e8b84",
      strong: "rgba(128,126,120,.55)",
      faint: "rgba(128,126,120,.30)",
    },
  }[tone];
  return (
    <span className={THUMB} style={{ background: drawn.field }} aria-hidden="true">
      <span className={THUMB_RAIL} style={{ background: drawn.rail }} />
      <ThumbBars strong={drawn.strong} faint={drawn.faint} />
    </span>
  );
};

/** THE THEME SWATCH — a small colour mark, not a picture: 13px, radius
    `--radius-sm`, `ThemePicture`'s own `light`/`dark`/`system` fills at a
    dot's scale rather than a thumbnail's. Built for the consuming app's
    Settings › Appearance pill row (`shared/web/appearance-pill-group.tsx`,
    kwapso_system): its own Background pills already carry a swatch, resolved
    through `SpinePicture`'s `[data-spine]` cascade (a ROLE token, `--spine-
    fill`, reachable from app code); Appearance's three pills have no
    equivalent role token to reach for, because a light/dark swatch is
    PALETTE-FIXED by definition — the same reason `ThemePicture` pins hex
    rather than riding the cascade two paragraphs up. So the fixed hex stays
    here, in the one file the app's own R32 already exempts for exactly this
    shape ("a swatch of what dark mode looks like must not flip when you are
    in dark mode"), and the app reaches it as a part rather than reinventing
    the pin. Same three hex sets as `ThemePicture`, transcribed rather than
    re-derived. */
export const ThemeSwatch = ({ tone }: { tone: "light" | "dark" | "system" }) => {
  const drawn = {
    light: "#FFFEF9",
    dark: "#141310",
    system: "linear-gradient(90deg,#FFFEF9 50%,#141310 50%)",
  }[tone];
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 rounded-[var(--radius-sm)] shadow-[var(--hairline)]"
      style={{ background: drawn }}
    />
  );
};

/** The spine pictures: the rail column in each of its fills, rows beside it.
    Token-drawn, as the kit's own markup draws them.

    IT STAMPS `data-spine` AND READS `--spine-fill`, RATHER THAN NAMING A
    TOKEN PER SPINE. The 2026-09-02 cut from three spines to two proved why:
    the OLD version of this component switched on the name and reached for
    `--spine-ink-fill` / `--spine-paper-fill` directly, which meant editing it
    in three places just to follow a token rename. Stamping the attribute the
    real screen stamps (`ScreenShell` puts `data-spine` on the screen root)
    makes the picture resolve through tokens.css §7b itself — the SAME
    cascade the real rail paints from — so it is correct by construction and
    cannot drift from the thing it depicts. THE 2026-09-03 REVERSAL PROVES IT
    THE OTHER WAY: going from two spines back to three touched this file not
    at all, beyond the type one line down.

    The ground is `--surface-page`, the paper the real rail stands on (in
    light it is the kit's drawn #FFFEF9; in dark, `--card` would render the
    ink or paper rail invisible on itself). The bars are the foreground at
    the kit's .30 and .12, and stay outside the rail, so the spine rebind
    reaches the column and nothing else. */
export const SpinePicture = ({ spine }: { spine: "ink" | "paper" | "mango" }) => (
  <span className={cn(THUMB, "bg-surface-page")} aria-hidden="true" data-spine={spine}>
    <span className={cn(THUMB_RAIL, "bg-[var(--spine-fill)]")} />
    <ThumbBars
      strong="color-mix(in srgb, var(--foreground) 30%, transparent)"
      faint="color-mix(in srgb, var(--foreground) 12%, transparent)"
    />
  </span>
);

/** The scale pictures: the SAME record row — one title, one line of
    metadata, nothing added or removed — read at 12/10, 14/12 and 16/14.

    CLIENT, 2026-09-02, verbatim: "the representation is worng, chnaging
    the size chnages the size of the text, not how much data is show. so
    your display is wrong." She was right, and specifically about this
    file: the picture used to answer "compact" with a SECOND metadata line
    ("Sprint 24 · shipped") and "large" with a SHORTER one (just "Status",
    the "· 4 open" dropped) — so scrubbing the setting looked like it
    changed how much the app shows, when the mechanism it depicts
    (`shared/scale.ts` in kwapso_system, the OTHER repo) sets a single root
    font size and nothing else: type and spacing move together because
    every size in the theme is `rem`, and no row is ever added or taken
    away. This picture now draws exactly that and only that — identical
    content at every step, with the block's own GAP and PADDING scaling
    alongside the type sizes (not just the two text lines), so "spacing
    gets bigger too" is visible, never a different amount of content. */
export const ScalePicture = ({
  step,
}: {
  step: "compact" | "default" | "large";
}) => {
  const titleSize = step === "compact" ? 12 : step === "default" ? 14 : 16;
  const metaSize = titleSize - 2;
  /* Gap and padding step with the type, in the same proportion — the
     picture's stand-in for "spacing scales with text", not just the two
     lines themselves. Values in rem, matching every other measure here. */
  const gap = step === "compact" ? 0.0625 : step === "default" ? 0.125 : 0.1875;
  const padX = step === "compact" ? 0.625 : step === "default" ? 0.75 : 0.875;
  const padY = step === "compact" ? 0.5 : step === "default" ? 0.625 : 0.75;
  return (
    <span
      className={cn(
        THUMB,
        /* The scale picture keeps its 58 band even on narrow — the kit
           never draws it at 40, and three lines of specimen type cannot
           stand in a 40px band; the words truncate instead. */
        "h-[3.625rem] flex-col bg-surface-panel shadow-[var(--hairline)]",
      )}
      style={{ gap: `${gap}rem`, padding: `${padY}rem ${padX}rem` }}
      aria-hidden="true"
    >
      <span
        className="truncate font-[var(--font-weight-medium)] text-foreground"
        style={{ fontSize: `${titleSize / 16}rem`, lineHeight: 1.3 }}
      >
        Record title
      </span>
      {/* ONE line, EVERY step — see the header above. */}
      <span
        className="truncate text-ink-tertiary"
        style={{ fontSize: `${metaSize / 16}rem`, lineHeight: 1.35 }}
      >
        Status · 4 open
      </span>
    </span>
  );
};

/* ============================================================================
   AppearancePreview — one live picture of the app itself, not a swatch.

   WHY THIS EXISTS. The client, 2026-09-14, choosing between four Settings ·
   Appearance layouts a lane put in front of her, picked the preview-led one —
   a single live preview beside compact controls, replacing twelve small
   option pictures — and ruled on what was wrong with the picture Background
   had: "Represent in the preview better the background (currently it's the
   old coloured navbar only)." The picture available for that job was
   `SpinePicture`, a 44px `THUMB_RAIL` swatch — never meant to carry the
   argument `screen-shell.tsx`'s own reshape makes: "THE GROUND IS THE SPINE,
   AND ONLY THE CONTENT FLOATS" — three looks for the whole app, not just the
   rail. This draws that hierarchy, small, so the three read as different at
   a glance for the reason they are different in the real app:

       spine GROUND        the whole frame           (`AppearancePreview`'s root)
       ├─ RAIL              lies on it, paints nothing
       └─ floating CARD     the one raised thing, off-beige in both palettes
          └─ soft PANEL     the collection/record body, one rung quieter
             └─ off-beige ROWS  a short populated list, the first at the
                                 chosen scale — see v1.2.78 below

   Same four rungs `screen-shell.tsx`'s own diagram draws for the real
   screen. Ink is the strong edge (light ground/card contrast 17.386, the
   client's own reason for keeping three spines: "in light i can choose to
   have a 'dark' background"); paper and mango are the thin case
   `--shadow-lifted` exists to carry — so the shadow is drawn here too, not
   dropped as a simplification, because a preview that fakes the strong edges
   and skips the thin ones would misrepresent exactly the two spines a
   reviewer most needs to trust it on.

   V1.2.78 — SHE SAW IT LIVE AND SAID IT LOOKS SHIT, AND POINTED AT A
   REFERENCE SHE LIKED. Verbatim: "Fix the preview because it looks shit. It
   was already good in your artifact, so fix that." The artifact was a
   design-lane review page with four candidate layouts; the fourth, "preview-
   led", carried a small live app mock (`.app-mock` in that file) that read as
   a picture of a product where v1.2.77's shipped preview read as a placeholder
   — the client's own description of the shipped one: "a flat mango rectangle
   containing one rounded white card with 'Record title / Status · 4 open'
   and a grey bar."

   WHAT THE ARTIFACT'S MOCK DID RIGHT, DIAGNOSED RATHER THAN COPIED (its own
   markup is a standalone page with its own throwaway tokens — `--mock-*` —
   and none of that crosses over):

     1. IT WAS POPULATED. One title-plus-meta pair floating alone in a panel
        with `justify-content: center` around it is mostly empty padding —
        which is what reads as "placeholder" rather than "screen with data on
        it". The mock's card held a title, a meta line AND two more content
        bars beneath. A product has more than one row; a picture of one row
        adrift in whitespace does not look like a product.
     2. THE TOP CHROME WAS VISIBLE. The shipped breadcrumb slot was a single
        2px bar at 32% opacity — which is exactly the "grey bar" she named,
        because at that height and that opacity it barely resolves as a mark
        at all, let alone as navigation. The mock's topbar was a real,
        legible bar.
     3. THE NESTING READ AS LAYERS, NOT AS ONE BOX. Card-on-page and panel-
        on-card both measure a THIN contrast in light (1.103, 1.103 — this
        file's own header states the figures) by construction, because paper
        and mango are the thin case `--shadow-lifted` exists to carry. With
        no edge of its own the panel is invisible whenever the colour alone
        cannot carry it, and three boxes read as one.

   WHAT CHANGED HERE, IN THE KIT'S OWN TOKENS — the fix is the diagnosis
   applied to THIS component's real parts, not the mock's div soup:

     1. THE PANEL HOLDS THREE ROWS NOW, not one, top-aligned rather than
        centred, so the panel's own space is spent on content rather than on
        margin around a lone specimen. Only the FIRST row is the specimen —
        it alone carries `Record title` / `Status · 4 open` and alone moves
        with `scale`, exactly as before. The two beneath are texture: plain
        bars, fixed size, fading at `--opacity-70`-ish per row (Tailwind
        `opacity-*`, not a new colour — R32 in the app repo governs `web/` and
        `shared/web/`, not this component's own file, and every hex or
        rgba() here was already pinned for the same reason `ThemePicture`'s
        is: "a picture OF a palette cannot re-theme with the palette without
        lying about the choice it depicts").
     2. THE BREADCRUMB IS TWO SEGMENTS, THICKER AND MORE OPAQUE — a short
        mark and a longer one, the shape "module › record" reads as even at
        preview scale, replacing the single 2px/32% hairline that measured as
        a stray line rather than as chrome.
     3. THE PANEL WEARS THE ROW'S OWN HAIRLINE (`shadow-[var(--hairline)]`,
        already drawn on the innermost row below) SO ITS EDGE SURVIVES WHERE
        COLOUR ALONE DOES NOT — the identical move `sections-stand-on-paper`
        (the app repo's R67) had to make for real panels-on-cards for the
        same measured reason, applied here to a picture of one.

   WHAT DID NOT CHANGE: the ground/rail/card hierarchy, the resolved-theme
   contract (`theme` takes `"light" | "dark"` only), and the scale mechanic
   (only the specimen row's two sizes move; nothing about how much a row
   shows changes with scale). None of those were what she was pointing at.

   V1.2.79 — THE SPECIMEN BECOMES A CHIP, A TITLE AND A BODY, IN LOREM. Her
   words: "on the settings appearance display, do it with chip, title and
   body — use lorem ipsums." Three decisions in that one sentence:

     1. CHIP ABOVE THE TITLE, NOT BESIDE IT. That is R65 in the consuming
        app ("on a card that stands for a record, the chip sits above the
        title" — source order is visual order in a column), so this preview
        now demonstrates the app's own law rather than inventing a card
        layout of its own. The chip is a fixed-size MARK, like the two
        texture rows below it — it does not move with `scale`, because a
        chip is not type; only the title and the body do.
     2. LOREM IS CORRECT HERE, ON PURPOSE, NOT A LAPSE THAT NEEDS FIXING
        LATER. A preview is a picture of the SHAPE a record takes, not of
        anyone's DATA — real words ("Record title", "Status · 4 open")
        imply this is showing an actual record, which it never was. Lorem
        also keeps the specimen LANGUAGE-NEUTRAL, which matters specifically
        because of where this preview now sits: `AppearancePanel`
        (the consuming app's `shared/web/appearance-panel.tsx`) puts the
        Language control immediately beside it, and an English specimen
        next to a German selection would read as a bug rather than as a
        deliberately abstract picture. CONFIRMED, NOT ASSUMED: lorem placed
        here sits outside the app's translation walk — `resolveImport` in
        `scripts/lib/i18n-source.mjs` refuses every specifier that resolves
        under `shared/ui/` (`VENDORED_UI`), so `appFiles()` never parses this
        file at all, and R28's extractor cannot catalogue a string it never
        reads. Nobody should "fix" this back to real English copy: doing so
        would silently ship an uncatalogued, untranslated sentence sitting
        one screen away from the language switcher itself.
     3. THE SCALE MECHANIC SURVIVES, AND IS WHERE IT SHOULD BE CLEAREST NOW.
        Title and body are the two things that move with `scale` — the same
        contract the old title/meta pair kept, extended to the new shape.
        The body is the SAME lorem sentence at every step (per
        `ScalePicture`'s own ruling: the mechanism this depicts sets one
        root font size and adds no content), long enough that it visibly
        wraps onto more lines as the size grows rather than reading as a
        one-word shrug — a truer demonstration of "the type gets bigger,
        nothing is added or removed" than a short line ever was, because the
        reader can see the SAME words taking more room.

   V1.2.81 — THE BREADCRUMB IS GONE. READ THIS BEFORE YOU REDRAW ONE. This is
   the SECOND time the top chrome above the card has been replaced rather than
   kept, and the second time is why removal, not another redesign, is the
   right fix.

     ROUND ONE (shipped v1.2.77). The top chrome was a single 2px bar at 32%
     opacity. The client's own words for it: "a flat mango rectangle
     containing one rounded white card with 'Record title / Status · 4 open'
     and a grey bar" — she read it as a placeholder, not as navigation.

     ROUND TWO (v1.2.78, THIS FILE'S OWN PREVIOUS FIX). Diagnosed as "the
     shipped breadcrumb slot was a single 2px bar at 32% opacity … which is
     exactly the 'grey bar' she named" and replaced with TWO segments —
     "module › record", thicker and more opaque — on the reasoning that a
     real trail with two parts would read as chrome rather than as a stray
     line. See the diagnosis above, still kept verbatim as the historical
     record of what round two tried and why.

     ROUND TWO WAS ALSO REJECTED. She looked at the shipped two-segment
     version live and asked for the bars on top of the preview to be removed,
     full stop — not redrawn a third way. The lesson is not "the second
     design was wrong in some fixable detail"; it is that a fake trail — any
     number of opaque bars standing in for words nobody can read — reads as
     placeholder furniture to her REGARDLESS of segment count or opacity, and
     a third attempt at the same idea would be the second mistake shipped
     twice. So this round is a DELETION: the rail now leads straight into the
     floating card, with nothing standing in for a breadcrumb above it.
     `APPEARANCE_PREVIEW_GROUND_INK` (the ink the two bars were drawn in) is
     deleted with it rather than kept dormant — a fact this file's own
     `spine.ts` sibling in the consuming app argues for elsewhere: a mapping
     kept "to be safe" outlives the problem it solved and confuses the next
     reader into thinking it is still needed.

     WHAT THIS COSTS. The preview's top edge is now the rail meeting the
     card directly — one fewer visual layer than a real screen has (a real
     screen's card sits under a real breadcrumb). That is an honest
     simplification, not a regression pretending otherwise: this preview's
     job is the ground/rail/card/panel HIERARCHY (see this file's own header
     above, "AppearancePreview"), and two rulings in a row say a fake trail
     does not help that argument and reads as unfinished chrome instead.

     THE CARD STAYS `flex-1` IN A `gap-3` COLUMN. With the breadcrumb gone the
     column holds one child instead of two, so `gap-3` does nothing (nothing
     to space) and the card's own `flex-1` fills the frame exactly as before
     — if anything with slightly more room, never less. Nothing here needed
     to change for the card to keep filling `AppearancePreview`'s own
     `min-h-[17rem]` frame.

   PINNED HEX, NOT LIVE TOKENS — `ThemePicture`'s own fork, for the same
   reason. Dark-mode tokens bind at `:root[data-theme="dark"]` (tokens.css
   §6): a scoped descendant has no selector that says "be dark" while the
   document stays light, so a live preview of a THEME cannot ride the
   cascade the way `SpinePicture` rides spine tokens (bound on
   `[data-spine="…"]`, any element — no document-level attribute needed).
   Every hex below is transcribed, not re-derived: `tokens.css`'s own
   `--kw-*` values, and `screen-shell.tsx`'s own measured ground/card table
   from its reshape note.

       ground   ink   light #1A1918  dark #1C1B18
                paper light #F7F2EB  dark #2F2D28
                mango light #FED069  dark #FED069   (mango does not move)
       card           light #FFFEF9  dark #26241F   (spine-independent)
       panel          light #F7F2EB  dark #1C1B18   (spine-independent)
       ink-on-ground  ink   #FFFEF9  both palettes  (`--spine-ink` for ink is
                                     unconditionally off-beige, tokens.css §7b)
                      paper light #1A1918  dark #FFFEF9  (`var(--foreground)`)
                      mango #1A1918  both  (`--ink-on-accent`; D3's "always
                                     black text" on mango)

   `theme` TAKES `"light" | "dark"` ONLY, ALREADY RESOLVED — never `"system"`.
   A picture has no clock and no `matchMedia` of its own; the caller (wherever
   the person's stored preference is read, the same place `ModeToggle` itself
   resolves it) answers "what does system mean right now" once, before this
   renders. `AppearanceOption`'s own "system" tone stays `ThemePicture`'s job,
   on the small option card beside this preview.

   SCALE MOVES THE ROW'S TYPE ONLY — the same two sizes `ScalePicture` draws
   (title, meta), read larger here because this frame has the room. Nothing
   about how MUCH the row shows changes with scale, for the identical reason
   `ScalePicture`'s own header states: the mechanism this depicts sets one
   root font size and adds no row.
   ========================================================================= */

const APPEARANCE_PREVIEW_GROUND: Record<
  "ink" | "paper" | "mango",
  { light: string; dark: string }
> = {
  ink: { light: "#1A1918", dark: "#1C1B18" },
  paper: { light: "#F7F2EB", dark: "#2F2D28" },
  mango: { light: "#FED069", dark: "#FED069" },
};

/** `--card`, spine-independent — the one floating thing on any ground. */
const APPEARANCE_PREVIEW_CARD = { light: "#FFFEF9", dark: "#26241F" };

/** `--surface-panel`, spine-independent — the collection/record body, one
    rung quieter than the card it sits in. */
const APPEARANCE_PREVIEW_PANEL = { light: "#F7F2EB", dark: "#1C1B18" };

/** `--foreground` / `--muted-foreground`, read on the card and the panel —
    never on the ground, which since v1.2.81 paints nothing of its own (see
    "THE BREADCRUMB IS GONE" in this file's own header). */
const APPEARANCE_PREVIEW_ROW_INK = { light: "#1A1918", dark: "#FFFEF9" };
const APPEARANCE_PREVIEW_ROW_META = {
  light: "rgba(26, 25, 24, .55)",
  dark: "rgba(255, 254, 249, .55)",
};

/** The specimen's two sizes, in px — title and body, read one step larger
    than `ScalePicture`'s own pair because this frame has the room to hold
    them legibly. v1.2.79: renamed from `meta` to `body` when the specimen's
    second line changed from a short status line to a lorem paragraph — see
    `AppearancePreview`'s own header. */
const APPEARANCE_PREVIEW_SCALE: Record<
  "compact" | "default" | "large",
  { title: number; body: number }
> = {
  compact: { title: 15, body: 13 },
  default: { title: 18, body: 16 },
  large: { title: 21, body: 19 },
};

export interface AppearancePreviewProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Already resolved — never "system". See the header above. */
  theme: "light" | "dark";
  /** The ground the whole frame stands on. */
  spine: "ink" | "paper" | "mango";
  /** Moves the row's type only, never what the row shows. */
  scale?: "compact" | "default" | "large";
}

/**
 * A small, live picture of the app itself: the spine ground, the rail lying
 * on it painting nothing, and one floating record — card, panel, row — at
 * the chosen scale. Pure and prop-driven, exactly as `ThemePicture` /
 * `SpinePicture` / `ScalePicture` are: no internal state, so a caller can
 * re-render it on every control press and the picture is never stale by a
 * frame.
 */
export function AppearancePreview({
  theme,
  spine,
  scale = "default",
  className,
  ...props
}: AppearancePreviewProps) {
  const ground = APPEARANCE_PREVIEW_GROUND[spine][theme];
  const card = APPEARANCE_PREVIEW_CARD[theme];
  const panel = APPEARANCE_PREVIEW_PANEL[theme];
  const rowInk = APPEARANCE_PREVIEW_ROW_INK[theme];
  const rowMeta = APPEARANCE_PREVIEW_ROW_META[theme];
  const sizes = APPEARANCE_PREVIEW_SCALE[scale];

  return (
    <div
      role="img"
      aria-label={`Preview: ${spine} background, ${theme} appearance`}
      className={cn(
        /* v1.2.78: 14 → 15.5rem, three rows needing more room than one
           centred row did. v1.2.79: → 17rem — the specimen grew a chip and
           a wrapping lorem body; this is a FLOOR, not a cap (the column
           below has no fixed height), so a longer wrap at Large only grows
           the box further rather than clipping. */
        "flex min-h-[17rem] w-full overflow-hidden rounded-[var(--radius)] transition-colors duration-200",
        className,
      )}
      style={{ background: ground }}
      {...props}
    >
      {/* THE RAIL — lies on the ground and paints nothing of its own,
          exactly as `rail.tsx`'s own state 1 and `screen-shell.tsx`'s
          reshape both state it. */}
      <span
        className="w-[2.875rem] shrink-0 min-[45rem]:w-[3.375rem]"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        {/* THE FLOATING CARD — the one raised, shadowed thing on this
            ground; `--shadow-lifted`, load-bearing on paper and mango. NO
            BREADCRUMB ABOVE IT — see "THE BREADCRUMB IS GONE" in this file's
            own header for why. */}
        <div
          className="flex flex-1 flex-col rounded-[var(--radius)] p-3 shadow-[var(--shadow-lifted)]"
          style={{ background: card }}
        >
          {/* THE PANEL — one rung quieter, the record body. v1.2.78: wears
              the row's own hairline now, so its edge survives where the
              colour alone measures too thin to read (panel-on-card is
              contrast 1.103 in light, 1.111 in dark — this file's own header
              states the figures) — the exact move `sections-stand-on-paper`
              makes for a real panel on a real card, applied here to a
              picture of one. Top-aligned, not centred: the space is spent on
              rows now, not on margin around a single one. */}
          <div
            className="flex flex-1 flex-col gap-1.5 rounded-[var(--radius)] p-2.5 shadow-[var(--hairline)]"
            style={{ background: panel }}
          >
            {/* ROW 1 — the specimen: a chip, a title, a body. v1.2.79 — see
                this file's own header for the full account. */}
            <div
              className="flex flex-col gap-1.5 rounded-[var(--radius)] px-3 py-2.5 shadow-[var(--hairline)]"
              style={{ background: card }}
            >
              {/* THE CHIP — ABOVE the title, never beside it: R65 in the
                  consuming app states the order, and this draws that law
                  rather than a layout of its own. Lorem, one word, the same
                  reason the title and body are: a picture of the shape, not
                  of a record's real status. Fixed size — a chip is a MARK,
                  not type, so unlike the title and body below it, it does
                  not move with `scale` (the same fixed-size treatment the
                  texture rows 2–3 get, and for the identical reason). */}
              <span
                className="inline-flex w-fit items-center rounded-pill px-2 py-0.5 text-[0.625rem] font-[var(--font-weight-medium)]"
                style={{ background: panel, color: rowMeta }}
              >
                Lorem
              </span>
              {/* THE TITLE — moves with `scale`, exactly as the old
                  "Record title" line did; only the word changed, to lorem,
                  for the reason the header states. */}
              <span
                className="truncate font-[var(--font-weight-medium)] transition-[font-size] duration-200"
                style={{ color: rowInk, fontSize: `${sizes.title}px`, lineHeight: 1.3 }}
              >
                Lorem ipsum dolor
              </span>
              {/* THE BODY — moves with `scale` too, and is the clearest
                  place the mechanic reads now: the SAME sentence at every
                  step, long enough that it visibly wraps onto more lines as
                  the size grows rather than staying one line throughout. No
                  `truncate` — clipping it to one line would hide the exact
                  thing this row exists to show. */}
              <span
                className="transition-[font-size] duration-200"
                style={{ color: rowMeta, fontSize: `${sizes.body}px`, lineHeight: 1.4 }}
              >
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore.
              </span>
            </div>
            {/* ROWS 2–3 — texture, not specimens: a short populated list
                reads as a product; one row alone in a padded panel is what
                read as a placeholder. Fixed size, never scaling with `scale`
                — the mechanism the scale picture and this preview both state
                moves type only, and these two rows are not the type being
                depicted. Fading per row (Tailwind `opacity-*`, not a new
                colour) so the eye reads them as "list continues" rather than
                as three equal specimens. */}
            <div
              className="flex flex-col gap-1 rounded-[var(--radius)] px-3 py-2 opacity-70"
              style={{ background: card }}
            >
              <span
                className="h-[0.3125rem] w-[58%] rounded-pill"
                style={{ background: rowInk, opacity: 0.3 }}
              />
              <span
                className="h-[0.25rem] w-[34%] rounded-pill"
                style={{ background: rowMeta, opacity: 0.6 }}
              />
            </div>
            <div
              className="flex flex-col gap-1 rounded-[var(--radius)] px-3 py-2 opacity-40"
              style={{ background: card }}
            >
              <span
                className="h-[0.3125rem] w-[46%] rounded-pill"
                style={{ background: rowInk, opacity: 0.3 }}
              />
              <span
                className="h-[0.25rem] w-[30%] rounded-pill"
                style={{ background: rowMeta, opacity: 0.6 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   THE VISUAL OPTION CARD — 26.05's "How an option panel is built", verbatim:
   "A choice that changes how the app looks is never a row of pills and never
   a dropdown. It is one card per option: a small picture of the thing
   itself, the option's name, one line of prose, and a mango In use badge on
   the one that is set. Selection is the 2px charcoal ring around the card —
   no tick, no radio. Three options per group, in a row that wraps."
   · THE RING IS 1PX, NOT 2 — override 33, the client's own "the line is too
     thick": the same `--hairline-ink` every selection ring in the kit takes,
     and `flowchart.tsx`'s node holds the precedent for the exact class.
   · THE BADGE IS MANGO — `variant="default"`, stated, because a bare
     <Badge> was ruled QUIET and this chip is the kit's drawn mango "In
     use". Override 17 makes it legal: marks, not actions.
   · EXPORTED for `onboarding.tsx`. 27.14, verbatim: "The appearance step
     uses the same visual option cards as Settings · Appearance … a small
     picture of the thing, its name, one line, and the ring on the one that
     is picked — never a list of words." One block, both screens; SYS1-6
     closes with it.
   ========================================================================= */

/** One choice on an option card. */
export interface AppearanceOption {
  /** Stable key, and the value reported on select. */
  value: string;
  /** The option's name. */
  label: React.ReactNode;
  /** The one line of prose under it. */
  description?: React.ReactNode;
  /** The small picture of the thing itself, above the name. */
  picture?: React.ReactNode;
}

export interface AppearanceOptionGroupProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange" | "defaultValue"> {
  /** The three (or so) choices, in a row that wraps. */
  options: readonly AppearanceOption[];
  /** Which one is set. */
  value?: string;
  /** A different card was pressed. */
  onValueChange?: (value: string) => void;
  /** Nothing may be changed. */
  disabled?: boolean;
  /**
   * The word on the set card's mango badge — 26.05 draws "In use" here and
   * 27.14 draws "Picked" on the same card in onboarding.
   */
  badgeLabel?: React.ReactNode;
}

/**
 * A row of pickable cards, one per option. `role="radiogroup"` because that
 * is what it is; the ring and the badge carry the state visually, per 26.05's
 * "no tick, no radio".
 */
export function AppearanceOptionGroup({
  options,
  value,
  onValueChange,
  disabled = false,
  badgeLabel = "In use",
  className,
  ...props
}: AppearanceOptionGroupProps) {
  return (
    <div
      role="radiogroup"
      data-slot="appearance-options"
      className={cn(
        /* Kit: `repeat(auto-fit, minmax(210px, 1fr))`, gap 12 — 13.125rem
           under the kit's px-to-rem convention, and the row wraps by losing
           columns, never by squeezing a card under the picture's own width.
           Below the shared 45rem the kit stacks the cards as ROWS, 8px
           apart. */
        "flex min-w-0 flex-col gap-2",
        "min-[45rem]:grid min-[45rem]:grid-cols-[repeat(auto-fit,minmax(13.125rem,1fr))] min-[45rem]:gap-3",
        className,
      )}
      {...props}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={
              onValueChange === undefined || selected
                ? undefined
                : () => {
                    onValueChange(option.value);
                  }
            }
            className={cn(
              "min-w-0 cursor-pointer rounded-[var(--radius)]",
              "border-0 bg-transparent p-0 text-start",
              disabled && "cursor-not-allowed",
            )}
          >
            <Card
              /* The kit's option card is SHEET paper (`var(--sheet)`) on the
                 group's off-beige ground — `Card`'s default variant, not
                 `raised`, which is the ground's own paper and would vanish
                 on it. No shadow: the kit draws none here. Below 45rem the
                 card is the kit's narrow ROW — picture left, words centre,
                 badge at the end, 12px 14px of padding. */
              className={cn(
                "h-full flex-row items-center gap-3 px-3.5 py-3",
                "min-[45rem]:flex-col min-[45rem]:items-stretch min-[45rem]:p-4",
                /* Override 33 — the selection ring is 1px `--hairline-ink`,
                   not 26.05's drawn 2px, on the client's own "the line is
                   too thick"; `flowchart.tsx`'s node holds the precedent. */
                selected && "shadow-[var(--hairline-ink)]",
              )}
            >
              {option.picture}
              <span className="flex min-w-0 flex-1 flex-col gap-[0.1875rem]">
                <span className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <Text as="span" size="sm" className="font-[var(--font-weight-medium)]">
                    {option.label}
                  </Text>
                  {/* Kit: the badge sits `margin-left: auto` — pushed to the
                      card's far edge, not beside the word — and it is the
                      MANGO fill, which is `variant="default"` and no longer
                      the bare <Badge> (an unqualified Badge was ruled QUIET).
                      Override 17 licenses it: a non-interactive mark, so
                      three "Picked" chips beside a mango Next are legal. */}
                  {selected ? (
                    <Badge variant="default" className="ms-auto">
                      {badgeLabel}
                    </Badge>
                  ) : null}
                </span>
                {option.description === undefined ? null : (
                  <Hint>{option.description}</Hint>
                )}
              </span>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

/* CH26.05's Appearance panel, verbatim — the labels and the lines under them
   are the chapter's own words and are not paraphrased. The `value` strings
   are the application's contract and are deliberately untouched: the
   artifact's third scale is called "Regular" and this one has always been
   keyed `default`, so only the WORD moves. */
const THEMES: readonly AppearanceOption[] = [
  {
    value: "light",
    label: "Light",
    description: "Off-beige paper, charcoal ink.",
    picture: <ThemePicture tone="light" />,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Unlit paper, off-beige type.",
    picture: <ThemePicture tone="dark" />,
  },
  {
    value: "system",
    label: "System",
    description: "Follow the machine, switch at dusk.",
    picture: <ThemePicture tone="system" />,
  },
];

/* p16's Background group. CLIENT RULING, 2026-09-03: BACK TO THREE, verbatim
   "you know, i changed my mind. i want to go back to the 3 options (sorry)."
   This reverses the 2026-09-02 cut of D3's three (Ink, Paper, Mango) to two
   (Mango and Quiet); override 56 still makes MANGO the default, unaffected
   by either ruling.

   INK IS NOT A THIRD TASTE OPTION BESIDE TWO — IT IS THE WHOLE REASON THREE
   CAME BACK. Her words, on why: "my goal is that in light i can choose to
   have a 'dark' background option." Appearance (above, on this same screen)
   decides whether the app reads light or dark; this group decides the
   colour behind everything; Ink is what lets a workspace on the LIGHT theme
   still show a DARK window. That is a real capability, not a mood, and the
   description below says so in plain words instead of naming a token.

   RENAMED FROM "Sidebar" TO "Background", CLIENT INSTRUCTION (verbatim: "on
   settings, we need to rename that last section — it's no longer the sidebar
   but the ground/background you choose the word"), AND THIS RENAMING STANDS
   — it is untouched by the spine-count reversal. The fill this group picks
   paints the ground behind the whole screen — the rail, the space around
   the floating content card, everything behind the app — so a caption that
   said "sidebar", or "spine", would be describing a scope the choice no
   longer has.

   THE COPY IS REWRITTEN HERE, NOT REVERTED. The pre-cut three described
   FILLS — "Charcoal spine, mango active row.", "Soft-paper spine, the quiet
   one." — token language dressed as a caption, banned once "Sidebar" became
   "Background" and doubly wrong for Ink now: this is a group of THREE
   colours again, not two, so a returning reader cannot lean on "the other
   one" to fill in what a name does not say. Each line below states what
   living with the choice is like — no token names, no "spine" (the field is
   labelled Background and that is the word the reader has) — kept to Mango's
   own two-clause length and the room's plain, sentence-case voice; a bright
   colour, a light calm one, and a dark one that does not ask you to change
   your theme to get it. */
const SPINES: readonly AppearanceOption[] = [
  {
    value: "ink",
    label: "Ink",
    description: "A dark background of its own, whatever your light or dark setting is.",
    picture: <SpinePicture spine="ink" />,
  },
  {
    value: "paper",
    label: "Paper",
    description: "A calm, light background that lets the work stand out.",
    picture: <SpinePicture spine="paper" />,
  },
  {
    value: "mango",
    label: "Mango",
    description: "Warm colour behind the whole app. Easy to find your place.",
    picture: <SpinePicture spine="mango" />,
  },
];

const SCALES: readonly AppearanceOption[] = [
  {
    value: "compact",
    label: "Compact",
    description: "13px root, tight rows.",
    picture: <ScalePicture step="compact" />,
  },
  {
    value: "default",
    label: "Regular",
    description: "15px root, the default in both doors.",
    picture: <ScalePicture step="default" />,
  },
  {
    value: "large",
    label: "Large",
    description: "17px root, roomy rows.",
    picture: <ScalePicture step="large" />,
  },
];

const WEEK_START: readonly { value: string; label: string }[] = [
  { value: "monday", label: "Monday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "sunday", label: "Sunday" },
];

const VALUES: SettingsValues = {
  theme: "system",
  /* Override 56 — "the define spine by default is the one with the mango sidebar". */
  spine: "mango",
  scale: "default",
  weekStart: "monday",
  notifyAssigned: true,
  notifyClientReply: true,
  notifyDigest: false,
  syncTime: true,
  syncInvoices: false,
};

const TOGGLES: readonly (keyof SettingsValues)[] = [
  "notifyAssigned",
  "notifyClientReply",
  "notifyDigest",
];

const SYNCS: readonly (keyof SettingsValues)[] = ["syncTime", "syncInvoices"];

/**
 * The workspace settings form.
 *
 * TEN STATES — every one belongs to `FormScreen` or to a control.
 *  1. default        — four groups, one footer, the commit last.
 *  2. hover          — owned by the controls and the buttons.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once.
 *  4. active/pressed — owned by `Button` and by `Switch`.
 *  5. disabled       — `disabled` freezes every group through one fieldset.
 *  6. loading        — `submitting` on the commit; `state="loading"` unfills
 *                      the body while the settings are fetched.
 *  7. empty          — `state="empty"`: a reader whose rights leave no
 *                      settings on this screen. ch24.6 hides rather than
 *                      disables, so this is a real case.
 *  8. error          — `state="error"`: the settings could not be loaded.
 *  9. selected       — the ringed card in each option group.
 * 10. read-only      — pass `disabled` with no `onSubmit`.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — one column below the form breakpoint, two
 *  above it, owned by `Form`'s grid. The switch groups stay one column at
 *  every width, because a two-column list of switches reads as a grid of
 *  unrelated words.
 *
 * RTL — LTR only by client ruling.
 */
function SettingsRoute({
  rail,
  railLabel,
  eyebrow,
  title = "Settings",
  description = "How this workspace behaves for you.",
  values = VALUES,
  onChange,
  assistantChanged,
  sectionLabels,
  fieldLabels,
  fieldHelp,
  onSubmit,
  submitLabel = "Save settings",
  onCancel,
  cancelLabel = "Cancel",
  submitting = false,
  disabled = false,
  state = "ready",
  copy,
  onRetry,
  retryLabel = "Try again",
  ...props
}: SettingsRouteProps) {
  const groups = { ...SECTION_LABELS, ...sectionLabels };
  const labels = { ...FIELD_LABELS, ...fieldLabels };
  const help = { ...FIELD_HELP, ...fieldHelp };

  /* The assistant's sentence rides the field's own help line. No ring, no
     lock, no second surface — the assistant is not modal. */
  const helpFor = (field: keyof SettingsValues): React.ReactNode => {
    const changed = assistantChanged?.[field];
    if (changed === undefined) return help[field];
    return changed;
  };

  const toggleRow = (field: keyof SettingsValues) => (
    <Choice
      key={field}
      label={labels[field]}
      description={helpFor(field)}
      disabled={disabled}
    >
      <Switch
        checked={values[field] === true}
        disabled={disabled}
        onCheckedChange={
          onChange === undefined
            ? undefined
            : (checked) => {
                onChange(field, checked);
              }
        }
      />
    </Choice>
  );

  const sections: FormScreenSection[] = [
    {
      id: "appearance",
      title: groups.appearance,
      /* ONE COLUMN — each group is 26.05's row of three cards, and a row of
         cards beside another row of cards is a grid of unrelated pictures. */
      columns: 1,
      children: (
        <React.Fragment>
          {/* 26.05's three groups, in p16's own order: Theme, Sidebar, Scale.
              Each is the visual option card row — "shown, not described". */}
          <Field label={labels.theme} help={helpFor("theme")} disabled={disabled}>
            {(control) => (
              <AppearanceOptionGroup
                {...control}
                options={THEMES}
                value={values.theme}
                disabled={disabled}
                onValueChange={
                  onChange === undefined
                    ? undefined
                    : (value) => {
                        onChange("theme", value);
                      }
                }
              />
            )}
          </Field>
          <Field label={labels.spine} help={helpFor("spine")} disabled={disabled}>
            {(control) => (
              <AppearanceOptionGroup
                {...control}
                options={SPINES}
                value={values.spine}
                disabled={disabled}
                onValueChange={
                  onChange === undefined
                    ? undefined
                    : (value) => {
                        onChange("spine", value);
                      }
                }
              />
            )}
          </Field>
          <Field label={labels.scale} help={helpFor("scale")} disabled={disabled}>
            {(control) => (
              <AppearanceOptionGroup
                {...control}
                options={SCALES}
                value={values.scale}
                disabled={disabled}
                onValueChange={
                  onChange === undefined
                    ? undefined
                    : (value) => {
                        onChange("scale", value);
                      }
                }
              />
            )}
          </Field>
        </React.Fragment>
      ),
    },
    {
      id: "week",
      /* An unnamed group draws no eyebrow rather than an empty one. */
      title: groups.week === "" ? undefined : groups.week,
      columns: 1,
      children: (
        <Field label={labels.weekStart} help={helpFor("weekStart")} disabled={disabled}>
          {(control) => (
            <Select
              value={values.weekStart}
              disabled={disabled}
              onValueChange={
                onChange === undefined
                  ? undefined
                  : (value) => {
                      onChange("weekStart", value);
                    }
              }
            >
              <SelectTrigger {...control}>
                <SelectValue placeholder="Pick a day" />
              </SelectTrigger>
              <SelectContent>
                {WEEK_START.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      ),
    },
    {
      id: "notifications",
      title: groups.notifications,
      columns: 1,
      children: (
        <div className="flex min-w-0 flex-col gap-3">{TOGGLES.map(toggleRow)}</div>
      ),
    },
    {
      id: "integrations",
      title: groups.integrations,
      columns: 1,
      children: <div className="flex min-w-0 flex-col gap-3">{SYNCS.map(toggleRow)}</div>,
    },
  ];

  return (
    <MainScreen
      data-slot="system-settings"
      density="comfortable"
      rail={rail}
      railLabel={railLabel}
      eyebrow={eyebrow}
      title={title}
      meta={description}
      panel={false}
      state={state}
      body={
        /* THE TITLE AND THE LEDE ARE IN THE HEADER BAND, AND THE FORM DRAWS
           NEITHER. `Form` renders its description only inside its title branch,
           so passing the title down and the lede up was not possible — both move
           together, the title to `MainScreen`'s heading and the lede to its
           `meta`, which is the bare line `SHELL.md` allows under a heading. The
           form keeps its groups, its footer and its one commit.

           `panel={false}`: the form's sections ARE the soft-paper panels 26.05
           draws, so they stand straight on the off-beige body pane. Wrapping them
           in a panel of their own would be a panel inside a panel and a level the
           nesting does not have. With no panel there is no toolbar and no folder
           tab, which is right — Settings cuts no collection. */
        <FormScreen
          surface="page"
          density="comfortable"
          /* p15's page-width law names its ONE exception by name: "the real
             product's content area is fluid … The one deliberate exception
             is Settings, which caps its content at 1000px because its forms
             and tables read better narrow." 62.5rem under the px-to-rem
             convention. */
          className="max-w-[62.5rem]"
          sections={sections}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
          onCancel={onCancel}
          cancelLabel={cancelLabel}
          submitting={submitting}
          disabled={disabled}
          state={state}
          copy={copy}
          errorAction={
            onRetry === undefined ? undefined : (
              <Button variant="secondary" onClick={onRetry}>
                {retryLabel}
              </Button>
            )
          }
        />
      }
      {...props}
    />
  );
}

SettingsRoute.displayName = "SettingsRoute";

/* ----------------------------------------------------------------------------
   SettingsSecurity — ch27.20's Security TAB, the body only.

   MISSING UNTIL 2026-08-26. The client deleted `password-security` as a
   SCREEN because "it is the Settings composition with a sixth tab — no vault
   imagery, no shield icons, no security score" — and after the deletion the
   tab's CONTENT existed nowhere. This is that content, transcribed from
   27.20's own markup: the Password panel and "Where you are signed in", two
   soft-paper panels on the body pane, exactly as the other five tabs draw
   theirs. The tab ROW stays the application's navigation (SYS1-5).

     ch27.20's own cards, verbatim where they rule:
       "The password is optional, and says so … Save stays disabled in quiet
        ink until both fields carry something."
       "Consequences before the button — the line above Save says what
        happens: every other device is signed out."
       "Sessions are named, not counted — device, browser, city and last use,
        one row each, with the current one marked by a neutral pill and a
        forest dot rather than being hidden."
       "Revoke is poppy text, and is logged … never a filled red button in a
        list … Sign out everywhere sits last, alone."
       "Two-factor is out of scope for now — no 2FA row is drawn."

   THE DESTRUCTIVE WORDS take override 19's underlined `text` variant in
   override 43's `--destructive-ink` — the AA-passing poppy step — never a
   filled red button.
   ------------------------------------------------------------------------- */

/** One place a member is signed in. */
export interface SettingsSession {
  /** Stable key. */
  id: string;
  /** "Mac · Chrome" — device, then browser. */
  device: string;
  /** "Berlin · in use now" — city, then last use. */
  meta: string;
  /** This browser. Marked with the neutral pill, never hidden. */
  current?: boolean;
}

/** Every user-facing string on the Security tab. */
export interface SettingsSecurityLabels {
  passwordTitle: string;
  passwordNote: string;
  currentLabel: string;
  newLabel: string;
  newPlaceholder: string;
  consequence: string;
  save: string;
  sessionsTitle: string;
  sessionsNote: string;
  thisDevice: string;
  revoke: string;
  revokeNote: string;
  signOutEverywhere: string;
}

const SECURITY_LABELS: SettingsSecurityLabels = {
  passwordTitle: "Password",
  passwordNote: "Optional. The email link works whether or not you set one.",
  currentLabel: "Current password",
  newLabel: "New password",
  newPlaceholder: "At least 12 characters",
  consequence: "Changing it signs out every other device.",
  save: "Save",
  sessionsTitle: "Where you are signed in",
  sessionsNote: "Three sessions. Sessions end after 30 days of not being used.",
  thisDevice: "This device",
  revoke: "Revoke",
  revokeNote: "Revoking a session is recorded in the activity log.",
  signOutEverywhere: "Sign out everywhere",
};

/* The artifact's own three rows. Obviously-fictional content. */
const SECURITY_SESSIONS: readonly SettingsSession[] = [
  { id: "mac", device: "Mac · Chrome", meta: "Berlin · in use now", current: true },
  { id: "iphone", device: "iPhone · Safari", meta: "Berlin · yesterday, 18:20" },
  { id: "win", device: "Windows · Edge", meta: "Barcelona · 11 Aug" },
];

export interface SettingsSecurityProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  /** The sessions, current one included. */
  sessions?: readonly SettingsSession[];
  /** Merged over the artifact's own strings. */
  labels?: Partial<SettingsSecurityLabels>;
  /** Save the new password. Never called while either field is empty. */
  onPasswordSave?: (current: string, next: string) => void;
  /** End one session. Omit for a reader who may not. */
  onRevoke?: (session: SettingsSession) => void;
  /** End every session but this one. Sits last, alone. */
  onSignOutEverywhere?: () => void;
  /** Nothing may be typed or pressed. */
  disabled?: boolean;
}

/**
 * The Security tab's body — ch27.20, drawn as the Settings composition's
 * sixth tab and nothing more.
 *
 * TEN STATES
 *  1. default        — the two panels.
 *  2. hover          — the controls' own.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once.
 *  4. active/pressed — the controls' own.
 *  5. disabled       — `disabled` closes both panels; Save is ALSO closed on
 *                      its own condition — "disabled in quiet ink until both
 *                      fields carry something" — which is the chapter's own
 *                      arming, stated by the consequence line beside it.
 *  6. loading        — does not apply here; a tab in flight is 27.6's body
 *                      swap, owned by the route.
 *  7. empty          — cannot occur. A member always has at least the one
 *                      session they are reading this screen over.
 *  8. error          — does not apply. A refused save is the caller's to
 *                      report beside its own field.
 *  9. selected       — does not apply.
 * 10. read-only      — no handlers: the sessions still read at full strength
 *                      and no dead control is drawn (ch24.6).
 *
 * THREE BREAKPOINTS
 *  · below `sm` the password fields stack and each session row keeps its
 *    action reachable — "sessions become cards, Revoke stays reachable" is
 *    the chapter's narrow caption, and the row wraps rather than clipping.
 *  · `sm` up: the two password fields sit side by side at the artifact's
 *    720 cap; sessions are one row each with the action at the end.
 *
 * RTL — LTR only by client ruling. Every inset is logical.
 */
function SettingsSecurity({
  className,
  sessions = SECURITY_SESSIONS,
  labels,
  onPasswordSave,
  onRevoke,
  onSignOutEverywhere,
  disabled = false,
  ...props
}: SettingsSecurityProps) {
  const words: SettingsSecurityLabels = { ...SECURITY_LABELS, ...labels };
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");

  /* "Save stays disabled in quiet ink until both fields carry something." */
  const armed = current.length > 0 && next.length > 0;

  return (
    <div
      data-slot="settings-security"
      className={cn("flex w-full min-w-0 flex-col gap-[var(--space-4)]", className)}
      {...props}
    >
      {/* ---- The Password panel ------------------------------------------ */}
      <Card className="gap-[var(--space-4h)] p-[var(--space-6)]">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-[var(--space-3h)] gap-y-1">
          <Headline as="h3" size="h4">
            {words.passwordTitle}
          </Headline>
          <Hint as="span">{words.passwordNote}</Hint>
        </div>

        <div className="grid max-w-[45rem] grid-cols-1 gap-[var(--space-3h)] sm:grid-cols-2">
          <Field label={words.currentLabel} disabled={disabled}>
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.currentTarget.value)}
              />
            )}
          </Field>
          <Field label={words.newLabel} disabled={disabled}>
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="new-password"
                placeholder={words.newPlaceholder}
                value={next}
                onChange={(event) => setNext(event.currentTarget.value)}
              />
            )}
          </Field>
        </div>

        {/* Consequences BEFORE the button, next to the control — never a
            dialog after it. */}
        <div className="flex min-w-0 flex-wrap items-center gap-[var(--space-3h)]">
          <Hint as="span">{words.consequence}</Hint>
          <Button
            variant="secondary"
            className="ms-auto"
            disabled={disabled || !armed}
            onClick={
              onPasswordSave === undefined
                ? undefined
                : () => {
                    if (!armed) return;
                    onPasswordSave(current, next);
                  }
            }
          >
            {words.save}
          </Button>
        </div>
      </Card>

      {/* ---- Where you are signed in ------------------------------------- */}
      <Card className="gap-0 p-[var(--space-6)]">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-[var(--space-3h)] gap-y-1 pb-2">
          <Headline as="h3" size="h4">
            {words.sessionsTitle}
          </Headline>
          <Hint as="span">{words.sessionsNote}</Hint>
        </div>

        {sessions.map((session, index) => (
          <React.Fragment key={session.id}>
            {index === 0 ? null : <Separator />}
            <div className="flex min-w-0 flex-wrap items-center gap-[var(--space-3h)] py-[var(--space-3h)]">
              <div className="flex min-w-0 flex-col gap-1">
                <Text as="span" size="sm">
                  {session.device}
                </Text>
                <Hint as="span">{session.meta}</Hint>
              </div>
              {session.current ? (
                /* The current one is MARKED, never hidden: a neutral pill
                   with a forest dot. A member should be able to spot the
                   session they do not recognise. */
                <Badge variant="outline" className="ms-auto gap-[var(--space-1h)]">
                  <span
                    aria-hidden="true"
                    className="size-[var(--dot-status)] shrink-0 rounded-pill bg-success"
                  />
                  {words.thisDevice}
                </Badge>
              ) : onRevoke === undefined ? null : (
                /* Poppy TEXT, logged — never a filled red button in a list.
                   Override 19's variant, override 43's ink. */
                <Button
                  variant="text"
                  size="sm"
                  className="ms-auto text-destructive-ink"
                  disabled={disabled}
                  onClick={() => onRevoke(session)}
                >
                  {words.revoke}
                </Button>
              )}
            </div>
          </React.Fragment>
        ))}

        <div className="flex min-w-0 flex-wrap items-center gap-[var(--space-3h)] pt-3">
          <Hint as="span">{words.revokeNote}</Hint>
          {onSignOutEverywhere === undefined ? null : (
            /* Sign out everywhere sits last, alone. */
            <Button
              variant="text"
              size="sm"
              className="ms-auto text-destructive-ink"
              disabled={disabled}
              onClick={onSignOutEverywhere}
            >
              {words.signOutEverywhere}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

SettingsSecurity.displayName = "SettingsSecurity";

export { SettingsRoute, SettingsSecurity };
