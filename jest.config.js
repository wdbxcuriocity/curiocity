module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest', // Use ts-jest for TypeScript and TSX
    '^.+\\.(js|jsx)$': 'babel-jest', // Use babel-jest for JS and JSX
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@radix-ui)', // If Radix UI is used, it must be transformed
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js', // Mock images
  },
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'], // Any test setup scripts
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Supported file types
  transformIgnorePatterns: ['/node_modules/(?!@radix-ui)'],
};
