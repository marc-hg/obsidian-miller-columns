import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		environment: 'jsdom',
		setupFiles: ['src/__tests__/setup.ts'],
	},
	resolve: {
		alias: {
			core: path.resolve(__dirname, 'src/core'),
			session: path.resolve(__dirname, 'src/session'),
			ui: path.resolve(__dirname, 'src/ui'),
			host: path.resolve(__dirname, 'src/host'),
			// Legacy aliases (tests / residual imports)
			model: path.resolve(__dirname, 'src/core'),
			view: path.resolve(__dirname, 'src/ui'),
			obsidian: path.resolve(__dirname, 'src/__mocks__/obsidian.ts'),
		},
	},
});
