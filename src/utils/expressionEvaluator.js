const logger = require('./logger');

/**
 * Safely evaluates conditions for automation nodes
 */
const expressionEvaluator = {
    /**
     * @param {object} condition { field, operator, value }
     * @param {object} context Data variables available for evaluation
     */
    evaluate: (condition, context) => {
        try {
            const { field, operator, value } = condition;

            // Resolve nested field if needed (e.g., 'content.text')
            const actualValue = field.split('.').reduce((obj, key) => obj?.[key], context);

            if (actualValue === undefined) return false;

            const targetValue = String(value).toLowerCase();
            const sourceValue = String(actualValue).toLowerCase();

            switch (operator) {
                case 'equals':
                    return sourceValue === targetValue;
                case 'contains':
                    return sourceValue.includes(targetValue);
                case 'starts_with':
                    return sourceValue.startsWith(targetValue);
                case 'exists':
                    return actualValue !== null && actualValue !== undefined;
                default:
                    logger.warn(`Unknown operator: ${operator}`);
                    return false;
            }
        } catch (e) {
            logger.error('Expression evaluation failed', { error: e.message, condition });
            return false;
        }
    },

    /**
     * Replaces {{variable}} placeholders in a string
     */
    injectVariables: (text, context) => {
        if (!text) return '';
        return text.replace(/\{\{(.*?)\}\}/g, (match, path) => {
            const val = path.trim().split('.').reduce((obj, key) => obj?.[key], context);
            return val !== undefined ? val : match;
        });
    }
};

module.exports = expressionEvaluator;
