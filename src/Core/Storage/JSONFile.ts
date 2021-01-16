/* istanbul ignore file */
import * as fse from 'fs-extra'
import deepCopy from 'deepcopy'
import { MapPropertiesKey } from '../../Constants/Config'

interface IJSONFileOptions<T> {
	initData: T
	convertAllObjectsToMaps?: boolean
	spaces?: number | string
	EOL?: string
}

const JSON_FILE_DEFAULTS = { spaces: '\t', EOL: '\n' } as const

const PATH = 'storage/' as const
fse.ensureDirSync(PATH)

export default class JSONFile<T extends Record<string, unknown>> {
	private readonly data: T
	private readonly convertAllObjectsToMaps: boolean
	private readonly spaces: number | string
	private readonly EOL: string
	private readonly path: string
	private saving = false

	constructor(
		filename: string,
		{
			initData,
			convertAllObjectsToMaps = true,
			spaces,
			EOL,
		}: IJSONFileOptions<T>
	) {
		this.path = PATH + '/' + filename + '.json'
		this.spaces = spaces || JSON_FILE_DEFAULTS.spaces
		this.EOL = EOL || JSON_FILE_DEFAULTS.EOL
		this.data = initData
		this.convertAllObjectsToMaps = convertAllObjectsToMaps
		let fileExists
		// Check if file exists
		try {
			fileExists = fse.readFileSync(this.path)
		} catch (err) {
			console.log(`Creating new JSON file "${filename}"`)
		}
		if (fileExists) {
			let fileData
			// Try to load file as JSON
			try {
				fileData = fse.readJSONSync(this.path, {
					encoding: 'utf8',
				})
				// Convert any objects to maps
				const convertedData = convertPropertiesDeep(
					fileData,
					JSONFile.objectToMapShallow as (i: unknown) => unknown,
					isObject,
					this.data,
					this.convertAllObjectsToMaps
				)
				Object.assign(this.data, convertedData)
			} catch (err) {
				// Do not write if invalid JSON found
				throw `Invalid JSON file "${filename}"`
			}
		}
		this.save()
	}

	private save(): void {
		if (this.saving) return
		this.saving = true
		// Prevent redundant save calls with setTimeout
		setTimeout(async () => {
			try {
				// Convert any maps to objects
				const jsonData = convertPropertiesDeep(
					this.data,
					JSONFile.mapToObjectShallow as (i: unknown) => unknown,
					isMap
				)
				// Write to temporary file
				await fse.writeJson(this.path + '.tmp', jsonData, {
					spaces: this.spaces,
					EOL: this.EOL,
				})
				// Move/rename temporary file into the real one
				await fse.move(this.path + '.tmp', this.path, {
					overwrite: true,
				})
				this.saving = false
			} catch (err) {
				console.error('Error saving JSON', this.path, err)
			}
		}, 0)
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
		transFunction: (data: T[K]) => T[K]
	): T[K] {
		return this.set(key, transFunction(this.get(key)))
	}

	static objectToMapShallow<
		T extends Record<string, unknown>,
		K extends keyof T & string
	>(object: T): Map<K, T[K]> {
		// https://stackoverflow.com/a/36644532/2612679
		const map = new Map()
		Object.keys(object).forEach((key) => map.set(key, object[key]))
		return map
	}

	static mapToObjectShallow(
		map: Map<string, unknown>
	): Record<string, unknown> {
		const obj = Object.create(null)
		for (const [k, v] of map) obj[k] = v
		return obj
	}
}

function isObject(maybeObject: unknown) {
	return Object.prototype.toString.call(maybeObject) === '[object Object]'
}

function isMap(maybeMap: unknown) {
	return Object.prototype.toString.call(maybeMap) === '[object Map]'
}

// TODO: Write tests for this
/**
 * Traverses an object deeply and converts properties that satisfy ConvertCheckFn with convertFn
 * @param inputObject - The object to convert
 * @param convertFn - The function used to convert properties
 * @param convertCheckFn - A function that determines whether to convert a property
 * @param targetObject - (Optional) An object matching the inputObject that can have [[MapPropertiesKey]] keys which list properties that should not be converted
 * @param convertAll - Convert all properties that satisfy convertCheckFn
 */
function convertPropertiesDeep<I extends Record<string, unknown>>(
	inputObject: I,
	convertFn: (i: unknown) => unknown,
	convertCheckFn: (i: unknown) => boolean,
	targetObject: I = inputObject,
	convertAll = true
): I {
	const obj = deepCopy(inputObject)
	function doConversion(maybeObject: unknown) {
		try {
			if (convertCheckFn(maybeObject))
				return convertFn(maybeObject as Record<string, unknown>)
		} catch {}
		return maybeObject
	}
	function convertKeysInObject<
		O extends Record<string, unknown>,
		K extends keyof O
	>(obj: O, target: O = obj) {
		if (!isObject(obj)) return
		const convertKeys = target[MapPropertiesKey] as string[] | undefined
		try {
			Object.keys(obj).forEach((key) => {
				if (key === MapPropertiesKey) {
					delete target[MapPropertiesKey]
					return
				}
				if (convertAll || (convertKeys && convertKeys.includes(key)))
					obj[key as K] = doConversion(obj[key]) as O[K]
				convertKeysInObject(obj[key as K] as O, target[key as K] as O)
			})
		} catch {}
	}
	try {
		convertKeysInObject(obj, targetObject)
	} catch {}
	return obj
}
