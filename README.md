<div align="center">

# Next.js + Supabase Social Feed

A modern social network prototype built with **Next.js 14**, **Supabase**, and **Tailwind CSS**.  
Create posts with photos, tag friends, react, comment, manage friendships, and stay notified — all backed by a fully managed PostgreSQL database.

</div>

---

## ✨ Highlights

- **Supabase Auth & Profiles** – email/password and OAuth sign‑in with profile avatars, covers, and “About me” editing.
- **News Feed & Comments** – share posts with photos, moods, tagged friends, and threaded comments.
- **Reactions & Saves** – like posts, bookmark them, and keep private saved collections.
- **Friend Graph** – send, accept, reject, and cancel friend requests with live status on every profile.
- **Mood & Location Filters** – browse the feed via quick mood presets and location metadata.
- **Notifications Hub** – dedicated page for pending friendship requests and tag mentions.
- **Responsive UI** – Tailwind‑powered layout that adapts gracefully to desktop and mobile breakpoints.

---

## 🧱 Tech Stack

| Layer            | Tools                                                                 |
|------------------|-----------------------------------------------------------------------|
| Framework        | [Next.js 14](https://nextjs.org/) with the App Router                 |
| UI               | [React 18](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) |
| Auth + Database  | [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security)    |
| Storage          | Supabase Storage buckets for avatars, covers, and post photos         |
| Utilities        | `@supabase/auth-helpers`, `javascript-time-ago`, `react-spinners`     |

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** `>= 18.17` (see `package.json` engines field)
- A **Supabase project** with SQL and Storage access
- Optional: `npm`, `yarn`, `pnpm`, or `bun` for dependency management

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd temp
npm install
```

### 3. Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Fill in the values from your Supabase project:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> **Note:** You do **not** need a service role key in the browser. All database reads/writes are secured with Row Level Security (RLS) policies.

### 4. Set Up Supabase

Run the SQL below in the Supabase SQL editor to create the tables the app expects.  
Feel free to adjust constraints or column names as you evolve the product.

```sql
-- Profiles -------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  avatar text,
  cover text,
  place text,
  about text,
  created_at timestamp with time zone default now()
);

-- Posts & threaded comments -------------------------------------
create table if not exists public.post (
  id uuid primary key default uuid_generate_v4(),
  auther uuid references public.profiles(id) on delete cascade,
  parent uuid references public.post(id) on delete cascade,
  content text,
  location text,
  mood text,
  photos text[],
  tagged_users uuid[],
  tagged_user_names text[],
  hidden boolean default false,
  created_at timestamp with time zone default now()
);

-- Friendships ----------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','rejected')),
  created_at timestamp with time zone default now(),
  responded_at timestamp with time zone
);

-- Likes ----------------------------------------------------------
create table if not exists public.likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.post(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (post_id, user_id)
);

-- Saved posts ----------------------------------------------------
create table if not exists public.saved_post (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.post(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (user_id, post_id)
);

-- Notifications --------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.post(id) on delete cascade,
  type text not null,                -- e.g. 'tag'
  payload jsonb default '{}'::jsonb, -- arbitrary metadata
  read boolean default false,
  created_at timestamp with time zone default now()
);
```

#### Storage Buckets

Create three public buckets in **Supabase Storage**:

| Bucket       | Purpose                      |
|--------------|------------------------------|
| `Avatars`    | User avatar uploads          |
| `coverPhotos`| Profile cover images         |
| `photos`     | Post attachments             |

Each bucket should allow the `authenticated` role to upload new files and read existing ones. The helper in `helpers/user.js` assumes public URLs.

#### Row Level Security (RLS)

Enable RLS on every table and add policies such as:

- **Profiles**: users can `select` any profile, `update` only their own.
- **Post**: authenticated users can insert; owners can update/delete; everyone can read non-hidden posts, or their own hidden posts.
- **Friendships/Likes/Saved/Notifications**: restrict reads and writes to the acting user.

Supabase has policy templates you can adapt quickly. Make sure the policies match the inserts/updates the UI performs.

### 5. Run the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign up using the Supabase Auth UI flow.

### 6. Production Build

```bash
npm run build
npm start
```

Deploy anywhere that supports Node 18+, such as Vercel or Supabase Edge Functions (with SSR).

---

## 📁 Project Structure

```
temp/
├─ components/         # Reusable UI (avatars, cards, notifications, tabs, etc.)
├─ context/            # React context for the signed-in profile
├─ helpers/            # Supabase storage helpers & utility lists
├─ pages/              # Next.js route pages (feed, profile, notifications, saved…)
├─ public/             # Static assets
├─ styles/             # Tailwind global styles
└─ .env.example        # Supabase environment template
```

Key flows:

- The feed (`pages/index.js`) fetches posts, applies mood filters, and renders with `PostCard`.
- Profiles (`pages/profile.js`) fetch Supabase data, manage friendships, and gate unauthenticated users.
- Notifications (`pages/notifications.js`) merge friend requests and tag alerts.
- Saved posts (`pages/saved.js`) hydrate from the `saved_post` table.

---

## 🧪 Useful Scripts

| Command        | Description                                  |
|----------------|----------------------------------------------|
| `npm run dev`  | Start the local development server           |
| `npm run build`| Compile production assets                    |
| `npm run start`| Serve the production build                   |
| `npm run lint` | Run Next.js ESLint configuration             |

---

## 🛡️ Environment & Security Tips

- Never expose the Supabase **service role** key in the browser; only use the anon key.
- Configure OAuth redirect URLs (e.g., Google, GitHub) to point at your deployment domains.
- Tailor RLS policies whenever you introduce new tables or change business rules.
- Consider enabling Supabase email integrations for verification and password reset flows.

---

## 🤝 Contributing

1. Fork the repository & create a feature branch.
2. Run `npm run lint` and exercise the relevant flows locally.
3. Open a pull request describing the change and any schema updates.

Bug reports, feature ideas, and pull requests are very welcome!

---

## 📄 License

This project is released under the **MIT License**.  
Feel free to remix, extend, and deploy it as a foundation for your own social platform.
