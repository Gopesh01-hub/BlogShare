import Link from "next/link";
import Avatar from "./Avatar";
import ReactTimeAgo from "react-time-ago";

export default function TagNotification({ notification, onDismiss }) {
  if (!notification) {
    return null;
  }

  const { actor, created_at: createdAt, post_id: postId, payload } = notification;
  const actorName = actor?.name || "Someone";
  const createdAtDate = createdAt ? new Date(createdAt).getTime() : null;
  const isValidDate = createdAtDate && !Number.isNaN(createdAtDate);

  return (
    <div className="flex items-center gap-3 p-3 border-b border-gray-200 px-5">
      <Link href={`/profile/${actor?.id ?? ""}`} className="shrink-0">
        <Avatar url={actor?.avatar} />
      </Link>
      <div className="flex-1 text-sm">
        <p>
          <Link
            href={`/profile/${actor?.id ?? ""}`}
            className="font-semibold hover:underline underline-offset-4"
          >
            {actorName}
          </Link>{" "}
          tagged you in a
          {postId ? (
            <Link
              href={`/?post=${postId}`}
              className="text-socialBlue hover:underline underline-offset-4"
            >
              {" post"}
            </Link>
          ) : (
            " post"
          )}
          .
        </p>
        {payload?.mood ? (
          <p className="text-xs text-gray-500 mt-1">Mood: {payload.mood}</p>
        ) : null}
        {isValidDate ? (
          <p className="text-xs text-gray-400 mt-1">
            <ReactTimeAgo date={createdAtDate} />
          </p>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-gray-700"
          onClick={onDismiss}
        >
          Mark read
        </button>
      ) : null}
    </div>
  );
}
