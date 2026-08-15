# TODO

Priority work for the next slice of the plugin. Keep this list short and actionable.

## 1. Edit + delete in place

Close the task loop without leaving Miller columns.

- [ ] Edit focused item label in place (e.g. `i` or click-to-edit) and write the change back to that markdown line
- [ ] Delete focused item (and decide: leaf only vs subtree) via keyboard and/or UI
- [ ] Prefer small editor mutations over full-file `setValue` where possible so undo stays sane

## 2. Breadcrumb + active panel chrome

Orientation and “why are my keys working?” affordances.

- [ ] Path breadcrumb above the columns (e.g. `Project › Design › Wireframes`)
- [ ] Breadcrumb segments clickable to jump up the active path

## 3. Settings + dim/hide completed

Light personalization without new interaction paradigms.

- [ ] Settings tab with a small, intentional option set
- [ ] Default expand depth
- [ ] Toggle vim `hjkl` (keep arrows always available, or document both)
- [ ] Dim and/or hide completed items (view filter first; no forced file rewrite)
- [ ] Optional: custom trigger tag (default `#miller-view`), show/hide chevrons

## 4. Render inline markdown in labels

`**bold**` is painted as `<strong>`. Other inline markdown is still raw.

- [x] Render `**bold**` in item labels instead of showing raw `**` syntax
- [ ] Keep other inline markdown as follow-up if cheap (italics, `` `code` ``) — don't block on a full markdown renderer

---

Longer list of optional ideas: see [MAYBE.md](./MAYBE.md).
