// ==========================================
// 1. NOTIFICATION ENUMS & TYPES
// ==========================================

import { LeadStatus } from "./Dashboard";
import { PaymentType, Subscription, SubscriptionColor } from "./Payment";
import { ProjectStatus } from "./Project";
import { BookingStatus } from "./Roadmap";
import { UserRole } from "./User";

export enum NotificationPriority {
  HIGH = 'high',       // Red/Critical - Expiring subscriptions, payment failures
  MEDIUM = 'medium',   // Yellow/Warning - Upcoming deadlines, pending approvals
  LOW = 'low'          // Blue/Info - General updates, new features
}

export enum NotificationChannel {
  IN_APP = 'in_app',   // Bell icon in dashboard
  EMAIL = 'email',     // External email notification
  SMS = 'sms',         // Text message (optional, RWF cost consideration)
  PUSH = 'push'        // Browser push notification
}

export enum NotificationCategory {
  // Subscription Related
  SUBSCRIPTION = 'subscription',
  // Payment Related
  PAYMENT = 'payment',
  // Booking & Sessions
  BOOKING = 'booking',
  // Roadmap & Progress
  ROADMAP = 'roadmap',
  // Project & Portfolio
  PROJECT = 'project',
  // Certificate
  CERTIFICATE = 'certificate',
  // Guardian Specific
  GUARDIAN = 'guardian',
  // Sales/Admin Specific
  LEAD = 'lead',
  // System Announcements
  SYSTEM = 'system',
  // Chat Messages
  CHAT = 'chat'
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
  ACTIONED = 'actioned'  // When user clicked/took action
}

export enum NotificationActionType {
  PAY_NOW = 'pay_now',
  BOOK_SESSION = 'book_session',
  VIEW_ROADMAP = 'view_roadmap',
  APPROVE_PROJECT = 'approve_project',
  REVIEW_BOOKING = 'review_booking',
  SET_PASSWORD = 'set_password',
  RENEW_SUBSCRIPTION = 'renew_subscription',
  VIEW_CERTIFICATE = 'view_certificate',
  CONTACT_LEAD = 'contact_lead',
  VIEW_MESSAGE = 'view_message',
  NO_ACTION = 'no_action'
}

// ==========================================
// 2. NOTIFICATION TEMPLATES (System Generated)
// ==========================================

/**
 * Pre-defined notification templates for system events
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  titleTemplate: string;      // e.g., "Subscription expires in {{days}} days"
  bodyTemplate: string;       // e.g., "Your mentorship access will end on {{expiryDate}}"
  defaultPriority: NotificationPriority;
  defaultChannels: NotificationChannel[];
  actionType: NotificationActionType;
  actionUrl?: string;         // Dynamic URL with placeholders
}

// ==========================================
// 3. CORE NOTIFICATION INTERFACE
// ==========================================

/**
 * Main Notification Entity
 * This is what gets stored in the database and displayed in the UI
 */
export interface Notification {
  // Core Fields
  id: string;
  userId: string;              // Recipient user ID
  userRole: UserRole;          // Role at time of notification
  
  // Content
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  
  // Status Tracking
  status: NotificationStatus;
  isRead: boolean;
  readAt: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  
  // Action
  actionType: NotificationActionType;
  actionUrl: string | null;    // e.g., "/dashboard/subscription/renew"
  actionData: Record<string, any> | null; // Additional context for action
  
  // Metadata
  createdAt: Date;
  expiresAt: Date | null;      // Auto-delete after expiry
  sentVia: NotificationChannel[];
  deliveryStatus: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  
  // Related Entities (for grouping/context)
  relatedEntityId?: string;    // e.g., subscriptionId, bookingId, projectId
  relatedEntityType?: string;  // e.g., 'subscription', 'booking'
  
  // UI State (Frontend only)
  isExpanded?: boolean;        // For showing full details in list
}

// ==========================================
// 4. SPECIFIC NOTIFICATION TYPES (Discriminated Union)
// ==========================================

/**
 * Subscription Expiry Notification (Section 8)
 */
export interface SubscriptionExpiryNotification extends Notification {
  category: NotificationCategory.SUBSCRIPTION;
  actionType: NotificationActionType.RENEW_SUBSCRIPTION;
  metadata: {
    subscriptionId: string;
    daysRemaining: number;
    expiryDate: Date;
    colorCode: SubscriptionColor;
    amount: number; // 100,000 RWF
  };
}

/**
 * Payment Confirmation Notification
 */
export interface PaymentNotification extends Notification {
  category: NotificationCategory.PAYMENT;
  metadata: {
    paymentId: string;
    amount: number;
    paymentType: PaymentType;
    transactionRef: string;
    paidAt: Date;
    isSuccessful: boolean;
  };
}

/**
 * Booking Request Notification (Trainer)
 */
export interface BookingRequestNotification extends Notification {
  category: NotificationCategory.BOOKING;
  actionType: NotificationActionType.REVIEW_BOOKING;
  metadata: {
    bookingId: string;
    studentId: string;
    studentName: string;
    requestedTime: Date;
    learningGoals: string;
  };
}

/**
 * Booking Status Update Notification (Student)
 */
export interface BookingStatusNotification extends Notification {
  category: NotificationCategory.BOOKING;
  metadata: {
    bookingId: string;
    trainerId: string;
    trainerName: string;
    status: BookingStatus;
    rejectionReason?: string;
    meetingLink?: string;
    scheduledTime: Date;
  };
}

/**
 * Guardian Invitation Notification
 */
export interface GuardianInvitationNotification extends Notification {
  category: NotificationCategory.GUARDIAN;
  actionType: NotificationActionType.SET_PASSWORD;
  metadata: {
    guardianId: string;
    studentId: string;
    studentName: string;
    invitationToken: string;
    expiresIn: number; // hours
  };
}

/**
 * Guardian Progress Update Notification
 */
export interface GuardianProgressNotification extends Notification {
  category: NotificationCategory.GUARDIAN;
  metadata: {
    studentId: string;
    studentName: string;
    updateType: 'milestone_completed' | 'project_approved' | 'certificate_earned';
    entityId: string;
    entityName: string;
    completedAt: Date;
  };
}

/**
 * Milestone Completion Notification
 */
export interface MilestoneNotification extends Notification {
  category: NotificationCategory.ROADMAP;
  metadata: {
    roadmapId: string;
    milestoneId: string;
    milestoneName: string;
    trainerId: string;
    trainerName: string;
    completedAt: Date;
    nextMilestoneId?: string;
    nextMilestoneName?: string;
  };
}

/**
 * Certificate Generated Notification
 */
export interface CertificateNotification extends Notification {
  category: NotificationCategory.CERTIFICATE;
  actionType: NotificationActionType.VIEW_CERTIFICATE;
  metadata: {
    certificateId: string;
    certificateNumber: string;
    milestoneName: string;
    pdfUrl: string;
    canDownload: boolean;
  };
}

/**
 * Project Approval Notification
 */
export interface ProjectNotification extends Notification {
  category: NotificationCategory.PROJECT;
  metadata: {
    projectId: string;
    projectTitle: string;
    studentId: string;
    studentName: string;
    status: ProjectStatus;
    trainerFeedback?: string;
    isNowPublic: boolean;
  };
}

/**
 * Sales Lead Notification (Sales Manager)
 */
export interface SalesLeadNotification extends Notification {
  category: NotificationCategory.LEAD;
  actionType: NotificationActionType.CONTACT_LEAD;
  metadata: {
    leadId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    signupDate: Date;
    currentStatus: LeadStatus;
    daysSinceSignup: number;
  };
}

/**
 * Chat Message Notification
 */
export interface ChatNotification extends Notification {
  category: NotificationCategory.CHAT;
  actionType: NotificationActionType.VIEW_MESSAGE;
  metadata: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    messagePreview: string;
    unreadCount: number;
  };
}

/**
 * System Announcement (Admin to all users)
 */
export interface SystemAnnouncementNotification extends Notification {
  category: NotificationCategory.SYSTEM;
  priority: NotificationPriority.LOW;
  metadata: {
    announcementId: string;
    targetRoles?: UserRole[];  // If empty, all users
    canDismiss: boolean;
    displayDuration: number;   // Days to show
  };
}

// ==========================================
// 5. NOTIFICATION PREFERENCES
// ==========================================

/**
 * User Notification Preferences
 * Each user can customize how they receive notifications
 */
export interface NotificationPreferences {
  userId: string;
  
  // Channel Preferences per Category
  preferences: {
    [key in NotificationCategory]: {
      enabled: boolean;
      channels: NotificationChannel[];
      quietHours?: {
        enabled: boolean;
        start: string; // "22:00"
        end: string;   // "08:00"
        timezone: string;
      };
    };
  };
  
  // Global Settings
  digestEmailEnabled: boolean;
  digestEmailFrequency: 'daily' | 'weekly' | 'never';
  
  // Guardian Specific (Guardians can opt out of specific student updates)
  monitoredStudents?: {
    studentId: string;
    notifyOn: ('milestone' | 'project' | 'certificate' | 'subscription')[];
  }[];
}

// ==========================================
// 6. NOTIFICATION AGGREGATION & UI STATE
// ==========================================

/**
 * Notification Group (For UI Display)
 * Groups similar notifications together
 */
export interface NotificationGroup {
  id: string;
  category: NotificationCategory;
  title: string;
  count: number;
  unreadCount: number;
  latestNotification: Notification;
  priority: NotificationPriority;
  createdAt: Date;
}

/**
 * Notification Badge State (Frontend Store)
 */
export interface NotificationBadgeState {
  totalUnread: number;
  unreadByCategory: Record<NotificationCategory, number>;
  highPriorityUnread: number;
  lastChecked: Date;
}

/**
 * Notification Bell Component Props (React Example)
 */
export interface NotificationBellProps {
  notifications: Notification[];
  groups: NotificationGroup[];
  badgeState: NotificationBadgeState;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: (category?: NotificationCategory) => void;
  onAction: (notification: Notification) => void;
  onArchive: (notificationId: string) => void;
  onPreferenceClick: () => void;
}

// ==========================================
// 7. NOTIFICATION SERVICE INTERFACE
// ==========================================

/**
 * Notification Service (Backend/Frontend API)
 */
export interface INotificationService {
  // Core Methods
  sendNotification(
    userId: string, 
    templateId: string, 
    data: Record<string, any>
  ): Promise<Notification>;
  
  getUserNotifications(
    userId: string, 
    filter?: {
      category?: NotificationCategory[];
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]>;
  
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string, category?: NotificationCategory): Promise<void>;
  
  // Specific Notification Triggers (Called by other services)
  notifySubscriptionExpiry(userId: string, daysRemaining: number): Promise<void>;
  notifyGuardianInvitation(guardianEmail: string, studentId: string): Promise<void>;
  notifyBookingRequest(trainerId: string, bookingId: string): Promise<void>;
  notifyMilestoneCompleted(studentId: string, milestoneId: string): Promise<void>;
  notifyProjectApproved(studentId: string, projectId: string): Promise<void>;
  notifyNewLead(salesManagerId: string, leadId: string): Promise<void>;
  
  // Preferences
  getUserPreferences(userId: string): Promise<NotificationPreferences>;
  updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void>;
  
  // Cleanup
  cleanupExpiredNotifications(): Promise<void>;
}

// ==========================================
// 8. NOTIFICATION FACTORY FUNCTIONS
// ==========================================

/**
 * Factory functions to create specific notifications
 */
export class NotificationFactory {
  
  static createSubscriptionExpiryNotification(
    userId: string,
    subscription: Subscription
  ): SubscriptionExpiryNotification {
    const daysRemaining = subscription.daysRemaining;
    let priority = NotificationPriority.MEDIUM;
    let title = '';
    let body = '';
    
    if (daysRemaining === 7) {
      title = 'Subscription Renews in 7 Days';
      body = `Your mentorship subscription will renew in 7 days. Amount: 100,000 RWF`;
      priority = NotificationPriority.MEDIUM;
    } else if (daysRemaining === 2) {
      title = '⏰ Subscription Expires in 2 Days';
      body = `Urgent: Your mentorship access expires in 2 days. Renew now to avoid interruption.`;
      priority = NotificationPriority.HIGH;
    } else if (daysRemaining === 0) {
      title = '⚠️ Subscription Expired Today';
      body = `Your mentorship access has expired. Renew now to continue learning.`;
      priority = NotificationPriority.HIGH;
    }
    
    return {
      id: `sub_${Date.now()}`,
      userId,
      userRole: UserRole.STUDENT,
      title,
      body,
      category: NotificationCategory.SUBSCRIPTION,
      priority,
      status: NotificationStatus.UNREAD,
      isRead: false,
      readAt: null,
      isArchived: false,
      archivedAt: null,
      actionType: NotificationActionType.RENEW_SUBSCRIPTION,
      actionUrl: '/dashboard/subscription/renew',
      actionData: { subscriptionId: subscription.id },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      sentVia: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      deliveryStatus: {
        inApp: true,
        email: true,
        sms: false,
        push: true
      },
      relatedEntityId: subscription.id,
      relatedEntityType: 'subscription',
      metadata: {
        subscriptionId: subscription.id,
        daysRemaining,
        expiryDate: subscription.expiryDate,
        colorCode: subscription.colorCode,
        amount: 100000
      }
    };
  }
  
  static createGuardianInvitationNotification(
    guardianId: string,
    studentName: string,
    invitationToken: string
  ): GuardianInvitationNotification {
    return {
      id: `guardian_invite_${Date.now()}`,
      userId: guardianId,
      userRole: UserRole.GUARDIAN,
      title: `You've been invited as a Guardian`,
      body: `${studentName} has added you as their guardian on DREAMIZE-AFRICA. Set your password to start monitoring their progress.`,
      category: NotificationCategory.GUARDIAN,
      priority: NotificationPriority.HIGH,
      status: NotificationStatus.UNREAD,
      isRead: false,
      readAt: null,
      isArchived: false,
      archivedAt: null,
      actionType: NotificationActionType.SET_PASSWORD,
      actionUrl: `/auth/set-password?token=${invitationToken}`,
      actionData: { invitationToken },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      sentVia: [NotificationChannel.EMAIL],
      deliveryStatus: {
        inApp: false,
        email: true,
        sms: false,
        push: false
      },
      metadata: {
        guardianId,
        studentId: '',
        studentName,
        invitationToken,
        expiresIn: 168 // 7 days in hours
      }
    };
  }
}

// ==========================================
// 9. NOTIFICATION HOOKS (React Example)
// ==========================================

/**
 * Custom React Hook for Notifications
 */
export interface UseNotificationsReturn {
  notifications: Notification[];
  groups: NotificationGroup[];
  unreadCount: number;
  highPriorityCount: number;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (category?: NotificationCategory) => Promise<void>;
  archiveNotification: (notificationId: string) => Promise<void>;
  handleAction: (notification: Notification) => void;
  refetch: () => Promise<void>;
  
  // Filters
  filterByCategory: (category: NotificationCategory) => void;
  filterByStatus: (status: NotificationStatus) => void;
  clearFilters: () => void;
}

// ==========================================
// 10. WEBSOCKET NOTIFICATION EVENTS
// ==========================================

/**
 * Real-time notification events (WebSocket/Socket.io)
 */
export interface NotificationSocketEvents {
  // Server -> Client
  'notification:new': (notification: Notification) => void;
  'notification:updated': (notification: Notification) => void;
  'notification:deleted': (notificationId: string) => void;
  'badge:updated': (badgeState: NotificationBadgeState) => void;
  
  // Client -> Server
  'notification:mark-read': (notificationId: string) => void;
  'notification:mark-all-read': (category?: NotificationCategory) => void;
  'notification:archive': (notificationId: string) => void;
  'notification:action': (notificationId: string, actionData: any) => void;
}

