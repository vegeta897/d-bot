import random from 'random'

export function Roll(diceCount: number, diceSides: number): number[] {
	const results: number[] = []
	for (let i = 0; i < diceCount; i++) {
		results.push(random.int(1, diceSides))
	}
	return results
}
