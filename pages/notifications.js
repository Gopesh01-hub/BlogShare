import NavigationCard from "@/components/NavigationCard";
import NotificationUser from "@/components/NotificationUser";
import TagNotification from "@/components/TagNotification";
import Card from "@/components/card";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useCallback, useEffect, useState } from "react";

export default function NotificationsPage() {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [requests, setRequests] = useState([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const [tagNotifications, setTagNotifications] = useState([]);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState("");
  const [tagStatusMessage, setTagStatusMessage] = useState("");

  const fetchFriendRequests = useCallback(async () => {
    if (!session?.user?.id) {
      setRequests([]);
      return;
    }
    setRequestLoading(true);
    setRequestError("");
    try {
      const userId = session.user.id;
      const { data: pendingRequests, error: requestError } = await supabase
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("status", "pending")
        .eq("addressee_id", userId)
        .order("created_at", { ascending: false });

      if (requestError) {
        throw requestError;
      }

      if (!pendingRequests || pendingRequests.length === 0) {
        setRequests([]);
        return;
      }

      const requesterIds = pendingRequests
        .map((row) => row.requester_id)
        .filter(Boolean);

      if (requesterIds.length === 0) {
        setRequests([]);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar")
        .in("id", requesterIds);

      if (profileError) {
        throw profileError;
      }

      const profileMap = new Map();
      (profiles || []).forEach((profile) => profileMap.set(profile.id, profile));

      const mapped = pendingRequests.map((request) => ({
        id: request.id,
        created_at: request.created_at,
        requester_id: request.requester_id,
        profile: profileMap.get(request.requester_id) || null,
      }));

      setRequests(mapped);
    } catch (err) {
      setRequestError(err?.message || "Failed to load friend requests");
      setRequests([]);
    } finally {
      setRequestLoading(false);
    }
  }, [session?.user?.id, supabase]);

  const fetchTagNotifications = useCallback(async () => {
    if (!session?.user?.id) {
      setTagNotifications([]);
      return;
    }
    setTagLoading(true);
    setTagError("");
    setTagStatusMessage("");
    try {
      const userId = session.user.id;
      const { data: tagRows, error: tagRowError } = await supabase
        .from("notifications")
        .select("id, actor_id, post_id, payload, created_at, read")
        .eq("recipient_id", userId)
        .eq("type", "tag")
        .order("created_at", { ascending: false });

      if (tagRowError) {
        throw tagRowError;
      }

      if (!tagRows || tagRows.length === 0) {
        setTagNotifications([]);
        return;
      }

      const actorIds = tagRows.map((row) => row.actor_id).filter(Boolean);
      let actorMap = new Map();
      if (actorIds.length > 0) {
        const { data: actorProfiles, error: actorError } = await supabase
          .from("profiles")
          .select("id, name, avatar")
          .in("id", actorIds);

        if (actorError) {
          throw actorError;
        }

        actorMap = new Map();
        (actorProfiles || []).forEach((actor) => actorMap.set(actor.id, actor));
      }

      const mapped = tagRows.map((row) => ({
        ...row,
        actor: actorMap.get(row.actor_id) || null,
      }));
      setTagNotifications(mapped);
    } catch (err) {
      if (
        typeof err?.message === "string" &&
        err.message.includes("Could not find the table 'public.notifications'")
      ) {
        setTagStatusMessage("Tag notifications are not available yet.");
        setTagNotifications([]);
      } else {
        setTagError(err?.message || "Failed to load tag notifications.");
        setTagNotifications([]);
      }
    } finally {
      setTagLoading(false);
    }
  }, [session?.user?.id, supabase]);

  useEffect(() => {
    fetchFriendRequests();
  }, [fetchFriendRequests]);

  useEffect(() => {
    fetchTagNotifications();
  }, [fetchTagNotifications]);

  async function handleFriendResponse(requestId, accept) {
    setProcessingId(requestId);
    setRequestError("");
    try {
      const update = accept
        ? { status: "accepted", responded_at: new Date().toISOString() }
        : { status: "rejected", responded_at: new Date().toISOString() };

      const { error: updateError } = await supabase
        .from("friendships")
        .update(update)
        .eq("id", requestId);

      if (updateError) {
        throw updateError;
      }

      setRequests((current) => current.filter((request) => request.id !== requestId));
    } catch (err) {
      setRequestError(err?.message || "Unable to update request");
    } finally {
      setProcessingId(null);
    }
  }

  async function markTagAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) {
        throw error;
      }
      setTagNotifications((current) =>
        current.filter((notification) => notification.id !== notificationId)
      );
    } catch (err) {
      setTagError(err?.message || "Unable to update notification");
    }
  }

  return (
    <div className="mx-2 mt-4 flex flex-col gap-6 md:mx-auto md:flex-row md:items-start custom:max-w-4xl custom:mx-auto">
      <div className="w-full md:w-1/4 md:max-w-[220px] md:sticky md:top-24 md:self-start">
        <NavigationCard />
      </div>
      <div className="w-full md:flex-1 space-y-6">
        <h1 className="pb-3 text-3xl font-semibold text-gray-400 sm:text-4xl md:text-5xl">Notifications</h1>

        <Card>
          <div className="-mx-4">
            <div className="px-5 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Friend requests</h2>
            </div>
            {requestLoading ? (
              <p className="px-5 py-3 text-gray-500">Loading friend requests...</p>
            ) : null}
            {requestError ? (
              <p className="px-5 py-3 text-sm text-red-500">{requestError}</p>
            ) : null}
            {!requestLoading && !requestError && requests.length === 0 ? (
              <p className="px-5 py-3 text-gray-500">You have no new friend requests.</p>
            ) : null}
            {requests.map((request) => (
              <NotificationUser
                key={request.id}
                requester={request.profile || { id: request.requester_id }}
                createdAt={request.created_at}
                isProcessing={processingId === request.id}
                onAccept={() => handleFriendResponse(request.id, true)}
                onReject={() => handleFriendResponse(request.id, false)}
              />
            ))}
          </div>
        </Card>

        <Card>
          <div className="-mx-4">
            <div className="px-5 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Tags & mentions</h2>
            </div>
            {tagLoading ? (
              <p className="px-5 py-3 text-gray-500">Loading tag notifications...</p>
            ) : null}
            {tagError ? (
              <p className="px-5 py-3 text-sm text-red-500">{tagError}</p>
            ) : null}
            {tagStatusMessage && !tagError ? (
              <p className="px-5 py-3 text-gray-500">{tagStatusMessage}</p>
            ) : null}
            {!tagLoading && !tagError && !tagStatusMessage && tagNotifications.length === 0 ? (
              <p className="px-5 py-3 text-gray-500">You have not been tagged recently.</p>
            ) : null}
            {tagNotifications.map((notification) => (
              <TagNotification
                key={notification.id}
                notification={notification}
                onDismiss={() => markTagAsRead(notification.id)}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
