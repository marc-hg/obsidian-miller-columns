import { describe, it, expect, vi } from 'vitest';
import { renderMillerUI, computeDefaultActivePath } from '../view/renderer';
import { MillerNode } from '../model/types';

function makeNode(text: string, children: MillerNode[] = [], isCompleted = false, originalLine = 0): MillerNode {
    return { id: crypto.randomUUID(), text, isCompleted, originalLine, children };
}

const noop = () => {};

describe('renderMillerUI', () => {
    it('renders one column for flat list', () => {
        const container = document.createElement('div');
        renderMillerUI(container, [makeNode('A'), makeNode('B')], [], noop, noop);

        expect(container.querySelectorAll('.miller-column').length).toBe(1);
        expect(container.querySelectorAll('.miller-item').length).toBe(2);
    });

    it('renders second column after clicking node with children', () => {
        const container = document.createElement('div');
        const nodes = [makeNode('Parent', [makeNode('Child')])];
        renderMillerUI(container, nodes, [], noop, noop);

        (container.querySelector('.miller-item') as HTMLElement).click();

        expect(container.querySelectorAll('.miller-column').length).toBe(2);
        expect(container.querySelector('.miller-item.is-active')).not.toBeNull();
    });

    it('marks clicked node as active', () => {
        const container = document.createElement('div');
        renderMillerUI(container, [makeNode('A'), makeNode('B')], [], noop, noop);

        (container.querySelectorAll('.miller-item')[1] as HTMLElement).click();

        const items = container.querySelectorAll('.miller-item');
        expect((items[1] as HTMLElement).classList.contains('is-active')).toBe(true);
        expect((items[0] as HTMLElement).classList.contains('is-active')).toBe(false);
    });

    it('fires onToggle with correct node when checkbox clicked', () => {
        const container = document.createElement('div');
        const node = makeNode('Task');
        const onToggle = vi.fn();
        renderMillerUI(container, [node], [], onToggle, noop);

        (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

        expect(onToggle).toHaveBeenCalledOnce();
        expect(onToggle).toHaveBeenCalledWith(node);
    });

    it('reflects isCompleted state on checkbox', () => {
        const container = document.createElement('div');
        renderMillerUI(container, [makeNode('Done', [], true)], [], noop, noop);

        const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
    });

    it('restores active path from savedActivePath', () => {
        const container = document.createElement('div');
        const child = makeNode('Child', [], false, 2);
        const parent = makeNode('Parent', [child], false, 1);
        renderMillerUI(container, [parent], [1], noop, noop);

        expect(container.querySelectorAll('.miller-column').length).toBe(2);
        expect(container.querySelector('.miller-item.is-active')).not.toBeNull();
    });

    it('calls onPathChange with originalLine array when node clicked', () => {
        const container = document.createElement('div');
        const node = makeNode('A', [], false, 5);
        const onPathChange = vi.fn();
        renderMillerUI(container, [node], [], noop, onPathChange);

        (container.querySelector('.miller-item') as HTMLElement).click();

        expect(onPathChange).toHaveBeenCalledWith([5]);
    });
});

describe('computeDefaultActivePath', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, isCompleted: false, originalLine, children };
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
        return { id: crypto.randomUUID(), text, isCompleted: false, originalLine, children };
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
        renderMillerUI(container, [parent], [1], noop, noop);

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
        renderMillerUI(container, [makeNode('Leaf', [], 1)], [1], noop, noop);

        hover(container);
        key('ArrowRight');

        expect(colCount(container)).toBe(1);
        document.body.removeChild(container);
    });

    it('root depth + ArrowLeft → no change, no crash', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1)], [1], noop, noop);

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
        renderMillerUI(container, [parent], [1, 2], noop, noop);

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
        renderMillerUI(container, [root], [], noop, noop);

        hover(container);
        key('ArrowRight');

        expect(colCount(container)).toBe(2);
        document.body.removeChild(container);
    });

    it('empty path + ArrowLeft → guard selects root[0], left is no-op at root', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('Root', [], 1)], [], noop, noop);

        hover(container);
        key('ArrowLeft');

        expect(activeText(container)).toBe('Root');
        expect(colCount(container)).toBe(1);
        document.body.removeChild(container);
    });
});

describe('keyboard navigation — ↑/↓ within column', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, isCompleted: false, originalLine, children };
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
        renderMillerUI(container, [a, b], [1], noop, noop);

        hover(container);
        key('ArrowDown');

        expect(activeText(container)).toBe('B');
        document.body.removeChild(container);
    });

    it('empty path + ArrowDown → guard initializes to A, then moves to B', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [], noop, noop);

        hover(container);
        key('ArrowDown');

        expect(activeText(container)).toBe('B');
        document.body.removeChild(container);
    });

    it('B selected (last) + ArrowDown → B stays (clamp)', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [2], noop, noop);

        hover(container);
        key('ArrowDown');

        expect(activeText(container)).toBe('B');
        document.body.removeChild(container);
    });

    it('A selected (first) + ArrowUp → A stays (clamp)', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [1], noop, noop);

        hover(container);
        key('ArrowUp');

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });

    it('B selected + ArrowUp → A is-active', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [2], noop, noop);

        hover(container);
        key('ArrowUp');

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });

    it('single item + ArrowDown → stays on single item', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1)], [1], noop, noop);

        hover(container);
        key('ArrowDown');

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });

    it('single item + ArrowUp → stays on single item', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1)], [1], noop, noop);

        hover(container);
        key('ArrowUp');

        expect(activeText(container)).toBe('A');
        document.body.removeChild(container);
    });
});

describe('hover-gates-arrow-navigation (Phase 1 acceptance)', () => {
    function makeNode(text: string, children: MillerNode[] = [], originalLine = 0): MillerNode {
        return { id: crypto.randomUUID(), text, isCompleted: false, originalLine, children };
    }

    it('ArrowDown on document while hovered selects first item', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A', [], 1), makeNode('B', [], 2)], [], noop, noop);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        // guard initializes to A (index 0), ArrowDown moves to B (index 1)
        const active = container.querySelector('.miller-item.is-active');
        expect(active).not.toBeNull();
        expect(active?.querySelector('span')?.textContent).toBe('B');
        document.body.removeChild(container);
    });

    it('arrow keys on document have no effect before mouseenter', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        renderMillerUI(container, [makeNode('A'), makeNode('B')], [], noop, noop);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

        expect(container.querySelectorAll('.miller-item.is-active').length).toBe(0);
        document.body.removeChild(container);
    });

    it('arrow keys stop working after mouseleave', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const child = makeNode('Child', [], 2);
        const parent = makeNode('Parent', [child], 1);
        // start with parent selected so 2 columns visible
        renderMillerUI(container, [parent], [1], noop, noop);

        container.dispatchEvent(new MouseEvent('mouseenter'));
        container.dispatchEvent(new MouseEvent('mouseleave'));
        // ArrowLeft after mouseleave should NOT collapse to 1 column
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

        expect(container.querySelectorAll('.miller-column').length).toBe(2);
        document.body.removeChild(container);
    });
});
