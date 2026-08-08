/**
 * Keyboard focus is keyed by section id (file lineStart), not by HTMLElement.
 * Obsidian often remounts post-processor DOM after vault.modify; container
 * identity dies, but the section is the same — focus must survive that.
 */

let activeSectionId: number | null = null;

/** One binding per section so remounts replace listeners instead of stacking them. */
const bindingsBySection = new Map<number, () => void>();

export function isKeyboardActiveForSection(sectionId: number): boolean {
	return activeSectionId === sectionId;
}

/** Test helper: which section currently owns keyboard (null if none). */
export function getActiveKeyboardSectionId(): number | null {
	return activeSectionId;
}

export function activateKeyboard(sectionId: number): void {
	activeSectionId = sectionId;
}

export function deactivateKeyboard(sectionId: number): void {
	if (activeSectionId === sectionId) {
		activeSectionId = null;
	}
}

/** Reset module state between tests. */
export function resetKeyboardFocusForTests(): void {
	for (const cleanup of bindingsBySection.values()) {
		cleanup();
	}
	bindingsBySection.clear();
	activeSectionId = null;
}

export type NavKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/**
 * Map arrow keys and vim hjkl onto a single navigation vocabulary.
 * Case-insensitive for single letters (Caps Lock).
 */
export function normalizeNavKey(key: string): NavKey | null {
	const k = key.length === 1 ? key.toLowerCase() : key;
	switch (k) {
		case 'ArrowUp':
		case 'k':
			return 'ArrowUp';
		case 'ArrowDown':
		case 'j':
			return 'ArrowDown';
		case 'ArrowLeft':
		case 'h':
			return 'ArrowLeft';
		case 'ArrowRight':
		case 'l':
			return 'ArrowRight';
		default:
			return null;
	}
}

export type KeyboardHandlers = {
	onNavigate: (key: NavKey) => void;
	onToggleFocused: () => void;
	onInsert: (isChild: boolean) => void;
};

/**
 * Level 3: focus ownership + key → intent.
 * Mouseleave does not deactivate. Outside pointerdown does.
 * Supports arrow keys and vim hjkl (same motions).
 */
export function bindKeyboard(
	container: HTMLElement,
	handlers: KeyboardHandlers,
	sectionId: number
): void {
	const previous = bindingsBySection.get(sectionId);
	if (previous) previous();

	const onActivate = (): void => {
		activateKeyboard(sectionId);
	};

	const deactivateOnOutsidePointerDown = (event: PointerEvent): void => {
		if (activeSectionId !== sectionId) return;
		const target = event.target;
		if (!(target instanceof Node) || container.contains(target)) return;
		deactivateKeyboard(sectionId);
	};

	const keyHandler = (e: KeyboardEvent): void => {
		if (!container.isConnected) {
			cleanupListeners();
			return;
		}

		if (activeSectionId !== sectionId) return;

		// Don't steal browser / Obsidian chord shortcuts.
		if (e.ctrlKey || e.metaKey || e.altKey) return;

		const { key } = e;

		if (key === 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			handlers.onInsert(e.shiftKey);
			return;
		}

		if (key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			handlers.onToggleFocused();
			return;
		}

		// Shift+h/j/k/l left alone (not vim motions we implement).
		if (e.shiftKey && key.length === 1) return;

		const navKey = normalizeNavKey(key);
		if (!navKey) return;

		e.preventDefault();
		e.stopPropagation();
		handlers.onNavigate(navKey);
	};

	const cleanupListeners = (): void => {
		container.removeEventListener('mouseenter', onActivate);
		container.removeEventListener('focusin', onActivate);
		document.removeEventListener('pointerdown', deactivateOnOutsidePointerDown, true);
		document.removeEventListener('keydown', keyHandler);
		if (bindingsBySection.get(sectionId) === cleanupListeners) {
			bindingsBySection.delete(sectionId);
		}
	};

	container.addEventListener('mouseenter', onActivate);
	container.addEventListener('focusin', onActivate);
	document.addEventListener('pointerdown', deactivateOnOutsidePointerDown, true);
	document.addEventListener('keydown', keyHandler);
	bindingsBySection.set(sectionId, cleanupListeners);
}
