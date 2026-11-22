# UI review

The spec review of any change to what the app shows checks it against the design prototype (variant D of
`.scratch/web-rewrite/prototypes/11-visual-direction/index.html`), not only against the text of the spec.

1. Run `npm run compare:prototype`. It builds the app and saves `<state>-<theme>-app.png` and
   `<state>-<theme>-prototype.png` pairs, 1220px wide, plus an `index.md` listing them, to the folder it prints.
2. Read both PNGs of every pair in `index.md`.
3. Report every visible difference between the app and the prototype as a finding: layout, spacing, sizes, colours,
   type, wording, what is shown or missing. Leave one out only if the spec states the app should differ there; name
   that part of the spec.

Skipped pairs (no app screen yet) need no finding. If the change adds a screen or state the script can't set up, say
so: its `app` step belongs in `scripts/comparePrototype.ts`.
