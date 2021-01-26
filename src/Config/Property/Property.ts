import type { StringRecord } from '../../Types/Util'
import type { PropertyParent } from './PropertyParent'

export interface IProperty {
	name: string
	description?: string
	shortDescription?: string
}

export interface IExportProperty<T = unknown> extends IProperty {
	value?: T | null
	properties?: IExportProperty[]
	parent?: IExportProperty
	moduleName: string
	example?: string
	path: string[]
}

export abstract class Property<T = unknown> implements IProperty {
	name: string
	description?: string
	shortDescription?: string
	parent?: PropertyParent<StringRecord>
	protected constructor({ name, description, shortDescription }: IProperty) {
		this.name = name
		this.description = description
		this.shortDescription = shortDescription
	}
	abstract validate(): void
	abstract value: T
	abstract export(): IExportProperty
	get path(): string[] {
		const path = [this.name]
		let currentNode = this.parent
		if (!currentNode) return path
		while (currentNode) {
			path.unshift(currentNode.name)
			currentNode = currentNode.parent
		}
		return path
	}
	get moduleName(): string {
		return this.path[0] || this.name
	}
}
