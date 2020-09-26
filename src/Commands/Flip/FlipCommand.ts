import { DBotCommand } from '../Command'
import { CreateResultList } from '../Common/ResultList'
import random from 'random'

export const FlipCommand = new DBotCommand({
	label: 'flip',
	execute: ({ params }) => {
		let flips = 1
		if (params.length > 0) {
			flips = +params[0]
			if (isNaN(flips)) flips = 1
			if (flips > 40) throw 'Number of flips must be less than 40'
			if (flips < 1) throw 'Number of flips must be at least 1'
		}
		const message = [
			`Flipping a coin${flips > 1 ? ` **${flips}** times` : ''}!`,
		]
		const results: string[] = []
		for (let i = 0; i < flips; i++) {
			results.push(`**${random.int() > 0 ? 'Heads' : 'Tails'}**`)
		}
		const { resultList } = CreateResultList(results, {
			resultsPerLineSizes: [1, 5, 7],
		})
		message.push(resultList)
		return message.join('\n')
	},
	commandOptions: {
		description: 'Flip one or more coins',
		usage: '`x`',
	},
})
