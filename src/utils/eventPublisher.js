const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Publish an event to Redis
 */
async function publishEvent(channel, eventData, correlationId = null) {
  try {
    const redis = getRedisClient();

    const event = {
      event: channel,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId || uuidv4(),
      data: eventData
    };

    await redis.publish(channel, JSON.stringify(event));

    logger.info(`Event published: ${channel}`, {
      correlation_id: event.correlation_id,
      data: eventData
    });

    return event.correlation_id;
  } catch (error) {
    logger.error(`Failed to publish event to ${channel}:`, error);
    // Don't throw - event publishing failure shouldn't break the request
  }
}

/**
 * Publish program.assigned event
 */
async function publishProgramAssigned(programData, correlationId) {
  return await publishEvent('program.assigned', {
    program_id: programData.id,
    client_id: programData.client_id,
    trainer_id: programData.trainer_id,
    workout_plan_id: programData.workout_plan_id,
    diet_plan_id: programData.diet_plan_id,
    start_date: programData.start_date,
    duration_weeks: programData.duration_weeks || null
  }, correlationId);
}

/**
 * Publish program.completed event
 */
async function publishProgramCompleted(programData, correlationId) {
  return await publishEvent('program.completed', {
    program_id: programData.id,
    client_id: programData.client_id,
    trainer_id: programData.trainer_id,
    completion_date: new Date().toISOString().split('T')[0],
    adherence_rate: programData.adherence_rate || null
  }, correlationId);
}

/**
 * Publish program.updated event
 */
async function publishProgramUpdated(programData, changes, correlationId) {
  return await publishEvent('program.updated', {
    program_id: programData.id,
    client_id: programData.client_id,
    trainer_id: programData.trainer_id,
    changes: changes
  }, correlationId);
}

module.exports = {
  publishEvent,
  publishProgramAssigned,
  publishProgramCompleted,
  publishProgramUpdated
};
