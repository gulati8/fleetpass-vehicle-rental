/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Signup request payload
 */
export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  organizationId: string;
}

/**
 * Auth response (login/signup)
 */
export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}
