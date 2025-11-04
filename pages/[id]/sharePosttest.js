import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import NavigationCard from "@/components/NavigationCard";
import PostCard from "@/components/PostCard";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { userContext } from "@/context/context";
import Login from "../login";
import Card from "@/components/card";

export default function SharePostPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const session = useSession();

  const postId = useMemo(() => {
    const raw = router.query?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [router.query?.id]);

  const [viewerProfile, setViewerProfile] = useState(null);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user?.id) {
      setViewerProfile(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select()
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setViewerProfile(data || null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, supabase]);

  useEffect(() => {
    if (!postId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    supabase
      .from("post")
      .select(
        "id, auther, content, created_at, photos, location, mood, tagged_users, tagged_user_names, hidden, profiles(id, avatar, name)"
      )
      .eq("id", postId)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (cancelled) {
          return;
        }
        if (fetchError) {
          setError(fetchError.message || "Unable to load post.");
          setPost(null);
        } else {
          setPost(data || null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [postId, supabase]);

  const isOwner = session?.user?.id && post?.auther === session.user.id;

  if (!session) {
    return <Login />;
  }

  if (loading) {
    return (
      <div className="md:flex custom:max-w-4xl custom:mx-auto gap-6 mt-4 mx-2">
        <div className="w-1/4">
          <NavigationCard />
        </div>
        <div className="md:w-3/4 w-full">
          <Card>
            <p className="text-gray-500">Loading post…</p>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="md:flex custom:max-w-4xl custom:mx-auto gap-6 mt-4 mx-2">
        <div className="w-1/4">
          <NavigationCard />
        </div>
        <div className="md:w-3/4 w-full">
          <Card>
            <p className="text-red-500">
              {error || "We could not find the post you were looking for."}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (post.hidden && !isOwner) {
    return (
      <div className="md:flex custom:max-w-4xl custom:mx-auto gap-6 mt-4 mx-2">
        <div className="w-1/4">
          <NavigationCard />
        </div>
        <div className="md:w-3/4 w-full">
          <Card>
            <p className="text-gray-600">
              This post is currently hidden by its author.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="md:flex custom:max-w-4xl custom:mx-auto gap-6 mt-4 mx-2">
      <div className="w-1/4">
        <NavigationCard />
      </div>
      <div className="md:w-3/4 w-full">
        <userContext.Provider value={viewerProfile}>
          <PostCard
            {...post}
            onChange={async () => {
              // refresh post in place
              const { data } = await supabase
                .from("post")
                .select(
                  "id, auther, content, created_at, photos, location, mood, tagged_users, tagged_user_names, hidden, profiles(id, avatar, name)"
                )
                .eq("id", postId)
                .maybeSingle();
              if (data) {
                setPost(data);
              } else {
                setPost(null);
              }
            }}
          />
        </userContext.Provider>
      </div>
    </div>
  );
}
