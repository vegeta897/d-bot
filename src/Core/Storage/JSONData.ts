import type { JSONSafe, StringRecord } from '../../Types/Util'
import deepCopy from 'deepcopy'

interface IJSONData<T> {
	data: T
	convertToJSON?: (data: T) => StringRecord<JSONSafe>
	loadJSON?: (data: T, jsonData: StringRecord) => void
}

export default class JSONData<T extends StringRecord> {
	data: T
	save: () => void = () => {
		throw 'Missing save method'
	}
	readonly convertToJSON: (data: T) => StringRecord<JSONSafe> = (data) =>
		data as StringRecord<JSONSafe>
	readonly loadJSON: (data: T, jsonData: StringRecord) => void = (
		data,
		jsonData
	) => Object.assign(data, jsonData)

	constructor({ data, convertToJSON, loadJSON }: IJSONData<T>) {
		this.data = data
		if (convertToJSON) this.convertToJSON = convertToJSON
		if (loadJSON) this.loadJSON = loadJSON
	}

	get<K extends keyof T & string>(key: K): T[K] {
		return deepCopy(this.data[key])
	}

	set<K extends keyof T & string>(key: K, value: T[K]): T[K] {
		this.data[key] = deepCopy(value)
		this.save()
		return value
	}

	trans<K extends keyof T & string>(
		key: K,
		transFunction: (data: T[K]) => T[K] | void
	): T[K] | void {
		const transData = transFunction(this.get(key))
		if (transData !== undefined) return this.set(key, transData)
	}
}
