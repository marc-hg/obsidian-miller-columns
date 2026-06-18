/* global process */
import { copyFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_ARTIFACTS = ['main.js', 'manifest.json'];
const OPTIONAL_ARTIFACTS = ['styles.css'];
const VAULT_PLUGIN_PATH_PARTS = [
	'Syncthing',
	'ObsidianVault',
	'.obsidian',
	'plugins',
	'obsidian-miller-columns',
];

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, '..');

export function getVaultPluginDir(homeDirectory = homedir()) {
	return path.join(homeDirectory, ...VAULT_PLUGIN_PATH_PARTS);
}

export async function deployVaultArtifacts({
	sourceRoot = repoRoot,
	targetPluginDir = getVaultPluginDir(),
	log = console.log,
} = {}) {
	await assertExistingDirectory(targetPluginDir);

	const artifacts = await collectArtifacts(sourceRoot);

	for (const artifact of artifacts) {
		await copyFile(
			path.join(sourceRoot, artifact),
			path.join(targetPluginDir, artifact)
		);
	}

	log(`Copied ${artifacts.join(', ')} to ${targetPluginDir}`);

	return {
		copiedArtifacts: artifacts,
		targetPluginDir,
	};
}

async function collectArtifacts(sourceRoot) {
	const missingRequired = [];

	for (const artifact of REQUIRED_ARTIFACTS) {
		if (!await fileExists(path.join(sourceRoot, artifact))) {
			missingRequired.push(artifact);
		}
	}

	if (missingRequired.length > 0) {
		throw new Error(
			`Required artifact${missingRequired.length === 1 ? ' is' : 's are'} missing after build: ${missingRequired.join(', ')}`
		);
	}

	const artifacts = [...REQUIRED_ARTIFACTS];

	for (const artifact of OPTIONAL_ARTIFACTS) {
		if (await fileExists(path.join(sourceRoot, artifact))) {
			artifacts.push(artifact);
		}
	}

	return artifacts;
}

async function assertExistingDirectory(directoryPath) {
	let stats;

	try {
		stats = await stat(directoryPath);
	} catch (error) {
		if (isMissingPathError(error)) {
			throw new Error(
				`Target plugin directory does not exist: ${directoryPath}. Create it intentionally before deploying.`
			);
		}

		throw error;
	}

	if (!stats.isDirectory()) {
		throw new Error(`Target plugin path is not a directory: ${directoryPath}`);
	}
}

async function fileExists(filePath) {
	try {
		const stats = await stat(filePath);
		return stats.isFile();
	} catch (error) {
		if (isMissingPathError(error)) return false;
		throw error;
	}
}

function isMissingPathError(error) {
	return typeof error === 'object'
		&& error !== null
		&& 'code' in error
		&& error.code === 'ENOENT';
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
	deployVaultArtifacts().catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`deploy:vault failed: ${message}`);
		process.exitCode = 1;
	});
}
