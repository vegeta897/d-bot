import { Parser } from '@src/Commands/Parser'
import { number, object } from 'superstruct'

describe('parsed command', () => {
	const parser = new Parser({
		validator: object({
			test: number(),
		}),
		parsers: [
			([test]) => {
				if (test === 'a') return
				return { test: +test }
			},
		],
	})
	it('returns error on invalid params', () => {
		expect(() => parser.parse(['a'])).toThrow('Invalid parameters')
	})
})
