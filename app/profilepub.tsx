import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getPublicProfile, type PublicUserProfile } from '../api/services/community/social-supabase';
import { getRemoteCommunityPosts } from '../api/services/community/community-supabase';
import { getPublicActivityProfileTotals } from '../api/services/activity/activity-profile';

const GRID_ITEM_SIZE = (Dimensions.get('window').width - 48 - 16) / 3;
const STATS_CARD_SIZE = (Dimensions.get('window').width - 48 - 12) / 2;

type ProfileTab = 'STATS' | 'TIMELINE';

type ProfilePost = {
  id: string;
  image: string;
};

type ProfileStats = {
  totalActivities: number;
  totalDistanceKm: number;
  movingTimeFormatted: string;
  totalElevationGainMeters: number;
};

function formatMovingTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [activeTab, setActiveTab] = useState<ProfileTab>('STATS');
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [stats, setStats] = useState<ProfileStats>({
    totalActivities: 0,
    totalDistanceKm: 0,
    movingTimeFormatted: '0h 0m',
    totalElevationGainMeters: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      setProfile(null);
      setPosts([]);
      setError('Thiếu ID người dùng.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [profileResult, postsResult, statsResult] = await Promise.allSettled([
        getPublicProfile(id, true),
        getRemoteCommunityPosts(),
        getPublicActivityProfileTotals(id),
      ]);
      if (profileResult.status === 'rejected') throw profileResult.reason;
      const publicProfile = profileResult.value;
      if (!publicProfile) {
        setProfile(null);
        setPosts([]);
        setError('Không tìm thấy hồ sơ người dùng.');
        return;
      }
      setProfile(publicProfile);
      if (postsResult.status === 'fulfilled') {
        setPosts(postsResult.value
          .filter((post) => post.authorId === id && Boolean(post.image))
          .map((post) => ({ id: post.id, image: post.image })));
      } else {
        setPosts([]);
      }
      if (statsResult.status === 'fulfilled') {
        const totals = statsResult.value;
        setStats({
          totalActivities: totals.totalActivities,
          totalDistanceKm: Math.round(totals.totalDistanceMeters / 100) / 10,
          movingTimeFormatted: formatMovingTime(totals.totalMovingSeconds),
          totalElevationGainMeters: totals.totalElevationGainMeters,
        });
      }
      const errors = [
        postsResult.status === 'rejected'
          ? `Không tải được bài viết: ${postsResult.reason instanceof Error ? postsResult.reason.message : String(postsResult.reason)}`
          : '',
        statsResult.status === 'rejected'
          ? `Không tải được thống kê: ${statsResult.reason instanceof Error ? statsResult.reason.message : String(statsResult.reason)}`
          : '',
      ].filter(Boolean);
      setError(errors.join(' | '));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Octicons name="chevron-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerId} numberOfLines={1}>{profile?.id ?? id ?? 'PROFILE'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? <ActivityIndicator color="#0284C7" style={styles.loading} /> : null}
        {error ? (
          <View style={styles.message}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity onPress={() => { void load(); }}>
              <Text style={styles.retry}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {profile ? (
          <>
            <View style={styles.profileSection}>
              <View style={styles.profileRow}>
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Octicons name="person" size={26} color="#64748B" />
                  </View>
                )}
                <View style={styles.nameContainer}>
                  <Text style={styles.fullName}>{profile.fullName || 'TrekkEZ user'}</Text>
                  <Text style={styles.username}>@{profile.username || profile.id.slice(0, 8)}</Text>
                </View>
              </View>
              <View style={styles.counters}>
                <View style={styles.counter}>
                  <Text style={styles.counterLabel}>Follower</Text>
                  <Text style={styles.counterValue}>{profile.followerCount.toLocaleString()}</Text>
                </View>
                <View style={styles.counter}>
                  <Text style={styles.counterLabel}>Following</Text>
                  <Text style={styles.counterValue}>{profile.followingCount.toLocaleString()}</Text>
                </View>
                <View style={styles.counter}>
                  <Text style={styles.counterLabel}>Post</Text>
                  <Text style={styles.counterValue}>{posts.length.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            <View style={styles.tabToggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, activeTab === 'STATS' ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                activeOpacity={0.8}
                onPress={() => setActiveTab('STATS')}
              >
                <Octicons name="graph" size={16} color={activeTab === 'STATS' ? '#FFFFFF' : '#0F172A'} />
                <Text style={[styles.toggleBtnText, activeTab === 'STATS' ? styles.toggleTextActive : styles.toggleTextInactive]}>STATS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, activeTab === 'TIMELINE' ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                activeOpacity={0.8}
                onPress={() => setActiveTab('TIMELINE')}
              >
                <Octicons name="history" size={16} color={activeTab === 'TIMELINE' ? '#FFFFFF' : '#0F172A'} />
                <Text style={[styles.toggleBtnText, activeTab === 'TIMELINE' ? styles.toggleTextActive : styles.toggleTextInactive]}>TIMELINE</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dashedSeparator} />
            {activeTab === 'STATS' ? (
              <View style={styles.statsContainer}>
                <View style={styles.grid2x2}>
                  {[
                    { label: 'Total Distance', value: `${stats.totalDistanceKm} km`, color: '#BAE6FD' },
                    { label: 'Completed Routes', value: '—', color: '#FEF08A' },
                    { label: 'Moving Time', value: stats.movingTimeFormatted, color: '#86EFAC' },
                    { label: 'Elevation Gain', value: `${stats.totalElevationGainMeters} m`, color: '#DDD6FE' },
                  ].map((card) => (
                    <View key={card.label} style={[styles.card2x2, { backgroundColor: card.color }]}>
                      <Text style={styles.card2x2Number}>{card.value}</Text>
                      <Text style={styles.card2x2Label}>{card.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.dashedSeparator} />
                <Text style={styles.sectionTitle}>Statistics</Text>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.summaryLabel}>Activities</Text>
                    <Text style={styles.summaryValue}>{stats.totalActivities}</Text>
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>Distance</Text>
                    <Text style={styles.summaryValue}>{stats.totalDistanceKm.toLocaleString()} km</Text>
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>Time</Text>
                    <Text style={styles.summaryValue}>{stats.movingTimeFormatted}</Text>
                  </View>
                </View>
                <View style={styles.dashedSeparator} />
                <Text style={styles.sectionTitle}>Streak</Text>
                <View style={styles.streakCard}>
                  <View style={[styles.streakCircleOuter, { backgroundColor: '#F1F5F9' }]}>
                    <View style={[styles.streakCircleMiddle, { backgroundColor: '#E2E8F0' }]}>
                      <View style={[styles.streakCircleInner, { backgroundColor: '#FFFFFF' }]}>
                        <Text style={[styles.streakBadgeText, { color: '#64748B' }]}>0</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.streakTextContainer}>
                    <Text style={styles.streakTitle}>Streak not available</Text>
                    <Text style={styles.streakSubtitle}>Streak calculation is not connected yet</Text>
                  </View>
                </View>
              </View>
            ) : posts.length ? (
              <View style={styles.timelineGrid}>
                {posts.map((post, index) => (
                  <TouchableOpacity
                    key={post.id}
                    activeOpacity={0.85}
                    onPress={() => router.push({
                      pathname: '/post',
                      params: { postId: post.id, initialIndex: index.toString() },
                    })}
                  >
                    <Image source={{ uri: post.image }} style={styles.gridImage} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : !loading ? (
              <Text style={styles.empty}>Chưa có bài đăng nào.</Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 110 },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: { width: 36, height: 40, justifyContent: 'center' },
  headerId: {
    flex: 1,
    textAlign: 'center',
    color: '#0F172A',
    fontFamily: 'GoogleSans-Bold',
    fontSize: 16,
    marginHorizontal: 8,
  },
  headerSpacer: { width: 36 },
  loading: { marginBottom: 16 },
  message: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  error: { color: '#B91C1C', textAlign: 'center' },
  retry: { color: '#0284C7', fontFamily: 'GoogleSans-Bold' },
  profileSection: { marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E2E8F0' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  nameContainer: { justifyContent: 'center' },
  fullName: { color: '#0F172A', fontFamily: 'GoogleSans-Bold', fontSize: 20, includeFontPadding: false },
  username: { color: '#64748B', fontFamily: 'GoogleSans-Regular', fontSize: 14, marginTop: 2, includeFontPadding: false },
  counters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  counter: {},
  counterLabel: { color: '#0F172A', fontFamily: 'GoogleSans-Medium', fontSize: 13, includeFontPadding: false },
  counterValue: { color: '#0F172A', fontFamily: 'GoogleSans-Bold', fontSize: 16, marginTop: 2, includeFontPadding: false },
  tabToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    gap: 8,
  },
  toggleBtnActive: { backgroundColor: '#334155' },
  toggleBtnInactive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  toggleBtnText: { fontFamily: 'GoogleSans-Bold', fontSize: 13, includeFontPadding: false },
  toggleTextActive: { color: '#FFFFFF' },
  toggleTextInactive: { color: '#0F172A' },
  dashedSeparator: {
    borderBottomWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    width: '100%',
    marginVertical: 16,
  },
  statsContainer: {},
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card2x2: {
    width: STATS_CARD_SIZE,
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 80,
  },
  card2x2Number: { fontFamily: 'GoogleSans-Bold', fontSize: 18, color: '#0F172A', includeFontPadding: false },
  card2x2Label: { fontFamily: 'GoogleSans-Medium', fontSize: 13, color: '#334155', marginTop: 4, includeFontPadding: false },
  sectionTitle: {
    fontFamily: 'GoogleSans-Bold',
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 12,
    includeFontPadding: false,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontFamily: 'GoogleSans-Medium', fontSize: 13, color: '#64748B', includeFontPadding: false },
  summaryValue: { fontFamily: 'GoogleSans-Bold', fontSize: 15, color: '#0F172A', marginTop: 4, includeFontPadding: false },
  streakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  streakCircleOuter: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  streakCircleMiddle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  streakCircleInner: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  streakBadgeText: { fontFamily: 'GoogleSans-Bold', fontSize: 18, includeFontPadding: false },
  streakTextContainer: { flex: 1 },
  streakTitle: { fontFamily: 'GoogleSans-Bold', fontSize: 15, color: '#0F172A', includeFontPadding: false },
  streakSubtitle: { fontFamily: 'GoogleSans-Regular', fontSize: 13, color: '#64748B', marginTop: 2, includeFontPadding: false },
  timelineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridImage: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  empty: { color: '#64748B', textAlign: 'center', paddingVertical: 28 },
});
