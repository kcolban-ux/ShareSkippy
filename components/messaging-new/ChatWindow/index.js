"use client";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

export default function ChatWindow({ chat, onBack }) {
  // 👉 Desktop placeholder when no chat is selected
  if (!chat) {
    return (
      <div className="hidden md:flex flex-1 items-center justify-center text-center bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300">
        <div>
          <h2 className="text-xl font-semibold mb-2">No Conversation Selected</h2>
          <p className="text-sm">Click on a chat to open a conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Chat header */}
      <ChatHeader user={chat.name} onBack={onBack} />

      {/* Messages scrollable */}
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={chat.messages || []} />
      </div>

      {/* Chat input fixed at bottom */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <ChatInput chatId={chat.id} />
      </div>
    </div>
  );
}
