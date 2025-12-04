export default function ChatMessages({ messages = [] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`p-2 rounded-md max-w-xs flex flex-col ${
            msg.from === "You"
              ? "bg-blue-500 text-white ml-auto"
              : "bg-gray-200 dark:bg-gray-700 text-black"
          }`}
        >
          <span>{msg.text}</span>
          {msg.time && (
            <span
              className={`text-xs mt-1 ${
                msg.from === "You" ? "self-end text-gray-200" : "self-start text-gray-500"
              }`}
            >
              {msg.time}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
