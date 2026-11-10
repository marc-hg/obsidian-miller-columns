import type { MillerSettings } from './settings';

/**
 * Global layout settings live on <body> (a CSS variable + classes) so every
 * rendered Miller view picks up changes instantly, without re-rendering.
 */
export const COLUMN_WIDTH_VAR = '--miller-column-width';
export const WRAP_LABELS_CLASS = 'miller-columns-wrap-labels';

export function applyLayoutSettings(doc: Document, settings: MillerSettings): void {
	const body = doc.body;
	body.style.setProperty(COLUMN_WIDTH_VAR, `${settings.columnWidth}px`);
	body.classList.toggle(WRAP_LABELS_CLASS, settings.wrapLabels);
}

export function clearLayoutSettings(doc: Document): void {
	const body = doc.body;
	body.style.removeProperty(COLUMN_WIDTH_VAR);
	body.classList.remove(WRAP_LABELS_CLASS);
}
