import { DBotCommand } from '../Command'
import Discord from '../../Core/Discord'
import type { TextChannel } from 'eris'
import {
	assignUserTimeZone,
	getTimeZoneUserList,
	validateTimeZones,
} from './Time'

export const TimeCommand = new DBotCommand({
	label: 'time',
	init: () => {
		validateTimeZones()
	},
	execute: ({ params, message: { channel, content, author } }) => {
		if (params.length === 0) {
			return getTimeZoneUserList(channel as TextChannel)
		} else {
			return assignUserTimeZone(
				Discord.stripCommand(content).toLowerCase(),
				author.id
			)
		}
	},
	commandOptions: {
		aliases: ['timezone', 'tz'],
		description: 'View and assign time zones',
		fullDescription:
			'View local user times and assign your own time zone\nExample: `eastern`',
		usage: '`eastern`',
		guildOnly: true,
	},
})
