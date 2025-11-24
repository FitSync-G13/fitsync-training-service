require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./config/logger');
const { connectRedis } = require('./config/redis');
const { runMigrations } = require('./database/migrate');
const { authenticate, authorize } = require('./middleware/auth');
const trainingController = require('./controllers/trainingController');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'training-service',
    timestamp: new Date().toISOString()
  });
});

// Exercise routes
app.post('/api/exercises', authenticate, authorize('admin', 'trainer'), trainingController.createExercise);
app.get('/api/exercises', authenticate, trainingController.listExercises);
app.get('/api/exercises/:id', authenticate, trainingController.getExercise);
app.put('/api/exercises/:id', authenticate, authorize('admin', 'trainer'), trainingController.updateExercise);
app.delete('/api/exercises/:id', authenticate, authorize('admin', 'trainer'), trainingController.deleteExercise);

// Workout plan routes
app.post('/api/workouts', authenticate, authorize('admin', 'trainer'), trainingController.createWorkout);
app.get('/api/workouts', authenticate, trainingController.listWorkouts);
app.get('/api/workouts/:id', authenticate, trainingController.getWorkout);
app.put('/api/workouts/:id', authenticate, authorize('admin', 'trainer'), trainingController.updateWorkout);
app.delete('/api/workouts/:id', authenticate, authorize('admin', 'trainer'), trainingController.deleteWorkout);

// Diet plan routes
app.post('/api/diets', authenticate, authorize('admin', 'trainer'), trainingController.createDiet);
app.get('/api/diets', authenticate, trainingController.listDiets);
app.get('/api/diets/:id', authenticate, trainingController.getDiet);
app.put('/api/diets/:id', authenticate, authorize('admin', 'trainer'), trainingController.updateDiet);

// Program routes
app.post('/api/programs', authenticate, authorize('admin', 'trainer'), trainingController.createProgram);
app.get('/api/programs', authenticate, trainingController.listPrograms);
app.get('/api/programs/:id', authenticate, trainingController.getProgram);
app.put('/api/programs/:id/status', authenticate, authorize('admin', 'trainer'), trainingController.updateProgramStatus);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found', timestamp: new Date().toISOString() }
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', timestamp: new Date().toISOString() }
  });
});

// Start server
async function startServer() {
  try {
    await connectRedis();
    logger.info('Redis connection established');

    await runMigrations();
    logger.info('Database migrations completed');

    app.listen(PORT, () => {
      logger.info(`Training Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

startServer();

module.exports = app;
