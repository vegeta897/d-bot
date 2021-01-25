import 'dotenv/config'
import { assert, size, string } from 'superstruct'
import createJSONFile from '../Core/Storage/JSONFile'
import type { PropertyParent, IExportProperty } from './Property'
import { ConfigProperties } from './Schema'
import type { ConfigType } from '../Types/Config'
import InitDataModel from './InitData'
import type JSONData from '../Core/Storage/JSONData'

let configData: JSONData<ConfigType>

// TODO: Stop trying to type nested stuff. Just use getModule for normal config property use, and non-type-safe getPath for ConfigCommand and use try catch for errors in retrieval and writing

const Config = {
	init(): void {
		configData = createJSONFile('config', { data: InitDataModel })
		Object.values(ConfigProperties).forEach((module) => {
			module.value = configData.get(module.name as keyof ConfigType)
			module.validate()
		})
	},
	getModules(): IExportProperty[] {
		return Object.values(ConfigProperties).map((module) => module.export())
	},
	getModuleData<K extends keyof ConfigType>(moduleName: K): ConfigType[K] {
		return ConfigProperties[moduleName].value as ConfigType[K]
	},
	getModule<K extends keyof ConfigType>(moduleName: K): IExportProperty {
		return ConfigProperties[moduleName].export()
	},
	updateModule<
		K extends keyof ConfigType,
		M extends PropertyParent<ConfigType[K]>
	>(moduleName: K, updateFn: (module: M) => void): void {
		const module = ConfigProperties[moduleName] as M
		updateFn(module)
		configData.set(moduleName, module.value)
	},
}

export default Config

const discordClientToken = process.env.DISCORD_CLIENT_TOKEN
assert(discordClientToken, size(string(), 1, 100))
export const DISCORD_CLIENT_TOKEN = discordClientToken
