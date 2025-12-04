"use client";
import { useState } from "react";
import ChatListPage from "./ChatList";
import ChatWindow from "./ChatWindow";

export default function NewMessaging() {
  const [selectedChat, setSelectedChat] = useState(null);

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-[calc(100vh-76px)]">

      {/* Chat List */}
      <div
        className={`w-full lg:w-1/3 border-r 
          ${selectedChat ? "hidden lg:block" : "block"}
        `}
      >
        <ChatListPage onSelectChat={setSelectedChat} />
      </div>

      {/* Chat Window */}
      <div
        className={`flex-1 
          ${selectedChat ? "block" : "hidden lg:block"}
        `}
      >
        {selectedChat ? (
          <ChatWindow chat={selectedChat} onBack={() => setSelectedChat(null)} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Click a chat to start a conversation
          </div>
        )}
      </div>

    </div>
  );
}
