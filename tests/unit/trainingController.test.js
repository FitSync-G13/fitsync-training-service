// Mock dependencies before importing
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../../src/utils/httpClient', () => ({
  validateUser: jest.fn()
}));

jest.mock('../../src/utils/eventPublisher', () => ({
  publishProgramAssigned: jest.fn().mockResolvedValue('correlation-id'),
  publishProgramCompleted: jest.fn().mockResolvedValue('correlation-id'),
  publishProgramUpdated: jest.fn().mockResolvedValue('correlation-id')
}));

const trainingController = require('../../src/controllers/trainingController');
const db = require('../../src/config/database');
const { validateUser } = require('../../src/utils/httpClient');
const { publishProgramAssigned, publishProgramCompleted, publishProgramUpdated } = require('../../src/utils/eventPublisher');

describe('Training Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'trainer-123', role: 'trainer' },
      headers: { authorization: 'Bearer mock-token' },
      correlationId: 'test-correlation-id'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  // ==================== EXERCISES ====================
  describe('Exercises', () => {
    describe('createExercise', () => {
      it('should create an exercise successfully', async () => {
        const exerciseData = {
          name: 'Bench Press',
          description: 'Chest exercise',
          muscle_group: ['chest', 'triceps'],
          equipment_needed: 'Barbell, Bench',
          difficulty_level: 'intermediate',
          video_url: 'https://example.com/video',
          instructions: 'Lie down, press up'
        };

        const mockExercise = {
          id: 'exercise-123',
          ...exerciseData,
          created_by: 'trainer-123',
          created_at: new Date().toISOString()
        };

        mockReq.body = exerciseData;
        db.query.mockResolvedValueOnce({ rows: [mockExercise] });

        await trainingController.createExercise(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockExercise
        });
      });

      it('should return 500 on database error', async () => {
        mockReq.body = { name: 'Test Exercise' };
        db.query.mockRejectedValueOnce(new Error('Database error'));

        await trainingController.createExercise(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: { code: 'CREATE_FAILED', message: 'Failed to create exercise' }
        });
      });
    });

    describe('listExercises', () => {
      it('should list exercises with pagination', async () => {
        const mockExercises = [
          { id: 'ex-1', name: 'Bench Press' },
          { id: 'ex-2', name: 'Squat' }
        ];

        mockReq.query = { page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: mockExercises })
          .mockResolvedValueOnce({ rows: [{ count: '2' }] });

        await trainingController.listExercises(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockExercises,
          pagination: {
            page: 1,
            limit: 20,
            total_count: 2,
            total_pages: 1
          }
        });
      });

      it('should filter by muscle_group', async () => {
        mockReq.query = { muscle_group: 'chest', page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        await trainingController.listExercises(mockReq, mockRes);

        expect(db.query).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true
        }));
      });

      it('should filter by difficulty_level', async () => {
        mockReq.query = { difficulty_level: 'beginner', page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        await trainingController.listExercises(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true
        }));
      });

      it('should search by name or description', async () => {
        mockReq.query = { search: 'bench', page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: [{ id: 'ex-1', name: 'Bench Press' }] })
          .mockResolvedValueOnce({ rows: [{ count: '1' }] });

        await trainingController.listExercises(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true,
          data: [{ id: 'ex-1', name: 'Bench Press' }]
        }));
      });
    });

    describe('getExercise', () => {
      it('should return an exercise by id', async () => {
        const mockExercise = { id: 'exercise-123', name: 'Bench Press' };
        mockReq.params = { id: 'exercise-123' };

        db.query.mockResolvedValueOnce({ rows: [mockExercise] });

        await trainingController.getExercise(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockExercise
        });
      });

      it('should return 404 if exercise not found', async () => {
        mockReq.params = { id: 'non-existent' };
        db.query.mockResolvedValueOnce({ rows: [] });

        await trainingController.getExercise(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Exercise not found' }
        });
      });
    });

    describe('updateExercise', () => {
      it('should update an exercise successfully', async () => {
        const updatedExercise = { id: 'exercise-123', name: 'Updated Bench Press' };
        mockReq.params = { id: 'exercise-123' };
        mockReq.body = { name: 'Updated Bench Press' };

        db.query.mockResolvedValueOnce({ rows: [updatedExercise] });

        await trainingController.updateExercise(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: updatedExercise
        });
      });

      it('should return 400 if no valid fields to update', async () => {
        mockReq.params = { id: 'exercise-123' };
        mockReq.body = { invalid_field: 'value' };

        await trainingController.updateExercise(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: { code: 'NO_UPDATES', message: 'No valid fields to update' }
        });
      });

      it('should return 404 if exercise not found', async () => {
        mockReq.params = { id: 'non-existent' };
        mockReq.body = { name: 'Updated Name' };

        db.query.mockResolvedValueOnce({ rows: [] });

        await trainingController.updateExercise(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('deleteExercise', () => {
      it('should delete an exercise successfully', async () => {
        mockReq.params = { id: 'exercise-123' };
        db.query.mockResolvedValueOnce({ rows: [{ id: 'exercise-123' }] });

        await trainingController.deleteExercise(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Exercise deleted successfully'
        });
      });

      it('should return 404 if exercise not found', async () => {
        mockReq.params = { id: 'non-existent' };
        db.query.mockResolvedValueOnce({ rows: [] });

        await trainingController.deleteExercise(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });
  });

  // ==================== WORKOUT PLANS ====================
  describe('Workout Plans', () => {
    describe('createWorkout', () => {
      it('should create a workout plan successfully', async () => {
        const workoutData = {
          name: 'Beginner Full Body',
          description: '4-week full body program',
          duration_weeks: 4,
          goal: 'strength',
          difficulty_level: 'beginner',
          exercises: [{ exercise_id: 'ex-1', sets: 3, reps: 10 }],
          is_template: true
        };

        const mockWorkout = {
          id: 'workout-123',
          ...workoutData,
          trainer_id: 'trainer-123',
          created_at: new Date().toISOString()
        };

        mockReq.body = workoutData;
        db.query.mockResolvedValueOnce({ rows: [mockWorkout] });

        await trainingController.createWorkout(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockWorkout
        });
      });
    });

    describe('listWorkouts', () => {
      it('should list workouts for trainer role', async () => {
        const mockWorkouts = [{ id: 'w-1', name: 'Workout 1' }];
        mockReq.query = { page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: mockWorkouts })
          .mockResolvedValueOnce({ rows: [{ count: '1' }] });

        await trainingController.listWorkouts(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true,
          data: mockWorkouts
        }));
      });

      it('should filter by goal', async () => {
        mockReq.query = { goal: 'weight_loss', page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        await trainingController.listWorkouts(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true
        }));
      });
    });

    describe('getWorkout', () => {
      it('should return a workout plan by id', async () => {
        const mockWorkout = { id: 'workout-123', name: 'Full Body' };
        mockReq.params = { id: 'workout-123' };

        db.query.mockResolvedValueOnce({ rows: [mockWorkout] });

        await trainingController.getWorkout(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockWorkout
        });
      });

      it('should return 404 if workout not found', async () => {
        mockReq.params = { id: 'non-existent' };
        db.query.mockResolvedValueOnce({ rows: [] });

        await trainingController.getWorkout(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('updateWorkout', () => {
      it('should update workout plan successfully', async () => {
        const updatedWorkout = { id: 'workout-123', name: 'Updated Workout' };
        mockReq.params = { id: 'workout-123' };
        mockReq.body = { name: 'Updated Workout' };

        db.query.mockResolvedValueOnce({ rows: [updatedWorkout] });

        await trainingController.updateWorkout(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: updatedWorkout
        });
      });

      it('should update exercises field (JSON)', async () => {
        const updatedWorkout = { id: 'workout-123', exercises: [{ id: 'ex-1' }] };
        mockReq.params = { id: 'workout-123' };
        mockReq.body = { exercises: [{ id: 'ex-1' }] };

        db.query.mockResolvedValueOnce({ rows: [updatedWorkout] });

        await trainingController.updateWorkout(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: updatedWorkout
        });
      });
    });

    describe('deleteWorkout', () => {
      it('should delete a workout plan successfully', async () => {
        mockReq.params = { id: 'workout-123' };
        db.query.mockResolvedValueOnce({ rows: [{ id: 'workout-123' }] });

        await trainingController.deleteWorkout(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Workout plan deleted successfully'
        });
      });
    });
  });

  // ==================== DIET PLANS ====================
  describe('Diet Plans', () => {
    describe('createDiet', () => {
      it('should create a diet plan successfully', async () => {
        const dietData = {
          name: 'High Protein Diet',
          calories_target: 2500,
          protein_g: 180,
          carbs_g: 250,
          fats_g: 80,
          meals: [{ name: 'Breakfast', calories: 600 }],
          restrictions: ['gluten-free']
        };

        const mockDiet = {
          id: 'diet-123',
          ...dietData,
          trainer_id: 'trainer-123',
          created_at: new Date().toISOString()
        };

        mockReq.body = dietData;
        db.query.mockResolvedValueOnce({ rows: [mockDiet] });

        await trainingController.createDiet(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockDiet
        });
      });
    });

    describe('listDiets', () => {
      it('should list diet plans with pagination', async () => {
        const mockDiets = [{ id: 'd-1', name: 'Diet 1' }];
        mockReq.query = { page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: mockDiets })
          .mockResolvedValueOnce({ rows: [{ count: '1' }] });

        await trainingController.listDiets(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true,
          data: mockDiets
        }));
      });
    });

    describe('getDiet', () => {
      it('should return a diet plan by id', async () => {
        const mockDiet = { id: 'diet-123', name: 'High Protein' };
        mockReq.params = { id: 'diet-123' };

        db.query.mockResolvedValueOnce({ rows: [mockDiet] });

        await trainingController.getDiet(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockDiet
        });
      });

      it('should return 404 if diet not found', async () => {
        mockReq.params = { id: 'non-existent' };
        db.query.mockResolvedValueOnce({ rows: [] });

        await trainingController.getDiet(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('updateDiet', () => {
      it('should update diet plan successfully', async () => {
        const updatedDiet = { id: 'diet-123', calories_target: 2800 };
        mockReq.params = { id: 'diet-123' };
        mockReq.body = { calories_target: 2800 };

        db.query.mockResolvedValueOnce({ rows: [updatedDiet] });

        await trainingController.updateDiet(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: updatedDiet
        });
      });

      it('should update meals field (JSON)', async () => {
        const updatedDiet = { id: 'diet-123', meals: [{ name: 'Lunch' }] };
        mockReq.params = { id: 'diet-123' };
        mockReq.body = { meals: [{ name: 'Lunch' }] };

        db.query.mockResolvedValueOnce({ rows: [updatedDiet] });

        await trainingController.updateDiet(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: updatedDiet
        });
      });
    });
  });

  // ==================== PROGRAMS ====================
  describe('Programs', () => {
    describe('createProgram', () => {
      it('should create a program successfully', async () => {
        const programData = {
          client_id: 'client-456',
          workout_plan_id: 'workout-123',
          diet_plan_id: 'diet-123',
          start_date: '2025-01-01',
          end_date: '2025-03-01',
          notes: 'Focus on consistency'
        };

        const mockProgram = {
          id: 'program-123',
          ...programData,
          trainer_id: 'trainer-123',
          status: 'active',
          assigned_at: new Date().toISOString()
        };

        mockReq.body = programData;

        validateUser.mockResolvedValueOnce({ data: { id: 'client-456', role: 'client' } });
        db.query.mockResolvedValueOnce({ rows: [mockProgram] });

        await trainingController.createProgram(mockReq, mockRes);

        expect(validateUser).toHaveBeenCalledWith('client-456', 'Bearer mock-token');
        expect(publishProgramAssigned).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockProgram
        });
      });

      it('should return 400 if target user is not a client', async () => {
        mockReq.body = { client_id: 'trainer-456' };

        validateUser.mockResolvedValueOnce({ data: { id: 'trainer-456', role: 'trainer' } });

        await trainingController.createProgram(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: { code: 'INVALID_ROLE', message: 'Target user must be a client' }
        });
      });

      it('should return 404 if client not found', async () => {
        mockReq.body = { client_id: 'non-existent' };

        const error = new Error('User not found');
        error.code = 'USER_NOT_FOUND';
        validateUser.mockRejectedValueOnce(error);

        await trainingController.createProgram(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: { code: 'CLIENT_NOT_FOUND', message: 'Client not found' }
        });
      });

      it('should return 503 if user service unavailable', async () => {
        mockReq.body = { client_id: 'client-456' };

        const error = new Error('Service unavailable');
        error.code = 'SERVICE_UNAVAILABLE';
        validateUser.mockRejectedValueOnce(error);

        await trainingController.createProgram(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(503);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Unable to validate client' }
        });
      });
    });

    describe('listPrograms', () => {
      it('should list programs for trainer', async () => {
        const mockPrograms = [{ id: 'p-1', client_id: 'client-1' }];
        mockReq.query = { page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: mockPrograms })
          .mockResolvedValueOnce({ rows: [{ count: '1' }] });

        await trainingController.listPrograms(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true,
          data: mockPrograms
        }));
      });

      it('should list programs for client role', async () => {
        mockReq.user = { id: 'client-123', role: 'client' };
        mockReq.query = { page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        await trainingController.listPrograms(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true
        }));
      });

      it('should filter by status', async () => {
        mockReq.query = { status: 'active', page: 1, limit: 20 };

        db.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ count: '0' }] });

        await trainingController.listPrograms(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          success: true
        }));
      });
    });

    describe('getProgram', () => {
      it('should return a program by id', async () => {
        const mockProgram = { id: 'program-123', client_id: 'client-456' };
        mockReq.params = { id: 'program-123' };

        db.query.mockResolvedValueOnce({ rows: [mockProgram] });

        await trainingController.getProgram(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockProgram
        });
      });

      it('should return 404 if program not found', async () => {
        mockReq.params = { id: 'non-existent' };
        db.query.mockResolvedValueOnce({ rows: [] });

        await trainingController.getProgram(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('updateProgramStatus', () => {
      it('should update program status successfully', async () => {
        const updatedProgram = { id: 'program-123', status: 'paused', client_id: 'c-1', trainer_id: 't-1' };
        mockReq.params = { id: 'program-123' };
        mockReq.body = { status: 'paused' };

        db.query.mockResolvedValueOnce({ rows: [updatedProgram] });

        await trainingController.updateProgramStatus(mockReq, mockRes);

        expect(publishProgramUpdated).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: updatedProgram
        });
      });

      it('should publish completed event when status is completed', async () => {
        const completedProgram = { id: 'program-123', status: 'completed', client_id: 'c-1', trainer_id: 't-1' };
        mockReq.params = { id: 'program-123' };
        mockReq.body = { status: 'completed' };

        db.query.mockResolvedValueOnce({ rows: [completedProgram] });

        await trainingController.updateProgramStatus(mockReq, mockRes);

        expect(publishProgramCompleted).toHaveBeenCalled();
        expect(publishProgramUpdated).not.toHaveBeenCalled();
      });

      it('should return 404 if program not found', async () => {
        mockReq.params = { id: 'non-existent' };
        mockReq.body = { status: 'completed' };

        db.query.mockResolvedValueOnce({ rows: [] });

        await trainingController.updateProgramStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('getActivePrograms', () => {
      it('should return active programs for a client', async () => {
        const mockPrograms = [
          { id: 'p-1', workout_name: 'Full Body', diet_name: 'High Protein' }
        ];
        mockReq.params = { client_id: 'client-123' };

        db.query.mockResolvedValueOnce({ rows: mockPrograms });

        await trainingController.getActivePrograms(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockPrograms
        });
      });
    });

    describe('completeProgram', () => {
      it('should complete a program successfully', async () => {
        const completedProgram = { id: 'program-123', status: 'completed', client_id: 'c-1', trainer_id: 't-1' };
        mockReq.params = { id: 'program-123' };
        mockReq.body = { adherence_rate: 85 };

        db.query.mockResolvedValueOnce({ rows: [completedProgram] });

        await trainingController.completeProgram(mockReq, mockRes);

        expect(publishProgramCompleted).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'program-123',
            adherence_rate: 85
          }),
          'test-correlation-id'
        );
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: completedProgram
        });
      });

      it('should return 404 if program not found', async () => {
        mockReq.params = { id: 'non-existent' };
        mockReq.body = {};

        db.query.mockResolvedValueOnce({ rows: [] });

        await trainingController.completeProgram(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });
  });
});
