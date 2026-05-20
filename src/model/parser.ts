// parser.ts
import { MillerNode } from './types';

export function parseListToTree(rawMarkdown: string, startLine: number): MillerNode[] {
	const lines = rawMarkdown.split('\n');
	const rootNodes: MillerNode[] = [];
	const stack: { node: MillerNode, indent: number }[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		const match = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)/);
		if (!match) continue;

		const indent = (match[1] ?? '').length;
		const isCompleted = (match[2] ?? '').toLowerCase() === 'x';
		const text = (match[3] ?? '').replace('#miller-view', '').trim();

		const node: MillerNode = {
			id: crypto.randomUUID(),
			text,
			isCompleted,
			originalLine: startLine + i,
			children: []
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
