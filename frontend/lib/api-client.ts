import axios, { AxiosError } from 'axios';

/**
 * Custom API error class with structured error information
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Enhanced axios instance with error handling and timeout
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
  timeout: 10000, // 10 second timeout
});

/**
 * Refresh token state management
 * Prevents multiple concurrent refresh attempts and queues failed requests
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * Request interceptor: Automatically add Idempotency-Key to all mutation requests
 */
apiClient.interceptors.request.use((config) => {
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const method = config.method?.toUpperCase();

  // Add idempotency key for all state-changing requests
  if (method && mutationMethods.includes(method)) {
    // Only generate if not already provided
    if (!config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = crypto.randomUUID();
    }
  }

  return config;
});

/**
 * Response interceptor for error handling and automatic token refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Network error (no response)
    if (!error.response) {
      throw new ApiError(
        'Network error. Please check your connection.',
        0,
        'NETWORK_ERROR'
      );
    }

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response.status === 401 && !originalRequest._retry) {
      // Skip refresh for auth endpoints (login, signup, refresh)
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/signup') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        const data = error.response.data as any;
        throw new ApiError(
          data?.error?.message || data?.message || 'Authentication failed',
          error.response.status,
          data?.error?.code || data?.code || 'UNAUTHORIZED',
          data?.error?.details || data?.details
        );
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the access token
        await apiClient.post('/auth/refresh');

        // Refresh successful - process queued requests
        processQueue(null, null);
        isRefreshing = false;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - reject all queued requests
        processQueue(refreshError, null);
        isRefreshing = false;

        // Redirect to login page with session expired message
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login?session_expired=true';
        }

        throw new ApiError(
          'Session expired. Please login again.',
          401,
          'SESSION_EXPIRED'
        );
      }
    }

    // Handle other API errors
    const data = error.response.data as any;
    throw new ApiError(
      data?.error?.message || data?.message || 'An error occurred',
      error.response.status,
      data?.error?.code || data?.code || 'UNKNOWN_ERROR',
      data?.error?.details || data?.details
    );
  }
);

export default apiClient;
export { apiClient };
