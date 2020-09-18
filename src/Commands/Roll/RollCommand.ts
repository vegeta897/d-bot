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
				const [x, y] = xDy.toLowerCase().split('d')
				return { diceCount: +x, diceSides: +y }
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
