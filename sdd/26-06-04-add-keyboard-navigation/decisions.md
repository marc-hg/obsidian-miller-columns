# Decisions Log: Add Keyboard Navigation

## Activation scope: hover-based vs global vs click-to-focus

**Decision:** Arrow keys are captured only while the cursor hovers over the miller panel
(`mouseenter` attaches, `mouseleave` detaches a `document`-level `keydown` listener).

**Alternatives considered:**

- Always-on (global `document` listener, no hover guard)
- Click-to-focus (user must click the panel; focus/blur events gate the listener)

**Why alternatives were discarded:** Always-on intercepts arrow keys globally — Obsidian page
scrolling breaks whenever any miller view exists on the page. Click-to-focus requires an extra
deliberate action and a visible focus ring; it does not feel "always-on" as the user requested.
Hover-based delivers the always-on feel with zero scroll interference.

## Toggle key: Space only, not Enter

**Decision:** `Space` toggles the focused item's checkbox. `Enter` is not bound.

**Alternatives considered:**

- Both `Space` and `Enter` trigger toggle
- `Enter` only

**Why alternatives were discarded:** User explicitly excluded `Enter` after initially requesting
both. `Enter` in Obsidian reading view may trigger other behaviours (link navigation, code
execution); binding it adds risk with no requested value.

## Keyboard handling location: renderer vs controller vs dedicated module

**Decision:** Keyboard event handling lives inside `Renderer` (`view/renderer.ts`).

**Alternatives considered:**

- Controller-owned: `main.ts` manages hover and keydown, drives renderer via new getter/setter API
- Dedicated `view/keyboard.ts` module wrapping the renderer

**Why alternatives were discarded:** The renderer already owns `activePath[]` and all click
handling. Moving key handling to `main.ts` would leak renderer-internal state upward and require
the controller to understand column structure. A dedicated module adds indirection with no reuse
value at this scope (YAGNI).

## h/j/k/l key support: removed for now

**Decision:** `h`, `j`, `k`, `l` keys are not wired in the new `document`-level `keyHandler`.
Their existing tests in `describe('keyboard navigation (prototype)')` are deleted.

**Alternatives considered:**

- Preserve h/j/k/l by adding them to the new document listener alongside arrow keys

**Why alternatives were discarded:** User chose clean break — arrow keys only for this spec.
h/j/k/l support deferred to a future spec.

## Visual focus indicator: reuse existing highlight

**Decision:** Keyboard focus uses the same active-item CSS highlight applied on mouse click. No
new CSS class or style is introduced.

**Alternatives considered:**

- Distinct keyboard-focus style (e.g., outline or different background)

**Why alternatives were discarded:** User confirmed the existing highlight is sufficient. Adding a
distinct style would require new CSS and diverge the visual model for no functional gain.
