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

/**
 * After deleting `deleted` (and its subtree), where should selection go?
 * Prefer previous sibling, else next sibling (line adjusted), else parent path.
 */
export function computePathAfterDelete(
	rootNodes: MillerNode[],
	activePath: MillerNode[],
	deleted: MillerNode
): number[] {
	const start = deleted.originalLine;
	const end = lastDescendantLine(deleted);
	const removed = end - start + 1;

	const delIdx = activePath.findIndex(n => n.id === deleted.id);
	// Deleted is not on the open path — only renumber surviving path lines.
	if (delIdx === -1) {
		const out: number[] = [];
		for (const line of pathToLines(activePath)) {
			if (line >= start && line <= end) break;
			if (line > end) out.push(line - removed);
			else out.push(line);
		}
		return out;
	}

	const parentPath = activePath.slice(0, delIdx);
	const siblings = getSiblingsAtCursorDepth(rootNodes, parentPath);
	const sibIdx = siblings.findIndex(n => n.id === deleted.id);

	if (sibIdx > 0) {
		const prev = siblings[sibIdx - 1];
		if (prev) return pathToLines([...parentPath, prev]);
	}

	if (sibIdx >= 0 && sibIdx < siblings.length - 1) {
		const next = siblings[sibIdx + 1];
		if (next) {
			// Next sibling sits after the deleted block → shift its line up.
			return [...pathToLines(parentPath), next.originalLine - removed];
		}
	}

	return pathToLines(parentPath);
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
			indent: childInsertIndent(activePath, focused),
			targetDepth: activePath.length,
			kind: focused.kind,
		};
	}

	return {
		afterLine: lastDescendantLine(focused),
		indent: nodeIndent(focused),
		targetDepth: activePath.length - 1,
		kind: focused.kind,
	};
}

function nodeIndent(node: MillerNode): string {
	return node.indent ?? '';
}

/** One nesting unit: difference vs parent, else two spaces. */
function indentUnit(activePath: MillerNode[]): string {
	const focused = activePath[activePath.length - 1];
	const parent = activePath[activePath.length - 2];
	if (!focused || !parent) return LIST_INDENT;

	const focusedPrefix = nodeIndent(focused);
	const parentPrefix = nodeIndent(parent);
	if (focusedPrefix.startsWith(parentPrefix)) {
		const unit = focusedPrefix.slice(parentPrefix.length);
		if (unit.length > 0) return unit;
	}
	return LIST_INDENT;
}

/** Child indent: copy first existing child, else parent prefix + one unit. */
function childInsertIndent(activePath: MillerNode[], focused: MillerNode): string {
	const existing = focused.children[0];
	if (existing) return nodeIndent(existing);
	return nodeIndent(focused) + indentUnit(activePath);
}
