const axios = require('axios');
const logger = require('./logger');

/**
 * Unified interface for AI LLM providers
 */
const aiProvider = {
    /**
     * Generate a response using the specified provider
     * @param {string} systemPrompt 
     * @param {string} userPrompt 
     * @param {object} config { provider, model, apiKey }
     */
    generateResponse: async (systemPrompt, userPrompt, config) => {
        const { provider, model, apiKey } = config;

        if (!apiKey) {
            throw new Error(`API Key required for ${provider}`);
        }

        try {
            if (provider === 'openai') {
                return await callOpenAI(systemPrompt, userPrompt, model, apiKey);
            } else if (provider === 'claude') {
                return await callClaude(systemPrompt, userPrompt, model, apiKey);
            } else {
                throw new Error(`Unsupported AI provider: ${provider}`);
            }
        } catch (error) {
            logger.error(`AI Provider error [${provider}]`, {
                error: error.response?.data || error.message
            });
            throw error;
        }
    }
};

async function callOpenAI(system, user, model, key) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: model || 'gpt-4o',
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
        ],
        temperature: 0.7
    }, {
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].message.content;
}

async function callClaude(system, user, model, key) {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: model || 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        system: system,
        messages: [
            { role: 'user', content: user }
        ]
    }, {
        headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        }
    });

    return response.data.content[0].text;
}

module.exports = aiProvider;
