module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests/'],
	globals: {
		'ts-jest': {
			tsconfig: '<rootDir>/tests/tsconfig.json',
		},
	},
	moduleNameMapper: {
		'@src/(.*)': '<rootDir>/src/$1',
	},
	coveragePathIgnorePatterns: [
		'<rootDir>/src/Config/',
		'<rootDir>/node_modules/',
	],
}
