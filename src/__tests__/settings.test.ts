import { describe, expect, it } from 'vitest';
import {
	applyLayoutSettings,
	clearLayoutSettings,
	COLUMN_WIDTH_VAR,
	WRAP_LABELS_CLASS,
} from '../host/layout';
import { COLUMN_WIDTH_MAX, COLUMN_WIDTH_MIN, DEFAULT_SETTINGS, mergeSettings } from '../host/settings';

describe('mergeSettings', () => {
	it('returns defaults for empty or invalid input', () => {
		expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(mergeSettings('nope')).toEqual(DEFAULT_SETTINGS);
	});

	it('keeps provided values and fills the rest', () => {
		expect(mergeSettings({ useVimKeys: false, wrapLabels: true })).toEqual({
			...DEFAULT_SETTINGS,
			useVimKeys: false,
			wrapLabels: true,
		});
	});

	it('clamps and sanitizes column width', () => {
		expect(mergeSettings({ columnWidth: 10 }).columnWidth).toBe(COLUMN_WIDTH_MIN);
		expect(mergeSettings({ columnWidth: 9999 }).columnWidth).toBe(COLUMN_WIDTH_MAX);
		expect(mergeSettings({ columnWidth: 333.6 }).columnWidth).toBe(334);
		expect(mergeSettings({ columnWidth: 'wide' }).columnWidth).toBe(DEFAULT_SETTINGS.columnWidth);
		expect(mergeSettings({ columnWidth: Number.NaN }).columnWidth).toBe(DEFAULT_SETTINGS.columnWidth);
	});
});

describe('layout settings', () => {
	it('applies width variable and classes to body, and clears them', () => {
		applyLayoutSettings(document, { ...DEFAULT_SETTINGS, columnWidth: 300, wrapLabels: true });
		expect(document.body.style.getPropertyValue(COLUMN_WIDTH_VAR)).toBe('300px');
		expect(document.body.classList.contains(WRAP_LABELS_CLASS)).toBe(true);

		applyLayoutSettings(document, { ...DEFAULT_SETTINGS, wrapLabels: false });
		expect(document.body.classList.contains(WRAP_LABELS_CLASS)).toBe(false);

		clearLayoutSettings(document);
		expect(document.body.style.getPropertyValue(COLUMN_WIDTH_VAR)).toBe('');
	});
});
