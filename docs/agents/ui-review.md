# UI review

The spec review of any change to what the app shows checks it against the design prototype the ticket or spec names
for that screen, not only against the text of the spec. If neither names one, skip the steps below and report one
line: "No design prototype for this screen: skipped."

1. Get screenshots of the app and the prototype in matching states. `npm run compare:prototype` does this for the
   ticket 11 prototype (variant D of `.scratch/web-rewrite/prototypes/11-visual-direction/index.html`): it builds the
   app and saves `<state>-<theme>-app.png` and `<state>-<theme>-prototype.png` pairs, 1220px wide, plus an `index.md`
   listing them, to the folder it prints. For another prototype, take matching pairs yourself with Playwright.
2. Read both PNGs of every pair.
3. Report every visible difference between the app and the prototype as a finding: layout, spacing, sizes, colours,
   type, wording, what is shown or missing. Leave one out only if the spec states the app should differ there; name
   that part of the spec. If there are none, report one line: "Compared N pairs: no differences found."

Skipped pairs (no app screen yet) need no finding. If the change adds a screen or state the script can't set up, say
so: its `app` step belongs in `scripts/comparePrototype.ts`.
