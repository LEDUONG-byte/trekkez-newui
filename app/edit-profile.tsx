import React,{useCallback,useState} from 'react';
import {ActivityIndicator,SafeAreaView,ScrollView,Text,TextInput,TouchableOpacity} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {getAuthSession} from '../api/services/auth/auth-session';
import {getProfileById,updateProfile} from '../api/services/account/account-supabase';
export default function EditProfile(){
  const [fullName,setFullName]=useState('');const [username,setUsername]=useState('');
  const [bio,setBio]=useState('');const [phone,setPhone]=useState('');
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    setBusy(true);setError('');
    try{const auth=await getAuthSession();if(!auth?.userId||!auth.accessToken)throw new Error('Vui lòng đăng nhập.');
      const profile=await getProfileById(auth.accessToken,auth.userId);
      if(!profile)throw new Error('Tài khoản chưa có Profile trên Supabase.');
      setFullName(profile.full_name||'');setUsername(profile.username||'');setBio(profile.bio||'');setPhone(profile.phone||'');
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  },[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const save=async()=>{
    if(busy)return;
    if(!fullName.trim()||!username.trim()){setError('Tên và username không được rỗng.');return;}
    setBusy(true);setError('');
    try{const auth=await getAuthSession();if(!auth?.userId||!auth.accessToken)throw new Error('Phiên đăng nhập đã hết.');
      const confirmed=await updateProfile(auth.accessToken,auth.userId,{full_name:fullName.trim(),username:username.trim(),bio:bio.trim(),phone:phone.trim()});
      if(!confirmed||confirmed.full_name!==fullName.trim()||confirmed.username!==username.trim())throw new Error('Supabase chưa xác nhận thay đổi Profile.');
      router.back();
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  const field=(title:string,value:string,onChange:(text:string)=>void)=><><Text style={{marginTop:16,color:'#0F172A'}}>{title}</Text><TextInput value={value} onChangeText={onChange} style={{backgroundColor:'#FFF',padding:13,borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,marginTop:5}}/></>;
  return <SafeAreaView style={{flex:1,backgroundColor:'#F8FAFC'}}><ScrollView style={{padding:20}}>
    <TouchableOpacity onPress={()=>router.back()}><Text style={{fontWeight:'700',fontSize:18}}>‹ PROFILE</Text></TouchableOpacity>
    <Text style={{fontWeight:'700',fontSize:22,marginTop:20}}>Edit profile</Text>
    {field('Full name',fullName,setFullName)}{field('Username',username,setUsername)}
    {field('Bio',bio,setBio)}{field('Phone',phone,setPhone)}
    {error?<Text style={{color:'#B91C1C',marginVertical:12}}>{error}</Text>:null}
    <TouchableOpacity onPress={()=>{void save();}} disabled={busy} style={{backgroundColor:'#83CFFE',marginTop:20,padding:16,borderRadius:12,alignItems:'center'}}>
      {busy?<ActivityIndicator/>:<Text style={{fontWeight:'700'}}>Save changes</Text>}
    </TouchableOpacity>
  </ScrollView></SafeAreaView>;
}
