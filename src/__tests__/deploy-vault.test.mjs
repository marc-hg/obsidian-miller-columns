import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { deployVaultArtifacts } from '../../scripts/deploy-vault.mjs';

const tempRoots = [];

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map((tempRoot) => rm(tempRoot, {
		force: true,
		recursive: true,
	})));
});

describe('deployVaultArtifacts', () => {
	it('copies release artifacts and preserves unrelated plugin data', async () => {
		const { sourceRoot, targetPluginDir } = await createDeployFixture();
		const messages = [];

		await writeFile(path.join(sourceRoot, 'main.js'), 'new main');
		await writeFile(path.join(sourceRoot, 'manifest.json'), '{"id":"obsidian-miller-columns"}');
		await writeFile(path.join(sourceRoot, 'styles.css'), '.miller-columns-wrapper {}');
		await writeFile(path.join(targetPluginDir, 'data.json'), '{"setting":true}');

		const result = await deployVaultArtifacts({
			log: (message) => messages.push(message),
			sourceRoot,
			targetPluginDir,
		});

		await expect(readFile(path.join(targetPluginDir, 'main.js'), 'utf8')).resolves.toBe('new main');
		await expect(readFile(path.join(targetPluginDir, 'manifest.json'), 'utf8')).resolves.toBe('{"id":"obsidian-miller-columns"}');
		await expect(readFile(path.join(targetPluginDir, 'styles.css'), 'utf8')).resolves.toBe('.miller-columns-wrapper {}');
		await expect(readFile(path.join(targetPluginDir, 'data.json'), 'utf8')).resolves.toBe('{"setting":true}');
		expect(result).toEqual({
			copiedArtifacts: ['main.js', 'manifest.json', 'styles.css'],
			targetPluginDir,
		});
		expect(messages).toEqual([
			`Copied main.js, manifest.json, styles.css to ${targetPluginDir}`,
		]);
	});

	it('succeeds without copying optional styles when styles.css is absent', async () => {
		const { sourceRoot, targetPluginDir } = await createDeployFixture();

		await writeFile(path.join(sourceRoot, 'main.js'), 'new main');
		await writeFile(path.join(sourceRoot, 'manifest.json'), '{"id":"obsidian-miller-columns"}');

		const result = await deployVaultArtifacts({
			log: () => undefined,
			sourceRoot,
			targetPluginDir,
		});

		await expect(readFile(path.join(targetPluginDir, 'main.js'), 'utf8')).resolves.toBe('new main');
		await expect(readFile(path.join(targetPluginDir, 'manifest.json'), 'utf8')).resolves.toBe('{"id":"obsidian-miller-columns"}');
		await expect(stat(path.join(targetPluginDir, 'styles.css'))).rejects.toHaveProperty('code', 'ENOENT');
		expect(result.copiedArtifacts).toEqual(['main.js', 'manifest.json']);
	});

	it('fails when the target plugin directory has not been intentionally created', async () => {
		const { sourceRoot, targetPluginDir } = await createDeployFixture({ createTarget: false });

		await writeFile(path.join(sourceRoot, 'main.js'), 'new main');
		await writeFile(path.join(sourceRoot, 'manifest.json'), '{"id":"obsidian-miller-columns"}');

		await expect(deployVaultArtifacts({
			log: () => undefined,
			sourceRoot,
			targetPluginDir,
		})).rejects.toThrow(`Target plugin directory does not exist: ${targetPluginDir}`);
		await expect(stat(targetPluginDir)).rejects.toHaveProperty('code', 'ENOENT');
	});

	it('fails before copying anything when a required artifact is missing', async () => {
		const { sourceRoot, targetPluginDir } = await createDeployFixture();

		await writeFile(path.join(sourceRoot, 'main.js'), 'new main');
		await writeFile(path.join(targetPluginDir, 'main.js'), 'existing main');

		await expect(deployVaultArtifacts({
			log: () => undefined,
			sourceRoot,
			targetPluginDir,
		})).rejects.toThrow('Required artifact is missing after build: manifest.json');
		await expect(readFile(path.join(targetPluginDir, 'main.js'), 'utf8')).resolves.toBe('existing main');
	});
});

async function createDeployFixture({ createTarget = true } = {}) {
	const tempRoot = await mkdtemp(path.join(tmpdir(), 'obsidian-deploy-vault-'));
	tempRoots.push(tempRoot);

	const sourceRoot = path.join(tempRoot, 'repo');
	const targetPluginDir = path.join(
		tempRoot,
		'Syncthing',
		'ObsidianVault',
		'.obsidian',
		'plugins',
		'obsidian-miller-columns'
	);

	await mkdir(sourceRoot, { recursive: true });

	if (createTarget) {
		await mkdir(targetPluginDir, { recursive: true });
	}

	return {
		sourceRoot,
		targetPluginDir,
	};
}
