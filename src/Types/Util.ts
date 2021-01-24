export type StringRecord<T = unknown> = Record<string, T>
export type StringMap<T = unknown> = Map<string, T>
export type JSONSafe =
	| string
	| number
	| boolean
	| null
	| { [property: string]: JSONSafe }
	| JSONSafe[]
export type JSONSafeStringMap = StringMap<JSONSafe>
// Disallows any maps in arrays or maps in maps, for revivable JSON
export type NoNestedMaps =
	| JSONSafe
	| JSONSafeStringMap
	| { [property: string]: JSONSafeStringMap | NoNestedMaps }
