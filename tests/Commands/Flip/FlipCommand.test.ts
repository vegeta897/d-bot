import { FlipCommand } from '@src/Commands/Flip/FlipCommand'
import { Message } from 'eris'

const { execute } = FlipCommand

describe('flip command execution', () => {
	function doExecute(params: string[]) {
		return execute({ params, message: {} as Message })
	}
	it('returns a string with expected line count', () => {
		const singleFlip = doExecute(['1']) as string
		const multiFlip = doExecute(['5']) as string
		const multiFlipTruncated = doExecute(['100']) as string
		expect(singleFlip.split('\n')).toHaveLength(2)
		expect(multiFlip.split('\n')).toHaveLength(6)
		expect(multiFlipTruncated.split('\n')).toHaveLength(4)
	})
	it('treats non-numeric flip count as 1', () => {
		const noFlip = doExecute([]) as string
		const aFlip = doExecute(['a']) as string
		expect(noFlip.split('\n')).toHaveLength(2)
		expect(aFlip.split('\n')).toHaveLength(2)
	})
	it('throws with invalid parameters', () => {
		expect(() => doExecute(['9999999'])).toThrow('flips must be less than')
		expect(() => doExecute(['0'])).toThrow('flips must be at least 1')
	})
})
