export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  level: LogLevel;
  service: string;
  message: string;
  correlationId?: string;
  userId?: string;
  error?: Error | unknown;
  metadata?: Record<string, unknown>;
}

interface LogEntryOutput {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  correlationId?: string;
  error?:
    | {
        name: string;
        message: string;
        stack?: string;
      }
    | unknown;
  metadata?: Record<string, unknown>;
}

const REDACT_FIELDS = ['password', 'token', 'secret', 'key', 'credentials'];

/**
 * Redacts sensitive information from objects
 */
export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...obj };

  for (const [key, value] of Object.entries(redacted)) {
    // Check if key contains sensitive information
    if (REDACT_FIELDS.some((field) => key.toLowerCase().includes(field))) {
      redacted[key] = '[REDACTED]';
      continue;
    }

    // Recursively redact nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redact(value as Record<string, unknown>);
    }
  }

  return redacted;
}

/**
 * Logs a message with metadata
 */
export function log(entry: LogEntry): void {
  const timestamp = new Date().toISOString();
  const { level, service, message, correlationId, error, metadata } = entry;

  // Format the log entry
  const logEntry: LogEntryOutput = Object.assign(
    {
      timestamp,
      level,
      service,
      message,
    },
    correlationId ? { correlationId } : null,
    error
      ? {
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : error,
        }
      : null,
    metadata ? { metadata: redact(metadata) } : null,
  );

  // Log to console based on level
  switch (level) {
    case 'ERROR':
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(logEntry, null, 2));
      break;
    case 'WARN':
      // eslint-disable-next-line no-console
      console.warn(JSON.stringify(logEntry, null, 2));
      break;
    case 'DEBUG':
      // eslint-disable-next-line no-console
      console.debug(JSON.stringify(logEntry, null, 2));
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(logEntry, null, 2));
  }
}

/**
 * Logger class for consistent logging across the application
 */
export class Logger {
  private service: string;
  private correlationId?: string;
  private userId?: string;

  constructor(service: string, correlationId?: string, userId?: string) {
    this.service = service;
    this.correlationId = correlationId;
    this.userId = userId;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    metadata?: Record<string, unknown>,
  ): LogEntry {
    return {
      level,
      service: this.service,
      message,
      correlationId: this.correlationId,
      userId: this.userId,
      error,
      metadata,
    };
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    log(this.createEntry('DEBUG', message, undefined, metadata));
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    log(this.createEntry('INFO', message, undefined, metadata));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    log(this.createEntry('WARN', message, undefined, metadata));
  }

  error(
    message: string,
    error?: Error | unknown,
    metadata?: Record<string, unknown>,
  ): void {
    log(this.createEntry('ERROR', message, error, metadata));
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }
}

// Create default logger instance for quick access
export const defaultLogger = new Logger('app');

// Convenience methods using default logger
export const debug = (message: string, metadata?: Record<string, unknown>) =>
  defaultLogger.debug(message, metadata);
export const info = (message: string, metadata?: Record<string, unknown>) =>
  defaultLogger.info(message, metadata);
export const warn = (message: string, metadata?: Record<string, unknown>) =>
  defaultLogger.warn(message, metadata);
export const error = (
  message: string,
  error?: Error | unknown,
  metadata?: Record<string, unknown>,
) => defaultLogger.error(message, error, metadata);
