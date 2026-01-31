const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './'
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/(.*)$': '<rootDir>/$1'
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Business logic should have higher coverage
    'lib/**/*.{ts,tsx}': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'text-summary', 'html', 'lcov']
};

module.exports = createJestConfig(customJestConfig);



