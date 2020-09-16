import type {
	CommandClient,
	CommandGeneratorFunction,
	CommandOptions,
} from 'eris'

export interface CommandProcessor<T = string[]> {
	parse?: (params: string[]) => T
	execute: (executeParams: {
		message: Parameters<CommandGeneratorFunction>[0]
		params: T
	}) => ReturnType<CommandGeneratorFunction>
}

export interface DBotCommandOptions {
	label: string
	processor: CommandProcessor<any>
	commandOptions?: CommandOptions
}

export class DBotCommand {
	private readonly label
	private readonly processor
	private readonly options?: CommandOptions
	constructor({ label, processor, commandOptions }: DBotCommandOptions) {
		this.label = label
		this.processor = processor
		this.options = { caseInsensitive: true, ...commandOptions }
	}
	private readonly generator: CommandGeneratorFunction = (message, params) => {
		try {
			return this.processor.execute({
				message,
				params: this.processor.parse ? this.processor.parse(params) : params,
			})
		} catch (err) {
			return err
		}
	}
	readonly register = (client: CommandClient): void => {
		client.registerCommand(this.label, this.generator, this.options)
	}
}
