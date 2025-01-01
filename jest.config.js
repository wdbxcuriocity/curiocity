module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^react-markdown$': '<rootDir>/test/__mocks__/react-markdown.tsx',
    '^remark-gfm$': '<rootDir>/test/__mocks__/remark-gfm.tsx',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-markdown|remark-gfm|mdast-util-from-markdown|micromark|decode-named-character-reference|character-entities|property-information|space-separated-tokens|comma-separated-tokens)/)',
  ],
  moduleDirectories: ['node_modules', '<rootDir>'],
};
