// Mock dependencies before importing
jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn()
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-12345')
}));

const { getRedisClient } = require('../../src/config/redis');
const logger = require('../../src/config/logger');
const {
  publishEvent,
  publishProgramAssigned,
  publishProgramCompleted,
  publishProgramUpdated
} = require('../../src/utils/eventPublisher');

describe('Event Publisher', () => {
  let mockRedisClient;

  beforeEach(() => {
    mockRedisClient = {
      publish: jest.fn().mockResolvedValue(1)
    };
    getRedisClient.mockReturnValue(mockRedisClient);
    jest.clearAllMocks();
  });

  describe('publishEvent', () => {
    it('should publish event to Redis channel', async () => {
      const channel = 'test.event';
      const eventData = { id: '123', action: 'test' };

      const correlationId = await publishEvent(channel, eventData);

      expect(mockRedisClient.publish).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        channel,
        expect.stringContaining('"event":"test.event"')
      );
      expect(correlationId).toBe('mock-uuid-12345');
    });

    it('should use provided correlation ID', async () => {
      const channel = 'test.event';
      const eventData = { id: '123' };
      const providedCorrelationId = 'custom-correlation-id';

      const correlationId = await publishEvent(channel, eventData, providedCorrelationId);

      expect(correlationId).toBe(providedCorrelationId);
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        channel,
        expect.stringContaining('"correlation_id":"custom-correlation-id"')
      );
    });

    it('should include timestamp in event', async () => {
      const channel = 'test.event';
      const eventData = { id: '123' };

      await publishEvent(channel, eventData);

      const publishCall = mockRedisClient.publish.mock.calls[0];
      const publishedEvent = JSON.parse(publishCall[1]);

      expect(publishedEvent.timestamp).toBeDefined();
      expect(new Date(publishedEvent.timestamp)).toBeInstanceOf(Date);
    });

    it('should log successful event publishing', async () => {
      await publishEvent('test.event', { id: '123' });

      expect(logger.info).toHaveBeenCalledWith(
        'Event published: test.event',
        expect.objectContaining({
          correlation_id: 'mock-uuid-12345'
        })
      );
    });

    it('should handle Redis publish errors gracefully', async () => {
      mockRedisClient.publish.mockRejectedValueOnce(new Error('Redis connection failed'));

      // Should not throw
      const result = await publishEvent('test.event', { id: '123' });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to publish event to test.event:',
        expect.any(Error)
      );
      expect(result).toBeUndefined();
    });

    it('should include event data in published message', async () => {
      const eventData = { 
        program_id: 'prog-123',
        client_id: 'client-456'
      };

      await publishEvent('program.assigned', eventData);

      const publishCall = mockRedisClient.publish.mock.calls[0];
      const publishedEvent = JSON.parse(publishCall[1]);

      expect(publishedEvent.data).toEqual(eventData);
    });
  });

  describe('publishProgramAssigned', () => {
    it('should publish program.assigned event with correct data', async () => {
      const programData = {
        id: 'program-123',
        client_id: 'client-456',
        trainer_id: 'trainer-789',
        workout_plan_id: 'workout-111',
        diet_plan_id: 'diet-222',
        start_date: '2025-01-01',
        duration_weeks: 8
      };

      await publishProgramAssigned(programData, 'correlation-123');

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'program.assigned',
        expect.any(String)
      );

      const publishCall = mockRedisClient.publish.mock.calls[0];
      const publishedEvent = JSON.parse(publishCall[1]);

      expect(publishedEvent.data).toEqual({
        program_id: 'program-123',
        client_id: 'client-456',
        trainer_id: 'trainer-789',
        workout_plan_id: 'workout-111',
        diet_plan_id: 'diet-222',
        start_date: '2025-01-01',
        duration_weeks: 8
      });
    });

    it('should handle missing optional fields', async () => {
      const programData = {
        id: 'program-123',
        client_id: 'client-456',
        trainer_id: 'trainer-789',
        workout_plan_id: 'workout-111',
        diet_plan_id: null,
        start_date: '2025-01-01'
      };

      await publishProgramAssigned(programData);

      const publishCall = mockRedisClient.publish.mock.calls[0];
      const publishedEvent = JSON.parse(publishCall[1]);

      expect(publishedEvent.data.diet_plan_id).toBeNull();
      expect(publishedEvent.data.duration_weeks).toBeNull();
    });
  });

  describe('publishProgramCompleted', () => {
    it('should publish program.completed event with correct data', async () => {
      const programData = {
        id: 'program-123',
        client_id: 'client-456',
        trainer_id: 'trainer-789',
        adherence_rate: 95
      };

      await publishProgramCompleted(programData, 'correlation-456');

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'program.completed',
        expect.any(String)
      );

      const publishCall = mockRedisClient.publish.mock.calls[0];
      const publishedEvent = JSON.parse(publishCall[1]);

      expect(publishedEvent.data.program_id).toBe('program-123');
      expect(publishedEvent.data.client_id).toBe('client-456');
      expect(publishedEvent.data.trainer_id).toBe('trainer-789');
      expect(publishedEvent.data.adherence_rate).toBe(95);
      expect(publishedEvent.data.completion_date).toBeDefined();
    });

    it('should set adherence_rate to null if not provided', async () => {
      const programData = {
        id: 'program-123',
        client_id: 'client-456',
        trainer_id: 'trainer-789'
      };

      await publishProgramCompleted(programData);

      const publishCall = mockRedisClient.publish.mock.calls[0];
      const publishedEvent = JSON.parse(publishCall[1]);

      expect(publishedEvent.data.adherence_rate).toBeNull();
    });
  });

  describe('publishProgramUpdated', () => {
    it('should publish program.updated event with changes', async () => {
      const programData = {
        id: 'program-123',
        client_id: 'client-456',
        trainer_id: 'trainer-789'
      };
      const changes = ['status', 'notes'];

      await publishProgramUpdated(programData, changes, 'correlation-789');

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'program.updated',
        expect.any(String)
      );

      const publishCall = mockRedisClient.publish.mock.calls[0];
      const publishedEvent = JSON.parse(publishCall[1]);

      expect(publishedEvent.data).toEqual({
        program_id: 'program-123',
        client_id: 'client-456',
        trainer_id: 'trainer-789',
        changes: ['status', 'notes']
      });
    });

    it('should handle empty changes array', async () => {
      const programData = {
        id: 'program-123',
        client_id: 'client-456',
        trainer_id: 'trainer-789'
      };

      await publishProgramUpdated(programData, []);

      const publishCall = mockRedisClient.publish.mock.calls[0];
      const publishedEvent = JSON.parse(publishCall[1]);

      expect(publishedEvent.data.changes).toEqual([]);
    });
  });
});
