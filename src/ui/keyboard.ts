/**
 * Keyboard focus is keyed by section id (file lineStart), not by HTMLElement.
 * Obsidian often remounts post-processor DOM after vault.modify; container
 * identity dies, but the section is the same — focus must survive that.
 *
 * Ownership model (Reading mode):
 * - Enter: Tab/focusin, click (pointerdown inside), or hover (mouseenter, no focus steal)
 * - Exit: outside pointerdown, focus leaving the panel, Escape
 * - No auto-focus on first paint
 */

let activeSectionId: number | null = null;

/** One binding per section so remounts replace listeners instead of stacking them. */
const bindingsBySection = new Map<number, () => void>();

/** Chrome / UI listeners notified when ownership for a section changes. */
const ownershipListeners = new Map<number, (owned: boolean) => void>();

/** Live container for a section — used to blur on release / refocus after remount. */
const containersBySection = new Map<number, HTMLElement>();

export function isKeyboardActiveForSection(sectionId: number): boolean {
	return activeSectionId === sectionId;
}

/** Test helper: which section currently owns keyboard (null if none). */
export function getActiveKeyboardSectionId(): number | null {
	return activeSectionId;
}

export function activateKeyboard(sectionId: number): void {
	if (activeSectionId === sectionId) return;

	const previous = activeSectionId;
	activeSectionId = sectionId;

	if (previous !== null) {
		ownershipListeners.get(previous)?.(false);
	}
	ownershipListeners.get(sectionId)?.(true);
}

/**
 * Release keyboard ownership for a section and blur DOM focus if it lives inside the panel.
 */
export function deactivateKeyboard(sectionId: number, options: { blur?: boolean } = {}): void {
	const shouldBlur = options.blur !== false;
	const container = containersBySection.get(sectionId);

	if (activeSectionId === sectionId) {
		activeSectionId = null;
		ownershipListeners.get(sectionId)?.(false);
	}

	if (shouldBlur && container) {
		blurIfInside(container);
	}
}

function blurIfInside(container: HTMLElement): void {
	const active = document.activeElement;
	if (active instanceof HTMLElement && container.contains(active)) {
		active.blur();
	}
	if (document.activeElement === container) {
		container.blur();
	}
}

function focusPanel(container: HTMLElement): void {
	if (typeof container.focus !== 'function') return;
	// Don't yank focus away from an inner control (checkbox, insert field).
	const active = document.activeElement;
	if (active instanceof Node && container.contains(active) && active !== container) {
		return;
	}
	try {
		container.focus({ preventScroll: true });
	} catch {
		container.focus();
	}
}

/** Reset module state between tests. */
export function resetKeyboardFocusForTests(): void {
	for (const cleanup of bindingsBySection.values()) {
		cleanup();
	}
	bindingsBySection.clear();
	ownershipListeners.clear();
	containersBySection.clear();
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
	/** Enter / Shift+Enter → insert same kind as focus (sibling / child). */
	onInsert: (isChild: boolean) => void;
	/** Alt/Ctrl+Enter → flip focused row task ↔ plain. */
	onConvertKind: () => void;
	/** x or Ctrl/Cmd+Backspace → delete focused row (+ subtree). */
	onDelete: () => void;
};

export type BindKeyboardOptions = {
	/** Fired when this section gains or loses keyboard ownership (for panel chrome). */
	onOwnershipChange?: (owned: boolean) => void;
};

/**
 * Level 3: focus ownership + key → intent.
 * Supports arrow keys and vim hjkl (same motions).
 */
export function bindKeyboard(
	container: HTMLElement,
	handlers: KeyboardHandlers,
	sectionId: number,
	options: BindKeyboardOptions = {}
): void {
	const previous = bindingsBySection.get(sectionId);
	if (previous) previous();

	containersBySection.set(sectionId, container);

	if (options.onOwnershipChange) {
		ownershipListeners.set(sectionId, options.onOwnershipChange);
	} else {
		ownershipListeners.delete(sectionId);
	}

	// Real DOM focus target — Tab can enter the panel in Reading mode.
	container.tabIndex = 0;
	if (!container.getAttribute('role')) {
		container.setAttribute('role', 'region');
	}
	if (!container.getAttribute('aria-label')) {
		container.setAttribute('aria-label', 'Miller columns');
	}

	/** Hover / programmatic claim — does not move DOM focus (avoids scroll steal). */
	const claimWithoutFocus = (): void => {
		activateKeyboard(sectionId);
	};

	/** Click / Tab — claim and align DOM focus with the panel when safe. */
	const claimWithFocus = (): void => {
		activateKeyboard(sectionId);
		focusPanel(container);
	};

	const onMouseEnter = (): void => {
		claimWithoutFocus();
	};

	const onFocusIn = (): void => {
		// Tab or programmatic focus into the panel (or a child control).
		activateKeyboard(sectionId);
	};

	const onFocusOut = (event: FocusEvent): void => {
		const next = event.relatedTarget;
		// Only release when focus moves to a concrete node *outside* the panel
		// (e.g. Tab away). relatedTarget === null is common when the insert input
		// is removed after confirm — that must NOT drop ownership.
		if (!(next instanceof Node)) return;
		if (container.contains(next)) return;

		requestAnimationFrame(() => {
			if (!container.isConnected) return;
			if (activeSectionId !== sectionId) return;
			const active = document.activeElement;
			if (active instanceof Node && container.contains(active)) return;
			deactivateKeyboard(sectionId, { blur: false });
		});
	};

	const onPointerDownInside = (event: PointerEvent): void => {
		if (event.button !== 0) return;
		const target = event.target;
		// Let real controls take focus themselves; still claim ownership.
		if (
			target instanceof HTMLElement &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
		) {
			claimWithoutFocus();
			return;
		}
		claimWithFocus();
	};

	const deactivateOnOutsidePointerDown = (event: PointerEvent): void => {
		if (activeSectionId !== sectionId) return;
		const target = event.target;
		if (!(target instanceof Node) || container.contains(target)) return;
		deactivateKeyboard(sectionId, { blur: true });
	};

	const isTypingInField = (target: EventTarget | null): boolean => {
		if (!(target instanceof HTMLElement)) return false;
		if (!container.contains(target)) return false;
		const tag = target.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
	};

	const isEnterKey = (e: KeyboardEvent): boolean =>
		e.code === 'Enter' ||
		e.code === 'NumpadEnter' ||
		e.key === 'Enter' ||
		e.key === 'NumpadEnter';

	/** Prefer Control on macOS — pure ⌥+Enter is often swallowed by the OS/app. */
	const wantsConvertKind = (e: KeyboardEvent): boolean => {
		if (e.ctrlKey || e.altKey) return true;
		try {
			if (e.getModifierState?.('Alt') || e.getModifierState?.('AltGraph')) return true;
		} catch {
			/* ignore */
		}
		return false;
	};

	// Dedupe when the same event hits both window and container capture listeners.
	const handledKeys = new WeakSet<KeyboardEvent>();

	const keyHandler = (e: KeyboardEvent): void => {
		if (handledKeys.has(e)) return;

		if (!container.isConnected) {
			cleanupListeners();
			return;
		}

		if (activeSectionId !== sectionId) return;

		// Let the inline insert field (and any future inputs) handle their own keys.
		if (isTypingInField(e.target)) return;

		const { key } = e;

		// Enter family (Cmd+Enter left for Obsidian):
		// - Enter / Shift+Enter → insert same kind (sibling / child)
		// - Alt|Ctrl+Enter → convert focused item task ↔ plain
		if (isEnterKey(e)) {
			if (e.metaKey) return;
			handledKeys.add(e);
			e.preventDefault();
			e.stopPropagation();
			if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

			if (wantsConvertKind(e)) {
				handlers.onConvertKind();
				return;
			}
			handlers.onInsert(e.shiftKey);
			return;
		}

		// Delete: vim `x`, Delete key, or Ctrl/Cmd+Backspace (before generic mod bail-out).
		if ((key === 'x' || key === 'X') && !e.ctrlKey && !e.metaKey && !e.altKey) {
			handledKeys.add(e);
			e.preventDefault();
			e.stopPropagation();
			handlers.onDelete();
			return;
		}

		if (key === 'Delete' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			handledKeys.add(e);
			e.preventDefault();
			e.stopPropagation();
			handlers.onDelete();
			return;
		}

		if (key === 'Backspace' && (e.ctrlKey || e.metaKey)) {
			handledKeys.add(e);
			e.preventDefault();
			e.stopPropagation();
			if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
			handlers.onDelete();
			return;
		}

		// Don't steal other browser / Obsidian chord shortcuts.
		if (e.ctrlKey || e.metaKey || e.altKey) return;

		if (key === 'Escape') {
			handledKeys.add(e);
			e.preventDefault();
			e.stopPropagation();
			deactivateKeyboard(sectionId, { blur: true });
			return;
		}

		if (key === ' ') {
			handledKeys.add(e);
			e.preventDefault();
			e.stopPropagation();
			handlers.onToggleFocused();
			return;
		}

		// Shift+h/j/k/l left alone (not vim motions we implement).
		if (e.shiftKey && key.length === 1) return;

		const navKey = normalizeNavKey(key);
		if (!navKey) return;

		handledKeys.add(e);
		e.preventDefault();
		e.stopPropagation();
		handlers.onNavigate(navKey);
	};

	const cleanupListeners = (): void => {
		container.removeEventListener('mouseenter', onMouseEnter);
		container.removeEventListener('focusin', onFocusIn);
		container.removeEventListener('focusout', onFocusOut);
		container.removeEventListener('pointerdown', onPointerDownInside);
		container.removeEventListener('keydown', keyHandler, true);
		document.removeEventListener('pointerdown', deactivateOnOutsidePointerDown, true);
		document.removeEventListener('keydown', keyHandler, true);
		window.removeEventListener('keydown', keyHandler, true);
		if (bindingsBySection.get(sectionId) === cleanupListeners) {
			bindingsBySection.delete(sectionId);
		}
		if (containersBySection.get(sectionId) === container) {
			containersBySection.delete(sectionId);
		}
	};

	container.addEventListener('mouseenter', onMouseEnter);
	container.addEventListener('focusin', onFocusIn);
	container.addEventListener('focusout', onFocusOut);
	container.addEventListener('pointerdown', onPointerDownInside);
	// Capture on window + document + panel — pure ⌥+Enter is often eaten before bubble.
	container.addEventListener('keydown', keyHandler, true);
	document.addEventListener('pointerdown', deactivateOnOutsidePointerDown, true);
	document.addEventListener('keydown', keyHandler, true);
	window.addEventListener('keydown', keyHandler, true);
	bindingsBySection.set(sectionId, cleanupListeners);

	// Remount: section still owns keyboard → re-apply chrome; restore DOM focus if nothing else focused.
	if (activeSectionId === sectionId) {
		options.onOwnershipChange?.(true);
		const active = document.activeElement;
		const focusLost =
			!(active instanceof Node) ||
			active === document.body ||
			!document.contains(active);
		if (focusLost) {
			focusPanel(container);
		}
	} else {
		options.onOwnershipChange?.(false);
	}
}
