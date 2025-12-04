import { FiCalendar } from 'react-icons/fi';

export default function ScheduleEmptyState() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Your Schedule</h2>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCalendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Schedule UI Coming Soon
          </h3>
          <p className="text-gray-500 text-sm">
            The schedule interface would be here
          </p>
        </div>
      </div>
    </div>
  );
}
