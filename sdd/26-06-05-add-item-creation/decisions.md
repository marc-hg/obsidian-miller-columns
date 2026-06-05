# Decisions Log: Add Item Creation

## Trigger keys: Enter/Shift+Enter vs n/N vs button

**Decision:** `Enter` triggers sibling insertion; `Shift+Enter` triggers child insertion. Both
are scoped to the hover-activated document listener. A validation gate verifies Obsidian does
not intercept these keys in reading view before the implementation is accepted. Fallback keys
`n` (sibling) and `N` (child) replace them if validation fails.

**Alternatives considered:**

- `n`/`N` exclusively (vim-style), no Enter
- A `+` button rendered in each column header

**Why alternatives were discarded:** `n`/`N` require mode-awareness and feel unfamiliar to
non-vim users. A button adds persistent visual noise to the column UI and does not serve the
keyboard-centric workflow. `Enter` is the natural "create item" key in list editors (Notion,
Bear, Apple Notes). The validation gate handles the Obsidian interception risk without
permanently committing to the fallback.

## Input lifecycle ownership: ItemCreator module vs renderer vs main.ts

**Decision:** A dedicated `view/item-creator.ts` module owns the inline input element lifecycle.
The renderer delegates to it; main.ts handles file write via `onInsert` callback.

**Alternatives considered:**

- All input logic inline in `renderer.ts` (no new file)
- main.ts manages the input element (controller-owned)

**Why alternatives were discarded:** Renderer-inline approach was the initial recommendation
but user preferred the dedicated module for separation of concerns and testability. Controller-
owned approach leaks renderer layout knowledge (column position, insert index) upward into
main.ts, which has no visibility into DOM structure.

## Sibling insertion point: after own line vs after last descendant

**Decision:** Sibling insertion targets the line immediately after the focused item's last
descendant (end of its subtree), not after the focused item's own line.

**Alternatives considered:**

- Insert immediately after the focused item's own line (before any children)

**Why alternatives were discarded:** Inserting after the item's own line would place the new
sibling inside the focused item's children in the rendered output, which is visually wrong and
structurally incorrect for the markdown indentation model.

## Child insertion on leaf nodes: allowed vs no-op

**Decision:** `Shift+Enter` on a leaf node (no existing children) creates the first child,
opening a new column to the right. This is the primary mechanism for adding new nesting levels.

**Alternatives considered:**

- No-op on leaf nodes — only nodes with existing children can receive new children

**Why alternatives were discarded:** Blocking child creation on leaves defeats the stated goal
of "adding new nesting levels." There is no structural reason a leaf cannot become a parent.

## Empty input confirmation: discard vs write empty item

**Decision:** Confirming with empty text discards the operation silently (same as `Escape`).
No line is written to the file.

**Alternatives considered:**

- Write `- [ ] ` (empty item) to the file

**Why alternatives were discarded:** Empty items are noise in any list format. Silent discard
is the universal convention in outline editors.

## New item checkbox state: always unchecked vs match focused item

**Decision:** New items are always written as `- [ ] <text>` (unchecked checkbox), regardless
of the focused item's state or type.

**Alternatives considered:**

- Match the focused item's list marker type (checkbox vs plain list element)

**Why alternatives were discarded:** Matching item type is a useful feature but adds
indentation-scanning complexity outside this spec's scope. Deferred to a future spec.

## Indent detection: copy sibling prefix vs fixed indent vs infer convention

**Decision:** The indent string for a new item is copied from the raw line prefix of the
adjacent sibling. For a sibling insert, this is the focused item's own line prefix. For a child
insert on a leaf, the focused item's prefix is extended by one additional indent unit detected
from the nearest indented sibling elsewhere in the file; if none exists, two spaces are used.

**Alternatives considered:**

- Always use 2-space indent
- Scan the file to detect tab vs spaces and width

**Why alternatives were discarded:** Fixed indent ignores the file's existing style. Full
convention detection adds complexity disproportionate to the benefit.
