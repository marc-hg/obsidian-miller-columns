import { computeDefaultActivePath, DEFAULT_EXPAND_DEPTH } from '../core/path';
import { MillerNode } from '../core/types';

/**
 * Level 2: per-section selected path (keyed by section lineStart).
 * Survives Obsidian re-renders of the post-processor DOM.
 */
export class PathStore {
	private readonly bySection = new Map<number, number[]>();

	get(sectionStart: number): number[] {
		return this.bySection.get(sectionStart) ?? [];
	}

	set(sectionStart: number, pathLines: number[]): void {
		this.bySection.set(sectionStart, pathLines);
	}

	/**
	 * Returns stored path, or computes and persists a default first-branch path.
	 */
	resolveOrDefault(
		sectionStart: number,
		tree: MillerNode[],
		maxDepth = DEFAULT_EXPAND_DEPTH
	): number[] {
		let path = this.get(sectionStart);
		if (path.length === 0) {
			path = computeDefaultActivePath(tree, maxDepth);
			if (path.length > 0) {
				this.set(sectionStart, path);
			}
		}
		return path;
	}
}
