import { assert, Struct } from 'superstruct'
import deepcopy from 'deepcopy'

interface IProperty {
	name: string
	description?: string
}

export interface IExportProperty<T = unknown> extends IProperty {
	value?: T | null
	properties?: IExportProperty[]
	path: string[]
}

export abstract class Property<T = unknown> implements IProperty {
	name: string
	description?: string
	parent?: PropertyParent<Record<string, unknown>>
	protected constructor({ name, description }: IProperty) {
		this.name = name
		this.description = description
	}
	abstract validate(): void
	abstract get value(): T
	abstract set value(value: T)
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
	get module(): string {
		return this.path[0] || this.name
	}
}

export class PropertyValue<T> extends Property {
	protected _value: T | null
	protected readonly schema?: Struct<T>
	constructor({
		name,
		description,
		schema,
		value,
	}: IProperty & {
		schema: Struct<T>
		value?: T
	}) {
		super({ name, description })
		this._value = value || null
		this.schema = schema as Struct<T>
	}
	get value(): T | null {
		return deepcopy(this._value)
	}
	set value(value: T | null) {
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

export class PropertyParent<
	T extends Record<string, unknown>
> extends Property {
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
	get value(): T {
		const value = {} as T
		this.properties.forEach(
			(prop) => (value[prop.name as keyof T] = prop.value as T[keyof T])
		)
		return value
	}
	set value(value: T) {
		Object.entries(value).forEach(([key, keyValue]) => {
			const property = this.properties.find((prop) => prop.name === key)
			if (property) property.value = keyValue
			else throw `Unknown property ${key} in ${this.name}`
		})
	}
	getProperty<K extends keyof T>(propName: K): Property<T[K]> {
		const prop = this.properties.find((prop) => prop.name === propName)
		if (!prop) throw `Unknown property ${propName} in ${this.name}`
		return prop as Property<T[K]>
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
