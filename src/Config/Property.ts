import { assert, Struct } from 'superstruct'
import deepcopy from 'deepcopy'
import type { StringRecord } from '../Types/Util'

interface IProperty {
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
	get moduleName(): string {
		return this.path[0] || this.name
	}
}

export class PropertyValue<T> extends Property {
	protected _value: T | null
	protected readonly example?: string
	protected readonly schema?: Struct<T>
	constructor({
		name,
		description,
		shortDescription,
		example,
		schema,
		value,
	}: IProperty & {
		schema: Struct<T>
		type?: string
		example?: string
		value?: T
	}) {
		super({ name, description, shortDescription })
		this._value = value || null
		this.example = example
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
		const { parent } = this
		return {
			name: this.name,
			description: this.description,
			shortDescription: this.shortDescription,
			example: this.example,
			value: this.value,
			path: this.path,
			moduleName: this.moduleName,
			get parent() {
				return parent && parent.export()
			},
		}
	}
}

export class PropertyParent<T extends StringRecord> extends Property {
	properties: Property[]
	constructor({
		name,
		description,
		shortDescription,
		properties,
	}: IProperty & {
		properties: Property[]
	}) {
		super({ name, description, shortDescription })
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
		const { parent } = this
		return {
			name: this.name,
			description: this.description,
			shortDescription: this.shortDescription,
			path: this.path,
			moduleName: this.moduleName,
			properties: this.properties.map((prop) => prop.export()),
			get parent() {
				return parent && parent.export()
			},
		}
	}
}
