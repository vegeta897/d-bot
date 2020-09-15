import { Roll } from '@src/Commands/Roll/Roll'

describe('roll', () => {
	it('returns correct array length', () => {
		const numDice = 2
		const result = Roll(numDice, 6)
		expect(result).toHaveLength(numDice)
	})
})
