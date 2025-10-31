"use client";
import { useState } from 'react';

export default function CommunitySupportSection({ 
  formData, 
  onFormDataChange,
  postType = 'dog_available'
}) {
  
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    onFormDataChange({
      ...formData,
      [name]: type === 'checkbox' ? e.target.checked : value
    });
  };

  return (
    <div className="space-y-6">
      {/* Community Support Section */}
      <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Community Support
        </h3>
        
        {postType === 'dog_available' ? (
          // Dog Availability - Need Support
          <>
            <p className="text-gray-600 mb-6">
              Let the community know if you need extra support. This helps create meaningful connections.
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="need_extra_help"
                  checked={formData.need_extra_help}
                  onChange={handleInputChange}
                  className="rounded-sm border-gray-300 text-purple-600 focus:ring-purple-500 bg-white"
                />
                <span className="font-medium text-gray-800">I could use some extra support</span>
              </div>

              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="help_reason_elderly"
                      checked={formData.help_reason_elderly}
                      onChange={handleInputChange}
                      className="rounded-sm border-gray-300 text-purple-600 focus:ring-purple-500 bg-white"
                    />
                    <span className="text-sm">Elderly</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="help_reason_sick"
                      checked={formData.help_reason_sick}
                      onChange={handleInputChange}
                      className="rounded-sm border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">Sick/Recovering</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="help_reason_low_income"
                      checked={formData.help_reason_low_income}
                      onChange={handleInputChange}
                      className="rounded-sm border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">Financial constraints</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="help_reason_disability"
                      checked={formData.help_reason_disability}
                      onChange={handleInputChange}
                      className="rounded-sm border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">Disability or mobility issues</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="help_reason_single_parent"
                      checked={formData.help_reason_single_parent}
                      onChange={handleInputChange}
                      className="rounded-sm border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">Single parent responsibilities</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="help_reason_other"
                      checked={formData.help_reason_other}
                      onChange={handleInputChange}
                      className="rounded-sm border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">Other/Private</span>
                  </label>
                </div>

                {formData.help_reason_other && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Please specify (Optional)
                    </label>
                    <input
                      type="text"
                      name="help_reason_other_text"
                      value={formData.help_reason_other_text}
                      onChange={handleInputChange}
                      placeholder="Please describe your situation..."
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-black focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      maxLength={100}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Context (Optional)
                  </label>
                  <textarea
                    name="help_context"
                    value={formData.help_context}
                    onChange={handleInputChange}
                    placeholder="Tell us more about your situation so we can better connect you with supportive community members..."
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                    maxLength={300}
                  />
                  <div className="text-xs text-gray-500 text-right mt-1">
                    {formData.help_context?.length || 0}/300 characters
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Pet Sitter Availability - Can Help Others
          <>
            <p className="text-gray-600 mb-6">
              Let the community know if you feel best supporting any specific type of person.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="can_help_everyone"
                    checked={formData.can_help_everyone}
                    onChange={handleInputChange}
                    className="rounded-sm border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Everyone</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="can_help_elderly"
                    checked={formData.can_help_elderly}
                    onChange={handleInputChange}
                    className="rounded-sm border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Elderly</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="can_help_sick"
                    checked={formData.can_help_sick}
                    onChange={handleInputChange}
                    className="rounded-sm border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Sick/Recovering</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="can_help_low_income"
                    checked={formData.can_help_low_income}
                    onChange={handleInputChange}
                    className="rounded-sm border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Financial constraints</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="can_help_disability"
                    checked={formData.can_help_disability}
                    onChange={handleInputChange}
                    className="rounded-sm border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Disability or mobility issues</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="can_help_single_parent"
                    checked={formData.can_help_single_parent}
                    onChange={handleInputChange}
                    className="rounded-sm border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Single parent responsibilities</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Context (Optional)
                </label>
                <textarea
                  name="helping_others_context"
                  value={formData.helping_others_context}
                  onChange={handleInputChange}
                  placeholder="Tell us more about how you can help others..."
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={300}
                />
                <div className="text-xs text-gray-500 text-right mt-1">
                  {formData.helping_others_context?.length || 0}/300 characters
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
