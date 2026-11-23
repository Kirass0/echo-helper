# UI review

The spec review of any change to what the app shows checks it against the feature's design prototype, not only against
the text of the spec. Look for one in the ticket, in the spec, and in `.scratch/<feature-slug>/prototypes/`. If none of
them has one, skip the steps below and report one line: "No design prototype for this screen: skipped."

1. Take screenshots of the app and the prototype in matching states with Playwright: same screen, same data, same
   width, both themes. Save them as `<state>-<theme>-app.png` and `<state>-<theme>-prototype.png` pairs in the
   scratchpad, not the repo.
2. Read both PNGs of every pair.
3. Report every visible difference between the app and the prototype as a finding: layout, spacing, sizes, colours,
   type, wording, what is shown or missing. Leave one out only if the spec states the app should differ there; name
   that part of the spec. If there are none, report one line: "Compared N pairs: no differences found."

A prototype state the app has no screen for yet needs no finding.
