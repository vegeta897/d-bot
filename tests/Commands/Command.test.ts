import { CommandClient, Message } from 'eris'
import { DBotCommand } from '@src/Commands/Command'

const client = new CommandClient('')

describe('simple command', () => {
	const commandSimple = new DBotCommand({
		label: 'command',
		execute: () => '',
	})
	it('registers to client', () => {
		commandSimple.register(client)
		expect(client.commands).toHaveProperty('command')
	})
	it('returns error', () => {
		const commandError = new DBotCommand({
			label: 'command',
			execute: () => {
				throw 'error'
			},
		})
		expect(commandError.generator({} as Message, [])).toEqual('error')
	})
})
