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

describe('value type check functions', () => {
	const tests: Map<string, [unknown[], (v: unknown) => boolean]> = new Map([
		['objects', [objectTypes, isObject]],
		['maps', [mapTypes, isMap]],
		['arrays', [arrayTypes, isArray]],
		['numbers', [numberTypes, isNumber]],
		['strings', [stringTypes, isString]],
	])
	tests.forEach(([types, is], name) => {
		it(`returns true for ${name}`, () => {
			types.forEach((v) => expect(is(v)).toBeTruthy())
		})
		it(`returns false for non-${name}`, () => {
			;[
				...objectTypes,
				...mapTypes,
				...arrayTypes,
				...numberTypes,
				...stringTypes,
				...otherValueTypes,
			]
				.filter((type) => !types.includes(type))
				.forEach((v) => expect(is(v)).toBeFalsy())
		})
	})
})
