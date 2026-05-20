// renderer.ts
import { MillerNode } from '../model/types';

function restorePath(rootNodes: MillerNode[], savedLines: number[]): MillerNode[] {
	const path: MillerNode[] = [];
	let currentNodes = rootNodes;
	for (const targetLine of savedLines) {
		const node = currentNodes.find(n => n.originalLine === targetLine);
		if (!node) break;
		path.push(node);
		currentNodes = node.children;
	}
	return path;
}

export function renderMillerUI(
	container: HTMLElement,
	rootNodes: MillerNode[],
	savedActivePath: number[],
	onToggle: (node: MillerNode) => void,
	onPathChange: (path: number[]) => void
) {
	container.empty();
	container.addClass('miller-columns-wrapper');

	let activePath: MillerNode[] = restorePath(rootNodes, savedActivePath);

	const render = () => {
		container.empty();

		let currentNodes = rootNodes;
		let depth = 0;

		while (currentNodes && currentNodes.length > 0) {
			const colEl = container.createDiv({ cls: 'miller-column' });
			const currentDepth = depth;
			let nextNodes: MillerNode[] | null = null;

			currentNodes.forEach(node => {
				const itemEl = colEl.createDiv({ cls: 'miller-item' });

				const checkbox = itemEl.createEl('input', { type: 'checkbox' });
				checkbox.checked = node.isCompleted;
				checkbox.addEventListener('click', (e) => {
					e.stopPropagation();
					onToggle(node);
				});

				itemEl.createSpan({ text: node.text });

				const isActive = activePath[currentDepth] === node;
				if (isActive) {
					itemEl.addClass('is-active');
					nextNodes = node.children;
				}

				itemEl.onClickEvent(() => {
					activePath = activePath.slice(0, currentDepth);
					activePath.push(node);
					onPathChange(activePath.map(n => n.originalLine));
					render();
				});
			});

			currentNodes = nextNodes || [];
			depth++;
		}
	};

	render();
}
