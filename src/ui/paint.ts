import { MillerNode } from '../core/types';
import { buildColumns, ColumnModel } from '../session/build-columns';

export type PaintHandlers = {
	onToggle: (node: MillerNode) => void;
	onSelect: (node: MillerNode, depth: number) => void;
	onActivateKeyboard?: () => void;
};

/** Level 2–3: paint columns from pure ColumnModel (or tree+path). */
export function paintColumns(
	container: HTMLElement,
	columns: ColumnModel[],
	handlers: PaintHandlers
): void {
	container.empty();

	for (const col of columns) {
		const colEl = container.createDiv({ cls: 'miller-column' });
		const depth = col.depth;

		for (const item of col.items) {
			const { node, isActive } = item;
			const itemEl = colEl.createDiv({ cls: 'miller-item' });

			const checkbox = itemEl.createEl('input', { type: 'checkbox' });
			checkbox.checked = node.isCompleted;
			checkbox.addEventListener('click', (e) => {
				e.stopPropagation();
				handlers.onActivateKeyboard?.();
				handlers.onToggle(node);
			});

			// First span stays the label — tests read `.miller-item span` as the title.
			const label = itemEl.createSpan({ text: node.text });
			label.addClass('miller-item-label');

			if (node.children.length > 0) {
				itemEl.addClass('has-children');
				const chevron = itemEl.createSpan({ text: '›' });
				chevron.addClass('miller-item-chevron');
				chevron.setAttribute('aria-hidden', 'true');
			}

			if (isActive) {
				itemEl.addClass('is-active');
			}

			itemEl.onClickEvent(() => {
				handlers.onActivateKeyboard?.();
				handlers.onSelect(node, depth);
			});
		}
	}

	const activeItems = container.querySelectorAll<HTMLElement>('.miller-item.is-active');
	const deepest = activeItems[activeItems.length - 1];
	if (deepest && typeof deepest.scrollIntoView === 'function') {
		deepest.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}
}

export function paintTree(
	container: HTMLElement,
	rootNodes: MillerNode[],
	activePath: MillerNode[],
	handlers: PaintHandlers
): void {
	paintColumns(container, buildColumns(rootNodes, activePath), handlers);
}
