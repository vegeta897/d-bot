import { PropertyParent, PropertyValue } from './Property'
import { nullable, refine, string, Struct, map } from 'superstruct'
import type { ConfigType, DiscordConfig, TimeConfig } from '../Types/Config'
import { TimeZoneList } from '../Constants/Time'
import type { TimeZoneName } from '../Types/Time'

const defaultChannelID = new PropertyValue<DiscordConfig['defaultChannelID']>({
	name: 'defaultChannelID',
	description:
		'A fallback channel ID for the bot to send undeliverable messages to',
	shortDescription: 'Default channel ID',
	example: '`104105342614376448`',
	schema: nullable(string()),
})
const timeZones = new PropertyValue<TimeConfig['timeZones']>({
	name: 'timeZones',
	description: `The list of available time zones that a user can assign themself to

**Key**: The short name for the time zone, used in the \`/time\` command
**Value**: The time zone code, see <https://w.wiki/4Jx>`,
	shortDescription: 'User time zone list',
	example: '`Eastern` : `America/New_York`',
	schema: map(
		string(),
		refine(string(), 'TimeZone', (value) =>
			TimeZoneList.includes(value as TimeZoneName)
		) as Struct<TimeZoneName>
	),
})

export const ConfigProperties: Record<
	keyof ConfigType,
	PropertyParent<ConfigType[keyof ConfigType]>
> = {
	Discord: new PropertyParent<DiscordConfig>({
		name: 'Discord',
		description: 'Discord options',
		properties: [defaultChannelID],
	}),
	Time: new PropertyParent<TimeConfig>({
		name: 'Time',
		description: 'Command options related to time',
		properties: [timeZones],
	}),
}
