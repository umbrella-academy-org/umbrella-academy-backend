# Dreamize Africa Backend Architecture

## Overview
This backend follows a **Controller-Service-Route** pattern to improve maintainability, reusability, and separation of concerns.

## Directory Structure

```
src/
|-- controllers/          # Request handling and response formatting
|   |-- statsController.ts
|   |-- adminController.ts
|   |-- roadmapController.ts
|-- services/             # Business logic and data operations
|   |-- statsService.ts
|   |-- roadmapService.ts
|-- routes/               # Route definitions and middleware
|   |-- stats.ts
|   |-- admin.ts
|   |-- roadmaps.ts
|-- models/              # Mongoose schemas and interfaces
|   |-- User.ts
|   |-- Roadmap.ts
|   |-- Payment.ts
|   |-- Certificate.ts
|   |-- Project.ts
```

## Architecture Layers

### 1. Routes Layer (`src/routes/`)
- **Purpose**: Define API endpoints and apply middleware
- **Responsibilities**: 
  - Route definitions (`router.get()`, `router.post()`, etc.)
  - Middleware application (`authenticate`, `requireRole`)
  - Controller method binding
- **Example**: 
  ```typescript
  router.get('/me', authenticate, StatsController.getUserStats);
  ```

### 2. Controllers Layer (`src/controllers/`)
- **Purpose**: Handle HTTP requests and responses
- **Responsibilities**:
  - Request validation and parsing
  - Calling appropriate service methods
  - Response formatting and status codes
  - Error handling and forwarding to middleware
- **Example**:
  ```typescript
  static async getUserStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;
      const stats = await StatsService.getStudentStats(userId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
  ```

### 3. Services Layer (`src/services/`)
- **Purpose**: Business logic and data operations
- **Responsibilities**:
  - Database operations
  - Data transformation and aggregation
  - Business rule implementation
  - Reusable utility functions
- **Example**:
  ```typescript
  static async getStudentStats(studentId: string) {
    const [activeRoadmaps, roadmapProgressAgg] = await Promise.all([
      RoadmapModel.countDocuments({ studentId, status: { $in: ['active', 'approved'] } }),
      RoadmapModel.aggregate([{ $match: { studentId } }])
    ]);
    return { activeRoadmaps, roadmapProgress };
  }
  ```

### 4. Models Layer (`src/models/`)
- **Purpose**: Data structure definitions and database schemas
- **Responsibilities**:
  - TypeScript interfaces
  - Mongoose schemas
  - Model exports
  - Data validation rules

## Benefits of This Architecture

### 1. **Separation of Concerns**
- Routes only handle routing and middleware
- Controllers only handle HTTP concerns
- Services only handle business logic
- Models only handle data structure

### 2. **Reusability**
- Service methods can be reused across multiple controllers
- Business logic is centralized and consistent
- Easy to share functionality between different endpoints

### 3. **Maintainability**
- Clear boundaries make code easier to understand
- Changes to business logic only require service updates
- HTTP-related changes only require controller updates
- Database changes only require model updates

### 4. **Testability**
- Each layer can be unit tested independently
- Services can be tested without HTTP context
- Controllers can be tested with mocked services
- Easy to implement dependency injection

### 5. **Scalability**
- Easy to add new features by following the same pattern
- Clear structure helps new developers understand the codebase
- Consistent patterns across all modules

## Request Flow Example

```
HTTP Request
    |
    v
[Route] - Apply middleware, route to controller
    |
    v
[Controller] - Parse request, call service
    |
    v
[Service] - Execute business logic, query database
    |
    v
[Model] - Define data structure, validate data
    |
    v
Database
    |
    v
[Model] - Return data as objects
    |
    v
[Service] - Transform/aggregate data
    |
    v
[Controller] - Format response
    |
    v
HTTP Response
```

## Adding New Features

When adding a new feature, follow this pattern:

1. **Define/Update Models** (if needed)
   ```typescript
   // src/models/NewFeature.ts
   export interface NewFeature extends Document {
     // fields...
   }
   ```

2. **Create Service Methods**
   ```typescript
   // src/services/newFeatureService.ts
   export class NewFeatureService {
     static async createFeature(data: any) {
       // business logic...
     }
   }
   ```

3. **Create Controller Methods**
   ```typescript
   // src/controllers/newFeatureController.ts
   export class NewFeatureController {
     static async createFeature(req: Request, res: Response) {
       try {
         const result = await NewFeatureService.createFeature(req.body);
         res.json({ success: true, data: result });
       } catch (err) {
         next(err);
       }
     }
   }
   ```

4. **Define Routes**
   ```typescript
   // src/routes/newFeature.ts
   router.post('/', authenticate, NewFeatureController.createFeature);
   ```

5. **Mount Routes in index.ts**
   ```typescript
   app.use('/api/new-feature', newFeatureRoutes);
   ```

This architecture ensures clean, maintainable, and scalable code that follows industry best practices.
