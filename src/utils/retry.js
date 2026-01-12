/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        factor = 2,
        retryOn = () => true, // Function to determine if should retry
    } = options;

    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on client errors (4xx) except 429 (rate limit)
            if (error.response) {
                const status = error.response.status;
                if (status >= 400 && status < 500 && status !== 429) {
                    throw error;
                }
            }

            // Check if we should retry
            if (!retryOn(error)) {
                throw error;
            }

            // Don't delay on last attempt
            if (attempt < maxRetries - 1) {
                const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

module.exports = { retryWithBackoff };
