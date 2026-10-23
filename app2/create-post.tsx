import React,{useState} from 'react';
import { ActivityIndicator, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { getRemoteCommunityPosts, uploadCommunityPost } from '../api/services/community/community-supabase';
import { loadProfileOverview } from '../api/integration/newui-gateway';
import type { CommunityPost } from '../api/types/community';

function newId(): string {
  const bytes=new Uint8Array(16);
  if(typeof crypto !== 'undefined' && typeof crypto.getRandomValues==='function')crypto.getRandomValues(bytes);
  else for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256);
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const h=Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export default function CreatePostScreen(){
  const [title,setTitle]=useState('');const [body,setBody]=useState('');const [image,setImage]=useState('');
  const [pending,setPending]=useState(false);const [error,setError]=useState('');
  const submit=async()=>{
    if(pending)return;
    if(!title.trim()||!body.trim()){setError('Nhập tiêu đề và nội dung bài viết.');return;}
    setPending(true);setError('');
    try{
      const profile=await loadProfileOverview();
      const post:CommunityPost={id:newId(),author:profile.fullName||profile.username||'TrekkEZ',time:new Date().toISOString(),location:'',title:title.trim(),content:body.trim(),image:image.trim(),likes:0,comments:0,tag:'Kinh nghiệm'};
      await uploadCommunityPost(post);
      const remote=await getRemoteCommunityPosts();
      if(!remote.some(p=>p.id===post.id))throw new Error('Supabase chưa xác nhận bài viết được lưu.');
      router.replace('/(tabs)');
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setPending(false);}
  };
  return <SafeAreaView style={{flex:1,backgroundColor:'#F8FAFC',padding:20}}>
    <TouchableOpacity onPress={()=>router.back()}><Text style={{fontWeight:'700',fontSize:18,color:'#0F172A'}}>‹ CREATE POST</Text></TouchableOpacity>
    <TextInput placeholder="Tiêu đề" value={title} onChangeText={setTitle} style={{backgroundColor:'#FFF',marginTop:25,padding:14,borderRadius:12,borderWidth:1,borderColor:'#CBD5E1'}}/>
    <TextInput placeholder="Nội dung chuyến đi" multiline value={body} onChangeText={setBody} style={{backgroundColor:'#FFF',marginTop:14,minHeight:160,textAlignVertical:'top',padding:14,borderRadius:12,borderWidth:1,borderColor:'#CBD5E1'}}/>
    <TextInput placeholder="URL ảnh công khai (không bắt buộc)" value={image} onChangeText={setImage} autoCapitalize="none" style={{backgroundColor:'#FFF',marginTop:14,padding:14,borderRadius:12,borderWidth:1,borderColor:'#CBD5E1'}}/>
    {error?<Text style={{color:'#B91C1C',marginTop:14}}>{error}</Text>:null}
    <TouchableOpacity onPress={()=>{void submit();}} disabled={pending} style={{backgroundColor:'#83CFFE',marginTop:20,padding:16,borderRadius:12,alignItems:'center'}}>
      {pending?<ActivityIndicator/>:<Text style={{fontWeight:'700'}}>Đăng bài</Text>}
    </TouchableOpacity>
  </SafeAreaView>;
}
