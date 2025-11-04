import Link from "next/link";
import Avatar from "./Avatar";

/**
 * Presentational helper for rendering one friend row inside lists.
 * The parent component supplies the profile data and any optional actions.
 */
export default function FriendInfo({ profile, mutualCount, actions }) {
  if (!profile) {
    return null;
  }

  const { id, name, avatar, place } = profile;
  const secondaryLine =
    typeof mutualCount === "number"
      ? `${mutualCount} mutual ${mutualCount === 1 ? "friend" : "friends"}`
      : place || "";

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Link
        href={`/profile/${id}`}
        className="flex items-center gap-3 min-w-0"
      >
        <div className="mt-1 shrink-0">
          <Avatar url={avatar} />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-lg truncate">{name || "Unknown"}</h3>
          {secondaryLine ? (
            <p className="text-gray-400 leading-4 truncate">{secondaryLine}</p>
          ) : null}
        </div>
      </Link>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
