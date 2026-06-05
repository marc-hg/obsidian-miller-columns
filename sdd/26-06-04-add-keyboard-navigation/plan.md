---
status: validated
---

# Implementation Plan: Add Keyboard Navigation

## Overview

Replace the renderer's prototype activation model (tabindex + container listener) with hover-based
`document`-level keydown capture, and add `Space` toggle — completing keyboard navigation per spec.

## Architectural Invariants

- All keyboard handling lives in the `renderMillerUI` closure in `view/renderer.ts` — no new files.
- Activation: `mouseenter` on container attaches a named `keyHandler` to `document`; `mouseleave`
  removes it. Named reference is required so `removeEventListener` matches the exact function.
- Existing helpers (`navigateVertical`, `navigateDescend`, `navigateAscend`,
  `getSiblingsAtCursorDepth`) are reused unchanged.
- `activePath: MillerNode[]` is captured by the `keyHandler` closure. Mutations to the variable
  are reflected on the next keydown without re-attaching the listener.
- Init guard: at the top of `keyHandler`, if `activePath.length === 0` and `rootNodes.length > 0`,
  set `activePath = [rootNodes[0]]`. This runs before any direction logic on every keydown.
- `preventDefault()` + `stopPropagation()` are called on every intercepted key event
  (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Space`).
- No `tabindex`, no `container.focus()` — hover replaces focus as the activation mechanism.
- `h`/`j`/`k`/`l` keys are not wired in the new handler — see `decisions.md`.

## Setup

### Preconditions

- [x] Existing test suite passes before any changes are made.
  - Verification: `npm test` exits 0.
  - Resolution: fix pre-existing failures out-of-band before starting Phase 1.

### Groundwork

None. All changes are behavioral and belong to Phase ownership.

## Phase 1: Hover-Scoped Arrow Navigation

Replace the container-level keydown listener and tabindex approach with a hover-activated
`document`-level listener. Wire all four arrow keys through the existing navigation helpers.

**Acceptance test (outer loop):** `hover-gates-arrow-navigation` — given a rendered panel,
arrow keys dispatched to `document` navigate selection only while the cursor hovers the panel;
dispatching before `mouseenter` or after `mouseleave` has no effect.

### Phase 1 Tasks

1. [x] Remove prototype activation; wire hover gate

   - Boundary: `renderer.ts: renderMillerUI(container, rootNodes, savedActivePath, onToggle, onPathChange)` — observable via absence of `.is-active` changes on `document` keydown before `mouseenter`.
   - Subtasks:
     - [x] Remove `container.setAttribute('tabindex', '0')`, `container.focus()`, and the
       existing `container.addEventListener('keydown', ...)` block.
     - [x] Define a named `keyHandler = (e: KeyboardEvent) => void` stub (empty body) inside
       the closure, after `render` is defined.
     - [x] Add `container.addEventListener('mouseenter', () => document.addEventListener('keydown', keyHandler))`.
     - [x] Add `container.addEventListener('mouseleave', () => document.removeEventListener('keydown', keyHandler))`.
   - Acceptance:
     1. [tracer] Given: `renderMillerUI` called with 2 root nodes, no `mouseenter` fired.
        When: `ArrowDown` dispatched to `document`. Then: no `.miller-item` has `is-active`.
     2. Given: `mouseenter` then `mouseleave` fired on container. When: `ArrowDown` dispatched
        to `document`. Then: no `.miller-item` has `is-active` (listener was removed).

2. [x] Wire `↑`/`↓` to within-column navigation; implement init guard

   - Boundary: `renderer.ts: renderMillerUI(...)` — observable via `.is-active` on `.miller-item` elements after `document` keydown while hovered.
   - The init guard (`if activePath.length === 0: activePath = [rootNodes[0]]`) is introduced here
     as the first line of `keyHandler` before direction logic.
   - Acceptance:
     1. [tracer] Given: hovered, 2 root nodes `A` (line 1) and `B` (line 2), `A` already
        selected via non-empty `savedActivePath`. When: `ArrowDown` dispatched. Then: `B` has
        `is-active`; `A` does not.
     2. Given: hovered, empty `savedActivePath`, 2 root nodes `A` and `B`. When: `ArrowDown`.
        Then: `B` (index 1) has `is-active` — guard initializes to `A` (index 0), then
        `ArrowDown` moves to `B`.
     3. Given: hovered, `B` selected (last item in column). When: `ArrowDown`. Then: `B` still
        has `is-active` (clamp at bottom).
     4. Given: hovered, `A` selected (index 0). When: `ArrowUp`. Then: `A` still has `is-active`
        (clamp at top).
     5. Given: hovered, `B` selected. When: `ArrowUp`. Then: `A` has `is-active`.

3. [x] Wire `→`/`←` to column-depth navigation

   - Boundary: `renderer.ts: renderMillerUI(...)` — observable via `.miller-column` count and `.is-active` class.
   - Acceptance:
     1. [tracer] Given: hovered, root item `Parent` (with child `Child`) selected via
        `savedActivePath`. When: `ArrowRight` dispatched. Then: 2 columns visible and `Child`
        has `is-active`.
     2. Given: hovered, leaf item selected (no children). When: `ArrowRight`. Then: column count
        unchanged.
     3. Given: hovered, at root depth (1 column). When: `ArrowLeft`. Then: column count
        unchanged, no crash.
     4. Given: hovered, selection 2 levels deep (root → child via `savedActivePath`).
        When: `ArrowLeft`. Then: column count decreases by 1; parent item has `is-active`.
     5. Given: hovered, empty `savedActivePath`, 1 root node with 1 child. When: `ArrowRight`.
        Then: 2 columns visible — guard selects root[0], `ArrowRight` descends into its child.
     6. Given: hovered, empty `savedActivePath`. When: `ArrowLeft`. Then: init guard selects
        root[0]; ArrowLeft at root depth is a no-op; root[0] has `is-active`, column count
        unchanged.

4. [x] Retire stale prototype keyboard tests

   - Boundary: `src/__tests__/renderer.test.ts` — delete the entire `describe('keyboard navigation (prototype)')` block (tests for `h`/`j`/`k`/`l` dispatched to `container`).
   - Decision: h/j/k/l key support removed — see `decisions.md`.
   - Acceptance:
     1. [tracer] `npm test` exits 0 after deleting the prototype describe block and confirming
        all Tasks 1–3 scenario tests are GREEN.
     2. No test in `renderer.test.ts` dispatches a `KeyboardEvent` to `container` (all keyboard
        tests dispatch to `document` after `mouseenter`).

## Phase 2: Space Toggle and Event Discipline

Add `Space` as a toggle key, verify `preventDefault` suppresses browser defaults on all
intercepted keys, and ensure `onPathChange` is called on every navigation that mutates `activePath`.

**Acceptance test (outer loop):** `space-toggles-focused-item` — given a hovered panel with a
selected item, `Space` dispatched to `document` calls `onToggle` with that node and
`event.defaultPrevented` is `true`.

### Phase 2 Tasks

1. [ ] Implement `Space` toggle

   - Boundary: `renderer.ts: renderMillerUI(...)` — observable via `onToggle` spy and `event.defaultPrevented`.
   - Acceptance:
     1. [tracer] Given: hovered, node `A` selected (has `is-active`). When: `Space` dispatched
        to `document` (`cancelable: true`). Then: `onToggle` called once with node `A`;
        `event.defaultPrevented` is `true`.
     2. Given: hovered, empty `activePath`, 1 root node. When: `Space` dispatched. Then: init
        guard fires (root[0] selected), then `onToggle` called with root[0].
     3. Given: not hovered. When: `Space` dispatched. Then: `onToggle` not called.

2. [ ] Verify `preventDefault` on all five intercepted keys

   - Boundary: `renderer.ts: renderMillerUI(...)` — observable via `event.defaultPrevented` on cancelable `KeyboardEvent` dispatched to `document` while hovered.
   - Acceptance:
     1. [tracer] Given: hovered. When: `ArrowDown` dispatched (`cancelable: true`). Then:
        `event.defaultPrevented` is `true`.
     2. Given: hovered. When: `ArrowUp` dispatched. Then: `event.defaultPrevented` is `true`.
     3. Given: hovered. When: `ArrowRight` dispatched. Then: `event.defaultPrevented` is `true`.
     4. Given: hovered. When: `ArrowLeft` dispatched. Then: `event.defaultPrevented` is `true`.

3. [ ] Verify `onPathChange` fires on every navigation mutation

   - Boundary: `renderer.ts: renderMillerUI(...)` — observable via `onPathChange` spy.
   - Acceptance:
     1. [tracer] Given: hovered, node `A` (line 1) selected. When: `ArrowDown` moves selection
        to `B` (line 2). Then: `onPathChange` called with `[2]`.
     2. Given: hovered, `Parent` (line 1) selected. When: `ArrowRight` descends to `Child`
        (line 2). Then: `onPathChange` called with `[1, 2]`.
     3. Given: hovered, selection at depth 1 (Parent → Child via `savedActivePath`).
        When: `ArrowLeft` ascends. Then: `onPathChange` called with `[Parent.originalLine]`.
     4. Given: hovered, leaf item selected. When: `ArrowRight` (no-op). Then: `onPathChange`
        not called.
     5. Given: hovered, root item selected (depth 0). When: `ArrowLeft` (no-op). Then:
        `onPathChange` not called.
