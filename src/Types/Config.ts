import type { TimeZone } from './Time'

export type TimeZones = Record<string, TimeZone>

export type DiscordConfig = {
	defaultChannelID: string | null
}
export type TimeConfig = {
	timeZones: TimeZones
}
export type ConfigType = {
	discord: DiscordConfig
	time: TimeConfig
}
