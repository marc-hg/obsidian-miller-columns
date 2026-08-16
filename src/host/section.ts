import { App } from 'obsidian';
import {
	convertItemKindInText,
	deleteLinesInText,
	insertItem,
	toggleCheckboxInText,
} from '../core/mutate';
import { parseListToTree } from '../core/parse';
import { ItemKind, MillerNode } from '../core/types';
import { PathStore } from '../session/path-store';
import { renderMillerUI } from '../ui/render';
import { applyMutation } from './document';
import type { MillerSettings } from './settings';

/**
 * One live #miller-view block: owns section bounds, path key, and rebuild loop.
 * Created by the post-processor; all nested callbacks live here as methods.
 */
export class MillerSection {
	private lineEnd: number;

	constructor(
		private readonly app: App,
		private readonly container: HTMLElement,
		private readonly sectionStart: number,
		lineEnd: number,
		private readonly pathStore: PathStore,
		private readonly settings: MillerSettings
	) {
		this.lineEnd = lineEnd;
	}

	/** Parse section → restore path → paint columns (and wire handlers). */
	render(fileContent: string): void {
		const lines = fileContent.split('\n');
		const rawMarkdown = lines.slice(this.sectionStart, this.lineEnd + 1).join('\n');
		const tree = parseListToTree(rawMarkdown, this.sectionStart);
		const activePath = this.pathStore.resolveOrDefault(this.sectionStart, tree);

		renderMillerUI(
			this.container,
			tree,
			activePath,
			(node) => this.handleToggle(node),
			(path) => this.handlePathChange(path),
			(text, afterLine, indent, kind) => this.handleInsert(text, afterLine, indent, kind),
			// Keyboard focus is keyed by section lineStart so Obsidian remounts
			// (new container after vault.modify) keep navigation without re-hover.
			this.sectionStart,
			(node) => this.handleConvertKind(node),
			(node, endLine, nextPath) => this.handleDelete(node, endLine, nextPath),
			{
				useVimKeys: this.settings.useVimKeys,
				showChevrons: this.settings.showChevrons,
			}
		);
	}

	private handlePathChange(path: number[]): void {
		this.pathStore.set(this.sectionStart, path);
	}

	private handleToggle(node: MillerNode): void {
		if (node.kind !== 'task') return;
		void applyMutation(this.app, {
			mutate: (text) => toggleCheckboxInText(text, node.originalLine),
			preferLineReplace: { line: node.originalLine },
			onUpdated: (newText) => this.render(newText),
		}).catch((error: unknown) => {
			console.error('Miller Columns: failed to toggle checkbox', error);
		});
	}

	private handleInsert(text: string, afterLine: number, indent: string, kind: ItemKind): void {
		void applyMutation(this.app, {
			mutate: (fileText) => insertItem(fileText, afterLine, indent, text, kind),
			onUpdated: (newText) => {
				this.lineEnd += 1;
				this.render(newText);
			},
		}).catch((error: unknown) => {
			console.error('Miller Columns: failed to insert item', error);
		});
	}

	private handleConvertKind(node: MillerNode): void {
		void applyMutation(this.app, {
			mutate: (text) => convertItemKindInText(text, node.originalLine),
			preferLineReplace: { line: node.originalLine },
			onUpdated: (newText) => this.render(newText),
		}).catch((error: unknown) => {
			console.error('Miller Columns: failed to convert item kind', error);
		});
	}

	private handleDelete(node: MillerNode, endLine: number, nextPath: number[]): void {
		const startLine = node.originalLine;
		void applyMutation(this.app, {
			mutate: (text) => {
				const { text: next, removed } = deleteLinesInText(text, startLine, endLine);
				this.lineEnd = Math.max(this.sectionStart - 1, this.lineEnd - removed);
				return next;
			},
			// Edit mode: range replace so Ctrl/Cmd+Z undoes the delete.
			preferLineDelete: { startLine, endLine },
			onUpdated: (newText) => {
				this.pathStore.set(this.sectionStart, nextPath);
				this.render(newText);
			},
		}).catch((error: unknown) => {
			console.error('Miller Columns: failed to delete item', error);
		});
	}
}
