// Centralized email system exports
export {
  getUserLastActivity,
  recordUserActivity,
  scheduleEmail,
  sendEmail,
  shouldSendReengageEmail,
} from './sendEmail';
export {
  cancelUserScheduledEmails,
  getUserScheduledEmails,
  processScheduledEmails,
  scheduleMeetingReminder,
  scheduleNurtureEmail,
} from './scheduler';
export { getReengageCandidates, processReengageEmails, scheduleReengageEmails } from './reengage';
export { getAvailableEmailTypes, isValidEmailType, loadEmailTemplate } from './templates';

// Re-export types
export type { EmailEvent, SendEmailParams } from './sendEmail';
export type { ScheduledEmail } from './scheduler';
export type { ReengageResult } from './reengage';
export type { EmailPayload, EmailTemplate, TemplateVariables } from './templates';
