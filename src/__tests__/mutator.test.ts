// src/__tests__/mutator.test.ts
import { describe, it, expect } from 'vitest';
import { toggleCheckboxInText } from '../model/mutator';

describe('Markdown Mutator', () => {
    it('should toggle an empty checkbox to [x]', () => {
        const input = `- [ ] Task`;
        const output = toggleCheckboxInText(input, 0);
        expect(output).toBe('- [x] Task');
    });

    it('should toggle a completed checkbox back to [ ]', () => {
        const input = `- [x] Completed`;
        const output = toggleCheckboxInText(input, 0);
        expect(output).toBe('- [ ] Completed');
    });

    it('should return same text when no textbox', () => {
        const input = `Just a simple line`;
        const output = toggleCheckboxInText(input, 0);
        expect(output).toBe('Just a simple line');
    });
});
