import { App, Editor, MarkdownView, TFile } from 'obsidian';

export type TextMutation = (fileText: string) => string;

export type ApplyMutationOptions = {
	mutate: TextMutation;
	/**
	 * When set (edit/source mode), replace a single line instead of setValue
	 * so the cursor is preserved and undo stays a small step (checkbox / kind flip).
	 */
	preferLineReplace?: { line: number };
	/**
	 * When set (edit/source mode), delete inclusive line range via replaceRange
	 * so Ctrl/Cmd+Z can undo the deletion as one editor history entry.
	 */
	preferLineDelete?: { startLine: number; endLine: number };
	/**
	 * Called with the new full text when the UI should rebuild immediately
	 * (preview always; edit mode after multi-line writes).
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
 * Delete [startLine, endLine] inclusive using replaceRange (undo-friendly).
 */
function deleteLineRangeInEditor(editor: Editor, startLine: number, endLine: number): void {
	const lastLine = editor.lineCount() - 1;
	const start = Math.max(0, startLine);
	const end = Math.min(lastLine, endLine);
	if (start > end) return;

	if (end < lastLine) {
		// Remove through the newline after `end` by spanning to the start of the next line.
		editor.replaceRange('', { line: start, ch: 0 }, { line: end + 1, ch: 0 });
		return;
	}

	if (start > 0) {
		// Last lines of the file: remove from end of previous line (drops the preceding newline).
		const prevLen = editor.getLine(start - 1)?.length ?? 0;
		const endLen = editor.getLine(end)?.length ?? 0;
		editor.replaceRange('', { line: start - 1, ch: prevLen }, { line: end, ch: endLen });
		return;
	}

	// Whole document is the deleted range.
	editor.setValue('');
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

	// Prefer range delete first — still run mutate for lineEnd bookkeeping consistency
	// via the same pure transform, then apply as an editor range op for undo history.
	if (options.preferLineDelete) {
		const { startLine, endLine } = options.preferLineDelete;
		// Validate mutation would change something; apply pure path for onUpdated text.
		const newText = options.mutate(currentText);
		if (newText === currentText) {
			options.onUpdated?.(newText);
			return;
		}
		deleteLineRangeInEditor(editor, startLine, endLine);
		// Prefer editor.getValue() as source of truth after the range op.
		options.onUpdated?.(editor.getValue());
		return;
	}

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
		// Edit-mode single-line: Obsidian re-renders from editor; optional rebuild.
		options.onUpdated?.(newText);
		return;
	}

	editor.setValue(newText);
	options.onUpdated?.(newText);
}
