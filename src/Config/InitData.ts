import type { ConfigType } from '../Types/Config'

const InitData: ConfigType = {
	Discord: {
		defaultChannelID: null,
	},
	Time: {
		timeZones: new Map([['Eastern', 'America/New_York']]),
	},
}
export default InitData
