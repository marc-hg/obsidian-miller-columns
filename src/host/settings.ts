import { App, PluginSettingTab, Setting } from 'obsidian';
import type MillerColumnsPlugin from './plugin';

export interface MillerSettings {
	/** Also treat h/j/k/l as arrows. Arrow keys always work. */
	useVimKeys: boolean;
	/** Show › on items that have children. */
	showChevrons: boolean;
	/** Width of each parent column, in pixels. */
	columnWidth: number;
	/** Wrap long labels in every column instead of truncating with an ellipsis. */
	wrapLabels: boolean;
}

export const COLUMN_WIDTH_MIN = 120;
export const COLUMN_WIDTH_MAX = 600;
export const COLUMN_WIDTH_STEP = 10;

export const DEFAULT_SETTINGS: MillerSettings = {
	useVimKeys: true,
	showChevrons: true,
	columnWidth: 220,
	wrapLabels: false,
};

function clampColumnWidth(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SETTINGS.columnWidth;
	return Math.min(COLUMN_WIDTH_MAX, Math.max(COLUMN_WIDTH_MIN, Math.round(value)));
}

export function mergeSettings(raw: unknown): MillerSettings {
	const data = raw && typeof raw === 'object' ? (raw as Partial<MillerSettings>) : {};
	return {
		useVimKeys: data.useVimKeys ?? DEFAULT_SETTINGS.useVimKeys,
		showChevrons: data.showChevrons ?? DEFAULT_SETTINGS.showChevrons,
		columnWidth: clampColumnWidth(data.columnWidth),
		wrapLabels: data.wrapLabels ?? DEFAULT_SETTINGS.wrapLabels,
	};
}

type ToggleKey = 'useVimKeys' | 'showChevrons' | 'wrapLabels';

const COPY = {
	useVimKeys: ['Use vim keys', 'Also navigate with h, j, k, and l. Arrow keys always work.'],
	showChevrons: ['Show chevrons', 'Show › on items that have children.'],
	columnWidth: [
		'Column width',
		'Width of each column, in pixels. Views grow past the text width to fit their columns, up to the full pane width.',
	],
	wrapLabels: [
		'Wrap long items in all columns',
		'The last column and the selected item always show full text. Turn on to also show full text in the other columns instead of cutting it off with “…”.',
	],
} as const;

export class MillerSettingTab extends PluginSettingTab {
	plugin: MillerColumnsPlugin;

	constructor(app: App, plugin: MillerColumnsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Obsidian 1.13+ declarative settings. Older versions keep using display().
	 * Types ship in later API defs than our pinned obsidian 1.10.3.
	 */
	getSettingDefinitions(): unknown[] {
		return [
			{ name: 'Release', desc: this.plugin.manifest.version },
			toggleDef('useVimKeys'),
			toggleDef('showChevrons'),
			{
				name: COPY.columnWidth[0],
				desc: COPY.columnWidth[1],
				control: {
					type: 'slider',
					key: 'columnWidth',
					min: COLUMN_WIDTH_MIN,
					max: COLUMN_WIDTH_MAX,
					step: COLUMN_WIDTH_STEP,
				},
			},
			toggleDef('wrapLabels'),
		];
	}

	/**
	 * 1.13+ write path for declarative controls. Replaces Obsidian's default
	 * save so layout changes apply live. Mutates in place: sections hold a
	 * reference to this settings object.
	 */
	async setControlValue(key: string, value: unknown): Promise<void> {
		const settings = this.plugin.settings as unknown as Record<string, unknown>;
		settings[key] = value;
		Object.assign(this.plugin.settings, mergeSettings(this.plugin.settings));
		await this.plugin.saveSettings();
		this.plugin.applyLayout();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Release').setDesc(this.plugin.manifest.version);

		this.addToggle(containerEl, 'useVimKeys');
		this.addToggle(containerEl, 'showChevrons');

		new Setting(containerEl)
			.setName(COPY.columnWidth[0])
			.setDesc(COPY.columnWidth[1])
			.addSlider((slider) =>
				slider
					.setLimits(COLUMN_WIDTH_MIN, COLUMN_WIDTH_MAX, COLUMN_WIDTH_STEP)
					.setValue(this.plugin.settings.columnWidth)
					.setDynamicTooltip()
					.onChange((value) => this.setControlValue('columnWidth', value))
			);

		this.addToggle(containerEl, 'wrapLabels');
	}

	private addToggle(
		containerEl: HTMLElement,
		key: ToggleKey
	): void {
		new Setting(containerEl)
			.setName(COPY[key][0])
			.setDesc(COPY[key][1])
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings[key])
					.onChange((value) => this.setControlValue(key, value))
			);
	}
}

function toggleDef(key: ToggleKey) {
	return { name: COPY[key][0], desc: COPY[key][1], control: { type: 'toggle', key } };
}
