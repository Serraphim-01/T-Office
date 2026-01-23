module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(supertest|.+\\.js$))',
  ],
  testMatch: [
    '**/test/**/*.test.js',
  ],
  collectCoverageFrom: [
    'test/**/*.{js}',
    '!test/**/*.test.js',
  ],
};