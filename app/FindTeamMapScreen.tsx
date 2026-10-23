import React, { useCallback, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { loadTeamCards } from '../api/integration/newui-gateway';
import { requestTeamJoin } from '../api/services/team/team-join-request';
import type { TeamCard } from '../api/integration/newui-mappers';

export default function FindTeamScreen() {
  const [teams, setTeams] = useState<TeamCard[]>([]);
  const [busy, setBusy] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try { setTeams((await loadTeamCards()).filter((team) => team.allowMatchmaking)); }
    catch (e) { setTeams([]); setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const join = async (team: TeamCard) => {
    setWorkingId(team.id); setError(''); setNotice('');
    try { await requestTeamJoin(team.id); setNotice(`Join request sent to ${team.name}.`); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setWorkingId(''); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>‹ TEAM</Text></TouchableOpacity>
      <Text style={{ fontSize: 25, fontWeight: '700', color: '#0F172A' }}>Find a team</Text>
      <Text style={{ color: '#64748B' }}>Teams below are loaded from Supabase. Map pins cannot be shown because the current Team card data does not include coordinates.</Text>
      {busy ? <ActivityIndicator color="#0284C7" /> : null}
      {error ? <Text style={{ color: '#B91C1C' }} onPress={() => { void refresh(); }}>{error} · tap to retry</Text> : null}
      {notice ? <Text style={{ color: '#047857' }}>{notice}</Text> : null}
      {!busy && teams.length === 0 && !error ? <Text style={{ color: '#64748B' }}>No public teams are recruiting right now.</Text> : null}
      {teams.map((team) => <View key={team.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, gap: 8 }}>
        <Text style={{ fontWeight: '700', fontSize: 17, color: '#0F172A' }}>{team.name}</Text>
        <Text style={{ color: '#475569' }}>{team.description || 'No description'}</Text>
        <Text style={{ color: '#64748B' }}>{team.membersCount} members · {team.createdAt || 'Date unavailable'}</Text>
        {team.isOwnedByYou || team.isJoined
          ? <TouchableOpacity onPress={() => router.push({ pathname: '/team-manage', params: { teamId: team.id } })} style={{ padding: 12, backgroundColor: '#E0F2FE', borderRadius: 10 }}><Text style={{ textAlign: 'center', color: '#075985', fontWeight: '700' }}>Open team</Text></TouchableOpacity>
          : <TouchableOpacity disabled={workingId === team.id} onPress={() => { void join(team); }} style={{ padding: 12, backgroundColor: '#0284C7', borderRadius: 10 }}><Text style={{ textAlign: 'center', color: '#FFFFFF', fontWeight: '700' }}>{workingId === team.id ? 'Sending…' : 'Request to join'}</Text></TouchableOpacity>}
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}
