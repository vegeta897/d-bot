import { is, Struct } from 'superstruct'

interface ParserOptions<T extends Record<string, unknown>> {
	parsers: { (params: string[]): T | void }[]
	validator: Struct<T>
}

export class Parser<T extends Record<string, unknown>> {
	private readonly parsers
	private readonly validator
	constructor({ parsers, validator }: ParserOptions<T>) {
		this.parsers = parsers
		this.validator = validator
	}
	parse = (params: string[]): T => {
		let parsed
		for (const parser of this.parsers) {
			const parseAttempt = parser(params)
			if (parseAttempt && is(parseAttempt, this.validator)) {
				parsed = parseAttempt
				break
			}
		}
		if (!parsed) throw 'Invalid parameters'
		return parsed
	}
}
