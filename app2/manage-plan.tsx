import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Platform,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Octicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getRemotePlans } from '../api/services/plan/plan-team-supabase';
import { getRemoteRouteSummaries } from '../api/services/route/route-read';
import { getRemoteTeam, getRemoteTeamMembers } from '../api/services/team/team-supabase';
import { toPlanManageDetails, type PlanDetailData } from '../api/integration/manage-plan-adapter';

// Component ExpandableCard có sẵn
import ExpandableCard from '../components/ExpandableCard';

// Bảng màu cho từng cấp độ
const DIFFICULTY_CONFIG: Record<PlanDetailData['difficulty'], { bg: string; text: string }> = {
    EASY: { bg: '#EBF4FF', text: '#2563EB' },
    MODERATE: { bg: '#FEF3C7', text: '#D97706' },
    HARD: { bg: '#FEE2E2', text: '#DC2626' },
    EXTREME: { bg: '#EDE9FE', text: '#7C3AED' },
    UNSPECIFIED: { bg: '#E2E8F0', text: '#64748B' },
};

// All plan details are resolved from Supabase. No initial sample data.
export default function ManagePlanScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id: planId } = useLocalSearchParams<{ id?: string }>();
    const [planData, setPlanData] = useState<PlanDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const info = (message: string) => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(message);
        else Alert.alert('TrekkEZ', message);
    };

    useEffect(() => {
        let active = true;
        const loadPlanDetail = async () => {
            setIsLoading(true);
            setPlanData(null);
            setLoadError('');
            try {
                if (!planId || typeof planId !== 'string') throw new Error('Thiếu mã Plan cần xem.');
                const plans = await getRemotePlans();
                const plan = plans.find((p) => p.id === planId);
                if (!plan) throw new Error('Không tìm thấy Plan hoặc bạn chưa có quyền xem.');
                // Optional secondary data must never make a valid Plan disappear.
                const [routesResult, teamResult, membersResult] = await Promise.allSettled([
                    plan.routeId ? getRemoteRouteSummaries() : Promise.resolve([]),
                    plan.teamId ? getRemoteTeam(plan.teamId) : Promise.resolve(null),
                    plan.teamId ? getRemoteTeamMembers(plan.teamId) : Promise.resolve([]),
                ]);
                const routes = routesResult.status === 'fulfilled' ? routesResult.value : [];
                const team = teamResult.status === 'fulfilled' ? teamResult.value : null;
                const members = membersResult.status === 'fulfilled' ? membersResult.value : [];
                const route = routes.find((r) => r.id === plan.routeId) || null;
                if (active) setPlanData(toPlanManageDetails(plan, route, team, members));
            } catch (error) {
                if (active) setLoadError(error instanceof Error ? error.message : String(error));
            } finally {
                if (active) setIsLoading(false);
            }
        };
        void loadPlanDetail();
        return () => { active = false; };
    }, [planId]);

    // The new UI's editPlanId parameter is not implemented by Make a Plan.
    // Never send users into create mode while claiming an existing Plan is edited.
    const handleEdit = () => info('Chỉnh sửa Plan chưa được kết nối. Dữ liệu hiện tại chỉ được xem, không bị thay đổi.');

    const currentDifficulty = DIFFICULTY_CONFIG[planData?.difficulty || 'UNSPECIFIED'];

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingCenter]}>
                <ActivityIndicator size="large" color="#207BFB" />
            </View>
        );
    }

    if (!planData) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: 20 }] }>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 18, marginBottom: 24 }}>
                    <Text style={{ color: '#0F172A', fontWeight: '700' }}>‹ MANAGE PLAN</Text>
                </TouchableOpacity>
                <Text style={{ color: '#B91C1C' }}>{loadError || 'Không có dữ liệu Plan.'}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* 1. Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Octicons name="chevron-left" size={24} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MANAGE PLAN</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* 2. Scrollable Cards Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 85 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Card 1: Level Badge & Tên Plan */}
                <View style={styles.cardLevelName}>
                    <View style={[styles.badgeLevel, { backgroundColor: currentDifficulty.bg }]}>
                        <Text style={[styles.badgeLevelText, { color: currentDifficulty.text }]}>
                            {planData.difficulty}
                        </Text>
                    </View>
                    <Text style={styles.planNameText} numberOfLines={1}>
                        {planData.name}
                    </Text>
                </View>

                {/* Card 2: Mô tả & Thời gian Khởi hành - Đến nơi */}
                <View style={styles.cardDesc}>
                    <Text style={styles.descText}>
                        {planData.description || '<descriptive paragraph>'}
                    </Text>

                    <View style={styles.timeRow}>
                        <View style={styles.timeCol}>
                            <Text style={styles.timeLabel}>DEPARTURE</Text>
                            <Text style={styles.timeValue}>{planData.departureTime}</Text>
                        </View>
                        <View style={[styles.timeCol, { alignItems: 'flex-end' }]}>
                            <Text style={styles.timeLabel}>ARRIVAL</Text>
                            <Text style={styles.timeValue}>{planData.arrivalTime}</Text>
                        </View>
                    </View>
                </View>

                {/* Card 3: ExpandableCard cho Route Summary */}
                <ExpandableCard
                    id={`route_${planData.route.id}`}
                    title={planData.route.name}
                    iconName="milestone"
                    headerColor="#207BFB"
                    defaultExpanded={true}
                    onHeaderPress={() => { if (planData.route.id) router.push({ pathname: '/manage-route', params: { id: planData.route.id } }); }}
                >
                    <View style={styles.routeDetailBox}>
                        {planData.route.totalDistanceKm && (
                            <View style={styles.routeMetaRow}>
                                <Text style={styles.routeMetaLabel}>Khoảng cách:</Text>
                                <Text style={styles.routeMetaValue}>{planData.route.totalDistanceKm} km</Text>
                            </View>
                        )}
                        {planData.route.startPointName && (
                            <View style={styles.routeMetaRow}>
                                <Text style={styles.routeMetaLabel}>Xuất phát:</Text>
                                <Text style={styles.routeMetaValue}>{planData.route.startPointName}</Text>
                            </View>
                        )}
                        {planData.route.endPointName && (
                            <View style={styles.routeMetaRow}>
                                <Text style={styles.routeMetaLabel}>Đích đến:</Text>
                                <Text style={styles.routeMetaValue}>{planData.route.endPointName}</Text>
                            </View>
                        )}
                    </View>
                </ExpandableCard>

                {/* Card 4: Nhóm tham gia (Team Box) */}
                <TouchableOpacity
                    style={styles.teamCard}
                    activeOpacity={planData.team.id ? 0.9 : 1}
                    onPress={() => {
                        if (planData.team.id) router.push({ pathname: '/team-manage', params: { teamId: planData.team.id } });
                    }}
                >
                    <View style={styles.teamAvatars}>
                        {planData.team.members.slice(0, 3).map((member, index) => {
                            const offsetStyle = { marginLeft: index === 0 ? 0 : -12, zIndex: 3 - index };

                            if (member.avatarUrl) {
                                return (
                                    <Image
                                        key={member.id}
                                        source={{ uri: member.avatarUrl }}
                                        style={[styles.teamAvatarImg, offsetStyle]}
                                    />
                                );
                            }
                            return (
                                <View key={member.id} style={[styles.teamAvatarPlaceholder, offsetStyle]}>
                                    <Text style={styles.avatarQuestion}>
                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                            );
                        })}

                        {planData.team.members.length > 3 && (
                            <View style={[styles.teamAvatarMore, { marginLeft: -12, zIndex: 0 }]}>
                                <Text style={styles.teamAvatarMoreText}>
                                    +{planData.team.members.length - 3}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.teamNameText} numberOfLines={1}>
                        {planData.team.name}
                    </Text>
                </TouchableOpacity>

                {/* Card 5: Khung Note (Ghi chú chi tiết) */}
                <TouchableOpacity
                    style={styles.noteCard}
                    activeOpacity={0.9}
                    onPress={() => info(planData.noteContent || 'Plan chưa có ghi chú.')}
                >
                    <Text style={styles.noteCardTitleText}>note</Text>
                    <Text style={styles.noteCardContentText} numberOfLines={4}>
                        {planData.noteContent || 'Chưa có ghi chú nào được thêm vào...'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* 3. Nút Edit cố định chân trang */}
            <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                    style={styles.editBtn}
                    activeOpacity={0.85}
                    onPress={handleEdit}
                >
                    <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// =====================================================================
// 4. STYLES
// =====================================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F5F9',
    },
    loadingCenter: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 18,
        color: '#0F172A',
        letterSpacing: 0.5,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    headerPlaceholder: {
        width: 36,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
        paddingTop: 8,
    },
    // Card 1: Level + Name
    cardLevelName: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    badgeLevel: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeLevelText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    planNameText: {
        flex: 1,
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#334155',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Card 2: Desc + Departure/Arrival
    cardDesc: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        gap: 32,
    },
    descText: {
        fontFamily: 'GoogleSans-Medium',
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    timeCol: {
        gap: 6,
    },
    timeLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#64748B',
        letterSpacing: 0.5,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    timeValue: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Card 3: Route Details Box
    routeDetailBox: {
        gap: 8,
    },
    routeMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    routeMetaLabel: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 13,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    routeMetaValue: {
        flex: 1,
        fontFamily: 'GoogleSans-Medium',
        fontSize: 13,
        color: '#0F172A',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Card 4: Team Box
    teamCard: {
        backgroundColor: '#207BFB',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
    },
    teamAvatars: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamAvatarImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    teamAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#207BFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    teamAvatarMore: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0F172A',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    teamAvatarMoreText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 11,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    avatarQuestion: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    teamNameText: {
        flex: 1,
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Card 5: Note Card Box
    noteCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        paddingHorizontal: 16,
        paddingVertical: 16,
        minHeight: 140,
        gap: 8,
    },
    noteCardTitleText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 14,
        color: '#64748B',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    noteCardContentText: {
        fontFamily: 'GoogleSans-Regular',
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    // Footer CTA
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
    },
    editBtn: {
        backgroundColor: '#1E232B',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBtnText: {
        fontFamily: 'GoogleSans-Bold',
        fontSize: 16,
        color: '#FFFFFF',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});