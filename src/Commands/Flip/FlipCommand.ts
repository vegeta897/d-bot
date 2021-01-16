import { DBotCommand } from '../Command'
import { CreateResultList } from '../Common/ResultList'
import random from 'random'

export const FlipCommand = new DBotCommand({
	label: 'flip',
	execute: ({ params }) => {
		let flips = 1
		if (params[0]) {
			flips = +params[0]
			if (isNaN(flips)) flips = 1
			if (flips < 1) throw 'Number of flips must be at least 1'
			if (flips > 1000000) throw 'Number of flips must be less than a million'
		}
		const message = [
			`Flipping a coin${flips > 1 ? ` **${flips}** times` : ''}!`,
		]
		const results: string[] = []
		for (let i = 0; i < flips; i++) {
			results.push(`**${random.int() > 0 ? 'Heads' : 'Tails'}**`)
		}
		const { resultList, truncated } = CreateResultList(results, {
			resultsPerLineSizes: [1, 5, 7],
		})
		message.push(resultList)
		if (truncated) {
			const headsCount = results.filter((r) => r.includes('Heads')).length
			message.push(
				`Heads: **${headsCount}**, Tails: **${results.length - headsCount}**`
			)
		}
		return message.join('\n')
	},
	commandOptions: {
		description: 'Flip one or more coins',
		usage: '`x`',
	},
})
