import { describe, it, expect } from 'vitest';
import {
	computeDefaultActivePath,
	computeInsertPlacement,
	navigateSibling,
	restorePath,
} from '../core/path';
import { MillerNode } from '../core/types';
import { buildColumns } from '../session/build-columns';
import { normalizeNavKey } from '../ui/keyboard';

function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
	return { id: crypto.randomUUID(), text, isCompleted: false, originalLine, children };
}

describe('core/path', () => {
	it('restorePath walks originalLine chain', () => {
		const child = makeNode('Child', [], 2);
		const parent = makeNode('Parent', [child], 1);
		expect(restorePath([parent], [1, 2]).map(n => n.text)).toEqual(['Parent', 'Child']);
	});

	it('navigateSibling clamps at ends', () => {
		const a = makeNode('A', [], 1);
		const b = makeNode('B', [], 2);
		const path = [a];
		expect(navigateSibling([a, b], path, -1)[0]?.text).toBe('A');
		expect(navigateSibling([a, b], path, 1)[0]?.text).toBe('B');
	});

	it('computeInsertPlacement for sibling at root', () => {
		const leaf = makeNode('Leaf', [], 5);
		expect(computeInsertPlacement([leaf], [leaf], false)).toEqual({
			afterLine: 5,
			indent: '',
			targetDepth: 0,
		});
	});

	it('computeInsertPlacement null for child with empty path', () => {
		expect(computeInsertPlacement([makeNode('A', [], 1)], [], true)).toBeNull();
	});
});

describe('computeDefaultActivePath', () => {
	it('returns empty array for empty tree', () => {
		expect(computeDefaultActivePath([])).toEqual([]);
	});

	it('follows first child up to maxDepth', () => {
		const grandchild = makeNode('Grandchild', [], 20);
		const child = makeNode('Child', [grandchild], 10);
		const root = makeNode('Root', [child, makeNode('Other')], 0);
		expect(computeDefaultActivePath([root], 2)).toEqual([0, 10]);
	});

	it('stops early when a node has no children', () => {
		const root = makeNode('Root', [makeNode('Child', [], 5)], 0);
		expect(computeDefaultActivePath([root], 2)).toEqual([0]);
	});
});

describe('session/build-columns', () => {
	it('builds two columns when path selects a parent', () => {
		const child = makeNode('Child', [], 2);
		const parent = makeNode('Parent', [child], 1);
		const cols = buildColumns([parent], [parent]);
		expect(cols).toHaveLength(2);
		expect(cols[0]!.items[0]!.isActive).toBe(true);
		expect(cols[1]!.items[0]!.node.text).toBe('Child');
	});
});

describe('normalizeNavKey (arrows + vim)', () => {
	it('maps hjkl to arrows', () => {
		expect(normalizeNavKey('h')).toBe('ArrowLeft');
		expect(normalizeNavKey('j')).toBe('ArrowDown');
		expect(normalizeNavKey('k')).toBe('ArrowUp');
		expect(normalizeNavKey('l')).toBe('ArrowRight');
	});

	it('maps arrows to themselves', () => {
		expect(normalizeNavKey('ArrowLeft')).toBe('ArrowLeft');
		expect(normalizeNavKey('ArrowDown')).toBe('ArrowDown');
		expect(normalizeNavKey('ArrowUp')).toBe('ArrowUp');
		expect(normalizeNavKey('ArrowRight')).toBe('ArrowRight');
	});

	it('is case-insensitive for letters', () => {
		expect(normalizeNavKey('J')).toBe('ArrowDown');
	});

	it('returns null for unrelated keys', () => {
		expect(normalizeNavKey('x')).toBeNull();
		expect(normalizeNavKey('Enter')).toBeNull();
	});
});
