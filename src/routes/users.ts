import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { UserController } from '../controllers/userController';

const router = Router();
// GET /users/me - get current logged in user
router.get('/me', authenticate, UserController.getSessionUser);

// PUT /users/profile - student onboarding
router.put('/profile', authenticate, requireRole('student'), UserController.updateProfile);
// PUT /users/profile - student onboarding
router.put('/profile', authenticate, requireRole('student'), UserController.updateProfile);

// GET /users - admin scoped
router.get('/', authenticate, requireRole('admin'), UserController.getUsers);

// GET /users/trainers - admin scoped
router.get('/trainers', authenticate, UserController.getTrainers);

// GET /users/students - admin scoped
router.get('/students', authenticate, UserController.getStudents);

// GET /users/:id - get user by id
router.get('/:id', authenticate, UserController.getUserById);

// PUT /users/:id/status
router.put('/:id/status', authenticate, requireRole('admin'), UserController.updateUserStatus);

// POST /users - create user
router.post('/', authenticate, requireRole('admin'), UserController.createUser);

// PUT /users/:id - update user profile
router.put('/:id', authenticate, requireRole('admin'), UserController.updateUser);

// DELETE /users/:id - admin only
router.delete('/:id', authenticate, requireRole('admin'), UserController.deleteUser);

export default router;
