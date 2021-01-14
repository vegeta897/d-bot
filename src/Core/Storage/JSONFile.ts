/* istanbul ignore file */
import * as fse from 'fs-extra'
import deepCopy from 'deepcopy'

interface IJSONFileOptions<T> {
	initData: T
	spaces?: number | string
	EOL?: string
}

const JSON_FILE_DEFAULTS = { spaces: '\t', EOL: '\n' } as const

const PATH = 'storage/' as const
fse.ensureDirSync(PATH)

type primitiveTypes = string | number | boolean | null | unknown[]
type StorageTypes = primitiveTypes | Map<string, primitiveTypes>

export default class JSONFile<T extends Record<string, StorageTypes>> {
	private readonly data: Map<string, StorageTypes> = new Map()
	private readonly spaces: number | string
	private readonly EOL: string
	private readonly path: string
	private saving = false

	constructor(
		filename: string,
		{ initData, spaces, EOL }: IJSONFileOptions<T>
	) {
		this.path = PATH + '/' + filename + '.json'
		this.spaces = spaces || JSON_FILE_DEFAULTS.spaces
		this.EOL = EOL || JSON_FILE_DEFAULTS.EOL
		objectToMapShallow(initData || Object.create(null)).forEach((value, key) =>
			this.data.set(key, value as StorageTypes)
		)
		let fileData
		try {
			fileData = fse.readJSONSync(this.path, {
				encoding: 'utf8',
			})
		} catch (err) {
			console.log(`Creating new JSON file "${filename}"`)
		}
		if (!fileData) return
		objectToMapShallow(fileData).forEach((dataValue, dataKey) => {
			const valueIsObject =
				typeof dataValue === 'object' &&
				dataValue !== null &&
				!(dataValue instanceof Array)
			this.data.set(
				dataKey,
				(valueIsObject
					? objectToMapShallow(dataValue as Record<string, unknown>)
					: dataValue) as StorageTypes
			)
		})
		this.save()
	}

	private save(): void {
		if (this.saving) return
		this.saving = true
		// Prevent redundant save calls with setTimeout
		setTimeout(async () => {
			try {
				const jsonData = mapToObjectShallow(this.data, (value) => {
					// Convert any map property values to objects
					return value instanceof Map ? mapToObjectShallow(value) : value
				})
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
		return deepCopy(this.data.get(key)) as T[K]
	}

	set<K extends keyof T & string>(key: K, value: T[K]): T[K] {
		this.data.set(key, value)
		this.save()
		return value
	}

	trans<K extends keyof T & string>(
		key: K,
		transFunction: (data: T[K]) => T[K]
	): T[K] {
		this.data.set(key, transFunction(this.get(key)))
		this.save()
		return this.get(key)
	}
}

function objectToMapShallow(
	object: Record<string, unknown>
): Map<string, unknown> {
	// https://stackoverflow.com/a/36644532/2612679
	const map = new Map()
	Object.keys(object).forEach((key) => map.set(key, object[key]))
	return map
}

function mapToObjectShallow<T>(
	map: Map<string, T>,
	valueTransformFn?: (value: T) => unknown
): Record<string, T> {
	const obj = Object.create(null)
	for (const [k, v] of map) obj[k] = valueTransformFn ? valueTransformFn(v) : v
	return obj
}
