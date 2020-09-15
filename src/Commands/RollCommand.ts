import { Roll } from '../Modules/Roll'
import { DBotCommand } from './Command'

const paramsRegex = /(\d+)[\D ]+(\d+)/
const usage = '`XdY` or `X Y`'

// TODO: Create parameter validation system
export const RollCommand = new DBotCommand({
	label: 'roll',
	generator: (_msg, params) => {
		const paramString = params.join(' ').toLowerCase()
		if (!paramsRegex.test(paramString)) {
			return 'Invalid usage, try ' + usage
		}
		const [, diceCount, diceSides] = [...paramString.matchAll(paramsRegex)][0]
		const result = Roll(+diceCount, +diceSides)
		return `Rolling a **${diceSides}** sided die **${diceCount}** times!
${result.map((roll) => `**${roll}**`).join('\n')}
Total: **${result.reduce((p, c) => p + c)}**`
	},
	options: {
		argsRequired: true,
		description: 'Roll some dice',
		fullDescription: 'Roll X number of Y-sided dice\nExample: `4d6`',
		usage,
	},
})
