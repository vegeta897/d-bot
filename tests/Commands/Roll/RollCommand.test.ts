import { processor, Errors } from '@src/Commands/Roll/RollCommand'
import { Message } from 'eris'

const parse = processor.parse as (params: string[]) => [number, number]
const { execute } = processor

describe('roll command parsing', () => {
	it('parses dice count', () => {
		const diceCount = 2
		expect(parse([`${diceCount}d6`])[0]).toBe(diceCount)
		expect(parse([`${diceCount} 6`])[0]).toBe(diceCount)
	})
	it('parses dice sides', () => {
		const diceSides = 6
		expect(parse([`2d${diceSides}`])[1]).toBe(diceSides)
		expect(parse([`2 ${diceSides}`])[1]).toBe(diceSides)
	})
	it('throws with invalid parameters', () => {
		function doParse(params: string[]) {
			return () => parse(params)
		}
		const error = new Error(Errors.Invalid)
		expect(doParse([])).toThrow(error)
		expect(doParse([''])).toThrow(error)
		expect(doParse(['2'])).toThrow(error)
		expect(doParse(['2 '])).toThrow(error)
		expect(doParse(['2d'])).toThrow(error)
		expect(doParse(['d2'])).toThrow(error)
	})
})

describe('roll command execution', () => {
	it('returns a non-empty string', () => {
		const dice: [number, number] = [2, 6]
		const result = execute({ message: {} as Message, params: dice }) as string
		expect(result.length).toBeGreaterThan(0)
	})
})
