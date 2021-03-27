import type { StringRecord } from '../../Types/Util'
import type { IExportProperty, IProperty } from './Property'
import { Property } from './Property'

export class PropertyParent<T extends StringRecord> extends Property<T> {
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
	export(): IExportProperty {
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
