import RemoveMD from 'remove-markdown'

export const MAX_LINE_WIDTH = 35

const DEFAULT_MAX_LINES = 8
const DEFAULT_DELIMITER = ', '
const DEFAULT_RESULTS_PER_LINE_SIZES = [1, 5, 10]

export function CreateResultList(
	results: string[],
	{
		resultsPerLineSizes = DEFAULT_RESULTS_PER_LINE_SIZES,
		maxLines = DEFAULT_MAX_LINES,
		delimiter = DEFAULT_DELIMITER,
		removeMarkdown = true,
		oneLine = false,
	}: {
		maxLines?: number
		delimiter?: string
		removeMarkdown?: boolean
		oneLine?: boolean
		resultsPerLineSizes?: number[]
	} = {}
): {
	resultList: string
	resultLines: number
	truncated: boolean
	multiLine: boolean
	remainingResults: number
} {
	const resultsPerLine = CalculateResultsPerLine({
		resultCount: results.length,
		resultsPerLineSizes,
		maxLines,
	})
	let multiLine = oneLine ? false : resultsPerLine < results.length
	let oneLineLength = 0
	let lastLineLength = 0
	let truncated = false
	let remainingResults = 0
	let oneLineList = ''
	const multiLineList: string[] = []
	for (const [i, result] of results.entries()) {
		// Building one-line list in case multi-line exceeds line length
		oneLineList += (i > 0 ? delimiter : '') + result
		const resultLength =
			(removeMarkdown ? RemoveMD(result) : result).length + delimiter.length
		oneLineLength += resultLength
		const remaining = results.length - i
		if (oneLineLength > maxLines * MAX_LINE_WIDTH && remaining > 1) {
			oneLineList += '\n' + createRemainingLine(remainingResults)
			remainingResults = remaining
			multiLine = false
			truncated = true
			break
		}
		if (multiLine) {
			if (i % resultsPerLine > 0) {
				lastLineLength += resultLength
				if (lastLineLength > MAX_LINE_WIDTH) {
					multiLine = false
				} else {
					multiLineList[multiLineList.length - 1] += delimiter + result
				}
			} else {
				lastLineLength = 0
				multiLineList.push(result)
			}
		}
	}
	return {
		resultList: multiLine ? multiLineList.join('\n') : oneLineList,
		resultLines: multiLine ? multiLineList.length : 1,
		truncated,
		multiLine,
		remainingResults,
	}
}

export function CalculateResultsPerLine({
	resultCount,
	resultsPerLineSizes,
	maxLines,
}: {
	resultCount: number
	resultsPerLineSizes: number[]
	maxLines: number
}): number {
	const [maxResultsPerLine] = resultsPerLineSizes.slice(-1)
	// Return resultCount if it exceeds line count in highest size
	if (resultCount / maxResultsPerLine > maxLines) return resultCount
	resultsPerLineSizes = [...resultsPerLineSizes] // Copy array
	let resultsPerLine: number
	do {
		resultsPerLine = resultsPerLineSizes.shift() as number
	} while (
		resultsPerLineSizes.length > 0 &&
		resultCount / resultsPerLine > maxLines
	)
	return resultsPerLine
}

function createRemainingLine(remaining: number): string {
	return `... *${remaining} more results*`
}
