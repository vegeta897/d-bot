import { TimeCommand } from '@src/Commands/Time/TimeCommand'
import * as TimeFunctions from '@src/Commands/Time/Time'
import type { Message } from 'eris'
import Config from '@src/Config'
import InitData from '@src/Config/InitData'

const { execute, init } = TimeCommand

jest.spyOn(Config, 'getModuleData').mockImplementation(() => InitData.time)

if (init) init((fn) => fn()) // For coverage

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
		execute({
			params: [''],
			message: { content: '', author: { id: '' } } as Message,
		})
		expect(TimeFunctions.assignUserTimeZone).toHaveBeenCalledTimes(1)
		mockedAssignUserTimeZone.mockRestore()
	})
})
