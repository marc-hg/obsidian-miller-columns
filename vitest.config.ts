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
            model: path.resolve(__dirname, 'src/model'),
            view: path.resolve(__dirname, 'src/view'),
            obsidian: path.resolve(__dirname, 'src/__mocks__/obsidian.ts'),
        },
    },
});
