import { CommandClient, Message } from 'eris'
import { DBotCommand } from '@src/Commands/Command'

const client = new CommandClient('')

describe('command', () => {
	const command = new DBotCommand({
		label: 'command',
		execute: () => '',
	})
	it('registers to client', () => {
		command.register(client)
		expect(client.commands).toHaveProperty('command')
	})
	function createErrorCommand(usage?: string): DBotCommand {
		return new DBotCommand({
			label: 'command',
			execute: () => {
				throw 'error'
			},
			commandOptions: {
				usage,
			},
		})
	}
	it('returns error', () => {
		expect(createErrorCommand().generator({} as Message, [])).toEqual('error')
	})
	it('returns error with usage example', () => {
		const usage = 'example'
		expect(createErrorCommand(usage).generator({} as Message, [])).toEqual(
			`error, try ${usage}`
		)
	})
})
