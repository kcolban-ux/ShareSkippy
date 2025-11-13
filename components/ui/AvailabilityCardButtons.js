import Link from "next/link";

export default function AvailabilityCardButtons({
  post,
  user,
  onMessage,
  viewDetailsColor = "blue",
  sendMessageColor = "green",
}) {
  const colorMap = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
  };

  const isOwner = user && user.id === post.owner_id;

  return (
    <div className="mt-auto pt-4 border-t border-gray-100">
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        {/* View Details Button */}
        <Link
          href={`/community/availability/${post.id}`}
          className={`${colorMap[viewDetailsColor]} text-white px-4 py-2.5 rounded-lg transition-colors text-sm sm:text-base text-center`}
        >
          View Details
        </Link>

        {/* Message Button or Placeholder */}
        {user && !isOwner ? (
          <button
            onClick={() => onMessage(post.owner, post)}
            className={`${colorMap[sendMessageColor]} text-white px-4 py-2.5 rounded-lg transition-colors text-sm sm:text-base`}
            aria-label={`Send message to ${post.owner?.first_name || "the owner"} about ${post.title}`}
          >
            Send Message
          </button>
        ) : (
          <div className="text-sm sm:text-base text-center px-4 py-2.5 rounded-lg text-gray-700 bg-gray-200 ">
            {!user ? "Not logged in" : "Your post"}
          </div>
        )}
      </div>
    </div>
  );
}
