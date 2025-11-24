const db = require('../config/database');
const logger = require('../config/logger');

const migrations = [
  {
    name: 'create_exercises_table',
    up: `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS exercises (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        muscle_group VARCHAR[] NOT NULL,
        equipment_needed VARCHAR[],
        difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
        video_url TEXT,
        instructions TEXT,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_exercises_muscle_group ON exercises USING GIN(muscle_group);
      CREATE INDEX idx_exercises_difficulty ON exercises(difficulty_level);
      CREATE INDEX idx_exercises_created_by ON exercises(created_by);
    `
  },
  {
    name: 'create_workout_plans_table',
    up: `
      CREATE TABLE IF NOT EXISTS workout_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        trainer_id UUID NOT NULL,
        duration_weeks INTEGER,
        goal VARCHAR(50) CHECK (goal IN ('weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness')),
        difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
        exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_template BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_workout_plans_trainer ON workout_plans(trainer_id);
      CREATE INDEX idx_workout_plans_goal ON workout_plans(goal);
      CREATE INDEX idx_workout_plans_difficulty ON workout_plans(difficulty_level);
      CREATE INDEX idx_workout_plans_template ON workout_plans(is_template);
    `
  },
  {
    name: 'create_diet_plans_table',
    up: `
      CREATE TABLE IF NOT EXISTS diet_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        trainer_id UUID NOT NULL,
        calories_target INTEGER,
        protein_g INTEGER,
        carbs_g INTEGER,
        fats_g INTEGER,
        meals JSONB NOT NULL DEFAULT '[]'::jsonb,
        restrictions VARCHAR[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_diet_plans_trainer ON diet_plans(trainer_id);
    `
  },
  {
    name: 'create_programs_table',
    up: `
      CREATE TABLE IF NOT EXISTS programs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL,
        trainer_id UUID NOT NULL,
        workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
        diet_plan_id UUID REFERENCES diet_plans(id) ON DELETE SET NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(20) CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
        notes TEXT,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_programs_client ON programs(client_id);
      CREATE INDEX idx_programs_trainer ON programs(trainer_id);
      CREATE INDEX idx_programs_status ON programs(status);
      CREATE INDEX idx_programs_dates ON programs(start_date, end_date);
    `
  },
  {
    name: 'create_updated_at_trigger',
    up: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON workout_plans
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_diet_plans_updated_at BEFORE UPDATE ON diet_plans
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `
  }
];

async function runMigrations() {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { rows: executed } = await client.query('SELECT name FROM migrations');
    const executedNames = new Set(executed.map(row => row.name));

    for (const migration of migrations) {
      if (!executedNames.has(migration.name)) {
        logger.info(`Running migration: ${migration.name}`);
        await client.query(migration.up);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
        logger.info(`Completed migration: ${migration.name}`);
      }
    }

    await client.query('COMMIT');
    logger.info('All migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Database migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
