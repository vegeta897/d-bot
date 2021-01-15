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
import type { TimeZone } from '@src/Types/Time'

jest.mock('@src/Core/Storage/JSONFile')
const mockedJSONFile = mocked(JSONFile, true).mock.instances[0]

jest.spyOn(Config, 'getModuleData').mockImplementation(() => InitData.time)

function mockConfigTimeZones(timeZones: Record<string, TimeZone>) {
	jest.spyOn(Config, 'getModuleData').mockImplementationOnce(() => ({
		timeZones,
	}))
}

describe('time zone validation', () => {
	it('does not throw with at least one valid time zone defined', () => {
		expect(() => validateTimeZones()).not.toThrow()
	})
	it('throws if no time zones defined', () => {
		mockConfigTimeZones({})
		expect(() => validateTimeZones()).toThrow(
			'No time zones have been defined in config'
		)
	})
	it('throws if invalid time zone defined', () => {
		const invalidTimeZone = 'avalon'
		mockConfigTimeZones({
			// @ts-expect-error Deliberately testing an invalid time zone
			[invalidTimeZone]: invalidTimeZone,
		})
		expect(() => validateTimeZones()).toThrow(
			`Invalid time zone name defined in config: ${invalidTimeZone}`
		)
	})
})

describe('time zone user listing', () => {
	const mockedGetAsMap = jest.spyOn(mockedJSONFile, 'getAsMap')

	it('returns time zone user list', () => {
		mockConfigTimeZones({
			Eastern: 'America/New_York',
			Central: 'America/Chicago',
		})
		mockedGetAsMap.mockImplementationOnce(
			() =>
				new Map([
					['123', 'America/New_York'],
					['invalid', 'America/New_York'],
				]) as Map<never, unknown>
		)
		expect(
			getTimeZoneUserList({
				guild: { members: new Map([['123', { username: 'user' }]]) },
			} as TextChannel)
		).toMatch(/^__Local Times__/)
	})
	it('throws with no users assigned to time zones', () => {
		mockedGetAsMap.mockImplementationOnce(() => new Map() as never)
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
	const mockedTransAsMap = jest.spyOn(mockedJSONFile, 'transAsMap')
	it('updates time zone user storage', () => {
		assignUserTimeZone('eastern', '123')
		expect(mockedTransAsMap.mock.calls[0][1](new Map() as never)).toStrictEqual(
			new Map([['123', 'America/New_York']])
		)
	})
	it('cleans up time zone user storage', () => {
		mockedTransAsMap.mockImplementationOnce((key, transFn) =>
			transFn(
				new Map([
					['123', 'America/New_York'],
					['invalid', 'America/New_York'],
					['456', 'invalid'],
					['invalid2', 'invalid'],
				]) as never
			)
		)
		assignUserTimeZone('eastern', '123')
		expect(mockedTransAsMap.mock.calls[0][1](new Map() as never)).toStrictEqual(
			new Map([['123', 'America/New_York']])
		)
	})
	it('returns warning for invalid time zone', () => {
		expect(assignUserTimeZone('avalon', '')).toMatch(/^Invalid time zone/)
	})
})
