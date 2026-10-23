import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { getRemoteCommunityComments, uploadCommunityComment } from '../api/services/community/community-supabase';
import { loadProfileOverview } from '../api/integration/newui-gateway';
import type { CommunityComment } from '../api/types/community';

function newId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes);
  else for (let i=0;i<16;i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const h = Array.from(bytes, v => v.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export default function CommentsScreen() {
  const {postId} = useLocalSearchParams<{postId?:string}>();
  const [rows,setRows] = useState<CommunityComment[]>([]);
  const [text,setText] = useState('');
  const [pending,setPending] = useState(false);
  const [error,setError] = useState('');
  const load=useCallback(async()=>{
    if(!postId) {setError('Thiếu mã bài viết.');return;}
    try{setRows(await getRemoteCommunityComments(postId));setError('');}
    catch(e){setError(e instanceof Error?e.message:String(e));}
  },[postId]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const submit=async()=>{
    if(pending||!postId||!text.trim())return;
    setPending(true);
    try{
      const profile=await loadProfileOverview();
      const comment:CommunityComment={id:newId(),name:profile.fullName||profile.username||'TrekkEZ',text:text.trim(),time:new Date().toISOString()};
      await uploadCommunityComment(postId,comment);
      const confirmed=await getRemoteCommunityComments(postId);
      if(!confirmed.some(c=>c.id===comment.id))throw new Error('Supabase chưa xác nhận đã lưu bình luận.');
      setText('');setRows(confirmed);setError('');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setPending(false);}
  };
  return <SafeAreaView style={{flex:1,backgroundColor:'#F8FAFC',padding:20}}>
    <TouchableOpacity onPress={()=>router.back()}><Text style={{fontWeight:'700',fontSize:18,color:'#0F172A'}}>‹ COMMENTS</Text></TouchableOpacity>
    {error?<Text style={{color:'#B91C1C',marginVertical:12}}>{error}</Text>:null}
    <FlatList style={{flex:1,marginTop:20}} data={rows} keyExtractor={r=>r.id} ListEmptyComponent={<Text style={{color:'#64748B'}}>Chưa có bình luận.</Text>}
      renderItem={({item})=><View style={{paddingVertical:12,borderBottomColor:'#E2E8F0',borderBottomWidth:1}}><Text style={{fontWeight:'700'}}>{item.name}</Text><Text>{item.text}</Text></View>}/>
    <TextInput placeholder="Viết bình luận..." value={text} onChangeText={setText} multiline style={{backgroundColor:'#FFFFFF',borderRadius:12,padding:14,borderWidth:1,borderColor:'#CBD5E1'}}/>
    <TouchableOpacity onPress={()=>{void submit();}} disabled={pending||!text.trim()} style={{backgroundColor:'#83CFFE',padding:15,marginTop:10,borderRadius:12,alignItems:'center'}}>
      {pending?<ActivityIndicator/>:<Text style={{fontWeight:'700'}}>Gửi bình luận</Text>}
    </TouchableOpacity>
  </SafeAreaView>;
}
