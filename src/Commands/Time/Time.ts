import createJSONFile from '../../Core/Storage/JSONFile'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import type { TextChannel } from 'eris'
import Discord from '../../Core/Discord'
import Config from '../../Config'
import type { TimeZoneName } from '../../Types/Time'
import type { UserID } from '../../Types/Discord'
import JSONData from '../../Core/Storage/JSONData'

dayjs.extend(utc)
dayjs.extend(timezone)

const data = new JSONData<{ users: Map<UserID, TimeZoneName> }>({
	data: { users: new Map() },
	convertToJSON: function () {
		return { users: [...this.data.users] }
	},
	loadJSON: function (data) {
		Object.assign(this.data, {
			users: new Map(data.users as [UserID, TimeZoneName][]),
		})
	},
})

const tzData = createJSONFile('tz-users', { data })

export function validateTimeZones(): void {
	// Validate time zones in config
	const { timeZones } = Config.getModuleData('Time')
	if (timeZones.size === 0) throw 'No time zones have been defined in config'
	timeZones.forEach((timeZoneName) => {
		try {
			dayjs.tz(Date.now(), timeZoneName)
		} catch (e) {
			throw `Invalid time zone name defined in config: ${timeZoneName}`
		}
	})
}

export function getTimeZoneUserList({ guild }: TextChannel): string {
	const tzUsers = tzData.get('users')
	if (tzUsers.size === 0) throw 'Assign yourself to a time zone'
	const timeZoneList = [...Config.getModuleData('Time').timeZones.entries()]
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

export function assignUserTimeZone(inputName: string, userID: UserID): string {
	const { timeZones } = Config.getModuleData('Time')
	const [tzLabel, tzName] =
		[...timeZones.entries()].find(([tzLabel, tzName]) => {
			return (
				inputName === tzName.toLowerCase() ||
				inputName === tzLabel.toLowerCase()
			)
		}) || []
	if (!tzName) {
		return `Invalid time zone, try one of these:\n> ${[
			...timeZones.keys(),
		].join(', ')}`
	}
	tzData.trans('users', (users) => {
		// Clean up undefined users and time zones
		const TimeZoneNames = [...timeZones.values()]
		for (const [tzUserID, timeZone] of users) {
			if (
				!Discord.bot.users.has(tzUserID) ||
				!TimeZoneNames.includes(timeZone)
			) {
				users.delete(tzUserID)
			}
		}
		users.set(userID, tzName)
		return users
	})
	return `Your time zone is now ${tzLabel}`
}
