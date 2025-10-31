'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function BulkEmailPage() {
  const [formData, setFormData] = useState({
    subject: '',
    htmlContent: '',
    textContent: '',
    batchSize: 50,
    delayMs: 1000
  });
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        toast.success(`Bulk email sent! ${data.results.successful} successful, ${data.results.failed} failed`);
      } else {
        toast.error(data.error || 'Failed to send bulk email');
      }
    } catch (error) {
      console.error('Error sending bulk email:', error);
      toast.error('Failed to send bulk email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xs p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Send Bulk Email</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject Line *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter email subject"
              />
            </div>

            <div>
              <label htmlFor="htmlContent" className="block text-sm font-medium text-gray-700 mb-2">
                HTML Content *
              </label>
              <textarea
                id="htmlContent"
                name="htmlContent"
                value={formData.htmlContent}
                onChange={handleChange}
                required
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter HTML content. Use {{first_name}}, {{last_name}}, {{email}} for personalization"
              />
            </div>

            <div>
              <label htmlFor="textContent" className="block text-sm font-medium text-gray-700 mb-2">
                Text Content (Optional)
              </label>
              <textarea
                id="textContent"
                name="textContent"
                value={formData.textContent}
                onChange={handleChange}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter plain text content (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="batchSize" className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Size
                </label>
                <input
                  type="number"
                  id="batchSize"
                  name="batchSize"
                  value={formData.batchSize}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Number of emails to send per batch (1-100)</p>
              </div>

              <div>
                <label htmlFor="delayMs" className="block text-sm font-medium text-gray-700 mb-2">
                  Delay Between Batches (ms)
                </label>
                <input
                  type="number"
                  id="delayMs"
                  name="delayMs"
                  value={formData.delayMs}
                  onChange={handleChange}
                  min="0"
                  max="10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Delay in milliseconds between batches</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Important Notes:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• This will send emails to ALL users in your database</li>
                <li>• Use personalization variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}</li>
                <li>• Test with a small batch first</li>
                <li>• Respect email rate limits to avoid being marked as spam</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending Emails...' : 'Send Bulk Email'}
            </button>
          </form>

          {results && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{results.totalUsers}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
              
              {results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                  <div className="max-h-40 overflow-y-auto">
                    {results.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 mb-1">
                        {error.email}: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
