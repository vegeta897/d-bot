/* istanbul ignore file */
import * as fse from 'fs-extra'
import type { JSONSafe, StringRecord } from '../../Types/Util'
import JSONData from './JSONData'

interface IJSONFileOptions<T extends StringRecord> {
	data: JSONData<T> | (T & JSONSafe)
	spaces?: number | string
	EOL?: string
}

const PATH = 'storage/' as const
fse.ensureDirSync(PATH)

export default function createJSONFile<T extends StringRecord>(
	filename: string,
	{ data, spaces = '\t', EOL = '\n' }: IJSONFileOptions<T>
): JSONData<T> {
	const dataModel: JSONData<T> =
		data instanceof JSONData ? data : new JSONData<T>({ data })
	const path = PATH + '/' + filename + '.json'
	let fileExists
	// Check if file exists
	try {
		fileExists = fse.readFileSync(path)
	} catch (err) {
		console.log(`Creating new JSON file "${filename}"`)
	}
	if (fileExists) {
		let jsonData
		// Try to load file as JSON
		try {
			jsonData = fse.readJSONSync(path, { encoding: 'utf8' })
			dataModel.loadJSON(dataModel.data, jsonData)
		} catch (err) {
			// Do not write if invalid JSON found
			throw `Invalid JSON file "${filename}"`
		}
	}
	let saving = false
	dataModel.save = () => {
		if (saving) return
		saving = true
		// Prevent redundant save calls with setTimeout
		setTimeout(async () => {
			try {
				// Write to temporary file
				await fse.writeJson(
					path + '.tmp',
					dataModel.convertToJSON(dataModel.data),
					{
						spaces,
						EOL,
					}
				)
				// Move/rename temporary file into the real one
				await fse.move(path + '.tmp', path, {
					overwrite: true,
				})
				saving = false
			} catch (err) {
				console.error('Error saving JSON', path, err)
			}
		}, 0)
	}
	dataModel.save()
	return dataModel
}
