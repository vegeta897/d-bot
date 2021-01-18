import deepCopy from 'deepcopy'
import type { StringRecord, StringMap } from '../Types/Util'

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
	 * Returns a copy of inputObject with all properties deeply converted from Map to Object, or Object to Map if a targetObject is provided with corresponding Map properties
	 * @param inputObject - The object to convert
	 * @param targetObject - (Optional) An object matching the inputObject that may have Map properties to convert in the inputObject
	 */
	convertPropertiesDeep<I extends StringRecord>(
		inputObject: I,
		targetObject?: I
	): I {
		const inputObjectCopy = deepCopy(inputObject)
		function convertKeysInObject<O extends StringRecord, K extends keyof O>(
			obj: O,
			target?: O
		) {
			try {
				Object.keys(obj).forEach((key) => {
					if (ObjectMapUtil.isMap(obj[key])) {
						// Convert map to object
						obj[key as K] = ObjectMapUtil.mapToObjectShallow(
							obj[key] as StringMap
						) as O[K]
					}
					if (ObjectMapUtil.isObject(obj[key])) {
						// Convert deep first so we can enumerate object keys before converting to map
						convertKeysInObject(
							obj[key as K] as StringRecord,
							target && (target[key as K] as StringRecord)
						)
						// Convert object to map if target is map
						if (target && ObjectMapUtil.isMap(target[key]))
							obj[key as K] = ObjectMapUtil.objectToMapShallow(
								obj[key] as StringRecord
							) as O[K]
					}
				})
			} catch {}
		}
		try {
			convertKeysInObject(inputObjectCopy, targetObject)
		} catch {}
		return inputObjectCopy
	},
}
