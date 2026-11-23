# Clear buttons for Your Echo and Upgrade Strategies

Status: ready-for-agent

## Problem Statement

A player who wants to start over has to remove an Echo's Substats one at a time with the cross on each slot. To start an
Upgrade Strategy over, they have to remove every Upgrade Rule at every Tune Stage, or load an example and then remove
what it added. In compare mode they have to do that for Strategy A or Strategy B separately. Evaluating several Echoes
in a row, or trying a new strategy from nothing, takes many clicks.

## Solution

Your Echo gets a **Clear** button that removes every Substat from the Echo at once. Each Upgrade Strategy gets a
**Clear all rules** button that removes every Rule Group from all five Tune Stages: the one strategy in the single view,
and each of Strategy A and Strategy B in compare mode. Clearing a strategy first asks for confirmation. Clearing the
Echo does not, because its five Substats are quick to enter again. Both buttons are disabled when there is nothing to
clear.

## User Stories

1. As a player, I want a Clear button on Your Echo, so that I can start evaluating a new Echo without removing each Substat one by one.
2. As a player, I want Clear to take the Echo back to Tune Stage 0/5 (+0), so that the Echo is in the same state as a fresh start.
3. As a player, I want clearing the Echo to keep my Substat Weight Table, Target Score and ER Target Score, so that I can evaluate the next Echo against the same targets.
4. As a player, I want the Echo to clear straight away with no question, so that starting over takes one click.
5. As a player, I want Clear on Your Echo to be disabled when the Echo has no Substats, so that I can see there is nothing to clear and the layout doesn't jump.
6. As a player with a Substat picker open, I want Clear to close the picker as it clears the Echo, so that no half-made pick is left behind.
7. As a player with a picker open on an Echo with no Substats, I want Clear to stay disabled, so that the picker's own Cancel is the way out.
8. As a keyboard user, I want focus to move to "Add the Substat revealed at +5" after clearing the Echo, so that I can start entering the next Echo at once.
9. As a screen-reader user, I want the Echo's Clear button to be named "Clear Your Echo", so that I know what it clears.
10. As a player on a narrow screen, I want "Your Echo" and Clear to share the first row, with "Tune Stage n/5 (+n)" moving to its own row below when space runs out, so that nothing is cut off.
11. As a player, I want a Clear all rules button on my Upgrade Strategy, so that I can build a strategy from nothing without removing each rule.
12. As a player, I want Clear all rules to remove every Rule Group at all five Tune Stages, so that the strategy lets every Echo through and shows a 100% Success Rate.
13. As a player, I want clearing a strategy to keep the Substat Weight Table, so that I can rebuild it against the same table.
14. As a player, I want to be asked "Clear all rules from your strategy? This can't be undone." before a strategy is cleared, so that rules I worked on aren't lost by a misclick.
15. As a player, I want the confirmation's Clear button to be filled red and to sit beside Cancel, so that the destructive choice is clear.
16. As a player, I want Cancel to leave the strategy exactly as it was, so that I can back out safely.
17. As a player, I want Clear all rules to be disabled when the strategy has no rules, so that I can't clear an empty strategy.
18. As a player with no Substat Weight Table picked, I want Clear all rules to be disabled in the single view, as the example picker is, so that the controls agree.
19. As a player in the single view, I want Clear all rules at the top right of the strategy panel, above Tune Stage 1/5, so that it sits with the rules it clears.
20. As a player comparing strategies, I want each of Strategy A and Strategy B to have its own Clear all rules button before its Edit/Done button, so that I can clear one without touching the other.
21. As a player comparing strategies, I want the confirmation to name the strategy: "Clear all rules from Strategy A? This can't be undone.", so that I know which one I'm clearing.
22. As a player comparing strategies, I want Clear all rules to work while a strategy shows its Done summary, without switching it to Edit, so that the panel stays as I left it.
23. As a player comparing strategies, I want the Done summary and the "B compared with A" block to update to the cleared strategy, so that the comparison stays correct.
24. As a keyboard user, I want focus to move to Tune Stage 1/5's "+ add a rule" after clearing a strategy shown in Edit, so that I can start the new strategy at once.
25. As a keyboard user, I want focus to move to the strategy's Edit button after clearing a strategy shown in Done, so that I can open it for editing next.
26. As a keyboard user, I want Cancel in the confirmation to return focus to Clear all rules, so that I'm back where I started.
27. As a screen-reader user, I want the strategy buttons to be named "Clear all rules from your strategy", "Clear all rules from Strategy A" and "Clear all rules from Strategy B", so that I can tell them apart.
28. As a player on a phone comparing strategies, I want Clear all rules and Edit/Done to wrap together onto a second row, aligned right, when the heading row is too narrow, so that the strategy's name stays readable.
29. As a player, I want the Clear buttons to look like the weight settings' Delete button (a normal button whose border and text turn red on hover and keyboard focus), so that they read as destructive and match the app.
30. As a player, I want a cleared Echo or strategy to stay cleared after a reload, so that the app opens as I left it.
31. As a player with the app open in several tabs, I want a clear to reach the other tabs the way my other edits do, so that the tabs agree.

## Implementation Decisions

- **Your Echo** gets a Clear button in its heading row. It calls the component's existing change callback with no Substats, so the Echo Evaluation tab needs no new interface. Clearing closes any open picker and sets the next focus target to the +5 Add button, using the component's existing focus-after-action mechanism.
- The Your Echo heading is restructured so that "Your Echo" and Clear share one row and the Tune Stage text can wrap onto its own row below. This is done with wrapping, not a fixed breakpoint.
- **Strategy clearing** sets the strategy's draft to the empty strategy (five Tune Stages with no Rule Groups), the same value compare mode starts Strategy B with. It goes through the strategy's existing draft setter, so recalculating, saving and sharing with other tabs work as for any edit.
- A new **Clear all rules** control is shared by the single view and both compare panels. It owns its confirmation dialog, built on the existing confirmation dialog the example picker uses, with Clear styled as the filled red action like the Delete confirmation in the weight settings. It takes the strategy's draft (to know whether it has rules), the strategy's name or none for the single view (for the wording and accessible name), whether it is disabled, and a callback for clearing.
- "Has rules" means the same as in the example picker: any Tune Stage has at least one Rule Group. The two places should share that test instead of each defining their own.
- Single view: the stage editor's panel gets a top row holding only Clear all rules, aligned right. It is disabled with no Weight Table and with no rules.
- Compare view: each strategy panel's heading holds Clear all rules before Edit/Done. The two buttons are grouped so they wrap together, aligned right. Clearing doesn't change the panel's Edit/Done state. An empty strategy has no unfinished rule, so a strategy in Done stays in Done.
- Focus after a confirmed clear: in Edit, Tune Stage 1/5's "+ add a rule" button; in Done, that panel's Edit button. After Cancel: back to Clear all rules.
- Button style: the existing danger look (red border and text on hover and focus), shared by the Clear buttons rather than copied.
- No glossary change: "Clear" is something you do in the UI, not a domain term. No ADR.

## Testing Decisions

- Tests check only what the player sees and does: rendered roles, names, text and focus, driven with user-event. They don't check component internals or state shape.
- **Echo Evaluation tab** (the existing "Your Echo" tests, rendering the whole tab with the in-process calculator): Clear is disabled with no Substats; it clears every Substat back to Tune Stage 0/5; it closes an open picker; focus lands on the +5 Add button; the chosen Weight Table and the target boxes keep their values.
- **Upgrade Strategy tab** (the existing whole-App tests on `#strategy`), in single and compare views:
  - Clear all rules is disabled with no rules, and with no Weight Table in the single view.
  - The dialog's wording names "your strategy", "Strategy A" or "Strategy B".
  - Cancel changes nothing and returns focus.
  - Confirming clears all five Tune Stages and shows a 100% Success Rate.
  - Clearing in Done stays in Done and updates the summary.
  - Clearing one compare strategy leaves the other alone.
  - The three focus targets.
  - Prior art: the "example strategies" tests, which already cover the Replace/Cancel confirmation.
- **Remembering** (the existing remember tests for each tab): a cleared Echo or strategy is still empty after reopening.
- Narrow-screen wrapping and the red hover look aren't tested in jsdom. The spec review checks them with screenshots. There is no design prototype for this feature, so the UI review's prototype comparison is skipped.

## Out of Scope

- Undoing a clear.
- Clearing one Tune Stage, or one Rule Group, at a time.
- Resetting the Substat Weight Table, Target Score or ER Target Score.
- Clearing both compare strategies at once, or stopping compare mode as part of a clear.
- A Playwright test for the phone layout.

## Further Notes

- Clearing an Echo never asks, while clearing a strategy always asks when it has rules. That follows the existing rule that loading an example over a strategy with rules asks first, and an empty strategy is replaced without asking.
