import Link from "next/link";
import Avatar from "./Avatar";

export default function NotificationUser({
  requester,
  createdAt,
  onAccept,
  onReject,
  isProcessing,
}) {
  if (!requester) {
    return null;
  }

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleString()
    : null;

  return (
    <div className="flex items-center gap-3 p-3 border-b border-gray-200 px-5">
      <Link href={`/profile/${requester.id}`} className="shrink-0">
        <Avatar url={requester.avatar} />
      </Link>
      <div className="flex-1">
        <p>
          <Link
            href={`/profile/${requester.id}`}
            className="font-semibold hover:underline underline-offset-4"
          >
            {requester.name || "Someone"}
          </Link>{" "}
          sent you a friend request.
        </p>
        {formattedDate ? (
          <p className="text-xs text-gray-400 mt-1">{formattedDate}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1 rounded-md bg-socialBlue text-white text-sm disabled:opacity-50"
          onClick={onAccept}
          disabled={isProcessing}
        >
          Accept
        </button>
        <button
          className="px-3 py-1 rounded-md border border-gray-300 text-sm disabled:opacity-50"
          onClick={onReject}
          disabled={isProcessing}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
