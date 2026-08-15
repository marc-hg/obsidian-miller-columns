import {
	computeInsertPlacement,
	computePathAfterDelete,
	lastDescendantLine,
	navigateAscend,
	navigateDescend,
	navigateSibling,
	pathToLines,
	restorePath,
	seedPathIfEmpty,
} from '../core/path';
import { ItemKind, MillerNode } from '../core/types';
import { openInsertInput } from './insert-input';
import {
	activateKeyboard,
	bindKeyboard,
	isKeyboardActiveForSection,
} from './keyboard';
import { paintTree } from './paint';

/**
 * Level 2–3 orchestrator: wires path state, paint, keyboard, and insert UI.
 *
 * Focus / ownership (Reading mode):
 * - No auto-focus on open — muted path only until the user enters the panel.
 * - Enter: Tab (tabindex=0), click, or hover (hover claims keys without stealing focus).
 * - Exit: click outside, Tab away (focusout), Escape.
 * - Ownership → `.is-keyboard-active` (live accent on the selected row).
 *
 * Paint:
 * - Path-only navigation patches classes; full paint when column structure changes.
 *
 * @param sectionId Stable id for keyboard focus (use section lineStart from the host).
 */
export function renderMillerUI(
	container: HTMLElement,
	rootNodes: MillerNode[],
	savedActivePath: number[],
	onToggle: (node: MillerNode) => void,
	onPathChange: (path: number[]) => void,
	onInsert: (text: string, afterLine: number, indent: string, kind: ItemKind) => void,
	sectionId = 0,
	onConvertKind?: (node: MillerNode) => void,
	onDelete?: (node: MillerNode, endLine: number, nextPath: number[]) => void
): void {
	// Keep wrapper element identity for remounts that reuse the same container.
	// Only clear children via paint; class list is managed here.
	if (!container.classList.contains('miller-columns-wrapper')) {
		container.empty();
		container.addClass('miller-columns-wrapper');
	}

	let activePath: MillerNode[] = restorePath(rootNodes, savedActivePath);

	const syncOwnershipChrome = (owned: boolean): void => {
		container.classList.toggle('is-keyboard-active', owned);
	};

	const claimKeyboard = (): void => {
		activateKeyboard(sectionId);
	};

	const commitPath = (path: MillerNode[]): void => {
		activePath = path;
		onPathChange(pathToLines(path));
	};

	const handlers = {
		onToggle,
		onActivateKeyboard: claimKeyboard,
		onSelect: (node: MillerNode, depth: number) => {
			const next = activePath.slice(0, depth);
			next.push(node);
			commitPath(next);
			render({ scrollActiveIntoView: isKeyboardActiveForSection(sectionId) });
		},
	};

	const render = (options: { forceFullPaint?: boolean; scrollActiveIntoView?: boolean } = {}): void => {
		paintTree(container, rootNodes, activePath, handlers, {
			forceFullPaint: options.forceFullPaint,
			scrollActiveIntoView:
				options.scrollActiveIntoView ?? isKeyboardActiveForSection(sectionId),
		});
	};

	const handleInsert = (isChild: boolean): void => {
		const placement = computeInsertPlacement(rootNodes, activePath, isChild);
		if (!placement) return;

		// Structure may gain an empty column for the input — full paint.
		render({ forceFullPaint: true, scrollActiveIntoView: false });
		openInsertInput(container, placement, (result) => {
			// Keep panel armed across input teardown + host rebuild (focusout used to drop us).
			claimKeyboard();
			const parentLines = isChild
				? pathToLines(activePath)
				: pathToLines(activePath.slice(0, -1));
			onPathChange([...parentLines, result.newItemLine]);
			onInsert(result.text, result.afterLine, result.indent, placement.kind);
		});
	};

	bindKeyboard(
		container,
		{
			onInsert: handleInsert,
			onConvertKind: () => {
				const seeded = seedPathIfEmpty(rootNodes, activePath);
				activePath = seeded.path;
				if (activePath.length === 0) return;
				if (seeded.seeded) {
					commitPath(activePath);
					render({ scrollActiveIntoView: true });
				}
				const focused = activePath[activePath.length - 1];
				if (focused) {
					claimKeyboard();
					onConvertKind?.(focused);
				}
			},
			onDelete: () => {
				const seeded = seedPathIfEmpty(rootNodes, activePath);
				activePath = seeded.path;
				if (activePath.length === 0) return;
				if (seeded.seeded) {
					commitPath(activePath);
					render({ scrollActiveIntoView: true });
				}
				const focused = activePath[activePath.length - 1];
				if (!focused || !onDelete) return;

				const endLine = lastDescendantLine(focused);
				const nextPath = computePathAfterDelete(rootNodes, activePath, focused);
				claimKeyboard();
				// Host mutates file + path store; nextPath already uses post-delete line numbers.
				onPathChange(nextPath);
				onDelete(focused, endLine, nextPath);
			},
			onToggleFocused: () => {
				const seeded = seedPathIfEmpty(rootNodes, activePath);
				activePath = seeded.path;
				if (activePath.length === 0) return;
				// Seed-only: show selection without tearing down if structure same.
				if (seeded.seeded) {
					commitPath(activePath);
					render({ scrollActiveIntoView: true });
				}
				const focused = activePath[activePath.length - 1];
				// Space only toggles tasks; plain items are structure-only.
				if (focused && focused.kind === 'task') onToggle(focused);
			},
			onNavigate: (key) => {
				const seeded = seedPathIfEmpty(rootNodes, activePath);
				activePath = seeded.path;
				if (activePath.length === 0) return;

				let newPath = activePath;

				if (key === 'ArrowDown' || key === 'ArrowUp') {
					const delta = key === 'ArrowDown' ? 1 : -1;
					newPath = navigateSibling(rootNodes, activePath, delta);
				} else if (key === 'ArrowRight') {
					newPath = navigateDescend(rootNodes, activePath);
				} else if (key === 'ArrowLeft' && activePath.length > 1) {
					newPath = navigateAscend(activePath);
				}

				if (newPath === activePath && !seeded.seeded) return;
				const sameLines =
					!seeded.seeded &&
					newPath.length === activePath.length &&
					newPath.every((n, i) => n.id === activePath[i]?.id);
				if (sameLines) return;

				commitPath(newPath);
				// Path change: patch when structure unchanged (j/k), rebuild when columns change (h/l).
				render({ scrollActiveIntoView: true });
			},
		},
		sectionId,
		{ onOwnershipChange: syncOwnershipChrome }
	);

	// Initial paint: show muted path; do not scroll unless already owned (remount).
	render({
		forceFullPaint: true,
		scrollActiveIntoView: isKeyboardActiveForSection(sectionId),
	});
	syncOwnershipChrome(isKeyboardActiveForSection(sectionId));
}

export { computeDefaultActivePath } from '../core/path';
