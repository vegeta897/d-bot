import { CommandClient } from 'eris'
import { DBotCommand, DBotCommandOptions } from '../Commands/Command'

export class Discord {
	bot: CommandClient
	constructor(options: { client: CommandClient }) {
		this.bot = options.client
		this.bot.on('ready', () => {
			console.log(
				`Bot ready: ${this.bot.user.username}#${this.bot.user.discriminator}`
			)
		})
	}
	connect(): void {
		this.bot.connect()
	}
	registerCommand(commandOptions: DBotCommandOptions): void {
		new DBotCommand(commandOptions).register(this.bot)
	}
}
