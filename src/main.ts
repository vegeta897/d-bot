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
	discord.registerCommand(
		(await import('./Commands/Ping/PingCommand')).PingCommand
	)
	discord.registerCommand(
		(await import('./Commands/Odds/OddsCommand')).OddsCommand
	)
	discord.registerCommand(
		(await import('./Commands/Flip/FlipCommand')).FlipCommand
	)
}
registerCommands().catch(console.error)
