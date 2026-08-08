import { describe, it, expect } from 'vitest';
import {
	convertItemKindInText,
	deleteLinesInText,
	insertItem,
	toggleCheckboxInText,
} from '../core/mutate';

describe('Markdown Mutator', () => {
	it('should toggle an empty checkbox to [x]', () => {
		const input = `- [ ] Task`;
		const output = toggleCheckboxInText(input, 0);
		expect(output).toBe('- [x] Task');
	});

	it('should toggle a completed checkbox back to [ ]', () => {
		const input = `- [x] Completed`;
		const output = toggleCheckboxInText(input, 0);
		expect(output).toBe('- [ ] Completed');
	});

	it('should return same text when no checkbox', () => {
		const input = `Just a simple line`;
		const output = toggleCheckboxInText(input, 0);
		expect(output).toBe('Just a simple line');
	});

	it('does not invent a checkbox on plain bullet lines', () => {
		const input = `- Plain item`;
		expect(toggleCheckboxInText(input, 0)).toBe('- Plain item');
	});

	it('inserts a task line by default', () => {
		const input = `- [ ] A`;
		expect(insertItem(input, 0, '', 'B')).toBe('- [ ] A\n- [ ] B');
	});

	it('inserts a plain bullet when kind is plain', () => {
		const input = `- A`;
		expect(insertItem(input, 0, '', 'B', 'plain')).toBe('- A\n- B');
	});

	it('inserts indented plain child', () => {
		const input = `- Parent`;
		expect(insertItem(input, 0, '  ', 'Child', 'plain')).toBe('- Parent\n  - Child');
	});

	it('converts task to plain', () => {
		expect(convertItemKindInText('- [ ] Foo', 0)).toBe('- Foo');
		expect(convertItemKindInText('- [x] Foo', 0)).toBe('- Foo');
		expect(convertItemKindInText('  - [ ] Nested', 0)).toBe('  - Nested');
	});

	it('converts plain to unchecked task', () => {
		expect(convertItemKindInText('- Foo', 0)).toBe('- [ ] Foo');
		expect(convertItemKindInText('  - Nested', 0)).toBe('  - [ ] Nested');
	});

	it('deletes an inclusive line range', () => {
		const input = `- A\n- B\n  - B1\n- C`;
		expect(deleteLinesInText(input, 1, 2)).toEqual({
			text: '- A\n- C',
			removed: 2,
		});
	});
});
