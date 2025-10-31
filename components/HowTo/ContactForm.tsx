'use client';

import { useState, useTransition } from 'react';
import { sendContact } from '@/app/actions/sendContact';
import Callout from './Callout';

interface FormErrors {
  name?: string[];
  email?: string[];
  category?: string[];
  subject?: string[];
  message?: string[];
  _?: string[];
}

export default function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setErrors({});
    
    startTransition(async () => {
      const result = await sendContact(formData);
      
      if (result.ok) {
        setIsSubmitted(true);
        // Dispatch analytics event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('analytics', {
            detail: { event: 'contact_form_success' }
          }));
        }
      } else {
        setErrors(result.errors || {});
        // Dispatch analytics event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('analytics', {
            detail: { event: 'contact_form_error', errors: result.errors }
          }));
        }
      }
    });
  };

  if (isSubmitted) {
    return (
      <Callout tone="green" title="✅ Message Sent Successfully!">
        <p className="mb-4">
          Thank you for reaching out! We've received your message and will get back to you soon.
        </p>
        <p className="text-sm text-gray-600">
          If you have an urgent issue, you can also email us directly at{' '}
          <a 
            href="mailto:support@shareskippy.com" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            support@shareskippy.com
          </a>
        </p>
      </Callout>
    );
  }

  return (
    <Callout tone="purple" title="📧 Contact Support">
      <p className="mb-4">
        Need help or want to report an issue? We're here to help!
      </p>
      
      <form action={handleSubmit} className="space-y-4">
        {/* Honeypot field - hidden from users */}
        <input
          type="text"
          name="hp"
          style={{ display: 'none' }}
          tabIndex={-1}
          autoComplete="off"
        />
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              aria-invalid={errors.name ? 'true' : 'false'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white text-black"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name[0]}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Your Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              aria-invalid={errors.email ? 'true' : 'false'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white text-black"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email[0]}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            id="category"
            name="category"
            required
            aria-invalid={errors.category ? 'true' : 'false'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white text-black"
          >
            <option value="general">General Question</option>
            <option value="bug">Bug Report</option>
            <option value="safety">Safety Concern</option>
            <option value="feature">Feature Request</option>
            <option value="account">Account Issue</option>
            <option value="other">Other</option>
          </select>
          {errors.category && (
            <p className="text-sm text-red-600 mt-1">{errors.category[0]}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Subject *
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            required
            aria-invalid={errors.subject ? 'true' : 'false'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white text-black"
          />
          {errors.subject && (
            <p className="text-sm text-red-600 mt-1">{errors.subject[0]}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            aria-invalid={errors.message ? 'true' : 'false'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white text-black"
          />
          {errors.message && (
            <p className="text-sm text-red-600 mt-1">{errors.message[0]}</p>
          )}
        </div>
        
        {/* General errors */}
        {errors._ && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors._[0]}</p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={isPending}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </Callout>
  );
}
