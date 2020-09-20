import type {
	CommandClient,
	CommandGeneratorFunction,
	CommandOptions,
} from 'eris'
import * as t from 'io-ts'
import { isRight } from 'fp-ts/Either'

interface DBotCommandOptions {
	label: string
	commandOptions?: CommandOptions
}

interface DBotCommandSimpleOptions extends DBotCommandOptions {
	execute: (executeParams: {
		message?: Parameters<CommandGeneratorFunction>[0]
		params: string[]
	}) => ReturnType<CommandGeneratorFunction>
}

export abstract class DBotCommand {
	private readonly label
	protected readonly options: CommandOptions
	protected constructor({ label, commandOptions }: DBotCommandOptions) {
		this.label = label
		this.options = { caseInsensitive: true, ...commandOptions }
	}
	protected readonly generator?: CommandGeneratorFunction
	readonly register = (client: CommandClient): void => {
		client.registerCommand(
			this.label,
			this.generator as CommandGeneratorFunction,
			this.options
		)
	}
}

export class DBotCommandSimple extends DBotCommand {
	readonly execute
	constructor({ execute, ...options }: DBotCommandSimpleOptions) {
		super(options)
		this.execute = execute
	}
	readonly generator: CommandGeneratorFunction = (message, params) => {
		try {
			return this.execute({ message, params })
		} catch (err) {
			return err
		}
	}
}

interface DBotCommandParsedOptions<
	T extends Record<string, number | string | undefined>
> extends DBotCommandOptions {
	processor: {
		parsers: { (params: string[]): T | void }[]
		validator: t.Type<T>
	}
	execute: (executeParams: {
		message?: Parameters<CommandGeneratorFunction>[0]
		params: T
	}) => ReturnType<CommandGeneratorFunction>
}

export class DBotCommandParsed<
	T extends Record<string, number | string | undefined>
> extends DBotCommand {
	private readonly processor
	readonly execute
	constructor({ processor, execute, ...options }: DBotCommandParsedOptions<T>) {
		super(options)
		this.execute = execute
		this.processor = processor
	}
	parse = (params: string[]): T => {
		let parsed
		for (const parser of this.processor.parsers) {
			const parseAttempt = parser(params)
			if (
				parseAttempt &&
				isRight(this.processor.validator.decode(parseAttempt))
			) {
				parsed = parseAttempt
				break
			}
		}
		if (!parsed)
			throw (
				'Invalid parameters' +
				(this.options.usage ? ', try ' + this.options.usage : '')
			)
		return parsed
	}
	readonly generator: CommandGeneratorFunction = (message, params) => {
		let parsedParams
		try {
			parsedParams = this.parse(params)
		} catch (parseError) {
			console.log('101 reached!!')
			return parseError
		}
		try {
			return this.execute({ message, params: parsedParams })
		} catch (executeError) {
			return executeError
		}
	}
}
