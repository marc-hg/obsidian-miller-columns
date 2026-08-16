/** Level 0: one node in the nested list tree. */

/** Task = markdown checkbox; plain = normal `-` bullet (no checkbox). */
export type ItemKind = 'task' | 'plain';

export interface MillerNode {
	id: string;
	text: string;
	kind: ItemKind;
	/** Meaningful for tasks; always false for plain items. */
	isCompleted: boolean;
	/** Absolute line in the source file (used for mutation). */
	originalLine: number;
	/** Leading whitespace from the source line. Empty for roots; omitted in some tests. */
	indent?: string;
	children: MillerNode[];
}
