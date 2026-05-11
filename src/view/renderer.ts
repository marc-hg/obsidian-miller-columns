// renderer.ts
import { MillerNode } from '../model/types';

export function renderMillerUI(
	container: HTMLElement,
	rootNodes: MillerNode[],
	onToggle: (node: MillerNode) => void
) {
	container.empty();
	container.addClass('miller-columns-wrapper');

	let activePath: MillerNode[] = [];

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
					e.stopPropagation(); // Don't trigger "select column logic"
					onToggle(node);
				})

				itemEl.createSpan({ text: node.text });

				const isActive = activePath[currentDepth] === node;
				if (isActive) {
					itemEl.addClass('is-active');
					nextNodes = node.children;
				}

				itemEl.onClickEvent((e) => {
					activePath = activePath.slice(0, currentDepth);
					activePath.push(node);
					render();
				});
			});

			currentNodes = nextNodes || [];
			depth++;
		}
	};

	render();
}
