const { createClient } = require('redis');
const logger = require('./logger');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
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

const getRedisClient = () => redisClient;

module.exports = { redisClient, connectRedis, publishEvent, getRedisClient };
