# Miller Columns (Horizontal Tree) for Obsidian

An Obsidian plugin that transforms nested markdown lists into interactive, horizontal Miller Columns (Finder-style). 

## Features (MVP)
- **Automatic Interception**: Converts any list containing the `#miller-view` tag into a column view.
- **AST Parsing**: Custom stack-based parser to handle deeply nested markdown hierarchies.
- **Interactive Navigation**: Click to expand parent nodes and view subtasks in adjacent columns.
- **Two-Way Binding**: Synchronizes UI checkbox states directly with the underlying `.md` file.
- **Vim-Ready Architecture**: Built with a clean separation between Model and View to support future `HJKL` navigation.

## Architecture
The project follows a decoupled MVC-lite structure for high testability:
- `src/main.ts`: Entry point and Obsidian API lifecycle management.
- `src/model/`: Pure logic (Parser, Mutator, and Types). Zero dependencies on Obsidian/DOM.
- `src/view/`: UI rendering and DOM event handling.
- `src/__tests__/`: Unit test suite powered by Vitest.

## Development

### Commands
- `npm run dev`: Starts the build process in watch mode.
- `npm run build`: Generates the production `main.js` bundle.
- `npm run test`: Executes the unit test suite.

### Setup
1. Clone the repo into your vault's `.obsidian/plugins/` folder.
2. Run `npm install`.
3. Enable the plugin in Obsidian settings.
4. Add `#miller-view` to the top-level item of any markdown list.

## ⚖️ License
MIT License - Copyright (c) 2026 marc-hg
