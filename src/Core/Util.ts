export function isObject(
	maybeObject: unknown
): maybeObject is Record<string, unknown> {
	return Object.prototype.toString.call(maybeObject) === '[object Object]'
}

export function isMap(maybeMap: unknown): maybeMap is Map<unknown, unknown> {
	return Object.prototype.toString.call(maybeMap) === '[object Map]'
}

export function isArray(maybeArray: unknown): maybeArray is [] {
	return Object.prototype.toString.call(maybeArray) === '[object Array]'
}

export function isString(maybeString: unknown): maybeString is string {
	return Object.prototype.toString.call(maybeString) === '[object String]'
}

export function isNumber(maybeNumber: unknown): maybeNumber is number {
	return Object.prototype.toString.call(maybeNumber) === '[object Number]'
}

export function toMonospaceDigits(number: number): string {
	return [...number.toString()]
		.map((digit) =>
			isNaN(parseInt(digit)) ? digit : '𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫'.substr(+digit * 2, 2)
		)
		.join('')
}
