import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import Spinner from "./spinner";
import uploadUserProfileImage from "@/helpers/user";

export default function Cover({url,editable,onChange}){
    const supabase =useSupabaseClient();
    const session=useSession();
    const [spinner,setSpinner]=useState(false);
    let [coverUrl,setCoverUrl]=useState("");

    useEffect(() => {
    if(url===null){
        setCoverUrl("https://media.istockphoto.com/id/1145450965/photo/santorini-island-greece.jpg?s=612x612&w=0&k=20&c=AY_kxRrkTjbDLhqpotxgW8CZp4ovEIM1tRdTrvXKcAM=");
    }
    else{
        setCoverUrl(url);
    }
    }, [url]);
    async function uploadCover(ev){
        
        const file=ev.target.files?.[0];
        console.log(file);
        if(file){
            setSpinner(true);
            await uploadUserProfileImage(supabase,session.user.id,file,'coverPhotos','cover');
            if(onChange){
                onChange();
            }
            setSpinner(false);
        }
        
    }

    return(
        <div className="relative">
            <div  className=" rounded-md -m-4 h-36 bg-cover bg-center relative" style={{ backgroundImage: `url(${coverUrl})` }}> 
                {spinner&&(
                    <div className="w-full h-full bg-white bg-opacity-80 ">
                    <div className="flex  justify-center">
                        <div className=" mt-12">
                            <Spinner/>
                        </div>
                        
                    </div>
                    
                </div>
                )}
                
            </div>
            
            {editable&&(
                
                <label className="absolute  right-0 bottom-0 bg-white mb-2 rounded-md hover:bg-socialBlue hover:text-white hover:scale-110 flex gap-1 px-3 py-1 items-center cursor-pointer shadow-md shadow-black" >
                    <input type="file" className=" hidden" onChange={uploadCover}></input>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                    Change cover image
                </label>
            )}
            
        </div>
    );
}