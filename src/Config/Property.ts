import { assert, Struct } from 'superstruct'
import deepcopy from 'deepcopy'

interface IProperty {
	name: string
	description?: string
}

export interface IExportProperty<T = unknown> extends IProperty {
	value?: T
	properties?: IExportProperty[]
	path: string[]
}

export abstract class Property implements IProperty {
	name: string
	description?: string
	parent?: PropertyParent
	protected constructor({ name, description }: IProperty) {
		this.name = name
		this.description = description
	}
	abstract validate(): void
	abstract get value(): unknown
	abstract set value(value: unknown)
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
}

export class PropertyValue<T> extends Property {
	private _value: T
	private readonly schema?: Struct<T>
	constructor({
		name,
		description,
		schema,
		value,
	}: IProperty & {
		schema: Struct<T>
		value: T
	}) {
		super({ name, description })
		this._value = value
		this.schema = schema
	}
	get value(): T {
		return deepcopy(this._value)
	}
	set value(value: T) {
		if (this.schema) assert(value, this.schema)
		this._value = value
	}
	validate(): void {
		if (this.schema) assert(this.value, this.schema)
	}
	export(): IExportProperty<T> {
		const { name, description, value, path } = this
		return { name, description, value, path }
	}
}

export class PropertyParent extends Property {
	properties: Property[]
	constructor({
		name,
		description,
		properties,
	}: IProperty & {
		properties: Property[]
	}) {
		super({ name, description })
		this.properties = properties
		this.properties.forEach((prop) => (prop.parent = this))
	}
	get value(): Record<string, unknown> {
		const value: Record<string, unknown> = {}
		this.properties.forEach((prop) => (value[prop.name] = prop.value))
		return value
	}
	set value(value: Record<string, unknown>) {
		Object.entries(value).forEach(([key, keyValue]) => {
			const property = this.properties.find((prop) => prop.name === key)
			if (property) property.value = keyValue
			else throw `Invalid property ${key} in ${this.name}`
		})
	}
	validate(): void {
		this.properties.forEach((prop) => prop.validate())
	}
	export(): IExportProperty<never> {
		return {
			name: this.name,
			description: this.description,
			path: this.path,
			properties: this.properties.map((prop) => prop.export()),
		}
	}
}
