# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode (esbuild, inline sourcemaps)
npm run build        # Type-check + minified production build
npm run lint         # ESLint (eslint-plugin-obsidianmd rules)
npm run test         # Vitest unit tests
npm run test:ui      # Vitest UI
npx vitest run src/__tests__/parser.test.ts   # Single test file
```

## Architecture

MVC-lite. Each layer has zero imports from other layers except via the controller.

```
main.ts (Controller)
  ↓ markdown string + startLine
model/parser.ts → MillerNode[]
  ↓ tree + onToggle callback
view/renderer.ts → DOM
  ↓ checkbox click → targetLine
model/mutator.ts → modified file text
  ↓ editor.setValue()
Obsidian re-renders → loop restarts
```

**`MillerNode`** (`model/types.ts`): id, text, isCompleted, `originalLine` (maps back to the raw file for mutation), children[].

**Parser** (`model/parser.ts`): regex-based O(n) stack parser. Matches `/^(\s*)-\s*\[([ xX])\]\s*(.*)/`, tracks indentation depth to build parent-child hierarchy. Strips `#miller-view` tag from display text.

**Mutator** (`model/mutator.ts`): pure function — receives full file text + line number, toggles `[ ]`/`[x]` at that line, returns modified string. No side effects; testable.

**Renderer** (`view/renderer.ts`): maintains `activePath[]` per depth level. Each click updates activePath and re-renders all columns. Uses Obsidian DOM API (`createDiv`, `createEl`, `onClickEvent`).

**main.ts**: `registerMarkdownPostProcessor` fires on any block containing `#miller-view`. Uses `getSectionInfo()` for line offsets, `MarkdownView.editor` for read/write.

## Obsidian integration points

- Trigger: markdown post-processor detects `#miller-view` tag in rendered HTML text content
- Line mapping: `context.getSectionInfo(element).lineStart` + parser's per-node `originalLine` offset
- Write-back: `editor.getDoc().getValue()` → mutate → `editor.setValue()`
- Cleanup: all DOM and listeners scoped to post-processor lifetime (no manual teardown needed)

## Releasing

```bash
npm version patch|minor|major   # bumps manifest.json + versions.json via version-bump.mjs
```

GitHub release tag must exactly match `manifest.json` version (no leading `v`). Attach `main.js`, `manifest.json`, `styles.css` as release assets.

## Notes

- `remark-parse`, `unified`, `unist-util-visit` are installed but unused — parser uses regex instead. Don't remove unless confirmed safe for bundle size.
- `styles.css` uses Obsidian CSS variables (`--background-primary`, `--interactive-accent`) for theme compatibility.
- `isDesktopOnly: false` — avoid Node/Electron-specific APIs.
