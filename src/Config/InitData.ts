import type { TimeZone } from '../Types/Time'

type TimeZones = Record<string, TimeZone>

interface IDiscordConfig {
	defaultChannelID: string | null
}
interface ITimeConfig {
	timeZones: TimeZones
}
export type ConfigType = {
	discord: IDiscordConfig
	time: ITimeConfig
}

const InitData: ConfigType = {
	discord: {
		defaultChannelID: null,
	},
	time: {
		timeZones: {
			Eastern: 'America/New_York',
		},
	},
}
export default InitData
