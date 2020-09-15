import { CommandClient } from 'eris'
import { DBotCommand } from '../Commands/Command'

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
	registerCommand(command: DBotCommand): void {
		command.register(this.bot)
	}
}
