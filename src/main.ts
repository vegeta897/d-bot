import { CommandClient } from 'eris'
import { DISCORD_TOKEN } from './config'
import { Discord } from './Core/Discord'

const discord = new Discord({
	client: new CommandClient(
		DISCORD_TOKEN,
		{},
		{
			prefix: ']',
			owner: 'vegeta897#7777',
		}
	),
})

discord.connect()

async function registerCommands(): Promise<void> {
	discord.registerCommand(
		(await import('./Commands/Roll/RollCommand')).RollCommand
	)
}
registerCommands().catch(console.error)
