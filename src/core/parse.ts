import { ItemKind, MillerNode } from './types';

const TASK_RE = /^(\s*)-\s*\[([ xX])\]\s*(.*)/;
/** Plain bullet: `- text` that is not a task checkbox line. */
const PLAIN_RE = /^(\s*)-\s+(.*)/;

function stripMillerTag(text: string): string {
	return text.replace('#miller-view', '').trim();
}

/**
 * Level 1: markdown list section → tree (tasks and/or plain bullets).
 * Stack parser: indentation encodes parent → child. Only `-` markers.
 */
export function parseListToTree(rawMarkdown: string, startLine: number): MillerNode[] {
	const lines = rawMarkdown.split('\n');
	const rootNodes: MillerNode[] = [];
	const stack: { node: MillerNode; indent: number }[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';

		let indent: number;
		let kind: ItemKind;
		let isCompleted: boolean;
		let text: string;

		const taskMatch = line.match(TASK_RE);
		if (taskMatch) {
			indent = (taskMatch[1] ?? '').length;
			kind = 'task';
			isCompleted = (taskMatch[2] ?? '').toLowerCase() === 'x';
			text = stripMillerTag(taskMatch[3] ?? '');
		} else {
			const plainMatch = line.match(PLAIN_RE);
			if (!plainMatch) continue;
			// Guard: if someone writes weird `- [x]foo` without space after ], task RE may miss;
			// PLAIN would capture it — acceptable. Task form is tried first.
			indent = (plainMatch[1] ?? '').length;
			kind = 'plain';
			isCompleted = false;
			text = stripMillerTag(plainMatch[2] ?? '');
		}

		const node: MillerNode = {
			id: crypto.randomUUID(),
			text,
			kind,
			isCompleted,
			originalLine: startLine + i,
			children: [],
		};

		while (stack.length > 0 && (stack[stack.length - 1]?.indent ?? -1) >= indent) {
			stack.pop();
		}

		if (stack.length === 0) {
			rootNodes.push(node);
		} else {
			stack[stack.length - 1]?.node.children.push(node);
		}

		stack.push({ node, indent });
	}

	return rootNodes;
}
