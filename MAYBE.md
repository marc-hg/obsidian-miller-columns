# MAYBE

Ideas worth keeping in mind but **not** current priority. Promote into [TODO.md](./TODO.md) only when intentionally scheduled.

## Interaction / keyboard

- More vim operators: `o` / `O` for sibling/child insert, `x` toggle, `gg` / `G` first/last sibling, `/` search in column
- Home / End / Page Up / Down within a long column
- Click chevron vs label behavior; double-click / mod-click to open `[[wikilinks]]` in labels

## Obsidian integration

- Commands: insert miller template, toggle `#miller-view` on current list, focus first miller section in note
- Live Preview QA matrix: undo, multi-list notes, embeds/callouts, cursor after mutations
- Render wikilinks / tags inside labels as native links
- Mobile / narrow layout: stack columns or show only active path; or document desktop-first

## Structure & reliability

- Drag-and-drop reorder (high cost: indent rewrite, multi-line moves)
- Persist extra per-section UI prefs (e.g. hide-completed, column scroll) — watch `lineStart` drift
- Parser dialect expansion: non-checkbox lists, `*` bullets, numbered lists, tabs
- Empty / error states: tag with no checkboxes → friendly message; fail soft to native list

## Product / packaging

- README catch-up (layers, hjkl, insert, chevrons; drop stale “future HJKL” / old folder map)
- Demo note + GIF for community listing
- Community plugin release checklist (`minAppVersion`, screenshots, versioning)

## Explicitly deprioritized

- Full kanban / due dates / priorities as a separate product surface
- Cloud sync / AI features
- Heavy UI frameworks or a full Vim mode emulator

---

When promoting an item, move it to TODO with a clear acceptance-oriented checklist, not a vague title alone.
