// Simple in-memory rate limiting utility
// In production, consider using Redis or a dedicated rate limiting service

const rateLimitMap = new Map();

// Helper to get current time (respects Jest fake timers)
const getCurrentTime = () => Date.now();

export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    keyGenerator = (request) => {
      // Get IP address from request headers
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded
        ? forwarded.split(',')[0]
        : request.headers.get('x-real-ip') || 'unknown';
      return ip;
    },
  } = options;

  return (request) => {
    const key = keyGenerator(request);
    const now = getCurrentTime();
    const windowStart = now - windowMs;

    // Get or create rate limit data for this key
    let rateLimitData = rateLimitMap.get(key) || { requests: [], resetTime: now + windowMs };

    // Clean up old requests outside the window
    rateLimitData.requests = rateLimitData.requests.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (rateLimitData.requests.length >= max) {
      return {
        success: false,
        error: {
          message,
          retryAfter: Math.ceil((rateLimitData.requests[0] + windowMs - now) / 1000),
        },
      };
    }

    // Add current request
    rateLimitData.requests.push(now);
    rateLimitMap.set(key, rateLimitData);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance
      for (const [k, v] of rateLimitMap.entries()) {
        if (v.resetTime < now) {
          rateLimitMap.delete(k);
        }
      }
    }

    return { success: true };
  };
};

// Predefined rate limiters for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many API requests, please try again later.',
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please slow down.',
});
