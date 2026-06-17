import { LeadStatus } from '../models/Dashboard';
import { SalesLeadModel } from '../models/SalesLead';
import { StudentModel } from '../models/User';
import { BookingModel, BookingStatus } from '../models/Booking';
import { PaymentModel, PaymentType } from '../models/Payment';

type StudentLike = {
  _id: unknown;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  createdAt?: Date;
  hasPaidOrientation?: boolean;
  hasActiveSubscription?: boolean;
};

export class SalesLeadService {
  static formatLead(lead: {
    _id: unknown;
    student: unknown;
    fullName: string;
    email: string;
    phone: string;
    signupDate: Date;
    status: LeadStatus;
    lastContactedAt: Date | null;
    notes: string;
    updatedAt?: Date;
  }) {
    return {
      _id: String(lead._id),
      studentId: String(lead.student),
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      signupDate: lead.signupDate,
      status: lead.status,
      lastContactedAt: lead.lastContactedAt,
      notes: lead.notes,
      updatedAt: lead.updatedAt,
    };
  }

  static async upsertFromStudent(student: StudentLike) {
    const studentId = String(student._id);
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';

    const existing = await SalesLeadModel.findOne({ student: studentId });
    if (existing) {
      existing.fullName = fullName;
      existing.email = student.email || existing.email;
      existing.phone = student.phoneNumber || existing.phone;
      await existing.save();
      return existing;
    }

    return SalesLeadModel.create({
      student: studentId,
      fullName,
      email: student.email || '',
      phone: student.phoneNumber || '',
      signupDate: student.createdAt || new Date(),
      status: LeadStatus.NEW,
      notes: '',
      lastContactedAt: null,
    });
  }

  static async backfillMissingLeads() {
    const students = await StudentModel.find({}).select(
      'firstName lastName email phoneNumber createdAt hasPaidOrientation hasActiveSubscription'
    );

    for (const student of students) {
      const studentId = String(student._id);
      const existing = await SalesLeadModel.findOne({ student: studentId });
      if (!existing) {
        await this.upsertFromStudent(student);
      }
      await this.syncLeadStatusForStudent(studentId);
    }
  }

  static async syncLeadStatusForStudent(studentId: string) {
    const lead = await SalesLeadModel.findOne({ student: studentId });
    if (!lead || lead.status === LeadStatus.LOST || lead.status === LeadStatus.CONTACTED) {
      return lead;
    }

    const subscriptionPayment = await PaymentModel.findOne({
      student: studentId,
      type: PaymentType.SUBSCRIPTION,
      status: 'success',
    });

    if (subscriptionPayment) {
      lead.status = LeadStatus.SUBSCRIBED;
      await lead.save();
      return lead;
    }

    const orientationBooking = await BookingModel.findOne({
      student: studentId,
      status: { $in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.COMPLETED] },
    });

    if (orientationBooking) {
      lead.status = LeadStatus.ORIENTATION_BOOKED;
      await lead.save();
    }

    return lead;
  }

  static async markOrientationBooked(studentId: string) {
    const lead = await SalesLeadModel.findOne({ student: studentId });
    if (!lead || lead.status === LeadStatus.LOST || lead.status === LeadStatus.SUBSCRIBED) {
      return;
    }
    lead.status = LeadStatus.ORIENTATION_BOOKED;
    await lead.save();
  }

  static async markSubscribed(studentId: string) {
    const lead = await SalesLeadModel.findOne({ student: studentId });
    if (!lead || lead.status === LeadStatus.LOST) {
      return;
    }
    lead.status = LeadStatus.SUBSCRIBED;
    await lead.save();
  }

  static async getLeads(filters?: { status?: LeadStatus; search?: string }) {
    await this.backfillMissingLeads();

    const query: Record<string, unknown> = {};
    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.search?.trim()) {
      const pattern = new RegExp(filters.search.trim(), 'i');
      query.$or = [{ fullName: pattern }, { email: pattern }, { phone: pattern }];
    }

    const leads = await SalesLeadModel.find(query).sort({ signupDate: -1 }).lean();
    return leads.map((lead) => this.formatLead(lead));
  }

  static async getDashboardData() {
    const leads = await this.getLeads();
    const totalFreeSignups = leads.filter((lead) => lead.status !== LeadStatus.SUBSCRIBED).length;
    const converted = leads.filter((lead) => lead.status === LeadStatus.SUBSCRIBED).length;
    const conversionRate = leads.length ? Math.round((converted / leads.length) * 100) : 0;

    return {
      totalFreeSignups,
      conversionRate,
      leads,
    };
  }

  static async updateLead(
    leadId: string,
    payload: { status?: LeadStatus; notes?: string; markContacted?: boolean }
  ) {
    const lead = await SalesLeadModel.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (payload.status) {
      lead.status = payload.status;
    }
    if (payload.notes !== undefined) {
      lead.notes = payload.notes;
    }
    if (payload.markContacted) {
      lead.lastContactedAt = new Date();
      if (lead.status === LeadStatus.NEW) {
        lead.status = LeadStatus.CONTACTED;
      }
    }

    await lead.save();
    return this.formatLead(lead);
  }
}
