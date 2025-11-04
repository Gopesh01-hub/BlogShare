import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

const { createContext, useState, useEffect } = require("react");

export const userContext=createContext({});

export function UserContextProvider({children}){
    const [profile,setProfile]=useState(null);
    const supabase=useSupabaseClient();
    const session=useSession();
    useEffect(()=>{
        if(!session?.user?.id){
            return;
        }
        supabase.from('profiles').select().eq('id',session.user.id).then((result)=>{setProfile(result.data[0])});
    },[session?.user?.id])
    


    return(
        <userContext.Provider value={profile}>
            {children}
        </userContext.Provider>
    );
}