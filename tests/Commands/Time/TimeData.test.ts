import TZUserData from '@src/Commands/Time/TimeData'
import { UserID } from '@src/Types/Discord'
import { TimeZoneName } from '@src/Types/Time'

const { convertToJSON, loadJSON } = TZUserData

describe('TZUserData', () => {
	it('converts users map to array of [key,value]', () => {
		const values: [UserID, TimeZoneName][] = [['123', 'America/New_York']]
		const data: { users: Map<UserID, TimeZoneName> } = {
			users: new Map(values),
		}
		expect(convertToJSON.bind({ data })()).toStrictEqual({ users: values })
	})
	it('converts array to map', () => {
		const values: [string, string][] = [['123', 'America/New_York']]
		loadJSON.bind(TZUserData)({ users: values })
		expect(TZUserData.data).toStrictEqual({ users: new Map(values) })
	})
})
