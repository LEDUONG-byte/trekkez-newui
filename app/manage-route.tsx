import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Octicons } from '@expo/vector-icons';
import RouteMapWeb from '../components/RouteMapWeb';
import { getRemoteRouteDetail, type RemoteRouteDetail } from '../api/services/route/route-detail';

export default function ManageRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const routeId = typeof params.id === 'string' ? params.id : '';
  const [route, setRoute] = useState<RemoteRouteDetail | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const camera = useRef<any>(null);
  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try {
      if (!routeId) throw new Error('Thiếu mã Route.');
      setRoute(await getRemoteRouteDetail(routeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRoute(null);
    } finally { setBusy(false); }
  }, [routeId]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const start = route?.points[0] ?? null;
  const end = route && route.points.length > 1 ? route.points[route.points.length - 1] : null;
  const center = start?.coordinate ?? route?.geometry[0] ?? [106.6882, 10.8225];
  const token = process.env.EXPO_PUBLIC_MAPBOX_KEY ?? '';
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Quay lại"><Octicons name="chevron-left" size={24} color="#64748B" /></TouchableOpacity>
          <Text style={styles.heading}>MANAGE ROUTE</Text>
          <TouchableOpacity onPress={() => { void refresh(); }} accessibilityLabel="Tải lại Route"><Octicons name="sync" size={20} color="#64748B" /></TouchableOpacity>
        </View>
        {busy && <ActivityIndicator color="#2563EB" style={{ marginVertical: 36 }} />}
        {!!error && <Text style={styles.error} selectable>{error}</Text>}
        {route && <>
          <View style={styles.card}>
            <Text style={styles.name}>{route.name}</Text>
            <Text style={styles.subtext}>{route.description}</Text>
            <View style={styles.stats}>
              <Text style={styles.stat}>Quãng đường: {route.distanceKm === null ? 'Chưa có' : `${route.distanceKm.toFixed(2)} km`}</Text>
              <Text style={styles.stat}>Dự kiến: {route.durationMinutes === null ? 'Chưa có' : `${route.durationMinutes} phút`}</Text>
            </View>
          </View>
          <View style={styles.mapCard}>
            {Platform.OS === 'web' && (start || route.geometry.length > 1) ?
              <RouteMapWeb accessToken={token} cameraRef={camera} onMapPress={() => {}} onCameraChanged={() => {}}
                centerCoordinate={center as [number,number]}
                startPoint={start} destinationPoint={end} selectedPin={null}
                waypoints={route.points.slice(1,-1)} routeGeometry={route.geometry}/>
              : <View style={styles.mapFallback}><Text style={styles.subtext}>Bản đồ xem Route chỉ khả dụng trên Web khi có tọa độ và Mapbox.</Text></View>}
          </View>
          {route.waypointError && <Text style={styles.error} selectable>Không tải được waypoint: {route.waypointError}</Text>}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Các điểm trên tuyến ({route.points.length})</Text>
            {route.points.length ? route.points.map((p, i) => <View key={p.id + ':' + i} style={styles.point}>
              <Text style={styles.pointName}>{i === 0 ? 'A' : i === route.points.length - 1 ? 'B' : i} · {p.label}</Text>
              <Text style={styles.subtext}>{p.coordinate[1].toFixed(6)}, {p.coordinate[0].toFixed(6)}</Text>
            </View>) : <Text style={styles.subtext}>Route chưa có waypoint đọc được.</Text>}
          </View>
          <Text style={styles.notice}>Chế độ xem dữ liệu Supabase. Chức năng chỉnh sửa Route chưa được kết nối nên không ghi thay đổi.</Text>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 24, paddingVertical: 22, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  heading: { fontFamily: 'GoogleSans-Bold', fontWeight:'700', fontSize: 21, color: '#0F172A' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: 20, marginBottom: 18 },
  name: { fontFamily: 'GoogleSans-Bold', fontSize: 20, color: '#0F172A', marginBottom: 10 },
  subtext: { color: '#64748B', lineHeight: 22 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' },
  stat: { color: '#2563EB', fontWeight: '700' },
  mapCard: { width: '100%', height: 310, overflow: 'hidden', borderRadius: 16, backgroundColor:'#F0FDF4', marginBottom: 18, position:'relative' },
  mapFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22 },
  sectionTitle: { color: '#0F172A', fontSize: 17, fontWeight: '700', marginBottom: 8 },
  point: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  pointName: { fontWeight: '700', color: '#0F172A' },
  error: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 14, marginBottom: 15, borderRadius: 10 },
  notice: { color: '#64748B', fontSize: 12, lineHeight: 18 },
});
