import Image from 'next/image';

export default function ChatItem({ chat, onClick }) {
  return (
    <div
      className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick= {onClick}
    >
      <div className="relative flex-shrink-0">
        <Image
          src={chat.avatar}
          alt={`${chat.name}'s profile`}
          width={48}
          height={48}
          className="w-12 h-12 rounded-full object-cover"
        />
      </div>

      <div className="flex-1 ml-4 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
          <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
            {chat.time}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">{chat.message}</p>
      </div>

      <div className="flex flex-col items-end ml-2">
        {chat.unread > 0 && (
          <div className="bg-blue-500 text-white text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center">
            {chat.unread}
          </div>
        )}
      </div>
    </div>
  );
}
