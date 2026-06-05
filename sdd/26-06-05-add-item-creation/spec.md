---
status: draft
---

# Spec: Add Item Creation

## Problem Statement

The miller columns view is read-only. Users can navigate the column hierarchy and toggle
checkboxes but cannot add new items without leaving the view to edit the raw markdown file
directly. This breaks the keyboard-centric workflow established by the navigation spec and forces
a context switch for a common authoring operation.

## Goals

- `Enter` while hovering the miller panel inserts a new sibling item after the focused item's
  last descendant. The new item appears inline at the insertion position within the column.
- `Shift+Enter` inserts a new child item as the first child of the focused item. Works on leaf
  nodes, creating a new nesting level.
- `Enter` with no item selected appends a new root-level item at the end of the root list.
- `Shift+Enter` with no item selected is a no-op.
- An inline text field appears at the insertion position immediately upon triggering; keyboard
  focus lands on the field.
- Confirming with non-empty text writes `- [ ] <text>` to the file at the computed line; the
  new item becomes the active selection.
- Confirming with empty text or pressing `Escape` discards the operation with no file write.
- Indentation of the new line is copied from the adjacent sibling's raw line prefix.
- Item creation is scoped to the hovered miller panel — same hover activation as arrow key
  navigation.

## Non-Goals

- Matching the inserted item's type (checkbox vs. plain list marker) to the focused item's type
  — new items are always `- [ ] <text>`. Deferred to a future spec.
- Editing existing item text in-place.
- Deleting items from the view.
- `Enter`/`Shift+Enter` as navigation or toggle keys — those roles are explicitly excluded from
  the keyboard navigation spec.

## Scope

- **`view/item-creator.ts`** (new) — owns the inline input lifecycle: creates the `<input>`
  element at the correct column position, handles confirm and cancel, fires `onInsert` callback.
- **`view/renderer.ts`** — intercepts `Enter`/`Shift+Enter` in the existing hover-scoped
  `keyHandler`; delegates to `ItemCreator`. Gains `onInsert` as a new parameter of
  `renderMillerUI`.
- **`model/mutator.ts`** — gains a new export `insertItem(fileText, afterLine, indent, text):
  string` that inserts one line into the file text.
- **`main.ts`** — wires `onInsert`: computes `afterLine` and `indent` from the `MillerNode`
  tree, calls `insertItem`, writes back to the editor.
- **`src/__tests__/item-creator.test.ts`** (new) — unit tests for `ItemCreator`.
- **`src/__tests__/mutator.test.ts`** — extended with `insertItem` test cases.

## Constraints

- `isDesktopOnly: false` — no Node/Electron APIs.
- The inline input must not conflict with Obsidian's own handling of `Enter`/`Shift+Enter` in
  reading view. `preventDefault` + `stopPropagation` are called on both keys when the miller
  panel is hovered.
- **Validation gate:** `Enter` interception must be verified against Obsidian's reading view
  before implementation is accepted. If Obsidian steals `Enter`, fallback keys (`n` for sibling,
  `N` for child) replace `Enter`/`Shift+Enter`. This gate applies to `Shift+Enter` as well.
- Indentation detection reads the raw file line; it assumes the file uses consistent indentation
  (spaces or tabs) per nesting level. Mixed indentation is out of scope.
- The inline input is dismissed and all state is restored if the container's `mouseleave` fires
  while the input is active (hover scope cleanup).

## Assumptions

- **Confirmed:** sibling insertion targets the line immediately after the focused item's last
  descendant (not after the item's own line).
- **Confirmed:** child insertion targets the line immediately after the focused item's own line,
  indented one level deeper than the focused item.
- **Confirmed:** `insertItem` in `mutator.ts` is a pure function — receives full file text and
  returns modified text; no side effects.
- **Confirmed:** `main.ts` is responsible for computing `afterLine` and `indent` from the
  `MillerNode` tree before calling `onInsert`.
- **Accepted risk:** Obsidian may intercept `Enter`/`Shift+Enter` before the hover-scoped
  listener fires. Validated at the implementation gate; fallback keys defined.
- **Accepted risk:** if `afterLine` computed by main.ts is stale (file changed between last
  parse and the user pressing `Enter`), the insertion may land at the wrong line. Accepted
  because the post-processor re-fires on every file save, keeping the tree fresh during normal
  use.

## Success Criteria

- Pressing `Enter` while hovering with an item selected shows an inline input field immediately
  after the focused item's subtree in the column; confirming with text writes the new item to
  the file and selects it.
- Pressing `Shift+Enter` with an item selected shows an inline input as the first child of the
  focused item; confirming writes the new child and selects it.
- Pressing `Enter` with no item selected shows an inline input appended at the end of the root
  column; confirming writes the new root item and selects it.
- Pressing `Shift+Enter` with no item selected has no visible effect.
- Confirming with empty text or pressing `Escape` removes the input field; no file write occurs;
  previously active item remains selected.
- New item indentation exactly matches the adjacent sibling's indentation in the raw file.
- `Enter`/`Shift+Enter` do not interfere with Obsidian's reading view when the cursor is outside
  the miller panel.
- Obsidian `Enter` interception is validated before implementation is accepted; fallback keys
  are used if validation fails.
- All behaviours above are covered by automated tests.

## Architecture

### ItemCreator (`view/item-creator.ts`)

Stateless factory — `createInlineInput(colEl, insertIndex, onConfirm, onCancel)`:

- Injects an `<input type="text">` at `insertIndex` within `colEl`.
- `keydown` on the input: `Enter` → calls `onConfirm(text)` if non-empty, else `onCancel()`;
  `Escape` → calls `onCancel()`.
- `onConfirm` and `onCancel` are provided by the renderer; the renderer removes the input and
  triggers file write or restoration accordingly.

### insertItem (`model/mutator.ts`)

```
insertItem(fileText: string, afterLine: number, indent: string, text: string): string
```

Splits `fileText` on `\n`, inserts `${indent}- [ ] ${text}` at index `afterLine + 1`, rejoins.

### Data flow

```
keyHandler (Enter/Shift+Enter)
  → compute insertType (sibling | child) from key + activePath
  → call ItemCreator.createInlineInput(colEl, insertIndex, onConfirm, onCancel)
  → user types text + confirms
  → renderer calls onInsert(text, afterLine, indent)
  → main.ts: fileText = insertItem(editor.getValue(), afterLine, indent, text)
  → editor.setValue(fileText)
  → Obsidian re-renders → post-processor fires → miller view updates
  → new item selected via savedActivePath
```

### afterLine computation (main.ts)

- **Sibling:** walk the focused node's subtree depth-first; `afterLine` = `originalLine` of the
  deepest last descendant.
- **Child:** `afterLine` = `originalLine` of the focused node itself.
- **No selection (root append):** `afterLine` = `originalLine` of the last root node's deepest
  last descendant (i.e., the last line of the entire list).
