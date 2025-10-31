"use client";
import { useState, useEffect } from 'react';

export default function DeletionRequestStatus({ userId }) {
  const [deletionRequest, setDeletionRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchDeletionStatus();
    }
  }, [userId]);

  const fetchDeletionStatus = async () => {
    try {
      const response = await fetch('/api/account/deletion-request');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deletion status');
      }

      setDeletionRequest(data.hasPendingRequest ? data.deletionRequest : null);
    } catch (err) {
      console.error('Error fetching deletion status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!confirm('Are you sure you want to cancel your account deletion request?')) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch('/api/account/deletion-request', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel deletion request');
      }

      setDeletionRequest(null);
    } catch (err) {
      console.error('Error cancelling deletion request:', err);
      setError(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-3 rounded-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded-sm w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded-sm w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm">
        <p className="text-sm">Error loading deletion status: {error}</p>
      </div>
    );
  }

  if (!deletionRequest) {
    return null; // No pending deletion request
  }

  const { daysRemaining, scheduled_deletion_date, reason } = deletionRequest;
  const isUrgent = daysRemaining <= 7;
  const isVeryUrgent = daysRemaining <= 3;

  return (
    <div className={`p-4 rounded border ${
      isVeryUrgent 
        ? 'bg-red-50 border-red-200' 
        : isUrgent 
        ? 'bg-orange-50 border-orange-200' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-semibold mb-2 ${
            isVeryUrgent 
              ? 'text-red-800' 
              : isUrgent 
              ? 'text-orange-800' 
              : 'text-yellow-800'
          }`}>
            ⚠️ Account Deletion Scheduled
          </h3>
          
          <div className="space-y-2 text-sm">
            <p className={`${
              isVeryUrgent 
                ? 'text-red-700' 
                : isUrgent 
                ? 'text-orange-700' 
                : 'text-yellow-700'
            }`}>
              <strong>Days remaining:</strong> {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
            </p>
            
            <p className={`${
              isVeryUrgent 
                ? 'text-red-600' 
                : isUrgent 
                ? 'text-orange-600' 
                : 'text-yellow-600'
            }`}>
              <strong>Scheduled deletion:</strong> {new Date(scheduled_deletion_date).toLocaleDateString()}
            </p>
            
            {reason && (
              <p className={`${
                isVeryUrgent 
                  ? 'text-red-600' 
                  : isUrgent 
                  ? 'text-orange-600' 
                  : 'text-yellow-600'
              }`}>
                <strong>Reason:</strong> {reason}
              </p>
            )}
            
            <div className={`mt-3 p-2 rounded border ${
              isVeryUrgent 
                ? 'bg-red-100 border-red-300' 
                : isUrgent 
                ? 'bg-orange-100 border-orange-300' 
                : 'bg-yellow-100 border-yellow-300'
            }`}>
              <p className={`text-xs font-medium ${
                isVeryUrgent 
                  ? 'text-red-800' 
                  : isUrgent 
                  ? 'text-orange-800' 
                  : 'text-yellow-800'
              }`}>
                ⚠️ <strong>Important:</strong> After deletion, you will not be able to recreate an account with the same email address.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleCancelDeletion}
          disabled={isCancelling}
          className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
            isVeryUrgent 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : isUrgent 
              ? 'bg-orange-600 text-white hover:bg-orange-700' 
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          } disabled:opacity-50`}
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Deletion'}
        </button>
      </div>
      
      {isVeryUrgent && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-sm">
          <p className="text-xs text-red-800 font-medium">
            🚨 Your account will be deleted very soon! If you want to keep your account, cancel the deletion request now.
          </p>
        </div>
      )}
    </div>
  );
}

