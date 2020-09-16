import { Roll } from './Roll'
import type { CommandProcessor, DBotCommandOptions } from '../Command'

const usage = '`XdY` or `X Y`'

const Errors = {
	Invalid: `Invalid usage, try ${usage}`,
}

const paramsRegex = /(\d+)[\D ]+(\d+)/

export const processor: CommandProcessor<[number, number]> = {
	parse: (params) => {
		const paramString = params.join(' ').toLowerCase()
		if (!paramsRegex.test(paramString)) {
			throw Errors.Invalid
		}
		const [, diceCount, diceSides] = [...paramString.matchAll(paramsRegex)][0]
		return [+diceCount, +diceSides]
	},
	execute: ({ params: [diceCount, diceSides] }) => {
		const result = Roll(diceCount, diceSides)
		return `Rolling a **${diceSides}** sided die **${diceCount}** times!
${result.map((roll) => `**${roll}**`).join('\n')}
Total: **${result.reduce((p, c) => p + c)}**`
	},
}

export const RollCommand: DBotCommandOptions = {
	label: 'roll',
	processor,
	commandOptions: {
		argsRequired: true,
		description: 'Roll some dice',
		fullDescription: 'Roll X number of Y-sided dice\nExample: `4d6`',
		usage,
	},
}

// TODO: Create parameter validation system
