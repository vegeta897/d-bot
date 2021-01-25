import { isMap, isObject } from '@src/Core/Util'

const objectTypes = [
	{},
	new Object(null),
	Object.create(null),
	Object.prototype.constructor(),
]
const otherValueTypes = [
	undefined,
	null,
	'',
	'a',
	1,
	NaN,
	Infinity,
	[],
	Map,
	Object,
	new Set(),
	new Date(),
	/./,
]

describe('isMap', () => {
	it('returns true for maps', () => {
		expect(isMap(new Map())).toBeTruthy()
		Object.prototype.constructor(1)
	})
	it('returns false for non-maps', () => {
		const nonMapTypes = [...objectTypes, ...otherValueTypes]
		nonMapTypes.forEach((v) => expect(isMap(v)).toBeFalsy())
	})
})

describe('isObject', () => {
	it('returns true for objects', () => {
		objectTypes.forEach((v) => expect(isObject(v)).toBeTruthy())
	})
	it('returns false for non-objects', () => {
		const nonObjectTypes = [new Map(), ...otherValueTypes]
		nonObjectTypes.forEach((v) => expect(isObject(v)).toBeFalsy())
	})
})
