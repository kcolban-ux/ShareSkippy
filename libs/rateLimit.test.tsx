// --- 1. Type Definitions ---

type RequestTypeMock = {
  headers: {
    map: Map<string, string | undefined>;
    // eslint-disable-next-line no-unused-vars
    get(key: string): string | undefined;
  };
};

type ResponseTypeMock = {
  success: boolean;
  error?: {
    message: string;
    retryAfter?: number;
  };
};

type RateLimitOptionsMock = {
  max: number;
  windowMs?: number;
  // eslint-disable-next-line no-unused-vars
  keyGenerator?: (request: RequestTypeMock) => string;
};

// The core function type that processes the request and returns a response/result.
// eslint-disable-next-line no-unused-vars
type RequestHandler = (request: RequestTypeMock) => ResponseTypeMock;

// The type for the main rateLimit factory function
// eslint-disable-next-line no-unused-vars
type RateLimitFactory = (options?: RateLimitOptionsMock) => RequestHandler;

// The type for the entire module's exports
type RateLimitModule = {
  rateLimit: RateLimitFactory;
  authRateLimit: RequestHandler;
  apiRateLimit: RequestHandler;
};

// --- 2. Variable Declarations (Explicitly Typed) ---

// These variables will be assigned during beforeEach
let rateLimit: RateLimitFactory;
let authRateLimit: RequestHandler;
let apiRateLimit: RequestHandler;

// --- 3. Mock Request Helper ---

// Helper to create a mock request object with a simple headers.get()
const mockRequest = (ip: string, headers: Record<string, string> = {}): RequestTypeMock => {
  const combinedHeaders = {
    ...headers,
    'x-real-ip': headers['x-real-ip'] || ip,
    'x-forwarded-for': headers['x-forwarded-for'],
  };

  return {
    headers: {
      map: new Map(
        Object.entries(combinedHeaders).map(([key, value]) => [key.toLowerCase(), value])
      ),
      get(key: string) {
        return this.map.get(key.toLowerCase());
      },
    },
  };
};

// --- 4. Test Suite ---

describe('rateLimit', () => {
  beforeEach(() => {
    // Reset modules to get a fresh, empty rateLimitMap for each test
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T10:00:00.000Z'));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./rateLimit') as RateLimitModule;

    rateLimit = mod.rateLimit;
    authRateLimit = mod.authRateLimit;
    apiRateLimit = mod.apiRateLimit;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- Core Logic ---
  describe('Core Limiting Logic', () => {
    it('should allow requests under the limit', () => {
      const limiter = rateLimit({ max: 5 });
      const req = mockRequest('1.1.1.1');
      expect(limiter(req).success).toBe(true); // 1
      expect(limiter(req).success).toBe(true); // 2
      expect(limiter(req).success).toBe(true); // 3
      expect(limiter(req).success).toBe(true); // 4
      expect(limiter(req).success).toBe(true); // 5
    });

    it('should block requests over the limit', () => {
      const limiter = rateLimit({ max: 2 });
      const req = mockRequest('1.1.1.1');
      limiter(req); // 1
      limiter(req); // 2
      const result = limiter(req); // 3 (blocked)
      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('Too many requests');
    });

    it('should reset the limit after the window expires', () => {
      const windowMs = 60000; // 60 seconds
      const limiter = rateLimit({ max: 1, windowMs });
      const req = mockRequest('1.1.1.1');

      // T=0s: First request (allowed)
      expect(limiter(req).success).toBe(true);

      // T=0s: Second request (blocked)
      expect(limiter(req).success).toBe(false);

      // T=59s: Still blocked
      jest.advanceTimersByTime(59000);
      expect(limiter(req).success).toBe(false);

      // T=60s + 1ms: Window for first request (T=0) has passed
      jest.advanceTimersByTime(1001);
      expect(limiter(req).success).toBe(true);

      // T=60s + 1ms: Blocked again by the new request
      expect(limiter(req).success).toBe(false);
    });

    it('should calculate retryAfter correctly', () => {
      const windowMs = 60000; // 60s
      const limiter = rateLimit({ max: 2, windowMs });
      const req = mockRequest('1.1.1.1');

      // T=0s: Call 1
      limiter(req);

      // T=10s: Call 2 (now full)
      jest.advanceTimersByTime(10000);
      limiter(req);

      // T=15s: Call 3 (blocked)
      jest.advanceTimersByTime(5000);
      const result = limiter(req);

      // Oldest request (T=0) expires at T=60s.
      // We are at T=15s.
      // (0 + 60000 - 15000) / 1000 = 45s.
      expect(result.success).toBe(false);
      expect(result.error!.retryAfter).toBe(45);
    });
  });

  // --- Key Generation ---
  describe('keyGenerator', () => {
    it('should use different limits for different IPs', () => {
      const limiter = rateLimit({ max: 1 });
      const req1 = mockRequest('1.1.1.1');
      const req2 = mockRequest('2.2.2.2');

      expect(limiter(req1).success).toBe(true); // IP 1, Call 1
      expect(limiter(req1).success).toBe(false); // IP 1, Call 2

      expect(limiter(req2).success).toBe(true); // IP 2, Call 1
      expect(limiter(req2).success).toBe(false); // IP 2, Call 2
    });

    it('should prioritize x-forwarded-for over x-real-ip', () => {
      const limiter = rateLimit({ max: 1 });
      const req = mockRequest('9.9.9.9', { 'x-forwarded-for': '1.2.3.4' });

      expect(limiter(req).success).toBe(true);
      expect(limiter(req).success).toBe(false);

      // New request from a different IP but the same x-forwarded-for
      const req2 = mockRequest('8.8.8.8', { 'x-forwarded-for': '1.2.3.4' });
      expect(limiter(req2).success).toBe(false); // Blocked, as it used 1.2.3.4
    });

    it('should handle x-forwarded-for with multiple IPs', () => {
      const limiter = rateLimit({ max: 1 });
      // It should only take the *first* IP in the list
      const req = mockRequest('9.9.9.9', {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      });
      expect(limiter(req).success).toBe(true);

      const req2 = mockRequest('8.8.8.8', {
        'x-forwarded-for': '1.2.3.4, 1.1.1.1',
      });
      expect(limiter(req2).success).toBe(false); // Blocked, as it also used 1.2.3.4
    });

    it('should use a custom keyGenerator', () => {
      const limiter = rateLimit({
        max: 1,
        // The req parameter is now correctly typed as RequestTypeMock
        keyGenerator: (req: RequestTypeMock) => req.headers.get('authorization')!,
      });

      const req1 = mockRequest('1.1.1.1', { authorization: 'token-A' });
      const req2 = mockRequest('1.1.1.1', { authorization: 'token-B' });

      expect(limiter(req1).success).toBe(true); // Token A
      expect(limiter(req1).success).toBe(false); // Token A

      expect(limiter(req2).success).toBe(true); // Token B
    });
  });

  // --- Pre-configured Limiters ---
  describe('Pre-configured Limiters', () => {
    it('authRateLimit should have max 5', () => {
      const req = mockRequest('1.1.1.1');
      expect(authRateLimit(req).success).toBe(true); // 1
      expect(authRateLimit(req).success).toBe(true); // 2
      expect(authRateLimit(req).success).toBe(true); // 3
      expect(authRateLimit(req).success).toBe(true); // 4
      expect(authRateLimit(req).success).toBe(true); // 5
      const result = authRateLimit(req); // 6
      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('authentication attempts');
    });

    it('apiRateLimit should have max 100', () => {
      const limiter = apiRateLimit; // Uses the imported instance
      const req = mockRequest('1.1.1.1');
      for (let i = 0; i < 100; i++) {
        expect(limiter(req).success).toBe(true);
      }
      const result = limiter(req);
      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('API requests');
    });
  });
});
