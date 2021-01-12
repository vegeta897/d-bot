import { DBotCommand } from '../Command'
import { number, object, string } from 'superstruct'
import { Parser } from '../Parser'
import timestring from 'timestring'
import Reminder, { initReminders, terminateReminders } from './Reminder'
import clearModule from 'clear-module'

export const RemindParser = new Parser({
	validator: object({
		time: number(),
		text: string(),
	}),
	parsers: [
		(params) => {
			if (params.length < 2) return
			let seconds: number | undefined
			let text: string | undefined
			for (let i = 1; i < params.length; i++) {
				try {
					seconds = timestring(params.slice(0, i).join(' '))
					text = params.slice(i).join(' ')
				} catch (err) {}
			}
			if (!seconds || seconds <= 0 || !text) {
				return
			}
			return { time: seconds * 1000, text }
		},
	],
})

export const RemindCommand = new DBotCommand({
	label: 'remind',
	init: (onReady) => {
		onReady(() => initReminders())
	},
	execute: ({ params, message }) => {
		const { time, text } = RemindParser.parse(params)
		const reminder = new Reminder({
			time: Date.now() + time,
			text,
			creator: message.author.id,
			channel: message.channel.id,
		})
		return `✅ Reminder set for: ${reminder.getHumanDuration()}`
	},
	terminate: () => {
		terminateReminders()
		clearModule.single('./Reminder')
	},
	commandOptions: {
		argsRequired: true,
		description: 'Set a time-activated reminder',
		fullDescription:
			'Set a time-activated reminder\nExample: `30m check on that thing`',
		usage: '`30m check on that thing` or `3 days 8 hours pay your rent`',
	},
})
