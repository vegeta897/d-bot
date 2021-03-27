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
	convertToJSON: function () {
		return {
			...this.data,
			Time: { timeZones: [...this.data.Time.timeZones] },
		}
	},
	loadJSON: function (jsonData) {
		const Time = jsonData.Time as { timeZones: MapToTuple<TimeZones> }
		Object.assign(this.data, {
			...jsonData,
			Time: { timeZones: new Map(Time.timeZones) },
		})
	},
})
export default InitDataModel
