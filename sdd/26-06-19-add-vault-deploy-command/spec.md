---
status: draft
---

# Spec: Add vault deploy command

## Problem Statement

The plugin repository can build Obsidian release artifacts, but there is no explicit command that
installs those artifacts into the developer's Syncthing-backed Obsidian vault. Manually copying
`main.js`, `manifest.json`, and optional `styles.css` is repetitive and error-prone. A symlinked
plugin folder would work on the local Mac, but it would not reliably produce real plugin files on
other devices synced through Syncthing, so those devices might not be able to load the plugin.

## Goals

- Add an npm script named `deploy:vault`.
- Make `deploy:vault` run a fresh production build before deployment.
- Copy real release artifacts into
  `~/Syncthing/ObsidianVault/.obsidian/plugins/obsidian-miller-columns`.
- Fail loudly if the target plugin directory does not already exist.
- Preserve unrelated files in the target plugin directory, including Obsidian plugin data such as
  `data.json`.
- Keep `npm run build` as a pure production build command that does not deploy to the vault.

## Non-Goals

- Do not create a portable contributor workflow.
- Do not make the vault target configurable through environment variables, command arguments, or
  project settings.
- Do not use symlinks for the deployed plugin folder or artifacts.
- Do not modify Obsidian settings, reload Obsidian, or enable the plugin automatically.
- Do not clean, delete, or replace the entire target plugin directory.
- Do not change release versioning or GitHub release behavior.

## Scope

- `package.json` scripts.
- A small Node-based deploy helper script committed to the repository.
- Top-level release artifacts produced or maintained by this Obsidian plugin repo:
  - `main.js`
  - `manifest.json`
  - `styles.css` when present

## Constraints

- The repository is a one-person local development repo; hardcoding the developer's vault path is
  acceptable.
- The vault is synced to other devices through Syncthing, so deployed artifacts must be ordinary
  files in the vault, not symlinks pointing outside the vault.
- `deploy:vault` must not create
  `~/Syncthing/ObsidianVault/.obsidian/plugins/obsidian-miller-columns`; a missing directory means
  the plugin has not been intentionally installed in that vault.
- `main.js` and `manifest.json` are required deployment artifacts.
- `styles.css` is optional and should be copied only when it exists.
- The deploy helper should use Node APIs rather than shell-only behavior so path expansion,
  existence checks, and error messages are explicit.
- The command must run on the developer's current macOS-style environment.

## Assumptions

- The developer's home directory contains `Syncthing/ObsidianVault`.
- The target Obsidian plugin directory already exists before deployment.
- `npm run build` produces a current production `main.js` at the repository root.
- `manifest.json` is maintained at the repository root.
- Other synced devices can load the plugin when the Syncthing vault contains ordinary artifact files
  at `.obsidian/plugins/obsidian-miller-columns`.

## Success Criteria

- Running `npm run deploy:vault` runs the existing production build successfully before copying any
  artifacts.
- When the target plugin directory exists and required artifacts exist, `deploy:vault` copies
  `main.js` and `manifest.json` into the target plugin directory.
- When `styles.css` exists at the repository root, `deploy:vault` copies it into the target plugin
  directory; when it does not exist, deployment still succeeds.
- When the target plugin directory is missing, `deploy:vault` exits non-zero and does not create it.
- When `main.js` or `manifest.json` is missing after the build, `deploy:vault` exits non-zero.
- Files in the target plugin directory other than copied release artifacts remain untouched.
- `npm run build` continues to build only and does not copy files into the vault.

## Deployment Behavior

`deploy:vault` should be a package script that composes two operations:

1. Run the existing production build command.
2. Run a Node helper script that copies artifacts into the hardcoded vault plugin directory.

The helper script should expand the hardcoded home-relative vault path using the current user's home
directory, verify that the target plugin directory already exists, verify required source artifacts,
and copy only the supported artifact set. It should print a concise success message listing copied
artifacts and print clear failure messages for missing target or missing required artifacts.
