import { DBotCommand } from '../Command'
import random from 'random'

export const OddsCommand = new DBotCommand({
	label: 'whataretheodds',
	execute: () => `1 in ${Math.pow(10, random.int(1, 8)) * random.int(1, 9)}`,
	commandOptions: {
		description: 'What *are* the odds?',
	},
})
