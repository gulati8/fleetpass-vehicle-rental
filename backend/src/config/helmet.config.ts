import { HelmetOptions } from 'helmet';

/**
 * Security headers configuration using Helmet
 * Environment-aware CSP rules for development vs production
 */
export const getHelmetConfig = (): HelmetOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Content Security Policy - prevents XSS attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Tailwind CSS
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: isDevelopment
          ? ["'self'", 'http://localhost:3000', 'ws://localhost:3000'] // Allow HMR in dev
          : ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    // HTTP Strict Transport Security - forces HTTPS
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    // X-Frame-Options - prevents clickjacking
    frameguard: {
      action: 'deny',
    },
    // X-Content-Type-Options - prevents MIME sniffing
    noSniff: true,
    // X-XSS-Protection - legacy browser XSS protection
    xssFilter: true,
    // Referrer-Policy - controls referrer information
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // Hide X-Powered-By header - don't reveal tech stack
    hidePoweredBy: true,
  };
};
