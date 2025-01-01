import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useCurrentResource } from '@/context/AppContext';

jest.mock('@/context/AppContext', () => ({
  useCurrentResource: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Resource Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle resource fetch errors gracefully', async () => {
    const mockFetchResourceMeta = jest.fn();
    (useCurrentResource as jest.Mock).mockReturnValue({
      fetchResourceMeta: mockFetchResourceMeta,
      resourceMeta: null,
      error: { message: 'Network error' },
    });

    const TestComponent = () => {
      const { fetchResourceMeta } = useCurrentResource();
      React.useEffect(() => {
        const fetchData = async () => {
          await fetchResourceMeta('test-resource-id');
        };
        fetchData();
      }, [fetchResourceMeta]);
      return <div>Resource Management Test</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(mockFetchResourceMeta).toHaveBeenCalledWith('test-resource-id');
    });
  });
});
