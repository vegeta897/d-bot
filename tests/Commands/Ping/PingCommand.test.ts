import { PingCommand } from '@src/Commands/Ping/PingCommand'
import { Message } from 'eris'

const { execute } = PingCommand

const expectedResponse = 'Pong!'

describe('ping command execution', () => {
	it(`returns "${expectedResponse}"`, () => {
		expect(execute({ message: {} as Message, params: [] })).toEqual(
			expectedResponse
		)
	})
})
