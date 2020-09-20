import { OddsCommand } from '@src/Commands/Odds/OddsCommand'

const { execute } = OddsCommand

describe('odds command execution', () => {
	it('returns a numeric denominator', () => {
		const result = execute({ params: [] }) as string
		const denominator = +result.split(' ').slice(-1)[0].replace(/,/g, '')
		expect(isNaN(denominator)).toEqual(false)
		expect(denominator).toBeGreaterThan(0)
	})
})
