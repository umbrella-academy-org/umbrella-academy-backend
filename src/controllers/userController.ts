import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';

export class UserController {
  // PUT /users/profile - student onboarding
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const updated = await UserService.updateProfile(userId, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof Error && err.message === 'User not found') {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // GET /users - admin scoped
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = req.query as { role?: string };
      const users = await UserService.getUsers(role);
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  // PUT /users/:id/status
  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body as { status: 'active' | 'inactive' | 'suspended' };
      const userId = req.params.id as string;
      
      const updated = await UserService.updateUserStatus(userId, status);
      res.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'User not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Invalid status value') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /users - create user
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.createUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('required') || err.message.includes('already exists')) {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // PUT /users/:id - update user profile
  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id as string;
      const updated = await UserService.updateUser(userId, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof Error && err.message === 'User not found') {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // DELETE /users/:id - admin only
  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id as string;
      await UserService.deleteUser(userId);
      res.json({ success: true, data: null });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'User not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Cannot delete an admin account') {
          return res.status(403).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // GET /users/:id - get user by id
  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id as string;
      const user = await UserService.findUserById(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
}
