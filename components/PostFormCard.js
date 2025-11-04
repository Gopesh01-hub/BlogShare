import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Avatar from "./Avatar";
import Card from "./card";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { userContext } from "@/context/context";
import Spinner from "./spinner";
import { COMMON_MOODS } from "@/helpers/moods";

export default function PostFormCard({ onPost }) {
  const [content, setContent] = useState("");
  const supabase = useSupabaseClient();
  const session = useSession();
  const profile = useContext(userContext);
  const [uploads, setUploads] = useState([]);
  const [spinner, setSpinner] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState("");
  const [taggedPeople, setTaggedPeople] = useState([]);

  const [locationOpen, setLocationOpen] = useState(false);
  const [locationValue, setLocationValue] = useState("");

  const [moodOpen, setMoodOpen] = useState(false);
  const [moodValue, setMoodValue] = useState("");
  const [moodQuery, setMoodQuery] = useState("");

  const filteredMoodSuggestions = useMemo(() => {
    if (!moodQuery) {
      return COMMON_MOODS;
    }
    return COMMON_MOODS.filter((mood) =>
      mood.toLowerCase().includes(moodQuery.toLowerCase())
    );
  }, [moodQuery]);

  const fetchFriendSuggestions = useCallback(
    async (searchTerm) => {
      if (!session?.user?.id) {
        return [];
      }
      const trimmed = searchTerm.trim();
      if (trimmed.length < 2) {
        return [];
      }
      const userId = session.user.id;
      const { data: relations, error: friendshipError } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id,status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (friendshipError) {
        throw friendshipError;
      }
      const friendIds = new Set();
      (relations || []).forEach((relation) => {
        if (relation.requester_id === userId) {
          friendIds.add(relation.addressee_id);
        } else if (relation.addressee_id === userId) {
          friendIds.add(relation.requester_id);
        }
      });
      if (friendIds.size === 0) {
        return [];
      }
      const idsArray = Array.from(friendIds);
      const { data: matches, error: profileError } = await supabase
        .from("profiles")
        .select("id,name,avatar")
        .in("id", idsArray)
        .ilike("name", `%${trimmed}%`)
        .limit(10);
      if (profileError) {
        throw profileError;
      }
      return matches || [];
    },
    [session?.user?.id, supabase]
  );

  useEffect(() => {
    if (!peopleOpen) {
      return;
    }
    const trimmed = peopleQuery.trim();
    if (trimmed.length < 2) {
      setPeopleResults([]);
      setPeopleError("");
      return;
    }
    let cancelled = false;
    setPeopleLoading(true);
    setPeopleError("");
    fetchFriendSuggestions(trimmed)
      .then((results) => {
        if (cancelled) {
          return;
        }
        setPeopleResults(results);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setPeopleError(
          err?.message
            ? "Unable to load friends. Please try again."
            : "Unable to load friends."
        );
        setPeopleResults([]);
      })
      .finally(() => {
        if (!cancelled) {
          setPeopleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchFriendSuggestions, peopleOpen, peopleQuery]);

  function resetForm() {
    setContent("");
    setUploads([]);
    setTaggedPeople([]);
    setLocationValue("");
    setMoodValue("");
    setMoodQuery("");
    setPeopleQuery("");
    setErrorMessage("");
  }

  async function createPost() {
    if (!session?.user?.id) {
      return;
    }
    const payload = {
      auther: session.user.id,
      content,
      photos: uploads,
      hidden: false,
    };

    if (taggedPeople.length > 0) {
      payload.tagged_users = taggedPeople.map((person) => person.id);
      payload.tagged_user_names = taggedPeople.map((person) => person.name);
    }
    if (locationValue.trim()) {
      payload.location = locationValue.trim();
    }
    if (moodValue.trim()) {
      payload.mood = moodValue.trim();
    }

    const res = await supabase.from("post").insert(payload).select().single();
    if (res.error) {
      setErrorMessage(res.error.message);
      return;
    }
    if (taggedPeople.length > 0 && res.data?.id) {
      await notifyTaggedUsers(res.data.id);
    }
    resetForm();
    if (onPost) {
      onPost();
    }
  }

  async function notifyTaggedUsers(postId) {
    if (!session?.user?.id || taggedPeople.length === 0) {
      return;
    }
    try {
      const rows = taggedPeople.map((person) => ({
        recipient_id: person.id,
        actor_id: session.user.id,
        post_id: postId,
        type: "tag",
        payload: {
          tagged_name: person.name,
          mood: moodValue || null,
          location: locationValue || null,
        },
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("Failed to create tag notifications", err);
    }
  }

  async function uploadImage(ev) {
    const files = ev.target.files;
    if (!files?.length) {
      return;
    }
    setSpinner(true);
    setErrorMessage("");
    try {
      for (const file of files) {
        const newName = Date.now() + file.name;
        const result = await supabase.storage.from("photos").upload(newName, file);
        if (result.data) {
          const url =
            process.env.NEXT_PUBLIC_SUPABASE_URL +
            "/storage/v1/object/public/photos/" +
            newName;
          setUploads((prevUploads) => [...prevUploads, url]);
        } else if (result.error) {
          throw result.error;
        }
      }
    } catch (err) {
      setErrorMessage(err?.message || "Unable to upload image");
    } finally {
      setSpinner(false);
    }
  }

  function addTaggedPerson(person) {
    if (taggedPeople.find((existing) => existing.id === person.id)) {
      return;
    }
    setTaggedPeople((prev) => [...prev, person]);
  }

  function removeTaggedPerson(id) {
    setTaggedPeople((prev) => prev.filter((person) => person.id !== id));
  }

  function applyMood(value) {
    setMoodValue(value);
    setMoodQuery("");
    setMoodOpen(false);
  }

  return (
    <Card>
      <div className="flex gap-4">
        <Avatar url={profile?.avatar} />
        {profile && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="grow px-2 py-1 h-10"
            placeholder={`Whats on your mind, ${profile?.name}?`}
          />
        )}
      </div>
      {errorMessage ? (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {errorMessage}
        </div>
      ) : null}
      {spinner ? <Spinner /> : null}
      {uploads.length > 0 ? (
        <div className="flex gap-2 mt-4 flex-wrap">
          {uploads.map((upload, index) => (
            <div key={index} className="">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={upload} alt="Uploaded preview" className="w-auto h-24 rounded-md" />
            </div>
          ))}
        </div>
      ) : null}

      {taggedPeople.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {taggedPeople.map((person) => (
            <span
              key={person.id}
              className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700"
            >
              @{person.name}
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={() => removeTaggedPerson(person.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {locationValue ? (
        <div className="mt-2 text-sm text-gray-500">
          📍 <span className="font-medium">{locationValue}</span>
        </div>
      ) : null}

      {moodValue ? (
        <div className="mt-1 text-sm text-gray-500">
          😊 <span className="font-medium">{moodValue}</span>
        </div>
      ) : null}

      <div className="relative mt-4 flex flex-wrap gap-4 items-center">
        <label className="flex cursor-pointer items-center gap-1">
          <input type="file" className="hidden" multiple onChange={uploadImage} />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
          Image
        </label>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => {
              setPeopleOpen((prev) => !prev);
              setLocationOpen(false);
              setMoodOpen(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5 mt-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
            People
          </button>
          {peopleOpen ? (
            <div className="absolute z-20 mt-2 w-[calc(100vw-3rem)] max-w-xs rounded-md border border-gray-200 bg-white p-3 shadow-lg sm:w-64 sm:max-w-none">
              <input
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                placeholder="Search friends"
                value={peopleQuery}
                onChange={(ev) => setPeopleQuery(ev.target.value)}
              />
              {peopleLoading ? (
                <div className="mt-2 text-sm text-gray-400">Searching...</div>
              ) : null}
              {peopleError ? (
                <div className="mt-2 text-sm text-red-500">{peopleError}</div>
              ) : null}
              {!peopleLoading && !peopleError ? (
                <div className="mt-2 max-h-48 overflow-auto text-sm">
                  {peopleResults.length === 0 && peopleQuery.trim().length >= 2 ? (
                    <div className="text-gray-500">No matches found.</div>
                  ) : null}
                  {peopleResults.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-gray-100"
                      onClick={() => addTaggedPerson(person)}
                    >
                      <span className="truncate">{person.name}</span>
                      <span className="text-xs text-socialBlue">Tag</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => setPeopleOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => {
              setLocationOpen((prev) => !prev);
              setPeopleOpen(false);
              setMoodOpen(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5 mt-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
            Check in
          </button>
          {locationOpen ? (
            <div className="absolute z-20 mt-2 w-[calc(100vw-3rem)] max-w-xs rounded-md border border-gray-200 bg-white p-3 shadow-lg sm:w-64 sm:max-w-none">
              <input
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                placeholder="Where are you?"
                value={locationValue}
                onChange={(ev) => setLocationValue(ev.target.value)}
              />
              <div className="mt-2 flex justify-end gap-2 text-xs">
                {locationValue ? (
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setLocationValue("")}
                  >
                    Clear
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setLocationOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={() => {
              setMoodOpen((prev) => !prev);
              setPeopleOpen(false);
              setLocationOpen(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5 mt-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z"
              />
            </svg>
            Mood
          </button>
          {moodOpen ? (
            <div className="absolute z-20 mt-2 w-[calc(100vw-3rem)] max-w-xs rounded-md border border-gray-200 bg-white p-3 shadow-lg sm:w-64 sm:max-w-none">
              <input
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                placeholder="Search or write your mood"
                value={moodQuery}
                onChange={(ev) => setMoodQuery(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    applyMood(
                      moodQuery.trim() ? moodQuery.trim() : moodValue
                    );
                  }
                }}
              />
              <div className="mt-2 max-h-48 overflow-auto text-sm">
                {filteredMoodSuggestions.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-gray-100"
                    onClick={() => applyMood(mood)}
                  >
                    <span className="truncate">{mood}</span>
                    <span className="text-xs text-socialBlue">Use</span>
                  </button>
                ))}
                {moodQuery && !filteredMoodSuggestions.includes(moodQuery) ? (
                  <button
                    type="button"
                    className="mt-2 w-full rounded-md bg-socialBlue px-2 py-1 text-left text-xs text-white hover:bg-blue-600"
                    onClick={() => applyMood(moodQuery.trim())}
                  >
                    {"Use \""}
                    {moodQuery}
                    {"\""}
                  </button>
                ) : null}
              </div>
              <div className="mt-2 flex justify-end gap-2 text-xs">
                {moodValue ? (
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setMoodValue("")}
                  >
                    Clear mood
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setMoodOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="ml-auto">
          <button
            onClick={createPost}
            className="rounded-md bg-socialBlue px-3 py-1 text-white hover:bg-blue-600 disabled:opacity-60"
            disabled={!content.trim() && uploads.length === 0}
          >
            Share
          </button>
        </div>
      </div>
    </Card>
  );
}
