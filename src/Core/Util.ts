import deepCopy from 'deepcopy'
import type { StringRecord, StringMap, NoNestedMaps } from '../Types/Util'

export const ObjectMapUtil = {
	objectToMapShallow<T extends StringRecord, K extends keyof T & string>(
		object: T
	): Map<K, T[K]> {
		// https://stackoverflow.com/a/36644532/2612679
		const map = new Map()
		Object.keys(object).forEach((key) => map.set(key, object[key]))
		return map
	},

	mapToObjectShallow(map: StringMap): StringRecord {
		const obj = Object.create(null)
		for (const [k, v] of map) obj[k] = v
		return obj
	},

	isObject(maybeObject: unknown): boolean {
		return Object.prototype.toString.call(maybeObject) === '[object Object]'
	},

	isMap(maybeMap: unknown): boolean {
		return Object.prototype.toString.call(maybeMap) === '[object Map]'
	},

	/**
	 * Returns a copy of inputObject with all properties deeply converted from Array to Map if targetObject has corresponding Map properties
	 * @param inputObject - The object to convert
	 * @param targetObject - An object matching the inputObject that may have Map properties to convert in the inputObject
	 */
	reviveJSON<I extends StringRecord<NoNestedMaps>>(
		inputObject: I,
		targetObject: I
	): I {
		const inputObjectCopy = deepCopy(inputObject)
		function convertKeysInObject<O extends StringRecord, K extends keyof O>(
			obj: O,
			target: O
		) {
			Object.keys(obj).forEach((key) => {
				if (ObjectMapUtil.isObject(obj[key])) {
					convertKeysInObject(
						obj[key as K] as StringRecord,
						target[key as K] as StringRecord
					)
				} else if (ObjectMapUtil.isMap(target[key])) {
					obj[key as K] = new Map(
						obj[key] as Iterable<[unknown, unknown]>
					) as O[K]
				}
			})
		}
		convertKeysInObject(inputObjectCopy, targetObject)
		return inputObjectCopy
	},
}
