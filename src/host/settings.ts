import { App, PluginSettingTab, Setting } from 'obsidian';
import type MillerColumnsPlugin from './plugin';

export interface MillerSettings {
	/** Also treat h/j/k/l as arrows. Arrow keys always work. */
	useVimKeys: boolean;
	/** Show › on items that have children. */
	showChevrons: boolean;
}

export const DEFAULT_SETTINGS: MillerSettings = {
	useVimKeys: true,
	showChevrons: true,
};

export function mergeSettings(raw: unknown): MillerSettings {
	const data = raw && typeof raw === 'object' ? (raw as Partial<MillerSettings>) : {};
	return {
		useVimKeys: data.useVimKeys ?? DEFAULT_SETTINGS.useVimKeys,
		showChevrons: data.showChevrons ?? DEFAULT_SETTINGS.showChevrons,
	};
}

export class MillerSettingTab extends PluginSettingTab {
	plugin: MillerColumnsPlugin;

	constructor(app: App, plugin: MillerColumnsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Use vim keys')
			.setDesc('Also navigate with h, j, k, and l. Arrow keys always work.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useVimKeys).onChange(async (value) => {
					this.plugin.settings.useVimKeys = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Show chevrons')
			.setDesc('Show › on items that have children.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showChevrons).onChange(async (value) => {
					this.plugin.settings.showChevrons = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
