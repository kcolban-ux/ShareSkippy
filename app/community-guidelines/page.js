import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🏘️ Community Guidelines
          </h1>
          <p className="text-gray-600 text-lg">
            Building a safe and welcoming community for all dog lovers
          </p>
        </div>

        {/* Back Link */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Guidelines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🤝</span>
              Safety First
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Always meet in public places first</li>
              <li>• Bring your dog&apos;s vaccination records</li>
              <li>• Use a secure leash and collar</li>
              <li>• Supervise all interactions</li>
              <li>• Trust your instincts</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🐕</span>
              Dog Etiquette
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Keep dogs on leash unless in designated areas</li>
              <li>• Clean up after your dog</li>
              <li>• Respect other dogs&apos; space</li>
              <li>• Monitor your dog&apos;s behavior</li>
              <li>• Be mindful of noise levels</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">💬</span>
              Communication
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Be clear about expectations</li>
              <li>• Respond to messages promptly</li>
              <li>• Be honest about your experience</li>
              <li>• Respect others&apos; time</li>
              <li>• Report any concerns</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🏆</span>
              Building Trust
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Start with short meetups</li>
              <li>• Build relationships gradually</li>
              <li>• Share positive experiences</li>
              <li>• Give and receive feedback</li>
              <li>• Support new members</li>
            </ul>
          </div>
        </div>
        
        {/* Emergency Contacts Section */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🚨</span>
            Emergency Contacts
          </h3>
          <p className="text-gray-600 mb-4">
            In case of emergency, contact local authorities immediately. For non-emergency concerns, 
            use our support system to report issues.
          </p>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base">
              Report Issue
            </button>
            <Link
              href="/safety"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base text-center"
            >
              Safety Guide
            </Link>
          </div>
        </div>

        {/* Legal Disclosure */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">ℹ️</span>
            About ShareSkippy
          </h3>
          <p className="text-gray-600 mb-4">
            {LEGAL.getCurrentDisclosure()}
          </p>
        </div>

        {/* Additional Resources */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">📚</span>
            Additional Resources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link 
              href="/safety" 
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="mr-3">🛡️</span>
              <div>
                <div className="font-medium">Safety Guide</div>
                <div className="text-sm text-gray-500">Comprehensive safety tips</div>
              </div>
            </Link>
            <Link 
              href="/faq" 
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="mr-3">❓</span>
              <div>
                <div className="font-medium">FAQ</div>
                <div className="text-sm text-gray-500">Frequently asked questions</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
