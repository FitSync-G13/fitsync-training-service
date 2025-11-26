const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../config/logger');

const seedData = async () => {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Sample exercises
    const exercises = [
      { name: 'Bench Press', muscle_group: ['chest', 'triceps'], equipment: ['barbell', 'bench'], difficulty: 'intermediate', description: 'Classic chest compound exercise' },
      { name: 'Squats', muscle_group: ['legs', 'glutes'], equipment: ['barbell', 'squat rack'], difficulty: 'intermediate', description: 'King of leg exercises' },
      { name: 'Deadlift', muscle_group: ['back', 'legs', 'core'], equipment: ['barbell'], difficulty: 'advanced', description: 'Full body compound movement' },
      { name: 'Pull-ups', muscle_group: ['back', 'biceps'], equipment: ['pull-up bar'], difficulty: 'intermediate', description: 'Upper body pulling exercise' },
      { name: 'Push-ups', muscle_group: ['chest', 'triceps', 'shoulders'], equipment: ['bodyweight'], difficulty: 'beginner', description: 'Classic bodyweight exercise' },
      { name: 'Dumbbell Rows', muscle_group: ['back'], equipment: ['dumbbells'], difficulty: 'beginner', description: 'Back isolation exercise' },
      { name: 'Shoulder Press', muscle_group: ['shoulders'], equipment: ['dumbbells'], difficulty: 'beginner', description: 'Shoulder development' },
      { name: 'Bicep Curls', muscle_group: ['biceps'], equipment: ['dumbbells'], difficulty: 'beginner', description: 'Arm isolation' },
      { name: 'Tricep Dips', muscle_group: ['triceps'], equipment: ['dip bars'], difficulty: 'intermediate', description: 'Tricep compound movement' },
      { name: 'Lunges', muscle_group: ['legs', 'glutes'], equipment: ['dumbbells'], difficulty: 'beginner', description: 'Unilateral leg exercise' },
      { name: 'Plank', muscle_group: ['core'], equipment: ['bodyweight'], difficulty: 'beginner', description: 'Core stability exercise' },
      { name: 'Russian Twists', muscle_group: ['core'], equipment: ['medicine ball'], difficulty: 'beginner', description: 'Oblique work' },
      { name: 'Leg Press', muscle_group: ['legs'], equipment: ['leg press machine'], difficulty: 'beginner', description: 'Leg compound on machine' },
      { name: 'Lat Pulldown', muscle_group: ['back'], equipment: ['cable machine'], difficulty: 'beginner', description: 'Back width development' },
      { name: 'Cable Flyes', muscle_group: ['chest'], equipment: ['cable machine'], difficulty: 'intermediate', description: 'Chest isolation' },
    ];

    // Use actual trainer ID from user service
    const trainerId = '4420f58b-f7b9-415c-afcb-60d23ae6c17f'; // trainer@fitsync.com
    const clientId = 'ae34ea3f-fea2-42bb-b7bc-8337e4f187f5'; // client@fitsync.com

    const exerciseIds = [];
    for (const ex of exercises) {
      const result = await client.query(
        `INSERT INTO exercises (name, description, muscle_group, equipment_needed, difficulty_level, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [ex.name, ex.description, ex.muscle_group, ex.equipment, ex.difficulty, trainerId]
      );
      exerciseIds.push(result.rows[0].id);
    }

    logger.info(`Seeded ${exercises.length} exercises`);

    // Sample workout plan
    const workoutPlan = {
      name: 'Beginner Full Body Workout',
      description: '3-day full body workout for beginners',
      trainer_id: trainerId,
      duration_weeks: 8,
      goal: 'general_fitness',
      difficulty_level: 'beginner',
      exercises: [
        { exercise_id: exerciseIds[4], day: 1, sets: 3, reps: 12, rest_seconds: 60, notes: 'Focus on form' },
        { exercise_id: exerciseIds[1], day: 1, sets: 3, reps: 10, rest_seconds: 90, notes: 'Go deep' },
        { exercise_id: exerciseIds[5], day: 1, sets: 3, reps: 12, rest_seconds: 60, notes: 'Each arm' },
        { exercise_id: exerciseIds[10], day: 1, sets: 3, reps: 60, duration_minutes: 1, rest_seconds: 60, notes: 'Hold steady' },
      ],
      is_template: true
    };

    const wpResult = await client.query(
      `INSERT INTO workout_plans (name, description, trainer_id, duration_weeks, goal, difficulty_level, exercises, is_template)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [workoutPlan.name, workoutPlan.description, workoutPlan.trainer_id, workoutPlan.duration_weeks,
       workoutPlan.goal, workoutPlan.difficulty_level, JSON.stringify(workoutPlan.exercises), workoutPlan.is_template]
    );

    logger.info('Seeded 1 workout plan');

    // Sample diet plan
    const dietPlan = {
      name: 'Balanced 2000 Calorie Diet',
      trainer_id: trainerId,
      calories_target: 2000,
      protein_g: 150,
      carbs_g: 200,
      fats_g: 67,
      meals: [
        {
          meal_type: 'breakfast',
          name: 'Protein Oatmeal',
          ingredients: ['oats', 'protein powder', 'banana', 'almond butter'],
          instructions: 'Mix oats with protein, top with banana and almond butter',
          calories: 450,
          macros: { protein: 30, carbs: 55, fats: 12 }
        },
        {
          meal_type: 'lunch',
          name: 'Chicken Rice Bowl',
          ingredients: ['chicken breast', 'brown rice', 'broccoli', 'olive oil'],
          instructions: 'Grill chicken, serve with rice and steamed broccoli',
          calories: 600,
          macros: { protein: 50, carbs: 65, fats: 15 }
        },
        {
          meal_type: 'snack',
          name: 'Greek Yogurt',
          ingredients: ['greek yogurt', 'berries', 'honey'],
          instructions: 'Mix yogurt with berries and drizzle honey',
          calories: 250,
          macros: { protein: 20, carbs: 30, fats: 5 }
        },
        {
          meal_type: 'dinner',
          name: 'Salmon with Sweet Potato',
          ingredients: ['salmon fillet', 'sweet potato', 'asparagus'],
          instructions: 'Bake salmon, roast sweet potato and asparagus',
          calories: 550,
          macros: { protein: 45, carbs: 45, fats: 20 }
        }
      ],
      restrictions: []
    };

    await client.query(
      `INSERT INTO diet_plans (name, trainer_id, calories_target, protein_g, carbs_g, fats_g, meals, restrictions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [dietPlan.name, dietPlan.trainer_id, dietPlan.calories_target, dietPlan.protein_g,
       dietPlan.carbs_g, dietPlan.fats_g, JSON.stringify(dietPlan.meals), dietPlan.restrictions]
    );

    logger.info('Seeded 1 diet plan');

    // Create a training program for the test client
    const programResult = await client.query(
      `INSERT INTO programs (client_id, trainer_id, workout_plan_id, diet_plan_id, start_date, end_date, status, notes)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + INTERVAL '8 weeks', 'active', $5)
       RETURNING id`,
      [clientId, trainerId, wpResult.rows[0].id, null, 'Goals: Build strength, Improve fitness, Lose weight']
    );

    logger.info('Seeded 1 training program for test client');

    await client.query('COMMIT');
    logger.info('Training service seed completed successfully');

    return {
      exerciseCount: exercises.length,
      workoutPlanCount: 1,
      dietPlanCount: 1,
      programCount: 1
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  seedData()
    .then((result) => {
      logger.info('Database seeded successfully', result);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData };
