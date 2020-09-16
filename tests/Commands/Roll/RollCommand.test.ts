import { processor } from '@src/Commands/Roll/RollCommand'
import { Message } from 'eris'

const { parse, execute } = processor

describe('roll command parsing', () => {
	it('parses dice count', () => {
		const diceCount = 2
		if (parse) {
			expect(parse([`${diceCount}d6`])[0]).toBe(diceCount)
			expect(parse([`${diceCount} 6`])[0]).toBe(diceCount)
		}
	})
	it('parses dice sides', () => {
		const diceSides = 6
		if (parse) {
			expect(parse([`2d${diceSides}`])[1]).toBe(diceSides)
			expect(parse([`2 ${diceSides}`])[1]).toBe(diceSides)
		}
	})
})

describe('roll command execution', () => {
	it('returns a non-empty string', () => {
		const dice: [number, number] = [2, 6]
		const result = execute({ message: {} as Message, params: dice }) as string
		expect(result.length).toBeGreaterThan(0)
	})
})
