import { describe, it, expect } from 'vitest';
import { parseListToTree } from '../core/parse';

describe('Miller Column Parser', () => {
	it('should convert a nested markdown list into a tree', () => {
		const markdown = `- [ ] Parent\n  - [ ] Child`;
		const tree = parseListToTree(markdown, 0);

		expect(tree.length).toBe(1);
		expect(tree[0]!.text).toBe('Parent');
		expect(tree[0]!.kind).toBe('task');
		expect(tree[0]!.children.length).toBe(1);
		expect(tree[0]!.children[0]!.text).toBe('Child');
	});

	it('should ignore the #miller-view tag in display text', () => {
		const markdown = `- [ ] Task #miller-view`;
		const tree = parseListToTree(markdown, 0);

		expect(tree[0]!.text).toBe('Task');
	});

	it('should map originalLine relative to startLine offset', () => {
		const markdown = `- [ ] First\n- [ ] Second\n  - [ ] Nested`;
		const startLine = 5;
		const tree = parseListToTree(markdown, startLine);

		expect(tree[0]!.originalLine).toBe(5);
		expect(tree[1]!.originalLine).toBe(6);
		expect(tree[1]!.children[0]!.originalLine).toBe(7);
	});

	it('parses plain bullets without checkboxes', () => {
		const markdown = `- Project #miller-view\n  - Notes\n  - More`;
		const tree = parseListToTree(markdown, 0);

		expect(tree[0]!.kind).toBe('plain');
		expect(tree[0]!.text).toBe('Project');
		expect(tree[0]!.isCompleted).toBe(false);
		expect(tree[0]!.children).toHaveLength(2);
		expect(tree[0]!.children[0]!.kind).toBe('plain');
		expect(tree[0]!.children[0]!.text).toBe('Notes');
	});

	it('parses mixed task and plain lists under one parent', () => {
		const markdown = `- Work #miller-view\n  - [ ] Ship\n  - Design\n    - [x] Mockups`;
		const tree = parseListToTree(markdown, 0);

		expect(tree[0]!.kind).toBe('plain');
		expect(tree[0]!.children[0]!.kind).toBe('task');
		expect(tree[0]!.children[0]!.isCompleted).toBe(false);
		expect(tree[0]!.children[1]!.kind).toBe('plain');
		expect(tree[0]!.children[1]!.children[0]!.kind).toBe('task');
		expect(tree[0]!.children[1]!.children[0]!.isCompleted).toBe(true);
	});

	it('does not treat * bullets as nodes', () => {
		const markdown = `* Star item\n- Dash item`;
		const tree = parseListToTree(markdown, 0);
		expect(tree).toHaveLength(1);
		expect(tree[0]!.text).toBe('Dash item');
		expect(tree[0]!.kind).toBe('plain');
	});
});
