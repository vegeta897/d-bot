import * as t from 'io-ts'
import { isRight } from 'fp-ts/Either'

interface ParserOptions<T extends Record<string, unknown>> {
	parsers: { (params: string[]): T | void }[]
	validator: t.Type<T>
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
			if (parseAttempt && isRight(this.validator.decode(parseAttempt))) {
				parsed = parseAttempt
				break
			}
		}
		if (!parsed) throw 'Invalid parameters'
		return parsed
	}
}
