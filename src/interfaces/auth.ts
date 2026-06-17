import { AgeRange, BaseUser } from '../models/User';

export interface StudentRegister extends Partial<BaseUser> {
  ageRange?: AgeRange;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhoneNumber?: string;
  guardianRelationship?: string;
}
