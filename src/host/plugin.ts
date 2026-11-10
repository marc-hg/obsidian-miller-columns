import { MarkdownPostProcessorContext, MarkdownView, Plugin } from 'obsidian';
import { PathStore } from '../session/path-store';
import { applyLayoutSettings, clearLayoutSettings } from './layout';
import { MillerSection } from './section';
import { DEFAULT_SETTINGS, mergeSettings, MillerSettingTab, type MillerSettings } from './settings';

const MILLER_TAG = '#miller-view';

/**
 * Level 4 host: Obsidian lifecycle + section gate.
 * Per-block work lives in MillerSection.
 */
export default class MillerColumnsPlugin extends Plugin {
	settings: MillerSettings = { ...DEFAULT_SETTINGS };
	private readonly pathStore = new PathStore();
	private readonly layoutDocs = new Set<Document>();

	async onload() {
		this.settings = mergeSettings(await this.loadData());
		this.addSettingTab(new MillerSettingTab(this.app, this));

		// Layout settings live on each window's <body>; popouts get them on open.
		this.layoutDocs.add(document);
		this.applyLayout();
		this.registerEvent(
			this.app.workspace.on('window-open', (_win, win) => {
				this.layoutDocs.add(win.document);
				applyLayoutSettings(win.document, this.settings);
			})
		);
		this.registerEvent(
			this.app.workspace.on('window-close', (_win, win) => {
				this.layoutDocs.delete(win.document);
			})
		);
		this.register(() => {
			this.layoutDocs.forEach((doc) => clearLayoutSettings(doc));
			this.layoutDocs.clear();
		});

		this.registerMarkdownPostProcessor(
			async (element: HTMLElement, context: MarkdownPostProcessorContext) => {
				if (!element.innerText.includes(MILLER_TAG)) return;

				const sectionInfo = context.getSectionInfo(element);
				if (!sectionInfo) return;

				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view || !view.file) return;

				element.empty();
				// Host centers the view so it can grow past the text column (styles.css).
				element.addClass('miller-columns-host');
				const container = element.createDiv();

				const section = new MillerSection(
					this.app,
					container,
					sectionInfo.lineStart,
					sectionInfo.lineEnd,
					this.pathStore,
					this.settings
				);

				const fileContent = await this.app.vault.cachedRead(view.file);
				section.render(fileContent);
			}
		);
	}

	/** Push column width / wrap settings to every open window. */
	applyLayout(): void {
		this.layoutDocs.forEach((doc) => applyLayoutSettings(doc, this.settings));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
