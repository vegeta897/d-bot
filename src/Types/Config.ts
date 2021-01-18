import type { TimeZoneLabel, TimeZoneName } from './Time'

export type TimeZones = Map<TimeZoneLabel, TimeZoneName>

export type DiscordConfig = {
	defaultChannelID: string | null
}

export type TimeConfig = {
	timeZones: TimeZones
}

export type ConfigType = {
	Discord: DiscordConfig
	Time: TimeConfig
}
