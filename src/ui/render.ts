import {
	computeInsertPlacement,
	navigateAscend,
	navigateDescend,
	navigateSibling,
	pathToLines,
	restorePath,
	seedPathIfEmpty,
} from '../core/path';
import { MillerNode } from '../core/types';
import { openInsertInput } from './insert-input';
import { activateKeyboard, bindKeyboard } from './keyboard';
import { paintTree } from './paint';

/**
 * Level 2–3 orchestrator: wires path state, paint, keyboard, and insert UI.
 *
 * @param sectionId Stable id for keyboard focus (use section lineStart from the host).
 *   Survives Obsidian remounting the post-processor DOM under a new container.
 */
export function renderMillerUI(
	container: HTMLElement,
	rootNodes: MillerNode[],
	savedActivePath: number[],
	onToggle: (node: MillerNode) => void,
	onPathChange: (path: number[]) => void,
	onInsert: (text: string, afterLine: number, indent: string) => void,
	sectionId = 0
): void {
	container.empty();
	container.addClass('miller-columns-wrapper');

	let activePath: MillerNode[] = restorePath(rootNodes, savedActivePath);

	const commitPath = (path: MillerNode[]): void => {
		activePath = path;
		onPathChange(pathToLines(path));
	};

	const claimKeyboard = (): void => {
		activateKeyboard(sectionId);
	};

	const render = (): void => {
		paintTree(container, rootNodes, activePath, {
			onToggle,
			onActivateKeyboard: claimKeyboard,
			onSelect: (node, depth) => {
				const next = activePath.slice(0, depth);
				next.push(node);
				commitPath(next);
				render();
			},
		});
	};

	const handleInsert = (isChild: boolean): void => {
		const placement = computeInsertPlacement(rootNodes, activePath, isChild);
		if (!placement) return;

		render();
		openInsertInput(container, placement, (result) => {
			const parentLines = isChild
				? pathToLines(activePath)
				: pathToLines(activePath.slice(0, -1));
			onPathChange([...parentLines, result.newItemLine]);
			onInsert(result.text, result.afterLine, result.indent);
		});
	};

	bindKeyboard(
		container,
		{
			onInsert: handleInsert,
			onToggleFocused: () => {
				const seeded = seedPathIfEmpty(rootNodes, activePath);
				activePath = seeded.path;
				if (activePath.length === 0) return;
				const focused = activePath[activePath.length - 1];
				if (focused) onToggle(focused);
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
				render();
			},
		},
		sectionId
	);

	render();
}

export { computeDefaultActivePath } from '../core/path';
