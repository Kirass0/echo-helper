# Assemble the spec

Type: task
Status: resolved
Blocked by: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21
Map: [Echo Helper web rewrite](../map.md)

## Question

Gather every resolved ticket's answer, and the comments added after resolution that changed it, into `.scratch/web-rewrite/spec.md`, the map's destination. Wherever a later ticket overrides an earlier one, the spec states only the final behaviour. It uses `GLOSSARY.md` terms throughout and points to the ADRs (0001 stack, 0002 calculation method), the prototypes and the short-text draft rather than copying them. Choose an outline that suits slicing into implementation tickets (for example: Core and parity, data and catalogue, each tab, About and texts, persistence, visual and phone, accessibility, hosting and CI). Any contradiction or gap found while assembling is raised with the owner, not settled silently. Done when the spec leaves nothing to decide before slicing.

## Answer

Assembled on 2026-11-21: [spec.md](../spec.md). It follows the outline Core and parity, game data and catalogue, Custom tables, app shell, each tab, About, short texts, worker, persistence, visual, phone, accessibility, hosting, number formats, and the owner's tasks outside the build. It states final behaviour only and points to ADRs 0001/0002, the prototypes and ticket 17's Answer for wording (the draft is marked superseded).

Gaps and contradictions raised with the owner while assembling, all decided (spec §19, recorded as comments on tickets 05, 06, 07, 08, 17 and 20):

- **Labels:** the Top Percent boxes use the full terms (not "Top %").
- **Compare table:** pills show relative change, and the Success Rate row is dropped. Success Rate and Discard Rates appear in each strategy's compare summary.
- **Upgrade Strategy picker:** it matches Echo Evaluation's (New Custom Weight Table…, sliders). A newly saved Custom table goes where it was started from.
- **Examples:** picking an example over a strategy with rules asks for confirmation. The automatic "Crit first" loads only when nothing is stored.
- **Formats and input:** the number formats are fixed (spec §17), and invalid numbers show field errors.

Smaller defaults taken from the prototypes are listed in spec §19 for the owner to veto. They are: compacting slots on Substat removal, the new-rule defaults, the rule field controls, the zero-success text, unknown-hash handling and the UTC build date.
