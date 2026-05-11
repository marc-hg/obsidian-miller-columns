// src/model/mutator.ts

/**
 * Takes the full markdown file content, targets a specific line,
 * and toggles the markdown checkbox state between [ ] and [x].
 */
export function toggleCheckboxInText(fullText: string, targetLine: number): string {
	const lines = fullText.split('\n');
	
	if (targetLine < 0 || targetLine >= lines.length) {
		return fullText; // Line out of bounds, fail silently
	}

	const line = lines[targetLine];
	
	// Regex to find the first instance of a markdown checkbox on the line
	const checkboxRegex = /\[([ xX])\]/;
	const match = line.match(checkboxRegex);

	if (!match) {
		return fullText; // No checkbox found, return original text
	}

	// Determine current state and flip it
	const currentState = match[1];
	const newState = (currentState === ' ' || currentState === '') ? 'x' : ' ';
	
	// Replace the old checkbox with the new one
	lines[targetLine] = line.replace(checkboxRegex, `[${newState}]`);

	return lines.join('\n');
}
