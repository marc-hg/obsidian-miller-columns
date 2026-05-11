import { toggleCheckboxInText } from 'model/mutator';
import { parseListToTree } from 'model/parser';
import { Plugin, MarkdownPostProcessorContext, MarkdownView } from 'obsidian';
import { renderMillerUI } from 'view/renderer';


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

			const container = element.createDiv();
			const tree = parseListToTree(rawMarkdown, sectionInfo.lineStart);

			renderMillerUI(container, tree, (node) => {
				const editor = view.editor;
				const currentFullText = editor.getValue();

				// Calculate the new text using our pure mutator
				const newText = toggleCheckboxInText(currentFullText, node.originalLine);

				// Update the Obsidian editor
				editor.setValue(newText);
			});
		});
	}

	onunload() { }
}

