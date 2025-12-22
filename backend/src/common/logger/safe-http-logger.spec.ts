import { SafeHttpLogger } from './safe-http-logger';
import { LoggerService } from './logger.service';

describe('SafeHttpLogger', () => {
  let safeHttpLogger: SafeHttpLogger;
  let loggerService: jest.Mocked<LoggerService>;
  let consoleErrorSpy: jest.SpyInstance;
  let nextTickSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock logger service
    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      logWithFields: jest.fn(),
    } as any;

    safeHttpLogger = new SafeHttpLogger(loggerService);

    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Spy on process.nextTick
    nextTickSpy = jest.spyOn(process, 'nextTick');
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    nextTickSpy.mockRestore();
  });

  const createHttpLogDto = (overrides: any = {}) => ({
    method: 'POST',
    url: '/api/customers',
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    statusCode: 201,
    duration: 150,
    userId: 'user-123',
    organizationId: 'org-123',
    ...overrides,
  });

  // Helper to wait for nextTick callbacks
  const waitForNextTick = () => new Promise((resolve) => setImmediate(resolve));

  describe('logRequestSafe', () => {
    it('should log HTTP request successfully', async () => {
      // Arrange
      const dto = createHttpLogDto();

      // Act
      safeHttpLogger.logRequestSafe(dto);
      await waitForNextTick();

      // Assert
      expect(nextTickSpy).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        'POST /api/customers 201 - 150ms',
        'HTTP'
      );
      expect(loggerService.logWithFields).toHaveBeenCalledWith('info', 'POST /api/customers', {
        type: 'http_request',
        method: 'POST',
        url: '/api/customers',
        statusCode: 201,
        duration: 150,
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        userId: 'user-123',
        organizationId: 'org-123',
      });
    });

    it('should not throw even if logger fails', async () => {
      // Arrange
      const dto = createHttpLogDto();
      loggerService.log.mockImplementation(() => {
        throw new Error('Logger crashed');
      });

      // Act & Assert
      expect(() => safeHttpLogger.logRequestSafe(dto)).not.toThrow();
      await waitForNextTick();

      expect(consoleErrorSpy).toHaveBeenCalledWith('CRITICAL: HTTP logger failure', {
        error: 'Logger crashed',
        context: dto,
      });
    });

    it('should use process.nextTick for async execution', () => {
      // Arrange
      const dto = createHttpLogDto();

      // Act
      safeHttpLogger.logRequestSafe(dto);

      // Assert
      expect(nextTickSpy).toHaveBeenCalled();
      expect(nextTickSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should fall back to console.error when Pino fails', async () => {
      // Arrange
      const dto = createHttpLogDto();
      loggerService.logWithFields.mockImplementation(() => {
        throw new Error('Pino is down');
      });

      // Act
      safeHttpLogger.logRequestSafe(dto);
      await waitForNextTick();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('CRITICAL: HTTP logger failure', {
        error: 'Pino is down',
        context: dto,
      });
    });

    it('should handle logger failure with non-Error objects', async () => {
      // Arrange
      const dto = createHttpLogDto();
      loggerService.log.mockImplementation(() => {
        throw 'String error';
      });

      // Act
      safeHttpLogger.logRequestSafe(dto);
      await waitForNextTick();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('CRITICAL: HTTP logger failure', {
        error: 'String error',
        context: dto,
      });
    });
  });

  describe('logErrorSafe', () => {
    it('should log HTTP error with full context', async () => {
      // Arrange
      const dto = createHttpLogDto({ statusCode: 500 });
      const error = {
        name: 'InternalServerError',
        message: 'Database connection failed',
        stack: 'Error: Database connection failed\n    at ...',
      };

      // Act
      safeHttpLogger.logErrorSafe(dto, error);
      await waitForNextTick();

      // Assert
      expect(nextTickSpy).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalledWith(
        'Request failed: POST /api/customers',
        error.stack,
        {
          type: 'http_error',
          method: 'POST',
          url: '/api/customers',
          statusCode: 500,
          duration: 150,
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          userId: 'user-123',
          organizationId: 'org-123',
          errorName: 'InternalServerError',
          errorMessage: 'Database connection failed',
        }
      );
    });

    it('should not throw even if logger fails', async () => {
      // Arrange
      const dto = createHttpLogDto({ statusCode: 500 });
      const error = {
        name: 'InternalServerError',
        message: 'Database connection failed',
        stack: 'Error stack',
      };
      loggerService.error.mockImplementation(() => {
        throw new Error('Logger crashed');
      });

      // Act & Assert
      expect(() => safeHttpLogger.logErrorSafe(dto, error)).not.toThrow();
      await waitForNextTick();

      expect(consoleErrorSpy).toHaveBeenCalledWith('CRITICAL: HTTP error logger failure', {
        logError: 'Logger crashed',
        originalError: 'Database connection failed',
        context: dto,
      });
    });

    it('should handle error logging with missing stack trace', async () => {
      // Arrange
      const dto = createHttpLogDto({ statusCode: 400 });
      const error = {
        name: 'ValidationError',
        message: 'Invalid input',
      };

      // Act
      safeHttpLogger.logErrorSafe(dto, error);
      await waitForNextTick();

      // Assert
      expect(loggerService.error).toHaveBeenCalledWith(
        'Request failed: POST /api/customers',
        'Invalid input',
        expect.objectContaining({
          errorName: 'ValidationError',
          errorMessage: 'Invalid input',
        })
      );
    });

    it('should use process.nextTick for async execution', () => {
      // Arrange
      const dto = createHttpLogDto();
      const error = { name: 'Error', message: 'Test error' };

      // Act
      safeHttpLogger.logErrorSafe(dto, error);

      // Assert
      expect(nextTickSpy).toHaveBeenCalled();
    });
  });

  describe('logSlowRequestSafe', () => {
    it('should log slow request warning', async () => {
      // Arrange
      const dto = createHttpLogDto({ duration: 2500 });

      // Act
      safeHttpLogger.logSlowRequestSafe(dto);
      await waitForNextTick();

      // Assert
      expect(nextTickSpy).toHaveBeenCalled();
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Slow request detected: POST /api/customers',
        {
          duration: 2500,
          statusCode: 201,
        }
      );
    });

    it('should not throw if logger fails during slow request logging', async () => {
      // Arrange
      const dto = createHttpLogDto({ duration: 2500 });
      loggerService.warn.mockImplementation(() => {
        throw new Error('Logger crashed');
      });

      // Act & Assert
      expect(() => safeHttpLogger.logSlowRequestSafe(dto)).not.toThrow();
      await waitForNextTick();

      expect(consoleErrorSpy).toHaveBeenCalledWith('CRITICAL: Slow request logger failure', {
        error: 'Logger crashed',
        context: dto,
      });
    });

    it('should use process.nextTick for async execution', () => {
      // Arrange
      const dto = createHttpLogDto({ duration: 2000 });

      // Act
      safeHttpLogger.logSlowRequestSafe(dto);

      // Assert
      expect(nextTickSpy).toHaveBeenCalled();
    });
  });

  describe('Complete failure resilience', () => {
    it('should never throw exceptions regardless of logger state', async () => {
      // Arrange
      const dto = createHttpLogDto();
      const error = { name: 'Error', message: 'Test error', stack: 'stack' };

      // Simulate complete logger failure
      loggerService.log.mockImplementation(() => { throw new Error('Failure'); });
      loggerService.error.mockImplementation(() => { throw new Error('Failure'); });
      loggerService.warn.mockImplementation(() => { throw new Error('Failure'); });
      loggerService.logWithFields.mockImplementation(() => { throw new Error('Failure'); });

      // Act & Assert - None of these should throw
      expect(() => safeHttpLogger.logRequestSafe(dto)).not.toThrow();
      expect(() => safeHttpLogger.logErrorSafe(dto, error)).not.toThrow();
      expect(() => safeHttpLogger.logSlowRequestSafe(dto)).not.toThrow();

      // Wait for all async operations
      await waitForNextTick();

      // All should fall back to console.error
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
    });
  });
});
