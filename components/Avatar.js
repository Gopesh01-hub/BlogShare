import Image from "next/image";
import uploadUserProfileImage from "@/helpers/user";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useMemo, useState } from "react";
import Spinner from "./spinner";

const FALLBACK_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Ccircle cx='64' cy='64' r='64' fill='%23e2e8f0'/%3E%3Cpath fill='%2394a3b8' d='M64 24a24 24 0 1 0 0 48 24 24 0 0 0 0-48Zm0 56c-22.09 0-40 13.43-40 30v6h80v-6c0-16.57-17.91-30-40-30Z'/%3E%3C/svg%3E";

export default function Avatar({ size, url, editable, onChange }) {
  const dimensionClass = size === "big" ? "w-36 h-36" : "w-10 h-10";
  const imageSizes = size === "big" ? "144px" : "40px";
  const supabase = useSupabaseClient();
  const session = useSession();
  const [spinner, setSpinner] = useState(false);
  const imageSrc = useMemo(() => url || FALLBACK_AVATAR, [url]);

  async function uploadAvatar(ev) {
    const file = ev.target.files?.[0];

    if (file) {
      setSpinner(true);
      if (!session?.user?.id) {
        setSpinner(false);
        return;
      }
      await uploadUserProfileImage(
        supabase,
        session.user.id,
        file,
        "Avatars",
        "avatar"
      );
      if (onChange) {
        await onChange();
      }
      setSpinner(false);
    }
  }

  return (
    <div className="relative inline-block">
      <div
        className={`${dimensionClass} relative overflow-hidden rounded-full bg-gray-100`}
      >
        <Image
          src={imageSrc}
          alt="User avatar"
          fill
          sizes={imageSizes}
          className="object-cover"
        />

        {spinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spinner />
          </div>
        )}
      </div>
      {editable && (
        <label className="absolute -right-2 -bottom-2 cursor-pointer rounded-full bg-white p-2 shadow-md hover:scale-110 hover:bg-socialBlue hover:text-white transition-colors">
          <input type="file" className="hidden" onChange={uploadAvatar} />
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
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
            />
          </svg>
        </label>
      )}
    </div>
  );
}
