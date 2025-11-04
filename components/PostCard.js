'use client';
import Image from 'next/image';
import Link from 'next/link'; 
import { useCallback, useContext, useEffect, useState } from 'react';
import Avatar from "./Avatar";
import Card from "./card";
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import ReactTimeAgo from 'react-time-ago';
import { userContext } from '@/context/context';



export default function PostCard({
  id,
  content,
  created_at,
  photos,
  location,
  mood,
  tagged_users,
  tagged_user_names,
  profiles: authProfile,
  auther,
  hidden,
  onChange,
}) {
  const [dropdown, setDropdown] = useState(false);
  const dropdownToggle = () => {setDropdown(!dropdown);}
  const createdAtTimestamp = new Date(created_at).getTime();
  const isValidDate = !isNaN(createdAtTimestamp);
  const myProfile=useContext(userContext);
  const supabase=useSupabaseClient();
  const myProfileId = myProfile?.id || null;
  const isOwner =
    myProfileId &&
    (authProfile?.id === myProfileId || auther === myProfileId);
  const [likes,setLikes]=useState([]);
  const [commentText,setCommentText]=useState('');
  const [comment,setComment]=useState([]);
  const [isSaved,setIsSaved]=useState(false);
  const [isHidden,setIsHidden]=useState(Boolean(hidden));
  const [actionPending,setActionPending]=useState(false);
  const [postError,setPostError]=useState('');
  const [shareOpen,setShareOpen]=useState(false);
  const fetchSavedPost=useCallback(async()=>{
    if(!myProfileId||!id){
      return;
    }
    const {data,error}=await supabase
      .from('saved_post')
      .select()
      .eq('user_id',myProfileId)
      .eq('post_id',id);
    if(error){
      return;
    }
    setIsSaved((data||[]).length>0);
  },[id,myProfileId,supabase]);

  const fetchLikes=useCallback(async()=>{
    if(!id){
      return;
    }
    const {data,error}=await supabase
      .from('likes')
      .select()
      .eq('post_id',id);
    if(error){
      return;
    }
    setLikes(data||[]);
  },[id,supabase]);

  const fetchComment=useCallback(async()=>{
    if(!id){
      return;
    }
    const {data,error}=await supabase
      .from('post')
      .select('*,profiles(*)')
      .eq('parent',id);
    if(error){
      return;
    }
    setComment(data||[]);
  },[id,supabase]);

  useEffect(()=>{
    if(!id||!myProfileId){
      return;
    }
    fetchLikes();
    fetchComment();
    fetchSavedPost();
  },[id,myProfileId,fetchLikes,fetchComment,fetchSavedPost]);

  useEffect(()=>{
    setIsHidden(Boolean(hidden));
  },[hidden]);

  const shouldHideFromViewer = !isOwner && isHidden;

  const isLikedByMe = myProfileId ? !!likes?.find(like=>like.user_id===myProfileId) : false;
  const postUrl =
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000") +
    `/${id}`;
  const shareText = content ? content.slice(0, 140) : "Check out this post!";
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedText = encodeURIComponent(shareText);
  
  async function likePost(){
    if(!myProfileId){
      return;
    }
    
    if(isLikedByMe){
      await supabase
        .from('likes')
        .delete()
        .eq('post_id',id)
        .eq('user_id',myProfileId);
      await fetchLikes();
      return;
    }
    await supabase.from('likes').insert({
      post_id:id,
      user_id:myProfileId,
      
    });
    await fetchLikes();
  }


  async function submitComment(ev){
    if(!myProfileId){
      return;
    }
    if(commentText===null||commentText===''||commentText===""){
      return;
    }
    
    ev.preventDefault();
    await supabase.from('post').insert({
      parent:id,
      auther:myProfileId,
      content:commentText
    });
    await fetchComment();
    setCommentText('');
  }

  async function toggleSave(){
    if(!myProfileId){
      return;
    }
    if(!isSaved){
      await supabase
        .from('saved_post')
        .insert({
          user_id:myProfileId,
          post_id:id,
        });
    }
    else{
      await supabase
        .from('saved_post')
        .delete()
        .eq('user_id',myProfileId)
        .eq('post_id',id);
    }
    await fetchSavedPost();
  }

  async function updateHiddenState(nextHidden){
    if(!isOwner || !id){
       console.warn('updateHiddenState prevented: isOwner=', isOwner, 'id=', id);
      return;
    }
    try{
      setActionPending(true);
      setPostError('');
      console.log('Attempting update', { id, nextHidden });
      const { data, error }=await supabase
        .from('post')
        .update({hidden: nextHidden ? true : false})
        .eq('id',id)
        .select();
      console.log('Supabase update response:', {  data, error });
      if(error){
        setPostError(error.message || 'Unknown error updating visibility');
        throw error;
      }
      setIsHidden(nextHidden);
      setDropdown(false);
      if(onChange){
        onChange();
      }
    }catch(err){
      setPostError(err?.message || 'Unable to update post visibility.');
    }finally{
      setActionPending(false);
    }
  }

  async function removePost(){
    if(!isOwner || !id){
      return;
    }
    const confirmed = typeof window !== 'undefined' ? window.confirm('Delete this post permanently?') : true;
    if(!confirmed){
      return;
    }
    try{
      setActionPending(true);
      setPostError('');
      const { error}=await supabase
        .from('post')
        .delete()
        .eq('id',id);
      if(error){
        throw error;
      }
      setDropdown(false);
      if(onChange){
        onChange();
      }
    }catch(err){
      setPostError(err?.message || 'Unable to delete post.');
    }finally{
      setActionPending(false);
    }
  }

  async function copyLink(){
    try{
      if(typeof navigator !== 'undefined' && navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(postUrl);
      }
    }catch (err){
      console.error('Failed to copy link', err);
    }
  }
  
  const taggedPeople =
    tagged_user_names?.map((name, index) => ({
      id: tagged_users?.[index],
      name,
    })).filter((item) => item && (item.id || item.name)) || [];

  function toggleShareMenu(){
    setShareOpen((prev)=>!prev);
  }

  function openShareLink(url){
    if(typeof window !== 'undefined'){
      window.open(url,'_blank','noopener,noreferrer');
    }
    setShareOpen(false);
  }
  
  if (shouldHideFromViewer) {
    return null;
  }

    return (
        <Card>
          {postError ? (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {postError}
            </div>
          ) : null}
          <div className="flex gap-4 ">
            <div>
              <Link href={"/profile/"+authProfile?.id}>
                <Avatar url={authProfile?.avatar}/>
              </Link>     
            </div>
            <div className="leading-5 grow">
              <p className="text-sm text-gray-600">
                <Link href={"/profile/"+authProfile?.id} className="hover:underline font-semibold text-black">
                  {authProfile?.name}
                </Link>
                {taggedPeople.length > 0 ? (
                  <span>
                    {" with "}
                    {taggedPeople.map((person, index) => (
                      <span key={person.id || person.name}>
                        {index > 0 ? ", " : ""}
                        {person.id ? (
                          <Link
                            href={`/profile/${person.id}`}
                            className="font-medium text-socialBlue hover:underline"
                          >
                            @{person.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-socialBlue">@{person.name}</span>
                        )}
                      </span>
                    ))}
                  </span>
                ) : null}
              </p>
              {location ? (
                <div className="text-sm text-gray-500">📍 {location}</div>
              ) : null}
              {mood ? (
                <div className="text-sm text-gray-500">😊 {mood}</div>
              ) : null}
              <div className="text-xs text-gray-400">
                {isValidDate ? <ReactTimeAgo date={createdAtTimestamp}/> : <span>Invalid date</span>}
              </div>
              {isOwner && isHidden ? (
                <div className="mt-2 rounded-md border border-dashed border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                  Hidden from everyone else. Choose “Show post” to make it visible again.
                </div>
              ) : null}
            </div>
            
            <div className="relative mb-3 text-gray-500">
              <button
                type="button"
                onClick={dropdownToggle}
                className="rounded-full p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-socialBlue"
              >
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
                    d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                  />
                </svg>
              </button>
              <div
                className={`absolute right-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] max-w-xs rounded-lg bg-white shadow-md shadow-gray-300 sm:w-56 sm:max-w-none ${dropdown ? "" : "hidden"}`}
              >
                <div className="mx-2 my-1 space-y-1">
                    <button
                      type="button"
                      onClick={toggleSave}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:scale-105 hover:bg-socialBlue hover:text-white"
                    >
                      {!isSaved ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a2.15 2.15 0 0 1 1.743-1.342 48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185V19.5M4.664 4.664 19.5 19.5" />
                        </svg>
                      )}
                      <span>{isSaved ? 'Unsave post' : 'Save post'}</span>
                    </button>
                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          onClick={() => updateHiddenState(!isHidden)}
                          disabled={actionPending}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:scale-105 hover:bg-socialBlue hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                          <span>{isHidden ? 'Show post' : 'Hide post'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={removePost}
                          disabled={actionPending}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:scale-105 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                          <span>Delete post</span>
                        </button>
                      </>
                    ) : null}
                </div>
              </div>
            </div>


          </div>
          <div className=" my-3 text-sm">
            <p>{content} </p>
            {photos?.length>0&&(
              <div className="flex flex-wrap gap-2">
                {photos.map((photo) => (
                  <div key={photo} className="relative mt-3 h-48 w-full overflow-hidden rounded-md bg-black/5 sm:w-48">
                    <Image
                      src={photo}
                      alt="Post attachment"
                      fill
                      sizes="192px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            {/* <div className=" rounded-md overflow-hidden fill-transparen mt-3">
              <img className=" rounded-md" src="https://media.istockphoto.com/id/1707972776/photo/santorini-island-greece.webp?b=1&s=170667a&w=0&k=20&c=eMUnhNL0LeyW6eOxtqaL0qJrLWdjgkY7_8L3Xnjv0s0="></img>
            </div> */}
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button className="flex items-center gap-1" onClick={likePost} >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={"size-5 mt-0.5 "+(isLikedByMe?'fill-red-500 text-red-500':'')}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
              {likes?.length}
            </button>
            <button className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
              {comment?.length}
            </button>
            <div className="relative">
              <button className="flex items-center gap-1" type="button" onClick={toggleShareMenu}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
                Share
              </button>
              {shareOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-[calc(100vw-3rem)] max-w-xs rounded-md border border-gray-200 bg-white p-2 shadow-lg sm:w-48 sm:max-w-none">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-100"
                    onClick={() => {
                      copyLink();
                      setShareOpen(false);
                    }}
                  >
                    <span>Copy link</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-100"
                    onClick={() => openShareLink(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`)}
                  >
                    <span>Share via WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-100"
                    onClick={() => openShareLink(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`)}
                  >
                    <span>Share on Telegram</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-100"
                    onClick={() => openShareLink(`mailto:?subject=${encodeURIComponent('Have a look at this post')}&body=${encodedText}%0A${encodedUrl}`)}
                  >
                    <span>Share via Email</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Avatar url={myProfile?.avatar}/>
            
            <div className="w-full relative ">
              <form onSubmit={submitComment} >
              <input
                className="border h-11 px-3 py-2 w-full rounded-3xl overflow-hiddenborder pr-24"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(ev)=>{setCommentText(ev.target.value)}}
              />
              <button
                type="submit"
                className="absolute top-1.5 right-2 rounded-full bg-socialBlue px-4 py-1 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                disabled={!commentText.trim()}
              >
                Send
              </button>
              </form>
            </div>
              
            
          </div>
          
          {comment?.length>0 && (
              <div >
                {comment.map(eachComment=>(
                  <div key={eachComment.created_at} className='flex items-center gap-2 mt-3'>
                    <Avatar  url={eachComment?.profiles.avatar}/>
                    <div className='bg-gray-200 rounded-3xl px-4 py-2'>
                      <div className='flex gap-2 justify-between text-sm text-gray-500'>
                        <Link href={'/profile/'+ eachComment?.profiles.id}  className=' text-sm font-bold  hover:underline h-1/4'>{eachComment?.profiles.name}  </Link>
                        {isValidDate?<ReactTimeAgo timeStyle={'twitter'} date={(new Date(eachComment.created_at)).getTime()}/>:<span>Invalid date</span>}
                      </div>
                      
                      <p >{eachComment.content} </p>
                    </div>
                    
                  </div>
                ))}
              </div>
            )}
        </Card>
         
    );
}
