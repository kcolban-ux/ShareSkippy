"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/ratelimit";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  category: z.enum(["general", "bug", "safety", "feature", "account", "other"]),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z
    .string()
    .min(5, "Message must be at least 5 characters")
    .max(2000, "Message must be less than 2000 characters"),
  hp: z.string().optional(), // Honeypot field
});

export async function sendContact(formData: FormData) {
  try {
    // Convert FormData to object
    const data = Object.fromEntries(formData) as Record<string, string>;

    // Validate with Zod
    const parsed = contactSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    // Honeypot check - if hp field is filled, it's likely a bot
    if (data.hp && data.hp.trim() !== "") {
      return { ok: true }; // Silently succeed for bots
    }

    // Rate limiting
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ??
      headersList.get("x-real-ip") ?? "unknown";

    const rateLimitOk = await rateLimit(ip, "contact:submit", 5, 600); // 5 submissions per 10 minutes
    if (!rateLimitOk) {
      return {
        ok: false,
        errors: {
          _: ["Too many requests. Please try again later."],
        },
      };
    }

    // Send email to support
    try {
      const { sendEmail } = await import("@/libs/resend.js");

      const emailSubject =
        `[${parsed.data.category.toUpperCase()}] ${parsed.data.subject}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #555; margin-top: 0;">Contact Details</h3>
            <p><strong>Name:</strong> ${parsed.data.name}</p>
            <p><strong>Email:</strong> ${parsed.data.email}</p>
            <p><strong>Category:</strong> ${parsed.data.category}</p>
            <p><strong>Subject:</strong> ${parsed.data.subject}</p>
          </div>
          
          <div style="background: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h3 style="color: #555; margin-top: 0;">Message</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${parsed.data.message}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; font-size: 14px; color: #666;">
            <p><strong>Reply directly to this email to respond to ${parsed.data.name}.</strong></p>
            <p>This message was sent from the ShareSkippy contact form.</p>
          </div>
        </div>
      `;

      const emailText = `
New Contact Form Submission

Contact Details:
- Name: ${parsed.data.name}
- Email: ${parsed.data.email}
- Category: ${parsed.data.category}
- Subject: ${parsed.data.subject}

Message:
${parsed.data.message}

---
Reply directly to this email to respond to ${parsed.data.name}.
This message was sent from the ShareSkippy contact form.
      `;

      await sendEmail({
        to: "support@shareskippy.com",
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        replyTo: parsed.data.email, // This allows you to reply directly to the user
      });

      // Also log for debugging
      console.log("Contact form submission sent:", {
        name: parsed.data.name,
        email: parsed.data.email,
        category: parsed.data.category,
        subject: parsed.data.subject,
        timestamp: new Date().toISOString(),
        ip: ip,
      });

      return { ok: true };
    } catch (emailError) {
      console.error("Error sending contact email:", emailError);
      return {
        ok: false,
        errors: {
          _: [
            "Failed to send message. Please try again or contact support directly at support@shareskippy.com.",
          ],
        },
      };
    }
  } catch (error) {
    console.error("Error processing contact form:", error);
    return {
      ok: false,
      errors: {
        _: ["An unexpected error occurred. Please try again."],
      },
    };
  }
}
