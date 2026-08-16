import { InsertPlacement } from '../core/path';

export type InsertConfirm = {
	text: string;
	afterLine: number;
	indent: string;
	/** Line number of the new item (afterLine + 1). */
	newItemLine: number;
};

/**
 * Level 3: inline text field for creating a checklist item.
 */
export function openInsertInput(
	container: HTMLElement,
	placement: InsertPlacement,
	onConfirm: (result: InsertConfirm) => void
): void {
	const cols = container.querySelectorAll<HTMLElement>('.miller-column');
	const colEl = cols[placement.targetDepth] ?? container.createDiv({ cls: 'miller-column' });

	const inputEl = colEl.createEl('input', { type: 'text', cls: 'miller-new-item-input' });
	inputEl.focus();

	const cleanup = () => {
		inputEl.remove();
	};

	inputEl.addEventListener('keydown', (ev) => {
		// Capture-phase document listeners should ignore us via target check; still stop bubble.
		ev.stopPropagation();
		if (ev.key === 'Enter' || ev.code === 'Enter') {
			ev.preventDefault();
			const text = inputEl.value.trim();
			// Blur before remove so focusout relatedTarget is cleaner; ownership is kept by keyboard rules.
			inputEl.blur();
			cleanup();
			if (text) {
				onConfirm({
					text,
					afterLine: placement.afterLine,
					indent: placement.indent,
					newItemLine: placement.afterLine + 1,
				});
			}
		} else if (ev.key === 'Escape') {
			ev.preventDefault();
			inputEl.blur();
			cleanup();
		}
	});
}
