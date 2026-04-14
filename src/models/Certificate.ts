export interface Certificate {
  id: string;
  certificateNumber: string;    // Unique ID
  studentId: string;
  studentName: string;
  milestoneId: string;
  milestoneName: string;
  trainerId: string;
  trainerName: string;
  completionDate: Date;
  pdfUrl: string;              // Auto-generated link
}