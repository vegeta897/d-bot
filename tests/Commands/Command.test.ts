import { CommandClient, Message } from 'eris'
import { DBotCommandSimple, DBotCommandParsed } from '@src/Commands/Command'
import * as t from 'io-ts'

const client = new CommandClient('')

describe('simple command', () => {
	const commandSimple = new DBotCommandSimple({
		label: 'command',
		execute: () => '',
	})
	it('registers to client', () => {
		commandSimple.register(client)
		expect(client.commands).toHaveProperty('command')
	})
	it('returns error', () => {
		const commandError = new DBotCommandSimple({
			label: 'command',
			execute: () => {
				throw 'error'
			},
		})
		expect(commandError.generator({} as Message, [])).toEqual('error')
	})
})

describe('parsed command', () => {
	const ParamsV = t.type({
		test: t.number,
	})
	type Params = t.TypeOf<typeof ParamsV>
	const commandError = new DBotCommandParsed<Params>({
		label: 'command',
		processor: {
			validator: ParamsV,
			parsers: [
				([test]) => {
					if (test === 'a') return
					return { test: +test }
				},
			],
		},
		execute: ({ params: { test } }) => {
			if (test !== 1) throw 'error'
		},
	})
	it('returns error on bad execute', () => {
		expect(commandError.generator({} as Message, ['2'])).toEqual('error')
	})
	it('returns error on invalid params', () => {
		expect(commandError.generator({} as Message, ['a'])).toEqual(
			'Invalid parameters'
		)
	})
})
