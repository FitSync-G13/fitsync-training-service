const { createClient } = require('redis');
const logger = require('./logger');

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis connected successfully');
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

// Publish event to Redis
const publishEvent = async (channel, data) => {
  try {
    await redisClient.publish(channel, JSON.stringify(data));
    logger.info(`Event published to ${channel}`, data);
  } catch (error) {
    logger.error(`Failed to publish event to ${channel}:`, error);
  }
};

module.exports = { redisClient, connectRedis, publishEvent };
