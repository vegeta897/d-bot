import { TimeCommand } from '@src/Commands/Time/TimeCommand'
import * as TimeFunctions from '@src/Commands/Time/Time'
import type { Message } from 'eris'
import Config from '@src/Config'
import InitDataModel from '@src/Config/InitData'

jest.mock('@src/Core/Storage/JSONFile')
jest
	.spyOn(Config, 'getModuleData')
	.mockImplementation(() => InitDataModel.data.Time)

const { execute, init, terminate } = TimeCommand

if (init) init((fn) => fn()) // For coverage
if (terminate) terminate()

describe('time command execution', () => {
	it('calls getTimeZoneUserList with no params', () => {
		const mockedGetTimeZoneUserList = jest
			.spyOn(TimeFunctions, 'getTimeZoneUserList')
			.mockImplementation()
		execute({ params: [], message: { channel: {} } as Message })
		expect(TimeFunctions.getTimeZoneUserList).toHaveBeenCalledTimes(1)
		mockedGetTimeZoneUserList.mockRestore()
	})

	it('calls assignUserTimeZone with input param', () => {
		const mockedAssignUserTimeZone = jest
			.spyOn(TimeFunctions, 'assignUserTimeZone')
			.mockImplementation()
		const userID = '123'
		const tz = 'eastern'
		execute({
			params: [''],
			message: { content: `/t ${tz}`, author: { id: userID } } as Message,
		})
		expect(TimeFunctions.assignUserTimeZone).toHaveBeenCalledTimes(1)
		expect(TimeFunctions.assignUserTimeZone).toHaveBeenCalledWith(tz, userID)
		mockedAssignUserTimeZone.mockRestore()
	})
})
