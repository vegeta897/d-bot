import 'dotenv/config'
import { assert, size, string } from 'superstruct'
import JSONFile from '../Core/Storage/JSONFile'
import type { PropertyParent, IExportProperty } from './Property'
import { ConfigProperties } from './Schema'
import type { ConfigType } from '../Types/Config'
import InitData from './InitData'

let configData: JSONFile<ConfigType>

const Config = {
	init(): void {
		configData = new JSONFile('config', { initData: InitData })
		Object.values(ConfigProperties).forEach((module) => {
			module.value = configData.get(module.name as keyof ConfigType)
		})
		ConfigProperties.discord.validate()
		ConfigProperties.time.validate()
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
