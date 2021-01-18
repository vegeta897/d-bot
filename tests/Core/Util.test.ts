import { ObjectMapUtil } from '@src/Core/Util'

const {
	objectToMapShallow,
	mapToObjectShallow,
	isObject,
	isMap,
	convertPropertiesDeep,
} = ObjectMapUtil

const testObject = {
	aNumber: 897,
	aString: 'test',
	anArray: [1, 2, 3],
	anObject: {
		foo: 1,
		bar: 2,
	},
	aStringKeyMap: new Map([
		['foo', 1],
		['bar', 2],
	]),
}

const testMap = new Map<string, unknown>([
	['aNumber', 897],
	['aString', 'test'],
	['anArray', [1, 2, 3]],
	[
		'anObject',
		{
			foo: 1,
			bar: 2,
		},
	],
	[
		'aStringKeyMap',
		new Map([
			['foo', 1],
			['bar', 2],
		]),
	],
])

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

const testObjectWithMapsAsMaps = {
	aString: 'test',
	aMap: new Map([['a', 1]]),
	aMapInMap: new Map([['b', new Map([['c', 2]])]]),
	aMapInObject: {
		d: new Map([['e', 3]]),
	},
	anObject: { f: 4 },
	anObjectInObject: { g: { h: 5 } },
	anObjectInMap: new Map([['i', { j: 6 }]]),
	aMapInObjectInMap: new Map([['k', { l: new Map([['m', 7]]) }]]),
	anObjectInMapInObject: { n: new Map([['o', { p: 8 }]]) },
}

const testObjectWithMapsAsObjects = {
	aString: 'test',
	aMap: { a: 1 },
	aMapInMap: { b: { c: 2 } },
	aMapInObject: { d: { e: 3 } },
	anObject: { f: 4 },
	anObjectInObject: { g: { h: 5 } },
	anObjectInMap: { i: { j: 6 } },
	aMapInObjectInMap: { k: { l: { m: 7 } } },
	anObjectInMapInObject: { n: { o: { p: 8 } } },
}

describe('objectToMapShallow', () => {
	const convertedToMap = objectToMapShallow(testObject)
	it('returns a map with same keys as object', () => {
		expect(isMap(convertedToMap)).toBeTruthy()
		expect(convertedToMap).toStrictEqual(testMap)
	})
})

describe('mapToObjectShallow', () => {
	const convertedToObject = mapToObjectShallow(testMap)
	it('returns an object with same keys as map', () => {
		expect(isObject(convertedToObject)).toBeTruthy()
		expect(convertedToObject).toMatchObject(testObject)
	})
})

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

describe('convertPropertiesDeep', () => {
	it('deeply converts maps to objects with no target object', () => {
		expect(convertPropertiesDeep(testObjectWithMapsAsMaps)).toMatchObject(
			testObjectWithMapsAsObjects
		)
	})
	it('deeply converts objects to maps with a target object', () => {
		expect(
			convertPropertiesDeep(
				testObjectWithMapsAsObjects,
				(testObjectWithMapsAsMaps as unknown) as typeof testObjectWithMapsAsObjects
			)
		).toStrictEqual(testObjectWithMapsAsMaps)
	})
})
