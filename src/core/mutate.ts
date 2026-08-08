/**
 * Level 1: pure file-text physics. No Obsidian, no DOM.
 */

export function toggleCheckboxInText(fullText: string, targetLine: number): string {
	const lines = fullText.split('\n');

	if (targetLine < 0 || targetLine >= lines.length) {
		return fullText;
	}

	const line = lines[targetLine];

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

export function insertItem(fileText: string, afterLine: number, indent: string, text: string): string {
	const lines = fileText.split('\n');
	lines.splice(afterLine + 1, 0, `${indent}- [ ] ${text}`);
	return lines.join('\n');
}
