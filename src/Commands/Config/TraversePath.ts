import type { IExportProperty } from '../../Config/Property'
import Config from '../../Config'

const MODULES = Config.getModules()

export function traversePath(
	startProperty: IExportProperty | null,
	pathArr: string[]
): IExportProperty | null {
	let endProperty = startProperty
	pathArr.forEach((pathNode) => {
		if (!endProperty) {
			const module = MODULES.find(
				(prop) => prop.name.toLowerCase() === pathNode.toLowerCase()
			)
			const indexedModule = MODULES[parseInt(pathNode) - 1]
			if (module || indexedModule) endProperty = module || indexedModule
			else throw `Invalid module \`${pathNode}\``
			return
		}
		if (pathNode === '..') {
			endProperty = endProperty?.parent || null
			return
		}
		if (!endProperty.properties)
			throw `\`${endProperty.name}\` has no child properties`
		const childProperty = endProperty.properties.find(
			(p) => p.name.toLowerCase() === pathNode.toLowerCase()
		)
		const indexedChildProperty = endProperty.properties[parseInt(pathNode) - 1]
		if (childProperty || indexedChildProperty)
			endProperty = childProperty || indexedChildProperty
		else throw `\`${pathNode}\` does not exist on \`${endProperty.name}\``
	})
	return endProperty
}
