import { describe, it, expect, vi } from 'vitest';
import { renderMillerUI, computeDefaultActivePath } from '../ui/render';
import { MillerNode } from '../core/types';

function makeNode(text: string, children: MillerNode[] = [], isCompleted = false, originalLine = 0): MillerNode {
    return { id: crypto.randomUUID(), text, kind: 'task', isCompleted, originalLine, children };
}

const noop = () => {};

describe('renderMillerUI', () => {
    it('renders one column for flat list', () => {
        const container = document.createElement('div');
        renderMillerUI(container, [makeNode('A'), makeNode('B')], [], noop, noop, noop);

        expect(container.querySelectorAll('.miller-column').length).toBe(1);
        expect(container.querySelectorAll('.miller-item').length).toBe(2);
    });

    it('renders second column after clicking node with children', () => {
        const container = document.createElement('div');
        const nodes = [makeNode('Parent', [makeNode('Child')])];
        renderMillerUI(container, nodes, [], noop, noop, noop);

        (container.querySelector('.miller-item') as HTMLElement).click();

        expect(container.querySelectorAll('.miller-column').length).toBe(2);
        expect(container.querySelector('.miller-item.is-active')).not.toBeNull();
    });

    it('marks clicked node as active', () => {
        const container = document.createElement('div');
        renderMillerUI(container, [makeNode('A'), makeNode('B')], [], noop, noop, noop);

        (container.querySelectorAll('.miller-item')[1] as HTMLElement).click();

        const items = container.querySelectorAll('.miller-item');
        expect((items[1] as HTMLElement).classList.contains('is-active')).toBe(true);
        expect((items[0] as HTMLElement).classList.contains('is-active')).toBe(false);
    });

    it('fires onToggle with correct node when checkbox clicked', () => {
        const container = document.createElement('div');
        const node = makeNode('Task');
        const onToggle = vi.fn();
        renderMillerUI(container, [node], [], onToggle, noop, noop);

        (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

        expect(onToggle).toHaveBeenCalledOnce();
        expect(onToggle).toHaveBeenCalledWith(node);
    });

    it('reflects isCompleted state on checkbox', () => {
        const container = document.createElement('div');
        renderMillerUI(container, [makeNode('Done', [], true)], [], noop, noop, noop);

        const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
    });

    it('restores active path from savedActivePath', () => {
        const container = document.createElement('div');
        const child = makeNode('Child', [], false, 2);
        const parent = makeNode('Parent', [child], false, 1);
        renderMillerUI(container, [parent], [1], noop, noop, noop);

        expect(container.querySelectorAll('.miller-column').length).toBe(2);
        expect(container.querySelector('.miller-item.is-active')).not.toBeNull();
    });

    it('calls onPathChange with originalLine array when node clicked', () => {
        const container = document.createElement('div');
        const node = makeNode('A', [], false, 5);
        const onPathChange = vi.fn();
        renderMillerUI(container, [node], [], noop, onPathChange, noop);

        (container.querySelector('.miller-item') as HTMLElement).click();

        expect(onPathChange).toHaveBeenCalledWith([5]);
    });

    it('shows chevron only on nodes that have children', () => {
        const container = document.createElement('div');
        const leaf = makeNode('Leaf', [], false, 2);
        const parent = makeNode('Parent', [leaf], false, 1);
        renderMillerUI(container, [parent, makeNode('AlsoLeaf', [], false, 3)], [], noop, noop, noop);

        const items = container.querySelectorAll('.miller-item');
        expect(items[0]?.classList.contains('has-children')).toBe(true);
        expect(items[0]?.querySelector('.miller-item-chevron')?.textContent).toBe('›');
        expect(items[1]?.classList.contains('has-children')).toBe(false);
        expect(items[1]?.querySelector('.miller-item-chevron')).toBeNull();
    });

    it('hides chevrons when showChevrons is false', () => {
        const container = document.createElement('div');
        const parent = makeNode('Parent', [makeNode('Leaf', [], false, 2)], false, 1);
        renderMillerUI(container, [parent], [], noop, noop, noop, 0, undefined, undefined, {
            showChevrons: false,
        });

        expect(container.querySelector('.miller-item')?.classList.contains('has-children')).toBe(true);
        expect(container.querySelector('.miller-item-chevron')).toBeNull();
    });

    it('renders checkbox only for task nodes, never for plain', () => {
        const container = document.createElement('div');
        const plain: MillerNode = {
            id: crypto.randomUUID(),
            text: 'Folder',
            kind: 'plain',
            isCompleted: false,
            originalLine: 1,
            children: [],
        };
        const task = makeNode('Task', [], false, 2);
        renderMillerUI(container, [plain, task], [], noop, noop, noop);

        const items = container.querySelectorAll('.miller-item');
        expect(items[0]?.classList.contains('is-plain')).toBe(true);
        expect(items[0]?.querySelector('input[type="checkbox"]')).toBeNull();
        expect(items[0]?.querySelector('.miller-item-bullet')?.textContent).toBe('•');
        expect(items[1]?.querySelector('input[type="checkbox"]')).not.toBeNull();
        expect(items[1]?.querySelector('.miller-item-bullet')).toBeNull();
    });

    it('renders **bold** in labels as <strong> and hides the markers', () => {
        const container = document.createElement('div');
        renderMillerUI(
            container,
            [makeNode('**Dimensions:** 10 meters wide')],
            [],
            noop,
            noop,
            noop
        );

        const label = container.querySelector('.miller-item-label');
        expect(label?.textContent).toBe('Dimensions: 10 meters wide');
        expect(label?.querySelector('strong')?.textContent).toBe('Dimensions:');
        expect(label?.textContent).not.toContain('**');
    });

    it('Space on plain focused item does not call onToggle', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const plain: MillerNode = {
            id: crypto.randomUUID(),
            text: 'Folder',
            kind: 'plain',
            isCompleted: false,
            originalLine: 1,
            children: [],
        };
        const onToggle = vi.fn();
        renderMillerUI(container, [plain], [1], onToggle, noop, noop);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));

        expect(onToggle).not.toHaveBeenCalled();
        document.body.removeChild(container);
    });

    it('insert inherits plain kind from focused plain item', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const plain: MillerNode = {
            id: crypto.randomUUID(),
            text: 'Folder',
            kind: 'plain',
            isCompleted: false,
            originalLine: 5,
            children: [],
        };
        const onInsert = vi.fn();
        renderMillerUI(container, [plain], [5], noop, noop, onInsert);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        document.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        );
        const input = container.querySelector('input.miller-new-item-input') as HTMLInputElement;
        input.value = 'new';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(onInsert).toHaveBeenCalledWith('new', 5, '', 'plain');
        document.body.removeChild(container);
    });

    it('x deletes focused item via onDelete', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const a = makeNode('A', [], false, 1);
        const b = makeNode('B', [], false, 2);
        const onDelete = vi.fn();
        const onPathChange = vi.fn();
        renderMillerUI(container, [a, b], [2], noop, onPathChange, noop, 0, noop, onDelete);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        document.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true })
        );

        expect(onDelete).toHaveBeenCalledWith(b, 2, [1]);
        expect(onPathChange).toHaveBeenCalledWith([1]);
        document.body.removeChild(container);
    });

    it('Ctrl+Backspace deletes focused item', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const a = makeNode('A', [], false, 1);
        const onDelete = vi.fn();
        renderMillerUI(container, [a], [1], noop, noop, noop, 0, noop, onDelete);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        document.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'Backspace',
                ctrlKey: true,
                bubbles: true,
                cancelable: true,
            })
        );

        expect(onDelete).toHaveBeenCalledWith(a, 1, []);
        document.body.removeChild(container);
    });

    it('Delete key deletes focused item', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const a = makeNode('A', [], false, 1);
        const b = makeNode('B', [], false, 2);
        const onDelete = vi.fn();
        renderMillerUI(container, [a, b], [1], noop, noop, noop, 0, noop, onDelete);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        document.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })
        );

        // Next sibling B was on line 2; after deleting A it becomes line 1.
        expect(onDelete).toHaveBeenCalledWith(a, 1, [1]);
        document.body.removeChild(container);
    });

    it('Ctrl+Enter converts focused task via onConvertKind (not insert)', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const task = makeNode('Task', [], false, 5);
        const onInsert = vi.fn();
        const onConvert = vi.fn();
        renderMillerUI(container, [task], [5], noop, noop, onInsert, 0, onConvert);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        document.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                ctrlKey: true,
                bubbles: true,
                cancelable: true,
            })
        );

        expect(onInsert).not.toHaveBeenCalled();
        expect(onConvert).toHaveBeenCalledWith(task);
        expect(container.querySelector('input.miller-new-item-input')).toBeNull();
        document.body.removeChild(container);
    });

    it('Ctrl+Shift+Enter converts focused item (does not open insert)', () => {
        // Shift is ignored for convert — any Ctrl/Alt+Enter flips kind only.
        const container = document.createElement('div');
        document.body.appendChild(container);
        const task = makeNode('Task', [], false, 5);
        const onInsert = vi.fn();
        const onConvert = vi.fn();
        renderMillerUI(container, [task], [5], noop, noop, onInsert, 0, onConvert);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        document.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                ctrlKey: true,
                shiftKey: true,
                bubbles: true,
                cancelable: true,
            })
        );

        expect(onInsert).not.toHaveBeenCalled();
        expect(onConvert).toHaveBeenCalledWith(task);
        document.body.removeChild(container);
    });

    it('confirming insert keeps keyboard ownership chrome', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const task = makeNode('Task', [], false, 5);
        // Simulate host rebuild: onInsert re-mounts UI on same container with ownership still active.
        const mount = (path: number[] = [5]) => {
            renderMillerUI(
                container,
                [task],
                path,
                noop,
                noop,
                () => {
                    mount([6]);
                }
            );
        };
        mount();
        container.dispatchEvent(new MouseEvent('mouseenter'));
        expect(container.classList.contains('is-keyboard-active')).toBe(true);

        document.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        );
        const input = container.querySelector('input.miller-new-item-input') as HTMLInputElement;
        input.value = 'next';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(container.classList.contains('is-keyboard-active')).toBe(true);
        document.body.removeChild(container);
    });

    it('auto-path shows muted selection without keyboard ownership chrome', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], false, 2);
        const parent = makeNode('Parent', [child], false, 1);
        renderMillerUI(container, [parent], [1], noop, noop, noop);

        expect(container.classList.contains('is-keyboard-active')).toBe(false);
        expect(container.querySelector('.miller-item.is-active')).not.toBeNull();

        document.body.removeChild(container);
    });

    it('hover claims keyboard and adds is-keyboard-active; outside click releases', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], false, 1)], [1], noop, noop, noop);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        expect(container.classList.contains('is-keyboard-active')).toBe(true);

        document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(container.classList.contains('is-keyboard-active')).toBe(false);

        document.body.removeChild(container);
    });

    it('panel is tabbable and focus claims keyboard ownership', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], false, 1)], [1], noop, noop, noop);

        expect(container.tabIndex).toBe(0);
        container.focus();
        container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

        expect(container.classList.contains('is-keyboard-active')).toBe(true);

        document.body.removeChild(container);
    });

    it('Escape releases keyboard ownership', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], false, 1)], [1], noop, noop, noop);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        expect(container.classList.contains('is-keyboard-active')).toBe(true);

        document.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
        );
        expect(container.classList.contains('is-keyboard-active')).toBe(false);

        document.body.removeChild(container);
    });

    it('does not auto-claim keyboard on first paint', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(
            container,
            [makeNode('Parent', [makeNode('Child', [], false, 2)], false, 1)],
            [1],
            noop,
            noop,
            noop
        );

        expect(container.classList.contains('is-keyboard-active')).toBe(false);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        // Still on muted path — no navigation without claim
        expect(container.querySelector('.miller-item.is-active span')?.textContent).toBe('Parent');

        document.body.removeChild(container);
    });

    it('sibling navigation reuses DOM nodes (no full rebuild flicker path)', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(
            container,
            [makeNode('A', [], false, 1), makeNode('B', [], false, 2)],
            [1],
            noop,
            noop,
            noop
        );

        container.dispatchEvent(new MouseEvent('mouseenter'));
        const before = container.querySelector('.miller-item');
        expect(before).not.toBeNull();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        const after = container.querySelectorAll('.miller-item')[1];
        // Same list items still in the DOM; structure patch only toggles is-active.
        expect(container.querySelectorAll('.miller-item')[0]).toBe(before);
        expect(after?.classList.contains('is-active')).toBe(true);

        document.body.removeChild(container);
    });
});

describe('computeDefaultActivePath', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    it('returns empty array for empty tree', () => {
        expect(computeDefaultActivePath([])).toEqual([]);
    });

    it('follows first child up to maxDepth (targeting 3 columns)', () => {
        const grandchild = makeNode('Grandchild', [], 20);
        const child = makeNode('Child', [grandchild], 10);
        const root = makeNode('Root', [child, makeNode('Other')], 0);

        // maxDepth=2 → path length 2 → up to 3 columns visible
        const path = computeDefaultActivePath([root], 2);
        expect(path).toEqual([0, 10]);
    });

    it('stops early when a node has no children', () => {
        const root = makeNode('Root', [makeNode('Child', [], 5)], 0);

        // Child is a leaf → we do not select it (would produce an empty 3rd column)
        const path = computeDefaultActivePath([root], 2);
        expect(path).toEqual([0]);
    });

    it('defaults to maxDepth=2 when not specified', () => {
        const level2 = makeNode('L2', [], 2);
        const level1 = makeNode('L1', [level2], 1);
        const root = makeNode('Root', [level1], 0);

        const path = computeDefaultActivePath([root]);
        expect(path).toEqual([0, 1]);
    });
});


describe('keyboard navigation — →/← column depth', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    function hover(container: HTMLElement): void {
        container.dispatchEvent(new MouseEvent('mouseenter'));
    }

    function key(k: string): void {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    }

    function colCount(container: HTMLElement): number {
        return container.querySelectorAll('.miller-column').length;
    }

    function activeText(container: HTMLElement): string | null {
        return container.querySelector('.miller-item.is-active span')?.textContent ?? null;
    }

    it('[tracer] Parent selected + ArrowRight → 2 columns, Child is-active', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        renderMillerUI(container, [parent], [1], noop, noop, noop);

        hover(container);
        key('ArrowRight');

        const activeItems = container.querySelectorAll('.miller-item.is-active');
        expect(colCount(container)).toBe(2);
        expect(activeItems[activeItems.length - 1]?.querySelector('span')?.textContent).toBe('Child');
        document.body.removeChild(container);
    });

    it('leaf selected + ArrowRight → column count unchanged', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('Leaf', [], 1)], [1], noop, noop, noop);

        hover(container);
        key('ArrowRight');

        expect(colCount(container)).toBe(1);
        document.body.removeChild(container);
    });

    it('root depth + ArrowLeft → no change, no crash', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1)], [1], noop, noop, noop);

        hover(container);
        key('ArrowLeft');

        expect(colCount(container)).toBe(1);
        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });

    it('2-deep + ArrowLeft → column count decreases, parent is-active', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        renderMillerUI(container, [parent], [1, 2], noop, noop, noop);

        hover(container);
        key('ArrowLeft');

        expect(colCount(container)).toBe(2);
        expect(activeText(container)).toBe('Parent');
        document.body.removeChild(container);
    });

    it('empty path + ArrowRight → guard selects root, descends to child', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], 2);
        const root = makeNode('Root', [child], 1);
        renderMillerUI(container, [root], [], noop, noop, noop);

        hover(container);
        key('ArrowRight');

        expect(colCount(container)).toBe(2);
        document.body.removeChild(container);
    });

    it('empty path + ArrowLeft → guard selects root[0], left is no-op at root', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('Root', [], 1)], [], noop, noop, noop);

        hover(container);
        key('ArrowLeft');

        expect(activeText(container)).toBe('Root');
        expect(colCount(container)).toBe(1);
        document.body.removeChild(container);
    });
});

describe('keyboard navigation — vim hjkl mirrors arrows', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    function hover(container: HTMLElement): void {
        container.dispatchEvent(new MouseEvent('mouseenter'));
    }

    function key(k: string): void {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    }

    function activeText(container: HTMLElement): string | null {
        return container.querySelector('.miller-item.is-active span')?.textContent ?? null;
    }

    it('j moves down like ArrowDown', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [1], noop, noop, noop);

        hover(container);
        key('j');

        expect(activeText(container)).toBe('B');
        document.body.removeChild(container);
    });

    it('k moves up like ArrowUp', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [2], noop, noop, noop);

        hover(container);
        key('k');

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });

    it('l descends like ArrowRight', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        renderMillerUI(container, [parent], [1], noop, noop, noop);

        hover(container);
        key('l');

        const activeItems = container.querySelectorAll('.miller-item.is-active');
        expect(activeItems[activeItems.length - 1]?.querySelector('span')?.textContent).toBe('Child');
        document.body.removeChild(container);
    });

    it('h ascends like ArrowLeft', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        renderMillerUI(container, [parent], [1, 2], noop, noop, noop);

        hover(container);
        key('h');

        expect(activeText(container)).toBe('Parent');
        document.body.removeChild(container);
    });

    it('H (caps) behaves like h', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        renderMillerUI(container, [parent], [1, 2], noop, noop, noop);

        hover(container);
        key('H');

        expect(activeText(container)).toBe('Parent');
        document.body.removeChild(container);
    });

    it('ctrl+j is ignored (does not steal chords)', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const onPathChange = vi.fn();
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [1], noop, onPathChange, noop);

        hover(container);
        document.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'j', ctrlKey: true, bubbles: true, cancelable: true })
        );

        expect(onPathChange).not.toHaveBeenCalled();
        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });
});

describe('keyboard navigation — ↑/↓ within column', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    function hover(container: HTMLElement): void {
        container.dispatchEvent(new MouseEvent('mouseenter'));
    }

    function key(k: string): void {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    }

    function activeText(container: HTMLElement): string | null {
        return container.querySelector('.miller-item.is-active span')?.textContent ?? null;
    }

    it('[tracer] A selected + ArrowDown → B is-active', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const a = makeNode('A', [], 1);
        const b = makeNode('B', [], 2);
        renderMillerUI(container, [a, b], [1], noop, noop, noop);

        hover(container);
        key('ArrowDown');

        expect(activeText(container)).toBe('B');
        document.body.removeChild(container);
    });

    it('empty path + ArrowDown → guard initializes to A, then moves to B', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [], noop, noop, noop);

        hover(container);
        key('ArrowDown');

        expect(activeText(container)).toBe('B');
        document.body.removeChild(container);
    });

    it('B selected (last) + ArrowDown → B stays (clamp)', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [2], noop, noop, noop);

        hover(container);
        key('ArrowDown');

        expect(activeText(container)).toBe('B');
        document.body.removeChild(container);
    });

    it('A selected (first) + ArrowUp → A stays (clamp)', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [1], noop, noop, noop);

        hover(container);
        key('ArrowUp');

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });

    it('B selected + ArrowUp → A is-active', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [2], noop, noop, noop);

        hover(container);
        key('ArrowUp');

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });

    it('single item + ArrowDown → stays on single item', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1)], [1], noop, noop, noop);

        hover(container);
        key('ArrowDown');

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });

    it('single item + ArrowUp → stays on single item', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1)], [1], noop, noop, noop);

        hover(container);
        key('ArrowUp');

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });
});

describe('active-panel keyboard navigation (Phase 1 acceptance)', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    function activeText(container: HTMLElement): string | null {
        return container.querySelector('.miller-item.is-active span')?.textContent ?? null;
    }

    it('ArrowDown on document after hover activation selects first item', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [], noop, noop, noop);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        // guard initializes to A (index 0), ArrowDown moves to B (index 1)
        const active = container.querySelector('.miller-item.is-active');
        expect(active).not.toBeNull();
        expect(active?.querySelector('span')?.textContent).toBe('B');
        document.body.removeChild(container);
    });

    it('arrow keys on document have no effect before panel activation', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A'), makeNode('B')], [], noop, noop, noop);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        expect(container.querySelectorAll('.miller-item.is-active').length).toBe(0);
        document.body.removeChild(container);
    });

    it('keyboard navigation keeps working after hover activation and mouseleave', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [1], noop, noop, noop);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        container.dispatchEvent(new MouseEvent('mouseleave'));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        expect(activeText(container)).toBe('B');
        document.body.removeChild(container);
    });

    it('keyboard navigation keeps working after selecting a panel and moving the pointer away', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [1], noop, noop, noop);

        const selectedItem = container.querySelector('.miller-item.is-active');
        if (!(selectedItem instanceof HTMLElement)) throw new Error('Expected active item');
        selectedItem.click();
        container.dispatchEvent(new MouseEvent('mouseleave'));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        expect(activeText(container)).toBe('B');
        document.body.removeChild(container);
    });

    it('outside pointer activation releases keyboard ownership', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [1], noop, noop, noop);

        const selectedItem = container.querySelector('.miller-item.is-active');
        if (!(selectedItem instanceof HTMLElement)) throw new Error('Expected active item');
        selectedItem.click();
        document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });
});

describe('keyboard navigation — Space toggle', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    function hover(container: HTMLElement): void {
        container.dispatchEvent(new MouseEvent('mouseenter'));
    }

    it('[tracer] hovered + node selected + Space → onToggle called, defaultPrevented', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const node = makeNode('A', [], 1);
        const onToggle = vi.fn();
        renderMillerUI(container, [node], [1], onToggle, noop, noop);

        hover(container);
        const e = new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true });
        document.dispatchEvent(e);

        expect(onToggle).toHaveBeenCalledOnce();
        expect(onToggle).toHaveBeenCalledWith(node);
        expect(e.defaultPrevented).toBe(true);
        document.body.removeChild(container);
    });

    it('hovered + empty activePath + Space → guard fires, onToggle called with root[0]', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const node = makeNode('A', [], 1);
        const onToggle = vi.fn();
        renderMillerUI(container, [node], [], onToggle, noop, noop);

        hover(container);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

        expect(onToggle).toHaveBeenCalledOnce();
        expect(onToggle).toHaveBeenCalledWith(node);
        document.body.removeChild(container);
    });

    it('not hovered + Space → onToggle not called', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const onToggle = vi.fn();
        renderMillerUI(container, [makeNode('A', [], 1)], [1], onToggle, noop, noop);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

        expect(onToggle).not.toHaveBeenCalled();
        document.body.removeChild(container);
    });

    it('removed hovered panel + Space → no stale global capture', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const onToggle = vi.fn();
        renderMillerUI(container, [makeNode('A', [], 1)], [1], onToggle, noop, noop);

        hover(container);
        document.body.removeChild(container);

        const e = new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true });
        document.dispatchEvent(e);

        expect(onToggle).not.toHaveBeenCalled();
        expect(e.defaultPrevented).toBe(false);
    });

    it('Space rebuild on same container keeps keyboard ownership without re-hover', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const a = makeNode('A', [], 1);
        const b = makeNode('B', [], 2);
        let pathLines = [1];
        const onPathChange = vi.fn((p: number[]) => {
            pathLines = p;
        });
        const sectionId = 42;

        const mount = () => {
            renderMillerUI(
                container,
                [a, b],
                pathLines,
                () => {
                    a.isCompleted = !a.isCompleted;
                    mount();
                },
                onPathChange,
                noop,
                sectionId
            );
        };

        mount();
        hover(container);
        container.dispatchEvent(new MouseEvent('mouseleave'));

        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
        expect(a.isCompleted).toBe(true);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
        expect(onPathChange).toHaveBeenCalledWith([2]);
        expect(container.querySelector('.miller-item.is-active span')?.textContent).toBe('B');

        document.body.removeChild(container);
    });

    it('Obsidian-style remount (new container, same sectionId) keeps keyboard without re-hover', () => {
        // After vault.modify, the post-processor often replaces the whole block DOM.
        // Keyboard focus must be keyed by sectionId, not HTMLElement identity.
        const sectionId = 7;
        const a = makeNode('A', [], 1);
        const b = makeNode('B', [], 2);
        let pathLines = [1];
        const onPathChange = vi.fn((p: number[]) => {
            pathLines = p;
        });

        let container = document.createElement('div');
        document.body.appendChild(container);

        const mount = (el: HTMLElement) => {
            renderMillerUI(
                el,
                [a, b],
                pathLines,
                () => {
                    a.isCompleted = !a.isCompleted;
                    // Simulate Obsidian remount: destroy old container, new one, same section.
                    document.body.removeChild(container);
                    container = document.createElement('div');
                    document.body.appendChild(container);
                    mount(container);
                },
                onPathChange,
                noop,
                sectionId
            );
        };

        mount(container);
        hover(container);
        container.dispatchEvent(new MouseEvent('mouseleave'));

        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
        expect(a.isCompleted).toBe(true);

        // New DOM under the cursor does not fire mouseenter — keys must still work.
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
        expect(onPathChange).toHaveBeenCalledWith([2]);
        expect(container.querySelector('.miller-item.is-active span')?.textContent).toBe('B');

        document.body.removeChild(container);
    });
});

describe('keyboard navigation — preventDefault on all intercepted keys', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    function setup(): HTMLElement {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1)], [1], noop, noop, noop);
        container.dispatchEvent(new MouseEvent('mouseenter'));
        return container;
    }

    function dispatchCancelable(k: string): KeyboardEvent {
        const e = new KeyboardEvent('keydown', { key: k, cancelable: true, bubbles: true });
        document.dispatchEvent(e);
        return e;
    }

    it('[tracer] ArrowDown → defaultPrevented', () => {
        const container = setup();
        expect(dispatchCancelable('ArrowDown').defaultPrevented).toBe(true);
        document.body.removeChild(container);
    });

    it('ArrowUp → defaultPrevented', () => {
        const container = setup();
        expect(dispatchCancelable('ArrowUp').defaultPrevented).toBe(true);
        document.body.removeChild(container);
    });

    it('ArrowRight → defaultPrevented', () => {
        const container = setup();
        expect(dispatchCancelable('ArrowRight').defaultPrevented).toBe(true);
        document.body.removeChild(container);
    });

    it('ArrowLeft → defaultPrevented', () => {
        const container = setup();
        expect(dispatchCancelable('ArrowLeft').defaultPrevented).toBe(true);
        document.body.removeChild(container);
    });
});

describe('keyboard navigation — onPathChange fires on mutation', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    function hover(container: HTMLElement): void {
        container.dispatchEvent(new MouseEvent('mouseenter'));
    }

    function key(k: string): void {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    }

    it('[tracer] ArrowDown moves A→B → onPathChange called with [B.originalLine]', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const onPathChange = vi.fn();
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [1], noop, onPathChange, noop);

        hover(container);
        key('ArrowDown');

        expect(onPathChange).toHaveBeenCalledWith([2]);
        document.body.removeChild(container);
    });

    it('ArrowRight descends → onPathChange called with [parent, child] lines', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const onPathChange = vi.fn();
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        renderMillerUI(container, [parent], [1], noop, onPathChange, noop);

        hover(container);
        key('ArrowRight');

        expect(onPathChange).toHaveBeenCalledWith([1, 2]);
        document.body.removeChild(container);
    });

    it('ArrowLeft ascends → onPathChange called with [parent.originalLine]', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const onPathChange = vi.fn();
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        renderMillerUI(container, [parent], [1, 2], noop, onPathChange, noop);

        hover(container);
        key('ArrowLeft');

        expect(onPathChange).toHaveBeenCalledWith([1]);
        document.body.removeChild(container);
    });

    it('ArrowRight on leaf (no-op) → onPathChange not called', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const onPathChange = vi.fn();
        renderMillerUI(container, [makeNode('Leaf', [], 1)], [1], noop, onPathChange, noop);

        hover(container);
        key('ArrowRight');

        expect(onPathChange).not.toHaveBeenCalled();
        document.body.removeChild(container);
    });

    it('ArrowLeft at root (no-op) → onPathChange not called', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const onPathChange = vi.fn();
        renderMillerUI(container, [makeNode('A', [], 1)], [1], noop, onPathChange, noop);

        hover(container);
        key('ArrowLeft');

        expect(onPathChange).not.toHaveBeenCalled();
        document.body.removeChild(container);
    });
});

describe('item creation — Enter/Shift+Enter inline input', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    function hover(container: HTMLElement): void {
        container.dispatchEvent(new MouseEvent('mouseenter'));
    }

    function pressKey(k: string, shift = false): void {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey: shift, bubbles: true, cancelable: true }));
    }

    it('[tracer] Enter with leaf selected shows inline input in same column', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const leaf = makeNode('Leaf', [], 1);
        renderMillerUI(container, [leaf], [1], noop, noop, noop);

        hover(container);
        pressKey('Enter');

        expect(container.querySelector('input.miller-new-item-input')).not.toBeNull();
        document.body.removeChild(container);
    });

    it('[tracer] Shift+Enter with leaf selected shows inline input in new child column', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const leaf = makeNode('Leaf', [], 1);
        renderMillerUI(container, [leaf], [1], noop, noop, noop);

        hover(container);
        pressKey('Enter', true);

        expect(container.querySelector('input.miller-new-item-input')).not.toBeNull();
        document.body.removeChild(container);
    });

    it('Enter with node-with-children selected shows input after subtree in same column', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        renderMillerUI(container, [parent], [1], noop, noop, noop);

        hover(container);
        pressKey('Enter');

        expect(container.querySelector('input.miller-new-item-input')).not.toBeNull();
        document.body.removeChild(container);
    });

    it('Shift+Enter with node-with-children selected shows input in child column', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        renderMillerUI(container, [parent], [1], noop, noop, noop);

        hover(container);
        pressKey('Enter', true);

        expect(container.querySelector('input.miller-new-item-input')).not.toBeNull();
        document.body.removeChild(container);
    });

    it('Enter with no selection appends input at root column end', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1)], [], noop, noop, noop);

        hover(container);
        pressKey('Enter');

        expect(container.querySelector('input.miller-new-item-input')).not.toBeNull();
        document.body.removeChild(container);
    });

    it('Shift+Enter with no selection is no-op (no input appears)', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1)], [], noop, noop, noop);

        hover(container);
        pressKey('Enter', true);

        expect(container.querySelector('input.miller-new-item-input')).toBeNull();
        document.body.removeChild(container);
    });

    it('Shift+Enter on a 4-space leaf confirms with one extra indent unit', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const leaf: MillerNode = {
            ...makeNode('Out of Bounds', [], 10),
            indent: '    ',
        };
        const parent: MillerNode = {
            ...makeNode('Gameplay', [leaf], 4),
            indent: '',
        };
        const onInsert = vi.fn();
        renderMillerUI(container, [parent], [4, 10], noop, noop, onInsert);

        hover(container);
        pressKey('Enter', true);

        const input = container.querySelector('input.miller-new-item-input') as HTMLInputElement;
        input.value = 'test';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(onInsert).toHaveBeenCalledWith('test', 10, '        ', 'task');
        document.body.removeChild(container);
    });

    it('confirming non-empty text calls onInsert with correct afterLine and indent', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const leaf = makeNode('Leaf', [], 5);
        const onInsert = vi.fn();
        renderMillerUI(container, [leaf], [5], noop, noop, onInsert);

        hover(container);
        pressKey('Enter');

        const input = container.querySelector('input.miller-new-item-input') as HTMLInputElement;
        input.value = 'new item';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(onInsert).toHaveBeenCalledOnce();
        expect(onInsert).toHaveBeenCalledWith('new item', 5, '', 'task');
        document.body.removeChild(container);
    });

    it('confirming empty text does not call onInsert', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const leaf = makeNode('Leaf', [], 5);
        const onInsert = vi.fn();
        renderMillerUI(container, [leaf], [5], noop, noop, onInsert);

        hover(container);
        pressKey('Enter');

        const input = container.querySelector('input.miller-new-item-input') as HTMLInputElement;
        input.value = '';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(onInsert).not.toHaveBeenCalled();
        document.body.removeChild(container);
    });

    it('Escape removes input without calling onInsert', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const leaf = makeNode('Leaf', [], 5);
        const onInsert = vi.fn();
        renderMillerUI(container, [leaf], [5], noop, noop, onInsert);

        hover(container);
        pressKey('Enter');

        const input = container.querySelector('input.miller-new-item-input') as HTMLInputElement;
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(container.querySelector('input.miller-new-item-input')).toBeNull();
        expect(onInsert).not.toHaveBeenCalled();
        document.body.removeChild(container);
    });

    it('onPathChange primed with new item line before onInsert fires', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const leaf = makeNode('Leaf', [], 5);
        const calls: string[] = [];
        const onPathChange = vi.fn(() => calls.push('path'));
        const onInsert = vi.fn(() => calls.push('insert'));
        renderMillerUI(container, [leaf], [5], noop, onPathChange, onInsert);

        hover(container);
        pressKey('Enter');

        const input = container.querySelector('input.miller-new-item-input') as HTMLInputElement;
        input.value = 'x';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(calls[calls.length - 2]).toBe('path');
        expect(calls[calls.length - 1]).toBe('insert');
        document.body.removeChild(container);
    });
});

describe('space-toggles-focused-item (Phase 2 acceptance)', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, kind: 'task', isCompleted: false, originalLine, children };
    }

    it('Space on hovered+selected item calls onToggle and prevents default', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const node = makeNode('A', [], 1);
        const onToggle = vi.fn();
        renderMillerUI(container, [node], [1], onToggle, noop, noop);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        const e = new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true });
        document.dispatchEvent(e);

        expect(onToggle).toHaveBeenCalledOnce();
        expect(onToggle).toHaveBeenCalledWith(node);
        expect(e.defaultPrevented).toBe(true);
        document.body.removeChild(container);
    });
});
