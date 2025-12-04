"use client";

import { useState } from "react";
import { FaSmile } from "react-icons/fa";
import { FiSend } from "react-icons/fi";

export default function ChatInput({ chatId }) {
  const [message, setMessage] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // TODO: handle sending message
    console.log("Send message:", message, "to chat", chatId);
    setMessage("");
  };

  return (
    <form 
      onSubmit={handleSend} 
      className="flex items-center p-2 gap-2"
    >
      {/* Emoji icon */}
      <button type="button" className="text-gray-500 hover:text-gray-700">
        <FaSmile size={24} />
      </button>

      {/* Input */}
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message"
        className="flex-1 py-2 px-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Send icon */}
     <button
  type="submit"
  className="text-blue-600 hover:text-blue-800"
>
  <FiSend size={24} className="rotate-46 transform" />
</button>

    </form>
  );
}
