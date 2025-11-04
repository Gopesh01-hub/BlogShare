import NavigationCard from "@/components/NavigationCard";
import PostCard from "@/components/PostCard";
import PostFormCard from "@/components/PostFormCard";
import Login from "./login";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { userContext } from "@/context/context";
import { COMMON_MOODS } from "@/helpers/moods";

export default function Home() {
  const supabase = useSupabaseClient();
  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [moodFilterOpen, setMoodFilterOpen] = useState(false);
  const [moodFilterQuery, setMoodFilterQuery] = useState("");
  const [moodFilterValue, setMoodFilterValue] = useState("");

  const session = useSession();

  const filteredMoodSuggestions = useMemo(() => {
    if (!moodFilterQuery) {
      return COMMON_MOODS;
    }
    return COMMON_MOODS.filter((mood) =>
      mood.toLowerCase().includes(moodFilterQuery.toLowerCase())
    );
  }, [moodFilterQuery]);

  const loadPosts = useCallback(
    async (filterValue = "") => {
      let query = supabase
        .from("post")
        .select(
          "id,auther,content,created_at,photos,location,mood,tagged_users,tagged_user_names,hidden,profiles(id,avatar,name)"
        )
        .is("parent", null)
        .or("hidden.is.null,hidden.eq.false")
        .order("created_at", { ascending: false });

      if (filterValue.trim()) {
        query = query.ilike("mood", `%${filterValue.trim()}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Failed to load posts", error);
        setPosts([]);
      } else {
        const viewerId = session?.user?.id || null;
        const sanitized = (data || []).filter(
          (post) => post.hidden !== true || post.auther === viewerId
        );
        setPosts(sanitized);
      }
    },
    [session?.user?.id, supabase]
  );

  useEffect(() => {
    loadPosts(moodFilterValue);
  }, [loadPosts, moodFilterValue]);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }
    supabase
      .from("profiles")
      .select()
      .eq("id", session.user.id)
      .then((result) => {
        if (result?.data?.length) {
          setProfile(result.data[0]);
        }
      });
  }, [session?.user?.id, supabase]);

  if (!session) {
    return <Login />;
  }

  function applyMoodFilter(nextValue) {
    setMoodFilterValue(nextValue.trim());
    setMoodFilterOpen(false);
  }

  function clearMoodFilter() {
    setMoodFilterValue("");
    setMoodFilterQuery("");
    setMoodFilterOpen(false);
  }

  return (
    <div className="flex flex-col gap-6 mt-4 mx-2 md:flex-row custom:max-w-4xl custom:mx-auto">
      <div className="w-full md:w-1/4 md:max-w-[220px] md:sticky md:top-24 md:self-start">
        <NavigationCard />
      </div>
      <div className="md:w-3/4 w-full">
        <userContext.Provider value={profile}>
          <div className="mb-4 flex items-center justify-end">
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-sm hover:bg-gray-100"
                onClick={() => setMoodFilterOpen((prev) => !prev)}
              >
                😊 Filter by mood
                {moodFilterValue ? (
                  <span className="ml-2 rounded-full bg-socialBlue px-2 py-0.5 text-xs text-white">
                    {moodFilterValue}
                  </span>
                ) : null}
              </button>
              {moodFilterOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                  <input
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Search moods"
                    value={moodFilterQuery}
                    onChange={(ev) => setMoodFilterQuery(ev.target.value)}
                  />
                  <div className="mt-2 max-h-48 overflow-auto text-sm">
                    {filteredMoodSuggestions.map((mood) => (
                      <button
                        key={mood}
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-gray-100"
                        onClick={() => applyMoodFilter(mood)}
                      >
                        <span className="truncate">{mood}</span>
                        <span className="text-xs text-socialBlue">Apply</span>
                      </button>
                    ))}
                    {moodFilterQuery &&
                    !filteredMoodSuggestions.includes(moodFilterQuery) ? (
                      <button
                        type="button"
                        className="mt-2 w-full rounded-md bg-socialBlue px-2 py-1 text-left text-xs text-white hover:bg-blue-600"
                        onClick={() => applyMoodFilter(moodFilterQuery)}
                      >
                        {"Use \""}
                        {moodFilterQuery}
                        {"\" as filter"}
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <button
                      type="button"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => setMoodFilterOpen(false)}
                    >
                      Close
                    </button>
                    {moodFilterValue ? (
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-600"
                        onClick={clearMoodFilter}
                      >
                        Clear filter
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <PostFormCard onPost={() => loadPosts(moodFilterValue)} />
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                {...post}
                onChange={() => loadPosts(moodFilterValue)}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-gray-500">
              {moodFilterValue
                ? "No posts match this mood filter yet."
                : "No posts to show yet."}
            </div>
          )}
        </userContext.Provider>
      </div>
    </div>
  );
}
