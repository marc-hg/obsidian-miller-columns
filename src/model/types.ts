// 1. Define our Data Structure

export interface MillerNode {
	id: string;
	text: string;
	isCompleted: boolean;
	originalLine: number;
	children: MillerNode[];
}

