import { PickCommand, PickParser } from '@src/Commands/Pick/PickCommand'
import { Message } from 'eris'

const { execute } = PickCommand
const { parse } = PickParser

const choices = ['1', '2', '3']
describe('pick command parsing', () => {
	it('parses comma delimited choices', () => {
		expect(parse(['1,', '2,', '3']).choices).toStrictEqual(choices)
	})
	it('parses "or" delimited choices', () => {
		expect(parse(['1', 'or', '2', 'or', '3']).choices).toStrictEqual(choices)
	})
	it('parses mixed delimited choices', () => {
		expect(parse(['1,', '2,', 'or', '3']).choices).toStrictEqual(choices)
	})
	it('parses space delimited choices', () => {
		expect(parse(choices).choices).toStrictEqual(choices)
	})
	it('throws with invalid parameters', () => {
		expect(() => parse(['1'])).toThrow('Invalid parameters')
	})
})

describe('pick command execution', () => {
	it('returns one of the choices', () => {
		expect(choices).toContain(
			execute({ params: choices, message: {} as Message })
		)
	})
})
