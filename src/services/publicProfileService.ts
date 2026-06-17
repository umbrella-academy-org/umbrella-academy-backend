import { StudentModel } from '../models/User';
import { CertificateModel } from '../models/Certificate';
import { ProjectModel, ProjectStatus } from '../models/Project';
import { RoadmapModel } from '../models/Roadmap';
import { CertificateService } from './certificateService';

function slugifyName(firstName: string, lastName: string, studentId: string) {
  const base = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base ? `${base}-${studentId.slice(-6)}` : studentId.slice(-8);
}

export class PublicProfileService {
  static async ensurePublicSlug(studentId: string) {
    const student = await StudentModel.findById(studentId);
    if (!student) return null;

    if (!student.publicProfileSlug) {
      student.publicProfileSlug = slugifyName(
        student.firstName,
        student.lastName,
        student._id.toString()
      );
      await student.save();
    }

    return student.publicProfileSlug;
  }

  static async getPublicProfile(identifier: string) {
    const student =
      (await StudentModel.findOne({ publicProfileSlug: identifier }).select('-password')) ||
      (await StudentModel.findById(identifier).select('-password'));

    if (!student || student.role !== 'student') {
      return null;
    }

    if (!student.isPublicProfileEnabled) {
      return null;
    }

    await this.ensurePublicSlug(student._id.toString());

    const studentId = student._id.toString();

    const [certificates, projects, roadmaps] = await Promise.all([
      CertificateModel.find({ student: studentId }).sort({ completionDate: -1 }).lean(),
      ProjectModel.find({
        student: studentId,
        status: ProjectStatus.APPROVED,
        isPublic: true,
      })
        .sort({ approvedAt: -1, createdAt: -1 })
        .lean(),
      RoadmapModel.find({ student: studentId }).lean(),
    ]);

    const trainerFeedback: string[] = [];

    for (const roadmap of roadmaps) {
      for (const milestone of roadmap.milestones) {
        if (milestone.trainerFeedback?.trim()) {
          trainerFeedback.push(milestone.trainerFeedback.trim());
        }
      }
    }

    for (const project of projects) {
      if (project.trainerFeedback?.trim()) {
        trainerFeedback.push(project.trainerFeedback.trim());
      }
    }

    const uniqueFeedback = [...new Set(trainerFeedback)];

    return {
      studentId,
      slug: student.publicProfileSlug,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      bio: student.bio || '',
      avatarUrl: student.profilePicture || '',
      certificates: certificates.map((certificate) =>
        CertificateService.formatCertificate({
          ...certificate,
          student: String(certificate.student),
        })
      ),
      approvedProjects: projects.map((project) => ({
        _id: String(project._id),
        title: project.title,
        description: project.description,
        category: project.category,
        toolsUsed: project.toolsUsed,
        studentRole: project.studentRole,
        evidence: project.evidence,
        trainerFeedback: project.trainerFeedback || null,
        approvedAt: project.approvedAt,
        createdAt: project.createdAt,
      })),
      trainerFeedback: uniqueFeedback,
    };
  }
}
