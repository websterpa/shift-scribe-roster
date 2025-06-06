
import { createLogger } from './errorLogger';
import { initializeSampleData } from './sampleDataHelpers';

const logger = createLogger('AppInitialization');

/**
 * Initialize the application with necessary data and setup
 */
export async function initializeApplication() {
  logger.info('Starting application initialization...');
  
  try {
    // Initialize sample data for demonstration
    await initializeSampleData();
    
    logger.info('Application initialization completed successfully');
    return true;
  } catch (error) {
    logger.error(new Error('Application initialization failed'), { originalError: error });
    // Don't block the app startup, just log the error
    return false;
  }
}
