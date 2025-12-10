// Jest setup file for training-service
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';
process.env.USER_SERVICE_URL = 'http://localhost:3001';

// Global test timeout
jest.setTimeout(10000);
