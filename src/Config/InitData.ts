import type { ConfigType } from '../Types/Config'
import { MapPropertiesKey } from '../Constants/Config'

const InitData: ConfigType = {
	Discord: {
		defaultChannelID: null,
	},
	Time: {
		[MapPropertiesKey]: ['timeZones'],
		timeZones: new Map([['Eastern', 'America/New_York']]),
	},
}
export default InitData
