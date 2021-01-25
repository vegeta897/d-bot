import type { IExportProperty } from '../../Config/Property'
import { isArray, isMap, isNumber, isObject, isString } from '../../Core/Util'
import type { StringMap, StringRecord } from '../../Types/Util'
import Config from '../../Config'
import { MonospaceDigits } from '../../Constants/Strings'

const MODULES = Config.getModules()
const MODULE_LIST = MODULES.map(
	(prop, index) =>
		`\`${index + 1}. ${prop.moduleName}\`` +
		(prop.description ? ` - ${prop.description}` : '')
).join('\n')

export function createDisplay(currentProperty: IExportProperty | null): string {
	if (!currentProperty) return `Choose a module name or number.\n${MODULE_LIST}`
	let display = `**${currentProperty.moduleName}**`
	const subPath = currentProperty.path.slice(1)
	if (subPath.length > 0) {
		display += ` - \`${subPath.join('` - `')}\``
	}
	if (currentProperty.properties) {
		display +=
			'\n' +
			currentProperty.properties
				.map((prop, index) => {
					let line = `\`${index + 1}. ${prop.name}\``
					let descriptionSeparator = ' - '
					if (prop.value) {
						line += ` = \`${prop.value}\``
						descriptionSeparator = '\n    '
					}
					if (prop.description) line += descriptionSeparator + prop.description
					return line
				})
				.join('\n')
	} else {
		if (currentProperty.description)
			display += '\n' + currentProperty.description
		display += '\n' + displayValue(currentProperty.value)
	}
	return display
}

function displayValue(configValue: unknown) {
	if (isNumber(configValue) || isString(configValue) || configValue === null)
		return `\`\`\`js\n${configValue}\`\`\``
	function displayKeyValuePairs(pairs: [string, unknown][], showIndex = true) {
		// TODO: Paginate values 1-9, 10-19, 20-29, etc
		const maxKeyLength = Math.max(...pairs.map(([key]) => key.length))
		return pairs
			.map(([key, value], index) => {
				return (
					(showIndex ? `${MonospaceDigits[(index + 1) % 10]} ` : '') +
					`\`${key.padEnd(maxKeyLength)}\` : \`${value}\``
				)
			})
			.join('\n')
	}
	if (isArray(configValue)) {
		return (
			'**Array**\n' +
			displayKeyValuePairs(
				(configValue as []).map((value, index) => [index.toString(), value]),
				false
			)
		)
	}
	if (isMap(configValue)) {
		return '**Map**\n' + displayKeyValuePairs([...(configValue as StringMap)])
	}
	if (isObject(configValue)) {
		return (
			'**Object**\n' +
			displayKeyValuePairs([...Object.entries(configValue as StringRecord)])
		)
	}
	throw `Unknown value type ${configValue}`
}
