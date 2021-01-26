import { assert, Struct } from 'superstruct'
import deepcopy from 'deepcopy'
import type { IExportProperty, IProperty } from './Property'
import { Property } from './Property'

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
