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
	onPathChange: (path: number[]) => void
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
	};

	const keyHandler = (e: KeyboardEvent): void => {
		const { key } = e;
		if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== ' ') return;

		e.preventDefault();
		e.stopPropagation();

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
	container.addEventListener('mouseleave', () => document.removeEventListener('keydown', keyHandler));

	render();
}
