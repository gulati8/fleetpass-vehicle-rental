'use client';

import { useGlobalErrorHandler } from '@/lib/hooks/api/use-api-error-handler';

export function GlobalErrorHandler() {
  useGlobalErrorHandler();
  return null;
}
