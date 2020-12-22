import { Infer, is, Struct } from 'superstruct'

interface ParserOptions<T extends Struct<Infer<T>>> {
	parsers: { (params: string[]): Infer<T> | void }[]
	validator: T
}

export class Parser<T extends Struct<Infer<T>>> {
	private readonly parsers
	private readonly validator
	constructor({ parsers, validator }: ParserOptions<T>) {
		this.parsers = parsers
		this.validator = validator
	}
	parse = (params: string[]): Infer<T> => {
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
