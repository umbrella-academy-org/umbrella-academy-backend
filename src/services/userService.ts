import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';

export class UserService {
  static async updateProfile(userId: string, profileData: any) {
    const { fieldId, trainerId, educationLevel, availability, learningPreferences } = profileData;

    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { fieldId, trainerId, educationLevel, availability, learningPreferences },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      throw new Error('User not found');
    }

    return updated;
  }

  static async getUsers(role?: string) {
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;

    const users = await UserModel.find(filter).select('-password');
    return users;
  }

  static async updateUserStatus(userId: string, status: 'active' | 'inactive' | 'suspended') {
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      throw new Error('Invalid status value');
    }

    const updated = await UserModel.findByIdAndUpdate(
      userId, 
      { status }, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      throw new Error('User not found');
    }

    return updated;
  }

  static async createUser(userData: any) {
    const { email, password, role, firstName, lastName } = userData;

    if (!email || !password || !role || !firstName || !lastName) {
      throw new Error('email, password, role, firstName, and lastName are required');
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error('A user with that email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ 
      email, 
      password: hashedPassword, 
      role, 
      firstName, 
      lastName, 
      status: 'active', 
      isVerified: true 
    });
    
    const userWithoutPassword = await UserModel.findById(user._id).select('-password');
    return userWithoutPassword;
  }

  static async updateUser(userId: string, updateData: any) {
    const { password: _password, ...updateFields } = updateData;
    
    const updated = await UserModel.findByIdAndUpdate(
      userId, 
      updateFields, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      throw new Error('User not found');
    }

    return updated;
  }

  static async deleteUser(userId: string) {
    const target = await UserModel.findById(userId);
    if (!target) {
      throw new Error('User not found');
    }
    
    if (target.role === 'admin') {
      throw new Error('Cannot delete an admin account');
    }
    
    await UserModel.findByIdAndDelete(userId);
    return null;
  }

  static async findUserById(userId: string) {
    return await UserModel.findById(userId).select('-password');
  }

  static async findUserByEmail(email: string) {
    return await UserModel.findOne({ email: email.toLowerCase() }).select('-password');
  }
}
