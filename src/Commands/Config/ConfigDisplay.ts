import type { IExportProperty } from '../../Config/Property'
import {
	isArray,
	isMap,
	isNumber,
	isObject,
	isString,
	toMonospaceDigits,
} from '../../Core/Util'
import type { StringMap, StringRecord } from '../../Types/Util'
import Config from '../../Config'

const MODULE_LIST = displayKeyValuePairs(
	Config.getModules().map((prop) => [prop.moduleName, prop.description])
)

export function createDisplay(
	currentProperty: IExportProperty | null,
	{ showValue }: { showValue?: boolean } = { showValue: false }
): string {
	if (!currentProperty) return `**Modules**:\n${MODULE_LIST}`
	let display = `**Module**: \`${currentProperty.moduleName}\``
	const subPath = currentProperty.path.slice(1)
	if (subPath.length > 0) display += `\n**Property**: \`${subPath.join('.')}\``
	if (currentProperty.description && !showValue)
		display += '\n\n**Description**: ' + currentProperty.description
	if (currentProperty.example && !showValue)
		display += '\n\n**Example**: ' + currentProperty.example
	if (currentProperty.properties) {
		// Display properties
		display +=
			'\n\n**Properties**:\n' +
			displayKeyValuePairs(
				currentProperty.properties.map((prop) => [
					prop.name,
					prop.shortDescription || `\`${prop.value}\``,
				])
			)
	} else if (showValue) {
		// Display value
		display += '\n\n**Value**:\n' + displayValue(currentProperty.value)
	}
	return display
}

function displayValue(configValue: unknown) {
	if (isNumber(configValue) || isString(configValue) || configValue === null)
		return `\`\`\`js\n${configValue}\`\`\``
	if (isArray(configValue)) {
		return displayKeyValuePairs(
			(configValue as []).map((value, index) => [
				index.toString(),
				`\`${value}\``,
			]),
			false
		)
	}
	if (isMap(configValue)) {
		return displayKeyValuePairs(
			[...(configValue as StringMap)].map(([key, value]) => [
				key,
				`\`${value}\``,
			])
		)
	}
	if (isObject(configValue)) {
		return displayKeyValuePairs(
			[...Object.entries(configValue as StringRecord)]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([key, value]) => [key, `\`${value}\``])
		)
	}
	throw `Unknown value type ${configValue}`
}

function displayKeyValuePairs(pairs: [string, unknown][], showIndex = true) {
	// TODO: Paginate values 1-9, 10-19, 20-29, etc
	const maxKeyLength = Math.max(...pairs.map(([key]) => key.length))
	return pairs
		.map(([key, value], index) => {
			return (
				(showIndex ? `${toMonospaceDigits(index + 1)}. ` : '') +
				`\`${key.padEnd(maxKeyLength)}\` : ${value}`
			)
		})
		.join('\n')
}
