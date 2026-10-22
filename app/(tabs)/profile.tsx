import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ImageSourcePropType,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { loadProfileOverview, newUiAuth } from '../../api/integration/newui-gateway';
import { getPublicProfile } from '../../api/services/community/social-supabase';
import { getRemoteCommunityPosts } from '../../api/services/community/community-supabase';

const { width } = Dimensions.get('window');

// 1. TÍNH TOÁN KÍCH THƯỚC ĐỘNG
const GRID_ITEM_SIZE = (width - 48 - 16) / 3;
const STATS_CARD_SIZE = (width - 48 - 12) / 2;

// =====================================================================
// 2. HELPER CALCULATE STREAK COLORS (Dải màu dốc theo cấp độ Streak)
// =====================================================================
const getStreakColors = (streak: number | string = 0) => {
    const num = typeof streak === 'number' ? streak : parseInt(String(streak), 10) || 0;

    if (num <= 0) {
        return {
            outer: '#F1F5F9', // Neutral Gray 100
            middle: '#E2E8F0', // Gray 200
            inner: '#FFFFFF', // White
            text: '#64748B', // Slate 500
        };
    }
    if (num < 7) {
        return {
            outer: '#FEF3C7', // Amber 100
            middle: '#FDE68A', // Amber 200
            inner: '#FFFBEB', // Amber 50
            text: '#B45309', // Amber 700
        };
    }
    if (num < 30) {
        return {
            outer: '#FFEDD5', // Orange 100
            middle: '#FED7AA', // Orange 200
            inner: '#FFF7ED', // Orange 50
            text: '#C2410C', // Orange 700
        };
    }
    if (num < 100) {
        return {
            outer: '#FEE2E2', // Red 100
            middle: '#FCA5A5', // Red 300
            inner: '#FEF2F2', // Red 50
            text: '#B91C1C', // Red 700
        };
    }
    // 100+ Days Legend
    return {
        outer: '#DDD6FE', // Purple 200
        middle: '#C4B5FD', // Purple 300
        inner: '#F5F3FF', // Purple 50
        text: '#6D28D9', // Purple 700
    };
};

// =====================================================================
// 3. TYPES & INTERFACES
// =====================================================================
interface UserProfile {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: ImageSourcePropType | string;
    followersCount: number;
    followingCount: number;
}

interface HighlightCard {
    label: string;
    value: string;
    color: string;
}

interface UserStats {
    highlightCards: HighlightCard[];
    totalActivities: number;
    totalDistanceKm: number;
    movingTimeFormatted: string;
    currentStreak: number;
    streakTitle?: string;
    streakGoalText?: string;
}

interface TimelinePost {
    id: string;
    imageUrl: ImageSourcePropType | string;
}

// =====================================================================
// 4. MOCK DATA
// =====================================================================
const MOCK_USER_PROFILE: UserProfile = {
    id: 'usr_12345',
    fullName: 'Le Van Duong',
    username: 'duong_duong',
    avatarUrl: require('../../assets/images/logoW.png'),
    followersCount: 1240,
    followingCount: 350,
};

const MOCK_USER_STATS: UserStats = {
    highlightCards: [
        { label: 'Total Distance', value: '128 km', color: '#BAE6FD' },
        { label: 'Completed Routes', value: '12', color: '#FEF08A' },
        { label: 'Moving Time', value: '54 hrs', color: '#86EFAC' },
        { label: 'Elevation Gain', value: '1,450 m', color: '#DDD6FE' },
    ],
    totalActivities: 15,
    totalDistanceKm: 128,
    movingTimeFormatted: '54h 20m',
    currentStreak: 30,
    streakTitle: 'How it work?',
    streakGoalText: 'Go outside and touch grass for 15 min',
};

const MOCK_TIMELINE_POSTS: TimelinePost[] = [
    { id: 'post_1', imageUrl: require('../../assets/images/onboarding1.png') },
    { id: 'post_2', imageUrl: require('../../assets/images/onboarding2.png') },
    { id: 'post_3', imageUrl: require('../../assets/images/logoW.png') },
    { id: 'post_4', imageUrl: require('../../assets/images/onboarding1.png') },
];

// =====================================================================
// 5. MAIN COMPONENT SCREEN
// =====================================================================
export default function ProfileScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'STATS' | 'TIMELINE'>('STATS');

    const [profileData, setProfileData] = useState<UserProfile>({
        id: '', fullName: '', username: '', avatarUrl: require('../../assets/images/logoW.png'),
        followersCount: 0, followingCount: 0,
    });
    const [statsData, setStatsData] = useState<UserStats>({
        highlightCards: [
            { label: 'Total Distance', value: '0 km', color: '#BAE6FD' },
            { label: 'Completed Routes', value: '—', color: '#FEF08A' },
            { label: 'Moving Time', value: '0h 0m', color: '#86EFAC' },
            { label: 'Elevation Gain', value: '0 m', color: '#DDD6FE' },
        ],
        totalActivities: 0, totalDistanceKm: 0, movingTimeFormatted: '0h 0m',
        currentStreak: 0,
        streakTitle: 'Streak not available',
        streakGoalText: 'Streak calculation is not connected yet',
    });
    const [timelineData, setTimelineData] = useState<TimelinePost[]>([]);
    const [loadError, setLoadError] = useState('');
    const [busy, setBusy] = useState(true);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const refresh = useCallback(async () => {
        setBusy(true); setLoadError('');
        try {
            const overview = await loadProfileOverview();
            const [social, posts] = await Promise.all([
                getPublicProfile(overview.id).catch(() => null),
                getRemoteCommunityPosts().catch(() => []),
            ]);
            setProfileData({
                id: overview.id, fullName: overview.fullName || overview.username || 'TrekkEZ user',
                username: overview.username || overview.id.slice(0, 8),
                avatarUrl: overview.avatarUrl || require('../../assets/images/logoW.png'),
                followersCount: social?.followerCount ?? 0,
                followingCount: social?.followingCount ?? 0,
            });
            setTimelineData(posts.filter((p) => p.authorId === overview.id && Boolean(p.image))
                .map((p) => ({ id: p.id, imageUrl: p.image })));
            setStatsData({
                highlightCards: [
                    { label: 'Total Distance', value: `${overview.totalDistanceKm} km`, color: '#BAE6FD' },
                    { label: 'Completed Routes', value: '—', color: '#FEF08A' },
                    { label: 'Moving Time', value: overview.movingTimeFormatted, color: '#86EFAC' },
                    { label: 'Elevation Gain', value: `${overview.totalElevationGainMeters} m`, color: '#DDD6FE' },
                ],
                totalActivities: overview.totalActivities,
                totalDistanceKm: overview.totalDistanceKm,
                movingTimeFormatted: overview.movingTimeFormatted,
                currentStreak: 0,
                streakTitle: 'Streak not available',
                streakGoalText: 'Streak calculation is not connected yet',
            });
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : String(error));
        } finally { setBusy(false); }
    }, []);
    useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
    const doSignOut = async () => {
        try {
            await newUiAuth.signOut();
            setSettingsVisible(false);
            router.replace('/login');
        } catch (error) { setLoadError(error instanceof Error ? error.message : String(error)); }
    };

    const streakColors = getStreakColors(statsData.currentStreak);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* --- HEADER --- */}
                <View style={styles.headerBar}>
                    <Text style={styles.headerTitle}>PROFILE</Text>
                    <View style={styles.headerRightBtns}>
                        <TouchableOpacity style={styles.circleHeaderBtn} activeOpacity={0.7}>
                            <Octicons name="upload" size={18} color="#0F172A" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.circleHeaderBtn} activeOpacity={0.7} onPress={() => setSettingsVisible(true)}>
                            <Octicons name="gear" size={18} color="#0F172A" />
                        </TouchableOpacity>
                    </View>
                </View>

                {busy ? <ActivityIndicator color="#0284C7" /> : null}
                {loadError ? <Text style={{ color: '#B91C1C' }} onPress={() => { void refresh(); }}>{loadError} (tap to retry)</Text> : null}
                {/* --- USER INFO ROW --- */}
                <View style={styles.userInfoSection}>
                    <View style={styles.profileRow}>
                        <Image
                            source={typeof profileData.avatarUrl === 'string' ? { uri: profileData.avatarUrl } : profileData.avatarUrl}
                            style={styles.avatar}
                        />
                        <View style={styles.nameContainer}>
                            <Text style={styles.userName}>{profileData.fullName}</Text>
                            <Text style={styles.userId}>@{profileData.username}</Text>
                        </View>
                    </View>

                    {/* Bộ đếm */}
                    <View style={styles.statsCounterRow}>
                        <View style={styles.statCounterItem}>
                            <Text style={styles.statLabel}>Follower</Text>
                            <Text style={styles.statValue}>{profileData.followersCount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.statCounterItem}>
                            <Text style={styles.statLabel}>Following</Text>
                            <Text style={styles.statValue}>{profileData.followingCount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.statCounterItem}>
                            <Text style={styles.statLabel}>Post</Text>
                            <Text style={styles.statValue}>{timelineData.length}</Text>
                        </View>
                    </View>
                </View>

                {/* --- TAB NAVIGATION BUTTONS --- */}
                <View style={styles.tabToggleRow}>
                    <TouchableOpacity
                        style={[
                            styles.toggleBtn,
                            activeTab === 'STATS' ? styles.toggleBtnActive : styles.toggleBtnInactive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setActiveTab('STATS')}
                    >
                        <Octicons name="graph" size={16} color={activeTab === 'STATS' ? '#FFFFFF' : '#0F172A'} />
                        <Text style={[styles.toggleBtnText, activeTab === 'STATS' ? styles.toggleTextActive : styles.toggleTextInactive]}>
                            STATS
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.toggleBtn,
                            activeTab === 'TIMELINE' ? styles.toggleBtnActive : styles.toggleBtnInactive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setActiveTab('TIMELINE')}
                    >
                        <Octicons name="history" size={16} color={activeTab === 'TIMELINE' ? '#FFFFFF' : '#0F172A'} />
                        <Text style={[styles.toggleBtnText, activeTab === 'TIMELINE' ? styles.toggleTextActive : styles.toggleTextInactive]}>
                            TIMELINE
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Phân cách nét đứt 1 đường duy nhất */}
                <View style={styles.dashedSeparator} />

                {/* --- DYNAMIC CONTENT RENDERER --- */}
                {activeTab === 'STATS' ? (
                    <View style={styles.statsContainer}>

                        {/* Bảng chỉ số tóm tắt (2x2 Grid) */}
                        <View style={styles.grid2x2}>
                            {statsData.highlightCards.map((card, index) => (
                                <View key={index} style={[styles.card2x2, { backgroundColor: card.color }]}>
                                    <Text style={styles.card2x2Number}>{card.value}</Text>
                                    <Text style={styles.card2x2Label}>{card.label}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.dashedSeparator} />

                        {/* Thống kê dạng Text */}
                        <Text style={styles.sectionTitle}>Statistics</Text>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Activities</Text>
                                <Text style={styles.summaryValue}>{statsData.totalActivities}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Distance</Text>
                                <Text style={styles.summaryValue}>{statsData.totalDistanceKm.toLocaleString()} km</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Time</Text>
                                <Text style={styles.summaryValue}>{statsData.movingTimeFormatted}</Text>
                            </View>
                        </View>

                        <View style={styles.dashedSeparator} />

                        {/* Chuỗi hoạt động liên tiếp (Streak) */}
                        <Text style={styles.sectionTitle}>Streak</Text>
                        <View style={styles.streakCard}>
                            <View style={[styles.streakCircleOuter, { backgroundColor: streakColors.outer }]}>
                                <View style={[styles.streakCircleMiddle, { backgroundColor: streakColors.middle }]}>
                                    <View style={[styles.streakCircleInner, { backgroundColor: streakColors.inner }]}>
                                        <Text style={[styles.streakBadgeText, { color: streakColors.text }]}>
                                            {statsData.currentStreak ?? 0}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.streakTextContainer}>
                                <Text style={styles.streakTitle}>
                                    {statsData.streakTitle || 'How it work'}
                                </Text>
                                <Text style={styles.streakSubtitle}>
                                    {statsData.streakGoalText || 'Go outside and touch grass for 15 min'}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.timelineGrid}>
                        {timelineData.map((post, index) => (
                            <TouchableOpacity
                                key={post.id}
                                activeOpacity={0.85}
                                onPress={() => router.push({
                                    pathname: '/post',
                                    params: { postId: post.id, initialIndex: index.toString() },
                                })}
                            >
                                <Image
                                    source={typeof post.imageUrl === 'string' ? { uri: post.imageUrl } : post.imageUrl}
                                    style={styles.gridImage}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
            <Modal transparent visible={settingsVisible} animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
                <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,0.55)' }}>
                    <View style={{ padding: 24, backgroundColor: '#FFFFFF', borderRadius: 20, gap: 16 }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>Account</Text>
                        <TouchableOpacity onPress={() => { void doSignOut(); }} style={{ padding: 14, backgroundColor: '#FEE2E2', borderRadius: 12 }}>
                            <Text style={{ color: '#991B1B', fontWeight: '700' }}>Sign out</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSettingsVisible(false)} style={{ padding: 8 }}><Text>Cancel</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// =====================================================================
// 6. STYLES
// =====================================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 110,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 22,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    headerRightBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    circleHeaderBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfoSection: {
        marginBottom: 20,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E2E8F0',
    },
    nameContainer: {
        justifyContent: 'center',
    },
    userName: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 20,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    userId: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    statsCounterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 32,
    },
    statCounterItem: {},
    statLabel: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    statValue: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        marginTop: 2,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
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
    toggleBtnActive: {
        backgroundColor: '#334155',
    },
    toggleBtnInactive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    toggleBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    toggleTextActive: {
        color: '#FFFFFF',
    },
    toggleTextInactive: {
        color: '#0F172A',
    },

    dashedSeparator: {
        borderBottomWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        width: '100%',
        marginVertical: 16,
    },

    statsContainer: {},
    grid2x2: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    card2x2: {
        width: STATS_CARD_SIZE,
        padding: 16,
        borderRadius: 16,
        justifyContent: 'center',
        minHeight: 80,
    },
    card2x2Number: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    card2x2Label: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#334155',
        marginTop: 4,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    sectionTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#0F172A',
        marginBottom: 12,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryItem: {},
    summaryLabel: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    summaryValue: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        marginTop: 4,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    streakCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    streakCircleOuter: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    streakCircleMiddle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    streakCircleInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    streakBadgeText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    streakTextContainer: {
        flex: 1,
    },
    streakTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 15,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    streakSubtitle: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
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
});