import "@/styles/globals.css";
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import TimeAgo from 'javascript-time-ago'


import en from 'javascript-time-ago/locale/en'


export default function App({ Component, pageProps }) {
  const router=useRouter()
  const [supabaseClient]=useState(()=>createPagesBrowserClient())

  useEffect(() => {
    TimeAgo.addLocale(en);
  }, []);

  return(
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  )
}
// return <Component {...pageProps} />;
