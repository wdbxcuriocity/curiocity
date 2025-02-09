import { GET, DELETE } from '../route';
import * as route from '../route';
import {
  GetItemCommandOutput,
  DeleteItemCommandOutput,
} from '@aws-sdk/client-dynamodb';

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
  });

  test('GET request should return resource', async () => {
    // Mock a DynamoDB response for the getObject call
    const mockResourceData: GetItemCommandOutput = {
      Item: {
        id: { S: mockResourceId },
        documentId: { S: 'doc-123' },
        name: { S: 'Test Resource' },
        url: { S: 'https://example.com' },
        text: { S: 'Sample text' },
      },
      $metadata: {},
    };

    // Mock getObject to return the mock resource
    const getObjectMock = jest.spyOn(route, 'getObject');
    getObjectMock.mockImplementation(() => Promise.resolve(mockResourceData));

    // Mock request with a URL containing the 'id' query parameter
    const request = {
      url: `http://localhost?id=${mockResourceId}`,
    };

    const response = await GET(request as any);
    const responseData = await response.json();

    // Assertions
    expect(responseData.id.S).toBe(mockResourceId);
    expect(responseData.name.S).toBe('Test Resource');
  });

  test('DELETE request should remove the resource', async () => {
    // Mock deleteObject to simulate a successful deletion response
    const deleteObjectMock = jest.spyOn(route, 'deleteObject');
    deleteObjectMock.mockImplementation(() =>
      Promise.resolve({ $metadata: {} } as DeleteItemCommandOutput),
    );

    // Mock request with a JSON body containing the 'id'
    const request = {
      json: async () => ({ id: mockResourceId }),
    };

    const response = await DELETE(request as any);
    const responseData = await response.json();

    // Assertions
    expect(responseData.msg).toBe('success');
  });
});
