import { Parser } from '@src/Commands/Parser'
import * as t from 'io-ts'

describe('parsed command', () => {
	const ParamsV = t.type({
		test: t.number,
	})
	type Params = t.TypeOf<typeof ParamsV>
	const parser = new Parser<Params>({
		validator: ParamsV,
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
