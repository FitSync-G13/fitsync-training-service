# FitSync Training Service

Workout programs, exercises, and training management service for the FitSync application.

## Features

- Exercise library management
- Workout program creation and management
- Program assignment to clients
- Exercise tracking and logging
- Diet plan management
- Muscle group and equipment categorization

## Running the Full FitSync Application

This service is part of the FitSync multi-repository application. To run the complete application:

### Quick Start

1. **Clone all repositories:**

```bash
mkdir fitsync-app && cd fitsync-app

git clone https://github.com/FitSync-G13/fitsync-docker-compose.git
git clone https://github.com/FitSync-G13/fitsync-api-gateway.git
git clone https://github.com/FitSync-G13/fitsync-user-service.git
git clone https://github.com/FitSync-G13/fitsync-training-service.git
git clone https://github.com/FitSync-G13/fitsync-schedule-service.git
git clone https://github.com/FitSync-G13/fitsync-progress-service.git
git clone https://github.com/FitSync-G13/fitsync-notification-service.git
git clone https://github.com/FitSync-G13/fitsync-frontend.git
```

2. **Run setup:**

```bash
cd fitsync-docker-compose
./setup.sh    # Linux/Mac
setup.bat     # Windows
```

3. **Access:** http://localhost:3000

## Development - Run This Service Locally

1. **Start infrastructure:**
```bash
cd ../fitsync-docker-compose
docker compose up -d trainingdb redis user-service
docker compose stop training-service
```

2. **Install dependencies:**
```bash
cd ../fitsync-training-service
npm install
```

3. **Configure environment (.env):**
```env
PORT=3002
DATABASE_URL=postgresql://fitsync:fitsync123@localhost:5433/trainingdb
REDIS_HOST=localhost
REDIS_PORT=6379
USER_SERVICE_URL=http://localhost:3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

4. **Run migrations and seeds:**
```bash
npm run migrate
npm run seed
```

5. **Start development server:**
```bash
npm run dev
```

Service runs on http://localhost:3002

## API Endpoints

- `GET /api/exercises` - Get exercise library
- `POST /api/exercises` - Create new exercise
- `GET /api/programs` - Get workout programs
- `POST /api/programs` - Create workout program
- `POST /api/programs/:id/assign` - Assign program to client
- `GET /api/diet-plans` - Get diet plans

## Database Schema

Main tables:
- `exercises` - Exercise library
- `workout_programs` - Workout programs
- `program_assignments` - Client-program assignments
- `diet_plans` - Nutrition plans

## More Information

See [fitsync-docker-compose](https://github.com/FitSync-G13/fitsync-docker-compose) for complete documentation.

## License

MIT
