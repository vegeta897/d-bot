import { assert, Describe } from 'superstruct'
import deepcopy from 'deepcopy'
import type { IExportProperty, IProperty } from './Property'
import { Property } from './Property'
import { isObject, isArray, isMap } from '../../Core/Util'

export class PropertyValue<T extends unknown> extends Property<T> {
	protected _value: T | null
	protected readonly example?: string
	protected readonly schema: Describe<T>
	constructor({
		name,
		description,
		shortDescription,
		value,
		example,
		schema,
	}: IProperty & {
		schema: Describe<T>
		type?: string
		example?: string
		value?: T
	}) {
		super({ name, description, shortDescription })
		this._value = value ?? null
		this.example = example
		this.schema = schema as Describe<T>
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
	export(): IExportProperty {
		const { parent } = this
		return {
			name: this.name,
			description: this.description,
			shortDescription: this.shortDescription,
			example: this.example,
			value: this.value,
			path: this.path,
			moduleName: this.moduleName,
			listValue:
				isObject(this.value) || isArray(this.value) || isMap(this.value),
			schema: this.schema as Describe<unknown>,
			get parent() {
				return parent && parent.export()
			},
		}
	}
}
