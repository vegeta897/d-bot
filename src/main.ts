import Discord from './Core/Discord'
import { LoadCommands } from './Commands/Loader'
import Config from './Config'

async function init(): Promise<void> {
	await Config.init()
	await LoadCommands().catch(console.error)
	Discord.bot.on('ready', () => {
		console.log(
			`Bot ready: ${Discord.bot.user.username}#${Discord.bot.user.discriminator}`
		)
	})
	await Discord.bot.connect()
}

init()
