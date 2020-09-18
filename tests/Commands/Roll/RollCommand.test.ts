import { RollCommand } from '@src/Commands/Roll/RollCommand'
import type { Message } from 'eris'

const { parse, execute } = RollCommand

const diceCount = 2
const diceSides = 6

describe('roll command parsing', () => {
	const xDy = [`${diceCount}d${diceSides}`]
	const spaced = [`${diceCount}`, `${diceSides}`]
	it('parses dice count', () => {
		expect(parse(xDy).diceCount).toBe(diceCount)
		expect(parse(spaced).diceCount).toBe(diceCount)
	})
	it('parses dice sides', () => {
		expect(parse(xDy).diceSides).toBe(diceSides)
		expect(parse(spaced).diceSides).toBe(diceSides)
	})
	it('parses single number as dice sides', () => {
		expect(parse([`${diceSides}`]).diceCount).toBe(1)
		expect(parse([`${diceSides}`]).diceSides).toBe(diceSides)
	})
	it('throws with invalid parameters', () => {
		function doParse(params: string[]) {
			return () => parse(params)
		}
		const error = 'Invalid parameters'
		expect(doParse([])).toThrow(error)
		expect(doParse([''])).toThrow(error)
		expect(doParse(['2d'])).toThrow(error)
		expect(doParse(['d2'])).toThrow(error)
		expect(doParse(['abc'])).toThrow(error)
	})
})

describe('roll command execution', () => {
	const singleDice = execute({
		message: {} as Message,
		params: { diceCount: 1, diceSides },
	}) as string
	const multiDice = execute({
		message: {} as Message,
		params: { diceCount, diceSides },
	}) as string
	it('returns a string with correct number of lines', () => {
		expect(singleDice.split('\n')).toHaveLength(2)
		expect(multiDice.split('\n')).toHaveLength(diceCount + 2)
	})
})
