require('@testing-library/jest-dom');

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    return {
      type: 'img',
      props: {
        ...props,
        src: props.src || '',
        alt: props.alt || '',
      },
    };
  },
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(),
}));

// Mock PostHog
jest.mock('posthog-js', () => ({
  capture: jest.fn(),
  identify: jest.fn(),
}));

// Mock next-s3-upload
jest.mock('next-s3-upload', () => ({
  useS3Upload: jest.fn(() => ({
    uploadToS3: jest.fn(),
  })),
}));

// Mock image imports
jest.mock('@/assets/logo.png', () => 'test-file-stub');

// Mock AWS SDK v3
const mockSend = jest.fn();
const mockDynamoDBClient = jest.fn(() => ({
  send: mockSend,
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: mockDynamoDBClient,
  GetItemCommand: jest.fn((input) => ({ input })),
  PutItemCommand: jest.fn((input) => ({ input })),
  DeleteItemCommand: jest.fn((input) => ({ input })),
  QueryCommand: jest.fn((input) => ({ input })),
}));

// Make mock functions available globally for tests
global.mockDynamoDBClient = mockDynamoDBClient;
global.mockDynamoDBSend = mockSend;

// Mock AWS credentials
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-west-1';
process.env.AWS_SESSION_TOKEN = 'test-session-token';

// Mock environment variables
process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test_key';
process.env.NEXT_PUBLIC_POSTHOG_HOST = 'test_host';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ content: 'test content' }),
    text: () => Promise.resolve('test content'),
    blob: () => Promise.resolve(new Blob(['test content'])),
  }),
);
