// Test httpClient utility functions
const logger = require('../../src/config/logger');

// Mock logger
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

describe('HTTP Client', () => {
  let httpClient;
  let mockAxiosGet;
  let mockAxiosPost;

  beforeEach(() => {
    jest.resetModules();
    
    // Create mock functions
    mockAxiosGet = jest.fn();
    mockAxiosPost = jest.fn();

    // Mock axios.create to return our mocked instance
    jest.doMock('axios', () => ({
      create: jest.fn().mockReturnValue({
        get: mockAxiosGet,
        post: mockAxiosPost
      })
    }));

    // Re-require httpClient after mocking
    httpClient = require('../../src/utils/httpClient');
    
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user data on success', async () => {
      const mockUserData = {
        data: { id: 'user-123', email: 'test@example.com', role: 'client' }
      };
      
      mockAxiosGet.mockResolvedValueOnce({ data: mockUserData });

      const result = await httpClient.validateUser('user-123', 'token');

      expect(result).toEqual(mockUserData);
      expect(mockAxiosGet).toHaveBeenCalledWith('/api/users/user-123', {
        headers: { 'Authorization': 'Bearer token' }
      });
    });

    it('should throw USER_NOT_FOUND for 404 response', async () => {
      const mockError = {
        response: { status: 404 }
      };
      mockAxiosGet.mockRejectedValueOnce(mockError);

      try {
        await httpClient.validateUser('user-123', 'token');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('USER_NOT_FOUND');
        expect(error.status).toBe(404);
      }
    });

    it('should throw SERVICE_UNAVAILABLE for connection refused', async () => {
      const mockError = {
        code: 'ECONNREFUSED'
      };
      mockAxiosGet.mockRejectedValueOnce(mockError);

      try {
        await httpClient.validateUser('user-123', 'token');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('SERVICE_UNAVAILABLE');
        expect(error.status).toBe(503);
      }
    });

    it('should throw SERVICE_UNAVAILABLE for timeout', async () => {
      const mockError = {
        code: 'ETIMEDOUT'
      };
      mockAxiosGet.mockRejectedValueOnce(mockError);

      try {
        await httpClient.validateUser('user-123', 'token');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.code).toBe('SERVICE_UNAVAILABLE');
      }
    });

    it('should rethrow other errors', async () => {
      const mockError = new Error('Unknown error');
      mockAxiosGet.mockRejectedValueOnce(mockError);

      try {
        await httpClient.validateUser('user-123', 'token');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Unknown error');
      }
    });
  });

  describe('fetchUsersBatch', () => {
    it('should return user data on success', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [{ id: 'user-1' }, { id: 'user-2' }],
          count: 2
        }
      };
      mockAxiosPost.mockResolvedValueOnce(mockResponse);

      const result = await httpClient.fetchUsersBatch(['user-1', 'user-2'], 'token');

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/api/users/batch',
        { user_ids: ['user-1', 'user-2'] },
        { headers: { 'Authorization': 'Bearer token' } }
      );
    });

    it('should return empty result on failure for graceful degradation', async () => {
      mockAxiosPost.mockRejectedValueOnce(new Error('Network error'));

      const result = await httpClient.fetchUsersBatch(['user-1', 'user-2'], 'token');

      expect(result).toEqual({ success: false, data: [], count: 0 });
    });
  });

  describe('getUserRoleInfo', () => {
    it('should return role info on success', async () => {
      const mockRoleInfo = {
        data: { role: 'trainer', specializations: ['strength'] }
      };
      mockAxiosGet.mockResolvedValueOnce({ data: mockRoleInfo });

      const result = await httpClient.getUserRoleInfo('user-123', 'token');

      expect(result).toEqual(mockRoleInfo);
    });

    it('should return null on failure', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

      const result = await httpClient.getUserRoleInfo('user-123', 'token');

      expect(result).toBeNull();
    });
  });
});
