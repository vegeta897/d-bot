import type { TimeZoneLabel, TimeZoneName } from './Time'
import { MapPropertiesKey } from '../Constants/Config'

interface IConfigProp<T> {
	[MapPropertiesKey]?: (keyof T)[]
	[index: string]: unknown
}

export type TimeZones = Map<TimeZoneLabel, TimeZoneName>

export type DiscordConfig = IConfigProp<TimeConfig> & {
	defaultChannelID: string | null
}
export type TimeConfig = IConfigProp<TimeConfig> & {
	timeZones: TimeZones
}
export type ConfigType = {
	Discord: DiscordConfig
	Time: TimeConfig
}
