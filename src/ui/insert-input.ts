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

	const inputEl = document.createElement('input');
	inputEl.type = 'text';
	inputEl.className = 'miller-new-item-input';
	colEl.appendChild(inputEl);
	inputEl.focus();

	const cleanup = () => {
		inputEl.remove();
	};

	inputEl.addEventListener('keydown', (ev) => {
		ev.stopPropagation();
		if (ev.key === 'Enter') {
			const text = inputEl.value.trim();
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
			cleanup();
		}
	});
}
