import { IExportProperty } from '../../Config/Property'
import { isMap } from '../../Core/Util'
import { StringMap } from '../../Types/Util'
import Config from '../../Config'

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
		let displayValue = currentProperty.value
		if (isMap(displayValue))
			displayValue = Object.fromEntries(displayValue as StringMap)
		display += '\n```js\n' + JSON.stringify(displayValue) + '```'
	}
	return display
}
