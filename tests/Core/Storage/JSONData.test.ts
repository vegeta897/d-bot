import JSONData from '@src/Core/Storage/JSONData'

describe('save', () => {
	it('throws when not overwritten by JSONFile', () => {
		const data = new JSONData({ data: {} })
		expect(() => data.save()).toThrow(/missing save method/i)
	})
})

describe('convertToJSON', () => {
	it('returns this.data by default', () => {
		const dataObject = {}
		const data = new JSONData({ data: dataObject })
		expect(data.convertToJSON()).toBe(dataObject)
	})
})

describe('loadJSON', () => {
	it('merges JSON into this.data', () => {
		const dataObject = { foo: 123 }
		const jsonData = { bar: 456 }
		const data = new JSONData({ data: dataObject })
		data.loadJSON(jsonData)
		expect(data.data).toStrictEqual({
			...dataObject,
			...jsonData,
		})
	})
})

describe('get', () => {
	it('returns property of data', () => {
		const dataObject = { foo: 123 }
		const data = new JSONData({ data: dataObject })
		expect(data.get('foo')).toStrictEqual(dataObject.foo)
	})
})

describe('set', () => {
	it('sets property of data', () => {
		const dataObject = { foo: 123 }
		const data = new JSONData({ data: dataObject })
		jest.spyOn(data, 'save').mockImplementation()
		const newValue = 456
		data.set('foo', newValue)
		expect(data.data.foo).toBe(newValue)
	})
})

describe('trans', () => {
	it('transforms property of data', () => {
		const addOne = (num: number) => num + 1
		const originalValue = 123
		const dataObject = { foo: originalValue }
		const data = new JSONData({ data: dataObject })
		jest.spyOn(data, 'save').mockImplementation()
		data.trans('foo', addOne)
		expect(data.data.foo).toBe(addOne(originalValue))
	})
	it('cancels transform if function returns void', () => {
		const dataObject = { foo: 123 }
		const data = new JSONData({ data: dataObject })
		expect(
			data.trans('foo', () => {
				return
			})
		).toBe(undefined)
	})
})
