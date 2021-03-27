import {
	isArray,
	isMap,
	isNumber,
	isObject,
	isString,
	toMonospaceDigits,
} from '../../Core/Util'
import type { ConfigState } from './ConfigState'
import Config from '../../Config'
import { IExportProperty } from '../../Config/Property'

const MODULE_LIST = displayKeyValuePairs(
	Config.getModules().map((prop) => [prop.moduleName, prop.description]),
	1
)

export function createDisplay({
	currentProperty,
	valuePage = 1,
	display: { showInfo = false, showValue = false, editValue = false },
}: ConfigState): string {
	if (!currentProperty) return `**Modules**:\n${MODULE_LIST}`
	let display = `**Module**: \`${currentProperty.moduleName}\``
	const subPath = currentProperty.path.slice(1)
	if (subPath.length > 0) display += `\n**Property**: \`${subPath.join('.')}\``
	if (currentProperty.description && showInfo)
		display += '\n\n**Description**: ' + currentProperty.description
	if (currentProperty.example && showInfo)
		display += '\n\n**Example**: ' + currentProperty.example
	if (currentProperty.properties) {
		// Display properties
		display +=
			'\n\n**Properties**:\n' +
			displayKeyValuePairs(
				currentProperty.properties.map((prop: IExportProperty) => [
					prop.name,
					prop.shortDescription ?? `\`${prop.value}\``,
				]),
				1
			)
	} else if (showValue || editValue) {
		display +=
			`\n\n**${editValue ? 'Editing ' : ''}Value**:\n` +
			displayValue(currentProperty.value, valuePage)
	}
	return display
}

export function validatePageNumber(value: unknown, page: string): boolean {
	const pageNumber = parseInt(page)
	if (isNaN(pageNumber) || pageNumber < 1) return false
	return pageNumber <= getPageCount(value)
}

export function getPageCount(value: unknown): number {
	try {
		return Math.ceil((getKeyValuePairs(value).length + 1) / 10)
	} catch (e) {
		return 1
	}
}

function displayValue(propertyValue: unknown, page: number) {
	if (
		isNumber(propertyValue) ||
		isString(propertyValue) ||
		propertyValue === null
	)
		return `\`\`\`js\n${propertyValue}\`\`\``
	if (isArray(propertyValue)) {
		return displayKeyValuePairs(getKeyValuePairs(propertyValue), page, {
			showIndex: false,
		})
	}
	if (isMap(propertyValue))
		return displayKeyValuePairs(getKeyValuePairs(propertyValue), page)
	if (isObject(propertyValue))
		return displayKeyValuePairs(getKeyValuePairs(propertyValue), page)
	throw `Unsupported value type ${propertyValue}`
}

function getKeyValuePairs(propertyValue: unknown): [string, unknown][] {
	if (isArray(propertyValue)) {
		return propertyValue.map((value, index) => [
			index.toString(),
			`\`${value}\``,
		])
	}
	if (isMap(propertyValue)) {
		return [...propertyValue].map(([key, value]) => [
			key as string,
			`\`${value}\``,
		])
	}
	if (isObject(propertyValue)) {
		return [...Object.entries(propertyValue)]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => [key, `\`${value}\``])
	}
	throw `Value ${propertyValue} has no key/value pairs`
}

function displayKeyValuePairs(
	pairs: [string, unknown][],
	page: number,
	{
		showIndex = true,
	}: {
		showIndex?: boolean
	} = {}
) {
	const maxKeyLength = Math.max(...pairs.map(([key]) => key.length))
	const startIndex = Math.max(0, (page - 1) * 10 - 1)
	return pairs
		.slice(startIndex, page * 10 - 1)
		.map(([key, value], index) => {
			return (
				(showIndex ? `${toMonospaceDigits(startIndex + index + 1)}. ` : '') +
				`\`${key.padEnd(maxKeyLength)}\` : ${value}`
			)
		})
		.join('\n')
}
