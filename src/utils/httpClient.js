const axios = require('axios');
const logger = require('../config/logger');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

// Create axios instance for User Service
const userServiceClient = axios.create({
  baseURL: USER_SERVICE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Validate if a user exists and get basic info
 */
async function validateUser(userId, token) {
  try {
    const response = await userServiceClient.get(`/api/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      const err = new Error(`User ${userId} not found`);
      err.code = 'USER_NOT_FOUND';
      err.status = 404;
      throw err;
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      const err = new Error('User service unavailable');
      err.code = 'SERVICE_UNAVAILABLE';
      err.status = 503;
      throw err;
    }
    logger.error('Error validating user:', error);
    throw error;
  }
}

/**
 * Fetch multiple users in batch
 */
async function fetchUsersBatch(userIds, token) {
  try {
    const response = await userServiceClient.post('/api/users/batch', {
      user_ids: userIds
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Error fetching users batch:', error);
    // Return empty array on failure for graceful degradation
    return { success: false, data: [], count: 0 };
  }
}

/**
 * Get role-specific info for a user
 */
async function getUserRoleInfo(userId, token) {
  try {
    const response = await userServiceClient.get(`/api/users/${userId}/role-info`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Error fetching user role info:', error);
    return null;
  }
}

module.exports = {
  validateUser,
  fetchUsersBatch,
  getUserRoleInfo
};
