import type { ConfigType, TimeZones } from '../Types/Config'
import type { MapToTuple } from '../Types/Util'
import JSONData from '../Core/Storage/JSONData'

const InitData: ConfigType = {
	Discord: {
		defaultChannelID: null,
	},
	Time: {
		timeZones: new Map([['Eastern', 'America/New_York']]),
	},
}
const InitDataModel = new JSONData<ConfigType>({
	data: InitData,
	convertToJSON: function (data) {
		return {
			...data,
			Time: { timeZones: [...data.Time.timeZones] },
		}
	},
	loadJSON: function (data, jsonData) {
		const Time = jsonData.Time as { timeZones: MapToTuple<TimeZones> }
		Object.assign(data, {
			...jsonData,
			Time: { timeZones: new Map(Time.timeZones) },
		})
	},
})
export default InitDataModel
