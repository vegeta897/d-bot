import { Roll } from './Roll'
import { DBotCommand } from '../Command'
import { Parser } from '../Parser'
import { CreateResultList } from '../Common/ResultList'
import { object, number } from 'superstruct'
import clearModule from 'clear-module'

export const RollParser = new Parser({
	validator: object({
		diceSides: number(),
		diceCount: number(),
	}),
	parsers: [
		([xDy]) => {
			// roll 2d6
			if (!/\d+d\d+/i.test(xDy)) return
			const [diceCount, diceSides] = xDy
				.toLowerCase()
				.split('d')
				.map((n) => +n)
			return { diceCount, diceSides }
		},
		([x, yOrDelimiter, y2]) => {
			// roll 2 6
			// roll 2 d 6
			const diceCount = +x
			const diceSides = +yOrDelimiter || +y2
			if (isNaN(diceCount) || isNaN(diceSides)) return
			return { diceCount, diceSides }
		},
		([x]) => {
			// roll 6
			const diceSides = +x
			if (isNaN(diceSides)) return
			return { diceCount: 1, diceSides }
		},
	],
})

export const RollCommand = new DBotCommand({
	label: 'roll',
	execute: ({ params }) => {
		const { diceCount, diceSides } = RollParser.parse(params)
		if (diceSides < 2) throw 'Number of sides must be at least 2'
		if (diceSides > 0x7fffffff) throw 'Number of sides must be a 32-bit integer'
		if (diceCount < 1) throw 'Number of dice must be at least 1'
		if (diceCount > 1000000) throw 'Number of dice must be less than a million'
		const rolls = Roll(diceCount, diceSides)
		const message = [
			`Rolling a **${diceSides}** sided die${
				diceCount > 1 ? ` **${diceCount}** times` : ''
			}!`,
		]
		message.push(
			CreateResultList(
				rolls.map((roll) => `**${roll}**`),
				{
					resultsPerLineSizes: [1, 5, 10],
					delimiter: ' ',
				}
			).resultList
		)
		if (diceCount > 1) {
			message.push(`Total: **${rolls.reduce((p, c) => p + c)}**`)
		}
		return message.join('\n')
	},
	terminate: () => {
		clearModule.single('./Roll')
	},
	commandOptions: {
		argsRequired: true,
		description: 'Roll some dice',
		fullDescription: 'Roll X number of Y-sided dice\nExample: `4d6`',
		usage: '`XdY` or `X Y`',
	},
})
