import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { App, MarkdownPostProcessorContext, PluginManifest } from 'obsidian';

type PostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<void>;

type TestPlugin = {
	onload: () => Promise<void> | void;
	_postProcessor?: PostProcessor;
};

type MockEditor = {
	getValue: Mock<() => string>;
	replaceRange: Mock<(text: string, from: { line: number; ch: number }, to: { line: number; ch: number }) => void>;
};

type VaultFile = { path: string };

type MockVault = {
	read: Mock<(file: VaultFile) => Promise<string>>;
	cachedRead: Mock<(file: VaultFile) => Promise<string>>;
	modify: Mock<(file: VaultFile, data: string) => Promise<void>>;
};

type MockView = {
	editor: MockEditor;
	file: VaultFile;
	getMode: Mock<() => string>;
};

vi.mock('obsidian', () => {
	class Plugin {
		app: unknown;
		_postProcessor?: PostProcessor;
		manifest = { version: '0.0.0' };
		constructor(app: unknown, manifest?: { version?: string }) {
			this.app = app;
			this.manifest = { version: manifest?.version ?? '0.0.0' };
		}
		registerMarkdownPostProcessor(cb: PostProcessor) {
			this._postProcessor = cb;
		}
		async loadData(): Promise<unknown> {
			return {};
		}
		async saveData(_data: unknown): Promise<void> {}
		addSettingTab(_tab: unknown): void {}
	}
	class MarkdownView {}
	class PluginSettingTab {
		constructor(_app: unknown, _plugin: unknown) {}
	}
	class Setting {
		setName(): this {
			return this;
		}
		setDesc(): this {
			return this;
		}
		addToggle(): this {
			return this;
		}
	}
	return { Plugin, MarkdownView, PluginSettingTab, Setting };
});

import MillerColumnsPlugin from '../main';

function sectionCtx(lineStart: number, lineEnd: number): MarkdownPostProcessorContext {
	return {
		getSectionInfo: () => ({ lineStart, lineEnd, text: '' }),
	} as unknown as MarkdownPostProcessorContext;
}

describe('MillerColumnsPlugin integration', () => {
	let plugin: TestPlugin;
	let mockEditor: MockEditor;
	let mockVault: MockVault;
	let mockView: MockView;
	let postProcessor: PostProcessor;
	let element: HTMLElement;

	beforeEach(async () => {
		element = document.createElement('div');
		document.body.appendChild(element);

		mockEditor = {
			getValue: vi.fn<() => string>().mockReturnValue(''),
			replaceRange: vi.fn(),
		};
		mockVault = {
			read: vi.fn<(file: VaultFile) => Promise<string>>(),
			cachedRead: vi.fn<(file: VaultFile) => Promise<string>>().mockResolvedValue(''),
			modify: vi.fn<(file: VaultFile, data: string) => Promise<void>>().mockResolvedValue(undefined),
		};
		mockView = {
			editor: mockEditor,
			file: { path: 'test.md' },
			getMode: vi.fn<() => string>().mockReturnValue('source'),
		};

		const app = {
			workspace: { getActiveViewOfType: vi.fn().mockReturnValue(mockView) },
			vault: mockVault,
		} as unknown as App;

		plugin = new MillerColumnsPlugin(app, {} as PluginManifest) as unknown as TestPlugin;
		await plugin.onload();
		if (!plugin._postProcessor) {
			throw new Error('expected post-processor to be registered');
		}
		postProcessor = plugin._postProcessor;
	});

	afterEach(() => {
		document.body.removeChild(element);
		vi.clearAllMocks();
	});

	it('ignores elements without #miller-view tag', async () => {
		element.textContent = 'Just a regular list';
		const getSectionInfo = vi.fn();
		const ctx = { getSectionInfo } as unknown as MarkdownPostProcessorContext;
		await postProcessor(element, ctx);
		expect(getSectionInfo).not.toHaveBeenCalled();
	});

	it('renders miller columns for #miller-view block', async () => {
		const md = '- [ ] Task A #miller-view\n- [ ] Task B';
		mockVault.cachedRead.mockResolvedValue(md);
		element.textContent = '#miller-view';

		await postProcessor(element, sectionCtx(0, 1));

		expect(element.querySelector('.miller-columns-wrapper')).not.toBeNull();
		expect(element.querySelectorAll('.miller-item').length).toBe(2);
	});

	it('edit mode: checkbox click calls editor.replaceRange with toggled line', async () => {
		const md = '- [ ] Task A #miller-view';
		mockVault.cachedRead.mockResolvedValue(md);
		mockEditor.getValue.mockReturnValue(md);
		mockView.getMode.mockReturnValue('source');
		element.textContent = '#miller-view';

		await postProcessor(element, sectionCtx(0, 0));
		(element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

		expect(mockEditor.replaceRange).toHaveBeenCalledWith(
			'- [x] Task A #miller-view',
			{ line: 0, ch: 0 },
			{ line: 0, ch: md.length }
		);
	});

	it('preview mode: vault.modify called with toggled content', async () => {
		const original = '- [ ] Task A #miller-view';
		mockVault.cachedRead.mockResolvedValue(original);
		mockVault.read.mockResolvedValue(original);
		mockView.getMode.mockReturnValue('preview');
		element.textContent = '#miller-view';

		await postProcessor(element, sectionCtx(0, 0));
		(element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

		await vi.waitFor(() => expect(mockVault.modify).toHaveBeenCalled());

		expect(mockVault.modify).toHaveBeenCalledWith(mockView.file, '- [x] Task A #miller-view');
	});

	it('preview mode: UI re-renders with updated checkbox state after toggle', async () => {
		const original = '- [ ] Task A #miller-view';
		mockVault.cachedRead.mockResolvedValue(original);
		mockVault.read.mockResolvedValue(original);
		mockView.getMode.mockReturnValue('preview');
		element.textContent = '#miller-view';

		await postProcessor(element, sectionCtx(0, 0));

		expect((element.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false);

		(element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

		await vi.waitFor(() => expect(mockVault.modify).toHaveBeenCalled());

		// buildUI(newText) re-renders container with updated tree — checkbox must be checked
		expect((element.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true);
	});

	it('preview mode: Obsidian re-render reads fresh vault content, not stale editor state', async () => {
		const original = '- [ ] Task A #miller-view';
		const updated = '- [x] Task A #miller-view';

		// Simulate the exact production failure: cachedRead has fresh content,
		// but editor.getValue() still returns the pre-modify stale content.
		// If the post-processor reads editor.getValue() it will render unchecked.
		// If it reads cachedRead it will render checked.
		mockVault.cachedRead.mockResolvedValue(original);
		mockVault.read.mockResolvedValue(original);
		mockEditor.getValue.mockReturnValue(original); // stale — never updated after vault.modify
		mockView.getMode.mockReturnValue('preview');
		element.textContent = '#miller-view';

		await postProcessor(element, sectionCtx(0, 0));
		(element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

		await vi.waitFor(() => expect(mockVault.modify).toHaveBeenCalled());

		// Obsidian re-fires post-processor: cachedRead updated, editor.getValue still stale
		mockVault.cachedRead.mockResolvedValue(updated);
		// mockEditor.getValue stays as original (stale) — this is the bug condition
		element.textContent = '#miller-view';
		await postProcessor(element, sectionCtx(0, 0));

		expect((element.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true);
	});

	it('preview mode: active path survives toggle re-render', async () => {
		const original = '- [ ] Parent #miller-view\n  - [ ] Child';
		mockVault.cachedRead.mockResolvedValue(original);
		mockVault.read.mockResolvedValue(original);
		mockView.getMode.mockReturnValue('preview');
		element.textContent = '#miller-view';

		await postProcessor(element, sectionCtx(0, 1));

		// Expand tree by clicking parent item
		(element.querySelector('.miller-item') as HTMLElement).click();
		expect(element.querySelectorAll('.miller-column').length).toBe(2);

		// Toggle checkbox — tree must stay expanded after re-render
		(element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

		await vi.waitFor(() => expect(mockVault.modify).toHaveBeenCalled());

		expect(element.querySelectorAll('.miller-column').length).toBe(2);
	});

	it('preview mode: inserted item appears after inline input confirm', async () => {
		const original = '- [ ] Task A #miller-view';
		const updated = '- [ ] Task A #miller-view\n- [ ] Task B';
		mockVault.cachedRead.mockResolvedValue(original);
		mockVault.read.mockResolvedValue(original);
		mockView.getMode.mockReturnValue('preview');
		element.textContent = '#miller-view';

		await postProcessor(element, sectionCtx(0, 0));

		const container = element.querySelector<HTMLElement>('.miller-columns-wrapper');
		expect(container).not.toBeNull();
		if (!container) throw new Error('Expected Miller columns wrapper');

		container.dispatchEvent(new MouseEvent('mouseenter'));
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

		const input = element.querySelector<HTMLInputElement>('input.miller-new-item-input');
		expect(input).not.toBeNull();
		if (!input) throw new Error('Expected inline input');

		input.value = 'Task B';
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

		await vi.waitFor(() => expect(mockVault.modify).toHaveBeenCalledWith(mockView.file, updated));

		const itemTexts = Array.from(element.querySelectorAll('.miller-item span'), (span) => span.textContent);
		expect(itemTexts).toContain('Task B');
	});
});
