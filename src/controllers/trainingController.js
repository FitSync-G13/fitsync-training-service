const db = require('../config/database');
const logger = require('../config/logger');
const { validateUser } = require('../utils/httpClient');
const { publishProgramAssigned, publishProgramCompleted, publishProgramUpdated } = require('../utils/eventPublisher');

// EXERCISES

exports.createExercise = async (req, res) => {
  try {
    const { name, description, muscle_group, equipment_needed, difficulty_level, video_url, instructions } = req.body;
    const created_by = req.user.id;

    const result = await db.query(
      `INSERT INTO exercises (name, description, muscle_group, equipment_needed, difficulty_level, video_url, instructions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, muscle_group, equipment_needed, difficulty_level, video_url, instructions, created_by]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Create exercise error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create exercise' } });
  }
};

exports.listExercises = async (req, res) => {
  try {
    const { muscle_group, difficulty_level, search, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (muscle_group) {
      conditions.push(`$${paramCount} = ANY(muscle_group)`);
      values.push(muscle_group);
      paramCount++;
    }

    if (difficulty_level) {
      conditions.push(`difficulty_level = $${paramCount}`);
      values.push(difficulty_level);
      paramCount++;
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM exercises ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...values, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM exercises ${whereClause}`, values)
    ]);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_count: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('List exercises error:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch exercises' } });
  }
};

exports.getExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM exercises WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exercise not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Get exercise error:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch exercise' } });
  }
};

exports.updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (['name', 'description', 'muscle_group', 'equipment_needed', 'difficulty_level', 'video_url', 'instructions'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No valid fields to update' } });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE exercises SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exercise not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Update exercise error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update exercise' } });
  }
};

exports.deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM exercises WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exercise not found' } });
    }

    res.json({ success: true, message: 'Exercise deleted successfully' });
  } catch (error) {
    logger.error('Delete exercise error:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Failed to delete exercise' } });
  }
};

// WORKOUT PLANS

exports.createWorkout = async (req, res) => {
  try {
    const { name, description, duration_weeks, goal, difficulty_level, exercises, is_template } = req.body;
    const trainer_id = req.user.id;

    const result = await db.query(
      `INSERT INTO workout_plans (name, description, trainer_id, duration_weeks, goal, difficulty_level, exercises, is_template)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, trainer_id, duration_weeks, goal, difficulty_level, JSON.stringify(exercises), is_template]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Create workout error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create workout plan' } });
  }
};

exports.listWorkouts = async (req, res) => {
  try {
    const { goal, difficulty_level, is_template, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Trainers see only their own, admins see all
    if (req.user.role === 'trainer') {
      conditions.push(`trainer_id = $${paramCount}`);
      values.push(req.user.id);
      paramCount++;
    }

    if (goal) {
      conditions.push(`goal = $${paramCount}`);
      values.push(goal);
      paramCount++;
    }

    if (difficulty_level) {
      conditions.push(`difficulty_level = $${paramCount}`);
      values.push(difficulty_level);
      paramCount++;
    }

    if (is_template !== undefined) {
      conditions.push(`is_template = $${paramCount}`);
      values.push(is_template === 'true');
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM workout_plans ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...values, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM workout_plans ${whereClause}`, values)
    ]);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_count: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('List workouts error:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch workouts' } });
  }
};

exports.getWorkout = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM workout_plans WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workout plan not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Get workout error:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch workout' } });
  }
};

exports.updateWorkout = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (['name', 'description', 'duration_weeks', 'goal', 'difficulty_level', 'is_template'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      } else if (key === 'exercises') {
        fields.push(`exercises = $${paramCount}`);
        values.push(JSON.stringify(value));
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No valid fields to update' } });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE workout_plans SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workout plan not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Update workout error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update workout' } });
  }
};

exports.deleteWorkout = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM workout_plans WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workout plan not found' } });
    }

    res.json({ success: true, message: 'Workout plan deleted successfully' });
  } catch (error) {
    logger.error('Delete workout error:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Failed to delete workout' } });
  }
};

// DIET PLANS

exports.createDiet = async (req, res) => {
  try {
    const { name, calories_target, protein_g, carbs_g, fats_g, meals, restrictions } = req.body;
    const trainer_id = req.user.id;

    const result = await db.query(
      `INSERT INTO diet_plans (name, trainer_id, calories_target, protein_g, carbs_g, fats_g, meals, restrictions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, trainer_id, calories_target, protein_g, carbs_g, fats_g, JSON.stringify(meals), restrictions]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Create diet error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create diet plan' } });
  }
};

exports.listDiets = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (req.user.role === 'trainer') {
      conditions.push(`trainer_id = $${paramCount}`);
      values.push(req.user.id);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM diet_plans ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...values, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM diet_plans ${whereClause}`, values)
    ]);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_count: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('List diets error:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch diets' } });
  }
};

exports.getDiet = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM diet_plans WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Diet plan not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Get diet error:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch diet' } });
  }
};

exports.updateDiet = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (['name', 'calories_target', 'protein_g', 'carbs_g', 'fats_g', 'restrictions'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      } else if (key === 'meals') {
        fields.push(`meals = $${paramCount}`);
        values.push(JSON.stringify(value));
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No valid fields to update' } });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE diet_plans SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Diet plan not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Update diet error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update diet' } });
  }
};

// PROGRAMS

exports.createProgram = async (req, res) => {
  try {
    const { client_id, workout_plan_id, diet_plan_id, start_date, end_date, notes } = req.body;
    const trainer_id = req.user.id;
    const token = req.headers.authorization;

    // Validate client exists and is a client
    try {
      const clientData = await validateUser(client_id, token);
      if (clientData.data.role !== 'client') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ROLE', message: 'Target user must be a client' }
        });
      }
    } catch (error) {
      if (error.code === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: { code: 'CLIENT_NOT_FOUND', message: 'Client not found' }
        });
      }
      if (error.code === 'SERVICE_UNAVAILABLE') {
        return res.status(503).json({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Unable to validate client' }
        });
      }
      throw error;
    }

    // Create program
    const result = await db.query(
      `INSERT INTO programs (client_id, trainer_id, workout_plan_id, diet_plan_id, start_date, end_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING *`,
      [client_id, trainer_id, workout_plan_id, diet_plan_id, start_date, end_date, notes]
    );

    const program = result.rows[0];

    // Publish event for notification
    await publishProgramAssigned({
      id: program.id,
      client_id,
      trainer_id,
      workout_plan_id,
      diet_plan_id,
      start_date: program.start_date,
      duration_weeks: null
    }, req.correlationId);

    logger.info(`Program created: ${program.id} for client ${client_id} by trainer ${trainer_id}`);

    res.status(201).json({ success: true, data: program });
  } catch (error) {
    logger.error('Create program error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create program' } });
  }
};

exports.listPrograms = async (req, res) => {
  try {
    const { client_id, status, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (req.user.role === 'trainer') {
      conditions.push(`trainer_id = $${paramCount}`);
      values.push(req.user.id);
      paramCount++;
    } else if (req.user.role === 'client') {
      conditions.push(`client_id = $${paramCount}`);
      values.push(req.user.id);
      paramCount++;
    }

    if (client_id && req.user.role !== 'client') {
      conditions.push(`client_id = $${paramCount}`);
      values.push(client_id);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM programs ${whereClause} ORDER BY assigned_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...values, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM programs ${whereClause}`, values)
    ]);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_count: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('List programs error:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch programs' } });
  }
};

exports.getProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM programs WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Program not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Get program error:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch program' } });
  }
};

exports.updateProgramStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await db.query(
      'UPDATE programs SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Program not found' } });
    }

    const program = result.rows[0];

    // Publish event if program is completed
    if (status === 'completed') {
      await publishProgramCompleted({
        id: program.id,
        client_id: program.client_id,
        trainer_id: program.trainer_id,
        adherence_rate: null
      }, req.correlationId);
    } else {
      // Publish program updated event
      await publishProgramUpdated(program, ['status'], req.correlationId);
    }

    res.json({ success: true, data: program });
  } catch (error) {
    logger.error('Update program status error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update status' } });
  }
};

/**
 * Get active programs for a specific client
 */
exports.getActivePrograms = async (req, res) => {
  try {
    const { client_id } = req.params;

    const result = await db.query(
      `SELECT p.*, w.name as workout_name, d.name as diet_name
       FROM programs p
       LEFT JOIN workout_plans w ON p.workout_plan_id = w.id
       LEFT JOIN diet_plans d ON p.diet_plan_id = d.id
       WHERE p.client_id = $1 AND p.status = 'active'
       ORDER BY p.assigned_at DESC`,
      [client_id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Get active programs error:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch active programs' } });
  }
};

/**
 * Complete a program
 */
exports.completeProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { adherence_rate } = req.body;

    const result = await db.query(
      'UPDATE programs SET status = $1 WHERE id = $2 RETURNING *',
      ['completed', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Program not found' } });
    }

    const program = result.rows[0];

    // Publish completion event
    await publishProgramCompleted({
      id: program.id,
      client_id: program.client_id,
      trainer_id: program.trainer_id,
      adherence_rate: adherence_rate || null
    }, req.correlationId);

    logger.info(`Program completed: ${program.id}`);

    res.json({ success: true, data: program });
  } catch (error) {
    logger.error('Complete program error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to complete program' } });
  }
};
