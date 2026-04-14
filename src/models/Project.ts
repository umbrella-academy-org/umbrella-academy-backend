export enum ProjectStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}


export interface ProjectEvidence {
  demoLink?: string;
  videoDemoLink?: string;
  designLink?: string;          // Figma, Adobe XD
  documentationLink?: string;
  fileDownloadLink?: string;
  externalLink?: string;        // Any external URL
}

export interface Project {
  id: string;
  studentId: string;
  title: string;
  description: string;
  category: string;             // e.g., "Robotics", "UI/UX", "Coding"
  toolsUsed: string[];
  studentRole: string;
  evidence: ProjectEvidence;
  attachments: {
    images: string[];           // URLs
    pdfs: string[];             // URLs
  };
  status: ProjectStatus;
  trainerFeedback?: string;
  approvedByTrainerId?: string;
  approvedAt?: Date;
  isPublic: boolean;            // Visible on public profile
  createdAt: Date;
}