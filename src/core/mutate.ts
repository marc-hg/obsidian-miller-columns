/**
 * Level 1: pure file-text physics. No Obsidian, no DOM.
 */

import { ItemKind } from './types';

export function toggleCheckboxInText(fullText: string, targetLine: number): string {
	const lines = fullText.split('\n');

	if (targetLine < 0 || targetLine >= lines.length) {
		return fullText;
	}

	const line = lines[targetLine];

	// Only task checkboxes — plain bullets have no `[ ]` / `[x]` to flip.
	const checkboxRegex = /\[([ xX])\]/;
	if (!line) {
		return fullText;
	}
	const match = line.match(checkboxRegex);
	if (!match) {
		return fullText;
	}

	const currentState = match[1];
	const newState = currentState === ' ' || currentState === '' ? 'x' : ' ';

	lines[targetLine] = line.replace(checkboxRegex, `[${newState}]`);

	return lines.join('\n');
}

/**
 * Insert a new list line after `afterLine`.
 * @param kind task → `- [ ] text`; plain → `- text`
 */
export function insertItem(
	fileText: string,
	afterLine: number,
	indent: string,
	text: string,
	kind: ItemKind = 'task'
): string {
	const lines = fileText.split('\n');
	const bullet = kind === 'task' ? `- [ ] ${text}` : `- ${text}`;
	lines.splice(afterLine + 1, 0, `${indent}${bullet}`);
	return lines.join('\n');
}

const TASK_LINE_RE = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
const PLAIN_LINE_RE = /^(\s*)-\s+(.*)$/;

/**
 * Flip a list line between task and plain:
 * `- [ ] Foo` / `- [x] Foo` ↔ `- Foo`
 * Checked state is dropped when converting task → plain.
 */
export function convertItemKindInText(fullText: string, targetLine: number): string {
	const lines = fullText.split('\n');
	if (targetLine < 0 || targetLine >= lines.length) {
		return fullText;
	}

	const line = lines[targetLine];
	if (!line) return fullText;

	const taskMatch = line.match(TASK_LINE_RE);
	if (taskMatch) {
		const indent = taskMatch[1] ?? '';
		const text = taskMatch[3] ?? '';
		lines[targetLine] = `${indent}- ${text}`;
		return lines.join('\n');
	}

	const plainMatch = line.match(PLAIN_LINE_RE);
	if (plainMatch) {
		// Don't re-match lines that are actually tasks (task regex already handled).
		const indent = plainMatch[1] ?? '';
		const text = plainMatch[2] ?? '';
		// If text looks like a checkbox prefix already, leave alone.
		if (/^\[[ xX]\]/.test(text)) return fullText;
		lines[targetLine] = `${indent}- [ ] ${text}`;
		return lines.join('\n');
	}

	return fullText;
}
