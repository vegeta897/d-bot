import {
	isObject,
	isMap,
	isArray,
	isString,
	isNumber,
	toMonospaceDigits,
} from '@src/Core/Util'

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

describe('toMonospaceDigits function', () => {
	it('returns whole numbers', () => {
		expect(toMonospaceDigits(0)).toBe('𝟢')
		expect(toMonospaceDigits(1)).toBe('𝟣')
		expect(toMonospaceDigits(1234567890)).toBe('𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫𝟢')
		expect(toMonospaceDigits(-1)).toBe('-𝟣')
	})
	it('returns decimal numbers', () => {
		expect(toMonospaceDigits(0.05)).toBe('𝟢.𝟢𝟧')
		expect(toMonospaceDigits(123.456)).toBe('𝟣𝟤𝟥.𝟦𝟧𝟨')
		expect(toMonospaceDigits(-0.05)).toBe('-𝟢.𝟢𝟧')
	})
})
