import { MarkdownPostProcessorContext, MarkdownView, Plugin } from 'obsidian';
import { PathStore } from '../session/path-store';
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

	async onload() {
		this.settings = mergeSettings(await this.loadData());
		this.addSettingTab(new MillerSettingTab(this.app, this));

		this.registerMarkdownPostProcessor(
			async (element: HTMLElement, context: MarkdownPostProcessorContext) => {
				if (!element.innerText.includes(MILLER_TAG)) return;

				const sectionInfo = context.getSectionInfo(element);
				if (!sectionInfo) return;

				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view || !view.file) return;

				element.empty();
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

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
