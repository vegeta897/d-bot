import { ObjectMapUtil } from '@src/Core/Util'

const {
	objectToMapShallow,
	mapToObjectShallow,
	isObject,
	isMap,
	reviveJSON,
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
	aMapInObject: {
		b: new Map([['c', 2]]),
	},
	anObject: { d: 3 },
	anObjectInObject: { e: { f: 4 } },
	anObjectInMap: new Map([['g', { h: 5 }]]),
	anObjectInMapInObject: { i: new Map([['j', { k: 6 }]]) },
	anArray: [7],
	anArrayInObject: { l: [8] },
	anObjectInArray: [{ m: 9 }],
}

const testObjectWithMapsAsArrays = {
	aString: 'test',
	aMap: [['a', 1]],
	aMapInObject: { b: [['c', 2]] },
	anObject: { d: 3 },
	anObjectInObject: { e: { f: 4 } },
	anObjectInMap: [['g', { h: 5 }]],
	anObjectInMapInObject: { i: [['j', { k: 6 }]] },
	anArray: [7],
	anArrayInObject: { l: [8] },
	anObjectInArray: [{ m: 9 }],
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

describe('reviveJSON', () => {
	it('deeply converts arrays to maps', () => {
		expect(
			reviveJSON(
				testObjectWithMapsAsArrays,
				(testObjectWithMapsAsMaps as unknown) as typeof testObjectWithMapsAsArrays
			)
		).toStrictEqual(testObjectWithMapsAsMaps)
	})
})
