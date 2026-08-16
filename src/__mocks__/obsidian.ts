// Stub for Obsidian API — used by vitest (the real package is types-only, no JS)

export type MockPostProcessor = (
	el: HTMLElement,
	ctx: { getSectionInfo: (el: HTMLElement) => { lineStart: number; lineEnd: number } | null }
) => void | Promise<void>;

export class Plugin {
	app: unknown;
	manifest: { version: string };
	_postProcessor: MockPostProcessor | undefined;

	constructor(app: unknown, manifest?: { version?: string }) {
		this.app = app;
		this.manifest = { version: manifest?.version ?? '0.0.0' };
	}

	registerMarkdownPostProcessor(cb: MockPostProcessor): void {
		this._postProcessor = cb;
	}

	async loadData(): Promise<unknown> {
		return {};
	}

	async saveData(_data: unknown): Promise<void> {}

	addSettingTab(_tab: unknown): void {}
}

export class MarkdownView {}

export class PluginSettingTab {
	app: unknown;
	plugin: unknown;
	containerEl = { empty() {}, createEl() {} };

	constructor(app: unknown, plugin: unknown) {
		this.app = app;
		this.plugin = plugin;
	}

	display(): void {}
}

export class Setting {
	constructor(_containerEl: unknown) {}
	setName(_name: string): this {
		return this;
	}
	setDesc(_desc: string): this {
		return this;
	}
	addToggle(_cb: (toggle: { setValue: (v: boolean) => unknown; onChange: (cb: (v: boolean) => void) => unknown }) => void): this {
		return this;
	}
}
