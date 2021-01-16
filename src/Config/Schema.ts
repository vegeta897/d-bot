import { PropertyParent, PropertyValue } from './Property'
import { nullable, refine, string, Struct, map } from 'superstruct'
import type { ConfigType, DiscordConfig, TimeConfig } from '../Types/Config'
import { TimeZoneList } from '../Constants/Time'
import type { TimeZoneName } from '../Types/Time'

const defaultChannelID = new PropertyValue<
	ConfigType['discord']['defaultChannelID']
>({
	name: 'defaultChannelID',
	description: 'A fallback channel ID to send messages to',
	schema: nullable(string()),
})
const timeZones = new PropertyValue<ConfigType['time']['timeZones']>({
	name: 'timeZones',
	description: '',
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
	discord: new PropertyParent<DiscordConfig>({
		name: 'discord',
		description: 'Discord options',
		properties: [defaultChannelID],
	}),
	time: new PropertyParent<TimeConfig>({
		name: 'time',
		description: 'Command options related to time',
		properties: [timeZones],
	}),
}
