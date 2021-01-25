export type StringRecord<T = unknown> = Record<string, T>
export type StringMap<T = unknown> = Map<string, T>

export type JSONSafe =
	| string
	| number
	| boolean
	| null
	| { [property: string]: JSONSafe }
	| JSONSafe[]

export type MapToTuple<M> = M extends Map<infer K, infer V> ? [K, V][] : never
