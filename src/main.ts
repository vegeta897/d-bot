import Discord from './Core/Discord'
import { LoadCommands } from './Commands/Loader'

async function init(): Promise<void> {
	await LoadCommands().catch(console.error)
	Discord.bot.on('ready', () => {
		console.log(
			`Bot ready: ${Discord.bot.user.username}#${Discord.bot.user.discriminator}`
		)
	})
	await Discord.bot.connect()
}

init()
