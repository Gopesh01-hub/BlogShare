import { useState } from "react";
import { useRouter } from "next/router";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import Card from "@/components/card";

const oauthProviders = [
  {
    id: "google",
    label: "Continue with Google",
    icon: (
      <svg className="size-8 mt-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
      </svg>
    ),
  },
  {
    id: "github",
    label: "Continue with GitHub",
    icon: (
      <svg className="size-8 mt-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
        <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
      </svg>
    ),
  },
];

function isRowLevelSecurityError(err) {
  if (!err) {
    return false;
  }
  const code = err.code || err.status || err.error_code;
  const message = typeof err.message === "string" ? err.message.toLowerCase() : "";
  return code === "42501" || message.includes("row level security");
}

export default function Login() {
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loginWithProvider(provider) {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();

      if (!trimmedEmail || !password) {
        throw new Error("Email and password are required.");
      }

      if (mode === "signup" && !trimmedName) {
        throw new Error("Please enter your name.");
      }

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          throw signInError;
        }
        router.replace("/");
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
            },
          },
        });
        if (signUpError) {
          throw signUpError;
        }
        if (signUpData?.user?.id) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: signUpData.user.id,
              name: trimmedName,
            });
          if (profileError) {
            if (isRowLevelSecurityError(profileError)) {
              console.warn("Profile upsert skipped because of RLS policy", profileError);
            } else {
              throw profileError;
            }
          }
        }
        setMessage("Account created! Check your inbox for a confirmation email.");
        setMode("signin");
        setName("");
      }
    } catch (err) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setName("");
    setError("");
    setMessage("");
  }

  return (
    <div className="h-screen flex max-w-md mx-auto items-center justify-center">
      <div className="grow -mt-9 space-y-6">
        <h1 className="text-7xl text-gray-400 pb-2 flex justify-center">Login</h1>

        <Card>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === "signup" ? (
              <div>
                <label className="block text-sm font-medium text-gray-600" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-socialBlue focus:outline-none focus:ring-1 focus:ring-socialBlue"
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-gray-600" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-socialBlue focus:outline-none focus:ring-1 focus:ring-socialBlue"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-socialBlue focus:outline-none focus:ring-1 focus:ring-socialBlue"
                placeholder="********"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            {message ? <p className="text-sm text-green-600">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-socialBlue px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={toggleMode} className="font-semibold text-socialBlue hover:underline">
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </Card>

        <Card>
          <div className="space-y-3">
            {oauthProviders.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => loginWithProvider(id)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-socialBlue hover:text-white transition-all hover:scale-105"
              >
                {icon}
                <span className="text-xl">{label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
