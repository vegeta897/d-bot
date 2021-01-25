import { isObject, isMap, isArray, isString, isNumber } from '@src/Core/Util'

const objectTypes = [
	{},
	new Object(null),
	Object.create(null),
	Object.prototype.constructor(),
]
const mapTypes = [new Map()]
const arrayTypes = [[]]
const numberTypes = [1, NaN, Infinity]
const stringTypes = ['', 'a']
const otherValueTypes = [
	undefined,
	null,
	Map,
	Object,
	new Set(),
	new Date(),
	/./,
]
const allTypes = [
	...objectTypes,
	...mapTypes,
	...arrayTypes,
	...numberTypes,
	...stringTypes,
	...otherValueTypes,
]

describe('isObject', () => {
	it('returns true for objects', () => {
		objectTypes.forEach((v) => expect(isObject(v)).toBeTruthy())
	})
	it('returns false for non-objects', () => {
		const nonObjectTypes = allTypes.filter(
			(type) => !objectTypes.includes(type)
		)
		nonObjectTypes.forEach((v) => expect(isObject(v)).toBeFalsy())
	})
})

describe('isMap', () => {
	it('returns true for maps', () => {
		mapTypes.forEach((v) => expect(isMap(v)).toBeTruthy())
	})
	it('returns false for non-maps', () => {
		const nonMapTypes = allTypes.filter((type) => !mapTypes.includes(type))
		nonMapTypes.forEach((v) => expect(isMap(v)).toBeFalsy())
	})
})

describe('isArray', () => {
	it('returns true for arrays', () => {
		arrayTypes.forEach((v) => expect(isArray(v)).toBeTruthy())
	})
	it('returns false for non-arrays', () => {
		const nonArrayTypes = allTypes.filter((type) => !arrayTypes.includes(type))
		nonArrayTypes.forEach((v) => expect(isArray(v)).toBeFalsy())
	})
})

describe('isString', () => {
	it('returns true for strings', () => {
		stringTypes.forEach((v) => expect(isString(v)).toBeTruthy())
	})
	it('returns false for non-strings', () => {
		const nonStringTypes = allTypes.filter(
			(type) => !stringTypes.includes(type)
		)
		nonStringTypes.forEach((v) => expect(isString(v)).toBeFalsy())
	})
})

describe('isNumber', () => {
	it('returns true for numbers', () => {
		numberTypes.forEach((v) => expect(isNumber(v)).toBeTruthy())
	})
	it('returns false for non-numbers', () => {
		const nonNumberTypes = allTypes.filter(
			(type) => !numberTypes.includes(type)
		)
		nonNumberTypes.forEach((v) => expect(isNumber(v)).toBeFalsy())
	})
})
