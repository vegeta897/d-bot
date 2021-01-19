import { RemindParser, RemindCommand } from '@src/Commands/Remind/RemindCommand'
import Reminder from '@src/Commands/Remind/Reminder'
import { Message } from 'eris'
import { mocked } from 'ts-jest/utils'

jest.mock('@src/Commands/Remind/Reminder')

const { parse } = RemindParser
const { execute, init, terminate } = RemindCommand

if (init) init((fn) => fn()) // For coverage
if (terminate) terminate()

describe('remind command parsing', () => {
	it('parses single units of time', () => {
		expect(parse(['1s', 'a']).time).toBe(1000)
		expect(parse(['1s', 'a', 'b']).time).toBe(1000)
		expect(parse(['1', 's', 'a']).time).toBe(1000)
		expect(parse(['1', 's', 'a', 'b']).time).toBe(1000)
		expect(parse(['0.1s', 'a']).time).toBe(100)
		expect(parse(['0.1', 's', 'a']).time).toBe(100)
		expect(parse(['1', 'm', 's', 'a']).time).toBe(1)
	})
	it('parses combined units of time', () => {
		expect(parse(['1m', '1s', 'a']).time).toBe(60 * 1000 + 1000)
		expect(parse(['1m', '1s', 'a', 'b']).time).toBe(60 * 1000 + 1000)
		expect(parse(['1', 'm', '1', 's', 'a']).time).toBe(60 * 1000 + 1000)
		expect(parse(['1', 'm', '1', 's', 'a', 'b']).time).toBe(60 * 1000 + 1000)
		expect(parse(['0.5m', '0.5s', 'a']).time).toBe(30 * 1000 + 500)
	})
	it('parses reminder text', () => {
		expect(parse(['1s', 'a']).text).toBe('a')
		expect(parse(['1s', 'a', 'b']).text).toBe('a b')
		expect(parse(['1s', 's']).text).toBe('s')
	})

	const error = 'Invalid parameters'
	it('throws with less than 2 parameters', () => {
		expect(() => parse([])).toThrow(error)
		expect(() => parse(['1s'])).toThrow(error)
	})
	it('throws without valid time unit', () => {
		expect(() => parse(['1', 'a'])).toThrow(error)
		expect(() => parse(['1', 'a', 'b'])).toThrow(error)
		expect(() => parse(['1parsec', 'a'])).toThrow(error)
		expect(() => parse(['0s', 'a'])).toThrow(error)
		expect(() => parse(['0', 's', 'a'])).toThrow(error)
		expect(() => parse(['9'.repeat(400), 'ms', 'a'])).toThrow(error)
	})
})

describe('remind command execution', () => {
	it('creates a Reminder instance', () => {
		const MockedReminder = mocked(Reminder)
		beforeEach(() => MockedReminder.mockClear())
		execute({
			params: ['1s', 'a'],
			message: { author: { id: '123' }, channel: { id: '123' } } as Message,
		})
		expect(MockedReminder).toHaveBeenCalledTimes(1)
	})
	it('throws with an invalid date', () => {
		expect(() =>
			execute({ params: ['999999', 'years', 'a'], message: {} as Message })
		).toThrow(/absurd date/g)
	})
})
