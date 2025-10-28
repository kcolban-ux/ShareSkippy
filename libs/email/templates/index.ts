import fs from "fs";
import path from "path";
import config from "@/config";

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

// Template registry mapping email types to template files
const TEMPLATE_REGISTRY = {
  welcome: {
    html: "welcome-email.html",
    text: "welcome-email.txt",
    subject: (vars: TemplateVariables) =>
      `Welcome to ShareSkippy${vars.userName ? `, ${vars.userName}` : ""}!`,
  },
  nurture_day3: {
    html: "follow-up-3days.html",
    text: "follow-up-3days.txt",
    subject: () => `Ready to connect with your neighbors? 🐕`,
  },
  meeting_reminder: {
    html: "meeting-reminder-1day.html",
    text: "meeting-reminder-1day.txt",
    subject: (vars: TemplateVariables) =>
      `Reminder: ${vars.meetingTitle || "Your meeting"} is tomorrow ⏰`,
  },
  reengage: {
    html: "re-engagement.html",
    text: "re-engagement.txt",
    subject: () => `We miss you at ShareSkippy! 🐾`,
  },
  new_message: {
    html: "new-message-notification.html",
    text: "new-message-notification.txt",
    subject: (vars: TemplateVariables) =>
      `New message from ${vars.senderName || "someone"} on ShareSkippy 💬`,
  },
  meeting_scheduled: {
    html: "meeting-scheduled-confirmation.html",
    text: "meeting-scheduled-confirmation.txt",
    subject: (vars: TemplateVariables) =>
      `Meeting confirmed: ${
        vars.meetingTitle || "Dog Activity"
      } on ShareSkippy 🐕`,
  },
};

/**
 * Load and process email template with variables
 */
export async function loadEmailTemplate(
  emailType: keyof typeof TEMPLATE_REGISTRY,
  variables: TemplateVariables = {},
): Promise<EmailTemplate> {
  const templateConfig = TEMPLATE_REGISTRY[emailType];
  if (!templateConfig) {
    throw new Error(`Unknown email type: ${emailType}`);
  }

  // Try multiple paths for template loading (production compatibility)
  const possiblePaths = [
    path.join(process.cwd(), "libs", "email", "templates"),
    path.join(process.cwd(), "email-templates"),
    path.join(__dirname),
    path.join(process.cwd(), "libs", "email", "templates", "email-templates"),
  ];

  let html = "";
  let text = "";
  let templatesDir = "";

  // Try to find templates in different locations
  for (const templatePath of possiblePaths) {
    try {
      const htmlPath = path.join(templatePath, templateConfig.html);
      html = fs.readFileSync(htmlPath, "utf8");
      templatesDir = templatePath;
      break;
    } catch {
      // Continue to next path
    }
  }

  if (!html) {
    throw new Error(
      `Template not found: ${templateConfig.html}. Tried paths: ${
        possiblePaths.join(", ")
      }`,
    );
  }

  // Load text template
  try {
    const textPath = path.join(templatesDir, templateConfig.text);
    text = fs.readFileSync(textPath, "utf8");
  } catch {
    // If text template doesn't exist, generate from HTML
    text = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }

  // Add default variables
  const defaultVars = {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://shareskippy.com",
    supportEmail: config.resend.supportEmail,
    ...variables,
  };

  // Replace variables in templates
  const replaceVariables = (content: string, vars: TemplateVariables) => {
    return Object.entries(vars).reduce((acc, [key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      return acc.replace(regex, value || "");
    }, content);
  };

  html = replaceVariables(html, defaultVars);
  text = replaceVariables(text, defaultVars);

  // Generate subject
  const subject = templateConfig.subject(defaultVars);

  return {
    subject,
    html,
    text,
  };
}

/**
 * Get all available email types
 */
export function getAvailableEmailTypes(): string[] {
  return Object.keys(TEMPLATE_REGISTRY);
}

/**
 * Check if email type is valid
 */
export function isValidEmailType(
  emailType: string,
): emailType is keyof typeof TEMPLATE_REGISTRY {
  return emailType in TEMPLATE_REGISTRY;
}
