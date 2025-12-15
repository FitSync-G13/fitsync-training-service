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

## Testing

### Test Framework

This service uses **Jest** as the testing framework with:
- Unit tests for controllers, utilities, and event publishers
- Mocked dependencies (database, Redis, external services)
- Code coverage reporting

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

```
tests/
├── setup.js                           # Jest setup (env vars, global config)
└── unit/
    ├── trainingController.test.js     # Controller CRUD tests
    ├── eventPublisher.test.js         # Redis event publishing tests
    └── httpClient.test.js             # User service HTTP client tests
```

### Test Suites

| Test File | Tests | What's Covered |
|-----------|-------|----------------|
| `trainingController.test.js` | 42 | Exercise CRUD, Workout Plan CRUD, Diet Plan CRUD, Program management, event publishing integration |
| `eventPublisher.test.js` | 12 | Redis event publishing, correlation IDs, program.assigned/completed/updated events |
| `httpClient.test.js` | 9 | User validation, batch fetching, error handling (404, timeout, service unavailable) |

### Test Details

#### Training Controller Tests (`trainingController.test.js`)
- **Exercises**: Create, list (with filters), get by ID, update, delete
- **Workout Plans**: Create, list (role-based filtering), get, update, delete
- **Diet Plans**: Create, list, get, update (including JSON fields)
- **Programs**: Create (with user validation), list (role-based), status updates, completion with event publishing

#### Event Publisher Tests (`eventPublisher.test.js`)
- **publishEvent**: Redis channel publishing, correlation ID handling, error resilience
- **publishProgramAssigned**: Event data structure, optional fields
- **publishProgramCompleted**: Completion date, adherence rate
- **publishProgramUpdated**: Change tracking

#### HTTP Client Tests (`httpClient.test.js`)
- **validateUser**: Success, 404 handling, service unavailable, timeout
- **fetchUsersBatch**: Success, graceful degradation on failure
- **getUserRoleInfo**: Success, null on failure

### Coverage Targets

| Module | Statements | Functions | Lines |
|--------|------------|-----------|-------|
| `trainingController.js` | 85%+ | 100% | 85%+ |
| `eventPublisher.js` | 100% | 100% | 100% |
| `httpClient.js` | 90%+ | 100% | 90%+ |

### Writing New Tests

1. Create test files in `tests/unit/` with `.test.js` suffix
2. Mock external dependencies at the top of the file
3. Use `beforeEach` to reset mocks between tests

Example:
```javascript
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

const db = require('../../src/config/database');
const controller = require('../../src/controllers/trainingController');

describe('My Feature', () => {
  let mockReq, mockRes;
  
  beforeEach(() => {
    mockReq = { body: {}, params: {}, user: { id: 'trainer-123', role: 'trainer' } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: '123' }] });
    await controller.myFunction(mockReq, mockRes);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: { id: '123' } });
  });
});
```

## Database Schema

Main tables:
- `exercises`  -  Exercise library
- `workout_programs`  -  Workout programs
- `program_assignments`  -  Client-program assignments
- `diet_plans`  -  Nutrition plans

## More Information

See [fitsync-docker-compose](https://github.com/FitSync-G13/fitsync-docker-compose) for complete documentation.

## License

MIT
