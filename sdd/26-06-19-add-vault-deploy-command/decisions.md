# Decisions Log: Add vault deploy command

## Use a copy-based deploy command instead of symlinks

**Decision:** Add a `deploy:vault` npm command that copies release artifacts into the Syncthing
vault plugin folder.

**Alternatives considered:**

- Symlink the vault plugin directory to the repository.
- Symlink individual artifact files into the vault plugin directory.
- Copy release artifacts into the vault plugin directory.

**Why alternatives were discarded:** Symlinks are convenient on the local development machine, but
Syncthing syncs symlinks as links and does not follow them. Other devices would receive a link whose
target is outside the synced vault and might not exist on that device. Copying artifacts creates
ordinary files in the synced vault, which is the behavior required for other devices to load the
plugin.

## Keep deployment separate from the production build

**Decision:** Keep `npm run build` as a pure production build and add a separate
`npm run deploy:vault` command.

**Alternatives considered:**

- Make `npm run build` automatically deploy into the vault after building.
- Add a separate command that builds and deploys.

**Why alternatives were discarded:** Automatically deploying during every production build would make
the build command mutate the live Obsidian vault. A separate deploy command keeps the deployment
action intentional while still ensuring deployment uses a fresh production build.

## Use a small Node helper script

**Decision:** Implement artifact copying in a committed Node helper script and call it from
`deploy:vault` after the production build.

**Alternatives considered:**

- Put the entire copy operation in a shell one-liner in `package.json`.
- Change esbuild output to write directly into the vault plugin directory.
- Use a Node helper script.

**Why alternatives were discarded:** A shell one-liner would make optional artifact handling, home
directory expansion, and readable errors harder to maintain. Writing build output directly to the
vault would couple normal builds to a live Obsidian install and would still require separate handling
for `manifest.json` and optional `styles.css`.

## Require the target plugin directory to exist

**Decision:** `deploy:vault` should fail if
`~/Syncthing/ObsidianVault/.obsidian/plugins/obsidian-miller-columns` does not already exist.

**Alternatives considered:**

- Create the target plugin directory automatically.
- Fail when the target plugin directory is missing.

**Why alternatives were discarded:** A missing target directory means the plugin has not been
intentionally installed in that vault. Failing prevents the deploy script from silently creating a new
plugin install in the wrong vault path or before Obsidian setup is complete.

## Hardcode the vault plugin path

**Decision:** Hardcode the target as
`~/Syncthing/ObsidianVault/.obsidian/plugins/obsidian-miller-columns`.

**Alternatives considered:**

- Require an environment variable such as `OBSIDIAN_PLUGIN_DIR`.
- Use the hardcoded path as a default with an environment override.
- Hardcode the exact target path.

**Why alternatives were discarded:** This is a one-person workflow, so configurability would add
surface area without solving a current problem. The command should optimize for the developer's known
local setup.
