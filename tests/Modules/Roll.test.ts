import { Roll } from 'src/Modules/Roll'

describe('roll', () => {
	it('returns correct array length', () => {
		const numDice = 2
		const result = Roll(numDice, 6)
		expect(result).toHaveLength(numDice)
	})
})
