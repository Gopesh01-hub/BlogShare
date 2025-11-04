import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import Card from "./card";
import FriendInfo from "./FriendInfo";
import PostCard from "./PostCard";

export default function ProfileContent({ activeTab, userId }) {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [about, setAbout] = useState("");
  const [photos, setPhotos] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);

  const normalizedTab = activeTab || "posts";
  const isOwnProfile = session?.user?.id === userId;

  useEffect(() => {
    if (!userId || normalizedTab !== "posts") {
      return;
    }
    let cancelled = false;
    (async () => {
      const [
        { data: postData, error: postError },
        { data: profileData, error: profileError },
      ] = await Promise.all([
        (async () => {
          let query = supabase
            .from("post")
            .select(
              "id, auther, parent, content, created_at, photos, location, mood, tagged_users, tagged_user_names, hidden, profiles(id, avatar, name)"
            )
            .eq("auther", userId)
            .is("parent", null)
            .order("created_at", { ascending: false });

          if (!isOwnProfile) {
            query = query.or("hidden.is.null,hidden.eq.false");
          }

          const { data, error } = await query;
          return { data, error };
        })(),
        supabase
          .from("profiles")
          .select()
          .eq("id", userId)
          .maybeSingle(),
      ]);

      if (cancelled) {
        return;
      }

      const filteredPosts =
        postError || !postData
          ? []
          : postData.filter((post) => isOwnProfile || post.hidden !== true);
      setPosts(filteredPosts);
      setProfile(profileError ? null : profileData || null);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, normalizedTab, supabase, isOwnProfile, refreshCounter]);

  useEffect(() => {
    if (!userId || normalizedTab !== "photos") {
      return;
    }
    let cancelled = false;
    let query = supabase
      .from("post")
      .select("photos, hidden, parent")
      .eq("auther", userId)
      .is("parent", null)
      .order("created_at", { ascending: false });

    if (!isOwnProfile) {
      query = query.or("hidden.is.null,hidden.eq.false");
    }

    query.then(({ data, error }) => {
        if (cancelled) {
          return;
        }
        if (error) {
          setPhotos([]);
          return;
        }
        setPhotos(
          (data || []).filter((row) => isOwnProfile || !row.hidden)
        );
      });

    return () => {
      cancelled = true;
    };
  }, [userId, normalizedTab, supabase, isOwnProfile]);

  useEffect(() => {
    if (!userId || normalizedTab !== "about") {
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("about")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) {
          return;
        }
        if (error) {
          setAbout("");
          return;
        }
        setAbout(data?.about || "");
      });

    return () => {
      cancelled = true;
    };
  }, [userId, normalizedTab, supabase]);

  useEffect(() => {
    if (!userId || normalizedTab !== "friends") {
      return;
    }
    let cancelled = false;
    setFriendsError("");
    setFriendsLoading(true);

    (async () => {
      try {
        const normalizedId = String(userId);
        const { data: relations, error } = await supabase
          .from("friendships")
          .select("id, requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${normalizedId},addressee_id.eq.${normalizedId}`);

        if (cancelled) {
          return;
        }

        if (error) {
          throw error;
        }

        if (!relations || relations.length === 0) {
          setFriends([]);
          return;
        }

        const otherIds = relations
          .map((row) =>
            row.requester_id === normalizedId ? row.addressee_id : row.requester_id
          )
          .filter(Boolean);

        if (otherIds.length === 0) {
          setFriends([]);
          return;
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, avatar, place")
          .in("id", otherIds);

        if (cancelled) {
          return;
        }

        if (profilesError) {
          throw profilesError;
        }

        const profileById = new Map();
        (profilesData || []).forEach((p) => profileById.set(p.id, p));

        const mappedFriends = relations
          .map((row) =>
            profileById.get(
              row.requester_id === normalizedId
                ? row.addressee_id
                : row.requester_id
            )
          )
          .filter(Boolean);

        setFriends(mappedFriends);
      } catch (error) {
        if (!cancelled) {
          setFriendsError(error?.message || "Failed to load friends");
          setFriends([]);
        }
      } finally {
        if (!cancelled) {
          setFriendsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, normalizedTab, supabase]);

  function saveAbout() {
    supabase
      .from("profiles")
      .update({ about })
      .eq("id", userId)
      .then(() => setEditMode(false));
  }

  return (
    <div>
      {normalizedTab === "posts" && (
        <div>
          {posts.map((eachPost) => (
            <PostCard
              key={eachPost.id}
              {...eachPost}
              profiles={profile || eachPost.profiles}
              onChange={() => setRefreshCounter((value) => value + 1)}
            />
          ))}
          {posts.length === 0 ? (
            <Card>
              <p className="text-gray-500">No posts yet.</p>
            </Card>
          ) : null}
        </div>
      )}

      {normalizedTab === "about" && (
        <div>
          <Card>
            <div className="flex justify-between items-center">
              <h2 className="text-3xl mb-2">About</h2>
              {isOwnProfile && (
                <div>
                  {!editMode ? (
                    <button
                      className="bg-socialBlue px-2 py-1 rounded-md shadow-md text-white flex gap-1 items-center"
                      onClick={() => setEditMode(true)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                      Change about
                    </button>
                  ) : (
                    <button
                      className="bg-socialBlue px-2 py-1 rounded-md shadow-md text-white flex gap-1 items-center"
                      onClick={saveAbout}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
                        />
                      </svg>
                      Save about
                    </button>
                  )}
                </div>
              )}
            </div>
            {!editMode ? (
              <div>{about || "No information shared yet."}</div>
            ) : (
              <textarea
                className="text-sm px-2 py-1 w-full border-2 rounded-xl border-socialBlue"
                placeholder="Enter something about yourself"
                value={about}
                onChange={(ev) => setAbout(ev.target.value)}
              />
            )}
          </Card>
        </div>
      )}

      {normalizedTab === "friends" && (
        <div>
          <Card>
            <h2 className="text-3xl mb-2">Friends</h2>
            {friendsLoading ? (
              <p className="text-gray-500">Loading friends...</p>
            ) : null}
            {friendsError ? (
              <p className="text-red-500 text-sm">{friendsError}</p>
            ) : null}
            {!friendsLoading && !friendsError && friends.length === 0 ? (
              <p className="text-gray-500">No friends to show yet.</p>
            ) : null}
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="p-3 px-4 border-b border-gray-100 -mx-4 last:border-b-0"
              >
                <FriendInfo profile={friend} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {normalizedTab === "photos" && (
        <div>
          <Card>
            {photos.length === 0 ? (
              <p className="text-gray-500">No photos yet.</p>
            ) : (
              photos.map((eachPostPhotos, index) => (
                <div
                  key={index}
                  className="grid item-center grid-cols-2 gap-2 mb-4 last:mb-0"
                >
                  {eachPostPhotos?.photos?.map((photoUrl, innerIndex) => (
                    <div
                      key={innerIndex}
                      className="rounded-md overflow-hidden h-48 bg-black/5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="h-full w-full object-cover"
                        src={photoUrl}
                        alt="Uploaded"
                      />
                    </div>
                  ))}
                </div>
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
