// Mock global Response and Headers for the Node.js/Jest environment
// @ts-ignore
global.Headers = class {
  map = new Map();
  constructor(init?: Record<string, string>) {
    if (init) {
      for (const [key, value] of Object.entries(init)) {
        this.map.set(key.toLowerCase(), value);
      }
    }
  }
  get(key: string) {
    return this.map.get(key.toLowerCase()) || null;
  }
};

// @ts-ignore
global.Response = class {
  body: string;
  status: number;
  headers: Headers;

  constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
    this.body = body;
    this.status = init?.status || 200;
    // Ensure 'Content-Type' is set for .json() to work in tests
    const headers = init?.headers || {};
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    this.headers = new global.Headers(headers);
  }

  async json() {
    return JSON.parse(this.body);
  }
};

import {
  APIError,
  handleAPIError,
  withErrorHandling,
  createErrorResponse,
  createSuccessResponse,
} from './errorHandler';

// Use fake timers to control new Date() for consistent timestamps
const mockTimestamp = '2025-01-01T10:00:00.000Z';
jest.useFakeTimers();
jest.setSystemTime(new Date(mockTimestamp));

// Spy on console.error and mock its implementation to silence it during tests
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('errorHandler.js', () => {
  let mockRequest: Request;

  beforeEach(() => {
    consoleErrorSpy.mockClear();
    // Create a new mock request for each test
    mockRequest = {
      url: 'https://test.com/api/v1/resource',
      method: 'GET',
    } as Request;
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  // --- APIError ---
  describe('APIError', () => {
    it('should correctly construct an APIError with all properties', () => {
      const error = new APIError('Not Found', 404, 'NOT_FOUND');
      expect(error.message).toBe('Not Found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('APIError');
    });

    it('should use default values for statusCode and code', () => {
      const error = new APIError('Default error');
      expect(error.message).toBe('Default error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(null);
    });
  });

  // --- handleAPIError ---
  describe('handleAPIError', () => {
    // We don't test the console.error side-effect, but we silence it
    // with the spy. We just test the returned object.

    it('should correctly format a known APIError', () => {
      const error = new APIError('Bad Request', 400, 'INVALID_INPUT');
      const response = handleAPIError(error, mockRequest);
      expect(response).toEqual({
        error: 'Bad Request',
        code: 'INVALID_INPUT',
        status: 400,
      });
    });

    it('should correctly format a Supabase-like error (duck-typed)', () => {
      const error = {
        code: '23505', // Supabase unique violation
        message: 'unique constraint violation',
      };
      const response = handleAPIError(error, mockRequest);
      expect(response).toEqual({
        error: 'unique constraint violation',
        code: '23505',
        status: 400,
      });
    });

    it('should correctly format a validation error', () => {
      const error = new Error('Validation failed: Email is required');
      const response = handleAPIError(error, mockRequest);
      expect(response).toEqual({
        error: 'Validation failed: Email is required',
        status: 400,
      });
    });

    it('should correctly format an authentication error', () => {
      const error = new Error('Unauthorized access');
      const response = handleAPIError(error, mockRequest);
      expect(response).toEqual({
        error: 'Authentication required',
        status: 401,
      });
    });

    it('should correctly format a rate limiting error', () => {
      const error = new Error('Too many requests, please slow down');
      const response = handleAPIError(error, mockRequest);
      expect(response).toEqual({
        error: 'Too many requests, please slow down',
        status: 429,
      });
    });

    it('should return a default 500 for unknown errors', () => {
      const error = new Error('Something very unknown broke');
      const response = handleAPIError(error, mockRequest);
      expect(response).toEqual({
        error: 'Internal server error',
        status: 500,
      });
    });
  });

  // --- withErrorHandling ---
  describe('withErrorHandling', () => {
    const mockContext = { params: { id: '123' } };

    it('should return the handler response on success', async () => {
      const successResponse = new Response(JSON.stringify({ data: 'ok' }), {
        status: 200,
      });
      const mockHandler = jest.fn().mockResolvedValue(successResponse);
      const wrappedHandler = withErrorHandling(mockHandler);

      const response = await wrappedHandler(mockRequest, mockContext);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(response).toBe(successResponse);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: 'ok' });
    });

    it('should return a formatted JSON response on APIError', async () => {
      const error = new APIError('Not Found', 404, 'NOT_FOUND');
      const mockHandler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = withErrorHandling(mockHandler);

      const response = await wrappedHandler(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(await response.json()).toEqual({
        error: 'Not Found',
        code: 'NOT_FOUND',
        timestamp: mockTimestamp,
      });
    });

    it('should return a 500 JSON response on a generic Error', async () => {
      const error = new Error('Generic failure');
      const mockHandler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = withErrorHandling(mockHandler);

      const response = await wrappedHandler(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      // Generic errors handled by handleAPIError do not have a 'code'
      expect(await response.json()).toEqual({
        error: 'Internal server error',
        timestamp: mockTimestamp,
      });
    });
  });

  // --- createErrorResponse ---
  describe('createErrorResponse', () => {
    it('should create a response with all properties', async () => {
      const response = createErrorResponse('Forbidden', 403, 'NO_PERMS');
      expect(response.status).toBe(403);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(await response.json()).toEqual({
        error: 'Forbidden',
        code: 'NO_PERMS',
        timestamp: mockTimestamp,
      });
    });

    it('should use default status and null code', async () => {
      const response = createErrorResponse('Server Error');
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: 'Server Error',
        code: null,
        timestamp: mockTimestamp,
      });
    });
  });

  // --- createSuccessResponse ---
  describe('createSuccessResponse', () => {
    it('should create a response with data and specific status', async () => {
      const data = { id: 1, name: 'Resource' };
      const response = createSuccessResponse(data, 201);
      expect(response.status).toBe(201);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(await response.json()).toEqual(data);
    });

    it('should use default status 200', async () => {
      const data = { id: 1 };
      const response = createSuccessResponse(data);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(data);
    });
  });
});
