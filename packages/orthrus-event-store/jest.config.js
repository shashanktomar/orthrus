module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|js)x?$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/databases/mysql/setup/**/*{ts,js}',
    '!src/databases/mysql/tests/**/*{ts,js}',
  ],
  collectCoverage: true,
  testPathIgnorePatterns: ['/node_modules/', 'lib'],
}
