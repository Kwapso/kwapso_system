# Conflicts to settle before building

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## Conflicts to settle before building

Five rules here cross something already written down. The first three need the owner's
ruling before they are implemented. The last two are settled, and the row says how.

| Rule | What it crosses | Proposed resolution |
|---|---|---|
| [G1](#g1-a-record-type-carries-a-glyph), [G2](#g2-the-mapping-if-option-1-is-taken) | UI-CONVENTIONS.md §5, "**No emoji.** Anywhere." | Amend §5 to "no emoji in copy" and add the type mark to §4, or fall back to the kit's own glyphs (`@shared/ui/foundations/icons`; "lucide" here until 7 Sep 2026, which R39 forbids). Law changes first, code second. |
| [C3](#c3-the-ambient-field-never-sits-behind-a-content-surface) | UI-CONVENTIONS.md §7, "Surfaces that float over it … use the frosted `.glass`" | **SETTLED 2026-08-19 IN THE LIBRARY, not by an override.** The premise here was wrong twice: the library's comment said the opposite, and the proposed `[data-slot="dialog-content"]` selector matches nothing — `data-slot` appears zero times in the installed registry. Every floating surface is opaque at v0.13.0 and a census enforces it; a card keeps `.glass` on purpose. |
| [F3](#f3-the-separator-becomes-the-action-bars-top-edge) | `shared/web/form-shell.tsx:43-53`, an 11-line comment defending `pt-6` as "the ONE value that governs it everywhere" | The comment documents the exact bug being fixed. Replace the value with a structure that cannot have the bug, and replace the comment with one sentence saying so. |
| [N5](#n5-the-surface-step-is-measured-not-assumed) | [C2](#c2-cards-have-no-border-no-shadow-and-no-hover-animation) and "Do not do" #5, both of which said a card has no border | **SETTLED 18 Aug 2026 by measurement, not by preference.** The light theme's page-to-card step is ΔL\* 3.22, below the threshold at which two flat surfaces read as separate; the dark theme's is 10.32. A borderless card is therefore invisible in light mode, which is exactly the difference the owner reported between the two themes. The card keeps its hairline; the no-shadow rule is untouched. Delete this row and restore C2 the day a theme change raises the light step past ΔL\* 8. |
| [C2](#c2-cards-have-no-border-no-shadow-and-no-hover-animation) — the hover clause | `Card`'s base class, which used to carry `hover-lift`, and `hover-lift-none`, which used to turn it off | **SETTLED 25 Aug 2026 BY THE DEFAULT MOVING, not by a preference changing.** C2's "no hover animation" was a rule about an inherited default: every card lifted, so the rule was to switch it off, and the opt-out was the mechanism. The kwapso kit ships a still card and an `interactive` prop, so the default is already what C2 wanted and the opt-out no longer exists. A card that lifts now does so because a call site asked, which is the case C2 never legislated. Delete this row if a future kit makes lift the default again. |
| [N10](#n10-the-control-follows-the-option-count) | `shared/web/language-section.tsx`, whose header comment argued AGAINST a dropdown at the time (it records the reversal now) | The comment's objection is about a dropdown showing a language CODE, and it is right about that. N10 answers it with a named exception rather than by overruling it: the trigger shows the flag and the language's own name for itself, and the menu is searchable. The portal already ships that control. |

One more, not a conflict but worth a decision: [T1](#t1-one-heading-scale-per-front-door)
moves 26 headings from `font-semibold` to `font-medium` because the brand ships no 600
weight. If the owner prefers the heavier look, the answer is a third font face in the
library, not a synthesised weight in the host.

---
