module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': ['babel-jest', { 
      presets: ['@babel/preset-env'],
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }],
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