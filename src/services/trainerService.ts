import { Types } from 'mongoose';
import { BookingModel, BookingStatus } from '../models/Booking';
import { RoadmapModel } from '../models/Roadmap';
import { StudentModel, TrainerModel } from '../models/User';

function normalizeId(id: unknown): string {
  if (id == null || id === '') return '';
  if (typeof id === 'string') return id;
  if (id instanceof Types.ObjectId) return id.toString();
  if (typeof id === 'object' && id !== null && '_id' in id) {
    return normalizeId((id as { _id: unknown })._id);
  }
  return String(id);
}

function formatStudent(student: {
  _id: unknown;
  assignedTrainerId?: unknown;
  toObject: () => Record<string, unknown>;
}) {
  const plain = student.toObject();
  return {
    ...plain,
    id: normalizeId(student._id),
    _id: normalizeId(student._id),
    assignedTrainerId: plain.assignedTrainerId ? normalizeId(plain.assignedTrainerId) : null,
  };
}

export class TrainerService {
  static async getPendingTrainers() {
    return TrainerModel.find({ approvalStatus: 'pending' }).select('-password');
  }

  static async getAllTrainers() {
    return TrainerModel.find({}).select('-password');
  }

  static async getTrainerById(trainerId: string) {
    return TrainerModel.findById(trainerId).select('-password');
  }

  static async getApprovedTrainers() {
    return TrainerModel.find({
      approvalStatus: 'approved',
      isActive: true,
    }).select('-password');
  }

  static async getTrainerStudentIds(trainerId: string): Promise<string[]> {
    const [assignedStudents, roadmapStudentIds, bookingStudentIds] = await Promise.all([
      StudentModel.find({ assignedTrainerId: trainerId }).select('_id').lean(),
      RoadmapModel.distinct('student', { trainer: trainerId }),
      BookingModel.distinct('student', {
        trainer: trainerId,
        status: { $in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.COMPLETED] },
      }),
    ]);

    const ids = new Set<string>();
    assignedStudents.forEach((student) => ids.add(normalizeId(student._id)));
    roadmapStudentIds.forEach((studentId) => ids.add(normalizeId(studentId)));
    bookingStudentIds.forEach((studentId) => ids.add(normalizeId(studentId)));

    const studentIds = Array.from(ids).filter(Boolean);
    await this.syncTrainerAssignments(trainerId, studentIds);
    return studentIds;
  }

  static async syncTrainerAssignments(trainerId: string, studentIds: string[]) {
    if (studentIds.length === 0) return;

    await StudentModel.updateMany(
      {
        _id: { $in: studentIds },
        $or: [{ assignedTrainerId: null }, { assignedTrainerId: { $exists: false } }],
      },
      { assignedTrainerId: trainerId }
    );
  }

  static async getTrainerStudents(trainerId: string) {
    const studentIds = await this.getTrainerStudentIds(trainerId);
    if (studentIds.length === 0) {
      return [];
    }

    const students = await StudentModel.find({
      _id: { $in: studentIds },
    }).select('-password');

    return students.map(formatStudent);
  }
}
