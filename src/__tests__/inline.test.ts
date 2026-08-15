import { describe, it, expect } from 'vitest';
import { parseInlineBold } from '../core/inline';

describe('parseInlineBold', () => {
	it('returns a single text part when there is no markup', () => {
		expect(parseInlineBold('Serving')).toEqual([{ kind: 'text', value: 'Serving' }]);
	});

	it('treats a fully wrapped label as one bold part', () => {
		expect(parseInlineBold('**Court and Equipment**')).toEqual([
			{ kind: 'bold', value: 'Court and Equipment' },
		]);
	});

	it('splits a bold prefix from the rest of the sentence', () => {
		expect(parseInlineBold('**Dimensions:** 10 meters wide')).toEqual([
			{ kind: 'bold', value: 'Dimensions:' },
			{ kind: 'text', value: ' 10 meters wide' },
		]);
	});

	it('handles multiple bold spans', () => {
		expect(parseInlineBold('see **one** and **two**')).toEqual([
			{ kind: 'text', value: 'see ' },
			{ kind: 'bold', value: 'one' },
			{ kind: 'text', value: ' and ' },
			{ kind: 'bold', value: 'two' },
		]);
	});

	it('leaves unmatched ** as literal text', () => {
		expect(parseInlineBold('**unclosed')).toEqual([{ kind: 'text', value: '**unclosed' }]);
	});
});
