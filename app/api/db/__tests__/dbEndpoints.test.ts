import { GET, DELETE } from '../route';
import * as route from '../route';
import AWS from 'aws-sdk';

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
    const mockResourceData = {
      Item: AWS.DynamoDB.Converter.marshall({
        id: mockResourceId,
        documentId: 'doc-123',
        name: 'Test Resource',
        url: 'https://example.com',
        text: 'Sample text',
      }),
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
    deleteObjectMock.mockImplementation(() => Promise.resolve({}));

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
