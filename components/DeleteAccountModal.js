"use client";
import { useState } from 'react';

export default function DeleteAccountModal({ isOpen, onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [reason, setReason] = useState('');

  const handleRequestDeletion = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/account/deletion-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim() || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit deletion request');
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error requesting account deletion:', err);
      setError(err.message || 'Failed to submit deletion request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h2 className="text-xl font-bold text-green-600 mb-4">Deletion Request Submitted</h2>
          
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm mb-4">
            <p className="font-semibold">Your account deletion request has been submitted.</p>
            <p className="text-sm mt-2">
              Your account will be permanently deleted in 30 days. You can cancel this request at any time before the deletion date.
            </p>
            <p className="text-sm mt-2 font-semibold">
              Remember: You will not be able to recreate an account with the same email address after deletion.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-sm hover:bg-green-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-red-600 mb-4">Request Account Deletion</h2>
        
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-sm mb-4">
          <p className="font-semibold">Important: 30-Day Waiting Period</p>
          <p className="text-sm mt-1">
            To prevent fraud and protect our community, account deletions require a 30-day waiting period. 
            You can cancel this request at any time before the deletion date.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-sm mb-4">
          <p className="font-semibold">⚠️ Account Recreation Prevention</p>
          <p className="text-sm mt-1">
            <strong>Deleting your account will prevent you from recreating an account with the same email address.</strong> 
            This policy helps maintain community trust and prevents users from avoiding negative reviews by creating new accounts.
          </p>
        </div>

        <p className="text-gray-700 mb-4">
          Are you sure you want to request account deletion? This will schedule your account for permanent deletion in 30 days.
        </p>

        <div className="mb-4">
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for deletion (optional)
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Help us improve by sharing why you're leaving..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">{reason.length}/500 characters</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-sm hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRequestDeletion}
            disabled={isSubmitting}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-sm hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Request Deletion'}
          </button>
        </div>
      </div>
    </div>
  );
}
