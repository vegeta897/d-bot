import type {
	CommandClient,
	CommandGeneratorFunction,
	CommandOptions,
} from 'eris'

interface DBotCommandOptions {
	label: string
	commandOptions?: CommandOptions
	init?: (onReady: (fn: () => void) => void) => void
	terminate?: () => void
	execute: (executeParams: {
		message: Parameters<CommandGeneratorFunction>[0]
		params: string[]
	}) => ReturnType<CommandGeneratorFunction>
}

export class DBotCommand {
	private readonly label
	private readonly options: CommandOptions
	readonly init
	readonly execute
	readonly terminate
	constructor({
		init,
		terminate,
		execute,
		label,
		commandOptions,
	}: DBotCommandOptions) {
		this.init = init
		this.execute = execute
		this.terminate = terminate
		this.label = label
		this.options = { ...commandOptions }
	}
	readonly generator: CommandGeneratorFunction = (message, params) => {
		try {
			return this.execute({ message, params })
		} catch (err) {
			return err + (this.options.usage ? ', try ' + this.options.usage : '')
		}
	}
	readonly register = (client: CommandClient): void => {
		client.registerCommand(
			this.label,
			this.generator as CommandGeneratorFunction,
			this.options
		)
	}
	readonly unregister = (client: CommandClient): void => {
		if (client.commands[this.label]) client.unregisterCommand(this.label)
	}
}
