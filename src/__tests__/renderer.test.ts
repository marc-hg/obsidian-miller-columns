import { describe, it, expect, vi } from 'vitest';
import { renderMillerUI } from '../view/renderer';
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
