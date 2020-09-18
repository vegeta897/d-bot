import { DBotCommandSimple } from '../Command'

export const PingCommand = new DBotCommandSimple({
	label: 'ping',
	execute: () => 'Pong!',
	commandOptions: {
		description: 'Ping the bot',
		fullDescription: 'The bot should reply with "Pong!"',
	},
})
