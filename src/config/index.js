require('dotenv').config();

module.exports = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Key for this backend
  apiKey: process.env.API_KEY,
  
  // Evolution API
  evolution: {
    url: process.env.EVOLUTION_API_URL || 'http://evolution_api:8080',
    apiKey: process.env.EVOLUTION_API_KEY,
  },
  
  // Webhook relay to AdminPanel
  webhook: {
    targetUrl: process.env.WEBHOOK_TARGET_URL,
    secret: process.env.WEBHOOK_SECRET,
  },
  
  // Health check settings
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL, 10) || 60000, // 1 minute
    postgres: {
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      user: process.env.POSTGRES_USER || 'evolution',
      password: process.env.POSTGRES_PASSWORD || 'evolution_password',
      database: process.env.POSTGRES_DB || 'evolution',
    },
    redis: {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    },
  },
};
