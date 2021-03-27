import JSONData from '../../Core/Storage/JSONData'
import { UserID } from '../../Types/Discord'
import { TimeZoneName } from '../../Types/Time'

const TZUserData = new JSONData<{ users: Map<UserID, TimeZoneName> }>({
	data: { users: new Map() },
	convertToJSON: function () {
		return { users: [...this.data.users] }
	},
	loadJSON: function (jsonData) {
		Object.assign(this.data, {
			users: new Map(jsonData.users as [UserID, TimeZoneName][]),
		})
	},
})

export default TZUserData
