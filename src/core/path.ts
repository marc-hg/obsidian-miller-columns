import { ItemKind, MillerNode } from './types';

/** Default auto-expand depth so ~3 columns show on first load. */
export const DEFAULT_EXPAND_DEPTH = 2;

/** Indent unit used when inserting nested checklist lines (must match parser). */
export const LIST_INDENT = '  ';

export function restorePath(rootNodes: MillerNode[], savedLines: number[]): MillerNode[] {
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

export function getSiblingsAtCursorDepth(rootNodes: MillerNode[], activePath: MillerNode[]): MillerNode[] {
	let nodes = rootNodes;
	for (const ancestor of activePath) {
		const found = nodes.find(n => n.id === ancestor.id);
		if (!found) return [];
		nodes = found.children;
	}
	return nodes;
}

export function navigateDescend(rootNodes: MillerNode[], activePath: MillerNode[]): MillerNode[] {
	if (activePath.length === 0) {
		const first = rootNodes[0];
		return first ? [first] : [];
	}
	const last = activePath[activePath.length - 1];
	if (!last || last.children.length === 0) return activePath;
	const firstChild = last.children[0];
	return firstChild ? [...activePath, firstChild] : activePath;
}

export function navigateAscend(activePath: MillerNode[]): MillerNode[] {
	return activePath.slice(0, -1);
}

export function navigateSibling(
	rootNodes: MillerNode[],
	activePath: MillerNode[],
	delta: number
): MillerNode[] {
	if (activePath.length === 0) return activePath;
	const parentPath = activePath.slice(0, -1);
	const currentNode = activePath[activePath.length - 1];
	const siblings = getSiblingsAtCursorDepth(rootNodes, parentPath);
	const idx = siblings.findIndex(n => n.id === currentNode?.id);
	if (idx === -1) return activePath;
	const newIdx = Math.max(0, Math.min(siblings.length - 1, idx + delta));
	const newNode = siblings[newIdx];
	if (!newNode) return activePath;
	return [...parentPath, newNode];
}

/**
 * If path is empty, seed to root[0]. Returns whether seeding occurred.
 */
export function seedPathIfEmpty(
	rootNodes: MillerNode[],
	activePath: MillerNode[]
): { path: MillerNode[]; seeded: boolean } {
	if (activePath.length > 0 || rootNodes.length === 0) {
		return { path: activePath, seeded: false };
	}
	const first = rootNodes[0];
	if (!first) return { path: activePath, seeded: false };
	return { path: [first], seeded: true };
}

export function lastDescendantLine(node: MillerNode): number {
	if (node.children.length === 0) return node.originalLine;
	const last = node.children[node.children.length - 1];
	return last ? lastDescendantLine(last) : node.originalLine;
}

export function pathToLines(path: MillerNode[]): number[] {
	return path.map(n => n.originalLine);
}

/**
 * Computes an initial activePath by following the first child at each level.
 * Auto-expands the first branch so multiple Miller columns are visible on load.
 */
export function computeDefaultActivePath(
	rootNodes: MillerNode[],
	maxDepth = DEFAULT_EXPAND_DEPTH
): number[] {
	const path: number[] = [];
	let currentNodes = rootNodes;
	let depth = 0;

	while (depth < maxDepth && currentNodes.length > 0) {
		const first = currentNodes[0];
		if (!first) break;

		// Only descend if this node has children (avoid an empty next column).
		if (first.children.length === 0) {
			break;
		}

		path.push(first.originalLine);
		currentNodes = first.children;
		depth++;
	}

	return path;
}

export type InsertPlacement = {
	afterLine: number;
	indent: string;
	targetDepth: number;
	/** New item kind: inherit focused row; no focus → task (back-compat). */
	kind: ItemKind;
};

/**
 * Where to insert a new list item relative to the focused path.
 * Returns null when the insert is not allowed (e.g. Shift+Enter with no focus).
 * Kind inherits the focused item; with no focus defaults to task.
 */
export function computeInsertPlacement(
	rootNodes: MillerNode[],
	activePath: MillerNode[],
	isChild: boolean
): InsertPlacement | null {
	const focused = activePath[activePath.length - 1];

	if (!focused) {
		if (isChild || rootNodes.length === 0) return null;
		const lastRoot = rootNodes[rootNodes.length - 1]!;
		return {
			afterLine: lastDescendantLine(lastRoot),
			indent: '',
			targetDepth: 0,
			kind: 'task',
		};
	}

	if (isChild) {
		return {
			afterLine: focused.originalLine,
			indent: LIST_INDENT.repeat(activePath.length),
			targetDepth: activePath.length,
			kind: focused.kind,
		};
	}

	return {
		afterLine: lastDescendantLine(focused),
		indent: LIST_INDENT.repeat(activePath.length - 1),
		targetDepth: activePath.length - 1,
		kind: focused.kind,
	};
}
