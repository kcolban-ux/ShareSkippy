'use client';
import { useState } from 'react';
 import Avatar from '@/app/chat-list/assets/profile-avatar.png'; 
import { FaRegClock, FaRegComment } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';

import ChatItem from './ChatItem';
import ScheduleEmptyState from './ScheduleEmptyState';

const chatsData = [
  {
    id: 1,
    name: "Jamie Mendez",
    avatar: Avatar,
    message: "Hi James nice to meet you!",
    time: "4:00 PM",
    unread: 2,
    messages: [
      { from: "Jamie", text: "Hi James nice to meet you!", time: "10:00 AM" },
      { from: "You", text: "Nice to meet you too!", time: "10:00 AM" }
    ]
  },
  {
    id: 2,
    name: "Alex Johnson",
    avatar: Avatar,
    message: "See you tomorrow!",
    time: "3:30 PM",
    unread: 0,
    messages: [
      { from: "Alex", text: "See you tomorrow!", time: "11:00 AM"},
      { from: "You", text: "Alright bro!", time: "11:00 AM" }
    ]
  },
  {
    id: 3,
    name: "Sarah Wilson",
    avatar: Avatar,
    message: "Thanks for your help!",
    time: "2:15 PM",
    unread: 1,
    messages: [
      { from: "Sarah", text: "Thanks for your help!", time: "11:00 AM" },
      { from: "You", text: "Anytime!",time: "11:00 AM" }
    ]
  },
  {
    id: 4,
    name: "Mike Chen",
    avatar: Avatar,
    message: "The meeting is scheduled",
    time: "1:45 PM",
    unread: 0,
    messages: [
      { from: "Mike", text: "The meeting is scheduled", time: "10:00 AM" },
      { from: "You", text: "Noted", time: "10:00 AM" }
    ]
  }
];

export default function ChatListPage({ onSelectChat }) {
  const [activeTab, setActiveTab] = useState('chats');

  return (
    <div className="flex h-screen bg-white md:w-full border-r">
      <section className="w-full flex-1 flex flex-col">

        {/* Tab Header with Slider */}
        <div className="border-b border-gray-200">
          <div className="relative">

            {/* Tab Buttons */}
            <div className="p-4 flex justify-between">
              <button
                onClick={() => setActiveTab('chats')}
                className="relative z-10 flex-1 cursor-pointer"
              >
                <span
                  className={`inline-flex items-center gap-2 font-semibold text-xl transition-colors ${
                    activeTab === 'chats' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  <FaRegComment />
                  Chats
                </span>
              </button>

              <button
                onClick={() => setActiveTab('schedule')}
                className="relative z-10 flex-1 text-center cursor-pointer"
              >
                <span
                  className={`inline-flex items-center gap-2 font-semibold text-xl transition-colors ${
                    activeTab === 'schedule' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  <FaRegClock />
                  Schedule
                </span>
              </button>
            </div>

            {/* Slider Track */}
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-200"></div>

            {/* Slider Thumb */}
            <div
              className={`absolute bottom-0 h-0.5 bg-black transition-all duration-300 ease-in-out ${
                activeTab === 'chats' ? 'left-0 w-1/2' : 'left-1/2 w-1/2'
              }`}
            ></div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">

          {/* Chats Content */}
          {activeTab === 'chats' && (
            <div className="h-full flex flex-col">

              {/* Search Bar */}
              <div className="p-4 md:p-6 border-b border-gray-200">
                <form className="w-full">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search messages"
                      className="w-full pl-10 pr-6 py-3 bg-[hsla(0,0%,85%,1)] rounded-4xl border-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-[hsla(0,0%,0%,0.43)]"
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <FiSearch className="text-[hsla(0,0%,0%,0.43)]" />
                    </div>
                  </div>
                </form>
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto">
  {chatsData.map((chat) => (
    <ChatItem 
      key={chat.id} 
      chat={chat} 
      onClick={() =>
         onSelectChat(chat)}
        />
      ))}
    </div>
            </div>
          )}

          {/* Schedule Content */}
          {activeTab === 'schedule' && <ScheduleEmptyState />}

        </div>
      </section>
    </div>
  );
}
