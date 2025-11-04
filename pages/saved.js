import NavigationCard from "@/components/NavigationCard";
import PostCard from "@/components/PostCard";
import { UserContextProvider } from "@/context/context";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useCallback, useEffect, useState } from "react";

export default function SavedPostPage(){
  const [savedPost,setSavedPost]=useState([]);
    const session=useSession();
    const supabase=useSupabaseClient();
    
  const loadSavedPosts = useCallback(async () => {
    if (!session?.user?.id) {
      return [];
    }
    const { data: savedRows, error: savedError } = await supabase
      .from("saved_post")
      .select("*")
      .eq("user_id", session.user.id);
    if (savedError) {
      return [];
    }
    const postIds = (savedRows || []).map((item) => item.post_id);
    if (postIds.length === 0) {
      return [];
    }
    const { data: posts, error: postError } = await supabase
      .from("post")
      .select("*,profiles(*)")
      .in("id", postIds)
      .is("parent", null);
    if (postError) {
      return [];
    }
    return (posts || []).filter(
      (post) => post.hidden !== true || post.auther === session.user.id
    );
  }, [session?.user?.id, supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadSavedPosts();
      if (!cancelled) {
        setSavedPost(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSavedPosts]);

  const handlePostChange = useCallback(async () => {
    const data = await loadSavedPosts();
    setSavedPost(data);
  }, [loadSavedPosts]);

    return(
        <div className="mx-2 mt-4 flex flex-col gap-6 md:mx-auto md:flex-row md:items-start custom:max-w-4xl custom:mx-auto">
      <div className="w-full md:w-1/4 md:max-w-[220px] md:sticky md:top-24 md:self-start">
        <NavigationCard/>
      </div>
      <div className="w-full md:flex-1">
        <h1 className="pb-3 text-3xl font-semibold text-gray-400 sm:text-4xl md:text-5xl">Saved Posts</h1>
          <UserContextProvider>
            {savedPost?.length>0 ? (
              savedPost.map(eachSavePost=>(
                <div key={eachSavePost.id}>
                  <PostCard {...eachSavePost} onChange={handlePostChange}/>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-white/80 p-6 text-center text-sm text-gray-500 md:min-h-[50vh] md:flex md:flex-col md:items-center md:justify-center">
                Nothing saved yet. Tap the bookmark icon on any post to keep it here.
              </div>
            )}
          </UserContextProvider>
        </div>
    </div>
    );
}
