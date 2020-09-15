import type { CommandClient, CommandGenerator, CommandOptions } from 'eris'

interface IDBotCommandArgs {
	label: string
	generator: CommandGenerator
	options?: CommandOptions
}

export class DBotCommand {
	private readonly label: string
	private readonly generator: CommandGenerator
	private readonly options?: CommandOptions
	constructor(args: IDBotCommandArgs) {
		this.label = args.label
		this.generator = args.generator
		this.options = { caseInsensitive: true, ...args.options }
	}
	register(client: CommandClient): void {
		client.registerCommand(this.label, this.generator, this.options)
	}
}
