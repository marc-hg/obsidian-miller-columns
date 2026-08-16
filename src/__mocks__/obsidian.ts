// Stub for Obsidian API — used by vitest (the real package is types-only, no JS)

export type MockPostProcessor = (
	el: HTMLElement,
	ctx: { getSectionInfo: (el: HTMLElement) => { lineStart: number; lineEnd: number } | null }
) => void | Promise<void>;

export class Plugin {
	app: unknown;
	_postProcessor: MockPostProcessor | undefined;

	constructor(app: unknown, _manifest?: unknown) {
		this.app = app;
	}

	registerMarkdownPostProcessor(cb: MockPostProcessor): void {
		this._postProcessor = cb;
	}
}

export class MarkdownView {}
