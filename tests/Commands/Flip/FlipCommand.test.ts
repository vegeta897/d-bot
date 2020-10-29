import { FlipCommand } from '@src/Commands/Flip/FlipCommand'

const { execute } = FlipCommand

describe('flip command execution', () => {
	it('returns a string with expected line count', () => {
		const singleFlip = execute({ params: ['1'] }) as string
		const multiFlip = execute({ params: ['5'] }) as string
		const multiFlipTruncated = execute({ params: ['100'] }) as string
		expect(singleFlip.split('\n')).toHaveLength(2)
		expect(multiFlip.split('\n')).toHaveLength(6)
		expect(multiFlipTruncated.split('\n')).toHaveLength(4)
	})
	it('treats non-numeric flip count as 1', () => {
		const noFlip = execute({ params: [] }) as string
		const aFlip = execute({ params: ['a'] }) as string
		expect(noFlip.split('\n')).toHaveLength(2)
		expect(aFlip.split('\n')).toHaveLength(2)
	})
	it('throws with invalid parameters', () => {
		expect(() => execute({ params: ['9999999'] })).toThrow(
			'flips must be less than'
		)
		expect(() => execute({ params: ['0'] })).toThrow('flips must be at least 1')
	})
})
