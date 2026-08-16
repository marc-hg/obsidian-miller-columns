import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings } from '../host/settings';

describe('mergeSettings', () => {
	it('returns defaults for empty or invalid input', () => {
		expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(mergeSettings('nope')).toEqual(DEFAULT_SETTINGS);
	});

	it('keeps provided booleans and fills the rest', () => {
		expect(mergeSettings({ useVimKeys: false })).toEqual({
			useVimKeys: false,
			showChevrons: true,
		});
	});
});
