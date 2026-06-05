// src/model/mutator.ts
export function toggleCheckboxInText(fullText: string, targetLine: number): string {
	const lines = fullText.split('\n');

	if (targetLine < 0 || targetLine >= lines.length) {
		return fullText; // Line out of bounds, fail silently
	}

	const line = lines[targetLine];

	// Regex to find the first instance of a markdown checkbox on the line
	const checkboxRegex = /\[([ xX])\]/;
	if (!line) { return fullText; }
	const match = line.match(checkboxRegex);
	if (!match) { return fullText; } // No checkbox found, return original text

	// Determine current state and flip it
	const currentState = match[1];
	const newState = (currentState === ' ' || currentState === '') ? 'x' : ' ';

	// Replace the old checkbox with the new one
	lines[targetLine] = line.replace(checkboxRegex, `[${newState}]`);

	return lines.join('\n');
}

export function insertItem(fileText: string, afterLine: number, indent: string, text: string): string {
	const lines = fileText.split('\n');
	lines.splice(afterLine + 1, 0, `${indent}- [ ] ${text}`);
	return lines.join('\n');
}
