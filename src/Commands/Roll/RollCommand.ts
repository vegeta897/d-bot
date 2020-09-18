import { Roll } from './Roll'
import { DBotCommandParsed } from '../Command'
import * as t from 'io-ts'

const RollParamsV = t.type({
	diceSides: t.number,
	diceCount: t.number,
})

type RollParams = t.TypeOf<typeof RollParamsV>

export const RollCommand = new DBotCommandParsed<RollParams>({
	label: 'roll',
	processor: {
		validator: RollParamsV,
		parsers: [
			([xDy]) => {
				if (!/\d+d\d+/i.test(xDy)) return
				const [diceCount, diceSides] = xDy
					.toLowerCase()
					.split('d')
					.map((n) => +n)
				if (isNaN(diceCount) || isNaN(diceSides)) return
				return { diceCount, diceSides }
			},
			([x, y]) => {
				if (x === '') return
				const diceCount = +x
				const diceSides = +y
				if (isNaN(diceCount) || isNaN(diceSides)) return
				return { diceCount, diceSides }
			},
			([x]) => {
				if (x === '') return
				const diceSides = +x
				if (isNaN(diceSides)) return
				return { diceCount: 1, diceSides }
			},
		],
	},
	execute: ({ params: { diceCount, diceSides } }) => {
		if (diceSides < 2) throw 'Number of sides must be at least 2'
		if (diceSides > 0x7fffffff) throw 'Number of sides must be a 32-bit integer'
		if (diceCount < 1) throw 'Number of dice must be at least 1'
		if (diceCount > 100) throw 'Number of dice must be less than 100'
		const result = Roll(diceCount, diceSides)
		const message = [
			`Rolling a **${diceSides}** sided die`,
			'!\n',
			result.map((roll) => `**${roll}**`).join('\n'),
		]
		if (diceCount > 1) {
			message[0] += ` **${diceCount}** times`
			message.push(`\nTotal: **${result.reduce((p, c) => p + c)}**`)
		}
		return message.join('')
	},
	commandOptions: {
		argsRequired: true,
		description: 'Roll some dice',
		fullDescription: 'Roll X number of Y-sided dice\nExample: `4d6`',
		usage: '`XdY` or `X Y`',
	},
})
