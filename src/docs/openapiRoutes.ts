export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface OpenApiRouteDefinition {
  method: HttpMethod;
  path: string;
  tag: string;
  summary: string;
  /** false = public; true = any authenticated user; string[] = required roles */
  security?: false | true | string[];
}

export const openApiRoutes: OpenApiRouteDefinition[] = [
  { method: 'get', path: '/health', tag: 'Health', summary: 'API health check', security: false },

  // Auth
  { method: 'post', path: '/api/auth/register/student', tag: 'Auth', summary: 'Register student', security: false },
  { method: 'post', path: '/api/auth/register/trainer', tag: 'Auth', summary: 'Register trainer', security: false },
  { method: 'post', path: '/api/auth/send-otp', tag: 'Auth', summary: 'Send OTP', security: false },
  { method: 'post', path: '/api/auth/verify-otp', tag: 'Auth', summary: 'Verify OTP', security: false },
  { method: 'post', path: '/api/auth/resend-otp', tag: 'Auth', summary: 'Resend OTP', security: false },
  { method: 'post', path: '/api/auth/forgot-password', tag: 'Auth', summary: 'Request password reset', security: false },
  { method: 'post', path: '/api/auth/reset-password', tag: 'Auth', summary: 'Reset password', security: true },
  { method: 'post', path: '/api/auth/login', tag: 'Auth', summary: 'Login', security: false },
  { method: 'get', path: '/api/auth/onboarding-checklist', tag: 'Auth', summary: 'Get onboarding checklist', security: true },

  // Users
  { method: 'get', path: '/api/users/me', tag: 'Users', summary: 'Get current user', security: true },
  { method: 'put', path: '/api/users/profile', tag: 'Users', summary: 'Update own profile', security: true },
  { method: 'get', path: '/api/users', tag: 'Users', summary: 'List users', security: ['admin'] },
  { method: 'get', path: '/api/users/trainers', tag: 'Users', summary: 'List trainers', security: true },
  { method: 'get', path: '/api/users/students', tag: 'Users', summary: 'List students', security: true },
  { method: 'get', path: '/api/users/{id}', tag: 'Users', summary: 'Get user by ID', security: true },
  { method: 'put', path: '/api/users/{id}/status', tag: 'Users', summary: 'Update user status', security: ['admin'] },
  { method: 'post', path: '/api/users', tag: 'Users', summary: 'Create user', security: ['admin'] },
  { method: 'put', path: '/api/users/{id}', tag: 'Users', summary: 'Update user', security: ['admin'] },
  { method: 'delete', path: '/api/users/{id}', tag: 'Users', summary: 'Delete user', security: ['admin'] },

  // Trainers
  { method: 'get', path: '/api/trainers/me', tag: 'Trainers', summary: 'Get session trainer', security: ['trainer'] },
  { method: 'get', path: '/api/trainers/me/students', tag: 'Trainers', summary: 'Get trainer students', security: ['trainer'] },
  { method: 'get', path: '/api/trainers/me/availability', tag: 'Trainers', summary: 'Get own availability', security: ['trainer'] },
  { method: 'put', path: '/api/trainers/me/availability', tag: 'Trainers', summary: 'Update own availability', security: ['trainer'] },
  { method: 'get', path: '/api/trainers/pending', tag: 'Trainers', summary: 'List pending trainers', security: ['admin'] },
  { method: 'get', path: '/api/trainers', tag: 'Trainers', summary: 'List all trainers', security: true },
  { method: 'get', path: '/api/trainers/approved', tag: 'Trainers', summary: 'List approved trainers (public)', security: false },
  { method: 'get', path: '/api/trainers/{id}/slots', tag: 'Trainers', summary: 'Get trainer availability slots', security: true },
  { method: 'get', path: '/api/trainers/{id}', tag: 'Trainers', summary: 'Get trainer by ID', security: true },

  // Roadmaps
  { method: 'get', path: '/api/roadmaps', tag: 'Roadmaps', summary: 'List roadmaps (role-scoped)', security: true },
  { method: 'post', path: '/api/roadmaps', tag: 'Roadmaps', summary: 'Create roadmap', security: ['trainer'] },
  { method: 'get', path: '/api/roadmaps/{id}', tag: 'Roadmaps', summary: 'Get roadmap by ID', security: true },
  { method: 'put', path: '/api/roadmaps/{id}', tag: 'Roadmaps', summary: 'Update roadmap', security: ['trainer'] },
  { method: 'delete', path: '/api/roadmaps/{id}', tag: 'Roadmaps', summary: 'Delete roadmap', security: ['trainer'] },
  { method: 'post', path: '/api/roadmaps/{id}/submit-for-approval', tag: 'Roadmaps', summary: 'Submit roadmap for approval', security: ['trainer'] },
  { method: 'post', path: '/api/roadmaps/{id}/approve', tag: 'Roadmaps', summary: 'Approve roadmap', security: ['admin'] },
  { method: 'post', path: '/api/roadmaps/{id}/reject', tag: 'Roadmaps', summary: 'Reject roadmap', security: ['admin'] },
  { method: 'post', path: '/api/roadmaps/{id}/activate', tag: 'Roadmaps', summary: 'Activate roadmap', security: ['admin'] },
  { method: 'post', path: '/api/roadmaps/{roadmapId}/milestones/{milestoneId}/complete', tag: 'Roadmaps', summary: 'Complete milestone', security: ['student'] },
  { method: 'post', path: '/api/roadmaps/{roadmapId}/milestones/{milestoneId}/approve', tag: 'Roadmaps', summary: 'Approve milestone', security: ['trainer'] },
  { method: 'post', path: '/api/roadmaps/{roadmapId}/milestones/{milestoneId}/reject', tag: 'Roadmaps', summary: 'Reject milestone', security: ['trainer'] },
  { method: 'patch', path: '/api/roadmaps/{roadmapId}/milestones/{milestoneId}/lock', tag: 'Roadmaps', summary: 'Set milestone lock state', security: ['trainer', 'admin'] },
  { method: 'post', path: '/api/roadmaps/{roadmapId}/activate-next-milestone', tag: 'Roadmaps', summary: 'Activate next milestone', security: ['student'] },

  // Projects
  { method: 'post', path: '/api/projects', tag: 'Projects', summary: 'Create project', security: ['student'] },
  { method: 'get', path: '/api/projects', tag: 'Projects', summary: 'List projects (role-scoped)', security: true },
  { method: 'get', path: '/api/projects/{id}', tag: 'Projects', summary: 'Get project by ID', security: true },
  { method: 'put', path: '/api/projects/{id}', tag: 'Projects', summary: 'Update project', security: ['student'] },
  { method: 'post', path: '/api/projects/{id}/submit', tag: 'Projects', summary: 'Submit project for approval', security: ['student'] },
  { method: 'post', path: '/api/projects/{id}/approve', tag: 'Projects', summary: 'Approve project', security: ['trainer'] },
  { method: 'post', path: '/api/projects/{id}/reject', tag: 'Projects', summary: 'Reject project', security: ['trainer'] },
  { method: 'delete', path: '/api/projects/{id}', tag: 'Projects', summary: 'Delete project', security: ['student'] },

  // Bookings
  { method: 'post', path: '/api/bookings', tag: 'Bookings', summary: 'Create booking', security: ['student'] },
  { method: 'get', path: '/api/bookings/student', tag: 'Bookings', summary: 'Get student bookings', security: ['student'] },
  { method: 'get', path: '/api/bookings/available-trainers', tag: 'Bookings', summary: 'List available trainers', security: ['student'] },
  { method: 'get', path: '/api/bookings/trainer', tag: 'Bookings', summary: 'Get trainer bookings', security: true },
  { method: 'get', path: '/api/bookings/{bookingId}', tag: 'Bookings', summary: 'Get booking by ID', security: true },
  { method: 'post', path: '/api/bookings/{bookingId}/cancel', tag: 'Bookings', summary: 'Cancel booking', security: true },
  { method: 'post', path: '/api/bookings/{bookingId}/approve', tag: 'Bookings', summary: 'Approve booking', security: ['trainer'] },
  { method: 'post', path: '/api/bookings/{bookingId}/reject', tag: 'Bookings', summary: 'Reject booking', security: ['trainer'] },
  { method: 'post', path: '/api/bookings/{bookingId}/complete', tag: 'Bookings', summary: 'Complete booking', security: ['trainer'] },
  { method: 'get', path: '/api/bookings/admin/all', tag: 'Bookings', summary: 'List all bookings', security: ['admin'] },

  // Payments
  { method: 'post', path: '/api/payments/orientation', tag: 'Payments', summary: 'Initiate orientation payment', security: ['student'] },
  { method: 'post', path: '/api/payments/subscription', tag: 'Payments', summary: 'Initiate subscription payment', security: ['student'] },
  { method: 'get', path: '/api/payments/status', tag: 'Payments', summary: 'Get payment status', security: ['student'] },
  { method: 'get', path: '/api/payments/subscription', tag: 'Payments', summary: 'Get subscription status', security: ['student'] },
  { method: 'get', path: '/api/payments/history', tag: 'Payments', summary: 'Get payment history', security: ['student'] },
  { method: 'post', path: '/api/payments/confirm', tag: 'Payments', summary: 'Payment webhook confirmation', security: false },

  // Chat
  { method: 'get', path: '/api/chat/contacts', tag: 'Chat', summary: 'List chat contacts', security: true },
  { method: 'get', path: '/api/chat/messages/{contactId}', tag: 'Chat', summary: 'Get message history', security: true },
  { method: 'post', path: '/api/chat/messages', tag: 'Chat', summary: 'Send message', security: true },
  { method: 'put', path: '/api/chat/messages/{contactId}/read', tag: 'Chat', summary: 'Mark messages as read', security: true },
  { method: 'get', path: '/api/chat/unread-count', tag: 'Chat', summary: 'Get unread message count', security: true },

  // Certificates
  { method: 'get', path: '/api/certificates', tag: 'Certificates', summary: 'List my certificates', security: true },
  { method: 'get', path: '/api/certificates/{id}/download', tag: 'Certificates', summary: 'Download certificate', security: true },
  { method: 'get', path: '/api/certificates/{id}/view', tag: 'Certificates', summary: 'View certificate', security: true },
  { method: 'get', path: '/api/certificates/{id}', tag: 'Certificates', summary: 'Get certificate by ID', security: true },

  // Notifications
  { method: 'get', path: '/api/notifications', tag: 'Notifications', summary: 'List notifications', security: true },
  { method: 'get', path: '/api/notifications/unread-count', tag: 'Notifications', summary: 'Get unread count', security: true },
  { method: 'patch', path: '/api/notifications/read-all', tag: 'Notifications', summary: 'Mark all as read', security: true },
  { method: 'patch', path: '/api/notifications/{id}/read', tag: 'Notifications', summary: 'Mark notification as read', security: true },

  // Files
  { method: 'post', path: '/api/files/upload', tag: 'Files', summary: 'Upload file', security: true },
  { method: 'post', path: '/api/files/message', tag: 'Files', summary: 'Upload chat attachment', security: true },
  { method: 'post', path: '/api/files/avatar', tag: 'Files', summary: 'Upload avatar', security: true },
  { method: 'get', path: '/api/files/messages/{filename}', tag: 'Files', summary: 'Serve chat attachment', security: true },
  { method: 'get', path: '/api/files/{filename}', tag: 'Files', summary: 'Serve file or avatar', security: false },

  // Guardian
  { method: 'post', path: '/api/guardian/invite/verify', tag: 'Guardian', summary: 'Verify invitation token', security: false },
  { method: 'post', path: '/api/guardian/set-password', tag: 'Guardian', summary: 'Set password and accept invite', security: false },
  { method: 'post', path: '/api/guardian/login', tag: 'Guardian', summary: 'Guardian login', security: false },
  { method: 'post', path: '/api/guardian/invite/decline', tag: 'Guardian', summary: 'Decline invitation', security: false },
  { method: 'get', path: '/api/guardian/students', tag: 'Guardian', summary: 'List linked students', security: ['guardian'] },
  { method: 'get', path: '/api/guardian/students/{studentId}/certificates', tag: 'Guardian', summary: 'Get student certificates', security: ['guardian'] },
  { method: 'get', path: '/api/guardian/students/{studentId}/projects', tag: 'Guardian', summary: 'Get student projects', security: ['guardian'] },
  { method: 'get', path: '/api/guardian/students/{studentId}', tag: 'Guardian', summary: 'Get student details', security: ['guardian'] },
  { method: 'post', path: '/api/guardian/invite/resend', tag: 'Guardian', summary: 'Resend guardian invitation', security: ['admin'] },

  // Admin
  { method: 'get', path: '/api/admin/analytics', tag: 'Admin', summary: 'Platform analytics', security: ['admin'] },
  { method: 'get', path: '/api/admin/certificates', tag: 'Admin', summary: 'List all certificates', security: ['admin'] },
  { method: 'get', path: '/api/admin/trainers/pending', tag: 'Admin', summary: 'Pending trainer applications', security: ['admin'] },
  { method: 'get', path: '/api/admin/trainers', tag: 'Admin', summary: 'All trainers with approval status', security: ['admin'] },
  { method: 'post', path: '/api/admin/trainers/{trainerId}/approve', tag: 'Admin', summary: 'Approve trainer', security: ['admin'] },
  { method: 'post', path: '/api/admin/trainers/{trainerId}/reject', tag: 'Admin', summary: 'Reject trainer', security: ['admin'] },
  { method: 'delete', path: '/api/admin/trainers/{trainerId}', tag: 'Admin', summary: 'Delete trainer', security: ['admin'] },
  { method: 'get', path: '/api/admin/payments', tag: 'Admin', summary: 'List all payments', security: ['admin'] },
  { method: 'post', path: '/api/admin/payments/{paymentId}/confirm', tag: 'Admin', summary: 'Confirm payment', security: ['admin'] },
  { method: 'get', path: '/api/admin/subscriptions', tag: 'Admin', summary: 'List all subscriptions', security: ['admin'] },

  // Promo codes (admin)
  { method: 'post', path: '/api/admin/promo-codes', tag: 'Promo Codes', summary: 'Create promo code', security: ['admin'] },
  { method: 'get', path: '/api/admin/promo-codes', tag: 'Promo Codes', summary: 'List promo codes', security: ['admin'] },
  { method: 'get', path: '/api/admin/promo-codes/stats', tag: 'Promo Codes', summary: 'Promo code statistics', security: ['admin'] },
  { method: 'get', path: '/api/admin/promo-codes/{code}', tag: 'Promo Codes', summary: 'Get promo code', security: ['admin'] },
  { method: 'put', path: '/api/admin/promo-codes/{code}', tag: 'Promo Codes', summary: 'Update promo code', security: ['admin'] },
  { method: 'delete', path: '/api/admin/promo-codes/{code}', tag: 'Promo Codes', summary: 'Delete promo code', security: ['admin'] },

  // Promo codes (public/student)
  { method: 'post', path: '/api/promo-codes/validate', tag: 'Promo Codes', summary: 'Validate promo code', security: ['student'] },
  { method: 'post', path: '/api/promo-codes/apply', tag: 'Promo Codes', summary: 'Apply promo code', security: ['student'] },

  // Public
  { method: 'get', path: '/api/public/students/{identifier}', tag: 'Public', summary: 'Public student profile', security: false },

  // Sales
  { method: 'get', path: '/api/sales/dashboard', tag: 'Sales', summary: 'Sales dashboard', security: ['sales_manager', 'admin'] },
  { method: 'get', path: '/api/sales/leads', tag: 'Sales', summary: 'List sales leads', security: ['sales_manager', 'admin'] },
  { method: 'patch', path: '/api/sales/leads/{id}', tag: 'Sales', summary: 'Update sales lead', security: ['sales_manager', 'admin'] },

  // System
  { method: 'get', path: '/api/system', tag: 'System', summary: 'System health metrics', security: ['admin'] },
  { method: 'get', path: '/api/system/database', tag: 'System', summary: 'Database statistics', security: ['admin'] },
  { method: 'get', path: '/api/system/memory', tag: 'System', summary: 'Memory usage', security: ['admin'] },

  // Stats
  { method: 'get', path: '/api/stats/me', tag: 'Stats', summary: 'Role-specific dashboard stats', security: true },
];
