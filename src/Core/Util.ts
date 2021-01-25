export function isObject(maybeObject: unknown): boolean {
	return Object.prototype.toString.call(maybeObject) === '[object Object]'
}

export function isMap(maybeMap: unknown): boolean {
	return Object.prototype.toString.call(maybeMap) === '[object Map]'
}

export function isArray(maybeArray: unknown): boolean {
	return Object.prototype.toString.call(maybeArray) === '[object Array]'
}

export function isString(maybeString: unknown): boolean {
	return Object.prototype.toString.call(maybeString) === '[object String]'
}

export function isNumber(maybeNumber: unknown): boolean {
	return Object.prototype.toString.call(maybeNumber) === '[object Number]'
}
