import { PingCommand } from '@src/Commands/Ping/PingCommand'

const { execute } = PingCommand

const expectedResponse = 'Pong!'

describe('ping command execution', () => {
	it(`returns "${expectedResponse}"`, () => {
		expect(execute({ params: [] })).toEqual(expectedResponse)
	})
})
