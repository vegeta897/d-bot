import { Client } from 'eris'
import { DISCORD_TOKEN } from './config'

const bot = new Client(DISCORD_TOKEN)
bot.on('ready', () => {
	console.log('Bot ready')
})
