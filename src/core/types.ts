/** Level 0: one node in the nested checklist tree. */
export interface MillerNode {
	id: string;
	text: string;
	isCompleted: boolean;
	/** Absolute line in the source file (used for mutation). */
	originalLine: number;
	children: MillerNode[];
}
