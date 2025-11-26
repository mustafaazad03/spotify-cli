const Logger = require('./logger');
const logger = new Logger();

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
async function retryWithBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        shouldRetry = (error) => true
    } = options;

    let retries = 0;
    let delay = initialDelay;

    while (true) {
        try {
            return await fn();
        } catch (error) {
            if (retries >= maxRetries || !shouldRetry(error)) {
                throw error;
            }

            retries++;
            await logger.warn(`Retry attempt ${retries}/${maxRetries} after ${delay}ms. Error: ${error.message}`);

            await new Promise(resolve => setTimeout(resolve, delay));

            delay = Math.min(delay * 2, maxDelay);
        }
    }
}

module.exports = retryWithBackoff;
