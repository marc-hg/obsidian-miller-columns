import { toggleCheckboxInText } from 'model/mutator';
import { parseListToTree } from 'model/parser';
import { Plugin, MarkdownPostProcessorContext, MarkdownView } from 'obsidian';
import { renderMillerUI } from 'view/renderer';


export default class MillerColumnsPlugin extends Plugin {
	private activePathState = new Map<number, number[]>();

	async onload() {
		this.registerMarkdownPostProcessor(async (element: HTMLElement, context: MarkdownPostProcessorContext) => {

			if (!element.innerText.includes('#miller-view')) return;

			const sectionInfo = context.getSectionInfo(element);
			if (!sectionInfo) return;

			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view || !view.file) return;

			element.empty();
			const container = element.createDiv();

			const buildUI = (fileContent: string) => {
				const lines = fileContent.split('\n');
				const rawMarkdown = lines.slice(sectionInfo.lineStart, sectionInfo.lineEnd + 1).join('\n');
				const tree = parseListToTree(rawMarkdown, sectionInfo.lineStart);
				const savedPath = this.activePathState.get(sectionInfo.lineStart) ?? [];

				renderMillerUI(container, tree, savedPath, (node) => {
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (!activeView || !activeView.file) return;

					const file = activeView.file;

					if (activeView.getMode() === 'preview') {
						// Reading mode: vault.modify + immediate re-render via buildUI.
						// Post-processor re-fired by Obsidian will use cachedRead (not stale editor state).
						this.app.vault.read(file).then(currentText => {
							const newText = toggleCheckboxInText(currentText, node.originalLine);
							return this.app.vault.modify(file, newText).then(() => buildUI(newText));
						});
					} else {
						// Edit mode: replaceRange preserves cursor position
						const editor = activeView.editor;
						const currentText = editor.getValue();
						const newText = toggleCheckboxInText(currentText, node.originalLine);
						const oldLine = currentText.split('\n')[node.originalLine] ?? '';
						const newLine = newText.split('\n')[node.originalLine] ?? '';

						editor.replaceRange(
							newLine,
							{ line: node.originalLine, ch: 0 },
							{ line: node.originalLine, ch: oldLine.length }
						);
					}
				}, (path) => {
					this.activePathState.set(sectionInfo.lineStart, path);
				});
			};

			// cachedRead always reflects the latest vault content — safe after vault.modify re-renders
			const fileContent = await this.app.vault.cachedRead(view.file);
			buildUI(fileContent);
		});
	}
}
