import Avatar from "@/components/Avatar";
import NavigationCard from "@/components/NavigationCard";
import Card from "@/components/card";
import Cover from "@/components/Cover";
import ProfileTab from "@/components/ProfileTab";
import ProfileContent from "@/components/ProfileContent";
import { UserContextProvider } from "@/context/context";
import {
  useSession,
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const isRouterReady = router.isReady;
  const { isLoading: sessionLoading } = useSessionContext();
  const session = useSession();
  const supabase = useSupabaseClient();

  const rawQueryId = router.query?.id;
  const rawTab = router.query?.tab;
  const userId = useMemo(() => {
    const fallbackId = session?.user?.id || null;
    const firstSegment = Array.isArray(rawQueryId)
      ? rawQueryId[0]
      : rawQueryId;

    if (typeof firstSegment !== "string") {
      return fallbackId;
    }

    const normalized = firstSegment.trim();

    if (
      !normalized ||
      normalized === "undefined" ||
      normalized === "null" ||
      normalized === "me"
    ) {
      return fallbackId;
    }

    return normalized;
  }, [rawQueryId, session?.user?.id]);

  const activeTab = useMemo(() => {
    let candidate;

    if (Array.isArray(rawTab) && rawTab.length > 0) {
      candidate = rawTab[0];
    } else if (typeof rawTab === "string") {
      candidate = rawTab;
    } else if (Array.isArray(rawQueryId) && rawQueryId.length > 1) {
      candidate = rawQueryId[1];
    }

    if (!candidate || candidate === "undefined") {
      return "posts";
    }

    return candidate;
  }, [rawQueryId, rawTab]);

  const viewerId = session?.user?.id || null;

  useEffect(() => {
    if (sessionLoading || !isRouterReady) {
      return;
    }
    if (!session) {
      router.replace("/login");
    }
  }, [router, session, sessionLoading, isRouterReady]);

  const [profile, setProfile] = useState();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");

  const [friendship, setFriendship] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState("idle");
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [friendshipError, setFriendshipError] = useState("");

  const isMyProfile =
    Boolean(viewerId) && Boolean(userId) && viewerId === userId;

  const fetchUser = useCallback(() => {
    if (!userId || !session) {
      return;
    }
    supabase
      .from("profiles")
      .select()
      .eq("id", userId)
      .then((result) => {
        if (result.error) {
          return;
        }
        setProfile(result.data?.[0]);
      });
  }, [session, supabase, userId]);

  useEffect(() => {
    if (!userId || !session) {
      return;
    }
    fetchUser();
  }, [session, userId, fetchUser]);

  function deriveFriendshipStatus(record, viewerId) {
    if (!record) {
      return "none";
    }
    if (record.status === "accepted") {
      return "friends";
    }
    if (record.status === "pending") {
      return record.requester_id === viewerId ? "outgoing" : "incoming";
    }
    return "none";
  }

  const fetchFriendship = useCallback(async () => {
    if (!viewerId || !userId) {
      return;
    }
    setFriendshipLoading(true);
    setFriendshipError("");
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status, created_at, responded_at")
        .or(
          `and(requester_id.eq.${viewerId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${viewerId})`
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      setFriendship(data || null);
      setFriendshipStatus(deriveFriendshipStatus(data, viewerId));
    } catch (err) {
      setFriendship(null);
      setFriendshipStatus("none");
      setFriendshipError(err?.message || "Unable to load friendship data");
    } finally {
      setFriendshipLoading(false);
    }
  }, [supabase, userId, viewerId]);

  useEffect(() => {
    if (!userId || !viewerId) {
      setFriendship(null);
      setFriendshipStatus("none");
      return;
    }
    if (viewerId === userId) {
      setFriendship(null);
      setFriendshipStatus("self");
      return;
    }
    setFriendshipStatus("idle");
    fetchFriendship();
  }, [userId, viewerId, fetchFriendship]);

  function saveProfile() {
    if (!viewerId) {
      return;
    }
    supabase
      .from("profiles")
      .update({ name, place })
      .eq("id", viewerId)
      .then((data, err) => {
        if (err) {
          throw err;
        }
        setProfile((prev) => ({ ...prev, name, place }));
      });
    setEditMode(false);
  }

  async function handleSendRequest() {
    if (!viewerId || !userId) {
      return;
    }
    setFriendshipLoading(true);
    setFriendshipError("");
    try {
      const { data, error } = await supabase
        .from("friendships")
        .insert({
          requester_id: viewerId,
          addressee_id: userId,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setFriendship(data);
      setFriendshipStatus("outgoing");
    } catch (err) {
      setFriendshipError(err?.message || "Failed to send friend request");
    } finally {
      setFriendshipLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!friendship?.id) {
      return;
    }
    setFriendshipLoading(true);
    setFriendshipError("");
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship.id);

      if (error) {
        throw error;
      }

      setFriendship(null);
      setFriendshipStatus("none");
    } catch (err) {
      setFriendshipError(err?.message || "Failed to cancel request");
    } finally {
      setFriendshipLoading(false);
    }
  }

  async function handleRespond(accept) {
    if (!friendship?.id) {
      return;
    }
    setFriendshipLoading(true);
    setFriendshipError("");
    try {
      if (accept) {
        const { data, error } = await supabase
          .from("friendships")
          .update({
            status: "accepted",
            responded_at: new Date().toISOString(),
          })
          .eq("id", friendship.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        setFriendship(data);
        setFriendshipStatus("friends");
      } else {
        const { error } = await supabase
          .from("friendships")
          .update({
            status: "rejected",
            responded_at: new Date().toISOString(),
          })
          .eq("id", friendship.id);

        if (error) {
          throw error;
        }

        setFriendship(null);
        setFriendshipStatus("none");
      }
    } catch (err) {
      setFriendshipError(err?.message || "Failed to update request");
    } finally {
      setFriendshipLoading(false);
    }
  }

  async function handleUnfriend() {
    if (!friendship?.id) {
      return;
    }
    setFriendshipLoading(true);
    setFriendshipError("");
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship.id);

      if (error) {
        throw error;
      }

      setFriendship(null);
      setFriendshipStatus("none");
    } catch (err) {
      setFriendshipError(err?.message || "Failed to remove friend");
    } finally {
      setFriendshipLoading(false);
    }
  }

  if (sessionLoading || !session) {
    return null;
  }

  return (
    <div className="mx-2 mt-4 flex flex-col gap-6 md:mx-auto md:flex-row md:items-start custom:max-w-4xl custom:mx-auto">
      <div className="w-full md:w-1/4 md:max-w-[220px] md:sticky md:top-24 md:self-start">
        <NavigationCard />
      </div>

      <div className="w-full overflow-hidden rounded-lg md:flex-1">
        <UserContextProvider>
          <Card>
            <div className="relative">
              <Cover
                url={profile?.cover}
                editable={isMyProfile}
                onChange={fetchUser}
              />
              <div className="absolute top-24">
                <div className="relative">
                  <Avatar
                    size="big"
                    url={profile?.avatar}
                    editable={isMyProfile}
                    onChange={fetchUser}
                  />
                </div>
              </div>
              <div className="pt-5 pb-16 ml-40 flex justify-between gap-4">
                <div className="h-10">
                  {!editMode ? (
                    <div>
                      <h1 className="text-2xl font-bold">{profile?.name}</h1>
                      <div className="text-gray-500 leading-4">
                        {profile?.place || "internet"}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div>
                        <input
                          type="text"
                          placeholder="Enter Name"
                          className="border-2 border-socialBlue rounded-md px-2 py-1"
                          onChange={(ev) => {
                            setName(ev.target.value);
                          }}
                          value={name}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Enter Location (Nation, State)"
                          className="border-2 border-socialBlue rounded-md px-2 py-1 mt-1"
                          onChange={(ev) => {
                            setPlace(ev.target.value);
                          }}
                          value={place}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isMyProfile ? (
                    <>
                      {!editMode ? (
                        <div className="shadow-md px-2 py-1 rounded-md hover:bg-socialBlue hover:text-white hover:scale-110">
                          <button
                            className="flex items-center gap-1"
                            onClick={() => {
                              setEditMode(true);
                              setName(profile?.name || "");
                              setPlace(profile?.place || "");
                            }}
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
                            Edit Profile
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="shadow-md px-2 py-1 rounded-md hover:bg-socialBlue hover:text-white hover:scale-110">
                            <button
                              className="flex items-center gap-1"
                              onClick={saveProfile}
                            >
                              <svg
                                className="size-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                stroke="currentColor"
                                strokeWidth={0}
                              >
                                <path
                                  d="M20 5H8V9H6V3H22V21H6V15H8V19H20V5Z"
                                  fill="currentColor"
                                />
                                <path
                                  d="M13.0743 16.9498L11.6601 15.5356L14.1957 13H2V11H14.1956L11.6601 8.46451L13.0743 7.05029L18.024 12L13.0743 16.9498Z"
                                  fill="currentColor"
                                />
                              </svg>
                              Save Profile
                            </button>
                          </div>
                          <div className="shadow-md px-2 py-1 rounded-md hover:bg-socialBlue hover:text-white hover:scale-110 mt-2">
                            <button
                              className="flex items-center gap-1"
                              onClick={() => {
                                setEditMode(false);
                              }}
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
                                  d="M6 18 18 6M6 6l12 12"
                                />
                              </svg>
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {friendshipError ? (
                        <span className="text-sm text-red-500">
                          {friendshipError}
                        </span>
                      ) : null}
                      {friendshipStatus === "idle" ? (
                        <span className="text-sm text-gray-500">
                          Checking status...
                        </span>
                      ) : null}
                      {friendshipStatus === "outgoing" ? (
                        <button
                          className="shadow-md px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                          onClick={handleCancelRequest}
                          disabled={friendshipLoading}
                        >
                          Cancel request
                        </button>
                      ) : null}
                      {friendshipStatus === "incoming" ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded-md bg-socialBlue text-white disabled:opacity-50"
                            onClick={() => handleRespond(true)}
                            disabled={friendshipLoading}
                          >
                            Accept
                          </button>
                          <button
                            className="px-3 py-1 rounded-md border border-gray-300 disabled:opacity-50"
                            onClick={() => handleRespond(false)}
                            disabled={friendshipLoading}
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                      {friendshipStatus === "friends" ? (
                        <button
                          className="shadow-md px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                          onClick={handleUnfriend}
                          disabled={friendshipLoading}
                        >
                          Unfriend
                        </button>
                      ) : null}
                      {friendshipStatus === "none" ? (
                        <button
                          className="shadow-md px-3 py-1 rounded-md bg-socialBlue text-white hover:opacity-90 disabled:opacity-50"
                          onClick={handleSendRequest}
                          disabled={friendshipLoading}
                        >
                          Add friend
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              <ProfileTab
                userId={userId}
                activeTab={activeTab}
              />
            </div>
          </Card>

          <ProfileContent
            activeTab={activeTab}
            userId={userId}
          />
        </UserContextProvider>
      </div>
    </div>
  );
}
