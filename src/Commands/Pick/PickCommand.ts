import { DBotCommandParsed } from '../Command'
import * as t from 'io-ts'
import random from 'random'

const PickParamsV = t.type({
	choices: t.array(t.string),
})

type PickParams = t.TypeOf<typeof PickParamsV>

export const PickCommand = new DBotCommandParsed<PickParams>({
	label: 'pick',
	processor: {
		validator: PickParamsV,
		parsers: [
			(params) => {
				// pick 1, 2 or 3
				const choices = params
					.join(' ')
					.replace(/ or /gi, ', ')
					.replace(/,+ /g, ' or ')
					.split(' or ')
				if (choices.length === 1) return
				if (choices[0] === '') return
				return {
					choices,
				}
			},
			(choices) => {
				// pick 1 2 3
				return { choices }
			},
		],
	},
	execute: ({ params: { choices } }) => {
		console.log(choices)
		return choices[random.int(choices.length)]
	},
	commandOptions: {
		argsRequired: true,
		description: 'Pick a random item',
		fullDescription:
			'Pick a random item from a list. Use commas to separate choices, or spaces if your choices have no spaces',
		usage: '`A, B or C` or `A B C`',
	},
})
