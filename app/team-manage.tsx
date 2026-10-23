import React,{useCallback,useState} from 'react';
import { ActivityIndicator,SafeAreaView,ScrollView,Text,TextInput,TouchableOpacity,View } from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {getRemoteTeam,getRemoteTeamMembers} from '../api/services/team/team-supabase';
import {getTeamJoinRequests,approveTeamJoinRequest,rejectTeamJoinRequest,updateTeamMaxMembers,requestTeamJoin,cancelTeamJoinRequest,getMyPendingTeamJoinRequestIds} from '../api/services/team/team-join-request';
import {searchTeamInviteCandidates,inviteUserToTeam,getMyTeamInvitation,acceptTeamInvitation,rejectTeamInvitation} from '../api/services/team/team-invitation';
import type {TeamJoinRequest} from '../api/services/team/team-join-request';
import type {TeamInviteCandidate,MyTeamInvitation} from '../api/services/team/team-invitation';
import type {TeamMember} from '../api/types/team';

export default function TeamManageScreen(){
  const params=useLocalSearchParams<{teamId?:string;id?:string}>();
  const teamId=params.teamId || params.id;
  const [name,setName]=useState('');const [owner,setOwner]=useState(false);
  const [isMember,setIsMember]=useState(false);const [pendingJoin,setPendingJoin]=useState(false);
  const [members,setMembers]=useState<TeamMember[]>([]);const [requests,setRequests]=useState<TeamJoinRequest[]>([]);
  const [invite,setInvite]=useState<MyTeamInvitation|null>(null);
  const [query,setQuery]=useState('');const [candidates,setCandidates]=useState<TeamInviteCandidate[]>([]);
  const [maxMembers,setMaxMembers]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const load=useCallback(async()=>{
    if(!teamId)return;
    setBusy(true);setError('');
    try{
      const team=await getRemoteTeam(teamId);
      if(!team)throw new Error('Không tìm thấy Team hoặc không có quyền xem.');
      setName(team.name);setOwner(team.mine);setMaxMembers(String(team.maxMembers||20));
      setIsMember(team.joined || team.mine);
      // A member/requests RPC failure must not prevent opening a valid Team.
      const details = await Promise.allSettled([
        getRemoteTeamMembers(teamId),team.mine?getTeamJoinRequests(teamId):Promise.resolve([]),
        team.mine?Promise.resolve(null):getMyTeamInvitation(teamId),
        team.mine?Promise.resolve(new Set<string>()):getMyPendingTeamJoinRequestIds(true),
      ] as const);
      const [membersState,requestsState,inviteState,pendingState]=details;
      setMembers(membersState.status==='fulfilled'?membersState.value:[]);
      setRequests(requestsState.status==='fulfilled'?requestsState.value:[]);
      setInvite(inviteState.status==='fulfilled'?inviteState.value:null);
      setPendingJoin(pendingState.status==='fulfilled'?pendingState.value.has(teamId):false);
      const failed=details.filter(part=>part.status==='rejected');
      if(failed.length) setError('Một số dữ liệu thành viên/yêu cầu chưa tải được. Thử tải lại nếu cần.');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  },[teamId]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const execute=async(fn:()=>Promise<unknown>)=>{
    if(busy)return;
    setBusy(true);setError('');
    try{await fn();await load();}catch(e){setError(e instanceof Error?e.message:String(e));setBusy(false);}
  };
  const search=async()=>{
    if(!teamId||query.trim().length<2){setError('Nhập ít nhất 2 ký tự.');return;}
    setBusy(true);setError('');
    try{setCandidates(await searchTeamInviteCandidates(query,teamId));}
    catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  const action=(text:string,fn:()=>Promise<unknown>)=><TouchableOpacity onPress={()=>{void execute(fn);}} style={{padding:10,backgroundColor:'#BAE6FD',borderRadius:9,marginTop:7,alignSelf:'flex-start'}}><Text>{text}</Text></TouchableOpacity>;
  return <SafeAreaView style={{flex:1,backgroundColor:'#F8FAFC'}}><ScrollView style={{padding:20}}>
    <TouchableOpacity onPress={()=>router.back()}><Text style={{fontWeight:'700',fontSize:18,color:'#0F172A'}}>‹ TEAM</Text></TouchableOpacity>
    <Text style={{fontWeight:'700',fontSize:23,marginVertical:15,color:'#0F172A'}}>{name||'Team management'}</Text>
    {busy?<ActivityIndicator color="#0284C7"/>:null}
    {error?<Text style={{color:'#B91C1C',marginVertical:10}}>{error}</Text>:null}
    <Text style={{fontWeight:'700',marginTop:10}}>Members ({members.length})</Text>
    {members.map(p=><Text key={p.userId} style={{marginVertical:6}}>{p.displayName} · {p.role}</Text>)}
    {!owner && !isMember && !busy && teamId && <View style={{marginTop:18}}>
      {pendingJoin
        ? action('Hủy yêu cầu tham gia',()=>cancelTeamJoinRequest(teamId))
        : action('Yêu cầu tham gia Team',()=>requestTeamJoin(teamId))}
    </View>}
    {owner? <>
      <Text style={{fontWeight:'700',marginTop:22}}>Pending join requests ({requests.length})</Text>
      {requests.map(req=><View key={req.userId} style={{paddingVertical:9,borderBottomWidth:1,borderColor:'#E2E8F0'}}>
        <Text>{req.displayName}</Text>
        {action('Approve',()=>approveTeamJoinRequest(teamId!,req.userId))}
        {action('Reject',()=>rejectTeamJoinRequest(teamId!,req.userId))}
      </View>)}
      <Text style={{fontWeight:'700',marginTop:22}}>Invite member</Text>
      <TextInput placeholder="Search user name" value={query} onChangeText={setQuery} style={{padding:12,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,marginTop:9}}/>
      {action('Search user',search)}
      {candidates.map(c=><View key={c.userId} style={{paddingVertical:10,borderBottomWidth:1,borderColor:'#E2E8F0'}}><Text>{c.displayName} @{c.username}</Text>
        {!c.isMember?action('Send invitation',()=>inviteUserToTeam(teamId!,c.userId)):null}
      </View>)}
      <Text style={{fontWeight:'700',marginTop:22}}>Maximum members</Text>
      <TextInput keyboardType="numeric" value={maxMembers} onChangeText={setMaxMembers} style={{backgroundColor:'#FFF',borderRadius:10,borderWidth:1,borderColor:'#CBD5E1',padding:12,marginTop:9}}/>
      {action('Save limit',()=>updateTeamMaxMembers(teamId!,Number(maxMembers)))}
    </>:<>
      {invite?.status==='pending'?<View style={{marginTop:22}}><Text>Invitation from {invite.inviterName}</Text>
        {action('Accept invitation',()=>acceptTeamInvitation(teamId!))}
        {action('Reject invitation',()=>rejectTeamInvitation(teamId!))}
      </View>:null}
    </>}
  </ScrollView></SafeAreaView>;
}
