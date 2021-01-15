import { PropertyParent, PropertyValue } from './Property'
import { nullable, record, refine, string, Struct } from 'superstruct'
import type { ConfigType, DiscordConfig, TimeConfig } from '../Types/Config'
import { TimeZoneList } from '../Constants/Time'
import type { TimeZone } from '../Types/Time'

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
	schema: record(
		string(),
		refine(string(), 'TimeZone', (value) =>
			TimeZoneList.includes(value as TimeZone)
		) as Struct<TimeZone>
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
