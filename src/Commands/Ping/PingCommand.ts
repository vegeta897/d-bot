import { DBotCommand } from '../Command'

export const PingCommand = new DBotCommand({
	label: 'ping',
	execute: () => 'Pong!',
	commandOptions: {
		description: 'Ping the bot',
		fullDescription: 'The bot should reply with "Pong!"',
	},
})
