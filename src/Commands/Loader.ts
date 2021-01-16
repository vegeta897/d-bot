import glob from 'glob'
import Discord from '../Core/Discord'
import { DBotCommand } from './Command'
import clearModule from 'clear-module'

export async function LoadCommands(): Promise<void> {
	glob('*/Commands/*/*Command.ts', async (err, matches) => {
		if (err) console.error(err)
		const loadedCommands = []
		for (const match of matches) {
			try {
				const [, moduleName] = match.match(
					/^src\/Commands\/\w+\/(\w+)Command\.ts$/
				) as string[]
				loadedCommands.push(...(await loadCommandModule(moduleName as string)))
			} catch (e) {
				console.error(e)
			}
		}
		loadedCommands.forEach((command) => {
			command.register(Discord.bot)
			if (command.init) command.init(onReady)
		})
		console.log('Loaded', loadedCommands.length, 'commands!')
	})
	Discord.bot.registerCommand(
		'reload',
		(message, [name]) => ReloadCommand(name as string),
		{ requirements: { permissions: { administrator: true } } }
	)
}

async function ReloadCommand(moduleName: string): Promise<string> {
	moduleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
	try {
		const commands = await loadCommandModule(moduleName)
		commands.forEach((command) => {
			if (command.terminate) command.terminate()
			command.unregister(Discord.bot)
		})
		clearModule.single(`./${moduleName}/${moduleName}Command`)
		const reloadedCommands = await loadCommandModule(moduleName)
		if (reloadedCommands.length > 0) {
			reloadedCommands.forEach((command) => {
				command.register(Discord.bot)
				if (command.init) command.init(onReady)
			})
			return `Successfully reloaded \`${moduleName}\``
		}
	} catch (err) {
		console.error(err)
		if (err.message.startsWith('Cannot find module')) {
			return `Unknown module \`${moduleName}\``
		}
	}
	return `Failed to reload \`${moduleName}\``
}

async function loadCommandModule(moduleName: string): Promise<DBotCommand[]> {
	const loadedCommands = []
	const commandModule = await import(`./${moduleName}/${moduleName}Command`)
	for (const exportName of Object.keys(commandModule)) {
		const command = commandModule[exportName]
		if (command instanceof DBotCommand) loadedCommands.push(command)
	}
	return loadedCommands
}

function onReady(fn: () => void) {
	if (Discord.ready) fn()
	else Discord.bot.on('ready', () => fn())
}
