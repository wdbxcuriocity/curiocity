// Mock the AWS SDK v2 for the Converter
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    Converter: {
      unmarshall: jest.fn((item) => ({
        id: item.id.S,
        name: item.name.S,
        ownerID: item.ownerID?.S,
        folders: item.folders?.M || {},
      })),
      marshall: jest.fn((item) => ({
        id: { S: item.id },
        name: { S: item.name },
        ownerID: { S: item.ownerID },
        folders: { M: item.folders || {} },
      })),
    },
  },
}));

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

// Mock the route dependencies
jest.mock('../resourcemeta/route', () => ({
  resourceMetaTable: 'mock-resource-meta-table',
}));

// Mock the route module
jest.mock('../route', () => {
  const mockSend = jest
    .fn()
    .mockImplementation(() => Promise.resolve({ Item: {} }));
  return {
    client: {
      send: mockSend,
    },
    tableName: 'mock-table',
    // Re-export the actual functions
    ...jest.requireActual('../route'),
  };
});

// Import the functions after all mocks are set up
import { GET, DELETE } from '../route';

// Mock the response object for global use in the test environment
global.Response = {
  json: (data: any) => ({
    json: () => Promise.resolve(data),
  }),
} as any;

describe('GET and DELETE endpoint tests', () => {
  const mockResourceId = 'resource-123';
  let mockSend: jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Get the mock function from the mocked module
    mockSend = jest.requireMock('../route').client.send;
  });

  test('GET request should return resource', async () => {
    // Mock DynamoDB response for GET operation
    const mockItem = {
      id: { S: mockResourceId },
      documentId: { S: 'doc-123' },
      name: { S: 'Test Resource' },
      url: { S: 'https://example.com' },
      text: { S: 'Sample text' },
    };

    // Set up mock response
    mockSend.mockResolvedValueOnce({ Item: mockItem });

    // Mock request with a URL containing the 'id' query parameter
    const request = {
      url: `http://localhost?id=${mockResourceId}`,
    };

    const response = await GET(request as any);
    const responseData = await response.json();

    // Verify response data matches the mock item exactly since it's returned directly
    expect(responseData).toEqual(mockItem);
  });

  test('DELETE request should remove the resource', async () => {
    // Set up the initial GET response for the delete operation
    const mockItem = {
      id: { S: mockResourceId },
      name: { S: 'Test Resource' },
      ownerID: { S: 'test-owner' },
      folders: { M: {} },
    };

    // First call to send (GET) returns the item, second call (DELETE) returns empty response
    mockSend
      .mockResolvedValueOnce({ Item: mockItem })
      .mockResolvedValueOnce({});

    // Mock request with a JSON body containing the 'id'
    const request = {
      json: async () => ({ id: mockResourceId }),
    };

    const response = await DELETE(request as any);
    const responseData = await response.json();

    // Verify response
    expect(responseData.msg).toBe('success');

    // Verify the mock was called correctly
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        input: expect.objectContaining({
          TableName: expect.any(String),
          Key: expect.objectContaining({
            id: { S: mockResourceId },
          }),
        }),
      }),
    );
  });
});
