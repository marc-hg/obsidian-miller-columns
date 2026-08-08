import { App, MarkdownView, TFile } from 'obsidian';

export type TextMutation = (fileText: string) => string;

export type ApplyMutationOptions = {
	mutate: TextMutation;
	/**
	 * When set (edit/source mode), replace a single line instead of setValue
	 * so the cursor is preserved (checkbox toggle).
	 */
	preferLineReplace?: { line: number };
	/**
	 * Called with the new full text when the UI should rebuild immediately
	 * (preview always; edit mode after full-file writes like insert).
	 */
	onUpdated?: (newText: string) => void;
};

function getActiveMarkdown(
	app: App
): { view: MarkdownView; file: TFile } | null {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view || !view.file) return null;
	return { view, file: view.file };
}

/**
 * Level 4: one write path for edit vs preview.
 * Mutator stays pure; this owns Obsidian I/O only.
 */
export async function applyMutation(app: App, options: ApplyMutationOptions): Promise<void> {
	const active = getActiveMarkdown(app);
	if (!active) return;

	const { view, file } = active;

	if (view.getMode() === 'preview') {
		const currentText = await app.vault.read(file);
		const newText = options.mutate(currentText);
		await app.vault.modify(file, newText);
		options.onUpdated?.(newText);
		return;
	}

	const editor = view.editor;
	const currentText = editor.getValue();
	const newText = options.mutate(currentText);

	if (options.preferLineReplace) {
		const line = options.preferLineReplace.line;
		const oldLine = currentText.split('\n')[line] ?? '';
		const newLine = newText.split('\n')[line] ?? '';
		editor.replaceRange(
			newLine,
			{ line, ch: 0 },
			{ line, ch: oldLine.length }
		);
		// Edit-mode toggle: Obsidian re-renders from editor; no forced rebuild.
		return;
	}

	editor.setValue(newText);
	options.onUpdated?.(newText);
}
