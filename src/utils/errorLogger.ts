
/**
 * A utility for consistent error logging and formatting
 * throughout the application.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  context?: string;
  data?: any;
  showStackTrace?: boolean;
}

/**
 * Log an error or message with consistent formatting and optional context data
 */
export function logError(
  error: Error | string,
  level: LogLevel = 'error',
  options: LogOptions = {}
) {
  const { context = '', data = {}, showStackTrace = level === 'error' } = options;
  
  const timestamp = new Date().toISOString();
  const contextPrefix = context ? `[${context}] ` : '';
  const message = typeof error === 'string' ? error : error.message;
  
  const logObject = {
    timestamp,
    type: level,
    message: `${contextPrefix}${message}`,
    ...data
  };
  
  // Log the formatted error
  switch (level) {
    case 'info':
      console.info(`🔵 ${logObject.message}`, data);
      break;
    case 'warn':
      console.warn(`🟡 ${logObject.message}`, data);
      break;
    case 'debug':
      console.debug(`🟤 ${logObject.message}`, data);
      break;
    case 'error':
    default:
      console.error(`🔴 ${logObject.message}`, data);
      
      // Log stack trace for error objects if requested
      if (showStackTrace && typeof error !== 'string' && error.stack) {
        console.error(error.stack);
      }
  }
  
  return logObject;
}

/**
 * Create a logger instance with predefined context
 */
export function createLogger(defaultContext: string) {
  return {
    info: (message: string, data?: any) => 
      logError(message, 'info', { context: defaultContext, data }),
    warn: (message: string, data?: any) => 
      logError(message, 'warn', { context: defaultContext, data }),
    error: (error: Error | string, data?: any) => 
      logError(error, 'error', { context: defaultContext, data }),
    debug: (message: string, data?: any) => 
      logError(message, 'debug', { context: defaultContext, data })
  };
}
