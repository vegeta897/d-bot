import {
	CreateResultList,
	CalculateResultsPerLine,
	MAX_LINE_WIDTH,
} from '@src/Commands/Common/ResultList'

function generateResults(resultCount: number, resultLength = 1): string[] {
	// Create dummy results with specified string length and count
	const results: string[] = []
	results.length = resultCount
	return results.fill('x'.repeat(resultLength))
}

function getList(
	results: string[],
	{
		resultsPerLineSizes = [1, 5],
		maxLines = 4,
		delimiter = ' ',
		removeMarkdown = true,
		oneLine = false,
	}: Parameters<typeof CreateResultList>[1] = {}
): ReturnType<typeof CreateResultList> {
	return CreateResultList(results, {
		resultsPerLineSizes,
		maxLines,
		delimiter,
		removeMarkdown,
		oneLine,
	})
}

describe('CreateResultList function', () => {
	it('returns one result per line', () => {
		const resultCount = 4
		const maxLinesResult = getList(generateResults(resultCount))
		expect(maxLinesResult.resultLines).toBe(resultCount)
		expect(maxLinesResult.multiLine).toBe(true)
	})
	it('combines results into 2 lines', () => {
		const resultCount = 10
		const twoLineResult = getList(generateResults(resultCount))
		expect(twoLineResult.resultLines).toBe(2)
		expect(twoLineResult.multiLine).toBe(true)
	})
	it('returns one line of results', () => {
		const resultCount = 21
		const oneLineResult = getList(generateResults(resultCount))
		expect(oneLineResult.resultLines).toBe(1)
		expect(oneLineResult.multiLine).toBe(false)
	})
	it('returns one line with oneLine option', () => {
		const oneLineOptionResult = getList(generateResults(5), { oneLine: true })
		expect(oneLineOptionResult.resultLines).toBe(1)
		expect(oneLineOptionResult.multiLine).toBe(false)
	})
	it('truncates to one line of results', () => {
		const resultLength = 8
		const resultCount = 5 * 4
		const truncatedResult = getList(generateResults(resultCount, resultLength))
		expect(truncatedResult.resultLines).toBe(1)
		expect(truncatedResult.truncated).toBe(true)
		const maxLineLength = MAX_LINE_WIDTH * 4
		const maxDisplayedResults = Math.floor(maxLineLength / (resultLength + 1))
		expect(truncatedResult.remainingResults).toBe(
			resultCount - maxDisplayedResults
		)
	})
	it('does not strip markdown with option', () => {
		const markDownString = '**1**'
		const markdownResult = getList([markDownString], { removeMarkdown: false })
		expect(markdownResult.resultList).toHaveLength(markDownString.length)
	})
	it('uses default parameters', () => {
		const defaultParamResults = CreateResultList(['1', '2', '3'])
		expect(defaultParamResults).toBeTruthy()
	})
})

describe('CalculateResultsPerLine function', () => {
	it('returns the first valid size', () => {
		const resultsPerLineSizes = [1, 4, 10]
		const maxLines = 5
		const runCalc = (resultCount: number): number =>
			CalculateResultsPerLine({
				resultCount,
				resultsPerLineSizes,
				maxLines,
			})
		expect(runCalc(5)).toBe(1)
		expect(runCalc(20)).toBe(4)
		expect(runCalc(50)).toBe(10)
		expect(runCalc(100)).toBe(100)
	})
})
