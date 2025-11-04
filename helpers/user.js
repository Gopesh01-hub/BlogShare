

export default async function uploadUserProfileImage(
    supabase,
    userId,
    file,
    bucket,
    profileColumn
){
    return new Promise(async(resolve,reject)=>{
        const newName=Date.now()+file.name;
            const {data,error}=await supabase.storage.from(`${bucket}`).upload(newName,file);
            if(error){
                throw error;
            }
            else if(data){
                const coverUrl=process.env.NEXT_PUBLIC_SUPABASE_URL+`/storage/v1/object/public/${bucket}/`+newName;
                const {result,err}=await supabase.from('profiles').update({[profileColumn]:coverUrl}).eq('id',userId);
                if(err){
                    throw err;
                }else {
                    return resolve();
                   
                }
            }
    })
        
   
}