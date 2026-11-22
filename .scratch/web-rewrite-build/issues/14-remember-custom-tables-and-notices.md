# 14: Remember Custom Weight Tables, and one-time notices

**Parent:** [Spec: Echo Helper web app](../../web-rewrite/spec.md) (§5 "Name taken by a new built-in", §6 "One-time notices", §12)

**What to build:** A player's Custom Substat Weight Tables survive reloads and stay in sync across open browser tabs. When a deploy adds a built-in with the same name as one of their tables, or a stored table can't be read, they get one short notice that explains what happened.

**Blocked by:** 12 (Remember Echo Evaluation), 13 (Custom Weight Tables)

**Status:** done

- [x] The Custom tables entry holds all saved tables (never drafts), uses the stored-entry mechanism and is written whenever a table is saved, renamed or deleted
- [x] Salvage: a table with a bad weight, an empty name or a name over 40 characters is dropped; a duplicate name is renamed by the "(custom 2)" rule
- [x] Name taken by a new built-in: on load the built-in keeps the name, the Custom table becomes "X (custom)" (then "X (custom 2)"), everything remembered under the old name follows it, and a one-time notice says so
- [x] Lost tables: a one-time notice "1 Custom Weight Table couldn't be read and was removed." / "N Custom Weight Tables … were removed." (wording per ticket 17)
- [x] Notices are a slim bar under the header, one line each, closed with ×; each shows once and never again, even if not closed
- [x] A Custom table deleted in another tab disappears silently here as a vanished table
- [x] Vitest covers salvage, the "(custom)" rename and notice show-once behaviour
