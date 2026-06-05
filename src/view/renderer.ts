// renderer.ts
import { MillerNode } from '../model/types';

function restorePath(rootNodes: MillerNode[], savedLines: number[]): MillerNode[] {
	const path: MillerNode[] = [];
	let currentNodes = rootNodes;
	for (const targetLine of savedLines) {
		const node = currentNodes.find(n => n.originalLine === targetLine);
		if (!node) break;
		path.push(node);
		currentNodes = node.children;
	}
	return path;
}

function getSiblingsAtCursorDepth(rootNodes: MillerNode[], activePath: MillerNode[]): MillerNode[] {
	let nodes = rootNodes;
	for (const ancestor of activePath) {
		const found = nodes.find(n => n.id === ancestor.id);
		if (!found) return [];
		nodes = found.children;
	}
	return nodes;
}

function navigateDescend(rootNodes: MillerNode[], activePath: MillerNode[]): MillerNode[] {
	if (activePath.length === 0) {
		const first = rootNodes[0];
		return first ? [first] : [];
	}
	const last = activePath[activePath.length - 1];
	if (!last || last.children.length === 0) return activePath;
	const firstChild = last.children[0];
	return firstChild ? [...activePath, firstChild] : activePath;
}

function navigateAscend(activePath: MillerNode[]): MillerNode[] {
	return activePath.slice(0, -1);
}

function lastDescendantLine(node: MillerNode): number {
	if (node.children.length === 0) return node.originalLine;
	const last = node.children[node.children.length - 1];
	return last ? lastDescendantLine(last) : node.originalLine;
}

/**
 * Computes an initial activePath by following the first child at each level.
 * This provides the "auto-expand first branch on load" behavior so multiple
 * Miller columns are visible immediately instead of starting with only the root column.
 */
export function computeDefaultActivePath(rootNodes: MillerNode[], maxDepth = 2): number[] {
	const path: number[] = [];
	let currentNodes = rootNodes;
	let depth = 0;

	while (depth < maxDepth && currentNodes.length > 0) {
		const first = currentNodes[0];
		if (!first) break;

		// Only descend if this node has children, otherwise the next column would be empty.
		// This ensures every auto-expanded column contains actual items.
		if (first.children.length === 0) {
			break;
		}

		path.push(first.originalLine);
		currentNodes = first.children;
		depth++;
	}

	return path;
}

export function renderMillerUI(
	container: HTMLElement,
	rootNodes: MillerNode[],
	savedActivePath: number[],
	onToggle: (node: MillerNode) => void,
	onPathChange: (path: number[]) => void,
	onInsert: (text: string, afterLine: number, indent: string) => void
) {
	container.empty();
	container.addClass('miller-columns-wrapper');

	let activePath: MillerNode[] = restorePath(rootNodes, savedActivePath);

	const render = () => {
		container.empty();

		let currentNodes = rootNodes;
		let depth = 0;

		while (currentNodes && currentNodes.length > 0) {
			const colEl = container.createDiv({ cls: 'miller-column' });
			const currentDepth = depth;
			let nextNodes: MillerNode[] | null = null;

			currentNodes.forEach(node => {
				const itemEl = colEl.createDiv({ cls: 'miller-item' });

				const checkbox = itemEl.createEl('input', { type: 'checkbox' });
				checkbox.checked = node.isCompleted;
				checkbox.addEventListener('click', (e) => {
					e.stopPropagation();
					onToggle(node);
				});

				itemEl.createSpan({ text: node.text });

				const isActive = activePath[currentDepth] === node;
				if (isActive) {
					itemEl.addClass('is-active');
					nextNodes = node.children;
				}

				itemEl.onClickEvent(() => {
					activePath = activePath.slice(0, currentDepth);
					activePath.push(node);
					onPathChange(activePath.map(n => n.originalLine));
					render();
				});
			});

			currentNodes = nextNodes || [];
			depth++;
		}

		const activeItems = container.querySelectorAll<HTMLElement>('.miller-item.is-active');
		const deepest = activeItems[activeItems.length - 1];
		if (deepest && typeof deepest.scrollIntoView === 'function') {
			deepest.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		}
	};

	let activeInput: HTMLInputElement | null = null;

	const handleInsert = (isChild: boolean) => {
		const focused = activePath[activePath.length - 1];

		let afterLine: number;
		let indent: string;
		let targetDepth: number;

		if (!focused) {
			if (isChild || rootNodes.length === 0) return;
			const lastRoot = rootNodes[rootNodes.length - 1]!;
			afterLine = lastDescendantLine(lastRoot);
			indent = '';
			targetDepth = 0;
		} else if (isChild) {
			afterLine = focused.originalLine;
			indent = '  '.repeat(activePath.length);
			targetDepth = activePath.length;
		} else {
			afterLine = lastDescendantLine(focused);
			indent = '  '.repeat(activePath.length - 1);
			targetDepth = activePath.length - 1;
		}

		render();

		const cols = container.querySelectorAll<HTMLElement>('.miller-column');
		const colEl = cols[targetDepth] ?? container.createDiv({ cls: 'miller-column' });

		const inputEl = document.createElement('input');
		inputEl.type = 'text';
		inputEl.className = 'miller-new-item-input';
		colEl.appendChild(inputEl);
		inputEl.focus();
		activeInput = inputEl;

		const cleanup = () => { inputEl.remove(); activeInput = null; };

		inputEl.addEventListener('keydown', (ev) => {
			ev.stopPropagation();
			if (ev.key === 'Enter') {
				const text = inputEl.value.trim();
				cleanup();
				if (text) {
					const newItemLine = afterLine + 1;
					const parentLines = isChild
						? activePath.map(n => n.originalLine)
						: activePath.slice(0, -1).map(n => n.originalLine);
					onPathChange([...parentLines, newItemLine]);
					onInsert(text, afterLine, indent);
				}
			} else if (ev.key === 'Escape') {
				cleanup();
			}
		});
	};

	const keyHandler = (e: KeyboardEvent): void => {
		const { key } = e;
		if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== ' ' && key !== 'Enter') return;

		e.preventDefault();
		e.stopPropagation();

		if (key === 'Enter') {
			handleInsert(e.shiftKey);
			return;
		}

		let guardFired = false;
		if (activePath.length === 0 && rootNodes.length > 0) {
			const first = rootNodes[0];
			if (first) { activePath = [first]; guardFired = true; }
		}

		if (activePath.length === 0) return;

		let newPath = activePath;

		if (key === 'ArrowDown' || key === 'ArrowUp') {
			const delta = key === 'ArrowDown' ? 1 : -1;
			const parentPath = activePath.slice(0, -1);
			const currentNode = activePath[activePath.length - 1];
			const siblings = getSiblingsAtCursorDepth(rootNodes, parentPath);
			const idx = siblings.findIndex(n => n.id === currentNode?.id);
			if (idx === -1) return;
			const newIdx = Math.max(0, Math.min(siblings.length - 1, idx + delta));
			const newNode = siblings[newIdx];
			if (!newNode) return;
			newPath = [...parentPath, newNode];
		} else if (key === 'ArrowRight') {
			newPath = navigateDescend(rootNodes, activePath);
		} else if (key === 'ArrowLeft' && activePath.length > 1) {
			newPath = navigateAscend(activePath);
		} else if (key === ' ') {
			const focused = activePath[activePath.length - 1];
			if (focused) onToggle(focused);
			return;
		}

		if (newPath === activePath && !guardFired) return;
		activePath = newPath;
		onPathChange(activePath.map(n => n.originalLine));
		render();
	};

	container.addEventListener('mouseenter', () => document.addEventListener('keydown', keyHandler));
	container.addEventListener('mouseleave', () => {
		document.removeEventListener('keydown', keyHandler);
		if (activeInput) { activeInput.remove(); activeInput = null; }
	});

	render();
}
