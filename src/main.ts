import { toggleCheckboxInText, insertItem } from 'model/mutator';
import { parseListToTree } from 'model/parser';
import { Plugin, MarkdownPostProcessorContext, MarkdownView } from 'obsidian';
import { renderMillerUI, computeDefaultActivePath } from 'view/renderer';


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

				// Auto-expand first branch on initial load so multiple columns are visible
				// (classic Miller columns behavior). Persist immediately so it survives re-renders.
				let activePath = this.activePathState.get(sectionInfo.lineStart) ?? [];
				if (activePath.length === 0) {
					activePath = computeDefaultActivePath(tree, 2);
					if (activePath.length > 0) {
						this.activePathState.set(sectionInfo.lineStart, activePath);
					}
				}

				renderMillerUI(container, tree, activePath, (node) => {
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
				}, (text, afterLine, indent) => {
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (!activeView || !activeView.file) return;
					const file = activeView.file;

					if (activeView.getMode() === 'preview') {
						this.app.vault.read(file).then(currentText => {
							const newText = insertItem(currentText, afterLine, indent, text);
							return this.app.vault.modify(file, newText).then(() => buildUI(newText));
						});
					} else {
						const editor = activeView.editor;
						const newText = insertItem(editor.getValue(), afterLine, indent, text);
						editor.setValue(newText);
					}
				});
			};

			// cachedRead always reflects the latest vault content — safe after vault.modify re-renders
			const fileContent = await this.app.vault.cachedRead(view.file);
			buildUI(fileContent);
		});
	}
}
