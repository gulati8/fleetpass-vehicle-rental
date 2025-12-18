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
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Network error (no response)
    if (!error.response) {
      throw new ApiError(
        'Network error. Please check your connection.',
        0,
        'NETWORK_ERROR'
      );
    }

    // API error response
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
