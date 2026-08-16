/** Display-only inline markdown. Source `node.text` stays raw for mutation. */

export type InlinePart = { kind: 'text' | 'bold'; value: string };

/** Split a label into plain and `**bold**` parts. Unmatched `**` stays literal. */
export function parseInlineBold(text: string): InlinePart[] {
	const parts: InlinePart[] = [];
	const re = /\*\*(.+?)\*\*/g;
	let last = 0;
	let match: RegExpExecArray | null = re.exec(text);

	while (match) {
		const start = match.index;
		const captured = match[1] ?? '';
		const full = match[0];
		if (start > last) {
			parts.push({ kind: 'text', value: text.slice(last, start) });
		}
		parts.push({ kind: 'bold', value: captured });
		last = start + full.length;
		match = re.exec(text);
	}

	if (last < text.length) {
		parts.push({ kind: 'text', value: text.slice(last) });
	}

	if (parts.length === 0) {
		parts.push({ kind: 'text', value: text });
	}

	return parts;
}
