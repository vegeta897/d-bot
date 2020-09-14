module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src', '<rootDir>/tests'],
	testMatch: ['/tests/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
	moduleNameMapper: {
		'src/(.*)': '<rootDir>/src/$1',
		'Modules/(.*)': '<rootDir>/src/Modules/$1',
		'tests/(.*)': '<rootDir>/tests/$1',
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
