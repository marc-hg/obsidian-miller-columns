import { MillerNode } from '../core/types';

/** Level 2: pure column layout from tree + selected path. */
export type ColumnItem = {
	node: MillerNode;
	isActive: boolean;
};

export type ColumnModel = {
	depth: number;
	items: ColumnItem[];
};

/**
 * Walk the tree along activePath: each column is the sibling set at that depth.
 * The next column is the children of the active item (if any).
 */
export function buildColumns(rootNodes: MillerNode[], activePath: MillerNode[]): ColumnModel[] {
	const columns: ColumnModel[] = [];
	let currentNodes = rootNodes;
	let depth = 0;

	while (currentNodes.length > 0) {
		let nextNodes: MillerNode[] = [];
		const items: ColumnItem[] = currentNodes.map(node => {
			const isActive = activePath[depth] === node;
			if (isActive) {
				nextNodes = node.children;
			}
			return { node, isActive };
		});
		columns.push({ depth, items });
		currentNodes = nextNodes;
		depth++;
	}

	return columns;
}
