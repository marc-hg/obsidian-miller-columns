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

const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter']);

export type KeyboardHandlers = {
	onNavigate: (key: string) => void;
	onToggleFocused: () => void;
	onInsert: (isChild: boolean) => void;
};

/**
 * Level 3: focus ownership + key → intent.
 * Mouseleave does not deactivate. Outside pointerdown does.
 * Rebind / remount keeps focus if this sectionId was already active.
 */
export function bindKeyboard(
	container: HTMLElement,
	handlers: KeyboardHandlers,
	sectionId: number
): void {
	// Drop previous listeners for this section (same container rebind OR Obsidian remount).
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
			// DOM remounted or note closed — drop dead listeners only.
			// Keep activeSectionId so a remount of the same section stays live.
			cleanupListeners();
			return;
		}

		if (activeSectionId !== sectionId) return;

		const { key } = e;
		if (!NAV_KEYS.has(key)) return;

		e.preventDefault();
		e.stopPropagation();

		if (key === 'Enter') {
			handlers.onInsert(e.shiftKey);
			return;
		}

		if (key === ' ') {
			handlers.onToggleFocused();
			return;
		}

		handlers.onNavigate(key);
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
