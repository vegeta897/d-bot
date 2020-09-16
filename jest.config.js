module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests/'],
	globals: {
		'ts-jest': {
			tsConfig: '<rootDir>/tests/tsconfig.json',
		},
	},
	moduleNameMapper: {
		'@src/(.*)': '<rootDir>/src/$1',
	},
}
