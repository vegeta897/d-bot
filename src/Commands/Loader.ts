import glob from 'glob'
import { Discord } from '../Core/Discord'

export async function LoadCommands(): Promise<void> {
	glob('*/Commands/*/*Command.ts', async (err, matches) => {
		if (err) console.error(err)
		let loaded = 0
		for (const match of matches) {
			try {
				const command = await import(
					match.replace('src/Commands', '.').replace('.ts', '')
				)
				const [, commandName] = match.match(
					/^src\/Commands\/\w+\/(\w+Command)\.ts$/
				) as string[]
				command[commandName].register(Discord.bot)
				loaded++
			} catch (e) {
				console.log(e)
			}
		}
		console.log('Loaded', loaded, 'commands!')
	})
}
