import { DBotCommand } from '../Command'
import { Parser } from '../Parser'
import { object, string, array } from 'superstruct'
import random from 'random'

export const PickParser = new Parser({
	validator: object({
		choices: array(string()),
	}),
	parsers: [
		(params) => {
			// pick 1, 2 or 3
			const choices = params
				.join(' ')
				.replace(/ or /gi, ', ')
				.replace(/,+ /g, ' or ')
				.split(' or ')
			if (choices.length === 1) return
			return { choices }
		},
		(choices) => {
			// pick 1 2 3
			return { choices }
		},
	],
})

export const PickCommand = new DBotCommand({
	label: 'pick',
	execute: ({ params }) => {
		const { choices } = PickParser.parse(params)
		return choices[random.int(choices.length - 1)]
	},
	commandOptions: {
		argsRequired: true,
		description: 'Pick a random item',
		fullDescription:
			'Pick a random item from a list. Use commas to separate choices, or spaces if your choices have no spaces',
		usage: '`A, B or C` or `A B C`',
	},
})
