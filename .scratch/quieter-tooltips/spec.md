# Quieter tooltips

Status: ready-for-agent

## Problem Statement

The app has many tooltips, and a mouse user sets them off by accident all the time. Moving the pointer across the page
passes over Terms (the dotted-underline words) and the tooltip opens the moment the pointer touches one, even though the
player never meant to stop there. Icon buttons add to the noise: the pencil, the sliders, every cross and the theme
toggle show their label as a tooltip, although their icons already say what they do.

## Solution

Icon buttons no longer show tooltips. The pencil ("Change the Substat at +N"), the sliders ("Weights of …"), every cross
("Remove …", "Remove this rule", "Close notice") and the sun/moon theme toggle keep their accessible label but show no
tooltip, on hover or on keyboard focus.

The remaining tooltips (Terms, and the chart legend's truncated Weight Table name) open on mouse hover only after the
pointer has rested on them for 500 ms. If the pointer leaves before then, nothing opens. Keyboard focus and tap still open
them at once. Closing stays as it is.

## User Stories

1. As a mouse user, I want a Term's tooltip to stay closed when my pointer merely passes over it, so that moving around
   the page doesn't flash text I didn't ask for.
2. As a mouse user, I want a Term's tooltip to open when I rest my pointer on the Term for half a second, so that I can
   still read the explanation when I want it.
3. As a mouse user, I want the wait to start over if my pointer leaves the Term and comes back, so that a brief pass
   never adds up to an open tooltip.
4. As a mouse user reading the Weight Table header, I want each Term to wait its full delay even right after I read
   another Term's tooltip, so that sweeping across the row doesn't open a string of tooltips.
5. As a mouse user, I want an open tooltip to stay open while my pointer moves from the Term onto the tooltip, so that I
   can keep reading it, as today.
6. As a mouse user, I want an open tooltip to close shortly after my pointer leaves both the Term and the tooltip, as
   today.
7. As a keyboard user, I want a Term's tooltip to open as soon as I Tab onto it, so that the delay doesn't slow me down
   when I clearly chose to go there.
8. As a keyboard user, I want Escape to still close a tooltip without moving focus.
9. As a touch user, I want a tap on a Term to open its tooltip at once, and a tap elsewhere to close it, as today.
10. As a mouse user, I want the chart legend's truncated Weight Table name to wait the same 500 ms before showing its
    full name, so that it behaves like every other tooltip.
11. As a touch or keyboard user, I want the chart legend's tooltip to open at once on tap or focus, as today.
12. As a player, I want the pencil on a Substat slot to show no tooltip, so that hovering it on the way to a slot doesn't
    open a popup.
13. As a player, I want the sliders on a Weight Table to show no tooltip.
14. As a player, I want the crosses that remove a Substat, a Weight Table or an Upgrade Rule, and the one that closes a
    notice, to show no tooltip.
15. As a player, I want the theme toggle to show no tooltip.
16. As a screen-reader user, I want every icon button to keep its accessible name ("Change the Substat at +5",
    "Remove Mornye", "Switch to dark theme", …), so that I still know what each one does.
17. As a keyboard user, I want Tabbing onto an icon button to show no tooltip, with the focus ring alone showing where I
    am.
18. As a player, I want the crosses to still turn red on hover, so that I can see they remove something.

## Implementation Decisions

- **Icon button.** It stops using the tooltip hook altogether. The label stays its accessible name. The component no
  longer needs to block the pointer, focus and `aria-describedby` props it used to reserve for the tooltip. Its doc
  comment and the label prop's comment no longer mention a tooltip.
- **Tooltip hook.** Mouse hover opens the tooltip only after a 500 ms delay, held in a named constant beside the existing
  hover grace constant. The pointer leaving the trigger before the delay ends cancels it. The pointer leaving after the
  tooltip is open keeps today's 120 ms grace before closing. Moving onto the tooltip itself works as today. That only
  matters once the tooltip is open, since a hidden tooltip can't be hovered.
- Focus (when focus-visible) and tap (where the trigger opts in) still open the tooltip immediately. Escape and a tap
  elsewhere still close it at once and cancel any pending hover delay.
- No warm-up mode: each trigger waits the full delay whatever was shown just before.
- Pending timers are cleared when the trigger unmounts.
- The hook's options do not change. The delay is the same for every trigger, so there's no option for it.
- Native `title` tooltips are left alone (truncated Weight Table names, the "where Echoes end" bar segments).

## Testing Decisions

- Tests check what the player sees: whether a tooltip with the expected text is in the document after a given
  interaction and time. They don't look at timers, reasons or internal state.
- **Term component tests** cover the hook's behaviour:
  - Hovering for less than 500 ms and then leaving opens nothing, even after waiting.
  - Hovering for 500 ms opens the tooltip.
  - After one Term's tooltip has closed, hovering a second Term still waits the full delay.
  - Keyboard focus and a tap open it immediately.
  - The existing hover test (stays open over the tooltip, closes on leave) and the "closes on Escape while hovered" test
    are updated to wait out the delay first.
  - Use fake timers or a real wait, whichever fits user-event best. The existing hover test already uses a real wait.
- **IconButton component tests**: the "shows its label as a tooltip on hover" and "on keyboard focus" tests become "shows
  no tooltip on hover" and "shows no tooltip on keyboard focus". The tests for the accessible label and for still acting
  on a click stay.
- **Tooltips e2e spec**: the "theme button shows its tooltip on focus" test is removed. The Term test (focus opens it at
  once, position and size, Escape keeps focus) stays as it is.
- The chart legend uses the same hook as the Terms and gets no tests of its own.

## Out of Scope

- Native `title` tooltips and their browser-controlled delay.
- A delay on keyboard focus or tap.
- A warm-up or skip-delay mode between neighbouring Terms.
- Changing tooltip text, styling or placement.
- Hover-intent detection based on pointer speed. A plain timer is enough.

## Further Notes

- The icon buttons were found by searching for every use of the icon button: the Header theme toggle, the Notices close
  button, the Weight Table list's sliders and cross, Your Echo's pencil and cross, the stage editor's "Remove this rule"
  cross, and the Upgrade Strategy's sliders. New icon buttons get no tooltip either, since the component no longer has
  one.
