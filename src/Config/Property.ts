import { assert, Struct } from 'superstruct'
import deepcopy from 'deepcopy'

interface IProperty {
	name: string
	description?: string
}

export interface IExportProperty<T = unknown> extends IProperty {
	value?: T
	properties?: IExportProperty[]
}

export abstract class Property {
	name: string
	description?: string
	protected constructor({ name, description }: IProperty) {
		this.name = name
		this.description = description
	}
	abstract validate(): void
	abstract getValue(): unknown
	abstract setValue(value: unknown): void
	abstract export(): IExportProperty
}

export class PropertyValue<T> extends Property {
	private value: T
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
		this.value = value
		this.schema = schema
	}
	getValue(): T {
		return deepcopy(this.value)
	}
	setValue(value: T): void {
		if (this.schema) assert(value, this.schema)
		this.value = value
	}
	validate(): void {
		if (this.schema) assert(this.value, this.schema)
	}
	export(): IExportProperty<T> {
		return {
			name: this.name,
			description: this.description,
			value: this.value,
		}
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
	}
	getValue(): Record<string, unknown> {
		const value: Record<string, unknown> = {}
		this.properties.forEach((prop) => {
			value[prop.name] = prop.getValue()
		})
		return value
	}
	setValue(value: Record<string, unknown>): void {
		Object.entries(value).forEach(([key, keyValue]) => {
			const property = this.properties.find((prop) => prop.name === key)
			if (property) property.setValue(keyValue)
			else throw `Invalid property ${key} in ${this.name}`
		})
	}
	validate(): void {
		this.properties.forEach((prop) => prop.validate())
	}
	export(): IExportProperty {
		return {
			name: this.name,
			description: this.description,
			properties: this.properties.map((prop) => prop.export()),
		}
	}
}
