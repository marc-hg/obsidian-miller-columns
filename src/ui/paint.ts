import { MillerNode } from '../core/types';
import { buildColumns, ColumnModel } from '../session/build-columns';

export type PaintHandlers = {
	onToggle: (node: MillerNode) => void;
	onSelect: (node: MillerNode, depth: number) => void;
	onActivateKeyboard?: () => void;
};

export type PaintOptions = {
	/** Scroll the deepest active item into view (default: false). Prefer when keyboard-owned. */
	scrollActiveIntoView?: boolean;
	/** Force a full DOM rebuild even if column structure is unchanged. */
	forceFullPaint?: boolean;
};

const STRUCTURE_ATTR = 'data-miller-structure';

/** Stable key for which nodes appear in which columns (ignores active flags). */
export function columnStructureKey(columns: ColumnModel[]): string {
	return columns
		.map(col => col.items.map(item => item.node.originalLine).join(','))
		.join('|');
}

function scrollDeepestActive(container: HTMLElement): void {
	const activeItems = container.querySelectorAll<HTMLElement>('.miller-item.is-active');
	const deepest = activeItems[activeItems.length - 1];
	if (deepest && typeof deepest.scrollIntoView === 'function') {
		deepest.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}
}

/**
 * Path-only update: same nodes in each column, only is-active classes change.
 * Avoids destroy/recreate under the cursor (hover flicker).
 */
function childElementsByClass(parent: Element, className: string): HTMLElement[] {
	return Array.from(parent.children).filter(
		(el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains(className)
	);
}

function updateActiveClasses(container: HTMLElement, columns: ColumnModel[]): void {
	const colEls = childElementsByClass(container, 'miller-column');
	for (let c = 0; c < columns.length; c++) {
		const col = columns[c];
		const colEl = colEls[c];
		if (!col || !colEl) continue;

		const itemEls = childElementsByClass(colEl, 'miller-item');
		for (let i = 0; i < col.items.length; i++) {
			const item = col.items[i];
			const itemEl = itemEls[i];
			if (!item || !itemEl) continue;
			itemEl.classList.toggle('is-active', item.isActive);
		}
	}
}

/** Full rebuild of columns and items. */
function paintColumnsFull(
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
			itemEl.setAttribute('data-line', String(node.originalLine));

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
}

/**
 * Paint columns from a model. Reuses DOM when only the active path changes
 * within the same column structure (sibling moves, etc.).
 */
export function paintColumns(
	container: HTMLElement,
	columns: ColumnModel[],
	handlers: PaintHandlers,
	options: PaintOptions = {}
): void {
	const nextKey = columnStructureKey(columns);
	const prevKey = container.getAttribute(STRUCTURE_ATTR);
	const canPatch =
		!options.forceFullPaint &&
		prevKey === nextKey &&
		childElementsByClass(container, 'miller-column').length > 0;

	if (canPatch) {
		updateActiveClasses(container, columns);
	} else {
		paintColumnsFull(container, columns, handlers);
		container.setAttribute(STRUCTURE_ATTR, nextKey);
	}

	if (options.scrollActiveIntoView) {
		scrollDeepestActive(container);
	}
}

export function paintTree(
	container: HTMLElement,
	rootNodes: MillerNode[],
	activePath: MillerNode[],
	handlers: PaintHandlers,
	options: PaintOptions = {}
): void {
	paintColumns(container, buildColumns(rootNodes, activePath), handlers, options);
}
