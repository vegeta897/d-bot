import 'dotenv/config'
import { assert, nullable, record, refine, size, string } from 'superstruct'
import JSONFile from '../Core/Storage/JSONFile'
import { TimeZoneList } from '../Constants/Time'
import {
	PropertyValue,
	PropertyParent,
	Property,
	IExportProperty,
} from './Property'
import InitData, { ConfigType } from './InitData'
import type { TimeZone } from '../Types/Time'

const defaultChannelID = new PropertyValue({
	name: 'defaultChannelID',
	description: '',
	schema: nullable(string()),
	value: null,
})
const timeZones = new PropertyValue({
	name: 'timeZones',
	description: '',
	schema: record(
		string(),
		refine(string(), 'TimeZone', (value) =>
			TimeZoneList.includes(value as TimeZone)
		)
	),
	value: InitData.time.timeZones,
})

const configProperties: Record<string, Property> = {
	discord: new PropertyParent({
		name: 'discord',
		description: 'Discord options',
		properties: [defaultChannelID],
	}),
	time: new PropertyParent({
		name: 'time',
		description: 'Command options related to time',
		properties: [timeZones],
	}),
}

const Config = {
	init(): void {
		const configData = new JSONFile('config', { initData: InitData })
		configProperties.discord.validate()
		configProperties.time.validate()
		Object.values(configProperties).forEach((module) => {
			module.value = configData.get(module.name as keyof ConfigType)
		})
	},
	getModules(): IExportProperty[] {
		return Object.values(configProperties).map((module) => module.export())
	},
	getModuleData<K extends keyof ConfigType>(moduleName: K): ConfigType[K] {
		return configProperties[moduleName].value as ConfigType[K]
	},
	getModule<K extends keyof ConfigType>(moduleName: K): IExportProperty {
		return configProperties[moduleName].export()
	},
}

export default Config

const discordClientToken = process.env.DISCORD_CLIENT_TOKEN
assert(discordClientToken, size(string(), 1, 100))
export const DISCORD_CLIENT_TOKEN = discordClientToken

// function traverse(object: Record<string, unknown>, path: string[]) {
// 	const final = path.slice(-1)[0]
// 	const nodes = [...path.slice(1)]
// 	let branch = object
// 	for (const node of nodes) {
// 		branch = branch[node] as Record<string, unknown>
// 	}
// 	return branch[final]
// }
