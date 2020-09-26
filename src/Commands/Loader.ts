import glob from 'glob'
import { Discord } from '../Core/Discord'
import { DBotCommand } from './Command'

export async function LoadCommands(): Promise<void> {
	glob('*/Commands/*/*Command.ts', async (err, matches) => {
		if (err) console.error(err)
		let loaded = 0
		for (const match of matches) {
			try {
				const [, commandName] = match.match(
					/^src\/Commands\/\w+\/(\w+)Command\.ts$/
				) as string[]
				const commandModule = await import(
					`./${commandName}/${commandName}Command`
				)
				for (const exportName of Object.keys(commandModule)) {
					if (commandModule[exportName] instanceof DBotCommand) {
						commandModule[exportName].register(Discord.bot)
						loaded++
					}
				}
			} catch (e) {
				console.error(e)
			}
		}
		console.log('Loaded', loaded, 'commands!')
	})
}
