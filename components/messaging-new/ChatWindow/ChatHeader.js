"use client";

export default function ChatHeader({ user, onBack }) {
  return (
    <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-blue-600 dark:text-blue-400 font-semibold mr-3"
      >
        &larr;
      </button>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-300 mr-3"></div>

      {/* User Name */}
      <h2 className="font-semibold text-lg">{user}</h2>

      {/* Desktop-only right-aligned button */}
      <div className="ml-auto hidden md:block">
        <button className="px-3 py-1 bg-blue-600 text-white rounded-lg cursor-pointer">
          Schedule meeting
        </button>
      </div>
    </div>
  );
}
