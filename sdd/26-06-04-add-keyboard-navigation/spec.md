---
status: validated
---

# Spec: Add Keyboard Navigation

## Problem Statement

The miller columns view is mouse-only. Users cannot navigate the column hierarchy or toggle
checkboxes without a pointer device, which slows keyboard-centric workflows and makes the plugin
inaccessible to users who rely on keyboard navigation.

## Goals

- `↑` / `↓` move the selection within the active column (up and down through sibling items).
- `→` enters a child column (moves focus to the first child of the selected item, if any).
- `←` exits to the parent column (moves focus back to the parent item one depth level up).
- `Space` toggles the checkbox on the currently focused item.
- Arrow key capture is scoped to the hovered miller panel; keys have no effect when the cursor is
  outside the panel.
- Each miller panel instance manages its hover state independently.
- If no item is selected when a key is pressed (`activePath` is empty), the first keydown
  initializes selection to index 0 of the root column before applying the key's navigation logic.

## Non-Goals

- `Enter` as a toggle key — Space only.
- A distinct visual style for keyboard focus — the existing active-item highlight is reused.
- Global (always-on, non-hover) key capture.
- Mouse-free initial activation (click-to-focus mode).
- Keyboard shortcuts beyond the five listed above (no `Home`, `End`, `Page Up/Down`, etc.).

## Scope

- **`view/renderer.ts`** — sole change site. Gains hover tracking (`mouseenter`/`mouseleave`) and a
  `document`-level `keydown` listener that is attached and detached with hover state. Arrow key
  logic reads and writes `activePath[]`; Space calls the existing `onToggle` callback.
- **`src/__tests__/renderer.test.ts`** — new test cases covering keyboard navigation paths.
- No changes to `main.ts`, `model/parser.ts`, or `model/mutator.ts`.

## Constraints

- Obsidian may dispatch its own `keydown` handlers on the reading-view container. `stopPropagation`
  must be called on intercepted key events to prevent double-handling.
- `isDesktopOnly: false` — no Node/Electron APIs.
- Hover-scoped capture must not break Obsidian page scrolling when the cursor is outside the panel.
- The listener must be removed when the post-processor element is removed from the DOM (cleanup
  handled by `mouseleave` and the existing post-processor lifetime scope).

## Assumptions

- **Confirmed:** hover state is sufficient to scope key capture; no explicit focus management
  (tabIndex, `focus()`) is required.
- **Confirmed:** reusing `activePath[]` mutation and the existing re-render path is sufficient — no
  new state is introduced.
- **Accepted risk:** Obsidian's internal keydown handlers may fire before or after the renderer's
  listener depending on propagation order; `stopPropagation` is assumed sufficient to isolate the
  two.

## Success Criteria

- Pressing `↑`/`↓` while hovering a miller panel moves the highlighted item within the active
  column; the page does not scroll.
- Pressing `→` on an item with children highlights the first child and opens its column; pressing
  `→` on a leaf item has no effect.
- Pressing `←` returns focus to the parent column's previously selected item; pressing `←` at root
  depth has no effect.
- Pressing `Space` toggles the focused item's checkbox and persists the change to the file (same
  behaviour as clicking the checkbox).
- Arrow keys outside the miller panel (cursor elsewhere) do not interfere with Obsidian scroll or
  other panels.
- Pressing any navigation key when no item is selected selects the first root item and applies the
  key's effect (e.g., `↓` selects root item 0, then moves to root item 1 if it exists).
- All behaviours above are covered by automated tests in `renderer.test.ts`.

## Architecture

Key event handling lives entirely inside the `Renderer` class:

```
mouseenter → isHovered = true  → attach document keydown listener
mouseleave → isHovered = false → detach document keydown listener

keydown (any)        → if activePath is empty: activePath = [0]         (init guard)
keydown (ArrowUp)    → activePath[activeDepth]-- (clamp ≥ 0)          → render()
keydown (ArrowDown)  → activePath[activeDepth]++ (clamp ≤ lastIndex)   → render()
keydown (ArrowRight) → if children exist: activeDepth++, push 0        → render()
keydown (ArrowLeft)  → if activeDepth > 0: pop activePath, activeDepth-- → render()
keydown (Space)      → onToggle(focusedNode.originalLine)               → (file write, re-render via main.ts)
```

`activeDepth` is derived from `activePath.length - 1`; no new field is required if `activePath`
already encodes depth implicitly. `preventDefault()` and `stopPropagation()` are called on all
five intercepted keys.
