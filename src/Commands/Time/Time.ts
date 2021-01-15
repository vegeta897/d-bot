import JSONFile from '../../Core/Storage/JSONFile'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import type { TextChannel } from 'eris'
import Discord from '../../Core/Discord'
import Config from '../../Config'
import type { TimeZone } from '../../Types/Time'

dayjs.extend(utc)
dayjs.extend(timezone)

const initData: { users: Record<string, TimeZone> } = { users: {} }
const tzData = new JSONFile('tz-users', { initData })

export function validateTimeZones(): void {
	// Validate time zones in config
	const TimeZones = Config.getModuleData('time').timeZones
	if (Object.keys(TimeZones).length === 0)
		throw 'No time zones have been defined in config'
	Object.values(TimeZones).forEach((tz) => {
		try {
			dayjs.tz(Date.now(), tz)
		} catch (e) {
			throw `Invalid time zone name defined in config: ${tz}`
		}
	})
}

export function getTimeZoneUserList({ guild }: TextChannel): string {
	const tzUsers = tzData.getAsMap('users')
	if (tzUsers.size === 0) throw 'Assign yourself to a time zone'
	const timeZoneList = Object.entries(Config.getModuleData('time').timeZones)
		.map(([tzLabel, tzName]) => {
			const time = dayjs().tz(tzName)
			return {
				label: tzLabel,
				zoneName: tzName,
				gmtOffset: time.format('ZZ'),
				timestamp: time.format('ddd h:mm a'),
				users: [...tzUsers.entries()]
					.filter(([, userZoneName]) => userZoneName === tzName)
					.map(([userID]) => {
						const member = guild.members.get(userID)
						return member?.nick || member?.username
					})
					.filter((user) => user),
			}
		})
		.sort((a, b) => +a.gmtOffset - +b.gmtOffset)
		.filter((tz) => tz.users.length > 0)
	return (
		'__Local Times__\n' +
		timeZoneList
			.map((tz) => `${tz.timestamp} - **${tz.label}** - ${tz.users.join(', ')}`)
			.join('\n')
	)
}

export function assignUserTimeZone(inputName: string, userID: string): string {
	const TimeZones = Config.getModuleData('time').timeZones
	const [tzLabel, tzName] =
		Object.entries(Config.getModuleData('time').timeZones).find(
			([tzLabel, tzName]) => {
				return (
					inputName === tzName.toLowerCase() ||
					inputName === tzLabel.toLowerCase()
				)
			}
		) || []
	if (!tzName) {
		return `Invalid time zone, try one of these:\n> ${Object.keys(
			TimeZones
		).join(', ')}`
	}
	tzData.transAsMap('users', (users) => {
		// Clean up undefined users and time zones
		const TimeZoneNames = Object.values<TimeZone>(TimeZones)
		for (const [tzUserID, timeZone] of users) {
			if (!Discord.bot.users.has(tzUserID) || !TimeZoneNames.includes(timeZone))
				users.delete(tzUserID)
		}
		users.set(userID, tzName)
		return users
	})
	return `Your time zone is now ${tzLabel}`
}
