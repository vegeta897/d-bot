/* istanbul ignore file */
import * as fse from 'fs-extra'
import deepCopy from 'deepcopy'

interface IJSONFileOptions<T> {
	initData: T
	spaces?: number | string
	EOL?: string
}

const JSON_FILE_DEFAULTS = {
	spaces: '\t',
	EOL: '\n',
} as const

const PATH = 'storage/' as const
fse.ensureDirSync(PATH)

export class JSONFile<T extends Record<K, T[K]>, K extends keyof T & string> {
	private readonly data: Map<K, T[K]>
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
		const initDataMap = objectToMapShallow(
			initData || Object.create(null)
		) as Map<K, T[K]>
		try {
			const data = fse.readJSONSync(this.path, {
				encoding: 'utf8',
			})
			this.data = new Map([...initDataMap, ...objectToMapShallow(data)]) as Map<
				K,
				T[K]
			>
		} catch (err) {
			console.log(`Creating new JSON file "${filename}"`)
			this.data = initDataMap
		} finally {
			this.save()
		}
	}
	private save(): void {
		if (this.saving) return
		this.saving = true
		// Prevent redundant save calls with setTimeout
		setTimeout(async () => {
			try {
				// Write to temporary file
				await fse.writeJson(
					this.path + '.tmp',
					mapToObjectShallow(this.data as Map<string, unknown>),
					{
						spaces: this.spaces,
						EOL: this.EOL,
					}
				)
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
	get(key: K): T[K] {
		return deepCopy(this.data.get(key)) as T[K]
	}
	set(key: K, value: T[K]): T[K] {
		this.data.set(key, value)
		this.save()
		return value
	}
	trans(key: K, transFunction: (data: T[K]) => T[K]): T[K] {
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

function mapToObjectShallow(
	map: Map<string, unknown>
): Record<string, unknown> {
	const obj = Object.create(null)
	for (const [k, v] of map) obj[k] = v
	return obj
}
