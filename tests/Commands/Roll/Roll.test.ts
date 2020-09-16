import { Roll } from '@src/Commands/Roll/Roll'

describe('roll', () => {
	it('returns correct array length', () => {
		const numDice = 2
		const result = Roll(numDice, 6)
		expect(result).toHaveLength(numDice)
	})
	it('totals within bounds', () => {
		const diceCount = 100
		const diceSides = 20
		const minimumTotal = diceCount
		const maximumTotal = diceCount * diceSides
		const result = Roll(diceCount, diceSides).reduce((p, c) => p + c)
		expect(result).toBeGreaterThanOrEqual(minimumTotal)
		expect(result).toBeLessThanOrEqual(maximumTotal)
	})
})
