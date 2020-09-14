import { CommandClient } from 'eris'
import { DISCORD_TOKEN } from './config'

const bot = new CommandClient(DISCORD_TOKEN)
bot.on('ready', () => {
	console.log(`Bot ready: ${bot.user.username}#${bot.user.discriminator}`)
})
bot.connect()
