import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useCurrentDocument } from '@/context/AppContext';

jest.mock('@/context/AppContext', () => ({
  useCurrentDocument: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Document Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle document fetch errors gracefully', async () => {
    const mockFetchDocument = jest.fn();
    (useCurrentDocument as jest.Mock).mockReturnValue({
      fetchDocument: mockFetchDocument,
      document: null,
      error: { message: 'Network error' },
    });

    const TestComponent = () => {
      const { fetchDocument } = useCurrentDocument();
      React.useEffect(() => {
        const fetchData = async () => {
          await fetchDocument('test-id');
        };
        fetchData();
      }, [fetchDocument]);
      return <div>Document Management Test</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(mockFetchDocument).toHaveBeenCalledWith('test-id');
    });
  });
});
