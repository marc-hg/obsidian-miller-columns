// src/__tests__/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseListToTree } from '../model/parser';

describe('Miller Column Parser', () => {
    it('should convert a nested markdown list into a tree', () => {
        const markdown = `- [ ] Parent\n  - [ ] Child`;
        const tree = parseListToTree(markdown, 0);

        expect(tree.length).toBe(1);
        expect(tree[0].text).toBe('Parent');
        expect(tree[0].children.length).toBe(1);
        expect(tree[0].children[0].text).toBe('Child');
    });

    it('should ignore the #miller-view tag in display text', () => {
        const markdown = `- [ ] Task #miller-view`;
        const tree = parseListToTree(markdown, 0);
        
        expect(tree[0].text).toBe('Task');
    });
});
