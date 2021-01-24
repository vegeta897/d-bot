/* istanbul ignore file */
import * as fse from 'fs-extra'
import deepCopy from 'deepcopy'
import { ObjectMapUtil } from '../Util'
import type { NoNestedMaps, StringMap, StringRecord } from '../../Types/Util'

interface IJSONFileOptions<T> {
	initData: T
	spaces?: number | string
	EOL?: string
}

const JSON_FILE_DEFAULTS = { spaces: '\t', EOL: '\n' } as const

const PATH = 'storage/' as const
fse.ensureDirSync(PATH)

export default class JSONFile<T extends StringRecord<NoNestedMaps>> {
	private readonly data: T
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
		this.data = initData
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
				const convertedData = ObjectMapUtil.reviveJSON(fileData, this.data)
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
				// Write to temporary file
				await fse.writeJson(this.path + '.tmp', this.data, {
					spaces: this.spaces,
					EOL: this.EOL,
					replacer: (key: string, value: unknown) => {
						if (ObjectMapUtil.isMap(value)) return [...(value as StringMap)]
						return value
					},
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
}
