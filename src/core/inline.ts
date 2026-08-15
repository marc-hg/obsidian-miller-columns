/** Display-only inline markdown. Source `node.text` stays raw for mutation. */

export type InlinePart = { kind: 'text' | 'bold'; value: string };

const BOLD_RE = /\*\*(.+?)\*\*/g;

/** Split a label into plain and `**bold**` parts. Unmatched `**` stays literal. */
export function parseInlineBold(text: string): InlinePart[] {
	const parts: InlinePart[] = [];
	let last = 0;

	for (const match of text.matchAll(BOLD_RE)) {
		const start = match.index ?? 0;
		if (start > last) {
			parts.push({ kind: 'text', value: text.slice(last, start) });
		}
		parts.push({ kind: 'bold', value: match[1] ?? '' });
		last = start + match[0].length;
	}

	if (last < text.length) {
		parts.push({ kind: 'text', value: text.slice(last) });
	}

	if (parts.length === 0) {
		parts.push({ kind: 'text', value: text });
	}

	return parts;
}
