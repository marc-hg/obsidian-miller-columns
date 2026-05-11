import { Plugin, MarkdownPostProcessorContext, MarkdownView } from 'obsidian';

// 1. Define our Data Structure
export interface MillerNode {
	id: string;
	text: string;
	isCompleted: boolean;
	originalLine: number; // Crucial for bidirectional editing later
	children: MillerNode[];
}

// 2. The Stack-Based Parser
function parseListToTree(rawMarkdown: string, startLine: number): MillerNode[] {
	const lines = rawMarkdown.split('\n');
	const rootNodes: MillerNode[] = [];
	const stack: { node: MillerNode, indent: number }[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// Regex to extract: 1. Indentation, 2. Checkbox state, 3. Text
		const match = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)/);
		if (!match) continue;

		const indent = match[1].length;
		const isCompleted = match[2].toLowerCase() === 'x';
		let text = match[3];

		// Clean up the trigger tag from the display text
		text = text.replace('#miller-view', '').trim();

		const node: MillerNode = {
			id: crypto.randomUUID(),
			text,
			isCompleted,
			originalLine: startLine + i,
			children: []
		};

		// Pop items off the stack until we find the parent (an item with strictly less indentation)
		while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
			stack.pop();
		}

		if (stack.length === 0) {
			rootNodes.push(node); // It's a top-level task
		} else {
			stack[stack.length - 1].node.children.push(node); // It's a sub-task
		}

		stack.push({ node, indent });
	}

	return rootNodes;
}

// 3. Reactive UI Renderer
function renderMillerUI(container: HTMLElement, rootNodes: MillerNode[]) {
	// Clear the container and apply a wrapper class for styling
	container.empty();
	container.addClass('miller-columns-wrapper');

	// STATE: Track the currently selected path of nodes
	let activePath: MillerNode[] = [];

	// Render loop: Clears and redraws the UI based on the activePath state
	const render = () => {
		container.empty();
		
		let currentNodes = rootNodes;
		let depth = 0;

		// Continue rendering columns as long as we have nodes to display at this depth
		while (currentNodes && currentNodes.length > 0) {
			const colEl = container.createDiv({ cls: 'miller-column' });
			const currentDepth = depth; // Capture depth for the event listener closure
			let nextNodes: MillerNode[] | null = null;

			currentNodes.forEach(node => {
				const itemEl = colEl.createDiv({ cls: 'miller-item' });
				
				// Add checkbox (Read-only for this MVP step)
				const checkbox = itemEl.createEl('input', { type: 'checkbox' });
				checkbox.checked = node.isCompleted;
				checkbox.disabled = true; 

				// Add text
				itemEl.createSpan({ text: node.text });

				// Check if this node is part of the currently active path
				const isActive = activePath[currentDepth] === node;
				if (isActive) {
					itemEl.addClass('is-active');
					nextNodes = node.children; // Queue up children for the next column
				}

				// Interaction Logic
				itemEl.onClickEvent((e) => {
					// 1. Truncate the path to the current depth (deselects deeper children)
					activePath = activePath.slice(0, currentDepth);
					// 2. Add the newly clicked node
					activePath.push(node);
					// 3. Trigger a re-render
					render();
				});
			});

			// Move to the next set of children for the next column iteration
			currentNodes = nextNodes || [];
			depth++;
		}
	};

	// Trigger initial render
	render();
}

export default class MillerColumnsPlugin extends Plugin {
	async onload() {
		this.registerMarkdownPostProcessor((element: HTMLElement, context: MarkdownPostProcessorContext) => {
			if (!element.innerText.includes('#miller-view')) return; 

			const sectionInfo = context.getSectionInfo(element);
			if (!sectionInfo) return;

			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) return;
			
			const fileContent = view.editor.getDoc().getValue();
			const lines = fileContent.split('\n');
			const rawMarkdown = lines.slice(sectionInfo.lineStart, sectionInfo.lineEnd + 1).join('\n');

			element.empty();

			// Replace the temporary border styles with our wrapper class
			const container = element.createDiv();
			
			const tree = parseListToTree(rawMarkdown, sectionInfo.lineStart);
			
			// --- NEW EXECUTION ---
			renderMillerUI(container, tree);
		});
	}

	onunload() {}
}

