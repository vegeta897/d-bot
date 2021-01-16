import {
	validateTimeZones,
	getTimeZoneUserList,
	assignUserTimeZone,
} from '@src/Commands/Time/Time'
import { mocked } from 'ts-jest/utils'
import JSONFile from '@src/Core/Storage/JSONFile'
import Discord from '@src/Core/Discord'
import Config from '@src/Config'
import InitData from '@src/Config/InitData'
import type { TextChannel, CommandClient } from 'eris'
import type { TimeZoneLabel, TimeZoneName } from '@src/Types/Time'
import { UserID } from '@src/Types/Discord'

jest.mock('@src/Core/Storage/JSONFile')
const mockedJSONFile = mocked(JSONFile, true).mock.instances[0] as JSONFile<{
	users: Map<UserID, TimeZoneName>
}>

jest.spyOn(Config, 'getModuleData').mockImplementation(() => InitData.time)

function mockConfigTimeZones(timeZones: Map<TimeZoneLabel, TimeZoneName>) {
	jest.spyOn(Config, 'getModuleData').mockImplementationOnce(() => ({
		timeZones,
	}))
}

describe('time zone validation', () => {
	it('does not throw with at least one valid time zone defined', () => {
		expect(() => validateTimeZones()).not.toThrow()
	})
	it('throws if no time zones defined', () => {
		mockConfigTimeZones(new Map())
		expect(() => validateTimeZones()).toThrow(
			'No time zones have been defined in config'
		)
	})
	it('throws if invalid time zone defined', () => {
		const invalidTimeZone = 'avalon'
		// @ts-expect-error Deliberately testing an invalid time zone
		mockConfigTimeZones(new Map([[invalidTimeZone, invalidTimeZone]]))
		expect(() => validateTimeZones()).toThrow(
			`Invalid time zone name defined in config: ${invalidTimeZone}`
		)
	})
})

describe('time zone user listing', () => {
	const mockedGet = jest.spyOn(mockedJSONFile, 'get')

	it('returns time zone user list', () => {
		mockConfigTimeZones(
			new Map([
				['Eastern', 'America/New_York'],
				['Central', 'America/Chicago'],
			])
		)
		mockedGet.mockImplementationOnce(
			() =>
				new Map([
					['123', 'America/New_York'],
					['invalid', 'America/New_York'],
				]) as Map<UserID, TimeZoneName>
		)
		expect(
			getTimeZoneUserList({
				guild: { members: new Map([['123', { username: 'user' }]]) },
			} as TextChannel)
		).toMatch(/^__Local Times__/)
	})
	it('throws with no users assigned to time zones', () => {
		mockedGet.mockImplementationOnce(() => new Map<UserID, TimeZoneName>())
		expect(() =>
			getTimeZoneUserList({ guild: { members: new Map() } } as TextChannel)
		).toThrow('Assign yourself to a time zone')
	})
})

describe('assigning user time zones', () => {
	jest.spyOn(Discord, 'bot', 'get').mockImplementation(() => {
		return {
			users: new Map([
				['123', {}],
				['456', {}],
			]),
		} as CommandClient
	})
	it('confirms assigned time zone', () => {
		const confirmation = 'Your time zone is now Eastern'
		expect(assignUserTimeZone('eastern', '123')).toBe(confirmation)
		expect(assignUserTimeZone('america/new_york', '123')).toBe(confirmation)
	})
	const mockedTrans = jest.spyOn(mockedJSONFile, 'trans')
	it('updates time zone user storage', () => {
		mockedTrans.mockClear()
		assignUserTimeZone('eastern', '123')
		expect(mockedTrans.mock.calls[0][1](new Map())).toStrictEqual(
			new Map([['123', 'America/New_York']])
		)
	})
	it('cleans up time zone user storage', () => {
		mockedTrans.mockClear()
		mockedTrans.mockImplementationOnce((key, transFn) => {
			return transFn(
				new Map([
					['123', 'America/New_York'],
					['invalid', 'America/New_York'],
					['456', 'invalid'],
					['invalid2', 'invalid'],
				]) as Map<UserID, TimeZoneName>
			) as Map<UserID, TimeZoneName>
		})
		assignUserTimeZone('eastern', '789')
		expect(mockedTrans.mock.calls[0][1](new Map())).toStrictEqual(
			new Map([['789', 'America/New_York']])
		)
	})
	it('returns warning for invalid time zone', () => {
		expect(assignUserTimeZone('avalon', '')).toMatch(/^Invalid time zone/)
	})
})
