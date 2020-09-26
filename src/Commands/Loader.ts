import glob from 'glob'
import { Discord } from '../Core/Discord'
import { DBotCommand } from './Command'
import clearModule from 'clear-module'

export async function LoadCommands(): Promise<void> {
	glob('*/Commands/*/*Command.ts', async (err, matches) => {
		if (err) console.error(err)
		let loaded = 0
		for (const match of matches) {
			try {
				const [, moduleName] = match.match(
					/^src\/Commands\/\w+\/(\w+)Command\.ts$/
				) as string[]
				loaded = await loadCommandModule(moduleName)
			} catch (e) {
				console.error(e)
			}
		}
		console.log('Loaded', loaded, 'commands!')
	})
	Discord.bot.registerCommand(
		'reload',
		(message, [name]) => ReloadCommand(name),
		{ requirements: { permissions: { administrator: true } } }
	)
}

async function ReloadCommand(moduleName: string): Promise<string> {
	moduleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
	try {
		clearModule(`./${moduleName}/${moduleName}Command`)
		await loadCommandModule(moduleName)
		return `Successfully reloaded \`${moduleName}\``
	} catch (err) {
		console.error(err)
		if (err.message.startsWith('Cannot find module')) {
			return `Unknown module \`${moduleName}\``
		}
		return `Failed to reload \`${moduleName}\``
	}
}

async function loadCommandModule(moduleName: string): Promise<number> {
	let loaded = 0
	const commandModule = await import(`./${moduleName}/${moduleName}Command`)
	for (const exportName of Object.keys(commandModule)) {
		const command = commandModule[exportName]
		if (command instanceof DBotCommand) {
			command.unregister(Discord.bot)
			command.register(Discord.bot)
			loaded++
		}
	}
	return loaded
}
