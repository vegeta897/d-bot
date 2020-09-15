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
	coverageThreshold: {
		global: {
			statements: 50,
			branches: 90,
			functions: 0,
			lines: 0,
		},
	},
}
