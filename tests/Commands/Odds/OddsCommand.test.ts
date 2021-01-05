import { OddsCommand } from '@src/Commands/Odds/OddsCommand'
import { Message } from 'eris'

const { execute } = OddsCommand

describe('odds command execution', () => {
	it('returns a numeric denominator', () => {
		const result = execute({ params: [], message: {} as Message }) as string
		const denominator = +result.split(' ').slice(-1)[0].replace(/,/g, '')
		expect(isNaN(denominator)).toEqual(false)
		expect(denominator).toBeGreaterThan(0)
	})
})
