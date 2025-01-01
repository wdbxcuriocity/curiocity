import { GET, DELETE } from '../route';

/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  var mockDynamoDBSend: jest.Mock;
  var mockDynamoDBClient: jest.Mock;
  namespace NodeJS {
    interface Global {
      mockDynamoDBSend: jest.Mock;
      mockDynamoDBClient: jest.Mock;
      Response: any;
    }
  }
}
/* eslint-enable no-var */
/* eslint-enable @typescript-eslint/no-namespace */

// Mock the response object for global use in the test environment
global.Response = {
  json: (data: any) => ({
    json: () => Promise.resolve(data),
  }),
} as any;

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

describe('GET and DELETE endpoint tests', () => {
  const mockResourceId = 'resource-123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation for each test
    global.mockDynamoDBSend.mockReset();
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

    global.mockDynamoDBSend.mockImplementationOnce(() =>
      Promise.resolve({ Item: mockItem }),
    );

    // Mock request with a URL containing the 'id' query parameter
    const request = {
      url: `http://localhost?id=${mockResourceId}`,
    };

    const response = await GET(request as any);
    const responseData = await response.json();

    // Verify DynamoDB was called with correct parameters
    expect(global.mockDynamoDBSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          TableName: expect.any(String),
          Key: expect.objectContaining({
            id: { S: mockResourceId },
          }),
        }),
      }),
    );

    // Verify response data
    expect(responseData.id.S).toBe(mockResourceId);
    expect(responseData.name.S).toBe('Test Resource');
  });

  test('DELETE request should remove the resource', async () => {
    // Mock DynamoDB response for DELETE operation
    global.mockDynamoDBSend.mockImplementationOnce(() => Promise.resolve({}));

    // Mock request with a JSON body containing the 'id'
    const request = {
      json: async () => ({ id: mockResourceId }),
    };

    const response = await DELETE(request as any);
    const responseData = await response.json();

    // Verify DynamoDB was called with correct parameters
    expect(global.mockDynamoDBSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          TableName: expect.any(String),
          Key: expect.objectContaining({
            id: { S: mockResourceId },
          }),
        }),
      }),
    );

    // Verify response
    expect(responseData.msg).toBe('success');
  });
});
