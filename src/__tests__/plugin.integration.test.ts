import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('obsidian', () => {
    class Plugin {
        app: any;
        _postProcessor: any;
        constructor(app: any, _manifest?: any) { this.app = app; }
        registerMarkdownPostProcessor(cb: any) { this._postProcessor = cb; }
    }
    class MarkdownView {}
    return { Plugin, MarkdownView };
});

import MillerColumnsPlugin from '../main';

describe('MillerColumnsPlugin integration', () => {
    let plugin: any;
    let mockEditor: any;
    let mockVault: any;
    let mockView: any;
    let postProcessor: (el: HTMLElement, ctx: any) => Promise<void>;
    let element: HTMLElement;

    beforeEach(() => {
        element = document.createElement('div');
        document.body.appendChild(element);

        mockEditor = {
            getValue: vi.fn().mockReturnValue(''),
            replaceRange: vi.fn(),
        };
        mockVault = {
            read: vi.fn(),
            cachedRead: vi.fn().mockResolvedValue(''),
            modify: vi.fn().mockResolvedValue(undefined),
        };
        mockView = {
            editor: mockEditor,
            file: { path: 'test.md' },
            getMode: vi.fn().mockReturnValue('source'),
        };

        plugin = new MillerColumnsPlugin({
            workspace: { getActiveViewOfType: vi.fn().mockReturnValue(mockView) },
            vault: mockVault,
        } as any, {} as any);
        plugin.onload();
        postProcessor = plugin._postProcessor;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.clearAllMocks();
    });

    it('ignores elements without #miller-view tag', async () => {
        element.textContent = 'Just a regular list';
        const ctx = { getSectionInfo: vi.fn() };
        await postProcessor(element, ctx);
        expect(ctx.getSectionInfo).not.toHaveBeenCalled();
    });

    it('renders miller columns for #miller-view block', async () => {
        const md = '- [ ] Task A #miller-view\n- [ ] Task B';
        mockVault.cachedRead.mockResolvedValue(md);
        element.textContent = '#miller-view';

        await postProcessor(element, { getSectionInfo: () => ({ lineStart: 0, lineEnd: 1 }) });

        expect(element.querySelector('.miller-columns-wrapper')).not.toBeNull();
        expect(element.querySelectorAll('.miller-item').length).toBe(2);
    });

    it('edit mode: checkbox click calls editor.replaceRange with toggled line', async () => {
        const md = '- [ ] Task A #miller-view';
        mockVault.cachedRead.mockResolvedValue(md);
        mockEditor.getValue.mockReturnValue(md);
        mockView.getMode.mockReturnValue('source');
        element.textContent = '#miller-view';

        await postProcessor(element, { getSectionInfo: () => ({ lineStart: 0, lineEnd: 0 }) });
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

        await postProcessor(element, { getSectionInfo: () => ({ lineStart: 0, lineEnd: 0 }) });
        (element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

        await vi.waitFor(() => expect(mockVault.modify).toHaveBeenCalled());

        expect(mockVault.modify).toHaveBeenCalledWith(
            mockView.file,
            '- [x] Task A #miller-view'
        );
    });

    it('preview mode: UI re-renders with updated checkbox state after toggle', async () => {
        const original = '- [ ] Task A #miller-view';
        mockVault.cachedRead.mockResolvedValue(original);
        mockVault.read.mockResolvedValue(original);
        mockView.getMode.mockReturnValue('preview');
        element.textContent = '#miller-view';

        await postProcessor(element, { getSectionInfo: () => ({ lineStart: 0, lineEnd: 0 }) });

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

        await postProcessor(element, { getSectionInfo: () => ({ lineStart: 0, lineEnd: 0 }) });
        (element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

        await vi.waitFor(() => expect(mockVault.modify).toHaveBeenCalled());

        // Obsidian re-fires post-processor: cachedRead updated, editor.getValue still stale
        mockVault.cachedRead.mockResolvedValue(updated);
        // mockEditor.getValue stays as original (stale) — this is the bug condition
        element.textContent = '#miller-view';
        await postProcessor(element, { getSectionInfo: () => ({ lineStart: 0, lineEnd: 0 }) });

        expect((element.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true);
    });

    it('preview mode: active path survives toggle re-render', async () => {
        const original = '- [ ] Parent #miller-view\n  - [ ] Child';
        mockVault.cachedRead.mockResolvedValue(original);
        mockVault.read.mockResolvedValue(original);
        mockView.getMode.mockReturnValue('preview');
        element.textContent = '#miller-view';

        await postProcessor(element, { getSectionInfo: () => ({ lineStart: 0, lineEnd: 1 }) });

        // Expand tree by clicking parent item
        (element.querySelector('.miller-item') as HTMLElement).click();
        expect(element.querySelectorAll('.miller-column').length).toBe(2);

        // Toggle checkbox — tree must stay expanded after re-render
        (element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

        await vi.waitFor(() => expect(mockVault.modify).toHaveBeenCalled());

        expect(element.querySelectorAll('.miller-column').length).toBe(2);
    });
});
