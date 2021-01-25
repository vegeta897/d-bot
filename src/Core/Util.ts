export function isObject(maybeObject: unknown): boolean {
	return Object.prototype.toString.call(maybeObject) === '[object Object]'
}

export function isMap(maybeMap: unknown): boolean {
	return Object.prototype.toString.call(maybeMap) === '[object Map]'
}
